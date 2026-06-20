import { supabaseAdmin } from '@/lib/supabaseServer'
import type { PatientJourneyState } from '@/lib/patientJourney'

function toDbPayload(state: PatientJourneyState & { lastCompletedStep?: string; metadata?: Record<string, unknown> }) {
  return {
    assessment_status: state.assessmentStatus,
    assessment_progress: state.assessmentProgress,
    eligibility_status: state.eligibilityStatus,
    consultation_payment_status: state.consultationPaymentStatus,
    appointment_status: state.appointmentStatus,
    consultation_status: state.consultationStatus,
    membership_status: state.membershipStatus,
    dashboard_access: state.dashboardAccess,
    first_consultation_completed: state.firstConsultationCompleted,
    onboarding_completed: state.onboardingCompleted,
    current_journey_step: state.currentJourneyStep,
    appointment_type: state.appointmentType,
    booking_id: state.bookingId,
    payment_id: state.paymentId,
    last_completed_step: state.lastCompletedStep,
    metadata: state.metadata,
    updated_at: new Date().toISOString(),
  }
}

export async function updatePatientJourneyState(
  patientId: string,
  state: PatientJourneyState & { lastCompletedStep?: string; metadata?: Record<string, unknown> }
) {
  const payload = Object.fromEntries(
    Object.entries(toDbPayload(state)).filter(([, value]) => value !== undefined)
  )

  const query = supabaseAdmin
    .from('patient_journey_state')
    .upsert({
      patient_id: patientId,
      ...payload,
    })

  const { error } = await query
  if (!error) return

  const schemaError = String(error.message || '').toLowerCase()
  if (schemaError.includes('column') && ['first_consultation_completed', 'onboarding_completed', 'current_journey_step', 'appointment_type'].some(column => schemaError.includes(column))) {
    const legacyPayload = { ...payload }
    delete legacyPayload.first_consultation_completed
    delete legacyPayload.onboarding_completed
    delete legacyPayload.current_journey_step
    delete legacyPayload.appointment_type

    const { error: retryError } = await supabaseAdmin
      .from('patient_journey_state')
      .upsert({
        patient_id: patientId,
        ...legacyPayload,
      })

    if (!retryError) return
    console.error('Failed to update patient journey state:', retryError.message)
    throw retryError
  }

  {
    console.error('Failed to update patient journey state:', error.message)
    throw error
  }
}

export async function loadPatientJourneyState(patientId: string) {
  const { data, error } = await supabaseAdmin
    .from('patient_journey_state')
    .select('*')
    .eq('patient_id', patientId)
    .maybeSingle()

  if (error) {
    console.error('Failed to load patient journey state:', error.message)
    return null
  }

  return data
}
