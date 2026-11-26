import { NextResponse } from 'next/server'
import { getAuthenticatedUser } from '@/lib/apiSecurity'
import { listUserCoachingSessions } from '@/lib/coachingSessionService'

export async function GET(request: Request) {
  try {
    const auth = await getAuthenticatedUser(request)
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const result = await listUserCoachingSessions(auth.user.id)
    return NextResponse.json(result, {
      headers: {
        'Cache-Control': 'private, no-store, max-age=0, must-revalidate',
      },
    })
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || 'Failed to load coaching sessions.' },
      { status: 500 }
    )
  }
}
