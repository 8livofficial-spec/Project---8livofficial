export type PatientJourneyState = {
  assessmentStatus?: string
  assessmentProgress?: number
  eligibilityStatus?: string
  consultationPaymentStatus?: string
  appointmentStatus?: string
  consultationStatus?: string
  membershipStatus?: string
  dashboardAccess?: boolean
  firstConsultationCompleted?: boolean
  onboardingCompleted?: boolean
  currentJourneyStep?: string | null
  appointmentType?: string | null
  bookingId?: string | null
  paymentId?: string | null
}

export function getPatientJourneyTarget(state: PatientJourneyState) {
  if (state.membershipStatus === 'ACTIVE' && state.firstConsultationCompleted === true) return '/patient'
  if (state.assessmentStatus !== 'COMPLETED') return '/assessment'
  if (state.eligibilityStatus !== 'ELIGIBLE') return '/assessment'
  if (state.consultationPaymentStatus !== 'PAID') return '/consultation-payment'
  if (state.appointmentStatus !== 'SCHEDULED') return '/appointments/select-slot'
  if (state.consultationStatus !== 'COMPLETED') {
    return state.bookingId ? `/patient/appointments/${state.bookingId}` : '/patient/appointments'
  }
  if (state.membershipStatus === 'NOT_SELECTED') return '/plans'
  if (state.membershipStatus === 'ACTIVE' || state.dashboardAccess) return '/patient'
  return '/membership-payment'
}

export function getPatientFlowStep(state: PatientJourneyState) {
  if (state.dashboardAccess || (state.membershipStatus === 'ACTIVE' && state.firstConsultationCompleted === true)) return 'ready'
  if (state.assessmentStatus !== 'COMPLETED') return 'needs_assessment'
  if (state.eligibilityStatus !== 'ELIGIBLE') return 'needs_assessment'
  if (state.consultationPaymentStatus === 'PAID' && state.appointmentStatus === 'SCHEDULED' && state.consultationStatus !== 'COMPLETED') {
    return 'appointment_scheduled'
  }
  if (state.consultationStatus === 'COMPLETED' && state.membershipStatus === 'NOT_SELECTED') return 'needs_plan'
  if (state.consultationStatus === 'COMPLETED' && state.membershipStatus === 'SELECTED') return 'needs_payment'
  return 'needs_consultation'
}
