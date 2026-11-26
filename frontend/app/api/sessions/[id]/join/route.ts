import { NextResponse } from 'next/server'
import { getAuthenticatedUser } from '@/lib/apiSecurity'
import { createSingleUseJoinToken, redeemSessionJoin } from '@/lib/coachingSessionService'

type RouteContext = { params: Promise<{ id: string }> }

export async function POST(request: Request, context: RouteContext) {
  try {
    const auth = await getAuthenticatedUser(request)
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized', code: 'UNAUTHORIZED' }, { status: 401 })
    }

    const { id } = await context.params
    const result = await createSingleUseJoinToken(id, auth.user.id)

    if (!result.ok) {
      return NextResponse.json({ error: result.message, code: result.code }, { status: result.status })
    }

    return NextResponse.json(
      {
        token: result.token,
        expiresAt: result.expiresAt,
        joinUrl: `/api/sessions/${id}/join?token=${encodeURIComponent(result.token)}`,
      },
      {
        headers: {
          'Cache-Control': 'private, no-store, max-age=0, must-revalidate',
        },
      }
    )
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || 'Failed to generate join token.', code: 'SERVER_ERROR' },
      { status: 500 }
    )
  }
}

export async function GET(request: Request, context: RouteContext) {
  const acceptHeader = request.headers.get('accept') || ''
  const wantsJson = acceptHeader.includes('application/json') && !acceptHeader.includes('text/html')
  const origin = new URL(request.url).origin

  try {
    const auth = await getAuthenticatedUser(request)
    if (!auth) {
      if (!wantsJson) {
        return NextResponse.redirect(`${origin}/login?redirect=/patient`, 302)
      }
      return NextResponse.json({ error: 'Unauthorized', code: 'UNAUTHORIZED' }, { status: 401 })
    }

    const { id } = await context.params
    const { searchParams } = new URL(request.url)
    const token = searchParams.get('token')

    const result = await redeemSessionJoin(id, auth.user.id, token)

    if (!result.ok) {
      if (!wantsJson) {
        return NextResponse.redirect(`${origin}/patient?sessionStatus=${encodeURIComponent(result.code)}`, 302)
      }
      return NextResponse.json({ error: result.message, code: result.code }, { status: result.status })
    }

    const response = NextResponse.redirect(result.meetingUrl, 302)
    response.headers.set('Cache-Control', 'private, no-store, max-age=0, must-revalidate')
    response.headers.set('Referrer-Policy', 'no-referrer')
    return response
  } catch (err: any) {
    if (!wantsJson) {
      return NextResponse.redirect(`${origin}/patient`, 302)
    }
    return NextResponse.json(
      { error: err?.message || 'Unable to join coaching session.', code: 'SERVER_ERROR' },
      { status: 500 }
    )
  }
}
