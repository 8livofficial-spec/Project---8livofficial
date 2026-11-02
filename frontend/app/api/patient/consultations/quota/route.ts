import { NextResponse } from 'next/server'
import { getAuthenticatedUser } from '@/lib/apiSecurity'
import { getPatientConsultationSummary } from '@/lib/subscriptionService'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  try {
    const auth = await getAuthenticatedUser(request)
    if (!auth?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const summary = await getPatientConsultationSummary(auth.user.id)

    return NextResponse.json(
      { success: true, ...summary },
      {
        headers: {
          'Cache-Control': 'private, no-cache, no-store, max-age=0',
        },
      }
    )
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal Server Error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
