import { NextResponse } from 'next/server'
import { assertPharmacyOrderAccess } from '@/lib/pharmacySecurity'
import { transitionOrderStatus } from '@/lib/pharmacyOrderStateMachine'

export async function POST(
  request: Request,
  { params }: { params: { orderId: string } }
) {
  try {
    const context = await assertPharmacyOrderAccess(request, params.orderId)
    const body = await request.json()

    const reason = String(body.reason || body.unable_to_fulfill_reason || '').trim()
    if (!reason) {
      return NextResponse.json(
        { error: 'Reason is required when reporting unable to fulfill an order.' },
        { status: 400 }
      )
    }

    const updated = await transitionOrderStatus({
      orderId: params.orderId,
      newStatus: 'UNABLE_TO_FULFILL',
      actorId: context.user.id,
      actorRole: context.role,
      pharmacyId: context.pharmacy.id,
      unableReason: reason,
      reason: `Unable to fulfill: ${reason}`,
      request,
    })

    return NextResponse.json({ success: true, order: updated })
  } catch (err: any) {
    const status = err.status || 400
    return NextResponse.json(
      { error: err.message || 'Failed to report unable to fulfill' },
      { status }
    )
  }
}
