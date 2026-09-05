import { NextResponse } from 'next/server'
import { assertAdmin, errorResponse } from '@/lib/fulfilmentAuth'
import { transitionOrderStatus, PartnerOrderStatus } from '@/lib/pharmacyOrderStateMachine'

type RouteContext = { params: Promise<{ orderId: string }> }

export async function POST(request: Request, context: RouteContext) {
  try {
    const auth = await assertAdmin(request)
    const { orderId } = await context.params
    const body = await request.json().catch(() => ({}))

    if (!body.status) {
      return NextResponse.json({ error: 'Status is required.' }, { status: 400 })
    }

    const updated = await transitionOrderStatus({
      orderId,
      newStatus: body.status as PartnerOrderStatus,
      actorId: auth.user.id,
      actorRole: 'admin',
      reason: body.reason || 'Admin updated order status',
      courierName: body.courier_name || body.courierName || null,
      trackingNumber: body.tracking_number || body.trackingNumber || null,
      clarificationNotes: body.clarification_notes || null,
      unableReason: body.unable_to_fulfill_reason || null,
      expectedVersion: body.version || null,
      request,
    })

    return NextResponse.json({ success: true, order: updated })
  } catch (err: any) {
    const failure = errorResponse(err instanceof Error ? err.message : 'Internal Server Error')
    return NextResponse.json({ error: failure.error }, { status: failure.status })
  }
}
