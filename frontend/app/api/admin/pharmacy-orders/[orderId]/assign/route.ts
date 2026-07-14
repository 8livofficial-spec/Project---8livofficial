import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseServer'
import { assertAdmin, errorResponse } from '@/lib/fulfilmentAuth'

type RouteContext = { params: Promise<{ orderId: string }> }

export async function POST(request: Request, context: RouteContext) {
  try {
    const auth = await assertAdmin(request)
    const { orderId } = await context.params
    const body = await request.json().catch(() => ({}))
    const assignedAdminId = body.assigned_admin_id || auth.user.id
    const { error } = await supabaseAdmin
      .from('pharmacy_orders')
      .update({ assigned_admin_id: assignedAdminId, updated_at: new Date().toISOString() })
      .eq('id', orderId)
    if (error) throw error
    await supabaseAdmin.from('fulfilment_audit_logs').insert({
      pharmacy_order_id: orderId,
      actor_id: auth.user.id,
      actor_role: 'admin',
      action: 'ORDER_ASSIGNED',
      new_values: { assigned_admin_id: assignedAdminId },
    })
    return NextResponse.json({ success: true })
  } catch (err) {
    const failure = errorResponse(err instanceof Error ? err.message : 'Internal Server Error')
    return NextResponse.json({ error: failure.error }, { status: failure.status })
  }
}
