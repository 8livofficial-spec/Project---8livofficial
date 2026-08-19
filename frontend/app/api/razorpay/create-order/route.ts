import { NextResponse } from 'next/server'
import Razorpay from 'razorpay'
import { getAuthenticatedPatient } from '@/lib/appointmentAvailability'
import { APP_CONFIG } from '@/lib/appConfig'
import { checkRateLimit, getClientIp, rateLimitResponse } from '@/lib/authSecurity'

function getRazorpayClient() {
  const keyId = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || process.env.RAZORPAY_KEY_ID
  const keySecret = process.env.RAZORPAY_KEY_SECRET
  if (!keyId || !keySecret) {
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

    const razorpay = getRazorpayClient()
    if (!razorpay) {
      const mockOrderId = `order_mock_${Date.now()}`
      return NextResponse.json({
        id: mockOrderId,
        amount: Math.round(amount * 100),
        currency,
        receipt,
        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || 'rzp_test_mock',
        isMock: true,
      })
    }

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
      key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || process.env.RAZORPAY_KEY_ID,
      isMock: false,
    })
  } catch (err: any) {
    console.error('Error creating Razorpay order:', err)
    return NextResponse.json({ error: err.message || 'Failed to initialize payment.' }, { status: 500 })
  }
}
