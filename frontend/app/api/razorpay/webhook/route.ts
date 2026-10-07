import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseServer'
import {
  normalizeRazorpayPaymentStatus,
  type RazorpayEntity,
  updateRazorpayTransactionByKnownIds,
  verifyRazorpayWebhookSignature,
} from '@/lib/payments/razorpayServer'

type RazorpayPaymentWebhook = {
  event?: string
  payload?: {
    payment?: { entity?: RazorpayEntity }
    order?: { entity?: RazorpayEntity }
    refund?: { entity?: RazorpayEntity }
  }
}

const getErrorMessage = (err: unknown) => err instanceof Error ? err.message : 'Internal Server Error'

export async function POST(request: Request) {
  try {
    const rawBody = await request.text()
    verifyRazorpayWebhookSignature(rawBody, request.headers.get('x-razorpay-signature'))

    const event = JSON.parse(rawBody) as RazorpayPaymentWebhook
    const eventName = String(event.event || '')
    const entity = event.payload?.payment?.entity || event.payload?.order?.entity || event.payload?.refund?.entity
    if (!eventName || !entity) {
      return NextResponse.json({ error: 'Missing Razorpay webhook event payload.' }, { status: 400 })
    }

    const paymentId = event.payload?.payment?.entity?.id || entity.id
    const orderId = entity.order_id || event.payload?.order?.entity?.id
    const status = normalizeRazorpayPaymentStatus(eventName, entity.status)
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

    const updated = await updateRazorpayTransactionByKnownIds({ paymentId, orderId, status, metadata })

    if (status === 'success' && updated && patientId && paymentType === 'consultation') {
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
