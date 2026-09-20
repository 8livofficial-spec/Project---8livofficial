import { NextResponse } from 'next/server'
import { APP_CONFIG } from '@/lib/appConfig'
import {
  checkRateLimit,
  createSupabasePasswordClient,
  getClientIp,
  getUserRole,
  isValidEmail,
  normalizeEmail,
  writeAuthAudit,
  rateLimitResponse,
  findUserByEmail,
} from '@/lib/authSecurity'
import { loadPatientJourneyState } from '@/lib/patientJourneyServer'
import { getPatientJourneyTarget } from '@/lib/patientJourney'

export async function POST(request: Request) {
  const ip = getClientIp(request)
  const userAgent = request.headers.get('user-agent')
  let email = ''

  try {
    const body = await request.json()
    email = normalizeEmail(body.email)
    const password = String(body.password || '')

    const rate = checkRateLimit(`login:${ip}:${email}`, APP_CONFIG.rateLimits.login)
    if (!rate.allowed) return rateLimitResponse(rate.retryAfter || 60, rate.message)
    if (!isValidEmail(email) || !password) {
      return NextResponse.json({ error: 'Enter a valid email and password.' }, { status: 400 })
    }

    const authClient = createSupabasePasswordClient()
    const { data, error } = await authClient.auth.signInWithPassword({ email, password })

    if (error) {
      const msg = error.message.toLowerCase()
      if (msg.includes('invalid api key') || msg.includes('api key') || msg.includes('project not found')) {
        writeAuthAudit({ email, event: 'LOGIN_CONFIG_ERROR', status: 'FAILED', ip, userAgent, metadata: { error: error.message } })
        return NextResponse.json({ error: 'Authentication service is not configured correctly.' }, { status: 500 })
      }
      if (msg.includes('confirm') || msg.includes('verify')) {
        return NextResponse.json({ error: 'Please verify your email before signing in.', code: 'EMAIL_NOT_VERIFIED' }, { status: 403 })
      }

      const user = await findUserByEmail(email)
      if (user && !user.email_confirmed_at && !user.confirmed_at) {
        writeAuthAudit({ userId: user.id, email, event: 'LOGIN_UNVERIFIED_EMAIL', status: 'FAILED', ip, userAgent })
        return NextResponse.json({ error: 'Please verify your email before signing in.', code: 'EMAIL_NOT_VERIFIED' }, { status: 403 })
      }

      if (user?.user_metadata?.reset_token_hash) {
        writeAuthAudit({ userId: user.id, email, event: 'LOGIN_PASSWORD_RESET_REQUIRED', status: 'FAILED', ip, userAgent })
        return NextResponse.json({
          error: 'Please set your password using the invitation or password reset link before signing in.',
          code: 'RESET_PASSWORD_REQUIRED',
        }, { status: 403 })
      }

      writeAuthAudit({ email, event: 'LOGIN', status: 'FAILED', ip, userAgent, metadata: { error: error.message } })
      return NextResponse.json({ error: 'Invalid email or password.' }, { status: 401 })
    }

    if (!data.user || !data.session) {
      writeAuthAudit({ email, event: 'LOGIN', status: 'FAILED', ip, userAgent })
      return NextResponse.json({ error: 'Invalid email or password.' }, { status: 401 })
    }

    if (!data.user.email_confirmed_at) {
      writeAuthAudit({ userId: data.user.id, email, event: 'LOGIN_UNVERIFIED_EMAIL', status: 'FAILED', ip, userAgent })
      return NextResponse.json({ error: 'Please verify your email before signing in.', code: 'EMAIL_NOT_VERIFIED' }, { status: 403 })
    }

    // Fast-path role resolution leveraging user_metadata (0ms DB cost when present)
    const role = await getUserRole(data.user.id, data.user.email, data.user.user_metadata)
    writeAuthAudit({ userId: data.user.id, email, event: 'LOGIN', status: 'SUCCESS', ip, userAgent, metadata: { role } })

    // Resolve target directly on server to avoid redundant client-side status roundtrips
    let target = '/patient'
    if (role === 'admin') {
      target = '/admin'
    } else if (role === 'doctor') {
      target = '/doctor/dashboard'
    } else if (role === 'dietitian' || role === 'trainer' || role === 'fitness_coach' || role === 'nutritionist') {
      target = '/provider/dashboard'
    } else if (['PHARMACY', 'PHARMACY_ADMIN', 'PHARMACY_STAFF', 'DELIVERY_PARTNER', 'PHARMACIST'].includes(String(role).toUpperCase())) {
      target = '/pharmacy'
    } else {
      try {
        const journeyState = await loadPatientJourneyState(data.user.id)
        if (journeyState) {
          target = getPatientJourneyTarget(journeyState)
        }
      } catch (err) {
        console.warn('[Login] Error loading journey state for target:', err)
      }
    }

    return NextResponse.json({
      success: true,
      role,
      target,
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
    writeAuthAudit({ email, event: 'LOGIN', status: 'FAILED', ip, userAgent, metadata: { error: message } })
    return NextResponse.json({ error: 'Login failed. Please try again.' }, { status: 500 })
  }
}

