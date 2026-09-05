import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseServer'
import { assertAdmin, errorResponse } from '@/lib/fulfilmentAuth'
import { createToken, getOrigin, checkRateLimit } from '@/lib/authSecurity'
import { audit } from '@/lib/prescriptionService'
import { emitNotificationEvent } from '@/lib/notificationDispatcher'

type RouteContext = { params: Promise<{ id: string }> }

export async function POST(request: Request, context: RouteContext) {
  try {
    const admin = await assertAdmin(request)
    const { id } = await context.params

    const rate = checkRateLimit(`resend:${admin.user.id}:${id}`, { limit: 5, windowMs: 60_000 })
    if (!rate.allowed) {
      return NextResponse.json({ error: rate.message }, { status: 429 })
    }

    const { data: invitation, error: findError } = await supabaseAdmin
      .from('pharmacy_invitations')
      .select('*')
      .eq('id', id)
      .maybeSingle()

    if (findError) throw findError
    if (!invitation) {
      return NextResponse.json({ error: 'Pharmacy invitation not found.' }, { status: 404 })
    }

    if (invitation.status === 'ACCEPTED') {
      return NextResponse.json(
        { error: 'Cannot resend an invitation that has already been accepted.' },
        { status: 400 }
      )
    }

    // Invalidate old token and generate brand new token & hash
    const { token, tokenHash } = createToken()
    const newExpiresAt = new Date(Date.now() + 48 * 3600 * 1000).toISOString()

    const { data: updated, error: updateError } = await supabaseAdmin
      .from('pharmacy_invitations')
      .update({
        token_hash: tokenHash,
        expires_at: newExpiresAt,
        status: 'INVITED',
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select('id, pharmacy_name, email, status, expires_at')
      .single()

    if (updateError) throw updateError

    // Construct fresh invitation link with new token
    const baseUrl = getOrigin(request)
    const inviteUrl = `${baseUrl}/pharmacy/accept-invitation?token=${token}`

    // Send new email
    emitNotificationEvent({
      eventType: 'PHARMACY_INVITATION_SENT',
      entityType: 'pharmacy_invitation',
      entityId: id,
      recipientEmail: invitation.email,
      recipientRole: 'pharmacy',
      subject: `Resent Invitation: Join 8LIV Partner Pharmacy Network — ${invitation.pharmacy_name}`,
      messageContent: `Hello,\n\nYour invitation to join the 8LIV Partner Pharmacy Network as ${invitation.pharmacy_name} has been refreshed.\n\nPlease click the button below to accept your invitation, create your pharmacist login password, and submit your regulatory details.`,
      actionUrl: inviteUrl,
      actionLabel: 'Accept Invitation & Set Password →',
    }).catch((err) => {
      console.warn('[resend-invite] Notification error:', err?.message)
    })

    // Audit log (NEVER log raw token)
    await audit({
      actorId: admin.user.id,
      actorRole: 'admin',
      action: 'PHARMACY_INVITATION_RESENT',
      newValues: { invitation_id: id, pharmacy_name: invitation.pharmacy_name, email: invitation.email, expires_at: newExpiresAt },
      request,
    })

    return NextResponse.json({ success: true, invitation: updated })
  } catch (err) {
    const failure = errorResponse(err instanceof Error ? err.message : 'Internal Server Error')
    return NextResponse.json({ error: failure.error }, { status: failure.status })
  }
}
