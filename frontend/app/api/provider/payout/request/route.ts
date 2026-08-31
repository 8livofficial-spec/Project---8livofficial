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

    // 1. For doctors, process withdrawal via doctor_wallet & doctor_wallet_transactions
    if (provider.role === 'doctor') {
      const { data: docWallet } = await supabaseAdmin
        .from('doctor_wallet')
        .select('doctor_id, balance, total_earned, total_withdrawn')
        .eq('doctor_id', provider.user.id)
        .maybeSingle()

      // Calculate dynamic earnings from completed consultations
      const { count: completedCount } = await supabaseAdmin
        .from('doctor_consultations')
        .select('*', { count: 'exact', head: true })
        .eq('doctor_id', provider.user.id)
        .in('status', ['approved', 'completed', 'attended'])

      const dynamicEarned = (completedCount || 0) * 300
      const recordedEarned = Number(docWallet?.total_earned || 0)
      const recordedWithdrawn = Number(docWallet?.total_withdrawn || 0)
      const totalEarned = Math.max(recordedEarned, dynamicEarned)
      const availableBalance = Math.max(0, totalEarned - recordedWithdrawn)

      if (amount > availableBalance) {
        return NextResponse.json({
          error: `Requested amount (₹${amount}) exceeds available balance (₹${availableBalance}).`,
          availableBalance
        }, { status: 400 })
      }

      // Record withdrawal transaction
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
        return NextResponse.json({ error: txError.message }, { status: 500 })
      }

      // Mirror into provider_payouts if wallet_accounts exists
      try {
        await supabaseAdmin.from('wallet_accounts').upsert({
          provider_id: provider.user.id,
          current_balance: availableBalance,
          total_earned: totalEarned,
          total_paid: recordedWithdrawn,
        }, { onConflict: 'provider_id' })

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

      return NextResponse.json({
        success: true,
        payout: txData,
        message: 'Withdrawal requested successfully.'
      }, { status: 201 })
    }

    // 2. Standard provider platform payout (dietitians, fitness coaches, etc.)
    const { data: rpcData, error: rpcError } = await supabaseAdmin.rpc('request_provider_payout', {
      p_provider_id: provider.user.id,
      p_amount: amount,
      p_idempotency_key: idempotencyKey,
      p_initiated_by: provider.user.id,
    })

    if (rpcError) {
      return NextResponse.json({ error: rpcError.message }, { status: 400 })
    }

    return NextResponse.json({ payout: rpcData }, { status: 201 })
  } catch (error: unknown) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unable to request payout.' }, { status: 500 })
  }
}
