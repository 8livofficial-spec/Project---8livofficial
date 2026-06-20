import crypto from 'crypto'
import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseServer'

type RazorpayXPayoutWebhook = {
  event?: string
  payload?: {
    payout?: {
      entity?: {
        id?: string
        status?: string
      }
    }
  }
}

const getErrorMessage = (err: unknown) => err instanceof Error ? err.message : 'Internal Server Error'

function verifyWebhookSignature(rawBody: string, signature: string | null) {
  const secret = process.env.RAZORPAYX_WEBHOOK_SECRET || process.env.RAZORPAY_WEBHOOK_SECRET
  if (!secret) {
    throw new Error('RazorpayX webhook secret is not configured.')
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

function mapWebhookStatus(event: string | undefined, payoutStatus: string | undefined) {
  const normalizedEvent = String(event || '').toLowerCase()
  const normalizedStatus = String(payoutStatus || '').toLowerCase()

  if (normalizedEvent === 'payout.processed' || normalizedStatus === 'processed') {
    return 'PROCESSED'
  }
  if (
    normalizedEvent === 'payout.failed' ||
    normalizedEvent === 'payout.rejected' ||
    normalizedEvent === 'payout.reversed' ||
    ['failed', 'rejected', 'reversed', 'cancelled', 'canceled'].includes(normalizedStatus)
  ) {
    return 'FAILED'
  }
  return 'PROCESSING'
}

export async function POST(request: Request) {
  try {
    const rawBody = await request.text()
    verifyWebhookSignature(rawBody, request.headers.get('x-razorpay-signature'))

    const event = JSON.parse(rawBody) as RazorpayXPayoutWebhook
    const payout = event.payload?.payout?.entity
    const payoutId = payout?.id
    if (!payoutId) {
      return NextResponse.json({ error: 'Missing RazorpayX payout id.' }, { status: 400 })
    }

    const payoutStatus = mapWebhookStatus(event.event, payout.status)
    const updatePayload: Record<string, string> = {
      payout_status: payoutStatus,
      updated_at: new Date().toISOString(),
    }

    if (payoutStatus === 'PROCESSED') {
      updatePayload.payout_processed_at = new Date().toISOString()
    }

    const { error } = await supabaseAdmin
      .from('doctor_wallet_transactions')
      .update(updatePayload)
      .eq('razorpay_payout_id', payoutId)
      .eq('type', 'CONSULTATION_PAYOUT')

    if (error) throw error

    return NextResponse.json({ received: true })
  } catch (err: unknown) {
    console.error('Error in POST /api/razorpayx/webhook:', err)
    return NextResponse.json({ error: getErrorMessage(err) }, { status: 400 })
  }
}
