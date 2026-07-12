import { NextResponse } from 'next/server'
import { assertProviderPlatformAdmin } from '@/lib/providerPlatform/auth'
import { ProviderCompensationService } from '@/lib/providerPlatform/services'
import { toSafeError } from '@/lib/providerPlatform/errors'

export async function POST(request: Request, { params }: { params: Promise<{ providerId: string }> }) {
  try {
    const admin = await assertProviderPlatformAdmin(request)
    const { providerId } = await params
    const result = await ProviderCompensationService.createRule(await request.json(), request, admin.user.id, providerId)
    return NextResponse.json({ rule: result })
  } catch (error) {
    const safe = toSafeError(error)
    return NextResponse.json(safe.body, { status: safe.status })
  }
}
