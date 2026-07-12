import { NextResponse } from 'next/server'
import { assertProviderPlatformAdmin, requireStepUpAuth } from '@/lib/providerPlatform/auth'
import { ProviderVerificationService } from '@/lib/providerPlatform/services'
import { toSafeError } from '@/lib/providerPlatform/errors'

export async function POST(request: Request, { params }: { params: Promise<{ providerId: string }> }) {
  try {
    const admin = await assertProviderPlatformAdmin(request)
    requireStepUpAuth(request, admin.user.id)
    const { providerId } = await params
    const result = await ProviderVerificationService.approvePayout(providerId, request, admin.user.id)
    return NextResponse.json(result)
  } catch (error) {
    const safe = toSafeError(error)
    return NextResponse.json(safe.body, { status: safe.status })
  }
}
