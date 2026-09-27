import { NextResponse } from 'next/server'
import { assertPatient, assertPatientOrderOwnership, errorResponse } from '@/lib/fulfilmentAuth'

type RouteContext = { params: Promise<{ orderId: string }> }

export async function GET(request: Request, context: RouteContext) {
  try {
    const auth = await assertPatient(request)
    const { orderId } = await context.params
    const order = await assertPatientOrderOwnership(orderId, auth.user.id)
    
    // Safely extract customer-facing delivery OTP and rider info if in-house dispatched
    try {
      if (order.internal_notes) {
        const parsed = JSON.parse(order.internal_notes)
        if (order.status === 'DISPATCHED') {
          order.delivery_otp = parsed.delivery_otp || null
        }
        order.driver_name = parsed.driver_name || null
        order.driver_phone = parsed.driver_phone || null
        order.delivery_slot = parsed.delivery_slot || null
      }
    } catch {}

    delete order.internal_notes
    return NextResponse.json({ order })
  } catch (err) {
    const failure = errorResponse(err instanceof Error ? err.message : 'Internal Server Error')
    return NextResponse.json({ error: failure.error }, { status: failure.status })
  }
}
