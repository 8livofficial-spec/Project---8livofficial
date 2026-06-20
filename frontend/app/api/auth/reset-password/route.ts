import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseServer'
import {
  checkRateLimit,
  getClientIp,
  hashToken,
  validatePasswordStrength,
  writeAuthAudit,
} from '@/lib/authSecurity'

export async function POST(req: Request) {
  const ip = getClientIp(req)
  const userAgent = req.headers.get('user-agent')
  try {
    const { token: rawToken, newPassword } = await req.json()
    const token = String(rawToken || '').trim()
    if (!token || !newPassword) {
      return NextResponse.json({ error: 'Missing reset token or password.' }, { status: 400 })
    }

    const rate = checkRateLimit(`reset-password:${ip}`, { limit: 8, windowMs: 15 * 60 * 1000 })
    if (!rate.allowed) return NextResponse.json({ error: rate.message }, { status: 429 })

    const passwordError = validatePasswordStrength(newPassword)
    if (passwordError) return NextResponse.json({ error: passwordError }, { status: 400 })

    const tokenHash = hashToken(token)
    const { data: resetToken, error } = await supabaseAdmin
      .from('password_reset_tokens')
      .select('*')
      .eq('token_hash', tokenHash)
      .is('used_at', null)
      .gt('expires_at', new Date().toISOString())
      .maybeSingle()

    if (error || !resetToken) {
      await writeAuthAudit({
        event: 'PASSWORD_RESET_INVALID_TOKEN',
        status: 'FAILED',
        ip,
        userAgent,
        metadata: {
          hasToken: Boolean(token),
          tokenLength: token.length,
          error: error?.message,
        },
      })
      return NextResponse.json({ error: 'Invalid or expired reset link.' }, { status: 400 })
    }

    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(resetToken.user_id, {
      password: newPassword,
    })
    if (updateError) {
      await writeAuthAudit({
        userId: resetToken.user_id,
        email: resetToken.email,
        event: 'PASSWORD_RESET_UPDATE_FAILED',
        status: 'FAILED',
        ip,
        userAgent,
        metadata: { error: updateError.message },
      })
      return NextResponse.json({ error: updateError.message }, { status: 400 })
    }

    await supabaseAdmin
      .from('password_reset_tokens')
      .update({ used_at: new Date().toISOString() })
      .eq('id', resetToken.id)

    await writeAuthAudit({
      userId: resetToken.user_id,
      email: resetToken.email,
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
