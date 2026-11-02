import { NextResponse } from 'next/server'
import { assertSupportAgent } from '@/lib/apiSecurity'
import { supabaseAdmin } from '@/lib/supabaseServer'
import { ilikePattern } from '@/lib/queryFilters'

export async function GET(request: Request) {
  try {
    await assertSupportAgent(request)
    const { searchParams } = new URL(request.url)
    const query = String(searchParams.get('q') || '').trim()

    if (!query || query.length < 2) {
      return NextResponse.json({ patients: [] })
    }

    const pattern = ilikePattern(query)

    // 1. Search profiles by name, email, or phone
    const { data: profiles, error: profileErr } = await supabaseAdmin
      .from('profiles')
      .select('id, full_name, email, phone, role, created_at')
      .or(`full_name.ilike.${pattern},email.ilike.${pattern},phone.ilike.${pattern}`)
      .limit(20)

    if (profileErr) {
      console.warn('[Support Search] Profile search error:', profileErr.message)
    }

    let matchingUserIds = new Set<string>((profiles || []).map((p: any) => p.id))

    // 2. Search by Razorpay Order or Transaction ID
    if (matchingUserIds.size < 20) {
      const { data: txns } = await supabaseAdmin
        .from('payment_transactions')
        .select('patient_id')
        .or(`transaction_id.ilike.${pattern},reference_id.ilike.${pattern}`)
        .limit(10)

      if (txns && txns.length > 0) {
        txns.forEach((t: any) => {
          if (t.patient_id) matchingUserIds.add(t.patient_id)
        })
      }
    }

    const patientIds = Array.from(matchingUserIds)
    if (patientIds.length === 0) {
      return NextResponse.json({ patients: [] })
    }

    // 3. Hydrate matching patients with recent assessment and active plan
    const [{ data: hydratedProfiles }, { data: assessments }, { data: memberships }, { data: appointments }] = await Promise.all([
      supabaseAdmin
        .from('profiles')
        .select('id, full_name, email, phone, role, created_at')
        .in('id', patientIds),
      supabaseAdmin
        .from('health_assessments')
        .select('id, patient_id, bmi, weight_kg, height_cm, primary_goal, created_at, medical_history')
        .in('patient_id', patientIds)
        .order('created_at', { ascending: false }),
      supabaseAdmin
        .from('patient_memberships')
        .select('patient_id, plan_name, status, expires_at, created_at')
        .in('patient_id', patientIds)
        .order('created_at', { ascending: false }),
      supabaseAdmin
        .from('appointments')
        .select('id, patient_id, booking_date, booking_time, status, appointment_type')
        .in('patient_id', patientIds)
        .order('booking_date', { ascending: false })
        .limit(50),
    ])

    const results = (hydratedProfiles || []).map((prof: any) => {
      const pAssessments = (assessments || []).filter((a: any) => a.patient_id === prof.id)
      const latestAssessment = pAssessments[0] || null
      const pMembership = (memberships || []).find((m: any) => m.patient_id === prof.id && m.status === 'ACTIVE') || (memberships || []).find((m: any) => m.patient_id === prof.id) || null
      const pAppointments = (appointments || []).filter((app: any) => app.patient_id === prof.id)
      const nextAppointment = pAppointments.find((app: any) => ['scheduled', 'calling'].includes(String(app.status || '').toLowerCase())) || pAppointments[0] || null

      const hasLabReport = Boolean(latestAssessment?.medical_history?.lab_work?.report_url)

      return {
        id: prof.id,
        fullName: prof.full_name || 'Anonymous Patient',
        email: prof.email || 'No email',
        phone: prof.phone || 'No phone',
        registeredAt: prof.created_at,
        bmi: latestAssessment?.bmi ? Number(latestAssessment.bmi).toFixed(1) : null,
        primaryGoal: latestAssessment?.primary_goal || null,
        activePlan: pMembership?.plan_name || 'No Active Plan',
        planStatus: pMembership?.status || 'INACTIVE',
        planExpiresAt: pMembership?.expires_at || null,
        hasLabReport,
        nextAppointment: nextAppointment ? {
          date: nextAppointment.booking_date,
          time: nextAppointment.booking_time,
          status: nextAppointment.status,
          type: nextAppointment.appointment_type,
        } : null,
      }
    })

    return NextResponse.json({ patients: results })
  } catch (error: any) {
    console.error('[Support Search] Unhandled error:', error)
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: error.message === 'Forbidden' ? 403 : 500 })
  }
}

