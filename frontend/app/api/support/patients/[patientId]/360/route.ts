import { NextResponse } from 'next/server'
import { assertSupportAgent } from '@/lib/apiSecurity'
import { supabaseAdmin } from '@/lib/supabaseServer'
import { getMembershipValidity } from '@/lib/membershipServer'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ patientId: string }> }
) {
  try {
    await assertSupportAgent(request)
    const { patientId } = await params

    if (!patientId) {
      return NextResponse.json({ error: 'patientId is required' }, { status: 400 })
    }

    const [
      { data: profile },
      { data: assessments },
      membershipValidity,
      { data: appointments },
      { data: providerConsultations },
      { data: prescriptions },
      { data: transactions },
      { data: labReports },
      { data: tickets },
    ] = await Promise.all([
      supabaseAdmin
        .from('profiles')
        .select('*')
        .eq('id', patientId)
        .maybeSingle(),
      supabaseAdmin
        .from('health_assessments')
        .select('*')
        .eq('patient_id', patientId)
        .order('created_at', { ascending: false })
        .limit(3),
      getMembershipValidity(patientId),
      supabaseAdmin
        .from('appointments')
        .select('*')
        .eq('patient_id', patientId)
        .order('booking_date', { ascending: false })
        .limit(20),
      supabaseAdmin
        .from('provider_consultations')
        .select('*')
        .eq('patient_id', patientId)
        .order('booking_date', { ascending: false })
        .limit(20),
      supabaseAdmin
        .from('prescriptions')
        .select('*')
        .eq('patient_id', patientId)
        .order('created_at', { ascending: false })
        .limit(10),
      supabaseAdmin
        .from('payment_transactions')
        .select('*')
        .eq('patient_id', patientId)
        .order('created_at', { ascending: false })
        .limit(20),
      supabaseAdmin
        .from('patient_lab_reports')
        .select('*')
        .eq('patient_id', patientId)
        .order('created_at', { ascending: false })
        .limit(20),
      supabaseAdmin
        .from('support_tickets')
        .select('id, ticket_number, category, status, priority, subject, created_at, updated_at')
        .eq('patient_id', patientId)
        .order('created_at', { ascending: false })
        .limit(10),
    ])

    const latestAssessment = assessments?.[0] || null

    // Extract any lab report embedded in the latest assessment
    const embeddedLabWork = latestAssessment?.medical_history?.lab_work || null

    return NextResponse.json({
      patient: {
        id: patientId,
        fullName: profile?.full_name || 'Anonymous Patient',
        email: profile?.email || '',
        phone: profile?.phone || '',
        role: profile?.role || 'patient',
        registeredAt: profile?.created_at,
        metadata: profile?.metadata || {},
      },
      health: {
        bmi: latestAssessment?.bmi ? Number(latestAssessment.bmi).toFixed(1) : null,
        weightKg: latestAssessment?.weight_kg || null,
        heightCm: latestAssessment?.height_cm || null,
        primaryGoal: latestAssessment?.primary_goal || null,
        medicalHistory: latestAssessment?.medical_history || null,
        assessmentCompletedAt: latestAssessment?.created_at || null,
      },
      membership: {
        active: membershipValidity.active,
        startedAt: membershipValidity.startedAt || null,
        expiresAt: membershipValidity.expiresAt || null,
        status: membershipValidity.active ? 'ACTIVE' : 'EXPIRED',
      },
      appointments: (appointments || []).map((app: any) => ({
        id: app.id,
        date: app.booking_date,
        time: app.booking_time,
        status: app.status,
        type: app.appointment_type || 'INITIAL_DOCTOR_CONSULTATION',
        meetingUrl: app.room_url || app.meeting_room || null,
        callId: app.call_id || null,
        paymentStatus: app.payment_status || 'PAID',
        createdAt: app.created_at,
      })),
      providerConsultations: (providerConsultations || []).map((pc: any) => ({
        id: pc.id,
        role: pc.provider_role,
        providerId: pc.provider_id,
        date: pc.booking_date,
        time: pc.booking_time,
        status: pc.status,
        notes: pc.notes,
        createdAt: pc.created_at,
      })),
      prescriptions: (prescriptions || []).map((rx: any) => ({
        id: rx.id,
        doctorId: rx.doctor_id,
        diagnosis: rx.diagnosis || 'Weight Management Protocol',
        medicines: rx.medicines || rx.prescription_data?.medications || [],
        pdfUrl: rx.pdf_url || rx.prescription_url || null,
        status: rx.status || 'ACTIVE',
        createdAt: rx.created_at,
      })),
      transactions: (transactions || []).map((tx: any) => ({
        id: tx.id,
        transactionId: tx.transaction_id,
        amount: Number(tx.amount || 0),
        currency: tx.currency || 'INR',
        paymentType: tx.payment_type || 'membership',
        status: tx.status,
        createdAt: tx.created_at,
        metadata: tx.metadata || {},
      })),
      labReports: [
        ...(labReports || []),
        ...(embeddedLabWork?.report_url ? [{
          id: 'assessment-lab-work',
          patient_id: patientId,
          report_category: 'assessment_initial',
          test_date: embeddedLabWork.report_date || null,
          file_name: 'Intake Lab Report',
          file_url: embeddedLabWork.report_url,
          uploaded_by_role: 'patient',
          created_at: embeddedLabWork.uploaded_at || latestAssessment?.created_at,
        }] : [])
      ],
      tickets: tickets || [],
    })
  } catch (error: any) {
    console.error('[Support 360] Unhandled error:', error)
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: error.message === 'Forbidden' ? 403 : 500 })
  }
}
