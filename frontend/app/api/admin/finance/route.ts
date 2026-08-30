import { NextResponse } from 'next/server'
import { assertAdmin } from '@/lib/apiSecurity'
import { supabaseAdmin } from '@/lib/supabaseServer'
import { ilikePattern } from '@/lib/queryFilters'

const successStatuses = ['success', 'paid', 'captured']
const pendingStatuses = ['pending', 'created', 'authorized']
const failedStatuses = ['failed', 'cancelled', 'declined']

export async function GET(request: Request) {
  try {
    await assertAdmin(request)
    const { searchParams } = new URL(request.url)
    const paymentsPage = Math.max(1, Number(searchParams.get('paymentsPage') || '1'))
    const paymentsLimit = Math.min(100, Math.max(1, Number(searchParams.get('paymentsLimit') || '25')))
    const payoutsPage = Math.max(1, Number(searchParams.get('payoutsPage') || '1'))
    const payoutsLimit = Math.min(100, Math.max(1, Number(searchParams.get('payoutsLimit') || '25')))
    const auditPage = Math.max(1, Number(searchParams.get('auditPage') || '1'))
    const auditLimit = Math.min(100, Math.max(1, Number(searchParams.get('auditLimit') || '25')))
    const paymentTab = searchParams.get('paymentTab') || 'all'
    const searchRaw = searchParams.get('search')?.trim() || ''

    // 1. Fetch doctor profiles safely
    let doctorProfiles: any[] = []
    try {
      const { data } = await supabaseAdmin
        .from('doctor_profiles')
        .select('id, full_name, specialty, profile_photo_url')
      doctorProfiles = data || []
    } catch (err) {
      console.warn('[admin/finance] Failed to load doctor profiles:', err)
    }

    // 2. Fetch wallets (support both wallet_accounts and doctor_wallet)
    let wallets: any[] = []
    try {
      const { data, error } = await supabaseAdmin
        .from('wallet_accounts')
        .select('provider_id, current_balance, total_earned, total_paid, pending_balance')
      if (!error && data && data.length > 0) {
        wallets = data
      } else {
        throw error || new Error('wallet_accounts empty or missing')
      }
    } catch {
      try {
        const { data } = await supabaseAdmin
          .from('doctor_wallet')
          .select('doctor_id, balance, total_earned, total_withdrawn')
        wallets = (data || []).map((w: any) => ({
          provider_id: w.doctor_id,
          current_balance: w.balance || 0,
          total_earned: w.total_earned || 0,
          total_paid: w.total_withdrawn || 0,
          pending_balance: 0,
        }))
      } catch (err) {
        console.warn('[admin/finance] Failed to load wallets:', err)
      }
    }

    // 3. Total Earned
    let totalEarnedData: any[] = []
    try {
      const { data, error } = await supabaseAdmin
        .from('wallet_ledger_transactions')
        .select('amount')
        .eq('transaction_type', 'CONSULTATION_CREDIT')
        .eq('status', 'SUCCESS')
      if (!error && data) {
        totalEarnedData = data
      } else {
        throw error || new Error('wallet_ledger_transactions empty')
      }
    } catch {
      try {
        const { data } = await supabaseAdmin
          .from('doctor_wallet_transactions')
          .select('amount')
          .eq('type', 'credit')
        totalEarnedData = data || []
      } catch (err) {
        console.warn('[admin/finance] Failed to load earned transactions:', err)
      }
    }

    // 4. Provider Payouts
    let lightPayoutsData: any[] = []
    let paginatedPayouts: any[] = []
    let payoutsCount = 0
    try {
      const { data } = await supabaseAdmin
        .from('provider_payouts')
        .select('provider_id, payout_status, payout_amount')
      lightPayoutsData = data || []

      const payoutsFrom = (payoutsPage - 1) * payoutsLimit
      const payoutsTo = payoutsPage * payoutsLimit - 1
      const pageRes = await supabaseAdmin
        .from('provider_payouts')
        .select('id, provider_id, payout_amount, payout_status, initiated_at, payment_reference, failure_reason, created_at, updated_at', { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(payoutsFrom, payoutsTo)
      if (!pageRes.error && pageRes.data) {
        paginatedPayouts = pageRes.data
        payoutsCount = pageRes.count || 0
      }
    } catch (err) {
      console.warn('[admin/finance] Failed to load provider payouts:', err)
    }

    // 5. Ledger / Wallet Transactions
    let transactionsData: any[] = []
    try {
      const { data, error } = await supabaseAdmin
        .from('wallet_ledger_transactions')
        .select('id, provider_id, doctor_id, type, transaction_type, amount, status, payout_status, payment_reference, razorpay_payout_id, created_at, updated_at')
        .order('created_at', { ascending: false })
        .limit(1000)
      if (!error && data && data.length > 0) {
        transactionsData = data
      } else {
        throw error || new Error('wallet_ledger_transactions empty')
      }
    } catch {
      try {
        const { data } = await supabaseAdmin
          .from('doctor_wallet_transactions')
          .select('id, doctor_id, type, amount, status, description, created_at')
          .order('created_at', { ascending: false })
          .limit(1000)
        transactionsData = (data || []).map((t: any) => ({
          ...t,
          provider_id: t.doctor_id,
          transaction_type: t.type,
        }))
      } catch (err) {
        console.warn('[admin/finance] Failed to load transactions:', err)
      }
    }

    // 6. Audit Logs
    let auditLogs: any[] = []
    let auditCount = 0
    try {
      const auditFrom = (auditPage - 1) * auditLimit
      const auditTo = auditPage * auditLimit - 1
      const auditRes = await supabaseAdmin
        .from('wallet_audit_log')
        .select('id, provider_id, actor_id, initiated_by, action, amount, reason, reference_id, created_at', { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(auditFrom, auditTo)
      if (!auditRes.error && auditRes.data) {
        auditLogs = auditRes.data
        auditCount = auditRes.count || 0
      }
    } catch (err) {
      console.warn('[admin/finance] Failed to load audit logs:', err)
    }

    // 7. Payment Transactions (All + Paginated)
    let allPayData: any[] = []
    let paymentTransactions: any[] = []
    let paymentsCount = 0
    try {
      const allPayRes = await supabaseAdmin
        .from('payment_transactions')
        .select('status, amount, payment_type, created_at')
      allPayData = allPayRes.data || []

      let payQuery = supabaseAdmin
        .from('payment_transactions')
        .select('id, patient_id, amount, status, payment_type, membership_tier, payment_method, payment_provider, transaction_id, created_at, metadata', { count: 'exact' })

      if (paymentTab === 'consultation') payQuery = payQuery.eq('payment_type', 'consultation')
      else if (paymentTab === 'membership') payQuery = payQuery.in('payment_type', ['membership', 'combined'])
      else if (paymentTab === 'refunds') payQuery = payQuery.lt('amount', 0)
      else if (paymentTab === 'failed') payQuery = payQuery.in('status', failedStatuses)

      if (searchRaw) {
        payQuery = payQuery.or(`transaction_id.ilike.%${searchRaw}%,payment_type.ilike.%${searchRaw}%,status.ilike.%${searchRaw}%`)
      }

      const payFrom = (paymentsPage - 1) * paymentsLimit
      const payTo = paymentsPage * paymentsLimit - 1
      const payRes = await payQuery.order('created_at', { ascending: false }).range(payFrom, payTo)
      if (!payRes.error && payRes.data) {
        paymentTransactions = payRes.data
        paymentsCount = payRes.count || 0
      } else {
        // Fallback basic query
        const fallbackPay = await supabaseAdmin
          .from('payment_transactions')
          .select('id, patient_id, amount, status, payment_type, membership_tier, payment_method, payment_provider, transaction_id, created_at, metadata', { count: 'exact' })
          .order('created_at', { ascending: false })
          .range(payFrom, payTo)
        paymentTransactions = fallbackPay.data || []
        paymentsCount = fallbackPay.count || 0
      }
    } catch (err) {
      console.warn('[admin/finance] Failed to load payment transactions:', err)
    }

    const doctors = doctorProfiles.map((doc: any) => {
      const wallet = wallets.find((w: any) => w.provider_id === doc.id) || { current_balance: 0, total_earned: 0, total_paid: 0, pending_balance: 0 }
      return {
        ...doc,
        doctor_id: doc.id,
        balance: Number(wallet.current_balance || 0),
        total_earned: Number(wallet.total_earned || 0),
        total_paid: Number(wallet.total_paid || 0),
        pending_balance: Number(wallet.pending_balance || 0),
      }
    })

    const startOfMonth = new Date()
    startOfMonth.setDate(1)
    startOfMonth.setHours(0, 0, 0, 0)
    const todayKey = new Date().toISOString().split('T')[0]
    const isSuccess = (p: any) => successStatuses.includes(String(p.status || '').toLowerCase())

    return NextResponse.json({
      doctors,
      providerPayouts: lightPayoutsData,
      paginatedPayouts,
      payoutsTotalPages: Math.max(1, Math.ceil(payoutsCount / payoutsLimit)),
      auditLogs,
      auditTotalPages: Math.max(1, Math.ceil(auditCount / auditLimit)),
      transactions: transactionsData,
      paymentTransactions,
      paymentsTotalPages: Math.max(1, Math.ceil(paymentsCount / paymentsLimit)),
      summary: {
        totalProviderEarnings: totalEarnedData.reduce((sum, tx) => sum + (Number(tx?.amount) || 0), 0),
        monthlyRevenue: allPayData.filter((p: any) => isSuccess(p) && p.created_at && new Date(p.created_at) >= startOfMonth).reduce((sum: number, p: any) => sum + (Number(p?.amount) || 0), 0),
        successfulPaymentsCount: allPayData.filter(isSuccess).length,
        pendingPaymentsCount: allPayData.filter((p: any) => pendingStatuses.includes(String(p?.status || '').toLowerCase())).length,
        failedPaymentsCount: allPayData.filter((p: any) => failedStatuses.includes(String(p?.status || '').toLowerCase())).length,
        refundsCount: allPayData.filter((p: any) => Number(p?.amount || 0) < 0 || String(p?.status || '').toLowerCase().includes('refund')).length,
        totalRevenue: allPayData.filter(isSuccess).reduce((sum: number, p: any) => sum + (Number(p?.amount) || 0), 0),
        todayRevenue: allPayData.filter((p: any) => isSuccess(p) && p.created_at?.split('T')[0] === todayKey).reduce((sum: number, p: any) => sum + (Number(p?.amount) || 0), 0),
        consultationRevenue: allPayData.filter((p: any) => isSuccess(p) && p.payment_type === 'consultation').reduce((sum: number, p: any) => sum + (Number(p?.amount) || 0), 0),
        membershipRevenue: allPayData.filter((p: any) => isSuccess(p) && ['membership', 'combined'].includes(p.payment_type)).reduce((sum: number, p: any) => sum + (Number(p?.amount) || 0), 0),
      },
    })
  } catch (err: any) {
    const status = err.message === 'Forbidden' ? 403 : (err.message === 'Unauthorized' ? 401 : 500)
    return NextResponse.json({ error: err.message || 'Failed to load finance data.' }, { status })
  }
}
