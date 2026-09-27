import { NextResponse } from 'next/server'
import { markDriverArrived } from '@/lib/driverDeliveryService'

type RouteContext = { params: Promise<{ orderId: string }> }

export async function POST(request: Request, context: RouteContext) {
  try {
    const { orderId } = await context.params
    const body = await request.json().catch(() => ({}))

    const result = await markDriverArrived(orderId, body.notes)

    return NextResponse.json({
      success: true,
      message: 'Marked arrived at patient destination.',
      data: result,
    })
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'Failed to record arrival status' },
      { status: 400 }
    )
  }
}
