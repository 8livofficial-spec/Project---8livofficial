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
    const body = await request.json()

    const courierName = String(body.courier_name || body.courierName || '').trim()
    const trackingNumber = String(body.tracking_number || body.trackingNumber || '').trim()

    if (!courierName || !trackingNumber) {
      return NextResponse.json(
        { error: 'Courier name and tracking number are required to dispatch medication.' },
        { status: 400 }
      )
    }

    const updated = await transitionOrderStatus({
      orderId,
      newStatus: 'DISPATCHED',
      actorId: accessContext.user.id,
      actorRole: accessContext.role,
      pharmacyId: accessContext.pharmacy.id,
      courierName,
      trackingNumber,
      reason: `Dispatched via ${courierName} (AWB: ${trackingNumber})`,
      request,
    })

    return NextResponse.json({ success: true, order: updated })
  } catch (err: any) {
    const status = err.status || 400
    return NextResponse.json(
      { error: err.message || 'Failed to dispatch order' },
      { status }
    )
  }
}
