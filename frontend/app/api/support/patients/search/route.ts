import { NextResponse } from 'next/server'
import { assertSupportAgent } from '@/lib/apiSecurity'
import { supabaseAdmin } from '@/lib/supabaseServer'
import { ilikePattern, patientSearchOrFilter } from '@/lib/queryFilters'

export async function GET(request: Request) {
  try {
    await assertSupportAgent(request)
    const { searchParams } = new URL(request.url)
    const query = String(searchParams.get('q') || '').trim()

    if (!query || query.length < 2) {
      return NextResponse.json({ patients: [] })
    }

    const pattern = ilikePattern(query)

    // Build comprehensive search filter supporting text, email, and sanitized phone digits
    const trimmed = query.trim()
    const digitsOnly = trimmed.replace(/\D/g, '')
    const last10 = digitsOnly.length >= 10 ? digitsOnly.slice(-10) : digitsOnly

    const orConditions: string[] = []
    const cleanText = trimmed.replace(/[,%()]/g, ' ').replace(/\s+/g, ' ').trim()
    if (cleanText) {
      orConditions.push(`first_name.ilike.%${cleanText}%`)
      orConditions.push(`last_name.ilike.%${cleanText}%`)
      orConditions.push(`email.ilike.%${cleanText}%`)
      orConditions.push(`phone_number.ilike.%${cleanText}%`)
    }

    // If query has digits, also search by sanitized phone digits and last 10 digits
    if (last10 && last10.length >= 4) {
      orConditions.push(`phone_number.ilike.%${last10}%`)
    }
    if (digitsOnly && digitsOnly.length >= 5 && digitsOnly !== last10) {
      orConditions.push(`phone_number.ilike.%${digitsOnly}%`)
    }

    const filter = orConditions.join(',')

    // 1. Search profiles by first_name, last_name, email, or phone_number
    const { data: profiles, error: profileErr } = await supabaseAdmin
      .from('profiles')
      .select('id, first_name, last_name, email, phone_number, role, created_at')
      .or(filter)
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
    const [
      { data: hydratedProfiles }, 
      { data: assessments }, 
      { data: subscriptions }, 
      { data: docConsultations },
      { data: staffConsultations }
    ] = await Promise.all([
      supabaseAdmin
        .from('profiles')
        .select('id, first_name, last_name, email, phone_number, role, created_at')
        .in('id', patientIds),
      supabaseAdmin
        .from('health_assessments')
        .select('id, patient_id, bmi, weight_kg, height_cm, primary_goal, created_at, medical_history')
        .in('patient_id', patientIds)
        .order('created_at', { ascending: false }),
      supabaseAdmin
        .from('subscriptions')
        .select('patient_id, plan_name, status, end_date, created_at')
        .in('patient_id', patientIds)
        .order('created_at', { ascending: false }),
      supabaseAdmin
        .from('doctor_consultations')
        .select('id, patient_id, booking_date, booking_time, status')
        .in('patient_id', patientIds)
        .order('booking_date', { ascending: false })
        .limit(25),
      supabaseAdmin
        .from('staff_consultations')
        .select('id, patient_id, booking_date, booking_time, status, staff_role')
        .in('patient_id', patientIds)
        .order('booking_date', { ascending: false })
        .limit(25),
    ])

    const allConsultations = [
      ...(docConsultations || []).map((c: any) => ({ ...c, appointment_type: 'DOCTOR_CONSULTATION' })),
      ...(staffConsultations || []).map((c: any) => ({ ...c, appointment_type: c.staff_role === 'trainer' ? 'FITNESS_COACH_CONSULTATION' : 'DIETITIAN_CONSULTATION' })),
    ]

    const results = (hydratedProfiles || []).map((prof: any) => {
      const pAssessments = (assessments || []).filter((a: any) => a.patient_id === prof.id)
      const latestAssessment = pAssessments[0] || null
      const pSubscription = (subscriptions || []).find((s: any) => s.patient_id === prof.id && s.status === 'ACTIVE') || (subscriptions || []).find((s: any) => s.patient_id === prof.id) || null
      const pAppointments = allConsultations.filter((app: any) => app.patient_id === prof.id)
      const nextAppointment = pAppointments.find((app: any) => ['scheduled', 'calling'].includes(String(app.status || '').toLowerCase())) || pAppointments[0] || null

      const hasLabReport = Boolean(latestAssessment?.medical_history?.lab_work?.report_url)
      const fullName = `${prof.first_name || ''} ${prof.last_name || ''}`.trim() || prof.email || 'Anonymous Patient'

      return {
        id: prof.id,
        fullName,
        email: prof.email || 'No email',
        phone: prof.phone_number || 'No phone',
        registeredAt: prof.created_at,
        bmi: latestAssessment?.bmi ? Number(latestAssessment.bmi).toFixed(1) : null,
        primaryGoal: latestAssessment?.primary_goal || null,
        activePlan: pSubscription?.plan_name || 'No Active Plan',
        planStatus: pSubscription?.status || 'INACTIVE',
        planExpiresAt: pSubscription?.end_date || null,
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

