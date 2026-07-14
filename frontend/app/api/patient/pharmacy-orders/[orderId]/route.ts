import { NextResponse } from 'next/server'
import { assertPatient, assertPatientOrderOwnership, errorResponse } from '@/lib/fulfilmentAuth'

type RouteContext = { params: Promise<{ orderId: string }> }

export async function GET(request: Request, context: RouteContext) {
  try {
    const auth = await assertPatient(request)
    const { orderId } = await context.params
    const order = await assertPatientOrderOwnership(orderId, auth.user.id)
    delete order.internal_notes
    return NextResponse.json({ order })
  } catch (err) {
    const failure = errorResponse(err instanceof Error ? err.message : 'Internal Server Error')
    return NextResponse.json({ error: failure.error }, { status: failure.status })
  }
}
