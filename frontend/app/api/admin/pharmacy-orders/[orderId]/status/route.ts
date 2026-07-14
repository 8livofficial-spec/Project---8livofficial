import { NextResponse } from 'next/server'
import { assertAdmin, errorResponse } from '@/lib/fulfilmentAuth'
import { ManualApolloFulfilmentProvider } from '@/lib/manualApolloFulfilment'
import { audit } from '@/lib/prescriptionService'

type RouteContext = { params: Promise<{ orderId: string }> }

export async function POST(request: Request, context: RouteContext) {
  try {
    const auth = await assertAdmin(request)
    const { orderId } = await context.params
    const body = await request.json().catch(() => ({}))
    const provider = new ManualApolloFulfilmentProvider()
    await provider.updateOrder({
      orderId,
      actorId: auth.user.id,
      nextStatus: body.status,
      reason: body.reason || null,
      expectedVersion: body.version || null,
      patch: body.metadata || {},
    })
    await audit({ pharmacyOrderId: orderId, actorId: auth.user.id, actorRole: 'admin', action: 'ORDER_STATUS_UPDATED', newValues: { status: body.status }, reason: body.reason || null, request })
    return NextResponse.json({ success: true })
  } catch (err) {
    const failure = errorResponse(err instanceof Error ? err.message : 'Internal Server Error')
    return NextResponse.json({ error: failure.error }, { status: failure.status })
  }
}
