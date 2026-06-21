import { supabaseAdmin } from '@/lib/supabaseServer'
import { getAuthenticatedUser } from './apiSecurity'

export type ProviderRole = 'doctor' | 'dietitian' | 'fitness_coach' | 'nutritionist' | 'trainer'

export async function getCurrentProvider(request: Request) {
  const auth = await getAuthenticatedUser(request)
  if (!auth) {
    const err = new Error('Unauthorized')
    ;(err as any).status = 401
    ;(err as any).reason = 'no session found'
    throw err
  }

  const allowedRoles = ['doctor', 'dietitian', 'fitness_coach', 'nutritionist', 'trainer']
  if (!allowedRoles.includes(auth.role)) {
    const err = new Error('Forbidden')
    ;(err as any).status = 403
    ;(err as any).reason = 'role not allowed'
    throw err
  }

  const [profileRes, providerRes] = await Promise.all([
    supabaseAdmin
      .from('profiles')
      .select('id, first_name, last_name, email, role')
      .eq('id', auth.user.id)
      .maybeSingle(),
    supabaseAdmin
      .from('provider_profiles')
      .select('provider_id, full_name, specialization, qualification, status, profile_photo_url, email, payout_amount')
      .eq('provider_id', auth.user.id)
      .maybeSingle()
  ])

  if (profileRes.error) {
    const err = new Error(profileRes.error.message)
    ;(err as any).status = 500
    throw err
  }

  const profile = profileRes.data
  const role = profile?.role || auth.role
  const providerProfile = providerRes.data

  if (!providerProfile) {
    const err = new Error('Provider profile missing')
    ;(err as any).status = 404
    ;(err as any).reason = 'provider profile missing'
    throw err
  }

  return {
    user: auth.user,
    profile: profile || null,
    providerProfile,
    role: (role === 'trainer' ? 'fitness_coach' : role) as ProviderRole,
  }
}

export async function getAuthenticatedProvider(request: Request) {
  try {
    const provider = await getCurrentProvider(request)
    return provider
  } catch (err: any) {
    return {
      error: err.message || 'Unauthorized',
      status: err.status || 401,
      reason: err.reason || 'invalid session'
    }
  }
}

export function assignmentColumnForRole(role: ProviderRole) {
  if (role === 'dietitian') return 'dietitian_id'
  if (role === 'fitness_coach' || role === 'trainer') return 'fitness_coach_id'
  if (role === 'nutritionist') return 'nutritionist_id'
  return null
}

export function trainerFallbackColumnForRole(role: ProviderRole) {
  return role === 'fitness_coach' || role === 'trainer' ? 'trainer_id' : null
}
