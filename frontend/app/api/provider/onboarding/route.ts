import { NextResponse } from 'next/server'
import { assertProviderPlatformProvider } from '@/lib/providerPlatform/auth'
import { ProviderOnboardingService } from '@/lib/providerPlatform/services'
import { toSafeError } from '@/lib/providerPlatform/errors'

export async function GET(request: Request) {
  try {
    const auth = await assertProviderPlatformProvider(request)
    const onboarding = await ProviderOnboardingService.get(auth.provider.id)
    return NextResponse.json(onboarding)
  } catch (error) {
    const safe = toSafeError(error)
    return NextResponse.json(safe.body, { status: safe.status })
  }
}
