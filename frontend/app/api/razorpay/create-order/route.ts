import { NextResponse } from 'next/server'
import Razorpay from 'razorpay'
import { getAuthenticatedPatient } from '@/lib/appointmentAvailability'
import { APP_CONFIG } from '@/lib/appConfig'
import { checkRateLimit, getClientIp, rateLimitResponse } from '@/lib/authSecurity'

function getRazorpayClient() {
  const keyId = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || process.env.RAZORPAY_KEY_ID
  const keySecret = process.env.RAZORPAY_KEY_SECRET
  // Secret must differ from key ID and be non-empty
  if (!keyId || !keySecret || keySecret === keyId) {
    return null
  }
  return new Razorpay({
    key_id: keyId,
    key_secret: keySecret,
  })
}

export async function POST(request: Request) {
  try {
    const patient = await getAuthenticatedPatient(request)
    if ('error' in patient) {
      return NextResponse.json({ error: patient.error }, { status: patient.status })
    }

    const ip = getClientIp(request)
    const rate = checkRateLimit(`razorpay_order:${ip}:${patient.user.id}`, APP_CONFIG.rateLimits.booking)
    if (!rate.allowed) return rateLimitResponse(rate.retryAfter || 60, rate.message)

    const body = await request.json()
    const amount = Number(body?.amount || 499)
    const currency = String(body?.currency || 'INR').toUpperCase()
    const receipt = `rcpt_${Date.now().toString().slice(-8)}_${Math.random().toString(36).slice(2, 6)}`
    const paymentType = body?.paymentType || 'consultation'
    const keyId = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || process.env.RAZORPAY_KEY_ID || 'rzp_test_mock'

    const razorpay = getRazorpayClient()
    if (!razorpay) {
      // No valid credentials — return mock order so checkout can still open
      const mockOrderId = `order_mock_${Date.now()}`
      console.warn('[Razorpay] No valid credentials configured, using mock order')
      return NextResponse.json({
        id: mockOrderId,
        amount: Math.round(amount * 100),
        currency,
        receipt,
        key: keyId,
        isMock: true,
      })
    }

    try {
      const order = await razorpay.orders.create({
        amount: Math.round(amount * 100),
        currency,
        receipt,
        notes: {
          patientId: patient.user.id,
          paymentType,
        },
      })

      return NextResponse.json({
        id: order.id,
        amount: order.amount,
        currency: order.currency,
        receipt: order.receipt,
        key: keyId,
        isMock: false,
      })
    } catch (razorpayErr: any) {
      // Razorpay API error (bad secret, network, etc.) — fall back to mock so UI doesn't hang
      console.error('[Razorpay] Order creation failed, falling back to mock:', razorpayErr?.error?.description || razorpayErr.message)
      const mockOrderId = `order_mock_${Date.now()}`
      return NextResponse.json({
        id: mockOrderId,
        amount: Math.round(amount * 100),
        currency,
        receipt,
        key: keyId,
        isMock: true,
        fallbackReason: razorpayErr?.error?.description || 'Payment gateway error',
      })
    }
  } catch (err: any) {
    console.error('Error creating Razorpay order:', err)
    return NextResponse.json({ error: err.message || 'Failed to initialize payment.' }, { status: 500 })
  }
}
