import { NextResponse } from 'next/server'
import { assertAdmin, errorResponse } from '@/lib/fulfilmentAuth'
import { ManualApolloFulfilmentProvider } from '@/lib/manualApolloFulfilment'

type RouteContext = { params: Promise<{ orderId: string }> }

export async function POST(request: Request, context: RouteContext) {
  try {
    const auth = await assertAdmin(request)
    const { orderId } = await context.params
    const body = await request.json().catch(() => ({}))
    if (!body.apollo_order_reference) throw new Error('Apollo order reference is required.')
    const provider = new ManualApolloFulfilmentProvider()
    await provider.updateOrder({
      orderId,
      actorId: auth.user.id,
      nextStatus: 'ORDER_PLACED_WITH_APOLLO',
      reason: body.reason || 'Placed manually with Apollo Pharmacy',
      expectedVersion: body.version || null,
      patch: {
        apollo_order_reference: String(body.apollo_order_reference).trim(),
        order_amount: body.order_amount ?? null,
        currency: body.currency || 'INR',
        estimated_delivery_at: body.estimated_delivery_at || null,
      },
    })
    return NextResponse.json({ success: true })
  } catch (err) {
    const failure = errorResponse(err instanceof Error ? err.message : 'Internal Server Error')
    return NextResponse.json({ error: failure.error }, { status: failure.status })
  }
}
