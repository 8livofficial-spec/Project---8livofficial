import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseServer'
import { APP_CONFIG } from '@/lib/appConfig'
import {
  checkRateLimit,
  getClientIp,
  hashToken,
  validatePasswordStrength,
  writeAuthAudit,
  rateLimitResponse,
  findUserByEmail,
} from '@/lib/authSecurity'

export async function POST(req: Request) {
  const ip = getClientIp(req)
  const userAgent = req.headers.get('user-agent')
  try {
    const { token: rawToken, newPassword, email } = await req.json()
    const token = String(rawToken || '').trim()
    if (!token || !newPassword) {
      return NextResponse.json({ error: 'Missing reset token or password.' }, { status: 400 })
    }

    const rate = checkRateLimit(`reset-password:${ip}`, APP_CONFIG.rateLimits.forgotPassword)
    if (!rate.allowed) return rateLimitResponse(rate.retryAfter || 60, rate.message)

    const passwordError = validatePasswordStrength(newPassword)
    if (passwordError) return NextResponse.json({ error: passwordError }, { status: 400 })

    const tokenHash = hashToken(token)
    let user;

    if (email) {
      user = await findUserByEmail(email)
    }

    if (!user) {
      // Fallback: search all users for the matching reset_token_hash in their metadata
      const { data: usersData, error: listError } = await supabaseAdmin.auth.admin.listUsers()
      if (!listError && usersData?.users) {
        user = usersData.users.find(u => u.user_metadata?.reset_token_hash === tokenHash)
      }
    }

    if (!user) {
      await writeAuthAudit({
        event: 'PASSWORD_RESET_INVALID_TOKEN',
        status: 'FAILED',
        ip,
        userAgent,
        metadata: {
          hasToken: Boolean(token),
          tokenLength: token.length,
        },
      })
      return NextResponse.json({ error: 'Invalid or expired reset link.' }, { status: 400 })
    }

    const metadata = user.user_metadata || {}
    const storedHash = metadata.reset_token_hash
    const expiresAt = metadata.reset_expires_at

    if (!storedHash || storedHash !== tokenHash || new Date(expiresAt).getTime() < Date.now()) {
      await writeAuthAudit({
        userId: user.id,
        email: user.email,
        event: 'PASSWORD_RESET_INVALID_TOKEN',
        status: 'FAILED',
        ip,
        userAgent,
      })
      return NextResponse.json({ error: 'Invalid or expired reset link.' }, { status: 400 })
    }

    const updatedMetadata = {
      ...metadata,
      reset_token_hash: null,
      reset_expires_at: null,
    }

    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(user.id, {
      password: newPassword,
      user_metadata: updatedMetadata,
    })
    if (updateError) {
      await writeAuthAudit({
        userId: user.id,
        email: user.email,
        event: 'PASSWORD_RESET_UPDATE_FAILED',
        status: 'FAILED',
        ip,
        userAgent,
        metadata: { error: updateError.message },
      })
      return NextResponse.json({ error: updateError.message }, { status: 400 })
    }

    await writeAuthAudit({
      userId: user.id,
      email: user.email,
      event: 'PASSWORD_RESET_COMPLETED',
      status: 'SUCCESS',
      ip,
      userAgent,
    })

    return NextResponse.json({ message: 'Password updated successfully.' })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'An unexpected error occurred.'
    console.error('Reset password error:', err)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
