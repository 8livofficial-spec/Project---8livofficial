import { NextResponse } from 'next/server'
import { resendDeliveryOtp } from '@/lib/driverDeliveryService'

type RouteContext = { params: Promise<{ orderId: string }> }

export async function POST(request: Request, context: RouteContext) {
  try {
    const { orderId } = await context.params
    const result = await resendDeliveryOtp(orderId)

    return NextResponse.json({
      success: true,
      message: `Delivery OTP resent to patient email (${result.email}).`,
      data: result,
    })
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'Failed to resend OTP' },
      { status: 400 }
    )
  }
}
