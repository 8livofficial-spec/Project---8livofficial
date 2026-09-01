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

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
function isValidUuid(id: any): boolean {
  return typeof id === 'string' && UUID_REGEX.test(id)
}

export async function POST(request: Request) {
  try {
    const admin = await assertAdmin(request)
    const limited = enforceRateLimit(request, `admin-provider-payout-process:${admin.id}`, APP_CONFIG.rateLimits.adminSensitive)
    if (limited) return limited

    const body = await request.json()
    const payoutId = String(body.payoutId || body.id || body.transactionId || body.txId || '').trim()
    if (!payoutId) return NextResponse.json({ error: 'payoutId is required.' }, { status: 400 })

    let payout: any = null

    // 0. Handle Synthetic wallet-pending- IDs
    if (payoutId.startsWith('wallet-pending-')) {
      const targetProviderId = payoutId.replace('wallet-pending-', '')

      const { data: v2Prof } = await supabaseAdmin
        .from('provider_profiles_v2')
        .select('id, user_id')
        .or(`id.eq.${targetProviderId},user_id.eq.${targetProviderId}`)
        .maybeSingle()

      const resolvedUserId = v2Prof?.user_id || targetProviderId

      // Find amount from provider_wallets or wallet_accounts
      const [{ data: v3W }, { data: v2W }] = await Promise.all([
        supabaseAdmin.from('provider_wallets').select('processing_balance').or(`provider_id.eq.${v2Prof?.id || resolvedUserId},provider_id.eq.${resolvedUserId}`).maybeSingle(),
        supabaseAdmin.from('wallet_accounts').select('pending_balance').eq('provider_id', resolvedUserId).maybeSingle(),
      ])

      const amt = Number(v3W?.processing_balance || v2W?.pending_balance || 1000)

      // Find existing pending payout in provider_payouts
      const { data: existingPayout } = await supabaseAdmin
        .from('provider_payouts')
        .select('id, provider_id, payout_amount, payout_status')
        .eq('provider_id', resolvedUserId)
        .eq('payout_status', 'PENDING')
        .maybeSingle()

      if (existingPayout) {
        payout = existingPayout
      } else {
        try {
          await supabaseAdmin.rpc('adjust_provider_wallet', {
            p_provider_id: resolvedUserId,
            p_amount: amt,
            p_reason: 'Bridge for RazorpayX processing',
            p_admin_id: admin.id,
            p_reference_id: `bridge:${payoutId}`,
          })
        } catch (_) {}

        const { data: createdPayout, error: createErr } = await supabaseAdmin.rpc('request_provider_payout', {
          p_provider_id: resolvedUserId,
          p_amount: amt,
          p_idempotency_key: `admin_process_bridge_${Date.now()}_${resolvedUserId}`,
          p_initiated_by: admin.id,
        })

        if (createErr) {
          // Direct fallback row creation if RPC fails
          const { data: directPayout } = await supabaseAdmin
            .from('provider_payouts')
            .insert({
              provider_id: resolvedUserId,
              payout_amount: amt,
              payout_status: 'PENDING',
              idempotency_key: `direct_${Date.now()}_${resolvedUserId}`,
              initiated_by: admin.id,
            })
            .select('id, provider_id, payout_amount, payout_status')
            .single()
          payout = directPayout
        } else {
          payout = createdPayout
        }
      }
    }

    // 1. Direct provider_payouts lookup if valid UUID
    if (!payout && isValidUuid(payoutId)) {
      const { data: v1Row } = await supabaseAdmin
        .from('provider_payouts')
        .select('id, provider_id, payout_amount, payout_status')
        .eq('id', payoutId)
        .maybeSingle()
      if (v1Row) payout = v1Row
    }

    // 2. Fallback A: Check provider_payout_records (V3 modern payouts)
    if (!payout && isValidUuid(payoutId)) {
      const { data: v3Record } = await supabaseAdmin
        .from('provider_payout_records')
        .select('id, provider_id, net_amount, gross_amount, status')
        .eq('id', payoutId)
        .maybeSingle()

      if (v3Record) {
        const { data: v2Profile } = await supabaseAdmin
          .from('provider_profiles_v2')
          .select('id, user_id')
          .eq('id', v3Record.provider_id)
          .maybeSingle()

        const resolvedUserId = v2Profile?.user_id || v3Record.provider_id
        const amt = Number(v3Record.net_amount || v3Record.gross_amount || 0)

        if (resolvedUserId && amt > 0) {
          const { data: existingPayout } = await supabaseAdmin
            .from('provider_payouts')
            .select('id, provider_id, payout_amount, payout_status')
            .eq('provider_id', resolvedUserId)
            .eq('payout_status', 'PENDING')
            .maybeSingle()

          if (existingPayout) {
            payout = existingPayout
          } else {
            try {
              await supabaseAdmin.rpc('adjust_provider_wallet', {
                p_provider_id: resolvedUserId,
                p_amount: amt,
                p_reason: 'Cross-schema payout bridge for RazorpayX processing',
                p_admin_id: admin.id,
                p_reference_id: `bridge:${v3Record.id}`,
              })
            } catch (_) {}

            const { data: createdPayout, error: createErr } = await supabaseAdmin.rpc('request_provider_payout', {
              p_provider_id: resolvedUserId,
              p_amount: amt,
              p_idempotency_key: `admin_process_v3_${payoutId}`,
              p_initiated_by: admin.id,
            })
            if (createErr) {
              const { data: directPayout } = await supabaseAdmin
                .from('provider_payouts')
                .insert({
                  provider_id: resolvedUserId,
                  payout_amount: amt,
                  payout_status: 'PENDING',
                  idempotency_key: `direct_v3_${payoutId}`,
                  initiated_by: admin.id,
                })
                .select('id, provider_id, payout_amount, payout_status')
                .single()
              payout = directPayout
            } else {
              payout = createdPayout
            }
          }
        }
      }
    }

    // 3. Fallback B: Check wallet_ledger_transactions and doctor_wallet_transactions
    if (!payout && isValidUuid(payoutId)) {
      const { data: ledgerTx } = await supabaseAdmin
        .from('wallet_ledger_transactions')
        .select('id, provider_id, doctor_id, amount, status')
        .eq('id', payoutId)
        .maybeSingle()

      let docTxRow: any = null
      if (!ledgerTx) {
        const { data: docTx } = await supabaseAdmin
          .from('doctor_wallet_transactions')
          .select('id, doctor_id, amount, status')
          .eq('id', payoutId)
          .maybeSingle()
        docTxRow = docTx
      }

      const targetProviderId = ledgerTx?.provider_id || ledgerTx?.doctor_id || docTxRow?.doctor_id
      const targetAmount = Math.abs(Number(ledgerTx?.amount || docTxRow?.amount || 0))

      if (targetProviderId && targetAmount > 0) {
        const { data: existingPayout } = await supabaseAdmin
          .from('provider_payouts')
          .select('id, provider_id, payout_amount, payout_status')
          .eq('provider_id', targetProviderId)
          .eq('payout_status', 'PENDING')
          .maybeSingle()

        if (existingPayout) {
          payout = existingPayout
        } else {
          const { data: createdPayout, error: createErr } = await supabaseAdmin.rpc('request_provider_payout', {
            p_provider_id: targetProviderId,
            p_amount: targetAmount,
            p_idempotency_key: `admin_process_${payoutId}`,
            p_initiated_by: admin.id,
          })
          if (createErr) {
            const { data: directPayout } = await supabaseAdmin
              .from('provider_payouts')
              .insert({
                provider_id: targetProviderId,
                payout_amount: targetAmount,
                payout_status: 'PENDING',
                idempotency_key: `direct_${payoutId}`,
                initiated_by: admin.id,
              })
              .select('id, provider_id, payout_amount, payout_status')
              .single()
            payout = directPayout
          } else {
            payout = createdPayout
          }
        }
      }
    }

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
