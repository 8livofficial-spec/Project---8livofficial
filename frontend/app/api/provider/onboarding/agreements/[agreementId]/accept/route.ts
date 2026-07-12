import { NextResponse } from 'next/server'
import { assertProviderPlatformProvider } from '@/lib/providerPlatform/auth'
import { ProviderOnboardingService } from '@/lib/providerPlatform/services'
import { toSafeError } from '@/lib/providerPlatform/errors'

export async function POST(request: Request, { params }: { params: Promise<{ agreementId: string }> }) {
  try {
    const auth = await assertProviderPlatformProvider(request)
    const { agreementId } = await params
    const result = await ProviderOnboardingService.acceptAgreement(auth.provider.id, agreementId, request, auth.user.id)
    return NextResponse.json(result)
  } catch (error) {
    const safe = toSafeError(error)
    return NextResponse.json(safe.body, { status: safe.status })
  }
}
