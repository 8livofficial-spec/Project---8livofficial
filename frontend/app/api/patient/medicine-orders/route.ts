import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseServer'
import {
  assertPatientAccess,
  createPatientNotification,
  getOrderNumber,
  logPharmacyAudit,
  parsePagination,
} from '@/lib/pharmacy'

function splitPrescriptionItems(text?: string | null) {
  const lines = String(text || '')
    .split(/\n|,/)
    .map((line) => line.trim())
    .filter(Boolean)

  return (lines.length ? lines : ['Prescribed medicine']).map((line) => ({
    medicine_name: line,
    dosage: null,
    duration: null,
    quantity: 1,
    unit_price: 0,
    line_total: 0,
  }))
}

export async function GET(request: Request) {
  try {
    const auth = await assertPatientAccess(request)
    const { params, from, to, page, limit } = parsePagination(request.url)
    const patientId = params.get('patientId') || auth.user.id

    if (auth.role !== 'admin' && patientId !== auth.user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const status = params.get('status')
    let query = supabaseAdmin
      .from('prescription_orders')
      .select('*, prescription_order_items(*)', { count: 'exact' })
      .eq('patient_id', patientId)
      .order('created_at', { ascending: false })

    if (status) query = query.eq('status', status)

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

export async function POST(request: Request) {
  try {
    const auth = await assertPatientAccess(request)
    const body = await request.json().catch(() => ({}))
    const { consultationId, deliveryAddress, useInsurance = false } = body

    if (!consultationId || !deliveryAddress) {
      return NextResponse.json({ error: 'consultationId and deliveryAddress are required.' }, { status: 400 })
    }

    const { data: consultation, error: consultationError } = await supabaseAdmin
      .from('doctor_consultations')
      .select('id, patient_id, doctor_id, status, prescription_text, prescription_notes, prescription_type, created_at')
      .eq('id', consultationId)
      .maybeSingle()

    if (consultationError) throw consultationError
    if (!consultation) return NextResponse.json({ error: 'Prescription not found.' }, { status: 404 })
    if (auth.role !== 'admin' && consultation.patient_id !== auth.user.id) {
      return NextResponse.json({ error: 'Prescription does not belong to this patient.' }, { status: 403 })
    }
    if (!['approved', 'completed'].includes(String(consultation.status || '').toLowerCase())) {
      return NextResponse.json({ error: 'Prescription is not active for ordering.' }, { status: 409 })
    }
    if (!consultation.prescription_text && !consultation.prescription_type) {
      return NextResponse.json({ error: 'No medicine was prescribed for this consultation.' }, { status: 409 })
    }

    const prescriptionDate = new Date(consultation.created_at || Date.now())
    const expiresAt = new Date(prescriptionDate.getTime() + 30 * 24 * 60 * 60 * 1000)
    if (expiresAt.getTime() < Date.now()) {
      return NextResponse.json({ error: 'Prescription has expired.' }, { status: 409 })
    }

    const { data: doctorProfile, error: doctorError } = await supabaseAdmin
      .from('doctor_profiles')
      .select('id')
      .eq('id', consultation.doctor_id)
      .maybeSingle()
    if (doctorError) throw doctorError
    if (!doctorProfile?.id) {
      return NextResponse.json({ error: 'Doctor verification is required before fulfillment.' }, { status: 409 })
    }

    const { data: duplicate, error: duplicateError } = await supabaseAdmin
      .from('prescription_orders')
      .select('id, order_number, status')
      .eq('consultation_id', consultationId)
      .neq('status', 'CANCELLED')
      .maybeSingle()
    if (duplicateError) throw duplicateError
    if (duplicate?.id) {
      return NextResponse.json({ error: 'This prescription already has an active medicine order.', order: duplicate }, { status: 409 })
    }

    const now = new Date().toISOString()
    const { data: order, error: orderError } = await supabaseAdmin
      .from('prescription_orders')
      .insert({
        order_number: getOrderNumber(),
        consultation_id: consultation.id,
        patient_id: consultation.patient_id,
        doctor_id: consultation.doctor_id,
        status: 'ORDER_PLACED',
        status_history: [{ status: 'ORDER_PLACED', at: now, actor_id: auth.user.id, actor_role: auth.role }],
        order_placed_at: now,
        delivery_address: deliveryAddress,
        use_insurance: Boolean(useInsurance),
        prescription_snapshot: {
          prescription_text: consultation.prescription_text,
          prescription_notes: consultation.prescription_notes,
          prescription_type: consultation.prescription_type,
        },
      })
      .select('*')
      .single()

    if (orderError) throw orderError

    const items = splitPrescriptionItems(consultation.prescription_text || consultation.prescription_type).map((item) => ({
      ...item,
      order_id: order.id,
    }))
    const { error: itemsError } = await supabaseAdmin.from('prescription_order_items').insert(items)
    if (itemsError) throw itemsError

    await createPatientNotification(
      consultation.patient_id,
      'Medicine order placed',
      `Your 8liv Pharmacy order ${order.order_number} has been created and is waiting for verification.`,
    )
    await logPharmacyAudit({
      actorId: auth.user.id,
      actorRole: auth.role,
      action: 'ORDER_CREATED',
      targetType: 'prescription_order',
      targetId: order.id,
      metadata: { consultationId },
      request,
    })

    return NextResponse.json({ order }, { status: 201 })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal Server Error'
    const status = message === 'Forbidden' ? 403 : message === 'Unauthorized' ? 401 : 500
    return NextResponse.json({ error: message }, { status })
  }
}
