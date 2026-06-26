import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseServer'
import { getAuthenticatedUser } from '@/lib/apiSecurity'
import { getIndiaSlotTimestamp } from '@/lib/appointmentAvailability'
import { getPublicStreamApiKey, getStreamConfig } from '@/lib/video/streamClient'
import { createStreamUserToken } from '@/services/video/token.service'
import { consultationTypeForVideoRole, createStreamMeeting, terminalMeetingStatus } from '@/services/video/meeting.service'

type ConsultationRecord = {
  id: string
  table: 'doctor_consultations' | 'staff_consultations'
  patient_id: string
  provider_id: string
  provider_role: string
  booking_date: string
  booking_time: string
  status?: string | null
  meeting_status?: string | null
  meeting_provider?: string | null
  call_id?: string | null
  call_type?: string | null
  created_by?: string | null
}

function apiStatus(error: string) {
  if (error === 'Unauthorized') return 401
  if (error === 'Forbidden') return 403
  return 500
}

async function findConsultation(identifier: string): Promise<ConsultationRecord | null> {
  const doctorSelect = 'id, patient_id, doctor_id, booking_date, booking_time, status, meeting_status, meeting_provider, call_id, call_type, created_by'
  const staffSelect = 'id, patient_id, staff_id, staff_role, booking_date, booking_time, status, meeting_status, meeting_provider, call_id, call_type, created_by'

  const { data: doctorConsultation, error: doctorError } = await supabaseAdmin
    .from('doctor_consultations')
    .select(doctorSelect)
    .or(`id.eq.${identifier},call_id.eq.${identifier}`)
    .limit(1)
    .maybeSingle()

  if (doctorError && doctorError.code !== 'PGRST204') throw doctorError
  if (doctorConsultation) {
    return {
      ...doctorConsultation,
      table: 'doctor_consultations',
      provider_id: doctorConsultation.doctor_id,
      provider_role: 'doctor',
    }
  }

  const { data: staffConsultation, error: staffError } = await supabaseAdmin
    .from('staff_consultations')
    .select(staffSelect)
    .or(`id.eq.${identifier},call_id.eq.${identifier}`)
    .limit(1)
    .maybeSingle()

  if (staffError && staffError.code !== 'PGRST204') throw staffError
  if (!staffConsultation) return null

  return {
    ...staffConsultation,
    table: 'staff_consultations',
    provider_id: staffConsultation.staff_id,
    provider_role: staffConsultation.staff_role === 'trainer' ? 'fitness_coach' : staffConsultation.staff_role,
  }
}

function assertJoinWindow(consultation: ConsultationRecord) {
  if (terminalMeetingStatus(consultation.status) || terminalMeetingStatus(consultation.meeting_status)) {
    return 'This consultation is no longer available to join.'
  }

  const slotTime = getIndiaSlotTimestamp(consultation.booking_date, consultation.booking_time)
  if (!slotTime) return null

  const opensAt = slotTime - 15 * 60 * 1000
  if (Date.now() < opensAt) {
    return 'This consultation opens 15 minutes before the scheduled time.'
  }

  return null
}

async function ensureStreamMeeting(consultation: ConsultationRecord, createdBy: string) {
  if (consultation.call_id && consultation.meeting_provider === 'STREAM') {
    return {
      callId: consultation.call_id,
      callType: consultation.call_type || consultationTypeForVideoRole(consultation.provider_role),
    }
  }

  const meeting = createStreamMeeting({
    appointmentId: consultation.id,
    providerRole: consultation.provider_role,
    patientId: consultation.patient_id,
    providerId: consultation.provider_id,
    createdBy,
  })

  const payload = {
    meeting_provider: meeting.meetingProvider,
    call_id: meeting.callId,
    call_type: meeting.callType,
    created_by: meeting.createdBy,
    meeting_status: meeting.meetingStatus,
    meeting_url: null,
    meeting_room: null,
    room_url: null,
    updated_at: new Date().toISOString(),
  }

  const { error } = await supabaseAdmin
    .from(consultation.table)
    .update(payload)
    .eq('id', consultation.id)

  if (error) throw error

  return { callId: meeting.callId, callType: meeting.callType }
}

export async function POST(request: Request) {
  try {
    getStreamConfig()
    const auth = await getAuthenticatedUser(request)
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await request.json().catch(() => ({}))
    const appointmentId = String(body.appointmentId || body.consultationId || body.callId || '').trim()
    if (!appointmentId) {
      return NextResponse.json({ error: 'appointmentId is required.' }, { status: 400 })
    }

    const consultation = await findConsultation(appointmentId)
    if (!consultation) {
      return NextResponse.json({ error: 'Consultation not found.' }, { status: 404 })
    }

    const isPatient = auth.user.id === consultation.patient_id
    const isProvider = auth.user.id === consultation.provider_id
    const isAdmin = auth.role === 'admin'
    if (!isPatient && !isProvider && !isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const joinBlockedReason = assertJoinWindow(consultation)
    if (joinBlockedReason) {
      return NextResponse.json({ error: joinBlockedReason }, { status: 403 })
    }

    const meeting = await ensureStreamMeeting(consultation, auth.user.id)
    const streamUserId = auth.user.id
    const userName = auth.user.user_metadata?.display_id || auth.user.email?.split('@')[0] || '8liv User'

    const statusUpdate = Object.fromEntries(Object.entries({
      meeting_status: isProvider ? 'LIVE' : 'WAITING',
      status: isProvider ? 'calling' : undefined,
      call_started_at: isProvider ? new Date().toISOString() : undefined,
      updated_at: new Date().toISOString(),
    }).filter(([, value]) => value !== undefined))

    await supabaseAdmin
      .from(consultation.table)
      .update(statusUpdate)
      .eq('id', consultation.id)

    return NextResponse.json({
      apiKey: getPublicStreamApiKey(),
      userId: streamUserId,
      userName,
      userToken: createStreamUserToken(streamUserId),
      callId: meeting.callId,
      callType: process.env.STREAM_CALL_TYPE || 'default',
      consultationType: meeting.callType,
      appointmentId: consultation.id,
      providerRole: consultation.provider_role,
      participantRole: isPatient ? 'patient' : isProvider ? 'provider' : 'admin',
      expiresInSeconds: 3600,
    })
  } catch (err: unknown) {
    console.error('API Error in /api/video/token:', err)
    const message = err instanceof Error ? err.message : 'Internal Server Error'
    return NextResponse.json({ error: message }, { status: apiStatus(message) })
  }
}
