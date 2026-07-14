import { createHash } from 'crypto'
import { supabaseAdmin } from './supabaseServer'

export function canonicalPrescriptionData(prescription: Record<string, unknown>, items: Record<string, unknown>[]) {
  return {
    prescription_number: prescription.prescription_number,
    consultation_id: prescription.consultation_id,
    patient_id: prescription.patient_id,
    doctor_id: prescription.doctor_id,
    diagnosis: prescription.diagnosis,
    valid_until: prescription.valid_until,
    version: prescription.version,
    items: items.map((item) => ({
      medicine_name: item.medicine_name,
      generic_name: item.generic_name || null,
      brand_name: item.brand_name || null,
      strength: item.strength,
      dosage_form: item.dosage_form,
      dose: item.dose,
      route: item.route,
      frequency: item.frequency,
      duration_value: item.duration_value,
      duration_unit: item.duration_unit,
      quantity: item.quantity,
      food_instruction: item.food_instruction || null,
      special_instruction: item.special_instruction || null,
    })),
  }
}

export function sha256(input: string) {
  return createHash('sha256').update(input).digest('hex')
}

export function renderPrescriptionDocument(data: Record<string, unknown>) {
  const content = JSON.stringify(data, null, 2)
  return Buffer.from(`8liv Electronic Prescription\n\n${content}\n`, 'utf8')
}

export async function storePrescriptionPdf(prescriptionId: string, document: Buffer) {
  const path = `${prescriptionId}/signed-prescription.txt`
  const { error } = await supabaseAdmin.storage
    .from('prescription-documents')
    .upload(path, document, {
      contentType: 'text/plain; charset=utf-8',
      upsert: true,
    })
  if (error) throw error
  return path
}

export async function createSignedPrescriptionUrl(path: string, expiresInSeconds = 300) {
  const { data, error } = await supabaseAdmin.storage
    .from('prescription-documents')
    .createSignedUrl(path, expiresInSeconds)
  if (error) throw error
  if (!data?.signedUrl) throw new Error('Unable to create signed prescription URL.')
  return data.signedUrl
}
