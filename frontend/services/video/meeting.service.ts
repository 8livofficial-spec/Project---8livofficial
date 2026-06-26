import { randomUUID } from 'crypto'

export type ProviderRole = 'doctor' | 'dietitian' | 'nutritionist' | 'fitness_coach'
export type MeetingStatus = 'CREATED' | 'WAITING' | 'LIVE' | 'COMPLETED' | 'CANCELLED' | 'MISSED'

const ROLE_TO_CONSULTATION_TYPE: Record<ProviderRole, string> = {
  doctor: 'DOCTOR_CONSULTATION',
  dietitian: 'DIETITIAN_CONSULTATION',
  nutritionist: 'NUTRITIONIST_CONSULTATION',
  fitness_coach: 'FITNESS_COACH_CONSULTATION',
}

export function consultationTypeForVideoRole(role: string) {
  const normalized = role === 'trainer' ? 'fitness_coach' : role
  return ROLE_TO_CONSULTATION_TYPE[normalized as ProviderRole] || 'DOCTOR_CONSULTATION'
}

export function createStreamMeeting(input: {
  appointmentId?: string
  providerRole: string
  patientId: string
  providerId: string
  createdBy: string
}) {
  const appointmentPart = input.appointmentId || randomUUID()
  return {
    meetingProvider: 'STREAM',
    callId: `8liv-${input.providerRole}-${appointmentPart}`.toLowerCase().replace(/[^a-z0-9_-]/g, '-'),
    callType: consultationTypeForVideoRole(input.providerRole),
    createdBy: input.createdBy,
    meetingStatus: 'CREATED' as MeetingStatus,
    metadata: {
      patientId: input.patientId,
      providerId: input.providerId,
      providerRole: input.providerRole,
    },
  }
}

export function terminalMeetingStatus(status?: string | null) {
  return ['completed', 'cancelled', 'cancelled_by_doctor', 'cancelled_by_patient', 'missed', 'missed_by_patient', 'rejected'].includes(String(status || '').toLowerCase())
}
