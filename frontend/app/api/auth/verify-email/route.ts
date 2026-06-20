import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseServer'
import { createToken, hashToken, writeAuthAudit } from '@/lib/authSecurity'
import { EmailService } from '@/lib/emailService'

export async function POST(request: Request) {
  try {
    const { token } = await request.json()
    if (!token) return NextResponse.json({ error: 'Verification token is required.' }, { status: 400 })

    const tokenHash = hashToken(String(token))
    const { data: record, error } = await supabaseAdmin
      .from('email_verification_tokens')
      .select('*')
      .eq('token_hash', tokenHash)
      .maybeSingle()

    if (error || !record) {
      return NextResponse.json({ error: 'Invalid or expired verification link.' }, { status: 400 })
    }

    if (new Date(record.expires_at).getTime() < Date.now()) {
      return NextResponse.json({ error: 'Verification link has expired.' }, { status: 400 })
    }

    // A verification request may be repeated by React development checks,
    // browser retries, or email-link scanners. Patient verification is safe
    // to treat as idempotent once the token has already been consumed.
    if (record.used_at) {
      if (record.purpose === 'EMAIL_VERIFICATION') {
        return NextResponse.json({ success: true, nextPath: '/login' })
      }
      return NextResponse.json({ error: 'This invitation link has already been used.' }, { status: 400 })
    }

    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(record.user_id, {
      email_confirm: true,
    })
    if (updateError) return NextResponse.json({ error: updateError.message }, { status: 400 })

    const { error: consumeError } = await supabaseAdmin
      .from('email_verification_tokens')
      .update({ used_at: new Date().toISOString() })
      .eq('id', record.id)

    if (consumeError) {
      return NextResponse.json({ error: 'Unable to complete email verification.' }, { status: 500 })
    }

    await writeAuthAudit({ userId: record.user_id, email: record.email, event: 'EMAIL_VERIFIED', status: 'SUCCESS' })

    let nextPath = '/login'
    if (record.purpose === 'PROVIDER_INVITATION') {
      const { token: resetToken, tokenHash: resetTokenHash } = createToken()
      await supabaseAdmin.from('password_reset_tokens').insert({
        user_id: record.user_id,
        email: record.email,
        token_hash: resetTokenHash,
        expires_at: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
      })
      nextPath = `/reset-password?token=${encodeURIComponent(resetToken)}`
    }

    try {
      await EmailService.sendWelcomeEmail({
        email: record.email,
        patientId: record.user_id,
        name: record.email.split('@')[0],
      })
    } catch (emailError) {
      console.error('Welcome email after verification failed:', emailError)
    }

    return NextResponse.json({ success: true, nextPath })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to verify email.'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
