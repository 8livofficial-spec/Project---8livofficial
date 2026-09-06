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

    const deliveryMethod = body.delivery_method || (body.delivery_type === 'IN_HOUSE' || body.delivery_type === 'PHARMACY_FLEET' || body.deliveryMethod === 'in_house' ? 'IN_HOUSE' : 'COURIER')

    let courierName = ''
    let trackingNumber = ''
    let dispatchReason = ''

    if (deliveryMethod === 'IN_HOUSE') {
      const riderName = String(body.rider_name || body.riderName || body.agent_name || 'Pharmacy Delivery Staff').trim()
      const riderPhone = String(body.rider_phone || body.riderPhone || body.phone || '').trim()
      const runRef = String(body.run_reference || body.batch_number || `RUN-${Date.now().toString().slice(-6)}`).trim()

      courierName = `In-House Delivery (${riderName})`
      trackingNumber = riderPhone ? `Rider Contact: ${riderPhone}` : runRef
      dispatchReason = `Dispatched via pharmacy in-house delivery service (${riderName}${riderPhone ? ` • ${riderPhone}` : ''})`
    } else {
      courierName = String(body.courier_name || body.courierName || '').trim()
      trackingNumber = String(body.tracking_number || body.trackingNumber || '').trim()

      if (!courierName || !trackingNumber) {
        return NextResponse.json(
          { error: 'Courier name and tracking number are required to dispatch via third-party courier.' },
          { status: 400 }
        )
      }
      dispatchReason = `Dispatched via ${courierName} (AWB: ${trackingNumber})`
    }

    const updated = await transitionOrderStatus({
      orderId,
      newStatus: 'DISPATCHED',
      actorId: accessContext.user.id,
      actorRole: accessContext.role,
      pharmacyId: accessContext.pharmacy.id,
      courierName,
      trackingNumber,
      reason: dispatchReason,
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
