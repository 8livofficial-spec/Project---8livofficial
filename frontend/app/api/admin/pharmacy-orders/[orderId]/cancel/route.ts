import { NextResponse } from 'next/server'
import { assertAdmin, errorResponse } from '@/lib/fulfilmentAuth'
import { transitionOrderStatus } from '@/lib/pharmacyOrderStateMachine'

type RouteContext = { params: Promise<{ orderId: string }> }

export async function POST(request: Request, context: RouteContext) {
  try {
    const auth = await assertAdmin(request)
    const { orderId } = await context.params
    const body = await request.json().catch(() => ({}))
    if (!body.reason) throw new Error('Cancellation reason is required.')

    const updated = await transitionOrderStatus({
      orderId,
      newStatus: 'CANCELLED',
      actorId: auth.user.id,
      actorRole: 'admin',
      reason: String(body.reason),
      expectedVersion: body.version || null,
      request,
    })

    return NextResponse.json({ success: true, order: updated })
  } catch (err: any) {
    const failure = errorResponse(err instanceof Error ? err.message : 'Internal Server Error')
    return NextResponse.json({ error: failure.error }, { status: failure.status })
  }
}
