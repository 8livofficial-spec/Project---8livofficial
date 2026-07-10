import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseServer'
import { assertPharmacyAccess, createPatientNotification, logPharmacyAudit, parsePagination } from '@/lib/pharmacy'

export async function GET(request: Request) {
  try {
    const auth = await assertPharmacyAccess(request)
    const { from, to, page, limit } = parsePagination(request.url)

    let query = supabaseAdmin
      .from('delivery_tracking')
      .select('*, prescription_orders(order_number, patient_id, status, delivery_address)', { count: 'exact' })
      .order('updated_at', { ascending: false })

    if (auth.role === 'DELIVERY_PARTNER') {
      const { data: partner } = await supabaseAdmin
        .from('delivery_partners')
        .select('id')
        .eq('user_id', auth.user.id)
        .maybeSingle()
      query = query.eq('delivery_partner_id', partner?.id || '00000000-0000-0000-0000-000000000000')
    }

    const { data, error, count } = await query.range(from, to)
    if (error) throw error
    return NextResponse.json({
      deliveries: data || [],
      pagination: { page, limit, total: count || 0, totalPages: Math.ceil((count || 0) / limit) },
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal Server Error'
    const status = message === 'Forbidden' ? 403 : message === 'Unauthorized' ? 401 : 500
    return NextResponse.json({ error: message }, { status })
  }
}

export async function POST(request: Request) {
  try {
    const auth = await assertPharmacyAccess(request, ['PHARMACY_ADMIN', 'PHARMACY_STAFF', 'ADMIN'])
    const body = await request.json().catch(() => ({}))
    const { orderId, deliveryPartnerId, eta } = body
    if (!orderId || !deliveryPartnerId) {
      return NextResponse.json({ error: 'orderId and deliveryPartnerId are required.' }, { status: 400 })
    }

    const otp = String(Math.floor(100000 + Math.random() * 900000))
    const { data: delivery, error } = await supabaseAdmin
      .from('delivery_tracking')
      .upsert({
        order_id: orderId,
        delivery_partner_id: deliveryPartnerId,
        status: 'ASSIGNED',
        delivery_otp: otp,
        estimated_delivery_at: eta || null,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'order_id' })
      .select('*')
      .single()
    if (error) throw error

    await logPharmacyAudit({
      actorId: auth.user.id,
      actorRole: auth.role,
      action: 'DELIVERY_ASSIGNED',
      targetType: 'delivery_tracking',
      targetId: delivery.id,
      pharmacyId: auth.pharmacyId,
      metadata: { orderId, deliveryPartnerId },
      request,
    })
    return NextResponse.json({ delivery }, { status: 201 })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal Server Error'
    const status = message === 'Forbidden' ? 403 : message === 'Unauthorized' ? 401 : 500
    return NextResponse.json({ error: message }, { status })
  }
}

export async function PATCH(request: Request) {
  try {
    const auth = await assertPharmacyAccess(request)
    const body = await request.json().catch(() => ({}))
    const { deliveryId, status: nextStatus, proofOfDeliveryUrl, failureReason, rescheduledAt, otp } = body
    if (!deliveryId || !nextStatus) return NextResponse.json({ error: 'deliveryId and status are required.' }, { status: 400 })

    const { data: current, error: lookupError } = await supabaseAdmin
      .from('delivery_tracking')
      .select('*, prescription_orders(patient_id)')
      .eq('id', deliveryId)
      .maybeSingle()
    if (lookupError) throw lookupError
    if (!current) return NextResponse.json({ error: 'Delivery not found.' }, { status: 404 })
    if (nextStatus === 'DELIVERED' && current.delivery_otp && otp !== current.delivery_otp) {
      return NextResponse.json({ error: 'Delivery OTP does not match.' }, { status: 409 })
    }

    const now = new Date().toISOString()
    const patch: Record<string, unknown> = {
      status: nextStatus,
      proof_of_delivery_url: proofOfDeliveryUrl || current.proof_of_delivery_url,
      failure_reason: failureReason || null,
      rescheduled_at: rescheduledAt || null,
      updated_at: now,
    }
    if (nextStatus === 'DELIVERED') patch.delivered_at = now
    if (nextStatus === 'FAILED') patch.failed_at = now

    const { data: delivery, error: updateError } = await supabaseAdmin
      .from('delivery_tracking')
      .update(patch)
      .eq('id', deliveryId)
      .select('*')
      .single()
    if (updateError) throw updateError

    if (nextStatus === 'OUT_FOR_DELIVERY' || nextStatus === 'DELIVERED') {
      await supabaseAdmin
        .from('prescription_orders')
        .update({
          status: nextStatus,
          updated_at: now,
          out_for_delivery_at: nextStatus === 'OUT_FOR_DELIVERY' ? now : undefined,
          delivered_at: nextStatus === 'DELIVERED' ? now : undefined,
        })
        .eq('id', current.order_id)
    }

    const patientId = current.prescription_orders?.patient_id
    if (patientId) {
      await createPatientNotification(patientId, 'Delivery update', `Your medicine delivery status is ${nextStatus.replaceAll('_', ' ')}.`)
    }

    await logPharmacyAudit({
      actorId: auth.user.id,
      actorRole: auth.role,
      action: 'DELIVERY_UPDATED',
      targetType: 'delivery_tracking',
      targetId: deliveryId,
      pharmacyId: auth.pharmacyId,
      metadata: { nextStatus, failureReason, rescheduledAt },
      request,
    })
    return NextResponse.json({ delivery })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal Server Error'
    const status = message === 'Forbidden' ? 403 : message === 'Unauthorized' ? 401 : 500
    return NextResponse.json({ error: message }, { status })
  }
}
