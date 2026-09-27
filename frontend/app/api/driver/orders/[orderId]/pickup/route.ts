import { NextResponse } from 'next/server'
import { initiatePickupAndDispatch } from '@/lib/driverDeliveryService'

type RouteContext = { params: Promise<{ orderId: string }> }

export async function POST(request: Request, context: RouteContext) {
  try {
    const { orderId } = await context.params
    const body = await request.json().catch(() => ({}))

    const result = await initiatePickupAndDispatch({
      orderId,
      driverName: body.driver_name,
      driverPhone: body.driver_phone,
      deliverySlot: body.delivery_slot,
      request,
    })

    return NextResponse.json({
      success: true,
      message: 'Package picked up for delivery. OTP email dispatched to patient.',
      data: result,
    })
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'Failed to initiate package pickup' },
      { status: 400 }
    )
  }
}
