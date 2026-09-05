import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseServer'
import { assertAdmin, errorResponse } from '@/lib/fulfilmentAuth'
import { createToken, isValidEmail, normalizeEmail, getOrigin, checkRateLimit } from '@/lib/authSecurity'
import { audit } from '@/lib/prescriptionService'
import { emitNotificationEvent } from '@/lib/notificationDispatcher'

export async function GET(request: Request) {
  try {
    await assertAdmin(request)

    const { data: invitations, error } = await supabaseAdmin
      .from('pharmacy_invitations')
      .select('id, pharmacy_name, email, phone, status, expires_at, accepted_at, created_at, updated_at')
      .order('created_at', { ascending: false })

    if (error) {
      console.warn('[pharmacy/invite] invitations table query warning:', error.message)
      return NextResponse.json({ invitations: [] })
    }

    return NextResponse.json({ invitations: invitations || [] })
  } catch (err) {
    console.warn('[pharmacy/invite] unexpected error:', err)
    return NextResponse.json({ invitations: [] })
  }
}

export async function POST(request: Request) {
  try {
    const admin = await assertAdmin(request)

    const rate = checkRateLimit(`invite:${admin.user.id}`, { limit: 20, windowMs: 60_000 })
    if (!rate.allowed) {
      return NextResponse.json({ error: rate.message }, { status: 429 })
    }

    const body = await request.json().catch(() => ({}))
    const pharmacyName = String(body.pharmacy_name || body.pharmacyName || '').trim()
    const email = normalizeEmail(body.email)
    const phone = body.phone ? String(body.phone).trim() : null

    if (!pharmacyName || pharmacyName.length < 2) {
      return NextResponse.json({ error: 'Valid pharmacy name is required.' }, { status: 400 })
    }

    if (!email || !isValidEmail(email)) {
      return NextResponse.json({ error: 'Valid email address is required.' }, { status: 400 })
    }

    // Check if an active invitation already exists for this email
    const { data: existingActive } = await supabaseAdmin
      .from('pharmacy_invitations')
      .select('id, status, expires_at')
      .eq('email', email)
      .eq('status', 'INVITED')
      .gt('expires_at', new Date().toISOString())
      .maybeSingle()

    if (existingActive) {
      return NextResponse.json(
        { error: 'An active invitation has already been sent to this email. You can resend or cancel it.' },
        { status: 409 }
      )
    }

    // Generate secure token and store ONLY token hash
    const { token, tokenHash } = createToken()
    const expiresAt = new Date(Date.now() + 48 * 3600 * 1000).toISOString() // 48-hour expiration

    const { data: invitation, error: insertError } = await supabaseAdmin
      .from('pharmacy_invitations')
      .insert({
        tenant_id: '8liv',
        pharmacy_name: pharmacyName,
        email,
        phone,
        token_hash: tokenHash,
        status: 'INVITED',
        invited_by: admin.user.id,
        expires_at: expiresAt,
      })
      .select('id, pharmacy_name, email, phone, status, expires_at, created_at')
      .single()

    if (insertError) throw insertError

    // Construct invitation link with raw token (presented only in email)
    const baseUrl = getOrigin(request)
    const inviteUrl = `${baseUrl}/pharmacy/accept-invitation?token=${token}`

    // Dispatch notification
    emitNotificationEvent({
      eventType: 'PHARMACY_INVITATION_SENT',
      entityType: 'pharmacy_invitation',
      entityId: invitation.id,
      recipientEmail: email,
      recipientRole: 'pharmacy',
      subject: `Invitation to join 8LIV Partner Pharmacy Network — ${pharmacyName}`,
      messageContent: `Hello,\n\nYou have been invited by 8LIV Administrators to join the 8LIV Partner Pharmacy Fulfillment Network as ${pharmacyName}.\n\nPlease click the button below to accept your invitation, create your pharmacist login password, and submit your Form 20B/21B regulatory details.`,
      actionUrl: inviteUrl,
      actionLabel: 'Accept Invitation & Set Password →',
    }).catch((err) => {
      console.warn('[invite] Notification error:', err?.message)
    })

    // Audit log (NEVER log raw token)
    await audit({
      actorId: admin.user.id,
      actorRole: 'admin',
      action: 'PHARMACY_INVITATION_SENT',
      newValues: { invitation_id: invitation.id, pharmacy_name: pharmacyName, email, expires_at: expiresAt },
      request,
    })

    return NextResponse.json({ success: true, invitation }, { status: 201 })
  } catch (err) {
    const failure = errorResponse(err instanceof Error ? err.message : 'Internal Server Error')
    return NextResponse.json({ error: failure.error }, { status: failure.status })
  }
}
