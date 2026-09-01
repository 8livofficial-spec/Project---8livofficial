import { NextResponse } from 'next/server'
import { assertAdmin } from '@/lib/apiSecurity'
import { supabaseAdmin } from '@/lib/supabaseServer'
import { ilikePattern } from '@/lib/queryFilters'

const successStatuses = ['success', 'paid', 'captured', 'completed', 'authorized']
const pendingStatuses = ['pending', 'created', 'processing']
const failedStatuses = ['failed', 'cancelled', 'declined', 'error']

const CONSULTATION_FEE_DEFAULT = 499
const SILVER_PLAN_FEE_DEFAULT = 4999
const GOLD_PLAN_FEE_DEFAULT = 9999
const DOCTOR_PAYOUT_PER_CONSULT = 300

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

    // 1. Fetch Profiles across all provider schemas
    let doctorProfiles: any[] = []
    let providerProfilesV2: any[] = []
    let careTeamProfiles: any[] = []
    let allDoctorConsultations: any[] = []

    try {
      const [{ data: docData }, { data: v2Data }, { data: staffData }, { data: consultData }] = await Promise.all([
        supabaseAdmin.from('doctor_profiles').select('id, full_name, specialty, profile_photo_url, payout_amount'),
        supabaseAdmin.from('provider_profiles_v2').select('id, user_id, full_name, role, email, phone_number, specialization, status'),
        supabaseAdmin.from('profiles').select('id, first_name, last_name, email, role, phone_number').in('role', ['doctor', 'dietitian', 'nutritionist', 'fitness_coach', 'trainer']),
        supabaseAdmin.from('doctor_consultations').select('id, doctor_id, status, is_completed, created_at, completed_at'),
      ])
      doctorProfiles = docData || []
      providerProfilesV2 = v2Data || []
      careTeamProfiles = staffData || []
      allDoctorConsultations = consultData || []
    } catch (err) {
      console.warn('[admin/finance] Failed to load provider profiles / consultations:', err)
    }

    // 2. Fetch Health Assessments for Membership & Consultation fallback revenue
    let assessments: any[] = []
    try {
      const { data: assessData } = await supabaseAdmin
        .from('health_assessments')
        .select('patient_id, consultation_fee_paid, membership_tier, created_at, updated_at')
      assessments = assessData || []
    } catch (err) {
      console.warn('[admin/finance] Failed to load health assessments:', err)
    }

    // 3. Fetch Wallets across all 3 schema generations
    let v3Wallets: any[] = []
    let v2Wallets: any[] = []
    let legacyWallets: any[] = []

    try {
      const [{ data: v3W }, { data: v2W }, { data: legW }] = await Promise.all([
        supabaseAdmin.from('provider_wallets').select('id, provider_id, eligible_balance, processing_balance, paid_total, lifetime_earnings'),
        supabaseAdmin.from('wallet_accounts').select('id, provider_id, current_balance, pending_balance, total_paid, total_earned'),
        supabaseAdmin.from('doctor_wallet').select('id, doctor_id, balance, total_earned, total_withdrawn'),
      ])
      v3Wallets = v3W || []
      v2Wallets = v2W || []
      legacyWallets = legW || []
    } catch (err) {
      console.warn('[admin/finance] Failed to load wallet tables:', err)
    }

    // Map linking V2 Profile UUID <-> User Auth UUID
    const v2ToUserMap = new Map<string, string>()
    const userToV2Map = new Map<string, string>()
    for (const v2 of providerProfilesV2) {
      if (v2.id && v2.user_id) {
        v2ToUserMap.set(v2.id, v2.user_id)
        userToV2Map.set(v2.user_id, v2.id)
      }
    }

    // Helper to resolve wallet metrics for any provider ID (user.id, v2.id, or doctor_profiles.id)
    const resolveWalletMetrics = (id: string) => {
      const altId = v2ToUserMap.get(id) || userToV2Map.get(id) || id

      const w3 = v3Wallets.find(w => w.provider_id === id || w.provider_id === altId)
      const w2 = v2Wallets.find(w => w.provider_id === id || w.provider_id === altId)
      const w1 = legacyWallets.find(w => w.doctor_id === id || w.doctor_id === altId)

      const balance = Math.max(
        Number(w3?.eligible_balance || 0),
        Number(w2?.current_balance || 0),
        Number(w1?.balance || 0)
      )

      const pending_balance = Math.max(
        Number(w3?.processing_balance || 0),
        Number(w2?.pending_balance || 0)
      )

      const total_paid = Math.max(
        Number(w3?.paid_total || 0),
        Number(w2?.total_paid || 0),
        Number(w1?.total_withdrawn || 0)
      )

      const total_earned = Math.max(
        Number(w3?.lifetime_earnings || 0),
        Number(w2?.total_earned || 0),
        Number(w1?.total_earned || 0),
        balance + total_paid + pending_balance
      )

      return { balance, pending_balance, total_paid, total_earned }
    }

    // 4. Calculate Unified Doctor & Provider list with real balances
    const completedStatuses = ['approved', 'completed', 'attended']
    const combinedDoctorsMap = new Map<string, any>()

    // Add doctor_profiles
    for (const doc of doctorProfiles) {
      const docConsults = allDoctorConsultations.filter((c: any) => c.doctor_id === doc.id)
      const completedCount = docConsults.filter((c: any) => completedStatuses.includes(String(c.status || '').toLowerCase()) || c.is_completed).length
      const rate = Number(doc.payout_amount) || DOCTOR_PAYOUT_PER_CONSULT
      const dynamicEarned = completedCount * rate

      const wallet = resolveWalletMetrics(doc.id)
      const total_earned = Math.max(wallet.total_earned, dynamicEarned)
      const balance = Math.max(wallet.balance, Math.max(0, total_earned - wallet.total_paid - wallet.pending_balance))

      combinedDoctorsMap.set(doc.id, {
        ...doc,
        doctor_id: doc.id,
        role: 'doctor',
        completed_consultations: completedCount,
        balance,
        pending_balance: wallet.pending_balance,
        total_paid: wallet.total_paid,
        total_earned,
      })
    }

    // Add provider_profiles_v2
    for (const v2 of providerProfilesV2) {
      const id = v2.user_id || v2.id
      const existing = combinedDoctorsMap.get(id) || combinedDoctorsMap.get(v2.id)
      const wallet = resolveWalletMetrics(v2.id)

      const name = v2.full_name || (existing ? existing.full_name : null) || v2.email || 'Provider'
      combinedDoctorsMap.set(id, {
        id,
        doctor_id: id,
        provider_profile_id: v2.id,
        user_id: v2.user_id,
        full_name: name,
        role: v2.role === 'trainer' ? 'fitness_coach' : (v2.role || 'provider'),
        specialty: v2.specialization || 'Clinical Support',
        completed_consultations: existing?.completed_consultations || 0,
        balance: Math.max(existing?.balance || 0, wallet.balance),
        pending_balance: Math.max(existing?.pending_balance || 0, wallet.pending_balance),
        total_paid: Math.max(existing?.total_paid || 0, wallet.total_paid),
        total_earned: Math.max(existing?.total_earned || 0, wallet.total_earned),
      })
    }

    // Add careTeamProfiles (profiles table fallback)
    for (const staff of careTeamProfiles) {
      if (!combinedDoctorsMap.has(staff.id)) {
        const wallet = resolveWalletMetrics(staff.id)
        const name = `${staff.first_name || ''} ${staff.last_name || ''}`.trim() || staff.email || 'Staff'
        combinedDoctorsMap.set(staff.id, {
          id: staff.id,
          doctor_id: staff.id,
          full_name: name,
          role: staff.role === 'trainer' ? 'fitness_coach' : staff.role,
          specialty: 'Clinical Support',
          completed_consultations: 0,
          balance: wallet.balance,
          pending_balance: wallet.pending_balance,
          total_paid: wallet.total_paid,
          total_earned: wallet.total_earned,
        })
      }
    }

    const doctors = Array.from(combinedDoctorsMap.values())

    // 5. Total Provider Earnings & Balances across platform
    const totalProviderEarnings = doctors.reduce((sum, d) => sum + Number(d.total_earned || 0), 0)

    // 6. Provider Payouts (Unified across provider_payout_records, provider_payouts, doctor_wallet_transactions, wallet_ledger_transactions)
    let lightPayoutsData: any[] = []
    let paginatedPayouts: any[] = []
    let payoutsCount = 0

    try {
      const [{ data: legacyPayouts }, { data: v2Payouts }, { data: docTxPayouts }, { data: ledgerTxPayouts }, { data: allProfiles }, { data: allV2Profiles }] = await Promise.all([
        supabaseAdmin
          .from('provider_payouts')
          .select('id, provider_id, payout_status, payout_amount, initiated_at, payment_reference, failure_reason, created_at, updated_at')
          .order('created_at', { ascending: false })
          .then(res => res, () => ({ data: [] })),
        supabaseAdmin
          .from('provider_payout_records')
          .select('id, provider_id, status, net_amount, gross_amount, initiated_at, failure_reason, created_at, updated_at')
          .order('created_at', { ascending: false })
          .then(res => res, () => ({ data: [] })),
        supabaseAdmin
          .from('doctor_wallet_transactions')
          .select('id, doctor_id, type, amount, status, payout_status, description, created_at')
          .or('type.ilike.%withdrawal%,type.eq.CONSULTATION_PAYOUT,amount.lt.0')
          .order('created_at', { ascending: false })
          .then(res => res, () => ({ data: [] })),
        supabaseAdmin
          .from('wallet_ledger_transactions')
          .select('id, provider_id, doctor_id, transaction_type, type, amount, status, payout_status, payment_reference, created_at')
          .or('transaction_type.eq.PAYOUT,type.eq.PAYOUT,amount.lt.0')
          .order('created_at', { ascending: false })
          .then(res => res, () => ({ data: [] })),
        supabaseAdmin.from('profiles').select('id, first_name, last_name, email, role').then(res => res, () => ({ data: [] })),
        supabaseAdmin.from('provider_profiles_v2').select('id, user_id, full_name, email, role').then(res => res, () => ({ data: [] })),
      ])

      const profilesById = new Map((allProfiles || []).map((p: any) => [p.id, p]))
      const v2ById = new Map((allV2Profiles || []).map((p: any) => [p.id, p]))

      const getProfileInfo = (id?: string) => {
        if (!id) return { name: 'Provider', role: 'provider' }
        const v2 = v2ById.get(id)
        if (v2) return { name: v2.full_name || v2.email || 'Provider', role: v2.role || 'provider' }
        const p = profilesById.get(id)
        if (p) return { name: `${p.first_name || ''} ${p.last_name || ''}`.trim() || p.email || 'Provider', role: p.role || 'provider' }
        return { name: 'Provider', role: 'provider' }
      }

      const normalizedLegacy = (legacyPayouts || []).map((p: any) => {
        const info = getProfileInfo(p.provider_id)
        return {
          id: p.id,
          provider_id: p.provider_id,
          provider_name: info.name,
          role: info.role,
          payout_amount: Number(p.payout_amount || 0),
          payout_status: String(p.payout_status || 'PENDING').toUpperCase(),
          failure_reason: p.failure_reason || null,
          initiated_at: p.initiated_at || p.created_at,
          payment_reference: p.payment_reference || null,
          created_at: p.created_at,
          source: 'provider_payouts',
        }
      })

      const normalizedV2 = (v2Payouts || []).map((p: any) => {
        const v2Prof = v2ById.get(p.provider_id)
        const targetUserId = v2Prof?.user_id || p.provider_id
        const info = getProfileInfo(p.provider_id)
        
        let status = String(p.status || 'PENDING').toUpperCase()
        if (status === 'SUCCESS') status = 'COMPLETED'
        if (status === 'APPROVED') status = 'PENDING'

        return {
          id: p.id,
          provider_id: targetUserId,
          provider_profile_id: p.provider_id,
          provider_name: info.name,
          role: info.role,
          payout_amount: Number(p.net_amount || p.gross_amount || 0),
          payout_status: status,
          failure_reason: p.failure_reason || null,
          initiated_at: p.initiated_at || p.created_at,
          payment_reference: null,
          created_at: p.created_at,
          source: 'provider_payout_records',
        }
      })

      const normalizedDocTx = (docTxPayouts || []).map((t: any) => {
        const info = getProfileInfo(t.doctor_id)
        let status = String(t.payout_status || t.status || 'PENDING').toUpperCase()
        if (status === 'PAID' || status === 'CREDITED') status = 'COMPLETED'

        return {
          id: t.id,
          provider_id: t.doctor_id,
          provider_name: info.name,
          role: info.role || 'doctor',
          payout_amount: Math.abs(Number(t.amount || 0)),
          payout_status: status,
          failure_reason: null,
          initiated_at: t.created_at,
          payment_reference: null,
          created_at: t.created_at,
          source: 'doctor_wallet_transactions',
        }
      })

      const normalizedLedger = (ledgerTxPayouts || []).map((t: any) => {
        const id = t.provider_id || t.doctor_id
        const info = getProfileInfo(id)
        let status = String(t.payout_status || t.status || 'PENDING').toUpperCase()
        if (status === 'PAID' || status === 'SUCCESS') status = 'COMPLETED'

        return {
          id: t.id,
          provider_id: id,
          provider_name: info.name,
          role: info.role,
          payout_amount: Math.abs(Number(t.amount || 0)),
          payout_status: status,
          failure_reason: null,
          initiated_at: t.created_at,
          payment_reference: t.payment_reference || null,
          created_at: t.created_at,
          source: 'wallet_ledger_transactions',
        }
      })

      // Combine and deduplicate
      const seenPayoutIds = new Set<string>()
      const combinedPayouts: any[] = []

      for (const p of [...normalizedV2, ...normalizedLegacy, ...normalizedDocTx, ...normalizedLedger]) {
        if (!seenPayoutIds.has(p.id) && p.payout_amount > 0) {
          seenPayoutIds.add(p.id)
          combinedPayouts.push(p)
        }
      }

      combinedPayouts.sort((a, b) => new Date(b.created_at || b.initiated_at || 0).getTime() - new Date(a.created_at || a.initiated_at || 0).getTime())

      lightPayoutsData = combinedPayouts
      payoutsCount = combinedPayouts.length

      const payoutsFrom = (payoutsPage - 1) * payoutsLimit
      paginatedPayouts = combinedPayouts.slice(payoutsFrom, payoutsFrom + payoutsLimit)
    } catch (err) {
      console.warn('[admin/finance] Failed to load provider payouts:', err)
    }

    // 7. Ledger / Wallet Transactions
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

    // 8. Audit Logs
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

    // 9. Payment Transactions (All + Paginated)
    let allPayData: any[] = []
    let paymentTransactions: any[] = []
    let paymentsCount = 0
    try {
      const allPayRes = await supabaseAdmin
        .from('payment_transactions')
        .select('id, patient_id, amount, status, payment_type, membership_tier, payment_method, payment_provider, transaction_id, created_at, metadata')
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
        const fallbackPay = await supabaseAdmin
          .from('payment_transactions')
          .select('id, patient_id, amount, status, payment_type, membership_tier, payment_method, payment_provider, transaction_id, created_at, metadata', { count: 'exact' })
          .order('created_at', { ascending: false })
          .range(payFrom, payTo)
        paymentTransactions = fallbackPay.data || []
        paymentsCount = fallbackPay.count || 0
      }

      // Enrich payment transactions with patient profile information
      const patientIds = Array.from(new Set(paymentTransactions.map((p: any) => p.patient_id).filter(Boolean)))
      if (patientIds.length > 0) {
        let profilesMap = new Map()
        let assessmentsMap = new Map()
        try {
          const [{ data: profs }, { data: assess }] = await Promise.all([
            supabaseAdmin.from('profiles').select('id, first_name, last_name, display_id, email, phone_number').in('id', patientIds),
            supabaseAdmin.from('health_assessments').select('patient_id, first_name, last_name, phone_number').in('patient_id', patientIds)
          ])
          if (profs) profilesMap = new Map(profs.map((p: any) => [p.id, p]))
          if (assess) assessmentsMap = new Map(assess.map((a: any) => [a.patient_id, a]))
        } catch (enrichErr) {
          console.warn('[admin/finance] Failed to load patient profiles for payments:', enrichErr)
        }

        paymentTransactions = paymentTransactions.map((payment: any) => {
          const prof = profilesMap.get(payment.patient_id) || {}
          const assess = assessmentsMap.get(payment.patient_id) || {}
          const firstName = assess.first_name || prof.first_name || prof.display_id || ''
          const lastName = assess.last_name || prof.last_name || ''
          const fullName = `${firstName} ${lastName}`.trim() || prof.email?.split('@')[0] || prof.display_id || (payment.patient_id ? `Patient (${String(payment.patient_id).slice(0, 8)})` : 'Patient')

          return {
            ...payment,
            patient_name: fullName,
            patient_email: prof.email || '',
            patient_phone: assess.phone_number || prof.phone_number || '',
            patient_display_id: prof.display_id || '',
          }
        })
      }
    } catch (err) {
      console.warn('[admin/finance] Failed to load payment transactions:', err)
    }

    // 10. Dynamic Revenue Aggregation
    const startOfMonth = new Date()
    startOfMonth.setDate(1)
    startOfMonth.setHours(0, 0, 0, 0)
    const todayKey = new Date().toISOString().split('T')[0]

    const isSuccess = (p: any) => successStatuses.includes(String(p?.status || '').toLowerCase().trim())

    // Direct recorded transaction revenue
    let txnConsultationRevenue = 0
    let txnMembershipRevenue = 0
    let txnMonthlyRevenue = 0
    let txnTodayRevenue = 0
    let txnTotalRevenue = 0

    allPayData.forEach((p: any) => {
      if (isSuccess(p)) {
        const amt = Number(p.amount) || 0
        txnTotalRevenue += amt
        if (p.created_at && new Date(p.created_at) >= startOfMonth) {
          txnMonthlyRevenue += amt
        }
        if (p.created_at?.split('T')[0] === todayKey) {
          txnTodayRevenue += amt
        }
        if (p.payment_type === 'consultation') {
          txnConsultationRevenue += amt
        } else if (['membership', 'combined'].includes(p.payment_type)) {
          txnMembershipRevenue += amt
        }
      }
    })

    // Assessment-based dynamic revenue calculation
    let assessConsultationRevenue = 0
    let assessMembershipRevenue = 0
    assessments.forEach((a: any) => {
      if (a.consultation_fee_paid) {
        assessConsultationRevenue += CONSULTATION_FEE_DEFAULT
      }
      if (a.membership_tier) {
        const tier = String(a.membership_tier).toLowerCase()
        if (tier.includes('gold')) assessMembershipRevenue += GOLD_PLAN_FEE_DEFAULT
        else if (tier.includes('silver')) assessMembershipRevenue += SILVER_PLAN_FEE_DEFAULT
      }
    })

    // Use the higher/most comprehensive figure
    const totalConsultationRevenue = Math.max(txnConsultationRevenue, assessConsultationRevenue)
    const totalMembershipRevenue = Math.max(txnMembershipRevenue, assessMembershipRevenue)
    const computedTotalRevenue = Math.max(txnTotalRevenue, totalConsultationRevenue + totalMembershipRevenue)
    const computedMonthlyRevenue = Math.max(txnMonthlyRevenue, computedTotalRevenue)

    const successfulPaymentsCount = Math.max(
      allPayData.filter(isSuccess).length,
      assessments.filter((a: any) => a.consultation_fee_paid || a.membership_tier).length
    )

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
        totalProviderEarnings,
        monthlyRevenue: computedMonthlyRevenue,
        successfulPaymentsCount,
        pendingPaymentsCount: allPayData.filter((p: any) => pendingStatuses.includes(String(p?.status || '').toLowerCase())).length,
        failedPaymentsCount: allPayData.filter((p: any) => failedStatuses.includes(String(p?.status || '').toLowerCase())).length,
        refundsCount: allPayData.filter((p: any) => Number(p?.amount || 0) < 0 || String(p?.status || '').toLowerCase().includes('refund')).length,
        totalRevenue: computedTotalRevenue,
        todayRevenue: txnTodayRevenue,
        consultationRevenue: totalConsultationRevenue,
        membershipRevenue: totalMembershipRevenue,
      },
    })
  } catch (err: any) {
    const status = err.message === 'Forbidden' ? 403 : (err.message === 'Unauthorized' ? 401 : 500)
    return NextResponse.json({ error: err.message || 'Failed to load finance data.' }, { status })
  }
}
