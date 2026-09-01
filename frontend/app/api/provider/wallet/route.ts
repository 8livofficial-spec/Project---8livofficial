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

  // Auto-link/query V2 provider profile by user.id
  const { data: v2Profile } = await supabaseAdmin
    .from('provider_profiles_v2')
    .select('id, payout_status, bank_verification_status')
    .eq('user_id', provider.user.id)
    .maybeSingle()

  if (v2Profile?.id) {
    const result = await ProviderFinanceService.getProviderWalletForProvider(v2Profile.id)
    const wallet = result.wallet
    const latestCompletedPayout = (result.payouts || []).find(payout => payout.status === 'SUCCESS')

    return NextResponse.json({
      wallet: {
        provider_id: provider.user.id,
        provider_profile_id: v2Profile.id,
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
        payout_status: v2Profile.payout_status,
        bank_verification_status: v2Profile.bank_verification_status,
        last_payout: latestCompletedPayout || null,
      },
      transactions: result.transactions,
      payouts: result.payouts,
      earnings: result.earnings,
    })
  }

  // Legacy fallback read (reconciled view)
  const [{ data: docWallet }, { data: docTxns }, { data: pendingDocPayouts }] = await Promise.all([
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
      .limit(100),
    supabaseAdmin
      .from('provider_payouts')
      .select('id, payout_amount, payout_status, created_at')
      .eq('provider_id', provider.user.id)
      .in('payout_status', ['PENDING', 'PROCESSING']),
  ])

  const recordedEarned = Number(docWallet?.total_earned || 0)
  const recordedWithdrawn = Number(docWallet?.total_withdrawn || 0)
  const balance = Math.max(0, recordedEarned - recordedWithdrawn)
  const pendingAmount = (pendingDocPayouts || []).reduce((sum, p) => sum + Number(p.payout_amount || 0), 0)

  const normalizedTxns = (docTxns || []).map((t: any) => ({
    id: t.id,
    transaction_type: t.type === 'withdrawal' ? 'PAYOUT' : 'CONSULTATION_CREDIT',
    amount: Number(t.amount || 0),
    status: t.payout_status || t.status || 'SUCCESS',
    description: t.type === 'withdrawal' ? 'Bank Account Withdrawal' : 'Consultation Earning',
    created_at: t.created_at || new Date().toISOString()
  }))

  return NextResponse.json({
    wallet: {
      provider_id: provider.user.id,
      balance,
      current_balance: balance,
      pending_payout: pendingAmount,
      pending_balance: pendingAmount,
      completed_payout: recordedWithdrawn,
      total_paid: recordedWithdrawn,
      lifetime_earnings: recordedEarned,
      total_earned: recordedEarned,
      last_payout: null,
    },
    transactions: normalizedTxns,
    payouts: pendingDocPayouts || [],
  })
}
