import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseServer'
import {
  assertPharmacyAccess,
  assertPharmacyTransition,
  createPatientNotification,
  getTimestampPatch,
  isValidPharmacyStatus,
  logPharmacyAudit,
  parsePagination,
} from '@/lib/pharmacy'

export async function GET(request: Request) {
  try {
    await assertPharmacyAccess(request, ['PHARMACY_ADMIN', 'PHARMACY_STAFF', 'ADMIN'])
    const { params, from, to, page, limit } = parsePagination(request.url)
    const status = params.get('status')
    const search = params.get('search')?.trim()

    let query = supabaseAdmin
      .from('prescription_orders')
      .select('*, prescription_order_items(*), delivery_tracking(*)', { count: 'exact' })
      .order('created_at', { ascending: false })

    if (status) query = query.eq('status', status)
    if (search) query = query.or(`order_number.ilike.%${search}%,invoice_id.ilike.%${search}%`)

    const { data, error, count } = await query.range(from, to)
    if (error) throw error

    return NextResponse.json({
      orders: data || [],
      pagination: { page, limit, total: count || 0, totalPages: Math.ceil((count || 0) / limit) },
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal Server Error'
    const status = message === 'Forbidden' ? 403 : message === 'Unauthorized' ? 401 : 500
    return NextResponse.json({ error: message }, { status })
  }
}

export async function PATCH(request: Request) {
  try {
    const auth = await assertPharmacyAccess(request, ['PHARMACY_ADMIN', 'PHARMACY_STAFF', 'ADMIN'])
    const body = await request.json().catch(() => ({}))
    const { orderId, status: nextStatus, notes, paymentId, refundId, invoiceId } = body

    if (!orderId || !isValidPharmacyStatus(nextStatus)) {
      return NextResponse.json({ error: 'orderId and a valid status are required.' }, { status: 400 })
    }

    const { data: order, error: lookupError } = await supabaseAdmin
      .from('prescription_orders')
      .select('id, patient_id, status, status_history')
      .eq('id', orderId)
      .maybeSingle()
    if (lookupError) throw lookupError
    if (!order) return NextResponse.json({ error: 'Order not found.' }, { status: 404 })

    assertPharmacyTransition(order.status, nextStatus)

    const now = new Date().toISOString()
    const history = Array.isArray(order.status_history) ? order.status_history : []
    const patch: Record<string, unknown> = {
      ...getTimestampPatch(nextStatus, now),
      status_history: [...history, { status: nextStatus, at: now, actor_id: auth.user.id, actor_role: auth.role, notes: notes || null }],
    }
    if (paymentId) patch.payment_id = paymentId
    if (refundId) patch.refund_id = refundId
    if (invoiceId) patch.invoice_id = invoiceId

    const { data: updated, error: updateError } = await supabaseAdmin
      .from('prescription_orders')
      .update(patch)
      .eq('id', orderId)
      .select('*')
      .single()
    if (updateError) throw updateError

    await createPatientNotification(
      order.patient_id,
      `Pharmacy order ${String(nextStatus).replaceAll('_', ' ').toLowerCase()}`,
      `Your medicine order status is now ${String(nextStatus).replaceAll('_', ' ')}.`,
    )
    await logPharmacyAudit({
      actorId: auth.user.id,
      actorRole: auth.role,
      action: 'ORDER_STATUS_CHANGED',
      targetType: 'prescription_order',
      targetId: orderId,
      pharmacyId: auth.pharmacyId,
      metadata: { from: order.status, to: nextStatus, notes },
      request,
    })

    return NextResponse.json({ order: updated })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal Server Error'
    const status = message === 'Forbidden' ? 403 : message === 'Unauthorized' ? 401 : message.includes('Invalid transition') ? 409 : 500
    return NextResponse.json({ error: message }, { status })
  }
}
