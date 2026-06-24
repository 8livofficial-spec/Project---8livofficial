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

export async function POST(req: Request) {
  const ip = getClientIp(req)
  const userAgent = req.headers.get('user-agent')
  const genericMessage = 'If an account exists, a password reset link has been sent.'

  try {
    const { email: rawEmail } = await req.json()
    const email = normalizeEmail(rawEmail)
    const rate = checkRateLimit(`forgot-password:${ip}:${email}`, APP_CONFIG.rateLimits.forgotPassword)
    if (!rate.allowed) return rateLimitResponse(rate.retryAfter || 60, rate.message)

    if (!isValidEmail(email)) return NextResponse.json({ message: genericMessage })

    const user = await findUserByEmail(email)
    if (!user) {
      await writeAuthAudit({ email, event: 'PASSWORD_RESET_REQUEST_UNKNOWN_EMAIL', status: 'FAILED', ip, userAgent })
      return NextResponse.json({ message: genericMessage })
    }

    const { token, tokenHash } = createToken()
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000).toISOString()
    const currentMetadata = user.user_metadata || {}

    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(user.id, {
      user_metadata: {
        ...currentMetadata,
        reset_token_hash: tokenHash,
        reset_expires_at: expiresAt,
      }
    })

    if (updateError) {
      console.error('Failed to create password reset token:', updateError)
      await writeAuthAudit({
        userId: user.id,
        email,
        event: 'PASSWORD_RESET_TOKEN_CREATE_FAILED',
        status: 'FAILED',
        ip,
        userAgent,
        metadata: { error: updateError.message },
      })
      return NextResponse.json({ message: genericMessage })
    }

    const link = `${getOrigin(req)}/reset-password?token=${encodeURIComponent(token)}&email=${encodeURIComponent(email)}`
    await EmailService.sendForgotPassword({
      email,
      name: user.user_metadata?.display_id || email.split('@')[0],
      patientId: user.id,
      link,
    })

    await writeAuthAudit({ userId: user.id, email, event: 'PASSWORD_RESET_REQUESTED', status: 'SUCCESS', ip, userAgent })
    return NextResponse.json({ message: genericMessage })
  } catch (err) {
    console.error('Forgot password error:', err)
    return NextResponse.json({ message: genericMessage })
  }
}
