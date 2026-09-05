import { supabaseAdmin } from './supabaseServer'
import { assertConsultationDoctorOwnership } from './fulfilmentAuth'
import { canonicalPrescriptionData, renderPrescriptionDocument, sha256, storePrescriptionPdf } from './prescriptionPdfService'

export type PrescriptionItemInput = {
  medicine_name: string
  generic_name?: string | null
  brand_name?: string | null
  strength: string
  dosage_form: string
  dose: string
  route: string
  frequency: string
  duration_value: number
  duration_unit: 'DAYS' | 'WEEKS' | 'MONTHS'
  quantity: number
  food_instruction?: string | null
  special_instruction?: string | null
}

export type PrescriptionInput = {
  diagnosis: string
  valid_until: string
  items: PrescriptionItemInput[]
}

function requireText(value: unknown, field: string) {
  const text = String(value || '').trim()
  if (!text) throw new Error(`${field} is required.`)
  return text
}

export function validatePrescriptionInput(body: any): PrescriptionInput {
  const items = Array.isArray(body?.items) ? body.items : []
  if (!items.length) throw new Error('At least one prescription item is required.')
  return {
    diagnosis: requireText(body?.diagnosis, 'Diagnosis'),
    valid_until: requireText(body?.valid_until, 'Prescription validity date'),
    items: items.map((item: any) => ({
      medicine_name: requireText(item.medicine_name, 'Medicine name'),
      generic_name: item.generic_name ? String(item.generic_name).trim() : null,
      brand_name: item.brand_name ? String(item.brand_name).trim() : null,
      strength: requireText(item.strength, 'Strength'),
      dosage_form: requireText(item.dosage_form, 'Dosage form'),
      dose: requireText(item.dose, 'Dose'),
      route: requireText(item.route, 'Route'),
      frequency: requireText(item.frequency, 'Frequency'),
      duration_value: Number(item.duration_value),
      duration_unit: requireText(item.duration_unit, 'Duration unit') as PrescriptionItemInput['duration_unit'],
      quantity: Number(item.quantity),
      food_instruction: item.food_instruction ? String(item.food_instruction).trim() : null,
      special_instruction: item.special_instruction ? String(item.special_instruction).trim() : null,
    })),
  }
}

export function validateItems(items: PrescriptionItemInput[]) {
  for (const item of items) {
    if (!Number.isFinite(item.duration_value) || item.duration_value <= 0) throw new Error('Duration must be greater than zero.')
    if (!['DAYS', 'WEEKS', 'MONTHS'].includes(item.duration_unit)) throw new Error('Duration unit is invalid.')
    if (!Number.isFinite(item.quantity) || item.quantity <= 0) throw new Error('Quantity must be greater than zero.')
  }
}

export function prescriptionNumber() {
  const stamp = new Date().toISOString().replace(/[-:.TZ]/g, '').slice(0, 14)
  const random = Math.random().toString(36).slice(2, 7).toUpperCase()
  return `8LIV-RX-${stamp}-${random}`
}

export async function createPrescription(consultationId: string, doctorId: string, input: PrescriptionInput) {
  validateItems(input.items)
  const consultation = await assertConsultationDoctorOwnership(consultationId, doctorId)

  // Find active treatment cycle if patient is enrolled in a duration program
  let cycleId: string | null = null
  try {
    const { data: activeCycle } = await supabaseAdmin
      .from('treatment_cycles')
      .select('id')
      .eq('patient_id', consultation.patient_id)
      .in('status', ['ACTIVE', 'UNDER_REVIEW', 'PENDING'])
      .order('cycle_number', { ascending: true })
      .limit(1)
      .maybeSingle()

    if (activeCycle?.id) {
      cycleId = activeCycle.id
    }
  } catch (cycleErr) {
    console.warn('[prescriptionService] Could not lookup active cycle:', cycleErr)
  }

  const { data: prescription, error } = await supabaseAdmin
    .from('prescriptions')
    .insert({
      prescription_number: prescriptionNumber(),
      consultation_id: consultation.id,
      patient_id: consultation.patient_id,
      doctor_id: doctorId,
      diagnosis: input.diagnosis,
      status: 'DRAFT',
      valid_until: input.valid_until,
      treatment_cycle_id: cycleId,
    })
    .select('*')
    .single()
  if (error) throw error

  const { error: itemError } = await supabaseAdmin
    .from('prescription_items')
    .insert(input.items.map((item) => ({ ...item, prescription_id: prescription.id })))
  if (itemError) throw itemError

  await audit({ prescriptionId: prescription.id, actorId: doctorId, actorRole: 'doctor', action: 'PRESCRIPTION_CREATED', newValues: { consultationId, cycleId } })
  return prescription
}

export async function updateDraftPrescription(prescriptionId: string, doctorId: string, input: PrescriptionInput) {
  validateItems(input.items)
  const { data: existing, error: lookupError } = await supabaseAdmin
    .from('prescriptions')
    .select('id, status')
    .eq('id', prescriptionId)
    .eq('doctor_id', doctorId)
    .maybeSingle()
  if (lookupError) throw lookupError
  if (!existing) throw new Error('Prescription not found for this doctor.')
  if (existing.status !== 'DRAFT') throw new Error('Only DRAFT prescriptions may be edited.')

  const { error } = await supabaseAdmin
    .from('prescriptions')
    .update({ diagnosis: input.diagnosis, valid_until: input.valid_until, updated_at: new Date().toISOString() })
    .eq('id', prescriptionId)
    .eq('doctor_id', doctorId)
    .eq('status', 'DRAFT')
  if (error) throw error

  const { error: deleteError } = await supabaseAdmin.from('prescription_items').delete().eq('prescription_id', prescriptionId)
  if (deleteError) throw deleteError
  const { error: itemError } = await supabaseAdmin.from('prescription_items').insert(input.items.map((item) => ({ ...item, prescription_id: prescriptionId })))
  if (itemError) throw itemError

  await audit({ prescriptionId, actorId: doctorId, actorRole: 'doctor', action: 'PRESCRIPTION_UPDATED' })
}

export async function signPrescription(prescriptionId: string, doctorId: string) {
  const { data: prescription, error } = await supabaseAdmin
    .from('prescriptions')
    .select('*, prescription_items(*)')
    .eq('id', prescriptionId)
    .eq('doctor_id', doctorId)
    .maybeSingle()
  if (error) throw error
  if (!prescription) throw new Error('Prescription not found for this doctor.')
  if (['SIGNED', 'ISSUED'].includes(prescription.status)) {
    const { data: existingOrder } = await supabaseAdmin.from('pharmacy_orders').select('*').eq('prescription_id', prescriptionId).maybeSingle()
    return { prescription, order: existingOrder, alreadySigned: true }
  }
  if (!['DRAFT', 'READY_FOR_REVIEW'].includes(prescription.status)) throw new Error('Prescription cannot be signed in its current status.')

  const items = prescription.prescription_items || []
  if (!items.length) throw new Error('At least one medicine is required before signing.')

  const consultation = await assertConsultationDoctorOwnership(prescription.consultation_id, doctorId)
  const consultationStatus = String(consultation.status || '').toLowerCase()
  if (['cancelled', 'cancelled_by_doctor', 'cancelled_by_patient', 'missed', 'missed_by_patient'].includes(consultationStatus)) {
    throw new Error('Consultation is not valid for prescribing.')
  }

  const canonical = canonicalPrescriptionData(prescription, items)
  const canonicalJson = JSON.stringify(canonical)
  const signatureHash = sha256(canonicalJson)
  const document = renderPrescriptionDocument({ ...canonical, signature_hash: signatureHash, issued_at: new Date().toISOString() })
  const pdfPath = await storePrescriptionPdf(prescriptionId, document)
  const now = new Date().toISOString()

  const { data: signed, error: updateError } = await supabaseAdmin
    .from('prescriptions')
    .update({
      status: 'ISSUED',
      issued_at: now,
      signed_pdf_path: pdfPath,
      signature_hash: signatureHash,
      canonical_data: canonical,
      updated_at: now,
    })
    .eq('id', prescriptionId)
    .eq('doctor_id', doctorId)
    .in('status', ['DRAFT', 'READY_FOR_REVIEW'])
    .select('*')
    .single()
  if (updateError) throw updateError

  // If associated with a treatment cycle, update cycle status to PRESCRIBED
  if (prescription.treatment_cycle_id) {
    try {
      await supabaseAdmin
        .from('treatment_cycles')
        .update({ status: 'PRESCRIBED', updated_at: now })
        .eq('id', prescription.treatment_cycle_id)
    } catch (cycleErr) {
      console.warn('[prescriptionService] Could not update cycle status to PRESCRIBED:', cycleErr)
    }
  }

  await supabaseAdmin.from('patient_notifications').insert({
    patient_id: prescription.patient_id,
    type: 'prescription_issued',
    title: 'Prescription issued',
    message: 'Your doctor has issued a signed prescription. Please confirm your delivery address to begin medication fulfillment.',
    is_read: false,
  })

  await audit({ prescriptionId, actorId: doctorId, actorRole: 'doctor', action: 'PRESCRIPTION_SIGNED', newValues: { signatureHash } })
  return { prescription: signed, alreadySigned: false }
}

export async function replacePrescription(prescriptionId: string, doctorId: string, input: PrescriptionInput) {
  validateItems(input.items)
  const { data: previous, error } = await supabaseAdmin
    .from('prescriptions')
    .select('*')
    .eq('id', prescriptionId)
    .eq('doctor_id', doctorId)
    .maybeSingle()
  if (error) throw error
  if (!previous) throw new Error('Prescription not found for this doctor.')
  if (!['SIGNED', 'ISSUED'].includes(previous.status)) throw new Error('Only signed prescriptions can be replaced.')

  const { error: replaceError } = await supabaseAdmin
    .from('prescriptions')
    .update({ status: 'REPLACED', updated_at: new Date().toISOString() })
    .eq('id', prescriptionId)
  if (replaceError) throw replaceError

  const next = await createPrescription(previous.consultation_id, doctorId, input)
  await supabaseAdmin.from('prescriptions').update({
    version: Number(previous.version || 1) + 1,
    supersedes_prescription_id: previous.id,
  }).eq('id', next.id)
  await audit({ prescriptionId: next.id, actorId: doctorId, actorRole: 'doctor', action: 'PRESCRIPTION_REPLACED', previousValues: { prescriptionId } })
  return next
}

export async function cancelPrescription(prescriptionId: string, doctorId: string, reason: string) {
  const { data, error } = await supabaseAdmin
    .from('prescriptions')
    .update({ status: 'CANCELLED', cancelled_at: new Date().toISOString(), cancellation_reason: reason || 'Cancelled by doctor' })
    .eq('id', prescriptionId)
    .eq('doctor_id', doctorId)
    .in('status', ['DRAFT', 'READY_FOR_REVIEW'])
    .select('id')
  if (error) throw error
  await audit({ prescriptionId, actorId: doctorId, actorRole: 'doctor', action: 'PRESCRIPTION_CANCELLED', reason })
}

export async function revokePrescription(prescriptionId: string, doctorId: string, reason: string) {
  const now = new Date().toISOString()
  const { data: rx, error: fetchErr } = await supabaseAdmin
    .from('prescriptions')
    .select('id, patient_id, status, treatment_cycle_id')
    .eq('id', prescriptionId)
    .eq('doctor_id', doctorId)
    .maybeSingle()

  if (fetchErr) throw fetchErr
  if (!rx) throw new Error('Prescription not found for this doctor.')
  if (!['SIGNED', 'ISSUED', 'ACTIVE'].includes(rx.status)) {
    throw new Error('Only signed or active prescriptions can be revoked. Use cancel for draft prescriptions.')
  }

  const { error } = await supabaseAdmin
    .from('prescriptions')
    .update({
      status: 'REVOKED',
      cancelled_at: now,
      cancellation_reason: reason || 'Revoked by doctor',
      updated_at: now,
    })
    .eq('id', prescriptionId)
    .eq('doctor_id', doctorId)

  if (error) throw error

  // Cancel any associated active pharmacy orders so partner pharmacy cannot fulfill a revoked prescription
  const { data: orders } = await supabaseAdmin
    .from('pharmacy_orders')
    .select('id, status')
    .eq('prescription_id', prescriptionId)

  if (orders && orders.length > 0) {
    for (const order of orders) {
      if (!['DELIVERED', 'CANCELLED', 'UNABLE_TO_FULFILL'].includes(order.status)) {
        await supabaseAdmin
          .from('pharmacy_orders')
          .update({
            status: 'CANCELLED',
            updated_at: now,
          })
          .eq('id', order.id)

        await supabaseAdmin.from('pharmacy_order_status_history').insert({
          pharmacy_order_id: order.id,
          previous_status: order.status,
          new_status: 'CANCELLED',
          changed_by: doctorId,
          reason: `Prescription revoked: ${reason}`,
        })
      }
    }
  }

  // If treatment cycle was associated, revert cycle status to ACTIVE so new prescription can be formulated
  if (rx.treatment_cycle_id) {
    await supabaseAdmin
      .from('treatment_cycles')
      .update({ status: 'ACTIVE', updated_at: now })
      .eq('id', rx.treatment_cycle_id)
  }

  // Notify patient
  await supabaseAdmin.from('patient_notifications').insert({
    patient_id: rx.patient_id,
    type: 'prescription_revoked',
    title: 'Prescription Revoked',
    message: `Your prescription has been revoked by your prescribing doctor: ${reason || 'Clinical adjustment required'}. Any pending pharmacy delivery has been halted.`,
    is_read: false,
  })

  await audit({
    prescriptionId,
    actorId: doctorId,
    actorRole: 'doctor',
    action: 'PRESCRIPTION_REVOKED',
    reason,
  })
}

export async function audit(input: {
  prescriptionId?: string | null
  pharmacyOrderId?: string | null
  actorId: string
  actorRole: string
  action: string
  previousValues?: Record<string, unknown> | null
  newValues?: Record<string, unknown> | null
  reason?: string | null
  request?: Request
}) {
  const ip = input.request?.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || input.request?.headers.get('x-real-ip') || null
  try {
    await supabaseAdmin.from('fulfilment_audit_logs').insert({
      prescription_id: input.prescriptionId || null,
      pharmacy_order_id: input.pharmacyOrderId || null,
      actor_id: input.actorId,
      actor_role: input.actorRole,
      action: input.action,
      previous_values: input.previousValues || null,
      new_values: input.newValues || null,
      reason: input.reason || null,
      ip_address: ip,
      user_agent: input.request?.headers.get('user-agent') || null,
      request_id: input.request?.headers.get('x-request-id') || null,
    })
  } catch (err: any) {
    console.warn('[audit] failed to write fulfilment_audit_logs entry:', err?.message)
  }
}
