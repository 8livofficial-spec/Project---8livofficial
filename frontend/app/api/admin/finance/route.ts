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
    const searchPattern = ilikePattern(searchParams.get('search') || '')

    const [
      profilesRes,
      walletsRes,
      totalEarnedRes,
      lightPayoutsRes,
      transactionsRes,
      allPayRes,
    ] = await Promise.all([
      supabaseAdmin.from('doctor_profiles').select('id, full_name, specialty, specialization, consultation_type, profile_photo_url'),
      supabaseAdmin.from('wallet_accounts').select('provider_id, current_balance, total_earned, total_paid, pending_balance'),
      supabaseAdmin.from('wallet_ledger_transactions').select('amount').eq('transaction_type', 'CONSULTATION_CREDIT').eq('status', 'SUCCESS'),
      supabaseAdmin.from('provider_payouts').select('provider_id, payout_status, payout_amount'),
      supabaseAdmin
        .from('wallet_ledger_transactions')
        .select('id, provider_id, doctor_id, type, transaction_type, amount, status, payout_status, payment_reference, razorpay_payout_id, created_at, updated_at')
        .order('created_at', { ascending: false })
        .limit(1000),
      supabaseAdmin.from('payment_transactions').select('status, amount, payment_type, created_at'),
    ])

    if (profilesRes.error) throw profilesRes.error
    if (walletsRes.error) throw walletsRes.error
    if (totalEarnedRes.error) throw totalEarnedRes.error
    if (lightPayoutsRes.error) throw lightPayoutsRes.error
    if (transactionsRes.error) throw transactionsRes.error
    if (allPayRes.error) throw allPayRes.error

    const wallets = walletsRes.data || []
    const doctors = (profilesRes.data || []).map((doc: any) => {
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

    const payoutsFrom = (payoutsPage - 1) * payoutsLimit
    const payoutsTo = payoutsPage * payoutsLimit - 1
    const payoutPageRes = await supabaseAdmin
      .from('provider_payouts')
      .select('id, provider_id, payout_amount, payout_status, initiated_at, payment_reference, failure_reason, created_at, updated_at', { count: 'exact' })
      .order('initiated_at', { ascending: false })
      .range(payoutsFrom, payoutsTo)
    if (payoutPageRes.error) throw payoutPageRes.error

    const auditFrom = (auditPage - 1) * auditLimit
    const auditTo = auditPage * auditLimit - 1
    const auditRes = await supabaseAdmin
      .from('wallet_audit_log')
      .select('id, provider_id, actor_id, initiated_by, action, amount, reason, reference_id, created_at', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(auditFrom, auditTo)
    if (auditRes.error) throw auditRes.error

    let payQuery = supabaseAdmin
      .from('payment_transactions')
      .select('id, patient_id, amount, status, payment_type, membership_tier, payment_method, payment_provider, transaction_id, created_at, metadata', { count: 'exact' })

    if (paymentTab === 'consultation') payQuery = payQuery.eq('payment_type', 'consultation')
    else if (paymentTab === 'membership') payQuery = payQuery.in('payment_type', ['membership', 'combined'])
    else if (paymentTab === 'refunds') payQuery = payQuery.or('amount.lt.0,status.ilike.%refund%')
    else if (paymentTab === 'failed') payQuery = payQuery.in('status', failedStatuses)

    if (searchPattern) {
      const matchedPatients = await supabaseAdmin
        .from('health_assessments')
        .select('patient_id')
        .or(`full_name.ilike.${searchPattern},first_name.ilike.${searchPattern},last_name.ilike.${searchPattern}`)
      if (matchedPatients.error) throw matchedPatients.error
      const patientIds = (matchedPatients.data || []).map((p: any) => p.patient_id)
      const orConditions = [
        `id.ilike.${searchPattern}`,
        `transaction_id.ilike.${searchPattern}`,
        `payment_type.ilike.${searchPattern}`,
        `status.ilike.${searchPattern}`,
      ]
      if (patientIds.length > 0) orConditions.push(`patient_id.in.(${patientIds.join(',')})`)
      payQuery = payQuery.or(orConditions.join(','))
    }

    const payFrom = (paymentsPage - 1) * paymentsLimit
    const payTo = paymentsPage * paymentsLimit - 1
    const payRes = await payQuery.order('created_at', { ascending: false }).range(payFrom, payTo)
    if (payRes.error) throw payRes.error

    const allPayData = allPayRes.data || []
    const startOfMonth = new Date()
    startOfMonth.setDate(1)
    startOfMonth.setHours(0, 0, 0, 0)
    const todayKey = new Date().toISOString().split('T')[0]
    const isSuccess = (p: any) => successStatuses.includes(String(p.status || '').toLowerCase())

    return NextResponse.json({
      doctors,
      providerPayouts: lightPayoutsRes.data || [],
      paginatedPayouts: payoutPageRes.data || [],
      payoutsTotalPages: Math.ceil((payoutPageRes.count || 0) / payoutsLimit),
      auditLogs: auditRes.data || [],
      auditTotalPages: Math.ceil((auditRes.count || 0) / auditLimit),
      transactions: transactionsRes.data || [],
      paymentTransactions: payRes.data || [],
      paymentsTotalPages: Math.ceil((payRes.count || 0) / paymentsLimit),
      summary: {
        totalProviderEarnings: (totalEarnedRes.data || []).reduce((sum, tx) => sum + Number(tx.amount || 0), 0),
        monthlyRevenue: allPayData.filter((p: any) => isSuccess(p) && p.created_at && new Date(p.created_at) >= startOfMonth).reduce((sum: number, p: any) => sum + Number(p.amount || 0), 0),
        successfulPaymentsCount: allPayData.filter(isSuccess).length,
        pendingPaymentsCount: allPayData.filter((p: any) => pendingStatuses.includes(String(p.status || '').toLowerCase())).length,
        failedPaymentsCount: allPayData.filter((p: any) => failedStatuses.includes(String(p.status || '').toLowerCase())).length,
        refundsCount: allPayData.filter((p: any) => Number(p.amount || 0) < 0 || String(p.status || '').toLowerCase().includes('refund')).length,
        totalRevenue: allPayData.filter(isSuccess).reduce((sum: number, p: any) => sum + Number(p.amount || 0), 0),
        todayRevenue: allPayData.filter((p: any) => isSuccess(p) && p.created_at?.split('T')[0] === todayKey).reduce((sum: number, p: any) => sum + Number(p.amount || 0), 0),
        consultationRevenue: allPayData.filter((p: any) => isSuccess(p) && p.payment_type === 'consultation').reduce((sum: number, p: any) => sum + Number(p.amount || 0), 0),
        membershipRevenue: allPayData.filter((p: any) => isSuccess(p) && ['membership', 'combined'].includes(p.payment_type)).reduce((sum: number, p: any) => sum + Number(p.amount || 0), 0),
      },
    })
  } catch (err: any) {
    const status = err.message === 'Forbidden' ? 403 : (err.message === 'Unauthorized' ? 401 : 500)
    return NextResponse.json({ error: err.message || 'Failed to load finance data.' }, { status })
  }
}
