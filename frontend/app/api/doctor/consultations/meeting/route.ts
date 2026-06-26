import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseServer'
import { getAuthenticatedUser } from '@/lib/apiSecurity'
import { createStreamMeeting } from '@/services/video/meeting.service'

function getErrorMessage(err: unknown) {
  return err instanceof Error ? err.message : 'Internal Server Error'
}

export async function POST(request: Request) {
  try {
    const authUser = await getAuthenticatedUser(request)
    if (!authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { doctorId, consultationId } = await request.json().catch(() => ({}))

    if (!consultationId) {
      return NextResponse.json({ error: 'consultationId is required' }, { status: 400 })
    }

    const isAdminAction = authUser.role === 'admin'
    if (!isAdminAction && authUser.role !== 'doctor') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const targetDoctorId = isAdminAction ? (doctorId || authUser.user.id) : authUser.user.id

    const { data: consultation, error: lookupError } = await supabaseAdmin
      .from('doctor_consultations')
      .select('id, doctor_id, patient_id, room_url, meeting_provider, call_id, call_type, created_by, meeting_status')
      .eq('id', consultationId)
      .eq('doctor_id', targetDoctorId)
      .maybeSingle()

    if (lookupError) {
      // Some deployments may not have meeting_* columns yet. Retry with legacy columns.
      const { data: legacyConsultation, error: legacyLookupError } = await supabaseAdmin
        .from('doctor_consultations')
        .select('id, doctor_id, patient_id, room_url')
        .eq('id', consultationId)
        .eq('doctor_id', targetDoctorId)
        .maybeSingle()

      if (legacyLookupError) throw legacyLookupError
      if (!legacyConsultation) {
        return NextResponse.json({ error: 'Consultation not found for this doctor.' }, { status: 404 })
      }

      const meeting = createStreamMeeting({
        appointmentId: legacyConsultation.id,
        providerRole: 'doctor',
        patientId: legacyConsultation.patient_id,
        providerId: targetDoctorId,
        createdBy: authUser.user.id,
      })
      const { error: legacyUpdateError } = await supabaseAdmin
        .from('doctor_consultations')
        .update({
          meeting_provider: meeting.meetingProvider,
          call_id: meeting.callId,
          call_type: meeting.callType,
          created_by: meeting.createdBy,
          meeting_status: meeting.meetingStatus,
          room_url: null,
          meeting_url: null,
          meeting_room: null,
          updated_at: new Date().toISOString()
        })
        .eq('id', legacyConsultation.id)
        .eq('doctor_id', targetDoctorId)

      if (legacyUpdateError) throw legacyUpdateError
      return NextResponse.json({ success: true, callId: meeting.callId, callType: meeting.callType, meetingProvider: meeting.meetingProvider })
    }

    if (!consultation) {
      return NextResponse.json({ error: 'Consultation not found for this doctor.' }, { status: 404 })
    }

    if (consultation.call_id && consultation.meeting_provider === 'STREAM') {
      return NextResponse.json({
        success: true,
        callId: consultation.call_id,
        callType: consultation.call_type,
        meetingProvider: consultation.meeting_provider,
      })
    }

    const meeting = createStreamMeeting({
      appointmentId: consultation.id,
      providerRole: 'doctor',
      patientId: consultation.patient_id,
      providerId: targetDoctorId,
      createdBy: authUser.user.id,
    })
    const fullPayload = {
      meeting_provider: meeting.meetingProvider,
      call_id: meeting.callId,
      call_type: meeting.callType,
      created_by: meeting.createdBy,
      meeting_status: meeting.meetingStatus,
      meeting_room: null,
      meeting_url: null,
      room_url: null,
      updated_at: new Date().toISOString(),
    }

    const { error: updateError } = await supabaseAdmin
      .from('doctor_consultations')
      .update(fullPayload)
      .eq('id', consultation.id)
      .eq('doctor_id', targetDoctorId)

    if (updateError) {
      const { error: fallbackError } = await supabaseAdmin
        .from('doctor_consultations')
        .update({ room_url: null, updated_at: new Date().toISOString() })
        .eq('id', consultation.id)
        .eq('doctor_id', targetDoctorId)

      if (fallbackError) throw fallbackError
    }

    return NextResponse.json({
      success: true,
      callId: meeting.callId,
      callType: meeting.callType,
      meetingProvider: meeting.meetingProvider,
    })
  } catch (err: unknown) {
    console.error('Error in POST /api/doctor/consultations/meeting:', err)
    const message = getErrorMessage(err)
    const status = message === 'Forbidden' ? 403 : (message === 'Unauthorized' ? 401 : 500)
    return NextResponse.json({ error: message }, { status })
  }
}
