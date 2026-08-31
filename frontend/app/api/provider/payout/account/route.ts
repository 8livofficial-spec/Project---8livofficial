import { NextResponse } from 'next/server'
import { getAuthenticatedProvider } from '@/lib/providerServer'
import { supabaseAdmin } from '@/lib/supabaseServer'
import { decryptSensitiveValue, encryptSensitiveValue, last4 } from '@/lib/providerPlatform/crypto'

export async function GET(request: Request) {
  try {
    const provider = await getAuthenticatedProvider(request)
    if ('error' in provider) {
      return NextResponse.json({ error: provider.error }, { status: provider.status })
    }

    const providerId = provider.user.id

    // 1. Doctor payout accounts
    const { data: docAcc } = await supabaseAdmin
      .from('doctor_payout_accounts')
      .select('account_type, beneficiary_name, account_number, ifsc, vpa, razorpay_fund_account_id')
      .eq('doctor_id', providerId)
      .maybeSingle()

    if (docAcc && (docAcc.account_number || docAcc.vpa)) {
      return NextResponse.json({
        account: {
          accountType: docAcc.account_type === 'vpa' ? 'vpa' : 'bank_account',
          beneficiaryName: docAcc.beneficiary_name || '',
          accountNumber: docAcc.account_number || '',
          accountNumberMasked: docAcc.account_number ? `••••${docAcc.account_number.slice(-4)}` : '',
          ifsc: docAcc.ifsc || '',
          vpa: docAcc.vpa || '',
          bankName: '',
          branch: '',
          preferredPayoutMethod: docAcc.account_type === 'vpa' ? 'UPI' : 'BANK_TRANSFER',
          source: 'doctor_payout_accounts',
        }
      })
    }

    // 2. Provider payout profiles (V2)
    const { data: v2Profile } = await supabaseAdmin
      .from('provider_profiles_v2')
      .select('id')
      .or(`id.eq.${providerId},user_id.eq.${providerId}`)
      .maybeSingle()

    if (v2Profile) {
      const { data: v2Acc } = await supabaseAdmin
        .from('provider_payout_profiles')
        .select('*')
        .eq('provider_id', v2Profile.id)
        .maybeSingle()

      if (v2Acc) {
        let plainAccount = ''
        let plainIfsc = ''
        try {
          if (v2Acc.encrypted_account_number) plainAccount = decryptSensitiveValue(v2Acc.encrypted_account_number)
          if (v2Acc.ifsc_encrypted) plainIfsc = decryptSensitiveValue(v2Acc.ifsc_encrypted)
        } catch {}

        return NextResponse.json({
          account: {
            accountType: v2Acc.account_type || (v2Acc.preferred_payout_method === 'UPI' ? 'vpa' : 'bank_account'),
            beneficiaryName: v2Acc.beneficiary_name || '',
            accountNumber: plainAccount,
            accountNumberMasked: v2Acc.account_number_last4 ? `••••${v2Acc.account_number_last4}` : (plainAccount ? `••••${plainAccount.slice(-4)}` : ''),
            ifsc: plainIfsc,
            vpa: v2Acc.upi_id || '',
            bankName: v2Acc.bank_name || '',
            branch: v2Acc.branch_name || '',
            preferredPayoutMethod: v2Acc.preferred_payout_method || (v2Acc.upi_id ? 'UPI' : 'BANK_TRANSFER'),
            source: 'provider_payout_profiles',
          }
        })
      }
    }

    // 3. Provider profiles (legacy / common)
    const { data: legacyProfile } = await supabaseAdmin
      .from('provider_profiles')
      .select('id, full_name, upi_id, bank_account_details')
      .or(`provider_id.eq.${providerId},id.eq.${providerId}`)
      .maybeSingle()

    if (legacyProfile) {
      const details = legacyProfile.bank_account_details || {}
      const accNum = details.account_number || details.accountNumber || ''
      return NextResponse.json({
        account: {
          accountType: details.account_type || (legacyProfile.upi_id && !accNum ? 'vpa' : 'bank_account'),
          beneficiaryName: details.beneficiary_name || details.accountHolderName || legacyProfile.full_name || '',
          accountNumber: accNum,
          accountNumberMasked: accNum ? `••••${String(accNum).slice(-4)}` : '',
          ifsc: details.ifsc || details.ifscCode || '',
          vpa: legacyProfile.upi_id || details.upi_id || details.upiId || '',
          bankName: details.bank_name || details.bankName || '',
          branch: details.branch || '',
          preferredPayoutMethod: legacyProfile.upi_id && !accNum ? 'UPI' : 'BANK_TRANSFER',
          source: 'provider_profiles',
        }
      })
    }

    return NextResponse.json({ account: null })
  } catch (error: unknown) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unable to load payment details.' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const provider = await getAuthenticatedProvider(request)
    if ('error' in provider) {
      return NextResponse.json({ error: provider.error }, { status: provider.status })
    }

    const providerId = provider.user.id
    const body = await request.json()

    const preferredMethod = body.preferredPayoutMethod === 'UPI' ? 'UPI' : 'BANK_TRANSFER'
    const beneficiaryName = String(body.beneficiaryName || body.accountHolderName || '').trim()
    const accountNumber = String(body.accountNumber || '').trim()
    const ifsc = String(body.ifsc || '').trim().toUpperCase()
    const bankName = String(body.bankName || '').trim()
    const branch = String(body.branch || '').trim()
    const upiId = String(body.upiId || body.vpa || '').trim()

    if (preferredMethod === 'UPI') {
      if (!upiId) {
        return NextResponse.json({ error: 'A valid UPI ID is required.' }, { status: 400 })
      }
    } else {
      if (!accountNumber || accountNumber.length < 6) {
        return NextResponse.json({ error: 'A valid bank account number (at least 6 digits) is required.' }, { status: 400 })
      }
      if (!ifsc || !/^[A-Z]{4}0[A-Z0-9]{6}$/i.test(ifsc)) {
        return NextResponse.json({ error: 'A valid 11-character IFSC code is required.' }, { status: 400 })
      }
      if (!beneficiaryName) {
        return NextResponse.json({ error: 'Account holder / beneficiary name is required.' }, { status: 400 })
      }
    }

    const now = new Date().toISOString()

    // 1. Update/upsert doctor_payout_accounts (for doctors)
    if (provider.role === 'doctor') {
      await supabaseAdmin.from('doctor_payout_accounts').upsert({
        doctor_id: providerId,
        account_type: preferredMethod === 'UPI' ? 'vpa' : 'bank_account',
        beneficiary_name: beneficiaryName || 'Doctor',
        account_number: accountNumber || null,
        ifsc: ifsc || null,
        vpa: upiId || null,
        updated_at: now,
      }, { onConflict: 'doctor_id' })
    }

    // 2. Update/upsert provider_profiles bank_account_details
    await supabaseAdmin.from('provider_profiles').update({
      upi_id: upiId || null,
      bank_account_details: {
        account_number: accountNumber,
        ifsc,
        bank_name: bankName,
        branch,
        beneficiary_name: beneficiaryName,
        preferred_payout_method: preferredMethod,
        updated_at: now,
      },
      updated_at: now,
    }).or(`provider_id.eq.${providerId},id.eq.${providerId}`)

    // 3. Update provider_payout_profiles (for V2 platform)
    const { data: v2Profile } = await supabaseAdmin
      .from('provider_profiles_v2')
      .select('id')
      .or(`id.eq.${providerId},user_id.eq.${providerId}`)
      .maybeSingle()

    if (v2Profile) {
      let encAcc: string | null = null
      let encIfsc: string | null = null
      if (accountNumber) encAcc = encryptSensitiveValue(accountNumber).ciphertext
      if (ifsc) encIfsc = encryptSensitiveValue(ifsc).ciphertext

      await supabaseAdmin.from('provider_payout_profiles').upsert({
        provider_id: v2Profile.id,
        encrypted_account_number: encAcc,
        account_number_last4: accountNumber ? last4(accountNumber) : null,
        beneficiary_name: beneficiaryName || 'Provider',
        ifsc_encrypted: encIfsc,
        ifsc_last4: ifsc ? last4(ifsc) : null,
        bank_name: bankName || null,
        branch_name: branch || null,
        account_type: preferredMethod === 'UPI' ? 'vpa' : 'savings',
        upi_id: upiId || null,
        preferred_payout_method: preferredMethod,
        bank_verification_status: 'PENDING',
        payout_status: 'VERIFICATION_PENDING',
        updated_at: now,
      }, { onConflict: 'provider_id' })
    }

    return NextResponse.json({
      success: true,
      message: 'Payment and payout account details updated successfully.',
      account: {
        preferredPayoutMethod: preferredMethod,
        beneficiaryName,
        accountNumberMasked: accountNumber ? `••••${accountNumber.slice(-4)}` : '',
        ifsc,
        vpa: upiId,
        bankName,
      }
    })
  } catch (error: unknown) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unable to update payment details.' }, { status: 500 })
  }
}
