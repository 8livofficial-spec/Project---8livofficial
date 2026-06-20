import { NextResponse } from 'next/server'
import { getAuthenticatedProvider } from '@/lib/providerServer'
import { supabaseAdmin } from '@/lib/supabaseServer'

export async function GET(request: Request) {
  const provider = await getAuthenticatedProvider(request)
  if ('error' in provider) {
    return NextResponse.json({ error: provider.error }, { status: provider.status })
  }

  const [{ data: wallet, error: walletError }, { data: transactions, error: txError }, { data: payouts, error: payoutError }] = await Promise.all([
    supabaseAdmin
      .from('wallet_accounts')
      .select('*')
      .eq('provider_id', provider.user.id)
      .maybeSingle(),
    supabaseAdmin
      .from('wallet_ledger_transactions')
      .select('*')
      .eq('provider_id', provider.user.id)
      .order('created_at', { ascending: false })
      .limit(100),
    supabaseAdmin
      .from('provider_payouts')
      .select('*')
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
