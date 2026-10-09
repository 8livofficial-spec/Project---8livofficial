import { NextResponse } from 'next/server'
import { verifyOtpAndCompleteDelivery } from '@/lib/driverDeliveryService'
import { checkRateLimit, getClientIp, rateLimitResponse } from '@/lib/authSecurity'

type RouteContext = { params: Promise<{ orderId: string }> }

export async function POST(request: Request, context: RouteContext) {
  const ip = getClientIp(request)
  try {
    const { orderId } = await context.params

    // Rate limiting: Max 5 attempts per 10 minutes per IP/Order
    const rate = checkRateLimit(`driver_otp:${ip}:${orderId}`, {
      limit: 5,
      windowMs: 10 * 60 * 1000,
      lockMs: 15 * 60 * 1000,
    })
    if (!rate.allowed) {
      return rateLimitResponse(rate.retryAfter || 60, rate.message)
    }

    const body = await request.json().catch(() => ({}))

    const otp = body.otp || body.enteredOtp
    if (!otp) {
      return NextResponse.json({ error: 'Please enter the 6-digit delivery OTP.' }, { status: 400 })
    }

    const result = await verifyOtpAndCompleteDelivery({
      orderId,
      enteredOtp: String(otp).trim(),
      driverNotes: body.notes,
      request,
    })

    return NextResponse.json({
      success: true,
      message: 'Delivery successfully verified and completed!',
      data: result,
    })
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'OTP verification failed' },
      { status: 400 }
    )
  }
}
