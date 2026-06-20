import { supabaseAdmin } from '@/lib/supabaseServer'

export type ProviderRole = 'doctor' | 'dietitian' | 'fitness_coach' | 'nutritionist' | 'trainer'

export async function getAuthenticatedProvider(request: Request) {
  const authHeader = request.headers.get('authorization') || ''
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice('Bearer '.length).trim() : ''

  if (!token) {
    return { error: 'Unauthorized', status: 401 as const }
  }

  const { data, error } = await supabaseAdmin.auth.getUser(token)
  if (error || !data.user) {
    return { error: 'Invalid session', status: 401 as const }
  }

  const [profileRes, providerRes] = await Promise.all([
    supabaseAdmin
      .from('profiles')
      .select('id, first_name, last_name, email, role')
      .eq('id', data.user.id)
      .maybeSingle(),
    supabaseAdmin
      .from('provider_profiles')
      .select('provider_id, full_name, specialization, qualification, status, profile_photo_url')
      .eq('provider_id', data.user.id)
      .maybeSingle()
  ])

  if (profileRes.error) {
    return { error: profileRes.error.message, status: 500 as const }
  }

  const profile = profileRes.data
  const role = profile?.role || data.user.user_metadata?.role
  if (!['doctor', 'dietitian', 'fitness_coach', 'nutritionist', 'trainer'].includes(role)) {
    return { error: 'Provider access only', status: 403 as const }
  }

  const providerProfile = providerRes.data

  return {
    user: data.user,
    profile: profile || null,
    providerProfile,
    role: (role === 'trainer' ? 'fitness_coach' : role) as ProviderRole,
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
