import { supabaseAdmin } from '@/lib/supabaseServer'

export interface UnifiedWalletData {
  provider_id: string
  doctor_id: string
  provider_profile_id: string
  balance: number
  current_balance: number
  pending_payout: number
  pending_balance: number
  eligible_balance: number
  completed_payout: number
  total_paid: number
  total_withdrawn: number
  lifetime_earnings: number
  total_earned: number
  payout_status: string
  bank_verification_status: string
  last_payout: any | null
  updated_at: string
}

export interface UnifiedWalletResult {
  wallet: UnifiedWalletData
  transactions: any[]
  payouts: any[]
  earnings: any[]
}

/**
 * Single source of truth for provider/doctor wallet calculations across:
 * - /api/provider/wallet
 * - /api/provider/dashboard
 * - Provider / Doctor Dashboard sidebars & wallet views
 */
export async function getUnifiedProviderWallet(
  userId: string,
  profileId?: string,
  completedConsultsFallbackCount?: number
): Promise<UnifiedWalletResult> {
  const pId = profileId || userId

  // 1. Resolve Provider Profiles V2 UUID
  const { data: v2Profile } = await supabaseAdmin
    .from('provider_profiles_v2')
    .select('id, user_id, payout_status, bank_verification_status')
    .or(`id.eq.${userId},user_id.eq.${userId},id.eq.${pId},user_id.eq.${pId}`)
    .maybeSingle()

  const v2Id = v2Profile?.id || null

  // 2. Query all ledgers and payouts in parallel
  const [
    { data: v3Wallet },
    { data: v3Payouts },
    { data: v3Txns },
    { data: v3Earnings },
    { data: legWallet },
    { data: legPayouts },
    { data: legTxns },
    { data: docW },
    { data: docT }
  ] = await Promise.all([
    // V3 Tables
    v2Id
      ? supabaseAdmin.from('provider_wallets').select('*').or(`provider_id.eq.${v2Id},provider_id.eq.${userId}`).maybeSingle()
      : supabaseAdmin.from('provider_wallets').select('*').eq('provider_id', userId).maybeSingle(),
    v2Id
      ? supabaseAdmin.from('provider_payout_records').select('*').or(`provider_id.eq.${v2Id},provider_id.eq.${userId}`).order('created_at', { ascending: false }).limit(50)
      : supabaseAdmin.from('provider_payout_records').select('*').eq('provider_id', userId).order('created_at', { ascending: false }).limit(50),
    v2Id
      ? supabaseAdmin.from('provider_wallet_transactions').select('*').or(`provider_id.eq.${v2Id},provider_id.eq.${userId}`).order('created_at', { ascending: false }).limit(50)
      : supabaseAdmin.from('provider_wallet_transactions').select('*').eq('provider_id', userId).order('created_at', { ascending: false }).limit(50),
    v2Id
      ? supabaseAdmin.from('provider_earnings').select('*').or(`provider_id.eq.${v2Id},provider_id.eq.${userId}`).order('earned_at', { ascending: false }).limit(50)
      : supabaseAdmin.from('provider_earnings').select('*').eq('provider_id', userId).order('earned_at', { ascending: false }).limit(50),

    // Production Ledger Tables
    supabaseAdmin.from('wallet_accounts').select('*').or(`provider_id.eq.${userId},provider_id.eq.${pId}`).maybeSingle(),
    supabaseAdmin.from('provider_payouts').select('*').or(`provider_id.eq.${userId},provider_id.eq.${pId}`).order('created_at', { ascending: false }).limit(50),
    supabaseAdmin.from('wallet_ledger_transactions').select('*').or(`provider_id.eq.${userId},provider_id.eq.${pId}`).order('created_at', { ascending: false }).limit(50),

    // Legacy Doctor Tables
    supabaseAdmin.from('doctor_wallet').select('*').or(`doctor_id.eq.${userId},doctor_id.eq.${pId}`).maybeSingle(),
    supabaseAdmin.from('doctor_wallet_transactions').select('*').or(`doctor_id.eq.${userId},doctor_id.eq.${pId}`).order('created_at', { ascending: false }).limit(50),
  ])

  // 3. Balance Calculations
  const v3Eligible = Number(v3Wallet?.eligible_balance || 0)
  const v3Processing = Number(v3Wallet?.processing_balance || 0)
  const v3Paid = Number(v3Wallet?.paid_total || 0)
  const v3Pending = Number(v3Wallet?.pending_balance || 0)
  const v3OnHold = Number(v3Wallet?.on_hold_balance || 0)

  const legCurrent = Number(legWallet?.current_balance || 0)
  const legPending = Number(legWallet?.pending_balance || 0)
  const legPaid = Number(legWallet?.total_paid || 0)
  const legEarned = Number(legWallet?.total_earned || 0)

  const docBalance = Number(docW?.balance || 0)
  const docWithdrawn = Number(docW?.total_withdrawn || 0)
  const docEarned = Number(docW?.total_earned || 0)

  let balance = Math.max(v3Eligible, legCurrent, docBalance)
  const pendingPayout = Math.max(
    v3Processing,
    legPending,
    (legPayouts || []).filter((p: any) => ['PENDING', 'PROCESSING'].includes(String(p.payout_status || '').toUpperCase())).reduce((s: number, p: any) => s + Number(p.payout_amount || 0), 0)
  )
  const completedPayout = Math.max(v3Paid, legPaid, docWithdrawn)
  let lifetimeEarnings = Math.max(
    v3Eligible + v3Processing + v3Paid + v3Pending + v3OnHold,
    legEarned,
    docEarned,
    balance + completedPayout + pendingPayout
  )

  // Fallback ONLY when no ledger record or wallet balance exists anywhere
  if (balance === 0 && completedPayout === 0 && pendingPayout === 0 && (completedConsultsFallbackCount || 0) > 0) {
    const dynamicEarned = (completedConsultsFallbackCount || 0) * 300
    balance = dynamicEarned
    lifetimeEarnings = dynamicEarned
  }

  // 4. Merge Transactions
  const allTxns: any[] = [
    ...(v3Txns || []).map((t: any) => ({
      id: t.id,
      transaction_type: t.transaction_type,
      amount: Number(t.amount || 0),
      status: t.status || 'SUCCESS',
      description: t.transaction_type === 'PAYOUT' ? 'Bank Account Withdrawal' : 'Consultation Earning',
      created_at: t.created_at,
    })),
    ...(legTxns || []).map((t: any) => ({
      id: t.id,
      transaction_type: t.transaction_type,
      amount: Number(t.amount || 0),
      status: t.status,
      description: t.description || (t.transaction_type === 'CONSULTATION_CREDIT' ? 'Consultation Earning' : 'Wallet Transaction'),
      created_at: t.created_at,
    })),
    ...(docT || []).map((t: any) => ({
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

  // 5. Merge Payouts (Normalized fields for all components)
  const allPayouts = [
    ...(v3Payouts || []).map((p: any) => {
      const amt = Number(p.net_amount ?? p.gross_amount ?? 0)
      let status = String(p.status || 'PENDING').toUpperCase()
      if (status === 'SUCCESS') status = 'COMPLETED'
      return {
        id: p.id,
        payout_amount: amt,
        net_amount: amt,
        gross_amount: Number(p.gross_amount ?? amt),
        amount: amt,
        payout_status: status,
        status,
        failure_reason: p.failure_reason || null,
        initiated_at: p.initiated_at || p.created_at,
        created_at: p.created_at,
        source: 'provider_payout_records',
      }
    }),
    ...(legPayouts || []).map((p: any) => {
      const amt = Number(p.payout_amount || 0)
      const status = String(p.payout_status || 'PENDING').toUpperCase()
      return {
        id: p.id,
        payout_amount: amt,
        net_amount: amt,
        gross_amount: amt,
        amount: amt,
        payout_status: status,
        status,
        failure_reason: p.failure_reason || null,
        initiated_at: p.initiated_at || p.created_at,
        created_at: p.created_at,
        source: 'provider_payouts',
      }
    }),
    ...(docT || []).filter((t: any) => t.type === 'withdrawal' || t.payout_status || Number(t.amount) < 0).map((t: any) => {
      const amt = Math.abs(Number(t.amount || 0))
      let status = String(t.payout_status || t.status || 'PENDING').toUpperCase()
      if (status === 'PAID' || status === 'CREDITED') status = 'COMPLETED'
      return {
        id: t.id,
        payout_amount: amt,
        net_amount: amt,
        gross_amount: amt,
        amount: amt,
        payout_status: status,
        status,
        failure_reason: null,
        initiated_at: t.created_at,
        created_at: t.created_at,
        source: 'doctor_wallet_transactions',
      }
    }),
  ]

  const seenPayoutIds = new Set<string>()
  const uniquePayouts = allPayouts.filter((p) => {
    if (!p.id || seenPayoutIds.has(p.id)) return false
    seenPayoutIds.add(p.id)
    return true
  }).sort((a, b) => new Date(b.created_at || b.initiated_at || 0).getTime() - new Date(a.created_at || a.initiated_at || 0).getTime())

  const latestCompletedPayout = uniquePayouts.find((p) => ['COMPLETED', 'SUCCESS'].includes(String(p.payout_status).toUpperCase()))

  const updatedAt = legWallet?.updated_at || v3Wallet?.updated_at || docW?.updated_at || new Date().toISOString()

  return {
    wallet: {
      provider_id: userId,
      doctor_id: userId,
      provider_profile_id: v2Profile?.id || userId,
      balance,
      current_balance: balance,
      pending_payout: pendingPayout,
      pending_balance: pendingPayout,
      eligible_balance: balance,
      completed_payout: completedPayout,
      total_paid: completedPayout,
      total_withdrawn: completedPayout,
      lifetime_earnings: lifetimeEarnings,
      total_earned: lifetimeEarnings,
      payout_status: v2Profile?.payout_status || 'ACTIVE',
      bank_verification_status: v2Profile?.bank_verification_status || 'VERIFIED',
      last_payout: latestCompletedPayout || null,
      updated_at: updatedAt,
    },
    transactions: uniqueTxns,
    payouts: uniquePayouts,
    earnings: v3Earnings || [],
  }
}
