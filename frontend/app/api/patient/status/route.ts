import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseServer'
import { loadPatientJourneyState } from '@/lib/patientJourneyServer'
import { getMembershipValidity } from '@/lib/membershipServer'
import { assertPatientOrAssignedProvider } from '@/lib/apiSecurity'

type CareTeamStatus = {
  doctor_name: string
  dietitian_name: string
  nutritionist_name: string
  fitness_coach_name: string
  trainer_name: string
  doctor_id?: string | null
  dietitian_id?: string | null
  nutritionist_id?: string | null
  fitness_coach_id?: string | null
  trainer_id?: string | null
  dietitian_notes?: string | null
  nutritionist_notes?: string | null
  trainer_notes?: string | null
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const patientId = searchParams.get('patientId')

    if (!patientId) {
      return NextResponse.json({ error: 'Missing patientId' }, { status: 400 })
    }

    await assertPatientOrAssignedProvider(request, patientId)

    // 1. Fetch Profile and related data securely in parallel (bypassing RLS)
    const [
      profileRes,
      assessmentRes,
      assignmentRes,
      attendedRes,
      latestRes,
      staffRes,
      paymentsRes,
      persistedJourney,
      membershipValidity
    ] = await Promise.all([
      supabaseAdmin
        .from('profiles')
        .select('id, role, first_name, last_name, phone_number, email, created_at')
        .eq('id', patientId)
        .maybeSingle(),
      supabaseAdmin
        .from('health_assessments')
        .select('id, patient_id, booking_date, booking_time, room_url, is_eligible, consultation_fee_paid, first_name, last_name, phone_number, age, height_cm, weight_kg, goal_weight_kg, membership_tier, onboarding_completed, first_consultation_completed, medical_history, extra_medical_info, local_food, workout_preference, glp1_image_url, created_at')
        .eq('patient_id', patientId)
        .order('created_at', { ascending: false })
        .limit(1),
      supabaseAdmin
        .from('care_team_assignments')
        .select('doctor_id, dietitian_id, nutritionist_id, fitness_coach_id, trainer_id, dietitian_notes, nutritionist_notes, trainer_notes, status')
        .eq('patient_id', patientId)
        .maybeSingle(),
      supabaseAdmin
        .from('doctor_consultations')
        .select('id, appointment_type')
        .eq('patient_id', patientId)
        .in('status', ['attended', 'approved', 'rejected', 'completed'])
        .limit(1)
        .maybeSingle(),
      supabaseAdmin
        .from('doctor_consultations')
        .select('id, status, appointment_type, booking_date, booking_time, created_at')
        .eq('patient_id', patientId)
        .in('status', ['scheduled', 'calling', 'attended', 'approved', 'rejected', 'completed', 'missed_by_patient', 'cancelled_by_doctor', 'cancelled_by_patient'])
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabaseAdmin
        .from('staff_consultations')
        .select('id, staff_id, staff_role, booking_date, booking_time, status, room_url, meeting_url, created_at')
        .eq('patient_id', patientId)
        .order('created_at', { ascending: false }),
      supabaseAdmin
        .from('payment_transactions')
        .select('transaction_id, amount, status, metadata, created_at')
        .eq('patient_id', patientId)
        .eq('payment_type', 'consultation')
        .order('created_at', { ascending: false })
        .limit(5),
      loadPatientJourneyState(patientId),
      getMembershipValidity(patientId)
    ])

    if (profileRes.error) throw profileRes.error
    if (assessmentRes.error) throw assessmentRes.error

    const profile = profileRes.data
    const assessments = assessmentRes.data
    const assessment = assessments && assessments.length > 0 ? assessments[0] : null
    const assignment = assignmentRes.data
    const attendedConsult = attendedRes.data
    const latestAppointment = latestRes.data
    const staffConsults = staffRes.data || []
    const paymentsList = paymentsRes.data || []

    // Auto-cleanup past scheduled consultations if time elapsed > 90 mins
    if (assessment && assessment.booking_date && assessment.booking_time) {
      try {
        const bookingDate = assessment.booking_date
        const bookingTime = assessment.booking_time

        // Normalize the persisted appointment date and time before expiry checks.
        const timePart = bookingTime.trim()
        const isPM = timePart.toLowerCase().includes('pm')
        const [hourStr, minStr] = timePart.replace(/(am|pm)/i, '').trim().split(':')
        let hr = parseInt(hourStr)
        const mn = parseInt(minStr)
        if (isPM && hr < 12) hr += 12
        if (!isPM && hr === 12) hr = 0

        const apptDateTime = new Date(`${bookingDate}T${hr.toString().padStart(2, '0')}:${mn.toString().padStart(2, '0')}:00`)
        const now = new Date()

        // If more than 90 minutes have elapsed since the scheduled start time
        if (now.getTime() - apptDateTime.getTime() > 90 * 60 * 1000) {
          // Check doctor consultations first
          const { data: docConsult } = await supabaseAdmin
            .from('doctor_consultations')
            .select('id, status')
            .eq('patient_id', patientId)
            .eq('booking_date', bookingDate)
            .eq('booking_time', bookingTime)
            .in('status', ['scheduled', 'calling', 'attended'])
            .maybeSingle()

          if (docConsult) {
            const finalStatus = docConsult.status === 'attended' ? 'completed' : 'missed_by_patient'
            await supabaseAdmin
              .from('doctor_consultations')
              .update({ status: finalStatus, is_completed: true })
              .eq('id', docConsult.id)

            // Clear booking in assessment
            await supabaseAdmin
              .from('health_assessments')
              .update({ booking_date: null, booking_time: null, room_url: null })
              .eq('patient_id', patientId)

            assessment.booking_date = null
            assessment.booking_time = null
            assessment.room_url = null
          } else {
            // Check staff consultations
            const { data: staffConsult } = await supabaseAdmin
              .from('staff_consultations')
              .select('id, status')
              .eq('patient_id', patientId)
              .eq('booking_date', bookingDate)
              .eq('booking_time', bookingTime)
              .in('status', ['scheduled', 'attended'])
              .maybeSingle()

            if (staffConsult) {
              const finalStatus = staffConsult.status === 'attended' ? 'completed' : 'missed_by_patient'
              await supabaseAdmin
                .from('staff_consultations')
                .update({ status: finalStatus, is_completed: true })
                .eq('id', staffConsult.id)

              // Clear booking in assessment
              await supabaseAdmin
                .from('health_assessments')
                .update({ booking_date: null, booking_time: null, room_url: null })
                .eq('patient_id', patientId)

              assessment.booking_date = null
              assessment.booking_time = null
              assessment.room_url = null
            }
          }
        }
      } catch (checkErr) {
        console.error("Error in auto-cleanup of past bookings:", checkErr)
      }
    }

    // 3. Fetch Care Team Assignment and return privacy-safe labels
    const careTeam: CareTeamStatus = {
      doctor_name: assignment?.doctor_id ? 'Assigned Doctor' : 'Not Assigned',
      dietitian_name: assignment?.dietitian_id ? 'Assigned Dietitian' : 'Not Assigned',
      nutritionist_name: assignment?.nutritionist_id ? 'Assigned Nutritionist' : 'Not Assigned',
      fitness_coach_name: (assignment?.fitness_coach_id || assignment?.trainer_id) ? 'Assigned Fitness Coach' : 'Not Assigned',
      trainer_name: (assignment?.fitness_coach_id || assignment?.trainer_id) ? 'Assigned Fitness Coach' : 'Not Assigned',
      doctor_id: assignment?.doctor_id || null,
      dietitian_id: assignment?.dietitian_id || null,
      nutritionist_id: assignment?.nutritionist_id || null,
      fitness_coach_id: assignment?.fitness_coach_id || assignment?.trainer_id || null,
      trainer_id: assignment?.fitness_coach_id || assignment?.trainer_id || null,
      dietitian_notes: assignment?.dietitian_notes || null,
      nutritionist_notes: assignment?.nutritionist_notes || null,
      trainer_notes: assignment?.trainer_notes || null
    }

    // 4. Check for any attended doctor consultation session
    const has_attended_doctor_session = Boolean(attendedConsult?.id)

    let latestPayment: { transaction_id?: string | null; amount?: number | null; status?: string | null } | null = null
    if (latestAppointment?.id) {
      latestPayment = paymentsList.find(p => p.metadata?.consultation_id === latestAppointment.id) || null
    }

    if (!latestPayment && paymentsList.length > 0) {
      latestPayment = paymentsList[0]
    }

    const completedConsultationStatuses = ['approved', 'rejected', 'completed']
    const scheduledConsultationStatuses = ['scheduled', 'calling', 'attended']
    const rawConsultationStatus = (latestAppointment?.status || '').toLowerCase()
    const appointmentBooked = Boolean(latestAppointment?.id)
    const paymentPaid = assessment?.consultation_fee_paid === true || latestPayment?.status === 'success' || latestPayment?.status === 'paid'
    const consultationCompleted = completedConsultationStatuses.includes(rawConsultationStatus)
    const membershipActive = membershipValidity.active
    const assessmentStatus = persistedJourney?.assessment_status || (assessment ? 'COMPLETED' : 'NOT_STARTED')
    const medicalHistory = assessment?.medical_history && typeof assessment.medical_history === 'object'
      ? assessment.medical_history as Record<string, unknown>
      : null
    const inferredEligibilityStatus = String(
      medicalHistory?.eligibility_status || (assessment?.is_eligible ? 'ELIGIBLE' : 'NOT_ELIGIBLE')
    ).toUpperCase()
    const eligibilityStatus = persistedJourney?.eligibility_status || inferredEligibilityStatus
    const firstConsultationCompleted = Boolean(
      persistedJourney?.first_consultation_completed === true
      || assessment?.first_consultation_completed === true
      || (attendedConsult?.id && String(attendedConsult.appointment_type || '').toUpperCase() !== 'FOLLOW_UP_CONSULTATION')
    )
    const onboardingCompleted = Boolean(
      persistedJourney?.onboarding_completed === true
      || assessment?.onboarding_completed === true
      || (firstConsultationCompleted && membershipActive)
    )
    const consultationPaymentStatus = persistedJourney?.consultation_payment_status || (paymentPaid ? 'PAID' : 'NOT_PAID')
    const inferredAppointmentStatus = appointmentBooked
      ? (consultationCompleted ? 'COMPLETED' : scheduledConsultationStatuses.includes(rawConsultationStatus) ? 'SCHEDULED' : rawConsultationStatus.toUpperCase())
      : 'NOT_BOOKED'
    const appointmentStatus = persistedJourney?.appointment_status || inferredAppointmentStatus
    const consultationStatus = persistedJourney?.consultation_status || (consultationCompleted ? 'COMPLETED' : 'PENDING')
    const membershipStatus = membershipActive
      ? 'ACTIVE'
      : membershipValidity.expiresAt
        ? 'EXPIRED'
        : persistedJourney?.membership_status === 'SELECTED' || assessment?.membership_tier
          ? 'SELECTED'
          : 'NOT_SELECTED'
    const effectiveDashboardAccess = membershipActive && firstConsultationCompleted
    const currentJourneyStep = persistedJourney?.current_journey_step || persistedJourney?.last_completed_step || null

    return NextResponse.json({
      profile,
      assessment,
      careTeam,
      staffConsultations: staffConsults || [],
      has_attended_doctor_session,
      assessmentStatus,
      eligibilityStatus,
      consultationPaymentStatus,
      appointmentStatus,
      consultationStatus,
      membershipStatus,
      membershipExpiresAt: membershipValidity.expiresAt,
      dashboardAccess: effectiveDashboardAccess,
      firstConsultationCompleted,
      onboardingCompleted,
      currentJourneyStep,
      appointmentType: latestAppointment?.appointment_type || null,
      assessmentProgress: persistedJourney?.assessment_progress || 1,
      appointmentBooked,
      bookingId: persistedJourney?.booking_id || latestAppointment?.id || null,
      paymentId: persistedJourney?.payment_id || latestPayment?.transaction_id || null,
      resumeMessage: persistedJourney ? "Welcome back! We've restored your progress. Continue where you left off." : null,
      latestAppointment: latestAppointment || null,
      latestPayment: latestPayment || null,
      latestMembershipPayment: membershipValidity.startedAt
        ? {
            created_at: membershipValidity.startedAt,
            expires_at: membershipValidity.expiresAt,
            status: membershipValidity.active ? 'active' : 'expired',
          }
        : null
    })
  } catch (err: unknown) {
    console.error("API Error in /api/patient/status:", err)
    const message = err instanceof Error ? err.message : 'Internal Server Error'
    const status = message === 'Forbidden' ? 403 : (message === 'Unauthorized' ? 401 : 500)
    return NextResponse.json({ error: message }, { status })
  }
}
