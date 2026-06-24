import { NextResponse } from 'next/server'
import { EmailService } from '@/lib/emailService'
import { supabaseAdmin } from '@/lib/supabaseServer'
import { APP_CONFIG } from '@/lib/appConfig'
import {
  checkRateLimit,
  createToken,
  findUserByEmail,
  getClientIp,
  getOrigin,
  isValidEmail,
  normalizeEmail,
  writeAuthAudit,
  rateLimitResponse,
} from '@/lib/authSecurity'

export async function POST(request: Request) {
  const ip = getClientIp(request)
  const userAgent = request.headers.get('user-agent')
  const genericMessage = 'If an unverified account exists, a verification email has been sent.'

  try {
    const { email: rawEmail } = await request.json()
    const email = normalizeEmail(rawEmail)
    const rate = checkRateLimit(`resend-verification:${ip}:${email}`, APP_CONFIG.rateLimits.forgotPassword)
    if (!rate.allowed) return rateLimitResponse(rate.retryAfter || 60, rate.message)
    if (!isValidEmail(email)) return NextResponse.json({ message: genericMessage })

    const user = await findUserByEmail(email)
    if (!user || user.email_confirmed_at) return NextResponse.json({ message: genericMessage })

    const { token, tokenHash } = createToken()
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
    const currentMetadata = user.user_metadata || {}

    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(user.id, {
      user_metadata: {
        ...currentMetadata,
        verification_token_hash: tokenHash,
        verification_expires_at: expiresAt,
        verification_purpose: 'EMAIL_VERIFICATION',
      }
    })

    if (updateError) throw updateError

    await EmailService.sendEmailVerification({
      email,
      patientId: user.id,
      name: email.split('@')[0],
      link: `${getOrigin(request)}/verify-email?token=${encodeURIComponent(token)}&email=${encodeURIComponent(email)}`,
    })

    await writeAuthAudit({ userId: user.id, email, event: 'EMAIL_VERIFICATION_RESENT', status: 'SUCCESS', ip, userAgent })
    return NextResponse.json({ message: genericMessage })
  } catch (error) {
    console.error('Resend verification failed:', error)
    return NextResponse.json({ message: genericMessage })
  }
}
