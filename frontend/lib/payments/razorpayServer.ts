import crypto from 'crypto'
import Razorpay from 'razorpay'
import { supabaseAdmin } from '@/lib/supabaseServer'

export type RazorpayEntity = {
  id?: string
  order_id?: string
  amount?: number
  currency?: string
  method?: string
  status?: string
  notes?: Record<string, unknown>
}

function timingSafeHexEqual(leftHex: string, rightHex: string) {
  const left = Buffer.from(leftHex, 'hex')
  const right = Buffer.from(rightHex, 'hex')
  return left.length === right.length && crypto.timingSafeEqual(left, right)
}

export function getRazorpayKeyId() {
  return process.env.RAZORPAY_KEY_ID || process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || ''
}

export function getRazorpayClient() {
  const keyId = getRazorpayKeyId()
  const keySecret = process.env.RAZORPAY_KEY_SECRET

  if (!keyId || !keySecret) {
    throw new Error('Razorpay credentials are not configured.')
  }

  return new Razorpay({
    key_id: keyId,
    key_secret: keySecret,
  })
}

export function verifyRazorpayPaymentSignature(params: {
  orderId: string
  paymentId: string
  signature: string
}) {
  const keySecret = process.env.RAZORPAY_KEY_SECRET
  if (!keySecret) {
    throw new Error('Payment gateway configuration error')
  }

  const expected = crypto
    .createHmac('sha256', keySecret)
    .update(`${params.orderId}|${params.paymentId}`)
    .digest('hex')

  return timingSafeHexEqual(expected, String(params.signature))
}

export function verifyRazorpayWebhookSignature(rawBody: string, signature: string | null, secret?: string) {
  const webhookSecret = secret || process.env.RAZORPAY_WEBHOOK_SECRET
  if (!webhookSecret) {
    throw new Error('Razorpay webhook secret is not configured.')
  }
  if (!signature) {
    throw new Error('Missing Razorpay webhook signature.')
  }

  const expected = crypto
    .createHmac('sha256', webhookSecret)
    .update(rawBody)
    .digest('hex')

  if (!timingSafeHexEqual(expected, signature)) {
    throw new Error('Invalid Razorpay webhook signature.')
  }
}

export function normalizeRazorpayPaymentStatus(eventName: string, entityStatus?: string) {
  const event = eventName.toLowerCase()
  const status = String(entityStatus || '').toLowerCase()

  if (event === 'payment.captured' || event === 'order.paid' || status === 'captured' || status === 'paid') {
    return 'success'
  }
  if (event === 'payment.failed' || ['failed', 'cancelled', 'canceled'].includes(status)) {
    return 'failed'
  }
  if (event.startsWith('refund.')) {
    return event === 'refund.processed' ? 'refunded' : 'refund_failed'
  }
  return status || 'processing'
}

export function buildRazorpayOrderMetadata(params: {
  orderId: string
  receipt?: string | null
  paymentType: string
  planId?: string
  durationMonths?: number
}) {
  return {
    razorpay_order_id: params.orderId,
    receipt: params.receipt || '',
    paymentType: params.paymentType,
    planId: params.planId || '',
    durationMonths: params.durationMonths || 1,
    created_at: new Date().toISOString(),
  }
}

export async function findRazorpayTransaction(paymentId?: string, orderId?: string) {
  if (paymentId) {
    const { data, error } = await supabaseAdmin
      .from('payment_transactions')
      .select('*')
      .eq('transaction_id', paymentId)
      .maybeSingle()

    if (error) console.error('Razorpay payment transaction lookup failed:', error.message)
    if (data) return data
  }

  if (orderId) {
    const { data, error } = await supabaseAdmin
      .from('payment_transactions')
      .select('*')
      .or(`transaction_id.eq.${orderId},metadata->>razorpay_order_id.eq.${orderId}`)
      .maybeSingle()

    if (error) console.error('Razorpay order transaction lookup failed:', error.message)
    if (data) return data
  }

  return null
}

export async function updateRazorpayTransactionByKnownIds(params: {
  paymentId?: string
  orderId?: string
  status: string
  metadata: Record<string, unknown>
}) {
  const existing = await findRazorpayTransaction(params.paymentId, params.orderId)
  if (!existing?.id) return false

  const existingMetadata = typeof existing.metadata === 'object' && existing.metadata ? existing.metadata : {}
  const { data } = await supabaseAdmin
    .from('payment_transactions')
    .update({
      status: params.status,
      metadata: {
        ...existingMetadata,
        ...params.metadata,
      },
    })
    .eq('id', existing.id)
    .select('id')
    .maybeSingle()

  return Boolean(data?.id)
}
