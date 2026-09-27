import { NextResponse } from 'next/server'
import { verifyOtpAndCompleteDelivery } from '@/lib/driverDeliveryService'

type RouteContext = { params: Promise<{ orderId: string }> }

export async function POST(request: Request, context: RouteContext) {
  try {
    const { orderId } = await context.params
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
