import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseServer'
import { assertPharmacyAccess, logPharmacyAudit, parsePagination } from '@/lib/pharmacy'

export async function GET(request: Request) {
  try {
    await assertPharmacyAccess(request)
    const { from, to, page, limit } = parsePagination(request.url)

    const { data, error, count } = await supabaseAdmin
      .from('doctor_consultations')
      .select('id, patient_id, doctor_id, status, prescription_text, prescription_notes, prescription_type, created_at', { count: 'exact' })
      .in('status', ['approved', 'completed'])
      .not('prescription_type', 'is', null)
      .order('created_at', { ascending: false })
      .range(from, to)

    if (error) throw error

    const consultationIds = (data || []).map((row) => row.id)
    const [{ data: orders }, { data: profiles }, { data: doctors }] = await Promise.all([
      consultationIds.length
        ? supabaseAdmin.from('prescription_orders').select('id, consultation_id, status, order_number').in('consultation_id', consultationIds)
        : Promise.resolve({ data: [] as Record<string, unknown>[] }),
      data?.length
        ? supabaseAdmin.from('profiles').select('id, first_name, last_name, email').in('id', Array.from(new Set(data.map((row) => row.patient_id))))
        : Promise.resolve({ data: [] as Record<string, unknown>[] }),
      data?.length
        ? supabaseAdmin.from('doctor_profiles').select('id, full_name').in('id', Array.from(new Set(data.map((row) => row.doctor_id).filter(Boolean))))
        : Promise.resolve({ data: [] as Record<string, unknown>[] }),
    ])

    return NextResponse.json({
      prescriptions: (data || []).map((row) => ({
        ...row,
        order: (orders || []).find((order) => order.consultation_id === row.id) || null,
        patient: (profiles || []).find((profile) => profile.id === row.patient_id) || null,
        doctor: (doctors || []).find((doctor) => doctor.id === row.doctor_id) || null,
      })),
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
    const auth = await assertPharmacyAccess(request)
    const body = await request.json().catch(() => ({}))
    const { orderId, action, reason } = body
    if (!orderId || !['accept', 'reject'].includes(action)) {
      return NextResponse.json({ error: 'orderId and action are required.' }, { status: 400 })
    }

    const nextStatus = action === 'accept' ? 'PHARMACY_ACCEPTED' : 'CANCELLED'
    const now = new Date().toISOString()
    const { data: order, error } = await supabaseAdmin
      .from('prescription_orders')
      .update({
        status: nextStatus,
        updated_at: now,
        pharmacy_accepted_at: action === 'accept' ? now : null,
        cancelled_at: action === 'reject' ? now : null,
      })
      .eq('id', orderId)
      .select('*')
      .single()

    if (error) throw error
    await logPharmacyAudit({
      actorId: auth.user.id,
      actorRole: auth.role,
      action: action === 'accept' ? 'PRESCRIPTION_ACCEPTED' : 'PRESCRIPTION_REJECTED',
      targetType: 'prescription_order',
      targetId: orderId,
      pharmacyId: auth.pharmacyId,
      metadata: { reason },
      request,
    })

    return NextResponse.json({ order })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal Server Error'
    const status = message === 'Forbidden' ? 403 : message === 'Unauthorized' ? 401 : 500
    return NextResponse.json({ error: message }, { status })
  }
}
