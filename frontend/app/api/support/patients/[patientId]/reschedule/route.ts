import { NextResponse } from 'next/server'
import { assertSupportAgent } from '@/lib/apiSecurity'
import { supabaseAdmin } from '@/lib/supabaseServer'

export async function POST(
  request: Request,
  { params }: { params: Promise<{ patientId: string }> }
) {
  try {
    const auth = await assertSupportAgent(request)
    const { patientId } = await params
    const body = await request.json()

    const { appointmentId, newDate, newTime, reason } = body

    if (!appointmentId || !newDate || !newTime) {
      return NextResponse.json({ error: 'appointmentId, newDate, and newTime are required.' }, { status: 400 })
    }

    // 1. Fetch appointment and verify ownership
    const { data: appointment, error: appError } = await supabaseAdmin
      .from('appointments')
      .select('*')
      .eq('id', appointmentId)
      .eq('patient_id', patientId)
      .maybeSingle()

    if (appError || !appointment) {
      return NextResponse.json({ error: 'Appointment not found for this patient.' }, { status: 404 })
    }

    const previousDate = appointment.booking_date
    const previousTime = appointment.booking_time

    // 2. Update appointment record
    const { error: updateError } = await supabaseAdmin
      .from('appointments')
      .update({
        booking_date: newDate,
        booking_time: newTime,
        status: 'scheduled',
        updated_at: new Date().toISOString(),
      })
      .eq('id', appointmentId)

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    // 3. Notify patient
    try {
      await supabaseAdmin.from('patient_notifications').insert({
        patient_id: patientId,
        type: 'appointment_rescheduled',
        title: 'Appointment Rescheduled',
        message: `Customer Care has rescheduled your consultation from ${previousDate} at ${previousTime} to ${newDate} at ${newTime}.`,
        is_read: false,
      })
    } catch (notifErr) {
      console.warn('[Support Reschedule] Notification warning:', notifErr)
    }

    // 4. Record audit log
    try {
      await supabaseAdmin.from('support_audit_logs').insert({
        agent_id: auth.user.id,
        patient_id: patientId,
        action_type: 'reschedule_appointment',
        details: {
          appointmentId,
          previousDate,
          previousTime,
          newDate,
          newTime,
          reason: reason || 'Patient requested reschedule via Customer Care',
        },
      })
    } catch (auditErr) {
      console.warn('[Support Reschedule] Audit log warning:', auditErr)
    }

    return NextResponse.json({
      success: true,
      message: `Appointment successfully rescheduled to ${newDate} at ${newTime}.`,
      rescheduled: {
        appointmentId,
        newDate,
        newTime,
      },
    })
  } catch (error: any) {
    console.error('[Support Reschedule] Unhandled error:', error)
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: error.message === 'Forbidden' ? 403 : 500 })
  }
}

