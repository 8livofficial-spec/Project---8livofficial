import { supabaseAdmin } from '@/lib/supabaseServer'

export type VideoProviderRole = 'doctor' | 'dietitian' | 'nutritionist' | 'fitness_coach' | 'trainer'

export const INITIAL_CONSULTATION = 'INITIAL_CONSULTATION'
export const FOLLOW_UP_CONSULTATION = 'FOLLOW_UP_CONSULTATION'
export const DIETITIAN_CONSULTATION = 'DIETITIAN_CONSULTATION'
export const NUTRITIONIST_CONSULTATION = 'NUTRITIONIST_CONSULTATION'
export const FITNESS_COACH_CONSULTATION = 'FITNESS_COACH_CONSULTATION'

export function normalizeProviderRole(role: string): VideoProviderRole {
  return role === 'trainer' ? 'fitness_coach' : role as VideoProviderRole
}

export function appointmentTypeForRole(role: string) {
  const normalized = normalizeProviderRole(role)
  if (normalized === 'doctor') return FOLLOW_UP_CONSULTATION
  if (normalized === 'dietitian') return DIETITIAN_CONSULTATION
  if (normalized === 'nutritionist') return NUTRITIONIST_CONSULTATION
  if (normalized === 'fitness_coach') return FITNESS_COACH_CONSULTATION
  return 'PROVIDER_CONSULTATION'
}

export function isInitialConsultationType(appointmentType?: string | null) {
  return String(appointmentType || '').toUpperCase() === INITIAL_CONSULTATION
}

export function labelForRole(role: string) {
  const normalized = normalizeProviderRole(role)
  if (normalized === 'doctor') return 'Doctor'
  if (normalized === 'dietitian') return 'Dietitian'
  if (normalized === 'nutritionist') return 'Nutritionist'
  if (normalized === 'fitness_coach') return 'Fitness Coach'
  return 'Provider'
}

export function canJoinConsultation(bookingDate?: string | null, bookingTime?: string | null, status?: string | null) {
  const normalized = String(status || '').toLowerCase()
  const terminal = ['completed', 'cancelled', 'cancelled_by_doctor', 'cancelled_by_patient', 'missed', 'missed_by_patient'].includes(normalized)
  if (terminal || !bookingDate || !bookingTime) return false

  const start = new Date(`${bookingDate} ${bookingTime}`).getTime()
  if (Number.isNaN(start)) return false
  const now = Date.now()
  return now >= start - 15 * 60 * 1000
}

export async function getAssignedProviderForRole(patientId: string, role: string) {
  const normalized = normalizeProviderRole(role)
  const { data: assignment } = await supabaseAdmin
    .from('care_team_assignments')
    .select('doctor_id, dietitian_id, nutritionist_id, fitness_coach_id, trainer_id')
    .eq('patient_id', patientId)
    .maybeSingle()

  if (!assignment) return null
  if (normalized === 'dietitian') return assignment.dietitian_id || null
  if (normalized === 'nutritionist') return assignment.nutritionist_id || null
  if (normalized === 'fitness_coach') return assignment.fitness_coach_id || assignment.trainer_id || null
  if (normalized === 'doctor') return assignment.doctor_id || null
  return null
}

export async function assertAssignedProvider(patientId: string, providerId: string, role: string) {
  const assignedProviderId = await getAssignedProviderForRole(patientId, role)
  return assignedProviderId === providerId
}
