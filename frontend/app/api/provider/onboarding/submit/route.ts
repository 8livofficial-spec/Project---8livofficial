import { NextResponse } from 'next/server'
import { assertProviderPlatformProvider } from '@/lib/providerPlatform/auth'
import { ProviderOnboardingService } from '@/lib/providerPlatform/services'
import { toSafeError } from '@/lib/providerPlatform/errors'

export async function POST(request: Request) {
  try {
    const auth = await assertProviderPlatformProvider(request)
    const result = await ProviderOnboardingService.submit(auth.provider.id, request, auth.user.id)
    return NextResponse.json(result)
  } catch (error) {
    const safe = toSafeError(error)
    return NextResponse.json(safe.body, { status: safe.status })
  }
}
