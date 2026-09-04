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
      newStatus: 'STOCK_CONFIRMED',
      actorId: context.user.id,
      actorRole: context.role,
      pharmacyId: context.pharmacy.id,
      reason: 'Physical medicine stock verified by pharmacist',
      request,
    })

    return NextResponse.json({ success: true, order: updated })
  } catch (err: any) {
    const status = err.status || 400
    return NextResponse.json(
      { error: err.message || 'Failed to confirm stock' },
      { status }
    )
  }
}
