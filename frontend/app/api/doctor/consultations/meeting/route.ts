import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseServer'
import { createJitsiMeeting } from '@/lib/jitsi'
import { getAuthenticatedUser } from '@/lib/apiSecurity'

function isLegacyVideoUrl(url?: string | null) {
  return Boolean(url && /daily\.co|8liv\.daily/i.test(url))
}

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
      .select('id, doctor_id, room_url, meeting_provider, meeting_room, meeting_url')
      .eq('id', consultationId)
      .eq('doctor_id', targetDoctorId)
      .maybeSingle()

    if (lookupError) {
      // Some deployments may not have meeting_* columns yet. Retry with legacy columns.
      const { data: legacyConsultation, error: legacyLookupError } = await supabaseAdmin
        .from('doctor_consultations')
        .select('id, doctor_id, room_url')
        .eq('id', consultationId)
        .eq('doctor_id', targetDoctorId)
        .maybeSingle()

      if (legacyLookupError) throw legacyLookupError
      if (!legacyConsultation) {
        return NextResponse.json({ error: 'Consultation not found for this doctor.' }, { status: 404 })
      }

      const meeting = createJitsiMeeting(legacyConsultation.id)
      const { error: legacyUpdateError } = await supabaseAdmin
        .from('doctor_consultations')
        .update({ room_url: meeting.meetingUrl, updated_at: new Date().toISOString() })
        .eq('id', legacyConsultation.id)
        .eq('doctor_id', targetDoctorId)

      if (legacyUpdateError) throw legacyUpdateError
      return NextResponse.json({ success: true, meetingUrl: meeting.meetingUrl, meetingRoom: meeting.meetingRoom, meetingProvider: meeting.meetingProvider })
    }

    if (!consultation) {
      return NextResponse.json({ error: 'Consultation not found for this doctor.' }, { status: 404 })
    }

    const existingMeetingUrl = consultation.meeting_url || consultation.room_url
    if (existingMeetingUrl && !isLegacyVideoUrl(existingMeetingUrl)) {
      return NextResponse.json({
        success: true,
        meetingUrl: existingMeetingUrl,
        meetingRoom: consultation.meeting_room || null,
        meetingProvider: consultation.meeting_provider || 'JITSI',
      })
    }

    const meeting = createJitsiMeeting(consultation.id)
    const fullPayload = {
      meeting_provider: meeting.meetingProvider,
      meeting_room: meeting.meetingRoom,
      meeting_url: meeting.meetingUrl,
      room_url: meeting.meetingUrl,
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
        .update({ room_url: meeting.meetingUrl, updated_at: new Date().toISOString() })
        .eq('id', consultation.id)
        .eq('doctor_id', targetDoctorId)

      if (fallbackError) throw fallbackError
    }

    return NextResponse.json({
      success: true,
      meetingUrl: meeting.meetingUrl,
      meetingRoom: meeting.meetingRoom,
      meetingProvider: meeting.meetingProvider,
    })
  } catch (err: unknown) {
    console.error('Error in POST /api/doctor/consultations/meeting:', err)
    const message = getErrorMessage(err)
    const status = message === 'Forbidden' ? 403 : (message === 'Unauthorized' ? 401 : 500)
    return NextResponse.json({ error: message }, { status })
  }
}
