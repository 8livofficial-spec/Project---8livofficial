import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseServer'
import { createToken, hashToken, writeAuthAudit, findUserByEmail } from '@/lib/authSecurity'
import { EmailService } from '@/lib/emailService'

export async function POST(request: Request) {
  try {
    const { token, email } = await request.json()
    if (!token) return NextResponse.json({ error: 'Verification token is required.' }, { status: 400 })

    const tokenHash = hashToken(String(token))
    let user;

    if (email) {
      user = await findUserByEmail(email)
    }

    if (!user) {
      // Fallback: search all users for the matching verification_token_hash in their metadata
      const { data: usersData, error: listError } = await supabaseAdmin.auth.admin.listUsers()
      if (!listError && usersData?.users) {
        user = usersData.users.find(u => u.user_metadata?.verification_token_hash === tokenHash)
      }
    }

    if (!user) {
      return NextResponse.json({ error: 'Invalid or expired verification link.' }, { status: 400 })
    }

    const metadata = user.user_metadata || {}
    const storedHash = metadata.verification_token_hash
    const expiresAt = metadata.verification_expires_at
    const purpose = metadata.verification_purpose || 'EMAIL_VERIFICATION'

    if (user.email_confirmed_at || user.confirmed_at) {
      if (purpose === 'EMAIL_VERIFICATION') {
        return NextResponse.json({ success: true, nextPath: '/login' })
      }
      return NextResponse.json({ error: 'This invitation link has already been used.' }, { status: 400 })
    }

    if (!storedHash || storedHash !== tokenHash) {
      return NextResponse.json({ error: 'Invalid or expired verification link.' }, { status: 400 })
    }

    if (new Date(expiresAt).getTime() < Date.now()) {
      return NextResponse.json({ error: 'Verification link has expired.' }, { status: 400 })
    }

    // Set email_confirm: true, and clear verification token from user_metadata
    const updatedMetadata: Record<string, any> = {
      ...metadata,
      verification_token_hash: null,
      verification_expires_at: null,
      verification_purpose: null,
    }

    // If it's a provider invitation, we need to generate a reset password token and store it in user_metadata too
    let nextPath = '/login'
    if (purpose === 'PROVIDER_INVITATION') {
      const { token: resetToken, tokenHash: resetTokenHash } = createToken()
      updatedMetadata.reset_token_hash = resetTokenHash
      updatedMetadata.reset_expires_at = new Date(Date.now() + 30 * 60 * 1000).toISOString()
      nextPath = `/reset-password?token=${encodeURIComponent(resetToken)}&email=${encodeURIComponent(user.email || '')}`
    }

    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(user.id, {
      email_confirm: true,
      user_metadata: updatedMetadata,
    })
    if (updateError) return NextResponse.json({ error: updateError.message }, { status: 400 })

    await writeAuthAudit({ userId: user.id, email: user.email, event: 'EMAIL_VERIFIED', status: 'SUCCESS' })

    try {
      await EmailService.sendWelcomeEmail({
        email: user.email || '',
        patientId: user.id,
        name: (user.email || '').split('@')[0],
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
