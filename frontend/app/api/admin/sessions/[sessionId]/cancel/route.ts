import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseServer'
import { assertAdmin } from '@/lib/apiSecurity'
import { WhatsAppNotificationService } from '@/lib/whatsapp/whatsappNotificationService'

export async function POST(
  request: Request,
  props: { params: Promise<{ sessionId: string }> }
) {
  try {
    await assertAdmin(request)

    const { sessionId } = await props.params
    const body = await request.json().catch(() => ({}))
    const reason = String(body?.reason || 'Admin Cancelled').trim()

    if (!sessionId) {
      return NextResponse.json({ error: 'sessionId is required' }, { status: 400 })
    }

    const { error } = await supabaseAdmin
      .from('sessions')
      .update({ status: 'cancelled' })
      .eq('id', sessionId)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    try {
      await supabaseAdmin
        .from('session_logs')
        .insert({
          session_id: sessionId,
          event: 'cancelled',
          triggered_by: 'admin',
          metadata_: { reason }
        })
    } catch {
      // Optional session_logs table
    }

    // Invalidate reminders & notify patient if session has patient context
    Promise.resolve().then(async () => {
      try {
        const { data: sessionData } = await supabaseAdmin
          .from('sessions')
          .select('id, patient_id, doctor_id, scheduled_at')
          .eq('id', sessionId)
          .maybeSingle()

        if (sessionData?.patient_id) {
          const [{ data: patientProfile }, { data: doctorProfile }] = await Promise.all([
            supabaseAdmin
              .from('profiles')
              .select('first_name, last_name, phone_number')
              .eq('id', sessionData.patient_id)
              .maybeSingle(),
            sessionData.doctor_id
              ? supabaseAdmin
                  .from('profiles')
                  .select('first_name, last_name')
                  .eq('id', sessionData.doctor_id)
                  .maybeSingle()
              : Promise.resolve({ data: null }),
          ])

          const patientPhone = patientProfile?.phone_number
          if (patientPhone) {
            const patientName = [patientProfile.first_name, patientProfile.last_name].filter(Boolean).join(' ') || 'Patient'
            const doctorName = [doctorProfile?.first_name, doctorProfile?.last_name].filter(Boolean).join(' ') || '8LIV Healthcare'

            await WhatsAppNotificationService.sendAppointmentCancelled(patientPhone, {
              patientName,
              doctorName,
              date: sessionData.scheduled_at ? new Date(sessionData.scheduled_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : undefined,
              time: sessionData.scheduled_at ? new Date(sessionData.scheduled_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : undefined,
              bookingId: sessionId,
            })
          }
        }
      } catch (waErr) {
        console.warn('[WhatsApp] Admin session cancel notification notice:', waErr)
      }
    })

    return NextResponse.json({ status: 'success' })
  } catch (err: any) {
    const status = err.message === 'Forbidden' ? 403 : (err.message === 'Unauthorized' ? 401 : 500)
    return NextResponse.json({ error: err?.message || 'Failed to cancel session' }, { status })
  }
}
