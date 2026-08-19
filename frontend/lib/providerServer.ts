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

  const [profileRes, v2ProviderRes, providerRes] = await Promise.all([
    supabaseAdmin
      .from('profiles')
      .select('id, first_name, last_name, email, role')
      .eq('id', auth.user.id)
      .maybeSingle(),
    supabaseAdmin
      .from('provider_profiles_v2')
      .select('id, user_id, full_name, email, role, specialization, account_status, onboarding_status, clinical_verification_status')
      .eq('user_id', auth.user.id)
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
  const v2Provider = v2ProviderRes.data
  const role = String(v2Provider?.role || profile?.role || auth.role).toLowerCase() === 'fitness_coach'
    ? 'fitness_coach'
    : String(v2Provider?.role || profile?.role || auth.role).toLowerCase()
  let providerProfile = providerRes.data || (v2Provider ? {
    provider_id: auth.user.id,
    provider_profile_id: v2Provider.id,
    full_name: v2Provider.full_name,
    specialization: v2Provider.specialization,
    qualification: null,
    status: v2Provider.account_status === 'ACTIVE' ? 'active' : String(v2Provider.account_status || '').toLowerCase(),
    profile_photo_url: null,
    email: v2Provider.email,
    payout_amount: null,
  } : null)

  if (!providerProfile) {
    const fullName = [profile?.first_name, profile?.last_name].filter(Boolean).join(' ')
      || auth.user.user_metadata?.full_name
      || auth.user.email?.split('@')[0]
      || 'Provider'
    
    // Auto-create in provider_profiles
    const { data: createdProfile } = await supabaseAdmin
      .from('provider_profiles')
      .upsert({
        provider_id: auth.user.id,
        role: role === 'trainer' ? 'fitness_coach' : role,
        full_name: role === 'doctor' ? `Dr. ${fullName}` : fullName,
        email: auth.user.email || profile?.email || null,
        status: 'active',
      })
      .select()
      .maybeSingle()

    providerProfile = createdProfile || {
      provider_id: auth.user.id,
      provider_profile_id: auth.user.id,
      full_name: fullName,
      specialization: null,
      qualification: null,
      status: 'active',
      profile_photo_url: null,
      email: auth.user.email || null,
      payout_amount: null,
    }
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
