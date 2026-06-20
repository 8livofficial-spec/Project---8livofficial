import { NextResponse } from 'next/server'
import {
  checkRateLimit,
  createSupabasePasswordClient,
  getClientIp,
  getUserRole,
  isValidEmail,
  normalizeEmail,
  writeAuthAudit,
} from '@/lib/authSecurity'

export async function POST(request: Request) {
  const ip = getClientIp(request)
  const userAgent = request.headers.get('user-agent')
  let email = ''

  try {
    const body = await request.json()
    email = normalizeEmail(body.email)
    const password = String(body.password || '')

    const rate = checkRateLimit(`login:${ip}:${email}`, { limit: 6, windowMs: 15 * 60 * 1000, lockMs: 30 * 60 * 1000 })
    if (!rate.allowed) return NextResponse.json({ error: rate.message }, { status: 429 })
    if (!isValidEmail(email) || !password) {
      return NextResponse.json({ error: 'Enter a valid email and password.' }, { status: 400 })
    }

    const authClient = createSupabasePasswordClient()
    const { data, error } = await authClient.auth.signInWithPassword({ email, password })

    if (error || !data.user || !data.session) {
      await writeAuthAudit({ email, event: 'LOGIN', status: 'FAILED', ip, userAgent, metadata: { error: error?.message } })
      return NextResponse.json({ error: 'Invalid email or password.' }, { status: 401 })
    }

    if (!data.user.email_confirmed_at) {
      await writeAuthAudit({ userId: data.user.id, email, event: 'LOGIN_UNVERIFIED_EMAIL', status: 'FAILED', ip, userAgent })
      return NextResponse.json({ error: 'Please verify your email before signing in.', code: 'EMAIL_NOT_VERIFIED' }, { status: 403 })
    }

    const role = await getUserRole(data.user.id, data.user.email)
    await writeAuthAudit({ userId: data.user.id, email, event: 'LOGIN', status: 'SUCCESS', ip, userAgent, metadata: { role } })

    return NextResponse.json({
      success: true,
      role,
      session: {
        access_token: data.session.access_token,
        refresh_token: data.session.refresh_token,
      },
      user: {
        id: data.user.id,
        email: data.user.email,
      },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Login failed.'
    await writeAuthAudit({ email, event: 'LOGIN', status: 'FAILED', ip, userAgent, metadata: { error: message } })
    return NextResponse.json({ error: 'Login failed. Please try again.' }, { status: 500 })
  }
}
