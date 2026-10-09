/**
 * Official Meta WhatsApp Cloud API Direct Client
 *
 * Implements direct HTTP communication with Meta Graph API endpoints.
 * Handles request timeouts, bounded exponential backoff retries, rate limits,
 * and permanent vs transient failure classification.
 */

import { WHATSAPP_CONFIG } from './whatsappConfig'
import { normalizePhoneNumber } from '../phone'
import { supabaseAdmin } from '../supabaseServer'

export type MetaTemplateComponent = {
  type: 'header' | 'body' | 'button'
  sub_type?: 'url' | 'quick_reply'
  index?: string | number
  parameters: Array<{
    type: 'text' | 'currency' | 'date_time' | 'image' | 'document' | 'video'
    text?: string
    currency?: { fallback_value: string; code: string; amount_1000: number }
    date_time?: { fallback_value: string }
    image?: { link: string }
    document?: { link: string; filename?: string }
  }>
}

export type WhatsAppSendResult = {
  success: boolean
  messageId?: string
  contactWaId?: string
  status: 'SENT' | 'FAILED'
  error?: {
    message: string
    code?: number
    subcode?: number
    type?: string
  }
}

// Helper: Sanitize phone numbers for Meta Graph API (E.164 digits without '+')
export function sanitizeMetaRecipient(phone: string): string {
  const normalized = normalizePhoneNumber(phone)
  if (normalized.whatsapp) {
    return normalized.whatsapp
  }
  return phone.replace(/\D/g, '')
}

// Classify whether an HTTP status or Meta error code is transient/retryable
function isRetryableError(status: number, metaErrorCode?: number): boolean {
  // HTTP 429 = Rate Limit (retryable with backoff)
  // HTTP 5xx = Meta Server / Gateway transient error
  if (status === 429 || status >= 500) return true
  // Meta API rate limit subcodes
  if (metaErrorCode === 80007 || metaErrorCode === 130429 || metaErrorCode === 131056) return true
  return false
}

export class WhatsAppClient {
  private static async executeWithRetry<T>(
    operation: () => Promise<{ response: Response; data: any }>
  ): Promise<T> {
    let attempt = 0
    let delay = WHATSAPP_CONFIG.initialRetryDelayMs

    while (attempt < WHATSAPP_CONFIG.maxRetries) {
      attempt++
      try {
        const { response, data } = await operation()

        if (response.ok) {
          return data as T
        }

        const metaError = data?.error
        const errorCode = metaError?.code
        const isRetryable = isRetryableError(response.status, errorCode)

        if (!isRetryable || attempt >= WHATSAPP_CONFIG.maxRetries) {
          const err = new Error(
            metaError?.message || `Meta WhatsApp API error (HTTP ${response.status})`
          )
          ;(err as any).statusCode = response.status
          ;(err as any).metaError = metaError
          throw err
        }

        // Exponential backoff with full jitter
        const jitter = Math.random() * 200
        const sleepTime = Math.min(delay + jitter, WHATSAPP_CONFIG.maxRetryDelayMs)
        console.warn(`[WhatsAppClient] Retryable error on attempt ${attempt}. Retrying in ${Math.round(sleepTime)}ms...`)
        await new Promise((resolve) => setTimeout(resolve, sleepTime))
        delay *= 2
      } catch (err: any) {
        if (err.name === 'AbortError') {
          if (attempt >= WHATSAPP_CONFIG.maxRetries) {
            throw new Error(`Meta WhatsApp API request timed out after ${WHATSAPP_CONFIG.requestTimeoutMs}ms.`)
          }
        } else if (err.statusCode && !isRetryableError(err.statusCode, err.metaError?.code)) {
          // Non-retryable permanent error (e.g. 400 Bad Request, template not found)
          throw err
        }

        if (attempt >= WHATSAPP_CONFIG.maxRetries) throw err
        await new Promise((resolve) => setTimeout(resolve, delay))
        delay *= 2
      }
    }

    throw new Error('Meta WhatsApp API maximum retries exhausted.')
  }

  /**
   * Core method to post a payload to Meta WhatsApp Cloud API
   */
  public static async postMessagePayload(payload: Record<string, unknown>): Promise<WhatsAppSendResult> {
    if (!WHATSAPP_CONFIG.isConfigured()) {
      if (WHATSAPP_CONFIG.isMockEnabled()) {
        console.log('[WhatsAppClient MOCK] Sending simulated message payload:', payload)
        return {
          success: true,
          messageId: `mock_wamid_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
          status: 'SENT',
        }
      }
      return {
        success: false,
        status: 'FAILED',
        error: { message: 'WhatsApp Cloud API is not configured (missing phone number ID or access token).' },
      }
    }

    const endpoint = `${WHATSAPP_CONFIG.graphApiBaseUrl}/${WHATSAPP_CONFIG.apiVersion}/${WHATSAPP_CONFIG.phoneNumberId}/messages`
    const recipientPhone = String(payload.to || '')

    try {
      const data = await this.executeWithRetry<{
        messages?: Array<{ id: string }>
        contacts?: Array<{ wa_id: string }>
      }>(async () => {
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), WHATSAPP_CONFIG.requestTimeoutMs)

        try {
          const response = await fetch(endpoint, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${WHATSAPP_CONFIG.accessToken}`,
            },
            body: JSON.stringify(payload),
            signal: controller.signal,
          })

          const json = await response.json().catch(() => ({}))
          return { response, data: json }
        } finally {
          clearTimeout(timeoutId)
        }
      })

      const messageId = data?.messages?.[0]?.id
      const contactWaId = data?.contacts?.[0]?.wa_id

      // Record to audit log in background (never blocks main response)
      this.recordMessageLog({
        metaMessageId: messageId,
        recipientPhone,
        direction: 'OUTBOUND',
        messageType: String(payload.type || 'unknown'),
        templateName: (payload.template as any)?.name || null,
        content: (payload.text as any)?.body || JSON.stringify(payload.template || {}),
        status: 'SENT',
        rawPayload: payload,
      }).catch((logErr) => console.warn('[WhatsAppClient] Non-blocking audit log notice:', logErr))

      return {
        success: true,
        messageId,
        contactWaId,
        status: 'SENT',
      }
    } catch (err: any) {
      const metaError = err.metaError || { message: err.message }
      console.error('[WhatsAppClient] Send failure:', metaError)

      this.recordMessageLog({
        recipientPhone,
        direction: 'OUTBOUND',
        messageType: String(payload.type || 'unknown'),
        templateName: (payload.template as any)?.name || null,
        status: 'FAILED',
        errorCode: String(metaError.code || 'UNKNOWN'),
        errorMessage: metaError.message || err.message,
        rawPayload: payload,
      }).catch(() => {})

      return {
        success: false,
        status: 'FAILED',
        error: {
          message: metaError.message || err.message,
          code: metaError.code,
          subcode: metaError.error_subcode,
          type: metaError.type,
        },
      }
    }
  }

  /**
   * Send WhatsApp Template Message
   */
  public static async sendTemplate(params: {
    to: string
    templateName: string
    languageCode?: string
    components?: MetaTemplateComponent[]
    userId?: string
  }): Promise<WhatsAppSendResult> {
    const recipient = sanitizeMetaRecipient(params.to)
    const languageCode = params.languageCode || 'en_US'

    const payload: Record<string, unknown> = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: recipient,
      type: 'template',
      template: {
        name: params.templateName,
        language: {
          code: languageCode,
        },
        ...(params.components && params.components.length > 0 ? { components: params.components } : {}),
      },
    }

    return this.postMessagePayload(payload)
  }

  /**
   * Send Free-form Text Message (Active within 24-hour service window)
   */
  public static async sendText(params: {
    to: string
    text: string
    previewUrl?: boolean
    userId?: string
  }): Promise<WhatsAppSendResult> {
    const recipient = sanitizeMetaRecipient(params.to)

    const payload = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: recipient,
      type: 'text',
      text: {
        preview_url: Boolean(params.previewUrl),
        body: params.text,
      },
    }

    return this.postMessagePayload(payload)
  }

  /**
   * Asynchronously record message attempt to whatsapp_messages table
   */
  private static async recordMessageLog(params: {
    metaMessageId?: string
    recipientPhone: string
    direction: 'OUTBOUND' | 'INBOUND'
    messageType: string
    templateName?: string | null
    content?: string | null
    status: 'PENDING' | 'SENT' | 'DELIVERED' | 'READ' | 'FAILED'
    errorCode?: string
    errorMessage?: string
    rawPayload?: Record<string, unknown>
  }): Promise<void> {
    try {
      await supabaseAdmin.from('whatsapp_messages').insert({
        meta_message_id: params.metaMessageId || null,
        recipient_phone: params.recipientPhone,
        direction: params.direction,
        message_type: params.messageType,
        template_name: params.templateName || null,
        content: params.content || null,
        status: params.status,
        error_code: params.errorCode || null,
        error_message: params.errorMessage || null,
        raw_payload: params.rawPayload || {},
      })
    } catch {
      // Graceful fallback: table migration may be pending in some test environments
    }
  }
}
