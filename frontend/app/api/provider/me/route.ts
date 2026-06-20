import { NextResponse } from 'next/server'
import { getAuthenticatedProvider } from '@/lib/providerServer'

export async function GET(request: Request) {
  const provider = await getAuthenticatedProvider(request)
  if ('error' in provider) {
    return NextResponse.json({ error: provider.error }, { status: provider.status })
  }

  const profileName = `${provider.profile?.first_name || ''} ${provider.profile?.last_name || ''}`.trim()
  return NextResponse.json({
    provider: {
      id: provider.user.id,
      email: provider.user.email,
      role: provider.role,
      name: provider.providerProfile?.full_name || profileName || provider.user.email,
      specialization: provider.providerProfile?.specialization || null,
      qualification: provider.providerProfile?.qualification || null,
      status: provider.providerProfile?.status || 'active',
      photoUrl: provider.providerProfile?.profile_photo_url || null,
    },
  })
}
