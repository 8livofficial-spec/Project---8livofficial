import { NextResponse } from 'next/server'
import crypto from 'crypto'
import { WHATSAPP_CONFIG } from '@/lib/whatsapp/whatsappConfig'
import { supabaseAdmin } from '@/lib/supabaseServer'
import { normalizePhoneNumber } from '@/lib/phone'

export const dynamic = 'force-dynamic'

/**
 * Validates Meta X-Hub-Signature-256 against raw payload.
 */
function verifyMetaSignature(rawBody: string, signatureHeader: string | null): boolean {
  if (!WHATSAPP_CONFIG.appSecret) {
    console.warn('[WhatsAppWebhook] appSecret is not configured. Webhook verification skipped in sandbox/dev.')
    return true
  }

  if (!signatureHeader || !signatureHeader.startsWith('sha256=')) {
    return false
  }

  const expectedSignature = signatureHeader.slice(7)
  const computedSignature = crypto
    .createHmac('sha256', WHATSAPP_CONFIG.appSecret)
    .update(rawBody, 'utf8')
    .digest('hex')

  try {
    return crypto.timingSafeEqual(
      Buffer.from(computedSignature, 'hex'),
      Buffer.from(expectedSignature, 'hex')
    )
  } catch {
    return false
  }
}

/**
 * GET /api/webhooks/whatsapp
 * Meta Webhook Verification Handshake
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const mode = searchParams.get('hub.mode')
  const token = searchParams.get('hub.verify_token')
  const challenge = searchParams.get('hub.challenge')

  if (mode === 'subscribe' && token === WHATSAPP_CONFIG.webhookVerifyToken) {
    console.log('[WhatsAppWebhook] Handshake verified successfully with challenge:', challenge)
    return new Response(challenge || '', {
      status: 200,
      headers: { 'Content-Type': 'text/plain' },
    })
  }

  console.warn('[WhatsAppWebhook] Handshake rejected. Invalid verify token or mode.')
  return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
}

/**
 * POST /api/webhooks/whatsapp
 * Inbound webhook for Meta delivery statuses & incoming customer messages
 */
export async function POST(request: Request) {
  let rawBody: string
  try {
    rawBody = await request.text()
  } catch (err: any) {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 })
  }

  const signature = request.headers.get('x-hub-signature-256')
  if (!verifyMetaSignature(rawBody, signature)) {
    console.error('[WhatsAppWebhook] Rejected: Invalid HMAC-SHA256 signature.')
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
  }

  let payload: any
  try {
    payload = JSON.parse(rawBody)
  } catch {
    return NextResponse.json({ error: 'Malformed JSON' }, { status: 400 })
  }

  // Meta ping or verify test
  if (!payload || !payload.entry) {
    return NextResponse.json({ status: 'ok' })
  }

  // Process asynchronously or within 200 OK handler
  try {
    for (const entry of payload.entry) {
      for (const change of entry.changes || []) {
        if (change.field !== 'messages') continue
        const value = change.value
        if (!value) continue

        // 1. Process delivery / read statuses
        if (Array.isArray(value.statuses)) {
          for (const statusObj of value.statuses) {
            const wamid = statusObj.id
            const statusRaw = String(statusObj.status || '').toLowerCase()
            const eventId = `status_${wamid}_${statusRaw}`

            // Deduplicate event
            const { error: dedupErr } = await supabaseAdmin
              .from('whatsapp_webhook_events')
              .insert({
                event_id: eventId,
                event_type: 'MESSAGE_STATUS',
                payload: statusObj,
              })

            if (dedupErr && dedupErr.code === '23505') {
              // Already processed
              continue
            }

            // Map status
            const statusMap: Record<string, string> = {
              sent: 'SENT',
              delivered: 'DELIVERED',
              read: 'READ',
              failed: 'FAILED',
            }
            const mappedStatus = statusMap[statusRaw] || 'SENT'

            const updatePayload: Record<string, any> = {
              status: mappedStatus,
              updated_at: new Date().toISOString(),
            }

            if (mappedStatus === 'FAILED' && statusObj.errors?.[0]) {
              updatePayload.error_code = String(statusObj.errors[0].code || '')
              updatePayload.error_message = statusObj.errors[0].message || statusObj.errors[0].title || 'Delivery failed'
            }

            await supabaseAdmin
              .from('whatsapp_messages')
              .update(updatePayload)
              .eq('meta_message_id', wamid)
          }
        }

        // 2. Process incoming customer messages
        if (Array.isArray(value.messages)) {
          for (const msg of value.messages) {
            const wamid = msg.id
            const fromDigits = msg.from
            const eventId = `msg_${wamid}`

            // Deduplicate message
            const { error: dedupErr } = await supabaseAdmin
              .from('whatsapp_webhook_events')
              .insert({
                event_id: eventId,
                event_type: 'INBOUND_MESSAGE',
                payload: msg,
              })

            if (dedupErr && dedupErr.code === '23505') {
              continue
            }

            const normalized = normalizePhoneNumber(fromDigits)
            const recipientPhone = normalized.e164 || `+${fromDigits}`
            const textBody = msg.text?.body?.trim() || ''

            // Lookup existing profile
            const { data: profile } = await supabaseAdmin
              .from('profiles')
              .select('id, first_name, last_name')
              .eq('phone_number', recipientPhone)
              .maybeSingle()

            const customerName = profile
              ? [profile.first_name, profile.last_name].filter(Boolean).join(' ')
              : value.contacts?.[0]?.profile?.name || recipientPhone

            // Check opt-out / opt-in triggers
            const lowerText = textBody.toLowerCase()
            const isOptOutTrigger = ['stop', 'unsubscribe', 'optout', 'cancel'].includes(lowerText)
            const isOptInTrigger = ['start', 'unstop', 'optin', 'yes'].includes(lowerText)

            // Upsert conversation thread
            const { data: conv } = await supabaseAdmin
              .from('whatsapp_conversations')
              .select('id, is_opted_out')
              .eq('phone_number', recipientPhone)
              .maybeSingle()

            let conversationId = conv?.id
            let isOptedOut = conv?.is_opted_out || false

            if (isOptOutTrigger) isOptedOut = true
            if (isOptInTrigger) isOptedOut = false

            if (conversationId) {
              await supabaseAdmin
                .from('whatsapp_conversations')
                .update({
                  customer_name: customerName,
                  user_id: profile?.id || null,
                  last_customer_message_at: new Date().toISOString(),
                  is_opted_out: isOptedOut,
                  opted_out_at: isOptOutTrigger ? new Date().toISOString() : (isOptInTrigger ? null : undefined),
                  updated_at: new Date().toISOString(),
                })
                .eq('id', conversationId)
            } else {
              const { data: newConv } = await supabaseAdmin
                .from('whatsapp_conversations')
                .insert({
                  phone_number: recipientPhone,
                  user_id: profile?.id || null,
                  customer_name: customerName,
                  last_customer_message_at: new Date().toISOString(),
                  is_opted_out: isOptedOut,
                  opted_out_at: isOptOutTrigger ? new Date().toISOString() : null,
                  status: 'OPEN',
                })
                .select('id')
                .single()

              conversationId = newConv?.id
            }

            // Log inbound message
            await supabaseAdmin
              .from('whatsapp_messages')
              .insert({
                meta_message_id: wamid,
                user_id: profile?.id || null,
                recipient_phone: recipientPhone,
                direction: 'INBOUND',
                message_type: msg.type || 'text',
                content: textBody || `[Interactive/Media: ${msg.type}]`,
                raw_payload: msg,
                status: 'DELIVERED',
                metadata: {
                  conversation_id: conversationId,
                  contact_profile: value.contacts?.[0]?.profile || null,
                },
              })
          }
        }
      }
    }
  } catch (procErr: any) {
    console.error('[WhatsAppWebhook] Error processing event payload:', procErr)
  }

  // Always return 200 OK to Meta to avoid webhook disablement
  return NextResponse.json({ status: 'ok' })
}
