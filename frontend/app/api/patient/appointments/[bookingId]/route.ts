import { NextResponse } from 'next/server'
import { getMembershipValidity } from '@/lib/membershipServer'
import { supabaseAdmin } from '@/lib/supabaseServer'
import { createStreamMeeting } from '@/services/video/meeting.service'
import { invalidateDoctorAvailabilityCache } from '@/lib/patientAppointmentBooking'
import { invalidateSlotsCache } from '@/lib/appointmentAvailability'
import { invalidatePatientApiDashboardCache } from '@/lib/patientDashboardCache'
import { WhatsAppNotificationService } from '@/lib/whatsapp/whatsappNotificationService'
import { appointmentTypeForRole, labelForRole, normalizeProviderRole } from '@/lib/providerConsultations'

type RouteContext = {
  params: Promise<{ bookingId: string }>
}

type ConsultationRow = {
  id: string
  patient_id: string
  doctor_id?: string | null
  staff_id?: string | null
  staff_role?: string | null
  table_source: 'doctor_consultations' | 'staff_consultations'
  booking_date?: string | null
  booking_time?: string | null
  status?: string | null
  room_url?: string | null
  meeting_provider?: string | null
  meeting_room?: string | null
  meeting_url?: string | null
  call_id?: string | null
  call_type?: string | null
  created_by?: string | null
  meeting_status?: string | null
  appointment_type?: string | null
  consultation_fee?: number | null
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

async function loadAppointment(bookingId: string, patientId: string): Promise<{ data: ConsultationRow | null; error: any }> {
  const doctorSelect = 'id, patient_id, doctor_id, booking_date, booking_time, status, room_url, meeting_provider, meeting_room, meeting_url, call_id, call_type, created_by, meeting_status, appointment_type'

  const { data: docData, error: docError } = await supabaseAdmin
    .from('doctor_consultations')
    .select(doctorSelect)
    .eq('id', bookingId)
    .eq('patient_id', patientId)
    .maybeSingle()

  if (docError && docError.code !== 'PGRST204') {
    const legacySelect = 'id, patient_id, doctor_id, booking_date, booking_time, status, room_url'
    const { data: legacyData, error: legacyError } = await supabaseAdmin
      .from('doctor_consultations')
      .select(legacySelect)
      .eq('id', bookingId)
      .eq('patient_id', patientId)
      .maybeSingle()

    if (!legacyError && legacyData) {
      return {
        data: {
          ...legacyData,
          table_source: 'doctor_consultations'
        } as ConsultationRow,
        error: null
      }
    }
  }

  if (docData) {
    return {
      data: {
        ...docData,
        table_source: 'doctor_consultations'
      } as ConsultationRow,
      error: null
    }
  }

  // Fallback: check staff_consultations (e.g. dietitian, nutritionist, fitness coach consultations)
  const staffSelect = 'id, patient_id, staff_id, staff_role, booking_date, booking_time, status, room_url, meeting_provider, meeting_room, meeting_url, call_id, call_type, created_by, meeting_status, appointment_type'
  const { data: staffData, error: staffError } = await supabaseAdmin
    .from('staff_consultations')
    .select(staffSelect)
    .eq('id', bookingId)
    .eq('patient_id', patientId)
    .maybeSingle()

  if (staffError && staffError.code !== 'PGRST204') {
    const legacyStaffSelect = 'id, patient_id, staff_id, staff_role, booking_date, booking_time, status, room_url'
    const { data: legacyStaffData, error: legacyStaffError } = await supabaseAdmin
      .from('staff_consultations')
      .select(legacyStaffSelect)
      .eq('id', bookingId)
      .eq('patient_id', patientId)
      .maybeSingle()

    if (legacyStaffError) return { data: null, error: legacyStaffError }
    if (legacyStaffData) {
      return {
        data: {
          ...legacyStaffData,
          doctor_id: legacyStaffData.staff_id,
          table_source: 'staff_consultations'
        } as ConsultationRow,
        error: null
      }
    }
  }

  if (staffData) {
    return {
      data: {
        ...staffData,
        doctor_id: staffData.staff_id,
        table_source: 'staff_consultations'
      } as ConsultationRow,
      error: null
    }
  }

  return { data: null, error: null }
}

function getSlotTimestamp(slotDate?: string | null, slotTime?: string | null): number | null {
  if (!slotDate || !slotTime) return null
  const parsed = new Date(`${slotDate} ${slotTime}`).getTime()
  return Number.isNaN(parsed) ? null : parsed
}

export async function GET(request: Request, context: RouteContext) {
  try {
    const { bookingId } = await context.params
    const { searchParams } = new URL(request.url)
    const patientId = searchParams.get('patientId')

    if (!bookingId || !patientId) {
      return NextResponse.json({ error: 'Missing bookingId or patientId' }, { status: 400 })
    }

    const [auth, consultationResult] = await Promise.all([
      requireAuthenticatedPatient(request, patientId),
      loadAppointment(bookingId, patientId),
    ])

    if (!auth.ok) return auth.response

    const { data: consultation, error: consultationError } = consultationResult

    if (consultationError) {
      console.error('Appointment lookup failed:', consultationError)
      return NextResponse.json({ error: 'Unable to load appointment details.', details: consultationError.message }, { status: 500 })
    }

    if (!consultation) {
      return NextResponse.json({ error: 'Appointment not found.' }, { status: 404 })
    }

    const appointment = consultation as ConsultationRow
    const isStaff = appointment.table_source === 'staff_consultations' || Boolean(appointment.staff_role)
    const staffRole = appointment.staff_role ? normalizeProviderRole(appointment.staff_role) : null
    const providerId = appointment.doctor_id || appointment.staff_id

    // Parallelize doctor/provider, payment, assessment, and membership lookups to ensure ultra-low latency
    const [doctor, payment, assessmentsRes, membershipValidity] = await Promise.all([
      // 1. Doctor/Provider Profile resolution
      (async (): Promise<DoctorProfile | null> => {
        if (!providerId) return null
        const [provRes, profRes, docRes] = await Promise.all([
          supabaseAdmin.from('provider_profiles').select('provider_id, full_name, specialization, qualification, role').eq('provider_id', providerId).maybeSingle(),
          supabaseAdmin.from('profiles').select('id, first_name, last_name, display_id, role').eq('id', providerId).maybeSingle(),
          supabaseAdmin.from('doctor_profiles').select('id, full_name, specialty').eq('id', providerId).maybeSingle(),
        ])

        const prov = provRes.data
        if (prov?.full_name) {
          const role = staffRole || (prov.role ? normalizeProviderRole(prov.role) : 'doctor')
          const isDoctor = role === 'doctor'
          const roleLabelText = labelForRole(role)
          return {
            id: prov.provider_id,
            full_name: isDoctor ? (prov.full_name.startsWith('Dr.') ? prov.full_name : `Dr. ${prov.full_name}`) : prov.full_name,
            specialty: prov.specialization || prov.qualification || (isDoctor ? 'Metabolic Physician Specialist' : `${roleLabelText} Specialist`)
          }
        }
        const prof = profRes.data
        if (prof) {
          const name = prof.display_id || `${prof.first_name || ''} ${prof.last_name || ''}`.trim()
          const role = staffRole || (prof.role ? normalizeProviderRole(prof.role) : 'doctor')
          const isDoctor = role === 'doctor'
          const roleLabelText = labelForRole(role)
          return {
            id: prof.id,
            full_name: isDoctor ? (name.startsWith('Dr.') ? name : `Dr. ${name}`) : name,
            specialty: isDoctor ? 'Metabolic Physician Specialist' : `${roleLabelText} Specialist`
          }
        }
        const doctorProfile = docRes.data
        if (doctorProfile) return doctorProfile as DoctorProfile
        const fallbackRole = staffRole ? labelForRole(staffRole) : 'Doctor'
        return {
          id: providerId,
          full_name: `Assigned ${fallbackRole}`,
          specialty: `${fallbackRole} Specialist`
        }
      })(),

      // 2. Payment Transaction resolution (Single fast query with fallback)
      (async (): Promise<PaymentTransaction | null> => {
        const { data: txns } = await supabaseAdmin
          .from('payment_transactions')
          .select('transaction_id, amount, status, payment_method, payment_provider, created_at, metadata')
          .eq('patient_id', patientId)
          .order('created_at', { ascending: false })
          .limit(10)

        if (!txns || txns.length === 0) return null
        const matched = txns.find((t: any) => t.metadata?.consultation_id === bookingId || t.metadata?.booking_id === bookingId)
        return (matched || (isStaff ? null : txns[0])) as PaymentTransaction | null
      })(),

      // 3. Health Assessment tier
      supabaseAdmin
        .from('health_assessments')
        .select('membership_tier')
        .eq('patient_id', patientId)
        .order('created_at', { ascending: false })
        .limit(1),

      // 4. Membership validity
      getMembershipValidity(patientId),
    ])

    const assessments = assessmentsRes.data
    const selectedMembershipTier = assessments?.[0]?.membership_tier
    const membershipActive = Boolean(selectedMembershipTier && membershipValidity.active)
    const appointmentType = String(appointment.appointment_type || (staffRole ? appointmentTypeForRole(staffRole) : '')).toUpperCase()
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

    let meetingProvider = appointment.meeting_provider || 'STREAM'
    let callId = appointment.call_id || null
    let callType = appointment.call_type || null

    if (!joinDisabled && (!callId || meetingProvider !== 'STREAM')) {
      const providerRole = staffRole || 'doctor'
      const streamMeeting = createStreamMeeting({
        appointmentId: appointment.id,
        providerRole,
        patientId,
        providerId: providerId || '',
        createdBy: patientId,
      })
      meetingProvider = streamMeeting.meetingProvider
      callId = streamMeeting.callId
      callType = streamMeeting.callType

      const targetTable = appointment.table_source || (isStaff ? 'staff_consultations' : 'doctor_consultations')
      const { error: meetingUpdateError } = await supabaseAdmin
        .from(targetTable)
        .update({
          meeting_provider: meetingProvider,
          call_id: callId,
          call_type: callType,
          created_by: streamMeeting.createdBy,
          meeting_status: streamMeeting.meetingStatus,
          meeting_room: null,
          meeting_url: null,
          room_url: null,
          updated_at: new Date().toISOString()
        })
        .eq('id', appointment.id)
        .eq('patient_id', patientId)

      if (meetingUpdateError) {
        console.error('Failed to replace legacy meeting URL:', meetingUpdateError)
      }
    }

    const fallbackRoleName = staffRole ? labelForRole(staffRole) : 'Doctor'
    const consultationFee = appointment.consultation_fee != null ? Number(appointment.consultation_fee) : null

    return NextResponse.json({
      appointment: {
        bookingId: appointment.id,
        assignedHealthcareProfessional: doctor?.full_name || `Assigned ${fallbackRoleName}`,
        specialization: doctor?.specialty || `${fallbackRoleName} Specialist`,
        date: appointment.booking_date,
        time: appointment.booking_time,
        meetingType: staffRole ? `${labelForRole(staffRole)} Video Consultation` : 'Video Consultation',
        status: appointmentStatus,
        rawStatus,
        appointmentType: appointmentType || null,
        consultationStatus: consultationCompleted ? 'COMPLETED' : 'PENDING',
        membershipStatus: membershipActive ? 'ACTIVE' : membershipValidity.expiresAt ? 'EXPIRED' : selectedMembershipTier ? 'SELECTED' : 'NOT_SELECTED',
        membershipExpiresAt: membershipValidity.expiresAt,
        dashboardAccess: membershipActive,
        meetingStatus: appointment.meeting_status || null,
        meetingProvider: '8Liv Encrypted Telehealth',
        meetingRoom: null,
        roomUrl: null,
        callId: joinDisabled ? null : callId,
        callType: joinDisabled ? null : callType,
        paymentAmount: payment?.amount
          ? Number(payment.amount)
          : consultationFee !== null
            ? consultationFee
            : (isStaff ? 0 : 350),
        paymentStatus: payment?.status === 'success' || payment?.status === 'paid'
          ? 'PAID'
          : (isStaff && !payment ? 'PAID' : (payment?.status || 'PENDING').toUpperCase()),
        paymentId: payment?.transaction_id || null,
        paymentMethod: payment?.payment_method || (isStaff && !payment ? 'Membership Care Protocol' : null),
        paymentProvider: payment?.payment_provider || null,
        paymentDate: payment?.created_at || null,
        freeRescheduleEligible,
        requiresNewPayment: freeRescheduleStatuses.includes(rawStatus) && !freeRescheduleEligible,
        cancellationReason: rawStatus === 'cancelled_by_doctor'
          ? `${fallbackRoleName} cancelled this appointment. Your consultation payment remains paid and can be reused.`
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

    let consultation: any = null
    let targetTable: 'doctor_consultations' | 'staff_consultations' = 'doctor_consultations'

    const { data: docConsult, error: lookupErr } = await supabaseAdmin
      .from('doctor_consultations')
      .select('id, patient_id, doctor_id, booking_date, booking_time, status')
      .eq('id', bookingId)
      .eq('patient_id', patientId)
      .maybeSingle()

    if (lookupErr && lookupErr.code !== 'PGRST204') throw lookupErr
    if (docConsult) {
      consultation = docConsult
      targetTable = 'doctor_consultations'
    } else {
      const { data: staffConsult, error: staffErr } = await supabaseAdmin
        .from('staff_consultations')
        .select('id, patient_id, staff_id, staff_role, booking_date, booking_time, status')
        .eq('id', bookingId)
        .eq('patient_id', patientId)
        .maybeSingle()

      if (staffErr && staffErr.code !== 'PGRST204') throw staffErr
      if (staffConsult) {
        consultation = {
          ...staffConsult,
          doctor_id: staffConsult.staff_id,
        }
        targetTable = 'staff_consultations'
      }
    }

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
      .from(targetTable)
      .update({ status: nextStatus, updated_at: now })
      .eq('id', bookingId)

    if (updateErr) throw updateErr

    if (beforeCutoff) {
      const providerRole = targetTable === 'staff_consultations'
        ? normalizeProviderRole(consultation.staff_role || 'dietitian')
        : 'doctor'

      await supabaseAdmin
        .from('provider_availability')
        .update({ status: 'AVAILABLE', is_available: true, updated_at: new Date().toISOString() })
        .eq('provider_id', consultation.doctor_id)
        .eq('provider_role', providerRole)
        .eq('available_date', consultation.booking_date)
        .eq('start_time', consultation.booking_time)
      invalidateDoctorAvailabilityCache()
      invalidateSlotsCache()
      invalidatePatientApiDashboardCache(patientId)
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

    // Non-blocking WhatsApp Cancellation Notification and Reminder Invalidation
    Promise.resolve().then(async () => {
      try {
        const [{ data: patientProfile }, { data: providerProfile }] = await Promise.all([
          supabaseAdmin
            .from('profiles')
            .select('first_name, last_name, display_id, phone_number')
            .eq('id', patientId)
            .maybeSingle(),
          consultation.doctor_id
            ? supabaseAdmin
                .from('profiles')
                .select('first_name, last_name, display_id')
                .eq('id', consultation.doctor_id)
                .maybeSingle()
            : Promise.resolve({ data: null }),
        ])

        const patientPhone = patientProfile?.phone_number
        if (patientPhone) {
          const isDr = targetTable === 'doctor_consultations'
          const roleLabelText = labelForRole(consultation.staff_role || 'doctor')
          const fallbackProviderName = isDr ? 'Assigned Physician' : `Assigned ${roleLabelText}`
          const patientName = [patientProfile?.first_name, patientProfile?.last_name].filter(Boolean).join(' ') || 'Patient'
          const doctorName = [providerProfile?.first_name, providerProfile?.last_name].filter(Boolean).join(' ') || fallbackProviderName

          await WhatsAppNotificationService.sendAppointmentCancelled(patientPhone, {
            patientName,
            doctorName,
            date: consultation.booking_date,
            time: consultation.booking_time,
            bookingId,
          })
        }
      } catch (waErr) {
        console.warn('[WhatsApp] Patient appointment cancellation dispatch notice:', waErr)
      }
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
