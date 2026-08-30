import { NextResponse } from 'next/server'
import { getAuthenticatedProvider } from '@/lib/providerServer'
import { supabaseAdmin } from '@/lib/supabaseServer'
import { ProviderFinanceService } from '@/lib/providerPlatform/services'
import { assertProviderPlatformProvider } from '@/lib/providerPlatform/auth'
import { toSafeError } from '@/lib/providerPlatform/errors'

export async function GET(request: Request) {
  try {
    const auth = await assertProviderPlatformProvider(request)
    const result = await ProviderFinanceService.getProviderWalletForProvider(auth.provider.id)
    const wallet = result.wallet
    const latestCompletedPayout = (result.payouts || []).find(payout => payout.status === 'SUCCESS')

    return NextResponse.json({
      wallet: {
        provider_id: auth.user.id,
        provider_profile_id: auth.provider.id,
        balance: Number(wallet.eligible_balance || 0),
        current_balance: Number(wallet.eligible_balance || 0),
        pending_payout: Number(wallet.processing_balance || 0),
        pending_balance: Number(wallet.pending_balance || 0),
        on_hold_balance: Number(wallet.on_hold_balance || 0),
        eligible_balance: Number(wallet.eligible_balance || 0),
        completed_payout: Number(wallet.paid_total || 0),
        total_paid: Number(wallet.paid_total || 0),
        lifetime_earnings: Number(wallet.pending_balance || 0) + Number(wallet.eligible_balance || 0) + Number(wallet.on_hold_balance || 0) + Number(wallet.paid_total || 0),
        total_earned: Number(wallet.pending_balance || 0) + Number(wallet.eligible_balance || 0) + Number(wallet.on_hold_balance || 0) + Number(wallet.paid_total || 0),
        payout_status: auth.provider.payout_status,
        bank_verification_status: auth.provider.bank_verification_status,
        last_payout: latestCompletedPayout || null,
      },
      transactions: result.transactions,
      payouts: result.payouts,
      earnings: result.earnings,
    })
  } catch (error) {
    // If not onboarded via provider platform v2 or not found, fall back to core wallet ledger
  }

  const provider = await getAuthenticatedProvider(request)
  if ('error' in provider) {
    return NextResponse.json({ error: provider.error }, { status: provider.status })
  }

  const [{ data: wallet, error: walletError }, { data: transactions, error: txError }, { data: payouts, error: payoutError }] = await Promise.all([
    supabaseAdmin
      .from('wallet_accounts')
      .select('provider_id, current_balance, pending_balance, total_earned, total_paid, updated_at')
      .eq('provider_id', provider.user.id)
      .maybeSingle(),
    supabaseAdmin
      .from('wallet_ledger_transactions')
      .select('id, wallet_id, provider_id, patient_id, appointment_id, transaction_type, amount, status, reference_id, description, retry_required, failure_reason, created_at, updated_at')
      .eq('provider_id', provider.user.id)
      .order('created_at', { ascending: false })
      .limit(100),
    supabaseAdmin
      .from('provider_payouts')
      .select('id, provider_id, payout_amount, payout_status, payment_reference, failure_reason, initiated_at, completed_at, updated_at')
      .eq('provider_id', provider.user.id)
      .order('initiated_at', { ascending: false })
      .limit(100),
  ])

  if (walletError) return NextResponse.json({ error: walletError.message }, { status: 500 })
  if (txError) return NextResponse.json({ error: txError.message }, { status: 500 })
  if (payoutError) return NextResponse.json({ error: payoutError.message }, { status: 500 })

  const latestCompletedPayout = (payouts || []).find(payout => payout.payout_status === 'COMPLETED')

  return NextResponse.json({
    wallet: {
      provider_id: provider.user.id,
      balance: Number(wallet?.current_balance || 0),
      current_balance: Number(wallet?.current_balance || 0),
      pending_payout: Number(wallet?.pending_balance || 0),
      pending_balance: Number(wallet?.pending_balance || 0),
      completed_payout: Number(wallet?.total_paid || 0),
      total_paid: Number(wallet?.total_paid || 0),
      lifetime_earnings: Number(wallet?.total_earned || 0),
      total_earned: Number(wallet?.total_earned || 0),
      last_payout: latestCompletedPayout || null,
    },
    transactions: transactions || [],
    payouts: payouts || [],
  })
}
