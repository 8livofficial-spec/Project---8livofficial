import { supabaseAdmin } from './supabaseServer'
import { normalizeEmail } from './authSecurity'
import { getAssignedProviderForRole } from './providerConsultations'

export async function getAuthenticatedUser(request: Request) {
  const authHeader = request.headers.get('authorization') || ''
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : ''
  if (!token) return null

  const { data, error } = await supabaseAdmin.auth.getUser(token)
  if (error || !data.user) return null

  const user = data.user
  const email = normalizeEmail(user.email)

  // Explicit email check overrides for admin accounts
  if (email === '8livofficial@gmail.com' || email === 'admin@8liv.com') {
    return { user, role: 'admin' }
  }

  // Check roles from profiles table
  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle()

  if (profile?.role) {
    return { user, role: profile.role }
  }

  // Fallback check to doctor_profiles or default role
  const { data: doctorProfile } = await supabaseAdmin
    .from('doctor_profiles')
    .select('id')
    .eq('id', user.id)
    .maybeSingle()

  const role = doctorProfile?.id ? 'doctor' : 'patient'
  return { user, role }
}

export async function assertAdmin(request: Request) {
  const auth = await getAuthenticatedUser(request)
  if (!auth) {
    throw new Error('Unauthorized')
  }
  if (auth.role !== 'admin') {
    throw new Error('Forbidden')
  }
  return auth.user
}

export async function assertDoctor(request: Request, doctorId?: string | null) {
  const auth = await getAuthenticatedUser(request)
  if (!auth) {
    throw new Error('Unauthorized')
  }

  // Admin bypass
  if (auth.role === 'admin') {
    return auth.user
  }

  if (auth.role !== 'doctor') {
    throw new Error('Forbidden')
  }

  if (doctorId && auth.user.id !== doctorId) {
    throw new Error('Forbidden')
  }
  return auth.user
}

export async function assertPatientOrAssignedProvider(request: Request, patientId: string) {
  const auth = await getAuthenticatedUser(request)
  if (!auth) {
    throw new Error('Unauthorized')
  }

  // Admin bypass
  if (auth.role === 'admin') {
    return auth.user
  }

  // If user is the patient themselves
  if (auth.user.id === patientId) {
    return auth.user
  }

  // If user is a provider, check if they are assigned to this patient
  if (['doctor', 'dietitian', 'fitness_coach', 'nutritionist', 'trainer'].includes(auth.role)) {
    const [assignedDoctor, assignedDietitian, assignedNutritionist, assignedFitnessCoach] = await Promise.all([
      getAssignedProviderForRole(patientId, 'doctor'),
      getAssignedProviderForRole(patientId, 'dietitian'),
      getAssignedProviderForRole(patientId, 'nutritionist'),
      getAssignedProviderForRole(patientId, 'fitness_coach'),
    ])

    if (
      auth.user.id === assignedDoctor ||
      auth.user.id === assignedDietitian ||
      auth.user.id === assignedNutritionist ||
      auth.user.id === assignedFitnessCoach
    ) {
      return auth.user
    }
  }

  throw new Error('Forbidden')
}
