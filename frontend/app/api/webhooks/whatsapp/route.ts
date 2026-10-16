import { NextResponse } from 'next/server'
import crypto from 'crypto'
import { WHATSAPP_CONFIG } from '@/lib/whatsapp/whatsappConfig'
import { supabaseAdmin } from '@/lib/supabaseServer'
import { normalizePhoneNumber } from '@/lib/phone'

export const dynamic = 'force-dynamic'

/**
 * Validates Meta X-Hub-Signature-256 against the raw incoming request body.
 * Uses constant-time comparison to protect against timing attacks.
 */
export function verifyMetaSignature(
  rawBody: string,
  signatureHeader: string | null,
  appSecret: string
): boolean {
  if (!appSecret) {
    console.error('[WhatsAppWebhook] Verification rejected: META_APP_SECRET is not configured.')
    return false
  }

  if (!signatureHeader || !signatureHeader.startsWith('sha256=')) {
    return false
  }

  const expectedSignatureHex = signatureHeader.slice(7).trim()
  const computedSignatureHex = crypto
    .createHmac('sha256', appSecret)
    .update(rawBody, 'utf8')
    .digest('hex')

  try {
    const expectedBuf = Buffer.from(expectedSignatureHex, 'hex')
    const computedBuf = Buffer.from(computedSignatureHex, 'hex')

    if (expectedBuf.length !== computedBuf.length || expectedBuf.length === 0) {
      return false
    }

    return crypto.timingSafeEqual(expectedBuf, computedBuf)
  } catch {
    return false
  }
}

/**
 * Resolves current verify token and app secret from environment or centralized config.
 */
function getWebhookSecrets() {
  const verifyToken =
    process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN ||
    process.env.META_WEBHOOK_VERIFY_TOKEN ||
    WHATSAPP_CONFIG.webhookVerifyToken

  const appSecret =
    process.env.META_APP_SECRET ||
    process.env.WHATSAPP_APP_SECRET ||
    WHATSAPP_CONFIG.appSecret

  return { verifyToken, appSecret }
}

/**
 * GET /api/webhooks/whatsapp
 * Meta Webhook Verification Handshake
 *
 * Meta sends GET request with:
 * - hub.mode=subscribe
 * - hub.verify_token=<token>
 * - hub.challenge=<challenge_code>
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const mode = searchParams.get('hub.mode')
  const token = searchParams.get('hub.verify_token')
  const challenge = searchParams.get('hub.challenge')

  const { verifyToken } = getWebhookSecrets()

  if (mode === 'subscribe' && token && verifyToken && token === verifyToken) {
    console.log('[WhatsAppWebhook] Handshake verified successfully with challenge:', challenge)
    return new Response(challenge || '', {
      status: 200,
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      },
    })
  }

  console.warn('[WhatsAppWebhook] Handshake rejected: invalid mode or verify token')
  return new Response('Forbidden', {
    status: 403,
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  })
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
    return NextResponse.json({ error: 'Failed to read request body' }, { status: 400 })
  }

  const { appSecret } = getWebhookSecrets()
  const signature = request.headers.get('x-hub-signature-256')

  if (!verifyMetaSignature(rawBody, signature, appSecret)) {
    console.error('[WhatsAppWebhook] Request rejected: Invalid or missing X-Hub-Signature-256.')
    return NextResponse.json({ error: 'Invalid or missing signature' }, { status: 401 })
  }

  let payload: any
  try {
    payload = JSON.parse(rawBody)
  } catch {
    console.error('[WhatsAppWebhook] Request rejected: Malformed JSON payload.')
    return NextResponse.json({ error: 'Malformed JSON payload' }, { status: 400 })
  }

  if (!payload || typeof payload !== 'object') {
    return NextResponse.json({ error: 'Invalid payload structure' }, { status: 400 })
  }

  // Meta sends object = 'whatsapp_business_account'
  if (payload.object && payload.object !== 'whatsapp_business_account') {
    console.warn(`[WhatsAppWebhook] Ignored unexpected object type: ${payload.object}`)
    return NextResponse.json({ status: 'ignored' }, { status: 200 })
  }

  if (!Array.isArray(payload.entry)) {
    return NextResponse.json({ status: 'ok' }, { status: 200 })
  }

  try {
    for (const entry of payload.entry) {
      for (const change of entry.changes || []) {
        if (change.field !== 'messages') continue
        const value = change.value
        if (!value) continue

        // 1. Process delivery / read / failure statuses (OTP & notification delivery tracking)
        if (Array.isArray(value.statuses)) {
          for (const statusObj of value.statuses) {
            const wamid = statusObj.id
            if (!wamid) continue

            const statusRaw = String(statusObj.status || '').toLowerCase()
            const eventId = `status_${wamid}_${statusRaw}`

            // Privacy: Store ONLY operational delivery metadata. Zero patient messages, OTPs, or access tokens.
            const sanitizedStatusPayload = {
              wamid,
              status: statusRaw,
              timestamp: statusObj.timestamp,
              recipient_id: statusObj.recipient_id,
              conversation_id: statusObj.conversation?.id,
              conversation_origin: statusObj.conversation?.origin?.type,
              pricing_category: statusObj.pricing?.category,
              pricing_model: statusObj.pricing?.pricing_model,
              errors: statusObj.errors?.map((e: any) => ({
                code: e.code,
                title: e.title || e.message,
              })),
            }

            // Durable idempotency check
            const { error: dedupErr } = await supabaseAdmin
              .from('whatsapp_webhook_events')
              .insert({
                event_id: eventId,
                event_type: 'MESSAGE_STATUS',
                payload: sanitizedStatusPayload,
              })

            if (dedupErr) {
              if (dedupErr.code === '23505') {
                // Already processed, skip to avoid duplicate mutations
                continue
              }
              console.error(`[WhatsAppWebhook] Error recording status event ${eventId}:`, dedupErr)
              throw new Error(`Database error saving status event: ${dedupErr.message}`)
            }

            // Map status enum
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
              updatePayload.error_message =
                statusObj.errors[0].message || statusObj.errors[0].title || 'Delivery failed'
            }

            const { error: updateErr } = await supabaseAdmin
              .from('whatsapp_messages')
              .update(updatePayload)
              .eq('meta_message_id', wamid)

            if (updateErr) {
              console.warn(`[WhatsAppWebhook] Warning updating message ${wamid} status:`, updateErr.message)
            }
          }
        }

        // 2. Process incoming customer messages
        if (Array.isArray(value.messages)) {
          for (const msg of value.messages) {
            const wamid = msg.id
            if (!wamid) continue

            const fromDigits = msg.from
            const eventId = `msg_${wamid}`

            const normalized = normalizePhoneNumber(fromDigits)
            const recipientPhone = normalized.e164 || `+${fromDigits}`
            const textBody = (msg.text?.body || '').trim()

            const lowerText = textBody.toLowerCase()
            const isOptOutTrigger = ['stop', 'unsubscribe', 'optout', 'cancel'].includes(lowerText)
            const isOptInTrigger = ['start', 'unstop', 'optin', 'yes'].includes(lowerText)

            // Privacy: Store ONLY event metadata. Never store raw medical messages or secrets.
            const sanitizedInboundPayload = {
              wamid,
              from: recipientPhone,
              message_type: msg.type || 'text',
              timestamp: msg.timestamp,
              is_opt_out: isOptOutTrigger,
              is_opt_in: isOptInTrigger,
            }

            // Durable idempotency check
            const { error: dedupErr } = await supabaseAdmin
              .from('whatsapp_webhook_events')
              .insert({
                event_id: eventId,
                event_type: 'INBOUND_MESSAGE',
                payload: sanitizedInboundPayload,
              })

            if (dedupErr) {
              if (dedupErr.code === '23505') {
                continue
              }
              console.error(`[WhatsAppWebhook] Error recording inbound event ${eventId}:`, dedupErr)
              throw new Error(`Database error saving inbound event: ${dedupErr.message}`)
            }

            // Lookup profile safely
            const { data: profile } = await supabaseAdmin
              .from('profiles')
              .select('id, first_name, last_name')
              .eq('phone_number', recipientPhone)
              .maybeSingle()

            const customerName = profile
              ? [profile.first_name, profile.last_name].filter(Boolean).join(' ')
              : value.contacts?.[0]?.profile?.name || recipientPhone

            // Upsert conversation thread & compliance status
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
                  opted_out_at: isOptOutTrigger
                    ? new Date().toISOString()
                    : isOptInTrigger
                    ? null
                    : undefined,
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

            // Log inbound delivery metadata without logging sensitive patient health messages or OTPs
            const safeContent = isOptOutTrigger
              ? '[OPT_OUT_REQUEST: STOP]'
              : isOptInTrigger
              ? '[OPT_IN_REQUEST: START]'
              : `[Inbound message: ${msg.type || 'text'}]`

            await supabaseAdmin
              .from('whatsapp_messages')
              .insert({
                meta_message_id: wamid,
                user_id: profile?.id || null,
                recipient_phone: recipientPhone,
                direction: 'INBOUND',
                message_type: msg.type || 'text',
                content: safeContent,
                status: 'DELIVERED',
                metadata: {
                  conversation_id: conversationId,
                  message_timestamp: msg.timestamp,
                },
              })
          }
        }
      }
    }
  } catch (procErr: any) {
    console.error('[WhatsAppWebhook] Unhandled error processing webhook events:', procErr)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }

  // Return 200 OK after events are safely persisted
  return NextResponse.json({ status: 'ok' }, { status: 200 })
}
