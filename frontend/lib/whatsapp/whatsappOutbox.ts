/**
 * Resilient Transactional WhatsApp Outbox
 *
 * Implements reliable asynchronous delivery, idempotency, bounded exponential
 * retries with jitter, and dead-letter handling.
 */

import { supabaseAdmin } from '../supabaseServer'
import { WhatsAppClient } from './whatsappClient'
import { normalizePhoneNumber } from '../phone'

function maskPhone(phone?: string | null): string {
  if (!phone) return 'unknown'
  const cleaned = phone.trim()
  if (cleaned.length <= 4) return '***'
  return `${cleaned.slice(0, 3)}••••${cleaned.slice(-4)}`
}

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
  nextAttemptAt?: Date | string
}

export class WhatsAppOutbox {
  /**
   * Enqueues a notification into the durable outbox queue.
   * Idempotent by `idempotency_key`. Supports delayed scheduling via `nextAttemptAt`.
   */
  public static async enqueue(params: OutboxEnqueueParams): Promise<boolean> {
    try {
      const { idempotencyKey, recipientPhone, payload, maxAttempts = 5, nextAttemptAt } = params

      const normalized = normalizePhoneNumber(recipientPhone)
      const targetPhone = normalized.e164 || recipientPhone

      const nextAttemptIso = nextAttemptAt
        ? new Date(nextAttemptAt).toISOString()
        : new Date().toISOString()

      const { error } = await supabaseAdmin
        .from('whatsapp_outbox_queue')
        .insert({
          idempotency_key: idempotencyKey,
          recipient_phone: targetPhone,
          payload,
          status: 'PENDING',
          attempts: 0,
          max_attempts: maxAttempts,
          next_attempt_at: nextAttemptIso,
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
   * Invalidate and dead-letter all pending reminder jobs for a cancelled or rescheduled appointment
   */
  public static async cancelPendingForConsultation(consultationId: string): Promise<void> {
    try {
      if (!consultationId) return
      const { data, error } = await supabaseAdmin
        .from('whatsapp_outbox_queue')
        .update({
          status: 'DEAD_LETTER',
          last_error: 'Appointment was cancelled or rescheduled',
          updated_at: new Date().toISOString(),
        })
        .like('idempotency_key', `%_${consultationId}%`)
        .in('status', ['PENDING', 'FAILED', 'PROCESSING'])
        .select('id, idempotency_key')

      if (data && data.length > 0) {
        console.log(`[WhatsAppOutbox] Dead-lettered ${data.length} reminder job(s) for consultation ${consultationId}`)
      }
    } catch (err: any) {
      console.warn('[WhatsAppOutbox] cancelPendingForConsultation notice:', err?.message || err)
    }
  }

  /**
   * Processes a batch of pending/retryable outbox messages using atomic job claims.
   */
  public static async processBatch(batchSize: number = 25): Promise<{
    processed: number
    delivered: number
    failed: number
    deadLetter: number
  }> {
    const stats = { processed: 0, delivered: 0, failed: 0, deadLetter: 0 }
    let jobs: any[] = []

    // 1. Atomically claim batch using PostgreSQL stored procedure (FOR UPDATE SKIP LOCKED)
    try {
      const { data: claimedJobs, error: rpcErr } = await supabaseAdmin
        .rpc('claim_whatsapp_outbox_batch', { batch_size: batchSize })

      if (!rpcErr && Array.isArray(claimedJobs)) {
        jobs = claimedJobs
      } else if (rpcErr) {
        console.warn('[WhatsAppOutbox] claim_whatsapp_outbox_batch RPC notice (falling back to atomic query):', rpcErr.message)
      }
    } catch (err: any) {
      console.warn('[WhatsAppOutbox] RPC exception, falling back to atomic query:', err?.message || err)
    }

    // Fallback: If RPC not available (e.g. before SQL migration is applied), use optimistic locking
    if (jobs.length === 0) {
      const nowIso = new Date().toISOString()
      const { data: candidateJobs } = await supabaseAdmin
        .from('whatsapp_outbox_queue')
        .select('*')
        .in('status', ['PENDING', 'FAILED'])
        .lte('next_attempt_at', nowIso)
        .order('created_at', { ascending: true })
        .limit(batchSize)

      if (candidateJobs && candidateJobs.length > 0) {
        for (const candidate of candidateJobs) {
          const currentAttempts = (candidate.attempts || 0) + 1
          const { data: locked, error: lockErr } = await supabaseAdmin
            .from('whatsapp_outbox_queue')
            .update({
              status: 'PROCESSING',
              attempts: currentAttempts,
              updated_at: nowIso,
            })
            .eq('id', candidate.id)
            .in('status', ['PENDING', 'FAILED'])
            .select('*')
            .maybeSingle()

          if (locked && !lockErr) {
            jobs.push(locked)
          }
        }
      }
    }

    if (jobs.length === 0) {
      return stats
    }

    console.log(`[WhatsAppOutbox] Processing batch of ${jobs.length} claimed outbox job(s)...`)

    // 2. Process each claimed job
    for (const job of jobs) {
      stats.processed++
      const currentAttempts = job.attempts || 1
      const maxAttempts = job.max_attempts || 5
      const maskedPhone = maskPhone(job.recipient_phone)

      const payload: OutboxPayload = job.payload || {}
      const normalized = normalizePhoneNumber(job.recipient_phone)
      const waNumber = normalized.whatsapp

      if (!waNumber) {
        console.warn(`[WhatsAppOutbox] Job ${job.id} (${job.idempotency_key}): Invalid recipient phone format. Marking DEAD_LETTER.`)
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

      // Check if consultation is still scheduled before sending reminders
      if (payload.metadata?.consultationId && (payload.templateName?.includes('reminder') || payload.metadata?.type?.includes('REMINDER'))) {
        const consultId = payload.metadata.consultationId
        let isStillValid = false
        let consultStatus = ''

        const { data: consult } = await supabaseAdmin
          .from('doctor_consultations')
          .select('status')
          .eq('id', consultId)
          .maybeSingle()

        if (consult) {
          consultStatus = (consult.status || '').toLowerCase()
          isStillValid = ['scheduled', 'calling', 'attended'].includes(consultStatus)
        } else {
          // Check staff_consultations fallback
          const { data: staffConsult } = await supabaseAdmin
            .from('staff_consultations')
            .select('status')
            .eq('id', consultId)
            .maybeSingle()
          if (staffConsult) {
            consultStatus = (staffConsult.status || '').toLowerCase()
            isStillValid = ['scheduled', 'calling', 'attended'].includes(consultStatus)
          }
        }

        if (!isStillValid) {
          console.warn(`[WhatsAppOutbox] Job ${job.id} (${job.idempotency_key}): Consultation ${consultId} status is '${consultStatus || 'NOT_FOUND'}'. Dead-lettering reminder.`)
          await supabaseAdmin
            .from('whatsapp_outbox_queue')
            .update({
              status: 'DEAD_LETTER',
              last_error: `Consultation cancelled or no longer scheduled (status: ${consultStatus || 'CANCELLED'})`,
              updated_at: new Date().toISOString(),
            })
            .eq('id', job.id)
          stats.deadLetter++
          continue
        }
      }

      let dispatchResult: import('./whatsappClient').WhatsAppSendResult

      if (payload.type === 'template' && payload.templateName) {
        dispatchResult = await WhatsAppClient.sendTemplate({
          to: waNumber,
          templateName: payload.templateName,
          languageCode: payload.languageCode || 'en_US',
          components: payload.components,
        })
      } else {
        dispatchResult = await WhatsAppClient.sendText({
          to: waNumber,
          text: payload.text || '',
        })
      }

      if (dispatchResult.success) {
        console.log(`[WhatsAppOutbox] Job ${job.id} (${job.idempotency_key}, recipient: ${maskedPhone}) -> DELIVERED`)
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
        const isPermanent = /invalid parameter|template does not exist|user does not exist|recipient cannot be reached/i.test(errorMsg)

        if (isPermanent || currentAttempts >= maxAttempts) {
          console.error(`[WhatsAppOutbox] Job ${job.id} (${job.idempotency_key}, recipient: ${maskedPhone}) -> DEAD_LETTER. Reason: ${errorMsg} (Attempts: ${currentAttempts}/${maxAttempts})`)
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
          // Bounded exponential backoff with jitter
          const backoffMs = Math.min(
            Math.pow(2, currentAttempts) * 1500 + Math.floor(Math.random() * 1000),
            30 * 60 * 1000
          )
          const nextAttemptAt = new Date(Date.now() + backoffMs).toISOString()

          console.warn(`[WhatsAppOutbox] Job ${job.id} (${job.idempotency_key}, recipient: ${maskedPhone}) -> FAILED (Attempt ${currentAttempts}/${maxAttempts}). Retrying in ${Math.round(backoffMs / 1000)}s: ${errorMsg}`)

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

    console.log(`[WhatsAppOutbox] Batch finished: ${stats.processed} processed, ${stats.delivered} delivered, ${stats.failed} failed, ${stats.deadLetter} dead-lettered.`)
    return stats
  }
}
