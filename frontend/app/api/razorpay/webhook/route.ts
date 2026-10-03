import crypto from 'crypto'
import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseServer'

type RazorpayEntity = {
  id?: string
  order_id?: string
  amount?: number
  currency?: string
  method?: string
  status?: string
  notes?: Record<string, unknown>
}

type RazorpayPaymentWebhook = {
  event?: string
  payload?: {
    payment?: { entity?: RazorpayEntity }
    order?: { entity?: RazorpayEntity }
    refund?: { entity?: RazorpayEntity }
  }
}

const getErrorMessage = (err: unknown) => err instanceof Error ? err.message : 'Internal Server Error'

function verifyWebhookSignature(rawBody: string, signature: string | null) {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET
  if (!secret) {
    throw new Error('Razorpay payment webhook secret is not configured.')
  }
  if (!signature) {
    throw new Error('Missing Razorpay webhook signature.')
  }

  const expected = crypto
    .createHmac('sha256', secret)
    .update(rawBody)
    .digest('hex')

  const expectedBuffer = Buffer.from(expected)
  const receivedBuffer = Buffer.from(signature)
  if (expectedBuffer.length !== receivedBuffer.length || !crypto.timingSafeEqual(expectedBuffer, receivedBuffer)) {
    throw new Error('Invalid Razorpay webhook signature.')
  }
}

function normalizePaymentStatus(eventName: string, entityStatus?: string) {
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

async function updateExistingTransaction(paymentId: string | undefined, orderId: string | undefined, status: string, metadata: Record<string, unknown>) {
  if (paymentId) {
    const { data } = await supabaseAdmin
      .from('payment_transactions')
      .update({
        status,
        metadata,
      })
      .eq('transaction_id', paymentId)
      .select('id')
      .maybeSingle()

    if (data?.id) return true
  }

  if (orderId) {
    const { data } = await supabaseAdmin
      .from('payment_transactions')
      .update({
        status,
        metadata,
      })
      .contains('metadata', { razorpay_order_id: orderId })
      .select('id')
      .maybeSingle()

    if (data?.id) return true
  }

  return false
}

async function insertWebhookTransaction(entity: RazorpayEntity, status: string, paymentType: string, patientId: string, metadata: Record<string, unknown>) {
  if (!entity.id) return

  await supabaseAdmin
    .from('payment_transactions')
    .upsert({
      patient_id: patientId,
      amount: Number(entity.amount || 0) / 100,
      currency: entity.currency || 'INR',
      payment_method: entity.method || 'razorpay',
      payment_provider: 'razorpay',
      transaction_id: entity.id,
      status,
      payment_type: paymentType,
      metadata,
    }, { onConflict: 'transaction_id' })
}

export async function POST(request: Request) {
  try {
    const rawBody = await request.text()
    verifyWebhookSignature(rawBody, request.headers.get('x-razorpay-signature'))

    const event = JSON.parse(rawBody) as RazorpayPaymentWebhook
    const eventName = String(event.event || '')
    const entity = event.payload?.payment?.entity || event.payload?.order?.entity || event.payload?.refund?.entity
    if (!eventName || !entity) {
      return NextResponse.json({ error: 'Missing Razorpay webhook event payload.' }, { status: 400 })
    }

    const paymentId = event.payload?.payment?.entity?.id || entity.id
    const orderId = entity.order_id || event.payload?.order?.entity?.id
    const status = normalizePaymentStatus(eventName, entity.status)
    const notes = entity.notes || event.payload?.order?.entity?.notes || {}
    const patientId = typeof notes.patientId === 'string' ? notes.patientId : ''
    const paymentType = typeof notes.paymentType === 'string' ? notes.paymentType : 'razorpay'
    const metadata = {
      razorpay_event: eventName,
      razorpay_order_id: orderId || null,
      razorpay_payment_id: paymentId || null,
      razorpay_status: entity.status || null,
      razorpay_notes: notes,
      webhook_recorded_at: new Date().toISOString(),
    }

    const updated = await updateExistingTransaction(paymentId, orderId, status, metadata)

    if (!updated && patientId && paymentId) {
      await insertWebhookTransaction(event.payload?.payment?.entity || entity, status, paymentType, patientId, metadata)
    }

    if (status === 'success' && patientId && paymentType === 'consultation') {
      await supabaseAdmin
        .from('health_assessments')
        .update({ consultation_fee_paid: true })
        .eq('patient_id', patientId)
    }

    return NextResponse.json({ received: true })
  } catch (err: unknown) {
    console.error('Error in POST /api/razorpay/webhook:', err)
    return NextResponse.json({ error: getErrorMessage(err) }, { status: 400 })
  }
}
