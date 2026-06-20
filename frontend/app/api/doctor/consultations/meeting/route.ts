import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseServer'
import { createJitsiMeeting } from '@/lib/jitsi'

function isLegacyVideoUrl(url?: string | null) {
  return Boolean(url && /daily\.co|8liv\.daily/i.test(url))
}

function getErrorMessage(err: unknown) {
  return err instanceof Error ? err.message : 'Internal Server Error'
}

export async function POST(request: Request) {
  try {
    const { doctorId, consultationId } = await request.json()

    if (!doctorId || !consultationId) {
      return NextResponse.json({ error: 'doctorId and consultationId are required' }, { status: 400 })
    }

    const { data: consultation, error: lookupError } = await supabaseAdmin
      .from('doctor_consultations')
      .select('id, doctor_id, room_url, meeting_provider, meeting_room, meeting_url')
      .eq('id', consultationId)
      .eq('doctor_id', doctorId)
      .maybeSingle()

    if (lookupError) {
      // Some deployments may not have meeting_* columns yet. Retry with legacy columns.
      const { data: legacyConsultation, error: legacyLookupError } = await supabaseAdmin
        .from('doctor_consultations')
        .select('id, doctor_id, room_url')
        .eq('id', consultationId)
        .eq('doctor_id', doctorId)
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
        .eq('doctor_id', doctorId)

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
      .eq('doctor_id', doctorId)

    if (updateError) {
      const { error: fallbackError } = await supabaseAdmin
        .from('doctor_consultations')
        .update({ room_url: meeting.meetingUrl, updated_at: new Date().toISOString() })
        .eq('id', consultation.id)
        .eq('doctor_id', doctorId)

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
    return NextResponse.json({ error: getErrorMessage(err) }, { status: 500 })
  }
}
