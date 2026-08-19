import { randomUUID } from 'crypto'
import { supabaseAdmin } from '@/lib/supabaseServer'
import { getMembershipValidity } from '@/lib/membershipServer'
import { getAssignedProviderForRole, INITIAL_DOCTOR_CONSULTATION, DOCTOR_FOLLOW_UP, normalizeAppointmentType } from '@/lib/providerConsultations'
import { isFutureIndiaSlot } from '@/lib/appointmentAvailability'
import { createStreamMeeting } from '@/services/video/meeting.service'
import { APP_CONFIG } from '@/lib/appConfig'

const CONSULTATION_FEE = 499

type AppointmentType = typeof INITIAL_DOCTOR_CONSULTATION | typeof DOCTOR_FOLLOW_UP

type PatientBookingContext = {
  assessment: any | null
  membershipActive: boolean
  firstConsultationCompleted: boolean
  primaryDoctorId: string | null
}

type AvailabilityRow = {
  id: string
  provider_id: string
  provider_role: string
  available_date: string
  start_time: string
  end_time?: string | null
  slot_duration?: number | null
  source?: string | null
}

function generateTxnId() {
  return `TXN8LIV${Date.now()}${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`
}

function normalizeStatus(status?: string | null) {
  return String(status || '').toLowerCase()
}

function isActiveAppointment(status?: string | null) {
  return ['scheduled', 'calling', 'attended'].includes(normalizeStatus(status))
}

function mapSlot(row: AvailabilityRow) {
  return {
    slotId: row.id,
    providerId: row.provider_id,
    providerRole: String(row.provider_role || '').toUpperCase(),
    date: row.available_date,
    startTime: String(row.start_time || '').slice(0, 5),
    endTime: String(row.end_time || '').slice(0, 5),
    status: 'AVAILABLE',
    source: row.source === 'MANUAL' ? 'MANUAL' : 'GENERATED',
    slotDuration: Number(row.slot_duration || 30),
  }
}

export function parsePatientAppointmentType(value?: string | null): AppointmentType | null {
  const appointmentType = normalizeAppointmentType(value)
  if (appointmentType === INITIAL_DOCTOR_CONSULTATION || appointmentType === DOCTOR_FOLLOW_UP) {
    return appointmentType
  }
  return null
}

export async function getPatientBookingContext(patientId: string): Promise<PatientBookingContext> {
  const [{ data: assessments }, { data: completedInitial }, persistedMembership, primaryDoctorId] = await Promise.all([
    supabaseAdmin
      .from('health_assessments')
      .select('*')
      .eq('patient_id', patientId)
      .order('created_at', { ascending: false })
      .limit(1),
    supabaseAdmin
      .from('doctor_consultations')
      .select('id, appointment_type, status')
      .eq('patient_id', patientId)
      .in('status', ['approved', 'rejected', 'completed'])
      .order('created_at', { ascending: true })
      .limit(1)
      .maybeSingle(),
    getMembershipValidity(patientId),
    getAssignedProviderForRole(patientId, 'doctor'),
  ])

  const assessment = assessments?.[0] || null
  const firstConsultationCompleted = Boolean(
    assessment?.first_consultation_completed === true
    || (completedInitial?.id && !['DOCTOR_FOLLOW_UP', 'FOLLOW_UP_CONSULTATION'].includes(String(completedInitial.appointment_type || '').toUpperCase()))
  )

  return {
    assessment,
    membershipActive: persistedMembership.active,
    firstConsultationCompleted,
    primaryDoctorId,
  }
}

export function expectedDoctorAppointmentType(context: PatientBookingContext): AppointmentType {
  return context.membershipActive && context.firstConsultationCompleted
    ? DOCTOR_FOLLOW_UP
    : INITIAL_DOCTOR_CONSULTATION
}

async function loadActiveDoctors(providerIds?: string[]) {
  let query = supabaseAdmin
    .from('provider_profiles')
    .select('provider_id')
    .eq('role', 'doctor')
    .eq('status', 'active')

  if (providerIds?.length) query = query.in('provider_id', providerIds)

  const { data, error } = await query
  if (error) throw error
  return new Set((data || []).map(row => row.provider_id).filter(Boolean))
}

function validateBookingEligibility(context: PatientBookingContext, appointmentType: AppointmentType) {
  const expectedType = expectedDoctorAppointmentType(context)
  if (appointmentType !== expectedType) {
    return expectedType === DOCTOR_FOLLOW_UP
      ? 'Initial consultation is already completed. Please book a follow-up appointment.'
      : 'Follow-up booking is available only after the initial consultation and active membership.'
  }

  if (appointmentType === DOCTOR_FOLLOW_UP) {
    if (!context.membershipActive || !context.firstConsultationCompleted) {
      return 'Active membership and a completed initial consultation are required for follow-up booking.'
    }
    if (!context.primaryDoctorId) return 'No active primary doctor is assigned to this patient.'
    return null
  }

  if (!context.assessment) return 'Complete your assessment before booking the initial consultation.'
  const eligibilityStatus = String(
    context.assessment.medical_history?.eligibility_status
    || (context.assessment.is_eligible ? 'ELIGIBLE' : 'NOT_ELIGIBLE')
  ).toUpperCase()
  if (eligibilityStatus !== 'ELIGIBLE' && eligibilityStatus !== 'REVIEW_REQUIRED') {
    return 'Eligibility approval is required before booking the initial consultation.'
  }
  return null
}

export async function loadPatientDoctorAvailability(params: {
  patientId: string
  appointmentType: AppointmentType
  date?: string | null
}) {
  const context = await getPatientBookingContext(params.patientId)
  const eligibilityError = validateBookingEligibility(context, params.appointmentType)
  if (eligibilityError) return { error: eligibilityError, status: 403 as const, dates: [], slots: [] }

  const providerIds = params.appointmentType === DOCTOR_FOLLOW_UP
    ? [context.primaryDoctorId!]
    : Array.from(await loadActiveDoctors())

  if (!providerIds.length) return { dates: [], slots: [] }

  let query = supabaseAdmin
    .from('provider_availability')
    .select('id, provider_id, provider_role, available_date, start_time, end_time, slot_duration, source')
    .eq('provider_role', 'doctor')
    .eq('status', 'AVAILABLE')
    .eq('is_available', true)
    .in('provider_id', providerIds)
    .order('available_date', { ascending: true })
    .order('start_time', { ascending: true })
    .limit(1000)

  if (params.date) {
    query = query.eq('available_date', params.date)
  } else {
    query = query.gte('available_date', new Date().toISOString().split('T')[0])
  }

  const { data, error } = await query
  if (error) throw error

  const activeDoctors = params.appointmentType === DOCTOR_FOLLOW_UP
    ? new Set(providerIds)
    : await loadActiveDoctors(Array.from(new Set((data || []).map(row => row.provider_id).filter(Boolean))))

  const slots = ((data || []) as AvailabilityRow[])
    .filter(row => activeDoctors.has(row.provider_id) && isFutureIndiaSlot(row.available_date, row.start_time))
    .map(mapSlot)

  const dateCounts = new Map<string, number>()
  for (const slot of slots) dateCounts.set(slot.date, (dateCounts.get(slot.date) || 0) + 1)

  return {
    dates: Array.from(dateCounts, ([date, availableCount]) => ({ date, availableCount })),
    slots,
  }
}

export async function bookPatientDoctorAppointment(params: {
  patientId: string
  appointmentType: AppointmentType
  slotId: string
  idempotencyKey: string
  paymentMethod?: string | null
}) {
  const context = await getPatientBookingContext(params.patientId)
  const eligibilityError = validateBookingEligibility(context, params.appointmentType)
  if (eligibilityError) return { error: eligibilityError, status: 403 as const }

  const { data: existingByKey, error: idempotencyError } = await supabaseAdmin
    .from('doctor_consultations')
    .select('*')
    .eq('patient_id', params.patientId)
    .eq('idempotency_key', params.idempotencyKey)
    .maybeSingle()
  if (idempotencyError) throw idempotencyError
  if (existingByKey?.id) {
    return {
      success: true,
      bookingId: existingByKey.id,
      consultation: existingByKey,
      appointmentType: params.appointmentType,
      idempotent: true,
    }
  }

  const { data: existingActive, error: activeError } = await supabaseAdmin
    .from('doctor_consultations')
    .select('id, appointment_type, status')
    .eq('patient_id', params.patientId)
    .in('status', ['scheduled', 'calling', 'attended'])
    .limit(1)
    .maybeSingle()
  if (activeError) throw activeError
  if (existingActive?.id && isActiveAppointment(existingActive.status)) {
    return { error: 'You already have an active scheduled consultation.', status: 409 as const }
  }

  const { data: slot, error: slotError } = await supabaseAdmin
    .from('provider_availability')
    .select('id, provider_id, provider_role, available_date, start_time, end_time, slot_duration, source')
    .eq('id', params.slotId)
    .eq('provider_role', 'doctor')
    .eq('status', 'AVAILABLE')
    .eq('is_available', true)
    .maybeSingle()
  if (slotError) throw slotError
  if (!slot || !isFutureIndiaSlot(slot.available_date, slot.start_time)) {
    return { error: 'Selected consultation slot is no longer available.', status: 409 as const }
  }

  if (params.appointmentType === DOCTOR_FOLLOW_UP && slot.provider_id !== context.primaryDoctorId) {
    return { error: 'Follow-up appointments must be booked with your active primary doctor.', status: 403 as const }
  }

  if (params.appointmentType === INITIAL_DOCTOR_CONSULTATION) {
    const activeDoctors = await loadActiveDoctors([slot.provider_id])
    if (!activeDoctors.has(slot.provider_id)) return { error: 'Selected doctor is not active.', status: 409 as const }
  }

  const { data: reservedSlot, error: reserveError } = await supabaseAdmin
    .from('provider_availability')
    .update({ status: 'BOOKED', is_available: false, updated_at: new Date().toISOString() })
    .eq('id', slot.id)
    .eq('status', 'AVAILABLE')
    .eq('is_available', true)
    .select('id, provider_id, provider_role, available_date, start_time, end_time')
    .maybeSingle()
  if (reserveError) throw reserveError
  if (!reservedSlot) return { error: 'Selected consultation slot was just booked. Please choose another slot.', status: 409 as const }

  const appointmentId = randomUUID()
  const meeting = createStreamMeeting({
    appointmentId,
    providerRole: 'doctor',
    patientId: params.patientId,
    providerId: reservedSlot.provider_id,
    createdBy: params.patientId,
  })

  const start = `${reservedSlot.available_date}T${String(reservedSlot.start_time).slice(0, 8)}+05:30`
  const end = reservedSlot.end_time ? `${reservedSlot.available_date}T${String(reservedSlot.end_time).slice(0, 8)}+05:30` : null
  const paymentRequired = params.appointmentType === INITIAL_DOCTOR_CONSULTATION
  if (paymentRequired && !APP_CONFIG.payment.allowMock) {
    await supabaseAdmin
      .from('provider_availability')
      .update({ status: 'AVAILABLE', is_available: true, updated_at: new Date().toISOString() })
      .eq('id', reservedSlot.id)
    return { error: 'Verified consultation payment is required before booking.', status: 402 as const }
  }
  const txnId = paymentRequired ? generateTxnId() : ''

  const payload = {
    id: appointmentId,
    patient_id: params.patientId,
    doctor_id: reservedSlot.provider_id,
    booking_date: reservedSlot.available_date,
    booking_time: reservedSlot.start_time,
    status: 'scheduled',
    meeting_provider: meeting.meetingProvider,
    call_id: meeting.callId,
    call_type: meeting.callType,
    created_by: meeting.createdBy,
    meeting_status: meeting.meetingStatus,
    appointment_type: params.appointmentType,
    slot_id: reservedSlot.id,
    booking_source: 'PATIENT_PORTAL',
    payment_requirement: paymentRequired ? 'PAID_INITIAL_FEE' : 'MEMBERSHIP_INCLUDED',
    scheduled_start: start,
    scheduled_end: end,
    idempotency_key: params.idempotencyKey,
    is_completed: false,
  }

  const { data: consultation, error: insertError } = await supabaseAdmin
    .from('doctor_consultations')
    .insert(payload)
    .select()
    .single()

  if (insertError) {
    await supabaseAdmin
      .from('provider_availability')
      .update({ status: 'AVAILABLE', is_available: true, updated_at: new Date().toISOString() })
      .eq('id', reservedSlot.id)
    throw insertError
  }

  if (paymentRequired) {
    await supabaseAdmin
      .from('health_assessments')
      .update({ consultation_fee_paid: true, booking_date: reservedSlot.available_date, booking_time: reservedSlot.start_time })
      .eq('patient_id', params.patientId)

    await supabaseAdmin
      .from('payment_transactions')
      .insert({
        patient_id: params.patientId,
        amount: CONSULTATION_FEE,
        currency: 'INR',
        payment_method: params.paymentMethod || 'booking_portal',
        payment_provider: 'razorpay_sim',
        transaction_id: txnId,
        status: 'success',
        membership_tier: null,
        payment_type: 'consultation',
        metadata: {
          booking_id: consultation.id,
          consultation_id: consultation.id,
          doctor_id: reservedSlot.provider_id,
          slot_id: reservedSlot.id,
          appointment_type: params.appointmentType,
          recorded_at: new Date().toISOString(),
        },
      })
  }

  const { error: auditError } = await supabaseAdmin
    .from('patient_booking_audit_logs')
    .insert({
      patient_id: params.patientId,
      actor_id: params.patientId,
      actor_role: 'patient',
      action: 'BOOK_APPOINTMENT',
      resource_type: 'doctor_consultation',
      resource_id: consultation.id,
      metadata: {
        appointmentType: params.appointmentType,
        providerId: reservedSlot.provider_id,
        slotId: reservedSlot.id,
        paymentRequired,
      },
    })
  if (auditError) {
    console.error('Failed to write patient booking audit log:', auditError)
  }

  return {
    success: true,
    consultation,
    bookingId: consultation.id,
    paymentId: txnId,
    transaction_id: txnId,
    appointmentType: params.appointmentType,
    paymentStatus: paymentRequired ? 'PAID' : 'NOT_REQUIRED',
    assignment: {
      consultationId: consultation.id,
      bookingId: consultation.id,
      paymentId: txnId,
      paymentAmount: paymentRequired ? CONSULTATION_FEE : 0,
      paymentStatus: paymentRequired ? 'PAID' : 'NOT_REQUIRED',
      appointmentStatus: 'SCHEDULED',
      consultationStatus: 'PENDING',
      doctorName: params.appointmentType === DOCTOR_FOLLOW_UP ? 'Your Primary Doctor' : 'Assigned Doctor',
      specialty: 'Physician Specialist',
      bookingDate: reservedSlot.available_date,
      bookingTime: reservedSlot.start_time,
      meetingType: 'Video Consultation',
      meetingProvider: meeting.meetingProvider,
    },
  }
}
