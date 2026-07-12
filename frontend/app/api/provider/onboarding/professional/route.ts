import { NextResponse } from 'next/server'
import { assertProviderPlatformProvider } from '@/lib/providerPlatform/auth'
import { ProviderOnboardingService } from '@/lib/providerPlatform/services'
import { toSafeError } from '@/lib/providerPlatform/errors'

export async function PATCH(request: Request) {
  try {
    const auth = await assertProviderPlatformProvider(request)
    const result = await ProviderOnboardingService.saveProfessional(auth.provider.id, auth.provider.role, await request.json(), request, auth.user.id)
    return NextResponse.json(result)
  } catch (error) {
    const safe = toSafeError(error)
    return NextResponse.json(safe.body, { status: safe.status })
  }
}
