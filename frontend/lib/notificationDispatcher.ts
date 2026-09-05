import { supabaseAdmin } from './supabaseServer'
import { EmailService } from './emailService'
import { randomUUID } from 'crypto'

export type NotificationEventInput = {
  eventType: string
  entityType: string
  entityId: string
  recipientUserId?: string | null
  recipientEmail: string
  recipientRole?: 'patient' | 'doctor' | 'pharmacy' | 'admin'
  subject: string
  messageContent: string
  actionUrl?: string
  actionLabel?: string
  secondaryActionUrl?: string
  secondaryActionLabel?: string
  idempotencyKey?: string
}

export async function emitNotificationEvent(input: NotificationEventInput) {
  const idempotencyKey = input.idempotencyKey || `${input.eventType}:${input.entityId}:${input.recipientEmail}`
  const eventId = randomUUID()

  try {
    // 1. Check idempotency in notification_events
    const { data: existing } = await supabaseAdmin
      .from('notification_events')
      .select('id, status')
      .eq('idempotency_key', idempotencyKey)
      .maybeSingle()

    if (existing) {
      // Event already recorded / dispatched
      return { eventId: existing.id, status: existing.status, duplicate: true }
    }

    // 2. Insert PENDING notification event
    await supabaseAdmin
      .from('notification_events')
      .insert({
        id: eventId,
        tenant_id: '8liv',
        event_type: input.eventType,
        entity_type: input.entityType,
        entity_id: input.entityId,
        recipient_user_id: input.recipientUserId || null,
        recipient_email: input.recipientEmail,
        recipient_role: input.recipientRole || 'patient',
        subject: input.subject,
        message_content: input.messageContent,
        status: 'PENDING',
        attempt_count: 1,
        last_attempt_at: new Date().toISOString(),
        idempotency_key: idempotencyKey,
      })
  } catch (dbErr) {
    console.warn('notification_events table insert notice (continuing notification delivery):', dbErr)
  }

  // 3. Dispatch email via existing EmailService
  let sendSuccess = false
  let errorMessage: string | null = null

  try {
    const formattedBody = escapeHtml(input.messageContent)
      .replace(/\n/g, '<br/>')
      .replace(/(https?:\/\/[^\s<]+)/g, '<a href="$1" style="color: #0D9488; text-decoration: underline; font-weight: bold;">$1</a>')

    let actionButtonsHtml = ''
    if (input.actionUrl) {
      actionButtonsHtml += `
        <div style="margin: 28px 0 16px 0;">
          <a href="${escapeHtml(input.actionUrl)}" style="background: #1A1F36; color: #ffffff; padding: 14px 26px; border-radius: 12px; text-decoration: none; font-weight: 800; font-size: 14px; display: inline-block;">
            ${escapeHtml(input.actionLabel || 'Access Portal →')}
          </a>
        </div>
      `
    }
    if (input.secondaryActionUrl) {
      actionButtonsHtml += `
        <div style="margin: 14px 0 6px 0;">
          <a href="${escapeHtml(input.secondaryActionUrl)}" style="color: #C4622D; text-decoration: underline; font-weight: 700; font-size: 13px;">
            ${escapeHtml(input.secondaryActionLabel || 'Set or Reset Password →')}
          </a>
        </div>
      `
    }

    const emailResult: any = await EmailService.sendCustomEmail({
      to: input.recipientEmail,
      subject: input.subject,
      title: input.subject,
      contentHtml: `
        <div style="font-size: 15px; line-height: 1.6; color: #1A1F36;">
          ${formattedBody}
        </div>
        ${actionButtonsHtml}
        <div style="margin-top: 24px; padding-top: 16px; border-top: 1px solid #E8DED4;">
          <p style="font-size: 13px; color: #6B7A90; margin: 0;">
            Sign in to your secure 8LIV portal to view complete details, track care cycles, or manage prescriptions.
          </p>
        </div>
      `,
    })
    sendSuccess = Boolean(emailResult?.messageId || emailResult?.accepted || emailResult)
  } catch (mailErr: any) {
    errorMessage = mailErr?.message || 'SMTP delivery failed'
    console.error(`Notification email delivery failed for ${input.recipientEmail}:`, errorMessage)
  }

  // 4. Update status in notification_events
  try {
    await supabaseAdmin
      .from('notification_events')
      .update({
        status: sendSuccess ? 'SENT' : 'FAILED',
        sent_at: sendSuccess ? new Date().toISOString() : null,
        error_message: errorMessage,
        updated_at: new Date().toISOString(),
      })
      .eq('id', eventId)
  } catch (updateErr) {
    console.warn('Could not update notification_events record:', updateErr)
  }

  return { eventId, status: sendSuccess ? 'SENT' : 'FAILED' }
}

export async function notifyDomainEvent(params: {
  eventType: string
  patientId: string
  actorId?: string
  metadata?: Record<string, any>
}) {
  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('email, first_name, last_name')
    .eq('id', params.patientId)
    .maybeSingle()

  if (!profile?.email) return

  const titles: Record<string, string> = {
    PHARMACY_ORDER_ACKNOWLEDGED: 'Pharmacy Order Acknowledged',
    STOCK_CONFIRMED: 'Medication Stock Confirmed',
    PREPARING_STARTED: 'Medication Packing Started',
    ORDER_DISPATCHED: 'Medication Order Dispatched',
    ORDER_DELIVERED: 'Medication Delivered',
    CLARIFICATION_REQUESTED: 'Prescription Clarification Requested',
    UNABLE_TO_FULFILL: 'Prescription Fulfillment Update',
  }

  const title = titles[params.eventType] || 'Care Program Update'
  const message = params.eventType === 'ORDER_DISPATCHED' && params.metadata?.trackingNumber
    ? `Your medication order has been dispatched via ${params.metadata.courierName || 'carrier'} (AWB: ${params.metadata.trackingNumber}). Sign in to track your delivery.`
    : `There is an update on your 8LIV medication order (${title}). Sign in to your secure account to view details.`

  await emitNotificationEvent({
    eventType: params.eventType,
    entityType: 'pharmacy_order',
    entityId: params.metadata?.orderId || params.patientId,
    recipientUserId: params.patientId,
    recipientEmail: profile.email,
    recipientRole: 'patient',
    subject: `8LIV Care Update: ${title}`,
    messageContent: message,
  })
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}
