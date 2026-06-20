import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseServer'
import { assertAdmin } from '@/lib/apiSecurity'

export async function GET(request: Request) {
  try {
    await assertAdmin(request)

    const todayKey = new Date().toISOString().split('T')[0]
    const startOfMonth = new Date()
    startOfMonth.setDate(1)
    startOfMonth.setHours(0, 0, 0, 0)

    // Parallel fetch of all statistics raw data
    const [
      assessmentsRes,
      doctorProfilesRes,
      consultationsRes,
      paymentsRes,
      payoutsRes,
      ledgerRes,
      recentConsRes
    ] = await Promise.all([
      supabaseAdmin
        .from('health_assessments')
        .select('patient_id, is_eligible, consultation_fee_paid, booking_date, booking_time, membership_tier, created_at'),
      supabaseAdmin
        .from('doctor_profiles')
        .select('id, last_seen_at'),
      supabaseAdmin
        .from('doctor_consultations')
        .select('id, patient_id, doctor_id, status, booking_date, booking_time, created_at'),
      supabaseAdmin
        .from('payment_transactions')
        .select('id, amount, status, payment_type, membership_tier, created_at')
        .order('created_at', { ascending: false })
        .limit(100),
      supabaseAdmin
        .from('provider_payouts')
        .select('payout_amount, payout_status'),
      supabaseAdmin
        .from('wallet_ledger_transactions')
        .select('amount, transaction_type, status, created_at')
        .eq('transaction_type', 'CONSULTATION_CREDIT')
        .eq('status', 'SUCCESS'),
      supabaseAdmin
        .from('doctor_consultations')
        .select('id, patient_id, doctor_id, status, booking_date, booking_time, created_at')
        .order('created_at', { ascending: false })
        .limit(12)
    ])

    if (assessmentsRes.error) throw assessmentsRes.error
    if (doctorProfilesRes.error) throw doctorProfilesRes.error
    if (consultationsRes.error) throw consultationsRes.error
    if (paymentsRes.error) throw paymentsRes.error
    if (payoutsRes.error) throw payoutsRes.error
    if (ledgerRes.error) throw ledgerRes.error

    const assessments = assessmentsRes.data || []
    const doctorProfiles = doctorProfilesRes.data || []
    const consultations = consultationsRes.data || []
    const payments = paymentsRes.data || []
    const providerPayouts = payoutsRes.data || []
    const ledger = ledgerRes.data || []
    const recentCons = recentConsRes.data || []

    // 1. Calculate Stats
    const activePatients = assessments.filter((p: any) => p.consultation_fee_paid || p.booking_date || p.membership_tier).length
    const totalDoctors = doctorProfiles.length
    const doctorsOnline = doctorProfiles.filter((doc: any) => {
      if (!doc.last_seen_at) return false
      return Date.now() - new Date(doc.last_seen_at).getTime() <= 5 * 60 * 1000
    }).length

    const scheduledStatuses = ['scheduled', 'calling', 'attended']
    const completedStatuses = ['approved', 'rejected', 'completed']
    const cancelledStatuses = ['cancelled', 'cancelled_by_doctor', 'cancelled_by_patient']
    const pendingStatuses = ['scheduled', 'calling', 'attended', 'pending']

    const todaysConsultations = consultations.filter((c: any) => c.booking_date === todayKey).length
    const activeVideoCalls = consultations.filter((c: any) => c.status === 'calling').length
    const completedConsultations = consultations.filter((c: any) => completedStatuses.includes(String(c.status || '').toLowerCase())).length
    const pendingConsultations = consultations.filter((c: any) => pendingStatuses.includes(String(c.status || '').toLowerCase())).length
    const missedConsultations = consultations.filter((c: any) => String(c.status || '').toLowerCase() === 'missed_by_patient').length
    const cancelledConsultations = consultations.filter((c: any) => cancelledStatuses.includes(String(c.status || '').toLowerCase())).length
    const patientsWaiting = consultations.filter((c: any) => c.status === 'scheduled' && !c.doctor_id).length

    const monthlyRevenue = payments
      .filter((p: any) => (p.status === 'success' || p.status === 'paid') && new Date(p.created_at).getTime() >= startOfMonth.getTime())
      .reduce((sum: number, p: any) => sum + Number(p.amount), 0)

    const platformEarnings = Math.max(
      monthlyRevenue - ledger.reduce((sum: number, tx: any) => sum + Number(tx.amount || 0), 0),
      0
    )

    const pendingPayouts = providerPayouts
      .filter((p: any) => p.payout_status === 'PENDING' || p.payout_status === 'PROCESSING')
      .reduce((sum: number, p: any) => sum + Number(p.payout_amount || 0), 0)

    const goldMembers = assessments.filter((p: any) => String(p.membership_tier || '').toLowerCase().includes('gold')).length
    const silverMembers = assessments.filter((p: any) => String(p.membership_tier || '').toLowerCase().includes('silver')).length

    // 2. Fetch profiles and doctor names to enrich recentActivities
    const recentPatientIds = Array.from(new Set(recentCons.map((c: any) => c.patient_id).filter(Boolean)))
    const recentDoctorIds = Array.from(new Set(recentCons.map((c: any) => c.doctor_id).filter(Boolean)))

    const [patientNamesRes, doctorNamesRes] = await Promise.all([
      supabaseAdmin.from('profiles').select('id, first_name, last_name, email').in('id', recentPatientIds),
      supabaseAdmin.from('doctor_profiles').select('id, full_name').in('id', recentDoctorIds)
    ])

    const patientMap = new Map((patientNamesRes.data || []).map((p: any) => [p.id, `${p.first_name || ''} ${p.last_name || ''}`.trim() || p.email]))
    const doctorMap = new Map((doctorNamesRes.data || []).map((d: any) => [d.id, d.full_name]))

    const recentActivities = [
      ...recentCons.map((c: any) => {
        const pName = patientMap.get(c.patient_id) || 'Patient'
        const dName = doctorMap.get(c.doctor_id) || 'doctor'
        return {
          id: `consultation-${c.id}`,
          at: c.created_at,
          title: c.status === 'approved' || c.status === 'rejected' || c.status === 'completed' ? 'Doctor completed consultation' : c.status?.includes('cancelled') ? 'Appointment cancellation' : 'Patient booking',
          detail: `${pName} with ${dName}${c.booking_date ? ` on ${c.booking_date}` : ''}`,
          tone: c.status?.includes('cancelled') ? 'red' : completedStatuses.includes(String(c.status || '').toLowerCase()) ? 'green' : 'orange',
        }
      }),
      ...payments.slice(0, 10).map((payment: any) => ({
        id: `payment-${payment.id}`,
        at: payment.created_at,
        title: String(payment.payment_type || '').includes('membership') ? 'Membership purchase' : Number(payment.amount || 0) < 0 ? 'Refund issued' : 'Payment received',
        detail: `${payment.membership_tier || payment.payment_type || 'Payment'} · ₹${Number(payment.amount || 0).toLocaleString('en-IN')}`,
        tone: Number(payment.amount || 0) < 0 ? 'red' : String(payment.payment_type || '').includes('membership') ? 'blue' : 'green',
      }))
    ]
      .filter(act => act.at)
      .sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())
      .slice(0, 12)

    return NextResponse.json({
      summary: {
        totalPatients: assessments.length,
        activePatients,
        totalDoctors,
        doctorsOnline,
        todaysConsultations,
        activeVideoCalls,
        completedConsultations,
        pendingConsultations,
        missedConsultations,
        cancelledConsultations,
        patientsWaiting,
        monthlyRevenue,
        platformEarnings,
        pendingPayouts,
        goldMembers,
        silverMembers
      },
      recentActivities
    })
  } catch (err: unknown) {
    console.error("API Error in GET /api/admin/dashboard:", err)
    const message = err instanceof Error ? err.message : 'Internal Server Error'
    const status = message === 'Forbidden' ? 403 : (message === 'Unauthorized' ? 401 : 500)
    return NextResponse.json({ error: message }, { status })
  }
}
