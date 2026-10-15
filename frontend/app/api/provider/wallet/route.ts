import { NextResponse } from 'next/server'
import { getAuthenticatedProvider } from '@/lib/providerServer'
import { serverCache, jsonWithETag } from '@/lib/serverCache'
import { getUnifiedProviderWallet } from '@/lib/providerWalletService'

export async function GET(request: Request) {
  try {
    const provider = await getAuthenticatedProvider(request)
    if ('error' in provider) {
      return NextResponse.json({ error: provider.error }, { status: provider.status })
    }

    const userId = provider.user.id
    const profileId = provider.profile?.id || userId

    const { value: walletPayload, etag } = await serverCache.getOrSet(
      `wallet:${userId}`,
      async () => {
        return await getUnifiedProviderWallet(userId, profileId)
      },
      30000,
      [`wallet:${userId}`]
    )

    return jsonWithETag(walletPayload, etag, request, { maxAgeSec: 15 })
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Unable to load wallet.' }, { status: 500 })
  }
}
