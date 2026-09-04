import { NextResponse } from 'next/server'
import { assertPharmacyOrderAccess } from '@/lib/pharmacySecurity'
import { transitionOrderStatus } from '@/lib/pharmacyOrderStateMachine'

export async function POST(
  request: Request,
  { params }: { params: { orderId: string } }
) {
  try {
    const context = await assertPharmacyOrderAccess(request, params.orderId)
    const updated = await transitionOrderStatus({
      orderId: params.orderId,
      newStatus: 'ACKNOWLEDGED',
      actorId: context.user.id,
      actorRole: context.role,
      pharmacyId: context.pharmacy.id,
      reason: 'Order acknowledged by partner pharmacy staff',
      request,
    })

    return NextResponse.json({ success: true, order: updated })
  } catch (err: any) {
    const status = err.status || 400
    return NextResponse.json(
      { error: err.message || 'Failed to acknowledge order' },
      { status }
    )
  }
}
