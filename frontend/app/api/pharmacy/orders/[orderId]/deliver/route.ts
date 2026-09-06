import { NextResponse } from 'next/server'
import { assertPharmacyOrderAccess } from '@/lib/pharmacySecurity'
import { transitionOrderStatus } from '@/lib/pharmacyOrderStateMachine'

export async function POST(
  request: Request,
  context: { params: Promise<{ orderId: string }> | { orderId: string } }
) {
  try {
    const { orderId } = await Promise.resolve(context.params)
    const accessContext = await assertPharmacyOrderAccess(request, orderId)
    const updated = await transitionOrderStatus({
      orderId,
      newStatus: 'DELIVERED',
      actorId: accessContext.user.id,
      actorRole: accessContext.role,
      pharmacyId: accessContext.pharmacy.id,
      reason: 'Order confirmed delivered to patient address',
      request,
    })

    return NextResponse.json({ success: true, order: updated })
  } catch (err: any) {
    const status = err.status || 400
    return NextResponse.json(
      { error: err.message || 'Failed to mark order as delivered' },
      { status }
    )
  }
}
