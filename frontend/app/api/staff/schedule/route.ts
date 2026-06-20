import { NextResponse } from 'next/server'
import { randomUUID } from 'crypto'
import { supabaseAdmin } from '@/lib/supabaseServer'
import { createJitsiMeeting } from '@/lib/jitsi'
import { EmailService } from '@/lib/emailService'
import { appointmentTypeForRole, assertAssignedProvider, labelForRole, normalizeProviderRole } from '@/lib/providerConsultations'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { staffId, role: rawRole, patientId, bookingDate, bookingTime, consultationNotes } = body
    const role = normalizeProviderRole(String(rawRole || ''))

    if (!staffId || !role || !patientId || !bookingDate || !bookingTime) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    if (!['dietitian', 'nutritionist', 'fitness_coach'].includes(role)) {
      return NextResponse.json({ error: 'Unsupported provider consultation role.' }, { status: 400 })
    }

    const assigned = await assertAssignedProvider(patientId, staffId, role)
    if (!assigned) {
      return NextResponse.json({ error: 'Provider is not assigned to this patient.' }, { status: 403 })
    }

    const consultationId = randomUUID()
    const meeting = createJitsiMeeting(consultationId)

    // 1. Insert into staff_consultations
    let { data: consultation, error: consultErr } = await supabaseAdmin
      .from('staff_consultations')
      .insert({
        id: consultationId,
        staff_id: staffId,
        staff_role: role,
        appointment_type: appointmentTypeForRole(role),
        patient_id: patientId,
        booking_date: bookingDate,
        booking_time: bookingTime,
        status: 'scheduled',
        room_url: meeting.meetingUrl,
        meeting_provider: meeting.meetingProvider,
        meeting_room: meeting.meetingRoom,
        meeting_url: meeting.meetingUrl,
        consultation_notes: consultationNotes || null
      })
      .select()
      .single()

    if (consultErr) {
      const { data: legacyConsultation, error: legacyConsultErr } = await supabaseAdmin
        .from('staff_consultations')
        .insert({
          id: consultationId,
          staff_id: staffId,
          staff_role: role,
          patient_id: patientId,
          booking_date: bookingDate,
          booking_time: bookingTime,
          status: 'scheduled',
          room_url: meeting.meetingUrl,
          consultation_notes: consultationNotes || null
        })
        .select()
        .single()

      if (!legacyConsultErr) {
        consultation = legacyConsultation
        consultErr = null
      }
    }

    if (consultErr) {
      console.error('Failed to create staff consultation:', consultErr)
      return NextResponse.json({ error: consultErr.message }, { status: 500 })
    }

    // 1.5 Update health_assessments so Admin dashboard reflects Call Booked
    await supabaseAdmin
      .from('health_assessments')
      .update({
        booking_date: bookingDate,
        booking_time: bookingTime,
        room_url: meeting.meetingUrl
      })
      .eq('patient_id', patientId)

    // 2. Insert notification for the patient
    const roleCapitalized = labelForRole(role)
    const { error: notifErr } = await supabaseAdmin
      .from('patient_notifications')
      .insert({
        patient_id: patientId,
        type: 'appointment',
        title: 'New 1:1 Session Scheduled',
        message: `Your ${roleCapitalized} has scheduled a 1:1 session with you on ${bookingDate} at ${bookingTime}.`,
        is_read: false
      })

    if (notifErr) {
      console.error('Failed to create notification for staff meeting:', notifErr.message)
    }

    // 3. Send email via Gmail SMTP
    // First, fetch patient's email from Auth Admin
    const { data: userData, error: userError } = await supabaseAdmin.auth.admin.getUserById(patientId)
    
    if (userError || !userData?.user?.email) {
      console.error('Failed to fetch patient email for reminder:', userError?.message)
    } else {
      try {
        await EmailService.sendConsultationReminder({
          email: userData.user.email,
          patientId,
          bookingDate,
          bookingTime,
          bookingId: consultationId,
          doctorName: `Your ${roleCapitalized}`,
          specialization: roleCapitalized,
          meetingType: '1:1 Video Session',
        })
      } catch (emailError) {
        console.error('Gmail SMTP reminder error:', emailError)
      }
    }

    return NextResponse.json({ success: true, consultation })
  } catch (err: unknown) {
    console.error('API Error in /api/staff/schedule:', err)
    const message = err instanceof Error ? err.message : 'Internal Server Error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
