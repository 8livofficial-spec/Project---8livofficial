import { NextResponse } from 'next/server'
import { getAuthenticatedProvider } from '@/lib/providerServer'
import { supabaseAdmin } from '@/lib/supabaseServer'
import { assertProviderPlatformProvider, routeForProviderState } from '@/lib/providerPlatform/auth'
import { toSafeError } from '@/lib/providerPlatform/errors'

export async function GET(request: Request) {
  try {
    const auth = await assertProviderPlatformProvider(request)
    const provider = auth.provider
    const redirectTo = routeForProviderState(provider)

    return NextResponse.json({
      provider: {
        id: auth.user.id,
        providerProfileId: provider.id,
        email: auth.user.email,
        role: String(provider.role || '').toLowerCase(),
        name: provider.full_name || auth.user.email,
        specialization: provider.specialization || null,
        qualification: null,
        status: provider.account_status === 'ACTIVE' ? 'active' : String(provider.account_status || '').toLowerCase(),
        photoUrl: null,
        onboardingStatus: provider.onboarding_status || null,
        clinicalVerificationStatus: provider.clinical_verification_status || null,
        bankVerificationStatus: provider.bank_verification_status || null,
        payoutStatus: provider.payout_status || null,
      },
      redirectTo,
    })
  } catch (error) {
    const safe = toSafeError(error)
    if (safe.status !== 404) return NextResponse.json(safe.body, { status: safe.status })
  }

  const provider = await getAuthenticatedProvider(request)
  if ('error' in provider) {
    return NextResponse.json({ error: provider.error }, { status: provider.status })
  }

  const profileName = `${provider.profile?.first_name || ''} ${provider.profile?.last_name || ''}`.trim()
  const { data: v2Profile } = await supabaseAdmin
    .from('provider_profiles_v2')
    .select('id, onboarding_status, account_status, clinical_verification_status, bank_verification_status, payout_status')
    .eq('user_id', provider.user.id)
    .maybeSingle()
  const redirectTo = v2Profile ? routeForProviderState(v2Profile) : null

  return NextResponse.json({
    provider: {
      id: provider.user.id,
      providerProfileId: v2Profile?.id || null,
      email: provider.user.email,
      role: provider.role,
      name: provider.providerProfile?.full_name || profileName || provider.user.email,
      specialization: provider.providerProfile?.specialization || null,
      qualification: provider.providerProfile?.qualification || null,
      status: provider.providerProfile?.status || 'active',
      photoUrl: provider.providerProfile?.profile_photo_url || null,
      onboardingStatus: v2Profile?.onboarding_status || null,
      clinicalVerificationStatus: v2Profile?.clinical_verification_status || null,
      bankVerificationStatus: v2Profile?.bank_verification_status || null,
      payoutStatus: v2Profile?.payout_status || null,
    },
    redirectTo,
  })
}
