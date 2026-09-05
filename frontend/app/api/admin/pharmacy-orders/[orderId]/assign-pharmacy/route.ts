import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseServer'
import { assertAdmin, errorResponse } from '@/lib/fulfilmentAuth'
import { audit } from '@/lib/prescriptionService'
import { emitNotificationEvent } from '@/lib/notificationDispatcher'

type RouteContext = { params: Promise<{ orderId: string }> }

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const admin = await assertAdmin(request)
    const { orderId } = await context.params
    const body = await request.json().catch(() => ({}))

    // Strictly read pharmacy_id from body, ignore client-supplied tenant_id, admin_id, patient_id
    const pharmacyId = body.pharmacy_id || body.pharmacyId
    if (!pharmacyId) {
      return NextResponse.json({ error: 'Pharmacy ID is required.' }, { status: 400 })
    }

    // 1. Fetch pharmacy and validate VERIFIED + ACTIVE
    const { data: pharmacy, error: pError } = await supabaseAdmin
      .from('partner_pharmacies')
      .select('id, name, email, phone, verification_status, status, tenant_id')
      .eq('id', pharmacyId)
      .maybeSingle()

    if (pError) throw pError
    if (!pharmacy) {
      return NextResponse.json({ error: 'Partner pharmacy not found.' }, { status: 404 })
    }

    if (pharmacy.verification_status !== 'VERIFIED') {
      return NextResponse.json(
        { error: `Cannot assign order: Pharmacy verification status is ${pharmacy.verification_status}. Must be VERIFIED.` },
        { status: 400 }
      )
    }

    if (pharmacy.status !== 'ACTIVE') {
      return NextResponse.json(
        { error: `Cannot assign order: Pharmacy operational status is ${pharmacy.status}. Must be ACTIVE.` },
        { status: 400 }
      )
    }

    // 2. Fetch order and check current state
    const { data: order, error: oError } = await supabaseAdmin
      .from('pharmacy_orders')
      .select('*, prescriptions(id, prescription_number, patient_id)')
      .eq('id', orderId)
      .maybeSingle()

  if (oError) throw oError
  if (!order) {
    return NextResponse.json({ error: 'Fulfillment order not found.' }, { status: 404 })
  }

  if (['DELIVERED', 'CANCELLED'].includes(order.status)) {
    return NextResponse.json(
      { error: `Cannot assign pharmacy to an order that is ${order.status}.` },
      { status: 400 }
    )
  }

  const previousStatus = order.status
  const previousPharmacyId = order.pharmacy_id
  const now = new Date().toISOString()
  const nextVersion = (order.version || 1) + 1

  // 3. Atomically assign pharmacy and transition to RECEIVED
  const { data: updatedOrder, error: updateError } = await supabaseAdmin
    .from('pharmacy_orders')
    .update({
      pharmacy_id: pharmacy.id,
      status: 'RECEIVED',
      updated_at: now,
      version: nextVersion,
    })
    .eq('id', orderId)
    .eq('version', order.version)
    .select('*')
    .maybeSingle()

  if (updateError) throw updateError
  if (!updatedOrder) {
    return NextResponse.json(
      { error: 'Version conflict: Order was updated by another user. Please refresh and retry.' },
      { status: 409 }
    )
  }

  // 4. Record status history
  await supabaseAdmin.from('pharmacy_order_status_history').insert({
    pharmacy_order_id: orderId,
    previous_status: previousStatus,
    new_status: 'RECEIVED',
    changed_by: admin.user.id,
    reason: `Assigned to partner pharmacy: ${pharmacy.name}`,
    metadata: {
      pharmacy_id: pharmacy.id,
      pharmacy_name: pharmacy.name,
      previous_pharmacy_id: previousPharmacyId,
    },
  })

  // 5. Audit log
  await audit({
    pharmacyOrderId: orderId,
    prescriptionId: order.prescription_id,
    actorId: admin.user.id,
    actorRole: 'admin',
    action: 'PHARMACY_ORDER_ASSIGNED',
    previousValues: { status: previousStatus, pharmacy_id: previousPharmacyId },
    newValues: { status: 'RECEIVED', pharmacy_id: pharmacy.id, pharmacy_name: pharmacy.name },
    request,
  })

  // 6. Notify assigned pharmacy
  if (pharmacy.email) {
    emitNotificationEvent({
      eventType: 'ORDER_ASSIGNED_TO_PHARMACY',
      entityType: 'pharmacy_order',
      entityId: orderId,
      recipientEmail: pharmacy.email,
      recipientRole: 'pharmacy',
      subject: `New Prescription Order Assigned: ${(order.prescriptions as any)?.prescription_number || orderId}`,
      messageContent: `A new medication order has been assigned to your pharmacy for fulfillment. Please log in to your 8LIV Partner Pharmacy portal to acknowledge and confirm stock.`,
    }).catch((err) => {
      console.warn('[assign-pharmacy] Notification error:', err?.message)
    })
  }

  return NextResponse.json({ success: true, order: updatedOrder })
  } catch (err) {
    const failure = errorResponse(err instanceof Error ? err.message : 'Internal Server Error')
    return NextResponse.json({ error: failure.error }, { status: failure.status })
  }
}
