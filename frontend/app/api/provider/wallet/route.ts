import { NextResponse } from 'next/server'
import { getAuthenticatedProvider } from '@/lib/providerServer'
import { supabaseAdmin } from '@/lib/supabaseServer'
import { ProviderFinanceService } from '@/lib/providerPlatform/services'
import { assertProviderPlatformProvider } from '@/lib/providerPlatform/auth'

export async function GET(request: Request) {
  // 1. Primary V2 Provider Platform Path (Dietitians, Fitness Coaches, V2 Doctors)
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
    // If not onboarded via provider platform v2 or not found, fall back to core provider query
  }

  // 2. Core Provider Query Fallback (Unified for all roles via user.id)
  const provider = await getAuthenticatedProvider(request)
  if ('error' in provider) {
    return NextResponse.json({ error: provider.error }, { status: provider.status })
  }

  // Query all potential ledgers in parallel for complete reconciliation
  const [
    { data: v2Profile },
    { data: legacyWallet },
    { data: legacyLedgerTxns },
    { data: docWallet },
    { data: docTxns },
    { data: pendingDocPayouts }
  ] = await Promise.all([
    supabaseAdmin
      .from('provider_profiles_v2')
      .select('id, payout_status, bank_verification_status')
      .eq('user_id', provider.user.id)
      .maybeSingle(),
    supabaseAdmin
      .from('wallet_accounts')
      .select('id, current_balance, pending_balance, total_paid, total_earned')
      .eq('provider_id', provider.user.id)
      .maybeSingle(),
    supabaseAdmin
      .from('wallet_ledger_transactions')
      .select('id, amount, transaction_type, status, description, created_at')
      .eq('provider_id', provider.user.id)
      .order('created_at', { ascending: false })
      .limit(50),
    supabaseAdmin
      .from('doctor_wallet')
      .select('doctor_id, balance, total_earned, total_withdrawn, updated_at')
      .eq('doctor_id', provider.user.id)
      .maybeSingle(),
    supabaseAdmin
      .from('doctor_wallet_transactions')
      .select('id, doctor_id, patient_id, appointment_id, type, amount, status, payout_status, created_at')
      .eq('doctor_id', provider.user.id)
      .order('created_at', { ascending: false })
      .limit(50),
    supabaseAdmin
      .from('provider_payouts')
      .select('id, payout_amount, payout_status, created_at, failure_reason')
      .eq('provider_id', provider.user.id)
      .in('payout_status', ['PENDING', 'PROCESSING', 'FAILED', 'COMPLETED'])
      .order('created_at', { ascending: false })
      .limit(50),
  ])

  let v2Result: any = null
  if (v2Profile?.id) {
    try {
      v2Result = await ProviderFinanceService.getProviderWalletForProvider(v2Profile.id)
    } catch {}
  }

  // Calculate highest eligible balance across schemas
  const v2Eligible = Number(v2Result?.wallet?.eligible_balance || 0)
  const v2Processing = Number(v2Result?.wallet?.processing_balance || 0)
  const v2Paid = Number(v2Result?.wallet?.paid_total || 0)
  const v2Pending = Number(v2Result?.wallet?.pending_balance || 0)
  const v2OnHold = Number(v2Result?.wallet?.on_hold_balance || 0)

  const legacyCurrent = Number(legacyWallet?.current_balance || 0)
  const legacyPending = Number(legacyWallet?.pending_balance || 0)
  const legacyPaid = Number(legacyWallet?.total_paid || 0)
  const legacyEarned = Number(legacyWallet?.total_earned || 0)

  const docBalance = Number(docWallet?.balance || 0)
  const docWithdrawn = Number(docWallet?.total_withdrawn || 0)
  const docEarned = Number(docWallet?.total_earned || 0)

  const balance = Math.max(v2Eligible, legacyCurrent, docBalance)
  const pendingPayout = Math.max(v2Processing, legacyPending, (pendingDocPayouts || []).filter((p: any) => ['PENDING', 'PROCESSING'].includes(p.payout_status)).reduce((s: number, p: any) => s + Number(p.payout_amount || 0), 0))
  const completedPayout = Math.max(v2Paid, legacyPaid, docWithdrawn)
  const lifetimeEarnings = Math.max(
    v2Eligible + v2Processing + v2Paid + v2Pending + v2OnHold,
    legacyEarned,
    docEarned,
    balance + completedPayout + pendingPayout
  )

  // Merge transactions from all available ledgers
  const allTxns: any[] = [
    ...(v2Result?.transactions || []),
    ...(legacyLedgerTxns || []).map((t: any) => ({
      id: t.id,
      transaction_type: t.transaction_type,
      amount: Number(t.amount || 0),
      status: t.status,
      description: t.description || (t.transaction_type === 'CONSULTATION_CREDIT' ? 'Consultation Earning' : 'Wallet Transaction'),
      created_at: t.created_at,
    })),
    ...(docTxns || []).map((t: any) => ({
      id: t.id,
      transaction_type: t.type === 'withdrawal' ? 'PAYOUT' : 'CONSULTATION_CREDIT',
      amount: Number(t.amount || 0),
      status: t.payout_status || t.status || 'SUCCESS',
      description: t.type === 'withdrawal' ? 'Bank Account Withdrawal' : 'Consultation Earning',
      created_at: t.created_at || new Date().toISOString(),
    })),
  ]

  const seenTxnIds = new Set<string>()
  const uniqueTxns = allTxns.filter((t) => {
    if (!t.id || seenTxnIds.has(t.id)) return false
    seenTxnIds.add(t.id)
    return true
  }).sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime())

  // Merge payouts from both V2 and V1
  const allPayouts = [
    ...(v2Result?.payouts || []).map((p: any) => ({
      id: p.id,
      payout_amount: Number(p.net_amount ?? p.gross_amount ?? 0),
      payout_status: p.status,
      failure_reason: p.failure_reason,
      initiated_at: p.initiated_at || p.created_at,
      created_at: p.created_at,
    })),
    ...(pendingDocPayouts || []).map((p: any) => ({
      id: p.id,
      payout_amount: Number(p.payout_amount || 0),
      payout_status: p.payout_status,
      failure_reason: p.failure_reason,
      initiated_at: p.created_at,
      created_at: p.created_at,
    })),
  ]

  const seenPayoutIds = new Set<string>()
  const uniquePayouts = allPayouts.filter((p) => {
    if (!p.id || seenPayoutIds.has(p.id)) return false
    seenPayoutIds.add(p.id)
    return true
  }).sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime())

  const latestCompletedPayout = uniquePayouts.find((p) => ['COMPLETED', 'SUCCESS'].includes(String(p.payout_status).toUpperCase()))

  return NextResponse.json({
    wallet: {
      provider_id: provider.user.id,
      provider_profile_id: v2Profile?.id || provider.user.id,
      balance,
      current_balance: balance,
      pending_payout: pendingPayout,
      pending_balance: pendingPayout,
      eligible_balance: balance,
      completed_payout: completedPayout,
      total_paid: completedPayout,
      lifetime_earnings: lifetimeEarnings,
      total_earned: lifetimeEarnings,
      payout_status: v2Profile?.payout_status || 'ACTIVE',
      bank_verification_status: v2Profile?.bank_verification_status || 'VERIFIED',
      last_payout: latestCompletedPayout || null,
    },
    transactions: uniqueTxns,
    payouts: uniquePayouts,
    earnings: v2Result?.earnings || [],
  })
}
