import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseServer'
import { createRazorpayXContact, createRazorpayXFundAccount, createRazorpayXPayout } from '@/lib/razorpayx'
import { decryptSensitiveValue } from '@/lib/providerPlatform/crypto'
import { assertAdmin, enforceRateLimit } from '@/lib/apiSecurity'
import { APP_CONFIG } from '@/lib/appConfig'

type ResolvedAccount = {
  accountType: 'bank_account' | 'vpa'
  beneficiaryName: string
  accountNumber?: string | null
  ifsc?: string | null
  vpa?: string | null
  razorpayContactId?: string | null
  razorpayFundAccountId?: string | null
  sourceTable: 'doctor_payout_accounts' | 'provider_payout_profiles' | 'provider_profiles'
  recordId?: string
}

async function resolveProviderPayoutAccount(providerId: string): Promise<ResolvedAccount | null> {
  // 1. Check doctor_payout_accounts
  const { data: docAcc } = await supabaseAdmin
    .from('doctor_payout_accounts')
    .select('id, doctor_id, account_type, beneficiary_name, account_number, ifsc, vpa, razorpay_contact_id, razorpay_fund_account_id')
    .eq('doctor_id', providerId)
    .maybeSingle()

  if (docAcc && (docAcc.account_number || docAcc.vpa)) {
    return {
      accountType: docAcc.account_type === 'vpa' ? 'vpa' : 'bank_account',
      beneficiaryName: docAcc.beneficiary_name,
      accountNumber: docAcc.account_number,
      ifsc: docAcc.ifsc,
      vpa: docAcc.vpa,
      razorpayContactId: docAcc.razorpay_contact_id,
      razorpayFundAccountId: docAcc.razorpay_fund_account_id,
      sourceTable: 'doctor_payout_accounts',
      recordId: docAcc.id,
    }
  }

  // 2. Check provider_payout_profiles (linked to provider_profiles_v2)
  const { data: v2Profile } = await supabaseAdmin
    .from('provider_profiles_v2')
    .select('id')
    .or(`id.eq.${providerId},user_id.eq.${providerId}`)
    .maybeSingle()

  if (v2Profile) {
    const { data: v2Acc } = await supabaseAdmin
      .from('provider_payout_profiles')
      .select('id, provider_id, encrypted_account_number, beneficiary_name, ifsc_encrypted, upi_id, preferred_payout_method, payout_provider_account_id')
      .eq('provider_id', v2Profile.id)
      .maybeSingle()

    if (v2Acc) {
      let plainAccount = ''
      let plainIfsc = ''
      try {
        if (v2Acc.encrypted_account_number) plainAccount = decryptSensitiveValue(v2Acc.encrypted_account_number)
        if (v2Acc.ifsc_encrypted) plainIfsc = decryptSensitiveValue(v2Acc.ifsc_encrypted)
      } catch (err) {
        console.warn('Could not decrypt provider_payout_profiles values:', err)
      }

      if (v2Acc.preferred_payout_method === 'UPI' && v2Acc.upi_id) {
        return {
          accountType: 'vpa',
          beneficiaryName: v2Acc.beneficiary_name || 'Provider',
          vpa: v2Acc.upi_id,
          razorpayFundAccountId: v2Acc.payout_provider_account_id || null,
          sourceTable: 'provider_payout_profiles',
          recordId: v2Acc.id,
        }
      } else if (plainAccount && plainIfsc) {
        return {
          accountType: 'bank_account',
          beneficiaryName: v2Acc.beneficiary_name || 'Provider',
          accountNumber: plainAccount,
          ifsc: plainIfsc,
          razorpayFundAccountId: v2Acc.payout_provider_account_id || null,
          sourceTable: 'provider_payout_profiles',
          recordId: v2Acc.id,
        }
      }
    }
  }

  // 3. Check provider_profiles (legacy/fallback)
  const { data: legacyProfile } = await supabaseAdmin
    .from('provider_profiles')
    .select('id, provider_id, full_name, upi_id, bank_account_details')
    .or(`provider_id.eq.${providerId},id.eq.${providerId}`)
    .maybeSingle()

  if (legacyProfile) {
    const details = legacyProfile.bank_account_details || {}
    const accountNumber = details.account_number || details.accountNumber || details.notes
    const ifsc = details.ifsc || details.ifscCode
    const upi = legacyProfile.upi_id || details.upi_id || details.upiId

    if (accountNumber && ifsc) {
      return {
        accountType: 'bank_account',
        beneficiaryName: details.beneficiary_name || details.accountHolderName || legacyProfile.full_name,
        accountNumber,
        ifsc,
        sourceTable: 'provider_profiles',
        recordId: legacyProfile.id,
      }
    } else if (upi) {
      return {
        accountType: 'vpa',
        beneficiaryName: legacyProfile.full_name || 'Provider',
        vpa: upi,
        sourceTable: 'provider_profiles',
        recordId: legacyProfile.id,
      }
    }
  }

  return null
}

export async function POST(request: Request) {
  try {
    const admin = await assertAdmin(request)
    const limited = enforceRateLimit(request, `admin-provider-payout-process:${admin.id}`, APP_CONFIG.rateLimits.adminSensitive)
    if (limited) return limited

    const { payoutId } = await request.json()
    if (!payoutId) return NextResponse.json({ error: 'payoutId is required.' }, { status: 400 })

    const { data: payout, error: payoutError } = await supabaseAdmin
      .from('provider_payouts')
      .select('id, provider_id, payout_amount, payout_status')
      .eq('id', payoutId)
      .maybeSingle()
    if (payoutError) return NextResponse.json({ error: payoutError.message }, { status: 500 })
    if (!payout) return NextResponse.json({ error: 'Payout not found.' }, { status: 404 })
    if (!['PENDING', 'FAILED'].includes(payout.payout_status)) return NextResponse.json({ error: 'Payout is already being processed or completed.' }, { status: 409 })

    const [{ data: profile }, account] = await Promise.all([
      supabaseAdmin.from('profiles').select('id, first_name, last_name, email, phone_number, role').eq('id', payout.provider_id).maybeSingle(),
      resolveProviderPayoutAccount(payout.provider_id),
    ])

    if (!profile) return NextResponse.json({ error: 'Provider profile not found.' }, { status: 404 })
    if (!account) return NextResponse.json({ error: 'Provider bank or UPI payout account is not configured.' }, { status: 409 })

    const { data: reserved } = await supabaseAdmin
      .from('provider_payouts')
      .update({ payout_status: 'PROCESSING', failure_reason: null, updated_at: new Date().toISOString() })
      .eq('id', payout.id)
      .in('payout_status', ['PENDING', 'FAILED'])
      .select('id')
      .maybeSingle()
    if (!reserved) return NextResponse.json({ error: 'Payout was reserved by another process.' }, { status: 409 })

    try {
      const name = account.beneficiaryName || `${profile.first_name || ''} ${profile.last_name || ''}`.trim() || '8liv Provider'
      let contactId = account.razorpayContactId
      if (!contactId) {
        contactId = (await createRazorpayXContact({
          name,
          email: profile.email,
          contact: profile.phone_number,
          referenceId: payout.provider_id,
        })).id
      }

      let fundAccountId = account.razorpayFundAccountId
      if (!fundAccountId) {
        fundAccountId = (await createRazorpayXFundAccount({
          contactId,
          accountType: account.accountType,
          name,
          ifsc: account.ifsc,
          accountNumber: account.accountNumber,
          vpa: account.vpa,
        })).id
      }

      // Persist contact & fund account if we found a place to save it
      if (account.sourceTable === 'doctor_payout_accounts') {
        await supabaseAdmin
          .from('doctor_payout_accounts')
          .update({ razorpay_contact_id: contactId, razorpay_fund_account_id: fundAccountId, updated_at: new Date().toISOString() })
          .eq('doctor_id', payout.provider_id)
      } else if (account.sourceTable === 'provider_payout_profiles' && account.recordId) {
        await supabaseAdmin
          .from('provider_payout_profiles')
          .update({ payout_provider: 'RAZORPAYX', payout_provider_account_id: fundAccountId, updated_at: new Date().toISOString() })
          .eq('id', account.recordId)
      }

      const razorpayPayout = await createRazorpayXPayout({
        fundAccountId,
        amountPaise: Math.round(Number(payout.payout_amount) * 100),
        mode: account.accountType === 'vpa' ? 'UPI' : 'IMPS',
        referenceId: payout.id,
        narration: '8liv provider payout',
        notes: { payoutId: payout.id, providerId: payout.provider_id, role: profile.role || 'provider' },
      })

      const { data, error } = await supabaseAdmin.rpc('finalize_provider_payout', {
        p_payout_id: payout.id,
        p_status: 'PROCESSING',
        p_payment_reference: razorpayPayout.id,
        p_failure_reason: null,
        p_actor: admin.id,
      })
      if (error) throw error

      return NextResponse.json({ payout: data, razorpayStatus: razorpayPayout.status })
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Payout processing failed.'
      await supabaseAdmin.rpc('finalize_provider_payout', {
        p_payout_id: payout.id,
        p_status: 'FAILED',
        p_payment_reference: null,
        p_failure_reason: message,
        p_actor: admin.id,
      })
      return NextResponse.json({ error: message }, { status: 502 })
    }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Payout processing failed.'
    const status = message === 'Forbidden' ? 403 : (message === 'Unauthorized' ? 401 : 502)
    return NextResponse.json({ error: message }, { status })
  }
}
