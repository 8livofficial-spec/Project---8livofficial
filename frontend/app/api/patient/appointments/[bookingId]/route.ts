import { NextResponse } from 'next/server'
import { getMembershipValidity } from '@/lib/membershipServer'
import { supabaseAdmin } from '@/lib/supabaseServer'
import { createJitsiMeeting } from '@/lib/jitsi'

type RouteContext = {
  params: Promise<{ bookingId: string }>
}

type ConsultationRow = {
  id: string
  patient_id: string
  doctor_id?: string | null
  booking_date?: string | null
  booking_time?: string | null
  status?: string | null
  room_url?: string | null
  meeting_provider?: string | null
  meeting_room?: string | null
  meeting_url?: string | null
  appointment_type?: string | null
}

type DoctorProfile = {
  id: string
  full_name?: string | null
  specialty?: string | null
}

type PaymentTransaction = {
  transaction_id?: string | null
  amount?: number | null
  status?: string | null
  payment_method?: string | null
  payment_provider?: string | null
  created_at?: string | null
}

async function requireAuthenticatedPatient(request: Request, patientId: string) {
  const authHeader = request.headers.get('authorization') || ''
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice('Bearer '.length).trim() : ''

  if (!token) {
    return {
      ok: false as const,
      response: NextResponse.json({ error: 'Authentication required.' }, { status: 401 })
    }
  }

  const { data, error } = await supabaseAdmin.auth.getUser(token)

  if (error || !data.user) {
    return {
      ok: false as const,
      response: NextResponse.json({ error: 'Invalid or expired session.' }, { status: 401 })
    }
  }

  if (data.user.id !== patientId) {
    return {
      ok: false as const,
      response: NextResponse.json({ error: 'You are not allowed to access this appointment.' }, { status: 403 })
    }
  }

  return { ok: true as const }
}

async function loadAppointment(bookingId: string, patientId: string) {
  const fullSelect = 'id, patient_id, doctor_id, booking_date, booking_time, status, room_url, meeting_provider, meeting_room, meeting_url, appointment_type'
  const legacySelect = 'id, patient_id, doctor_id, booking_date, booking_time, status, room_url'

  const { data, error } = await supabaseAdmin
    .from('doctor_consultations')
    .select(fullSelect)
    .eq('id', bookingId)
    .eq('patient_id', patientId)
    .maybeSingle()

  if (!error) return { data: data as ConsultationRow | null, error: null }

  const { data: legacyData, error: legacyError } = await supabaseAdmin
    .from('doctor_consultations')
    .select(legacySelect)
    .eq('id', bookingId)
    .eq('patient_id', patientId)
    .maybeSingle()

  if (legacyError) return { data: null, error: legacyError }
  return { data: legacyData as ConsultationRow | null, error: null }
}

function getSlotTimestamp(slotDate?: string | null, slotTime?: string | null): number | null {
  if (!slotDate || !slotTime) return null
  const parsed = new Date(`${slotDate} ${slotTime}`).getTime()
  return Number.isNaN(parsed) ? null : parsed
}

function isLegacyVideoUrl(url?: string | null) {
  return Boolean(url && /daily\.co|8liv\.daily/i.test(url))
}

export async function GET(request: Request, context: RouteContext) {
  try {
    const { bookingId } = await context.params
    const { searchParams } = new URL(request.url)
    const patientId = searchParams.get('patientId')

    if (!bookingId || !patientId) {
      return NextResponse.json({ error: 'Missing bookingId or patientId' }, { status: 400 })
    }

    const auth = await requireAuthenticatedPatient(request, patientId)
    if (!auth.ok) return auth.response

    const { data: consultation, error: consultationError } = await loadAppointment(bookingId, patientId)

    if (consultationError) {
      console.error('Appointment lookup failed:', consultationError)
      return NextResponse.json({ error: 'Unable to load appointment details.', details: consultationError.message }, { status: 500 })
    }

    if (!consultation) {
      return NextResponse.json({ error: 'Appointment not found.' }, { status: 404 })
    }

    const appointment = consultation as ConsultationRow
    let doctor: DoctorProfile | null = null

    if (appointment.doctor_id) {
      const { data: doctorProfile } = await supabaseAdmin
        .from('doctor_profiles')
        .select('id, full_name, specialty')
        .eq('id', appointment.doctor_id)
        .maybeSingle()

      doctor = (doctorProfile as DoctorProfile | null) || null
    }

    const { data: matchedPayment } = await supabaseAdmin
      .from('payment_transactions')
      .select('transaction_id, amount, status, payment_method, payment_provider, created_at')
      .eq('patient_id', patientId)
      .eq('payment_type', 'consultation')
      .contains('metadata', { consultation_id: bookingId })
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    let payment = (matchedPayment as PaymentTransaction | null) || null

    if (!payment) {
      const { data: fallbackPayment } = await supabaseAdmin
        .from('payment_transactions')
        .select('transaction_id, amount, status, payment_method, payment_provider, created_at')
        .eq('patient_id', patientId)
        .eq('payment_type', 'consultation')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      payment = (fallbackPayment as PaymentTransaction | null) || null
    }

    const { data: assessments } = await supabaseAdmin
      .from('health_assessments')
      .select('membership_tier')
      .eq('patient_id', patientId)
      .order('created_at', { ascending: false })
      .limit(1)

    const membershipValidity = await getMembershipValidity(patientId)

    const selectedMembershipTier = assessments?.[0]?.membership_tier
    const membershipActive = Boolean(selectedMembershipTier && membershipValidity.active)
    const appointmentType = String(appointment.appointment_type || '').toUpperCase()
    const rawStatus = (appointment.status || 'scheduled').toLowerCase()
    const consultationCompleted = ['approved', 'rejected', 'completed'].includes(rawStatus)
    const joinDisabled = consultationCompleted || ['cancelled_by_doctor', 'cancelled_by_patient', 'missed_by_patient'].includes(rawStatus)
    const freeRescheduleStatuses = ['cancelled_by_doctor', 'cancelled_by_patient', 'missed_by_patient']
    const appointmentStatus = consultationCompleted ? 'COMPLETED' : ['scheduled', 'calling', 'attended'].includes(rawStatus) ? 'SCHEDULED' : rawStatus.toUpperCase()
    let missedFreeRescheduleUsed = false

    if (rawStatus === 'missed_by_patient') {
      const { data: usedFreeReschedule } = await supabaseAdmin
        .from('payment_transactions')
        .select('id')
        .eq('patient_id', patientId)
        .eq('payment_type', 'consultation')
        .contains('metadata', { free_reschedule_from: bookingId })
        .limit(1)
        .maybeSingle()

      missedFreeRescheduleUsed = Boolean(usedFreeReschedule?.id)
    }

    const freeRescheduleEligible = rawStatus === 'cancelled_by_doctor'
      || rawStatus === 'cancelled_by_patient'
      || (rawStatus === 'missed_by_patient' && !missedFreeRescheduleUsed)

    let meetingProvider = appointment.meeting_provider || 'JITSI'
    let meetingRoom = appointment.meeting_room || null
    let meetingUrl = appointment.meeting_url || appointment.room_url || null

    if (!joinDisabled && (!meetingUrl || isLegacyVideoUrl(meetingUrl))) {
      const jitsiMeeting = createJitsiMeeting(appointment.id)
      meetingProvider = jitsiMeeting.meetingProvider
      meetingRoom = jitsiMeeting.meetingRoom
      meetingUrl = jitsiMeeting.meetingUrl

      const { error: meetingUpdateError } = await supabaseAdmin
        .from('doctor_consultations')
        .update({
          meeting_provider: meetingProvider,
          meeting_room: meetingRoom,
          meeting_url: meetingUrl,
          room_url: meetingUrl,
          updated_at: new Date().toISOString()
        })
        .eq('id', appointment.id)
        .eq('patient_id', patientId)

      if (meetingUpdateError) {
        console.error('Failed to replace legacy meeting URL:', meetingUpdateError)
      }
    }

    return NextResponse.json({
      appointment: {
        bookingId: appointment.id,
        assignedHealthcareProfessional: doctor?.full_name || 'Assigned Doctor',
        specialization: doctor?.specialty || 'Physician Specialist',
        date: appointment.booking_date,
        time: appointment.booking_time,
        meetingType: 'Video Consultation',
        status: appointmentStatus,
        rawStatus,
        appointmentType: appointmentType || null,
        consultationStatus: consultationCompleted ? 'COMPLETED' : 'PENDING',
        membershipStatus: membershipActive ? 'ACTIVE' : membershipValidity.expiresAt ? 'EXPIRED' : selectedMembershipTier ? 'SELECTED' : 'NOT_SELECTED',
        membershipExpiresAt: membershipValidity.expiresAt,
        dashboardAccess: membershipActive,
        meetingProvider,
        meetingRoom,
        roomUrl: joinDisabled ? null : meetingUrl,
        paymentAmount: 499,
        paymentStatus: payment?.status === 'success' || payment?.status === 'paid' ? 'PAID' : (payment?.status || 'PENDING').toUpperCase(),
        paymentId: payment?.transaction_id || null,
        paymentMethod: payment?.payment_method || null,
        paymentProvider: payment?.payment_provider || null,
        paymentDate: payment?.created_at || null,
        freeRescheduleEligible,
        requiresNewPayment: freeRescheduleStatuses.includes(rawStatus) && !freeRescheduleEligible,
        cancellationReason: rawStatus === 'cancelled_by_doctor'
          ? 'Doctor cancelled this appointment. Your consultation payment remains paid and can be reused.'
          : rawStatus === 'cancelled_by_patient'
            ? 'This appointment was cancelled before the cutoff. You can reschedule using the same payment.'
            : rawStatus === 'missed_by_patient'
              ? freeRescheduleEligible
                ? 'This consultation was missed. One free reschedule is available.'
                : 'The free reschedule has already been used. A new consultation payment is required.'
              : null
      }
    })
  } catch (err: unknown) {
    console.error('API Error in GET /api/patient/appointments/[bookingId]:', err)
    const message = err instanceof Error ? err.message : 'Internal Server Error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const { bookingId } = await context.params
    const body = await request.json()
    const { patientId, action } = body

    if (!bookingId || !patientId || action !== 'cancel_by_patient') {
      return NextResponse.json({ error: 'Missing bookingId, patientId, or supported action.' }, { status: 400 })
    }

    const auth = await requireAuthenticatedPatient(request, patientId)
    if (!auth.ok) return auth.response

    const { data: consultation, error: lookupErr } = await supabaseAdmin
      .from('doctor_consultations')
      .select('id, patient_id, doctor_id, booking_date, booking_time, status')
      .eq('id', bookingId)
      .eq('patient_id', patientId)
      .maybeSingle()

    if (lookupErr) throw lookupErr
    if (!consultation) {
      return NextResponse.json({ error: 'Appointment not found.' }, { status: 404 })
    }
    if (!['scheduled', 'calling'].includes((consultation.status || '').toLowerCase())) {
      return NextResponse.json({ error: 'Only scheduled appointments can be cancelled.' }, { status: 409 })
    }

    const startMs = getSlotTimestamp(consultation.booking_date, consultation.booking_time)
    const cancellationCutoffMs = 2 * 60 * 60 * 1000
    const beforeCutoff = startMs !== null && Date.now() <= startMs - cancellationCutoffMs
    const nextStatus = beforeCutoff ? 'cancelled_by_patient' : 'missed_by_patient'
    const now = new Date().toISOString()

    const { error: updateErr } = await supabaseAdmin
      .from('doctor_consultations')
      .update({ status: nextStatus, updated_at: now })
      .eq('id', bookingId)

    if (updateErr) throw updateErr

    if (beforeCutoff) {
      await supabaseAdmin
        .from('provider_availability')
        .update({ status: 'AVAILABLE', is_available: true, updated_at: new Date().toISOString() })
        .eq('provider_id', consultation.doctor_id)
        .eq('provider_role', 'doctor')
        .eq('available_date', consultation.booking_date)
        .eq('start_time', consultation.booking_time)
    }

    await supabaseAdmin
      .from('health_assessments')
      .update({
        booking_date: null,
        booking_time: null,
        room_url: null,
        updated_at: now
      })
      .eq('patient_id', patientId)

    await supabaseAdmin
      .from('patient_notifications')
      .insert({
        patient_id: patientId,
        type: 'booking_cancelled_by_patient',
        title: beforeCutoff ? 'Appointment Cancelled' : 'Late Cancellation',
        message: beforeCutoff
          ? 'Your appointment was cancelled before the cutoff. You can reschedule using the same consultation payment.'
          : 'Your appointment was cancelled too late and is treated as missed. You may use your one free missed-consultation reschedule if available.',
        is_read: false
      })

    return NextResponse.json({
      success: true,
      status: nextStatus.toUpperCase(),
      freeRescheduleEligible: beforeCutoff,
      requiresNewPayment: !beforeCutoff
    })
  } catch (err: unknown) {
    console.error('API Error in PATCH /api/patient/appointments/[bookingId]:', err)
    const message = err instanceof Error ? err.message : 'Internal Server Error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
