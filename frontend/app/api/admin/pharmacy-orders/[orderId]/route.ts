import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseServer'
import { assertAdmin, errorResponse } from '@/lib/fulfilmentAuth'

type RouteContext = { params: Promise<{ orderId: string }> }

export async function GET(request: Request, context: RouteContext) {
  try {
    await assertAdmin(request)
    const { orderId } = await context.params
    const { data, error } = await supabaseAdmin
      .from('pharmacy_orders')
      .select('*, partner_pharmacies:pharmacy_id(id, name, email, phone, verification_status, status), prescriptions(*, prescription_items(*)), pharmacy_order_status_history(*), fulfilment_audit_logs(*)')
      .eq('id', orderId)
      .maybeSingle()
    if (error) throw error
    if (!data) throw new Error('Medicine order not found.')
    return NextResponse.json({ order: data })
  } catch (err) {
    const failure = errorResponse(err instanceof Error ? err.message : 'Internal Server Error')
    return NextResponse.json({ error: failure.error }, { status: failure.status })
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const auth = await assertAdmin(request)
    const { orderId } = await context.params
    const body = await request.json().catch(() => ({}))
    const { data: existing, error: lookupError } = await supabaseAdmin
      .from('pharmacy_orders')
      .select('status')
      .eq('id', orderId)
      .maybeSingle()
    if (lookupError) throw lookupError
    if (!existing) throw new Error('Medicine order not found.')

    const allowedPatch: Record<string, unknown> = {}
    for (const key of ['order_amount', 'currency', 'estimated_delivery_at', 'courier_name', 'tracking_number', 'internal_notes', 'unavailability_reason', 'unavailable_medicines', 'refund_status']) {
      if (body[key] !== undefined) allowedPatch[key] = body[key]
    }
    const terminalProtectedFields = Object.keys(allowedPatch).filter((key) => !['internal_notes', 'refund_status'].includes(key))
    if (['DELIVERED', 'CANCELLED'].includes(existing.status) && terminalProtectedFields.length > 0) {
      throw new Error('Delivered or cancelled orders cannot be modified except for internal notes or refund status.')
    }
    allowedPatch.updated_at = new Date().toISOString()
    const { error } = await supabaseAdmin.from('pharmacy_orders').update(allowedPatch).eq('id', orderId)
    if (error) throw error
    await supabaseAdmin.from('fulfilment_audit_logs').insert({
      pharmacy_order_id: orderId,
      actor_id: auth.user.id,
      actorRole: 'admin',
      action: 'ORDER_DETAILS_UPDATED',
      new_values: allowedPatch,
    })
    return NextResponse.json({ success: true })
  } catch (err) {
    const failure = errorResponse(err instanceof Error ? err.message : 'Internal Server Error')
    return NextResponse.json({ error: failure.error }, { status: failure.status })
  }
}
