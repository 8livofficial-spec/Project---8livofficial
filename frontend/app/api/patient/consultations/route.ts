import { NextResponse } from 'next/server'
import { randomUUID } from 'crypto'
import { supabaseAdmin } from '@/lib/supabaseServer'
import { createJitsiMeeting } from '@/lib/jitsi'
import { EmailService } from '@/lib/emailService'
import { loadPatientJourneyState, updatePatientJourneyState } from '@/lib/patientJourneyServer'
import { finalizeConsultationAssignment, reserveDoctorForInitialConsultation } from '@/lib/smartAssignmentEngine'
import { getAuthenticatedPatient, getIndiaSlotTimestamp, isFutureIndiaSlot } from '@/lib/appointmentAvailability'
import { FOLLOW_UP_CONSULTATION, INITIAL_CONSULTATION } from '@/lib/providerConsultations'
import { getMembershipValidity } from '@/lib/membershipServer'

const CONSULTATION_FEE = 499

function generateTxnId(): string {
  return `TXN8LIV${Date.now()}${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`
}

function getSlotTimestamp(slotDate: string, slotTime: string): number | null {
  return getIndiaSlotTimestamp(slotDate, slotTime)
}

function isFutureSlot(slotDate: string, slotTime: string): boolean {
  return isFutureIndiaSlot(slotDate, slotTime)
}

function normalizeStatus(status?: string | null) {
  return (status || '').toLowerCase()
}

type AvailabilitySlot = {
  id: string
  provider_id: string
  available_date: string
  start_time: string
  status: string
  doctor_id: string
  time_slot: string
  is_booked: boolean
}

async function getPatientConsultationContext(patientId: string) {
  const [{ data: assessments }, { data: completedInitial }, persistedJourney, membershipValidity] = await Promise.all([
    supabaseAdmin
      .from('health_assessments')
      .select('*')
      .eq('patient_id', patientId)
      .order('created_at', { ascending: false })
      .limit(1),
    supabaseAdmin
      .from('doctor_consultations')
      .select('*')
      .eq('patient_id', patientId)
      .in('status', ['approved', 'rejected', 'completed'])
      .order('created_at', { ascending: true })
      .limit(1)
      .maybeSingle(),
    loadPatientJourneyState(patientId),
    getMembershipValidity(patientId),
  ])

  const assessment = assessments?.[0] || null
  const membershipActive = membershipValidity.active
  const firstConsultationCompleted = Boolean(
    persistedJourney?.first_consultation_completed === true
    || assessment?.first_consultation_completed === true
    || (completedInitial?.id && String(completedInitial.appointment_type || '').toUpperCase() !== FOLLOW_UP_CONSULTATION)
  )

  return {
    assessment,
    membershipActive,
    firstConsultationCompleted,
    appointmentType: !firstConsultationCompleted && !membershipActive ? INITIAL_CONSULTATION : FOLLOW_UP_CONSULTATION,
  }
}

export async function GET(request: Request) {
  try {
    const authenticatedPatient = await getAuthenticatedPatient(request)
    if ('error' in authenticatedPatient) return NextResponse.json({ error: authenticatedPatient.error }, { status: authenticatedPatient.status })
    const today = new Date().toISOString().split('T')[0]
    const { searchParams } = new URL(request.url)
    const selectedDate = searchParams.get('date') || ''
    const dateFilter = /^\d{4}-\d{2}-\d{2}$/.test(selectedDate) ? selectedDate : ''

    // Fetch active doctor IDs first
    const { data: providerProfiles, error: providerProfilesError } = await supabaseAdmin
      .from('provider_profiles')
      .select('provider_id')
      .eq('role', 'doctor')
      .eq('status', 'active')

    let activeDoctorIds = new Set<string>()
    if (!providerProfilesError && providerProfiles?.length) {
      activeDoctorIds = new Set(providerProfiles.map((p) => p.provider_id))
    } else {
      // Fallback to profiles table
      const { data: profiles } = await supabaseAdmin
        .from('profiles')
        .select('id')
        .eq('role', 'doctor')
      activeDoctorIds = new Set((profiles || []).map((p) => p.id))
    }

    if (activeDoctorIds.size === 0) {
      return NextResponse.json({ slots: [] })
    }

    let query = supabaseAdmin
      .from('provider_availability')
      .select('id, provider_id, available_date, start_time, status')
      .eq('provider_role', 'doctor')
      .eq('status', 'AVAILABLE')
      .eq('is_available', true)
      .in('provider_id', Array.from(activeDoctorIds))

    if (dateFilter) {
      query = query.eq('available_date', dateFilter)
    } else {
      query = query.gte('available_date', today)
    }

    const { data: slots, error } = await query
      .order('available_date', { ascending: true })
      .order('start_time', { ascending: true })

    if (error) {
      console.error('Available slots lookup failed:', error)
      return NextResponse.json({ error: 'Unable to load available doctor slots.' }, { status: 500 })
    }

    const groupedSlots = new Map<string, { available_date: string; time_slot: string; available_count: number }>()

    ;((slots || []) as AvailabilitySlot[])
      .filter((slot) => activeDoctorIds.has(slot.provider_id) && isFutureSlot(slot.available_date, slot.start_time))
      .sort((a, b) => (getSlotTimestamp(a.available_date, a.start_time) || 0) - (getSlotTimestamp(b.available_date, b.start_time) || 0))
      .forEach((slot) => {
        const key = `${slot.available_date}-${slot.start_time}`
        const existing = groupedSlots.get(key)
        if (existing) {
          groupedSlots.set(key, { ...existing, available_count: existing.available_count + 1 })
        } else {
          groupedSlots.set(key, {
            available_date: slot.available_date,
            time_slot: slot.start_time,
            available_count: 1,
          })
        }
      })

    return NextResponse.json({ slots: Array.from(groupedSlots.values()) })
  } catch (err: unknown) {
    console.error('API Error in GET /api/patient/consultations:', err)
    const message = err instanceof Error ? err.message : 'Internal Server Error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const authenticatedPatient = await getAuthenticatedPatient(request)
    if ('error' in authenticatedPatient) return NextResponse.json({ error: authenticatedPatient.error }, { status: authenticatedPatient.status })
    const body = await request.json()
    const { patientId, paymentMethod, selectedDate, selectedTime, reusePaymentFromBookingId, followUpOfBookingId } = body

    if (!patientId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }
    if (patientId !== authenticatedPatient.user.id) {
      return NextResponse.json({ error: 'Patient identity does not match the authenticated session.' }, { status: 403 })
    }
    if (!selectedDate || !selectedTime) {
      return NextResponse.json({ error: 'Please select a consultation time before confirming.' }, { status: 400 })
    }
    if (!isFutureSlot(selectedDate, selectedTime)) {
      return NextResponse.json({ error: 'Selected consultation time is no longer available.' }, { status: 409 })
    }

    // Prevent duplicate booking: check if patient already has an active scheduled consultation
    const { data: existingActive, error: activeErr } = await supabaseAdmin
      .from('doctor_consultations')
      .select('id')
      .eq('patient_id', patientId)
      .in('status', ['scheduled', 'calling', 'attended'])
      .limit(1)
      .maybeSingle()

    if (activeErr) {
      console.error('Active appointment lookup failed:', activeErr)
    }
    if (existingActive?.id) {
      return NextResponse.json({ error: 'You already have an active scheduled consultation.' }, { status: 409 })
    }

    const patientContext = await getPatientConsultationContext(patientId)
    const isInitialConsultation = patientContext.appointmentType === INITIAL_CONSULTATION
    const hasActiveMembership = patientContext.membershipActive && patientContext.firstConsultationCompleted

    if (!isInitialConsultation && !hasActiveMembership) {
      return NextResponse.json({ error: 'Active membership is required to book follow-up consultations.' }, { status: 403 })
    }

    if (isInitialConsultation) {
      if (!patientContext.assessment) {
        return NextResponse.json({ error: 'Complete your assessment before booking the initial consultation.' }, { status: 403 })
      }
      const eligibilityStatus = String(patientContext.assessment.medical_history?.eligibility_status || (patientContext.assessment.is_eligible ? 'ELIGIBLE' : 'NOT_ELIGIBLE')).toUpperCase()
      if (eligibilityStatus !== 'ELIGIBLE' && eligibilityStatus !== 'REVIEW_REQUIRED') {
        return NextResponse.json({ error: 'Eligibility approval is required before booking the initial consultation.' }, { status: 403 })
      }
    }

    let reusedPayment: { transaction_id?: string | null; payment_method?: string | null } | null = null
    let freeRescheduleFrom: string | null = null

    if (reusePaymentFromBookingId && isInitialConsultation) {
      const { data: previousConsultation, error: previousErr } = await supabaseAdmin
        .from('doctor_consultations')
        .select('id, patient_id, status')
        .eq('id', reusePaymentFromBookingId)
        .eq('patient_id', patientId)
        .maybeSingle()

      if (previousErr) {
        console.error('Previous consultation lookup failed:', previousErr)
        return NextResponse.json({ error: 'Unable to validate reschedule eligibility.' }, { status: 500 })
      }

      const previousStatus = normalizeStatus(previousConsultation?.status)
      const reusableStatus = ['cancelled_by_doctor', 'cancelled_by_patient', 'missed_by_patient'].includes(previousStatus)
      if (!previousConsultation || !reusableStatus) {
        return NextResponse.json({ error: 'This appointment is not eligible for payment reuse.' }, { status: 409 })
      }

      if (previousStatus === 'missed_by_patient') {
        const { data: usedFreeReschedule } = await supabaseAdmin
          .from('payment_transactions')
          .select('id')
          .eq('patient_id', patientId)
          .eq('payment_type', 'consultation')
          .contains('metadata', { free_reschedule_from: reusePaymentFromBookingId })
          .limit(1)
          .maybeSingle()

        if (usedFreeReschedule?.id) {
          return NextResponse.json({ error: 'Your free missed-consultation reschedule has already been used. Please pay the consultation fee again.' }, { status: 402 })
        }
        freeRescheduleFrom = reusePaymentFromBookingId
      }

      const { data: existingPayment } = await supabaseAdmin
        .from('payment_transactions')
        .select('transaction_id, payment_method')
        .eq('patient_id', patientId)
        .eq('payment_type', 'consultation')
        .contains('metadata', { consultation_id: reusePaymentFromBookingId })
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      reusedPayment = existingPayment || null
      if (!reusedPayment) {
        const { data: fallbackPayment } = await supabaseAdmin
          .from('payment_transactions')
          .select('transaction_id, payment_method')
          .eq('patient_id', patientId)
          .eq('payment_type', 'consultation')
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle()

        reusedPayment = fallbackPayment || null
      }

      if (!reusedPayment?.transaction_id) {
        return NextResponse.json({ error: 'No reusable consultation payment was found. Please pay the consultation fee again.' }, { status: 402 })
      }
    }

    if (isInitialConsultation && !paymentMethod && !reusedPayment) {
      return NextResponse.json({ error: 'Consultation fee payment is required before booking.' }, { status: 402 })
    }

    let preferredDoctorId: string | null = null
    if (followUpOfBookingId || reusePaymentFromBookingId) {
      const { data: previousDoctor } = await supabaseAdmin
        .from('doctor_consultations')
        .select('doctor_id')
        .eq('id', followUpOfBookingId || reusePaymentFromBookingId)
        .eq('patient_id', patientId)
        .maybeSingle()
      preferredDoctorId = previousDoctor?.doctor_id || null
    }

    let smartAssignment
    try {
      smartAssignment = await reserveDoctorForInitialConsultation({
        patientId,
        selectedDate,
        selectedTime,
        requiredSpecialization: 'Endocrinologist',
        preferredDoctorId,
      })
    } catch (assignmentError) {
      const message = assignmentError instanceof Error ? assignmentError.message : 'Unable to assign a doctor for this slot.'
      console.error('Smart consultation assignment failed:', assignmentError)
      return NextResponse.json({ error: message }, { status: message.includes('No qualified') ? 409 : 500 })
    }

    const slot = smartAssignment.slot as AvailabilitySlot
    const doctor = {
      id: smartAssignment.provider.providerId,
      full_name: smartAssignment.provider.fullName,
      specialty: smartAssignment.provider.specialization,
    }
    const appointmentId = randomUUID()
    const meeting = createJitsiMeeting(appointmentId)

    const consultationPayload: Record<string, unknown> = {
      id: appointmentId,
      patient_id: patientId,
      doctor_id: slot.doctor_id,
      booking_date: slot.available_date,
      booking_time: slot.time_slot,
      status: 'scheduled',
      room_url: meeting.meetingUrl,
      meeting_provider: meeting.meetingProvider,
      meeting_room: meeting.meetingRoom,
      meeting_url: meeting.meetingUrl,
      appointment_type: patientContext.appointmentType,
      is_completed: false,
    }
    const optionalSchemaColumns = new Set([
      'meeting_provider',
      'meeting_room',
      'meeting_url',
      'appointment_type',
      'is_completed',
    ])
    let consultation: ({ id: string } & Record<string, unknown>) | null = null
    let consultErr: { code?: string; message: string } | null = null

    while (!consultation) {
      const result = await supabaseAdmin
        .from('doctor_consultations')
        .insert(consultationPayload)
        .select()
        .single()

      if (!result.error) {
        consultation = result.data
        break
      }

      const missingColumn = result.error.code === 'PGRST204'
        ? result.error.message.match(/Could not find the '([^']+)' column/)?.[1]
        : null
      if (missingColumn && optionalSchemaColumns.has(missingColumn) && missingColumn in consultationPayload) {
        console.warn(`doctor_consultations.${missingColumn} is unavailable; retrying with the legacy schema.`)
        delete consultationPayload[missingColumn]
        continue
      }

      consultErr = result.error
      break
    }

    if (consultErr || !consultation) {
      console.error('Consultation insert error:', consultErr)
      await supabaseAdmin
        .from('provider_availability')
        .update({ status: 'AVAILABLE', is_available: true, updated_at: new Date().toISOString() })
        .eq('id', slot.id)
      return NextResponse.json({ error: consultErr?.message || 'Unable to create consultation.' }, { status: 500 })
    }

    const txnId = isInitialConsultation ? (reusedPayment?.transaction_id || generateTxnId()) : ''

    const response = NextResponse.json({
      success: true,
      consultation,
      bookingId: consultation.id,
      paymentId: txnId,
      transaction_id: txnId,
      appointmentType: patientContext.appointmentType,
      appointmentStatus: 'SCHEDULED',
      consultationStatus: 'PENDING',
      paymentStatus: isInitialConsultation ? 'PAID' : 'NOT_REQUIRED',
      membershipStatus: isInitialConsultation ? 'NOT_SELECTED' : 'ACTIVE',
      dashboardAccess: !isInitialConsultation,
      assignment: {
        consultationId: consultation.id,
        bookingId: consultation.id,
        paymentId: txnId,
        paymentAmount: isInitialConsultation ? CONSULTATION_FEE : 0,
        paymentStatus: isInitialConsultation ? 'PAID' : 'NOT_REQUIRED',
        appointmentStatus: 'SCHEDULED',
        consultationStatus: 'PENDING',
        doctorName: doctor?.full_name || 'Assigned Doctor',
        specialty: doctor?.specialty || 'Physician Specialist',
        bookingDate: slot.available_date,
        bookingTime: slot.time_slot,
        meetingType: 'Video Consultation',
        meetingProvider: meeting.meetingProvider
      }
    })

    // Execute non-critical tasks in background
    Promise.resolve().then(async () => {
      try {
        await finalizeConsultationAssignment({
          patientId,
          appointmentId: consultation.id,
          provider: smartAssignment.provider,
          selectedDate: slot.available_date,
          selectedTime: slot.time_slot,
          isFollowUp: Boolean(preferredDoctorId),
        })

        const assessmentUpdate: Record<string, unknown> = {
          booking_date: slot.available_date,
          booking_time: slot.time_slot,
          room_url: meeting.meetingUrl,
        }
        if (isInitialConsultation) assessmentUpdate.consultation_fee_paid = true

        const { error: assessmentErr } = await supabaseAdmin
          .from('health_assessments')
          .update(assessmentUpdate)
          .eq('patient_id', patientId)

        if (assessmentErr) {
          console.error('Failed to update health assessment in background:', assessmentErr)
        }

        if (isInitialConsultation) {
          const { error: txnError } = await supabaseAdmin
            .from('payment_transactions')
            .insert({
              patient_id: patientId,
              amount: reusedPayment ? 0 : CONSULTATION_FEE,
              currency: 'INR',
              payment_method: reusedPayment?.payment_method || paymentMethod,
              payment_provider: 'razorpay_sim',
              transaction_id: reusedPayment ? `${txnId}-REUSE-${Date.now()}` : txnId,
              status: 'success',
              membership_tier: null,
              payment_type: 'consultation',
              metadata: {
                booking_id: consultation.id,
                booking_date: slot.available_date,
                booking_time: slot.time_slot,
                consultation_id: consultation.id,
                doctor_id: slot.doctor_id,
                appointment_type: patientContext.appointmentType,
                appointment_status: 'SCHEDULED',
                payment_status: 'PAID',
                consultation_status: 'PENDING',
                membership_status: 'NOT_SELECTED',
                dashboard_access: false,
                meeting_provider: meeting.meetingProvider,
                meeting_room: meeting.meetingRoom,
                meeting_url: meeting.meetingUrl,
                reused_payment_id: reusedPayment?.transaction_id || null,
                free_reschedule_from: freeRescheduleFrom,
                rescheduled_from: reusePaymentFromBookingId || null,
                recorded_at: new Date().toISOString()
              }
            })

          if (txnError) {
            console.error('Failed to record consultation payment transaction in background:', txnError)
          }

          await supabaseAdmin
            .from('patient_notifications')
            .insert({
              patient_id: patientId,
              type: 'billing',
              title: 'Consultation Fee Paid',
              message: reusedPayment
                ? `Your existing consultation payment was reused for this rescheduled appointment (Original Txn: ${txnId}).`
                : `Your consultation fee payment of INR ${CONSULTATION_FEE} via ${paymentMethod} was processed successfully (Txn: ${txnId}).`,
              is_read: false
            })
        }

        await supabaseAdmin
          .from('patient_notifications')
          .insert({
            patient_id: patientId,
            type: 'meeting',
            title: 'Consultation Scheduled',
            message: `Your consultation with ${doctor?.full_name || 'your assigned doctor'} is scheduled for ${slot.available_date} at ${slot.time_slot}. You will receive reminders before your appointment.`,
            is_read: false
          })

        await updatePatientJourneyState(patientId, isInitialConsultation ? {
          assessmentStatus: 'COMPLETED',
          eligibilityStatus: 'ELIGIBLE',
          consultationPaymentStatus: 'PAID',
          appointmentStatus: 'SCHEDULED',
          consultationStatus: 'PENDING',
          membershipStatus: 'NOT_SELECTED',
          dashboardAccess: false,
          appointmentType: patientContext.appointmentType,
          bookingId: consultation.id,
          paymentId: txnId,
          currentJourneyStep: 'INITIAL_CONSULTATION_BOOKED',
          lastCompletedStep: 'APPOINTMENT_BOOKED',
        } : {
          appointmentStatus: 'SCHEDULED',
          consultationStatus: 'PENDING',
          membershipStatus: 'ACTIVE',
          dashboardAccess: true,
          firstConsultationCompleted: true,
          onboardingCompleted: true,
          appointmentType: patientContext.appointmentType,
          bookingId: consultation.id,
          currentJourneyStep: 'FOLLOW_UP_CONSULTATION_BOOKED',
          lastCompletedStep: 'FOLLOW_UP_APPOINTMENT_BOOKED',
        })

        const [{ data: userData }, { data: profile }] = await Promise.all([
          supabaseAdmin.auth.admin.getUserById(patientId),
          supabaseAdmin
            .from('profiles')
            .select('first_name, last_name, display_id')
            .eq('id', patientId)
            .maybeSingle()
        ])

        const patientEmail = userData?.user?.email
        const patientName = [profile?.first_name, profile?.last_name].filter(Boolean).join(' ')
          || profile?.display_id
          || patientEmail?.split('@')[0]
          || 'there'

        if (patientEmail) {
          EmailService.sendPaymentReceipt({
            email: patientEmail,
            name: patientName,
            patientId,
            amount: isInitialConsultation ? (reusedPayment ? 0 : CONSULTATION_FEE) : 0,
            paymentId: txnId || consultation.id,
            paymentMethod: reusedPayment?.payment_method || paymentMethod || 'membership',
            paymentType: isInitialConsultation ? (reusedPayment ? 'consultation_reschedule' : 'consultation') : 'membership_follow_up',
            paymentDate: new Date().toISOString(),
          }).catch(err => console.error('Failed to send payment receipt email in background:', err))

          EmailService.sendAppointmentConfirmation({
            email: patientEmail,
            name: patientName,
            patientId,
            doctorName: doctor?.full_name || 'Assigned Doctor',
            specialization: doctor?.specialty || 'Physician Specialist',
            bookingDate: slot.available_date,
            bookingTime: slot.time_slot,
            bookingId: consultation.id,
            meetingType: 'Video Consultation',
          }).catch(err => console.error('Failed to send appointment confirmation email in background:', err))
        }
      } catch (backgroundErr) {
        console.error('Failed executing background booking tasks:', backgroundErr)
      }
    })

    return response
  } catch (err: unknown) {
    console.error('API Error in /api/patient/consultations:', err)
    const message = err instanceof Error ? err.message : 'Internal Server Error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
