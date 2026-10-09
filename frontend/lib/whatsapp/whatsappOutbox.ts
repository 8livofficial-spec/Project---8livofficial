/**
 * Resilient Transactional WhatsApp Outbox
 *
 * Implements reliable asynchronous delivery, idempotency, bounded exponential
 * retries with jitter, and dead-letter handling.
 */

import { supabaseAdmin } from '../supabaseServer'
import { WhatsAppClient } from './whatsappClient'
import { normalizePhoneNumber } from '../phone'

export interface OutboxPayload {
  type: 'text' | 'template'
  text?: string
  templateName?: string
  languageCode?: string
  components?: any[]
  userId?: string
  metadata?: Record<string, any>
}

export interface OutboxEnqueueParams {
  idempotencyKey: string
  recipientPhone: string
  payload: OutboxPayload
  maxAttempts?: number
}

export class WhatsAppOutbox {
  /**
   * Enqueues a notification into the durable outbox queue.
   * Idempotent by `idempotency_key`.
   */
  public static async enqueue(params: OutboxEnqueueParams): Promise<boolean> {
    try {
      const { idempotencyKey, recipientPhone, payload, maxAttempts = 5 } = params

      const normalized = normalizePhoneNumber(recipientPhone)
      const targetPhone = normalized.e164 || recipientPhone

      const { error } = await supabaseAdmin
        .from('whatsapp_outbox_queue')
        .insert({
          idempotency_key: idempotencyKey,
          recipient_phone: targetPhone,
          payload,
          status: 'PENDING',
          attempts: 0,
          max_attempts: maxAttempts,
          next_attempt_at: new Date().toISOString(),
        })

      if (error) {
        if (error.code === '23505') {
          // Idempotency conflict: already enqueued
          return true
        }
        console.error('[WhatsAppOutbox] Failed to enqueue message:', error)
        return false
      }

      return true
    } catch (err: any) {
      console.error('[WhatsAppOutbox] Enqueue error:', err)
      return false
    }
  }

  /**
   * Processes a batch of pending/retryable outbox messages.
   */
  public static async processBatch(batchSize: number = 10): Promise<{
    processed: number
    delivered: number
    failed: number
    deadLetter: number
  }> {
    const stats = { processed: 0, delivered: 0, failed: 0, deadLetter: 0 }
    const nowIso = new Date().toISOString()

    // 1. Fetch pending or retryable jobs
    const { data: jobs, error: fetchErr } = await supabaseAdmin
      .from('whatsapp_outbox_queue')
      .select('*')
      .in('status', ['PENDING', 'FAILED'])
      .lte('next_attempt_at', nowIso)
      .order('created_at', { ascending: true })
      .limit(batchSize)

    if (fetchErr || !jobs || jobs.length === 0) {
      return stats
    }

    // 2. Process each job
    for (const job of jobs) {
      stats.processed++
      const currentAttempts = (job.attempts || 0) + 1
      const maxAttempts = job.max_attempts || 5

      // Mark processing
      await supabaseAdmin
        .from('whatsapp_outbox_queue')
        .update({
          status: 'PROCESSING',
          attempts: currentAttempts,
          updated_at: new Date().toISOString(),
        })
        .eq('id', job.id)

      const payload: OutboxPayload = job.payload || {}
      const normalized = normalizePhoneNumber(job.recipient_phone)
      const waNumber = normalized.whatsapp

      if (!waNumber) {
        // Invalid phone number format is permanent failure
        await supabaseAdmin
          .from('whatsapp_outbox_queue')
          .update({
            status: 'DEAD_LETTER',
            last_error: 'Invalid recipient phone number formatting',
            updated_at: new Date().toISOString(),
          })
          .eq('id', job.id)
        stats.deadLetter++
        continue
      }

      let dispatchResult: import('./whatsappClient').WhatsAppSendResult

      if (payload.type === 'template' && payload.templateName) {
        dispatchResult = await WhatsAppClient.sendTemplate({
          to: waNumber,
          templateName: payload.templateName,
          languageCode: payload.languageCode || 'en',
          components: payload.components,
        })
      } else {
        dispatchResult = await WhatsAppClient.sendText({
          to: waNumber,
          text: payload.text || '',
        })
      }

      if (dispatchResult.success) {
        // Successfully delivered
        await supabaseAdmin
          .from('whatsapp_outbox_queue')
          .update({
            status: 'DELIVERED',
            updated_at: new Date().toISOString(),
          })
          .eq('id', job.id)

        stats.delivered++
      } else {
        const errorMsg = dispatchResult.error?.message || 'Dispatch failed'
        const isPermanent = /invalid parameter|template does not exist|user does not exist/i.test(errorMsg)

        if (isPermanent || currentAttempts >= maxAttempts) {
          // Dead letter queue
          await supabaseAdmin
            .from('whatsapp_outbox_queue')
            .update({
              status: 'DEAD_LETTER',
              last_error: errorMsg,
              updated_at: new Date().toISOString(),
            })
            .eq('id', job.id)

          stats.deadLetter++
        } else {
          // Calculate exponential backoff with jitter (e.g. 2^attempts * 1500ms + jitter)
          const backoffMs = Math.min(
            Math.pow(2, currentAttempts) * 1500 + Math.floor(Math.random() * 1000),
            30 * 60 * 1000
          )
          const nextAttemptAt = new Date(Date.now() + backoffMs).toISOString()

          await supabaseAdmin
            .from('whatsapp_outbox_queue')
            .update({
              status: 'FAILED',
              last_error: errorMsg,
              next_attempt_at: nextAttemptAt,
              updated_at: new Date().toISOString(),
            })
            .eq('id', job.id)

          stats.failed++
        }
      }
    }

    return stats
  }
}
