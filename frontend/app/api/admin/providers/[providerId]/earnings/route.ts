import { NextResponse } from 'next/server'
import { assertProviderPlatformAdmin } from '@/lib/providerPlatform/auth'
import { ProviderFinanceService } from '@/lib/providerPlatform/services'
import { toSafeError } from '@/lib/providerPlatform/errors'

export async function GET(request: Request, { params }: { params: Promise<{ providerId: string }> }) {
  try {
    await assertProviderPlatformAdmin(request)
    const { providerId } = await params
    const result = await ProviderFinanceService.getProviderWallet(providerId)
    return NextResponse.json({ earnings: result.earnings, wallet: result.wallet })
  } catch (error) {
    const safe = toSafeError(error)
    return NextResponse.json(safe.body, { status: safe.status })
  }
}
