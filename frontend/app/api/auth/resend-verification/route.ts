import { NextResponse } from 'next/server'
import { EmailService } from '@/lib/emailService'
import { supabaseAdmin } from '@/lib/supabaseServer'
import {
  checkRateLimit,
  createToken,
  findUserByEmail,
  getClientIp,
  getOrigin,
  isValidEmail,
  normalizeEmail,
  writeAuthAudit,
} from '@/lib/authSecurity'

export async function POST(request: Request) {
  const ip = getClientIp(request)
  const userAgent = request.headers.get('user-agent')
  const genericMessage = 'If an unverified account exists, a verification email has been sent.'

  try {
    const { email: rawEmail } = await request.json()
    const email = normalizeEmail(rawEmail)
    const rate = checkRateLimit(`resend-verification:${ip}:${email}`, { limit: 4, windowMs: 15 * 60 * 1000 })
    if (!rate.allowed) return NextResponse.json({ error: rate.message }, { status: 429 })
    if (!isValidEmail(email)) return NextResponse.json({ message: genericMessage })

    const user = await findUserByEmail(email)
    if (!user || user.email_confirmed_at) return NextResponse.json({ message: genericMessage })

    const { token, tokenHash } = createToken()
    const { error: tokenError } = await supabaseAdmin.from('email_verification_tokens').insert({
      user_id: user.id,
      email,
      token_hash: tokenHash,
      purpose: 'EMAIL_VERIFICATION',
      expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    })

    if (tokenError) throw tokenError

    await EmailService.sendEmailVerification({
      email,
      patientId: user.id,
      name: email.split('@')[0],
      link: `${getOrigin(request)}/verify-email?token=${encodeURIComponent(token)}`,
    })

    await writeAuthAudit({ userId: user.id, email, event: 'EMAIL_VERIFICATION_RESENT', status: 'SUCCESS', ip, userAgent })
    return NextResponse.json({ message: genericMessage })
  } catch (error) {
    console.error('Resend verification failed:', error)
    return NextResponse.json({ message: genericMessage })
  }
}
