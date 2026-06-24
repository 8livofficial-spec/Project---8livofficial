import { NextResponse } from 'next/server'
import { EmailService } from '@/lib/emailService'
import { supabaseAdmin } from '@/lib/supabaseServer'
import { updatePatientJourneyState } from '@/lib/patientJourneyServer'
import { APP_CONFIG } from '@/lib/appConfig'
import {
  checkRateLimit,
  createToken,
  getClientIp,
  getOrigin,
  isValidEmail,
  normalizeEmail,
  validatePasswordStrength,
  writeAuthAudit,
  findUserByEmail,
  rateLimitResponse,
} from '@/lib/authSecurity'

export async function POST(request: Request) {
  const ip = getClientIp(request)
  const userAgent = request.headers.get('user-agent')
  try {
    const body = await request.json()
    const email = normalizeEmail(body.email)
    const password = String(body.password || '')
    const firstName = String(body.firstName || '').trim()
    const lastName = String(body.lastName || '').trim()
    const role = 'patient'

    const rate = checkRateLimit(`signup:${ip}:${email}`, APP_CONFIG.rateLimits.signup)
    if (!rate.allowed) return rateLimitResponse(rate.retryAfter || 60, rate.message)
    if (!isValidEmail(email)) return NextResponse.json({ error: 'Enter a valid email address.' }, { status: 400 })
    const passwordError = validatePasswordStrength(password)
    if (passwordError) return NextResponse.json({ error: passwordError }, { status: 400 })

    const existing = await findUserByEmail(email)
    if (existing) {
      if (!existing.email_confirmed_at && !existing.confirmed_at) {
        // Delete the existing unverified user to allow recreation
        await supabaseAdmin.auth.admin.deleteUser(existing.id)
        await supabaseAdmin.from('profiles').delete().eq('id', existing.id)
        await supabaseAdmin.from('patient_journey_state').delete().eq('patient_id', existing.id)
      } else {
        await writeAuthAudit({ email, event: 'SIGNUP_DUPLICATE_EMAIL', status: 'FAILED', ip, userAgent })
        return NextResponse.json({ error: 'An account with this email already exists.' }, { status: 409 })
      }
    }

    const { token, tokenHash } = createToken()
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()

    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: false,
      user_metadata: {
        role: role.toUpperCase(),
        display_id: `${firstName} ${lastName}`.trim(),
        verification_token_hash: tokenHash,
        verification_expires_at: expiresAt,
        verification_purpose: 'EMAIL_VERIFICATION',
      },
    })
    if (error || !data.user) {
      await writeAuthAudit({ email, event: 'SIGNUP', status: 'FAILED', ip, userAgent, metadata: { error: error?.message } })
      return NextResponse.json({ error: error?.message || 'Unable to create account.' }, { status: 400 })
    }

    await supabaseAdmin.from('profiles').upsert({
      id: data.user.id,
      email,
      role,
      first_name: firstName,
      last_name: lastName,
      display_id: `${firstName} ${lastName}`.trim(),
    })

    await updatePatientJourneyState(data.user.id, {
      assessmentStatus: 'IN_PROGRESS',
      assessmentProgress: 1,
      eligibilityStatus: 'NOT_STARTED',
      consultationPaymentStatus: 'NOT_PAID',
      appointmentStatus: 'NOT_BOOKED',
      consultationStatus: 'PENDING',
      membershipStatus: 'NOT_SELECTED',
      dashboardAccess: false,
      lastCompletedStep: 'ACCOUNT_CREATED',
    })

    const link = `${getOrigin(request)}/verify-email?token=${encodeURIComponent(token)}&email=${encodeURIComponent(email)}`
    await EmailService.sendEmailVerification({
      email,
      name: `${firstName} ${lastName}`.trim() || email.split('@')[0],
      patientId: data.user.id,
      link,
    })

    await writeAuthAudit({ userId: data.user.id, email, event: 'SIGNUP', status: 'SUCCESS', ip, userAgent })

    return NextResponse.json({ success: true, userId: data.user.id, message: 'Verification email sent.' })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to create account.'
    await writeAuthAudit({ event: 'SIGNUP', status: 'FAILED', ip, userAgent, metadata: { error: message } })
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
