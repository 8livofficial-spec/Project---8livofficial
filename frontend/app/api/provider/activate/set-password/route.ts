import { NextResponse } from 'next/server'
import { ProviderActivationService } from '@/lib/providerPlatform/services'
import { toSafeError } from '@/lib/providerPlatform/errors'

export async function POST(request: Request) {
  try {
    const result = await ProviderActivationService.setPassword(await request.json(), request)
    return NextResponse.json(result)
  } catch (error) {
    const safe = toSafeError(error)
    return NextResponse.json(safe.body, { status: safe.status })
  }
}
