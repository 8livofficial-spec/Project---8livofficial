import { supabaseAdmin } from '@/lib/supabaseServer'
import { getAuthenticatedUser } from '@/lib/apiSecurity'
import { ProviderPlatformError } from './errors'
import { createHmac, timingSafeEqual } from 'crypto'

const providerRoles = ['doctor', 'dietitian', 'nutritionist', 'fitness_coach', 'trainer']

export async function assertProviderPlatformAdmin(request: Request) {
  const auth = await getAuthenticatedUser(request)
  if (!auth?.user?.id) throw new ProviderPlatformError('UNAUTHORIZED_PROVIDER_ACCESS', 'Unauthorized', 401)

  const role = String(auth.role || '').toLowerCase()
  if (role !== 'admin') throw new ProviderPlatformError('UNAUTHORIZED_PROVIDER_ACCESS', 'Forbidden', 403)
  return { user: auth.user, role: 'admin' }
}

export async function assertProviderPlatformFinance(request: Request) {
  const auth = await getAuthenticatedUser(request)
  if (!auth?.user?.id) throw new ProviderPlatformError('UNAUTHORIZED_PROVIDER_ACCESS', 'Unauthorized', 401)
  const role = String(auth.role || '').toLowerCase()
  if (!['admin', 'finance'].includes(role)) throw new ProviderPlatformError('UNAUTHORIZED_PROVIDER_ACCESS', 'Forbidden', 403)
  return { user: auth.user, role }
}

export async function assertProviderPlatformProvider(request: Request) {
  const auth = await getAuthenticatedUser(request)
  if (!auth?.user?.id) throw new ProviderPlatformError('UNAUTHORIZED_PROVIDER_ACCESS', 'Unauthorized', 401)
  if (!providerRoles.includes(String(auth.role || '').toLowerCase())) {
    throw new ProviderPlatformError('UNAUTHORIZED_PROVIDER_ACCESS', 'Forbidden', 403)
  }

  const { data, error } = await supabaseAdmin
    .from('provider_profiles_v2')
    .select('id, user_id, role, account_status, onboarding_status, clinical_verification_status, bank_verification_status, payout_status, payout_enabled, full_name, email, phone_number, specialization')
    .eq('user_id', auth.user.id)
    .maybeSingle()

  if (error) throw error
  if (!data) throw new ProviderPlatformError('NOT_FOUND', 'Provider onboarding profile is missing.', 404)
  if (data.account_status === 'DEACTIVATED') {
    throw new ProviderPlatformError('UNAUTHORIZED_PROVIDER_ACCESS', 'Provider account is deactivated.', 403)
  }

  return { user: auth.user, role: auth.role, provider: data }
}

export function routeForProviderState(provider: {
  account_status: string
  onboarding_status: string
}) {
  if (provider.account_status === 'INVITED') return '/provider/activate'
  if (provider.account_status === 'SUSPENDED' || provider.onboarding_status === 'SUSPENDED') return '/provider/account-suspended'
  if (provider.account_status === 'DEACTIVATED' || provider.onboarding_status === 'DEACTIVATED') return '/login'
  if (provider.onboarding_status === 'NOT_STARTED' || provider.onboarding_status === 'IN_PROGRESS' || provider.onboarding_status === 'CHANGES_REQUESTED') return '/provider/onboarding'
  if (provider.onboarding_status === 'SUBMITTED' || provider.onboarding_status === 'UNDER_REVIEW') return '/provider/verification-status'
  if (provider.onboarding_status === 'REJECTED') return '/provider/account-review'
  return null
}

export function requireProviderClinicalAccess(provider: {
  onboarding_status: string
  clinical_verification_status: string
  account_status: string
}) {
  if (provider.account_status !== 'ACTIVE' && provider.account_status !== 'LIMITED') {
    throw new ProviderPlatformError('CLINICAL_VERIFICATION_REQUIRED', 'Provider account is not active.', 403)
  }
  if (provider.onboarding_status !== 'APPROVED' || provider.clinical_verification_status !== 'APPROVED') {
    throw new ProviderPlatformError('CLINICAL_VERIFICATION_REQUIRED', 'Clinical verification is required.', 403)
  }
}

function safeEqual(a: string, b: string) {
  const left = Buffer.from(a)
  const right = Buffer.from(b)
  return left.length === right.length && timingSafeEqual(left, right)
}

export function requireStepUpAuth(request: Request, userId: string) {
  const verifiedAt = request.headers.get('x-step-up-verified-at')
  const signature = request.headers.get('x-step-up-signature')
  const secret = process.env.STEP_UP_AUTH_SHARED_SECRET

  if (!secret || !signature) {
    throw new ProviderPlatformError('STEP_UP_AUTH_REQUIRED', 'Step-up authentication is required.', 403)
  }
  if (!verifiedAt) throw new ProviderPlatformError('STEP_UP_AUTH_REQUIRED', 'Step-up authentication is required.', 403)
  const ageMs = Date.now() - Date.parse(verifiedAt)
  if (!Number.isFinite(ageMs) || ageMs < 0 || ageMs > 10 * 60 * 1000) {
    throw new ProviderPlatformError('STEP_UP_AUTH_REQUIRED', 'Step-up authentication has expired.', 403)
  }

  const expected = createHmac('sha256', secret).update(`${userId}:${verifiedAt}`).digest('base64url')
  if (!safeEqual(signature, expected)) {
    throw new ProviderPlatformError('STEP_UP_AUTH_REQUIRED', 'Step-up authentication is invalid.', 403)
  }
}
