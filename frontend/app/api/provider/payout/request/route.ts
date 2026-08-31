import { randomUUID } from 'crypto'
import { NextResponse } from 'next/server'
import { getAuthenticatedProvider } from '@/lib/providerServer'
import { supabaseAdmin } from '@/lib/supabaseServer'

export async function POST(request: Request) {
  try {
    const provider = await getAuthenticatedProvider(request)
    if ('error' in provider) return NextResponse.json({ error: provider.error }, { status: provider.status })

    const body = await request.json()
    const amount = Number(body.amount)
    if (!Number.isFinite(amount) || amount <= 0) return NextResponse.json({ error: 'A valid payout amount is required.' }, { status: 400 })

    const profileId = provider.profile?.id || provider.user.id
    // Verify provider has a bank or UPI destination configured
    const [{ data: docAcc }, { data: v2Acc }, { data: legacyProfile }] = await Promise.all([
      supabaseAdmin.from('doctor_payout_accounts').select('id, account_number, vpa').or(`doctor_id.eq.${provider.user.id},doctor_id.eq.${profileId}`).maybeSingle(),
      supabaseAdmin.from('provider_payout_profiles').select('id, bank_verification_status, encrypted_account_number, upi_id').or(`provider_id.eq.${provider.user.id},provider_id.eq.${profileId}`).maybeSingle(),
      supabaseAdmin.from('provider_profiles').select('id, bank_account_details, upi_id').or(`provider_id.eq.${provider.user.id},id.eq.${provider.user.id},provider_id.eq.${profileId},id.eq.${profileId}`).maybeSingle(),
    ])

    const hasConfiguredAccount = Boolean(
      (docAcc && (docAcc.account_number || docAcc.vpa)) ||
      (v2Acc && (v2Acc.encrypted_account_number || v2Acc.upi_id)) ||
      (legacyProfile && (legacyProfile.upi_id || (legacyProfile.bank_account_details && (legacyProfile.bank_account_details.account_number || legacyProfile.bank_account_details.accountNumber || legacyProfile.bank_account_details.upi_id || legacyProfile.bank_account_details.upiId || Object.keys(legacyProfile.bank_account_details).length > 0))))
    )

    if (!hasConfiguredAccount) {
      return NextResponse.json({
        error: 'Please configure your bank or UPI payout account before requesting a withdrawal.',
        code: 'PAYOUT_ACCOUNT_REQUIRED'
      }, { status: 400 })
    }

    const idempotencyKey = String(body.idempotencyKey || `provider:${provider.user.id}:${randomUUID()}`)

    // 1. Try RPC request_provider_payout
    const { data: rpcData, error: rpcError } = await supabaseAdmin.rpc('request_provider_payout', {
      p_provider_id: provider.user.id,
      p_amount: amount,
      p_idempotency_key: idempotencyKey,
      p_initiated_by: provider.user.id,
    })

    if (!rpcError) {
      return NextResponse.json({ payout: rpcData }, { status: 201 })
    }

    // 2. If RPC fails because of table or function mismatch, handle via doctor_wallet / provider_payouts directly
    if (provider.role === 'doctor') {
      const { data: docWallet } = await supabaseAdmin
        .from('doctor_wallet')
        .select('doctor_id, balance, total_earned, total_withdrawn')
        .eq('doctor_id', provider.user.id)
        .maybeSingle()

      // Insert doctor_wallet_transactions row
      const { data: txData, error: txError } = await supabaseAdmin
        .from('doctor_wallet_transactions')
        .insert({
          doctor_id: provider.user.id,
          type: 'withdrawal',
          amount: amount,
          status: 'PENDING',
          payout_status: 'PENDING',
        })
        .select()
        .single()

      if (txError) {
        return NextResponse.json({ error: txError.message || rpcError.message }, { status: 400 })
      }

      // Also ensure provider_payouts record if table exists
      try {
        const { data: walletAcc } = await supabaseAdmin
          .from('wallet_accounts')
          .select('id')
          .eq('provider_id', provider.user.id)
          .maybeSingle()

        if (walletAcc?.id) {
          await supabaseAdmin.from('provider_payouts').insert({
            provider_id: provider.user.id,
            wallet_id: walletAcc.id,
            payout_amount: amount,
            payout_status: 'PENDING',
            idempotency_key: idempotencyKey,
            initiated_by: provider.user.id,
          })
        }
      } catch {}

      return NextResponse.json({ payout: txData, message: 'Withdrawal requested successfully.' }, { status: 201 })
    }

    return NextResponse.json({ error: rpcError.message }, { status: 400 })
  } catch (error: unknown) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unable to request payout.' }, { status: 500 })
  }
}
