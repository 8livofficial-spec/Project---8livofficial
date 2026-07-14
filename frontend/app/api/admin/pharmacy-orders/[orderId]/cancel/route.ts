import { NextResponse } from 'next/server'
import { assertAdmin, errorResponse } from '@/lib/fulfilmentAuth'
import { ManualApolloFulfilmentProvider } from '@/lib/manualApolloFulfilment'

type RouteContext = { params: Promise<{ orderId: string }> }

export async function POST(request: Request, context: RouteContext) {
  try {
    const auth = await assertAdmin(request)
    const { orderId } = await context.params
    const body = await request.json().catch(() => ({}))
    if (!body.reason) throw new Error('Cancellation reason is required.')
    const provider = new ManualApolloFulfilmentProvider()
    await provider.updateOrder({
      orderId,
      actorId: auth.user.id,
      nextStatus: 'CANCELLED',
      reason: String(body.reason),
      expectedVersion: body.version || null,
      patch: { cancellation_reason: String(body.reason) },
    })
    return NextResponse.json({ success: true })
  } catch (err) {
    const failure = errorResponse(err instanceof Error ? err.message : 'Internal Server Error')
    return NextResponse.json({ error: failure.error }, { status: failure.status })
  }
}
