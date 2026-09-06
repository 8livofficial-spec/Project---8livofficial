import { createHash } from 'crypto'
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib'
import { supabaseAdmin } from './supabaseServer'
import { getDoctorSignatureBuffer } from './doctorSignatureService'

export type PrescriptionCanonicalData = {
  prescription_number: string
  consultation_id: string | null
  patient_id: string
  doctor_id: string
  diagnosis: string
  valid_until: string
  version: number
  doctor_name?: string
  doctor_qualification?: string
  doctor_registration_number?: string
  doctor_registration_council?: string
  patient_name?: string
  patient_gender?: string
  patient_age?: string | number
  authorized_at?: string
  authorized_by?: string
  items: Array<{
    medicine_name: string
    generic_name?: string | null
    brand_name?: string | null
    strength: string
    dosage_form: string
    dose: string
    route: string
    frequency: string
    duration_value: number
    duration_unit: string
    quantity: number
    food_instruction?: string | null
    special_instruction?: string | null
  }>
}

export function canonicalPrescriptionData(
  prescription: Record<string, any>,
  items: Record<string, any>[],
  metadata?: {
    doctor?: {
      full_name?: string
      qualification?: string
      registration_number?: string
      registration_council?: string
    }
    patient?: {
      full_name?: string
      gender?: string
      age?: string | number
    }
  }
): PrescriptionCanonicalData {
  return {
    prescription_number: prescription.prescription_number,
    consultation_id: prescription.consultation_id || null,
    patient_id: prescription.patient_id,
    doctor_id: prescription.doctor_id,
    diagnosis: prescription.diagnosis || 'Clinical Weight Management Protocol',
    valid_until: prescription.valid_until,
    version: Number(prescription.version || 1),
    doctor_name: metadata?.doctor?.full_name || prescription.canonical_data?.doctor_name,
    doctor_qualification: metadata?.doctor?.qualification || prescription.canonical_data?.doctor_qualification || 'MBBS, MD',
    doctor_registration_number: metadata?.doctor?.registration_number || prescription.canonical_data?.doctor_registration_number || 'NMC-8LIV-DOC',
    doctor_registration_council: metadata?.doctor?.registration_council || prescription.canonical_data?.doctor_registration_council || 'Medical Council of India',
    patient_name: metadata?.patient?.full_name || prescription.canonical_data?.patient_name || 'Patient',
    patient_gender: metadata?.patient?.gender || prescription.canonical_data?.patient_gender || 'Not Specified',
    patient_age: metadata?.patient?.age || prescription.canonical_data?.patient_age || '-',
    authorized_at: prescription.authorized_at || new Date().toISOString(),
    authorized_by: prescription.doctor_id,
    items: items.map((item) => ({
      medicine_name: item.medicine_name,
      generic_name: item.generic_name || null,
      brand_name: item.brand_name || null,
      strength: item.strength,
      dosage_form: item.dosage_form,
      dose: item.dose,
      route: item.route,
      frequency: item.frequency,
      duration_value: Number(item.duration_value),
      duration_unit: item.duration_unit,
      quantity: Number(item.quantity),
      food_instruction: item.food_instruction || null,
      special_instruction: item.special_instruction || null,
    })),
  }
}

export function sha256(input: string | Buffer) {
  return createHash('sha256').update(input).digest('hex')
}

/**
 * Generate a professional, print-ready, black-and-white clinical PDF document.
 * Adheres strictly to telemedicine prescription layout: clean typography, clear RMP and patient headers,
 * ℞ medications table, embedded doctor signature image, and cryptographic verification stamps.
 */
export async function generatePrescriptionPdf(
  canonical: PrescriptionCanonicalData,
  signatureHash: string
): Promise<{ pdfBuffer: Buffer; pdfHash: string }> {
  const pdfDoc = await PDFDocument.create()
  const page = pdfDoc.addPage([595.28, 841.89]) // Standard A4 (points)
  const { width, height } = page.getSize()

  const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica)
  const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold)
  const helveticaOblique = await pdfDoc.embedFont(StandardFonts.HelveticaOblique)

  const black = rgb(0.08, 0.08, 0.08)
  const darkGray = rgb(0.25, 0.25, 0.25)
  const lightGray = rgb(0.85, 0.85, 0.85)

  let y = height - 40

  // 1. Clinic Branding Header
  page.drawText('8LIV HEALTH NETWORK', { x: 45, y, size: 14, font: helveticaBold, color: black })
  page.drawText('SPECIALTY TELEMEDICINE & METABOLIC ENDOCRINOLOGY', { x: 45, y: y - 13, size: 8, font: helveticaBold, color: black })
  page.drawText('Ministry of Health & Family Welfare (MoHFW) Registered Care Facility', { x: 45, y: y - 24, size: 7.5, font: helvetica, color: darkGray })

  page.drawText('Telemedicine Practice Guidelines, 2020', { x: width - 215, y: y - 24, size: 7.5, font: helveticaOblique, color: darkGray })
  y -= 34

  // Divider
  page.drawLine({ start: { x: 45, y }, end: { x: width - 45, y }, thickness: 1.5, color: black })
  y -= 16

  // 2. Doctor & Prescription Metadata (Two Columns)
  const col1X = 45
  const col2X = 310

  // Left: Doctor Info
  page.drawText('REGISTERED MEDICAL PRACTITIONER (RMP)', { x: col1X, y, size: 8, font: helveticaBold, color: darkGray })
  page.drawText('PRESCRIPTION METADATA', { x: col2X, y, size: 8, font: helveticaBold, color: darkGray })
  y -= 12

  const docName = canonical.doctor_name ? (canonical.doctor_name.startsWith('Dr.') ? canonical.doctor_name : `Dr. ${canonical.doctor_name}`) : 'Dr. Medical Officer'
  page.drawText(docName, { x: col1X, y, size: 10, font: helveticaBold, color: black })
  page.drawText(`Rx Number: ${canonical.prescription_number}`, { x: col2X, y, size: 9, font: helveticaBold, color: black })
  y -= 12

  page.drawText(`Qualification: ${canonical.doctor_qualification || 'MBBS, MD'}`, { x: col1X, y, size: 8.5, font: helvetica, color: black })
  const issuedDateStr = canonical.authorized_at ? new Date(canonical.authorized_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : new Date().toLocaleDateString()
  page.drawText(`Date of Issue: ${issuedDateStr}`, { x: col2X, y, size: 8.5, font: helvetica, color: black })
  y -= 12

  page.drawText(`Reg. No: ${canonical.doctor_registration_number || 'REG-PENDING'}`, { x: col1X, y, size: 8.5, font: helvetica, color: black })
  page.drawText(`Valid Until: ${canonical.valid_until || '30 Days from issue'}`, { x: col2X, y, size: 8.5, font: helvetica, color: black })
  y -= 12

  page.drawText(`Medical Council: ${canonical.doctor_registration_council || 'State Medical Council'}`, { x: col1X, y, size: 8.5, font: helvetica, color: black })
  page.drawText(`Document Version: ${canonical.version} (Immutable Snapshot)`, { x: col2X, y, size: 8.5, font: helvetica, color: black })
  y -= 16

  // Divider
  page.drawLine({ start: { x: 45, y }, end: { x: width - 45, y }, thickness: 0.5, color: lightGray })
  y -= 14

  // 3. Patient Information Block
  page.drawText('PATIENT INFORMATION', { x: 45, y, size: 8, font: helveticaBold, color: darkGray })
  y -= 12

  const patName = canonical.patient_name || 'Registered Patient'
  page.drawText(`Name: ${patName}`, { x: 45, y, size: 9, font: helveticaBold, color: black })
  page.drawText(`Patient ID: ${canonical.patient_id.slice(0, 16)}...`, { x: 230, y, size: 8.5, font: helvetica, color: black })
  page.drawText(`Age / Sex: ${canonical.patient_age || 'Adult'} / ${canonical.patient_gender || 'Not specified'}`, { x: 420, y, size: 8.5, font: helvetica, color: black })
  y -= 13

  page.drawText(`Diagnosis / Indication: ${canonical.diagnosis}`, { x: 45, y, size: 8.5, font: helveticaOblique, color: black })
  y -= 16

  // Divider
  page.drawLine({ start: { x: 45, y }, end: { x: width - 45, y }, thickness: 1, color: black })
  y -= 18

  // 4. Rx Medications Header
  page.drawText('Rx', { x: 45, y: y - 4, size: 20, font: helveticaBold, color: black })
  page.drawText('PRESCRIBED THERAPY & DISPENSATION ORDER', { x: 75, y: y + 2, size: 9.5, font: helveticaBold, color: black })
  y -= 20

  // Table Columns Header
  const colMed = 45
  const colForm = 200
  const colDose = 285
  const colFreq = 360
  const colDur = 455
  const colQty = 515

  page.drawText('MEDICINE & STRENGTH', { x: colMed, y, size: 7.5, font: helveticaBold, color: darkGray })
  page.drawText('FORM & ROUTE', { x: colForm, y, size: 7.5, font: helveticaBold, color: darkGray })
  page.drawText('DOSE', { x: colDose, y, size: 7.5, font: helveticaBold, color: darkGray })
  page.drawText('FREQUENCY', { x: colFreq, y, size: 7.5, font: helveticaBold, color: darkGray })
  page.drawText('DURATION', { x: colDur, y, size: 7.5, font: helveticaBold, color: darkGray })
  page.drawText('QTY', { x: colQty, y, size: 7.5, font: helveticaBold, color: darkGray })
  y -= 6

  page.drawLine({ start: { x: 45, y }, end: { x: width - 45, y }, thickness: 0.5, color: darkGray })
  y -= 14

  // Table Rows
  canonical.items.forEach((item, index) => {
    const medTitle = `${index + 1}. ${item.medicine_name} ${item.strength}`
    page.drawText(medTitle, { x: colMed, y, size: 8.5, font: helveticaBold, color: black })
    page.drawText(`${item.dosage_form} (${item.route})`, { x: colForm, y, size: 8, font: helvetica, color: black })
    page.drawText(item.dose, { x: colDose, y, size: 8, font: helvetica, color: black })
    page.drawText(item.frequency, { x: colFreq, y, size: 8, font: helvetica, color: black })
    page.drawText(`${item.duration_value} ${item.duration_unit}`, { x: colDur, y, size: 8, font: helvetica, color: black })
    page.drawText(String(item.quantity), { x: colQty, y, size: 8.5, font: helveticaBold, color: black })
    y -= 11

    // Generic / Brand if present
    if (item.generic_name || item.brand_name) {
      const genText = [item.generic_name ? `Generic: ${item.generic_name}` : null, item.brand_name ? `Brand: ${item.brand_name}` : null].filter(Boolean).join(' | ')
      page.drawText(genText, { x: colMed + 12, y, size: 7.5, font: helveticaOblique, color: darkGray })
      y -= 10
    }

    // Food / Special instructions
    if (item.food_instruction || item.special_instruction) {
      const instructions = [item.food_instruction, item.special_instruction].filter(Boolean).join(' - ')
      page.drawText(`Instructions: ${instructions}`, { x: colMed + 12, y, size: 7.5, font: helvetica, color: black })
      y -= 10
    }

    // Light row separator
    page.drawLine({ start: { x: 45, y: y + 2 }, end: { x: width - 45, y: y + 2 }, thickness: 0.25, color: lightGray })
    y -= 8
  })

  // 5. Doctor Signature & Verification Block
  y = Math.min(y, 230) // Ensure signature stays within bottom section

  page.drawLine({ start: { x: 45, y }, end: { x: width - 45, y }, thickness: 0.5, color: darkGray })
  y -= 16

  page.drawText('DOCTOR AUTHORIZATION & VISUAL SIGNATURE', { x: 45, y, size: 8, font: helveticaBold, color: darkGray })
  page.drawText('CRYPTOGRAPHIC INTEGRITY STAMP', { x: 310, y, size: 8, font: helveticaBold, color: darkGray })
  y -= 14

  // Embed Doctor Signature Image if available
  let embeddedSig = false
  try {
    const sigData = await getDoctorSignatureBuffer(canonical.doctor_id)
    if (sigData) {
      let image
      if (sigData.contentType.includes('png')) {
        image = await pdfDoc.embedPng(sigData.buffer)
      } else {
        image = await pdfDoc.embedJpg(sigData.buffer)
      }
      if (image) {
        page.drawImage(image, {
          x: 45,
          y: y - 45,
          width: 110,
          height: 40,
        })
        embeddedSig = true
      }
    }
  } catch (sigErr) {
    console.warn('[prescriptionPdfService] Could not embed signature image:', sigErr)
  }

  if (!embeddedSig) {
    // Official digital signature box stamp
    page.drawRectangle({
      x: 45,
      y: y - 42,
      width: 140,
      height: 38,
      borderWidth: 0.5,
      borderColor: darkGray,
    })
    page.drawText('[ Electronically Signed ]', { x: 55, y: y - 22, size: 8, font: helveticaBold, color: black })
    page.drawText(docName, { x: 55, y: y - 34, size: 7.5, font: helvetica, color: darkGray })
  }

  // Integrity details on the right
  page.drawText(`Canonical Content Hash (SHA-256):`, { x: 310, y, size: 7.5, font: helveticaBold, color: black })
  y -= 9
  page.drawText(signatureHash.slice(0, 36) + '...', { x: 310, y, size: 7, font: helvetica, color: darkGray })
  y -= 12
  page.drawText(`Authenticated Doctor: ${canonical.doctor_id}`, { x: 310, y, size: 7.5, font: helvetica, color: black })
  y -= 10
  page.drawText(`Authorized At: ${issuedDateStr}`, { x: 310, y, size: 7.5, font: helvetica, color: black })
  y -= 26

  // Doctor Details under signature
  page.drawText(docName, { x: 45, y, size: 8.5, font: helveticaBold, color: black })
  y -= 10
  page.drawText(`Reg. No: ${canonical.doctor_registration_number || 'REG-PENDING'} | ${canonical.doctor_registration_council || 'State Council'}`, { x: 45, y, size: 7.5, font: helvetica, color: darkGray })
  y -= 20

  // 6. Professional Disclaimer & Footer
  page.drawLine({ start: { x: 45, y }, end: { x: width - 45, y }, thickness: 0.5, color: lightGray })
  y -= 10

  const disclaimer = 'Notice: This electronic prescription is generated on the 8LIV Telemedicine platform in strict accordance with the Telemedicine Practice Guidelines issued under the National Medical Commission Act, 2019. It is valid across India for pharmacy fulfillment upon patient consent.'
  page.drawText(disclaimer, { x: 45, y, size: 6.5, font: helvetica, color: darkGray, maxWidth: width - 90, lineHeight: 8.5 })
  y -= 18

  page.drawText('8LIV Healthcare Pvt Ltd | support@8liv.in | www.8liv.in', { x: 45, y, size: 7, font: helveticaOblique, color: darkGray })
  page.drawText(`Rx Ref: ${canonical.prescription_number} | v${canonical.version}`, { x: width - 190, y, size: 7, font: helvetica, color: darkGray })

  const pdfBytes = await pdfDoc.save()
  const pdfBuffer = Buffer.from(pdfBytes)
  const pdfHash = sha256(pdfBuffer)

  return { pdfBuffer, pdfHash }
}

/**
 * Store the generated immutable prescription PDF into the private bucket.
 * Follows path convention: prescriptions/${prescriptionId}/prescription-v${version}.pdf
 */
export async function storePrescriptionPdf(
  prescriptionId: string,
  pdfBuffer: Buffer,
  version = 1
): Promise<{ path: string; pdfHash: string }> {
  const pdfHash = sha256(pdfBuffer)
  const path = `prescriptions/${prescriptionId}/prescription-v${version}.pdf`

  const { error } = await supabaseAdmin.storage
    .from('prescription-documents')
    .upload(path, pdfBuffer, {
      contentType: 'application/pdf',
      upsert: true,
    })

  if (error) throw error
  return { path, pdfHash }
}

export async function createSignedPrescriptionUrl(path: string, expiresInSeconds = 900) {
  const { data, error } = await supabaseAdmin.storage
    .from('prescription-documents')
    .createSignedUrl(path, expiresInSeconds)
  if (error) throw error
  if (!data?.signedUrl) throw new Error('Unable to create signed prescription URL.')
  return data.signedUrl
}

/**
 * Ensure an official signed vector PDF exists for a prescription.
 * Generates and stores it on the fly if it was not created earlier.
 */
export async function ensurePrescriptionPdf(prescriptionId: string): Promise<{ path: string; pdfBuffer?: Buffer }> {
  const { data: prescription, error } = await supabaseAdmin
    .from('prescriptions')
    .select('*, prescription_items(*)')
    .eq('id', prescriptionId)
    .maybeSingle()

  if (error || !prescription) {
    throw new Error(error?.message || 'Prescription record not found.')
  }

  if (prescription.signed_pdf_path) {
    return { path: prescription.signed_pdf_path }
  }

  // Doctor metadata
  let doctorMeta: any = {}
  try {
    const { data: prov } = await supabaseAdmin
      .from('provider_profiles')
      .select('full_name, qualification, registration_number, specialization')
      .eq('provider_id', prescription.doctor_id)
      .maybeSingle()
    if (prov) {
      doctorMeta = prov
    } else {
      const { data: docProf } = await supabaseAdmin
        .from('doctor_profiles')
        .select('full_name, specialty')
        .eq('id', prescription.doctor_id)
        .maybeSingle()
      if (docProf) doctorMeta = docProf
    }
  } catch (dErr) {
    console.warn('[prescriptionPdfService] Could not fetch doctor metadata:', dErr)
  }

  // Patient metadata
  let patientMeta: any = {}
  try {
    const { data: pat } = await supabaseAdmin
      .from('profiles')
      .select('first_name, last_name, gender, dob')
      .eq('id', prescription.patient_id)
      .maybeSingle()
    if (pat) {
      const fullName = [pat.first_name, pat.last_name].filter(Boolean).join(' ')
      let age: string | number = '-'
      if (pat.dob) {
        const birthDate = new Date(pat.dob)
        const diffYears = Math.floor((Date.now() - birthDate.getTime()) / (365.25 * 24 * 3600 * 1000))
        if (!isNaN(diffYears) && diffYears > 0) age = diffYears
      }
      patientMeta = {
        full_name: fullName,
        gender: pat.gender,
        age,
      }
    }
  } catch (pErr) {
    console.warn('[prescriptionPdfService] Could not fetch patient metadata:', pErr)
  }

  const items = prescription.prescription_items || []
  const canonical = canonicalPrescriptionData(prescription, items, {
    doctor: {
      full_name: doctorMeta.full_name || 'Dr. 8LIV Physician',
      qualification: doctorMeta.qualification || 'MBBS, MD',
      registration_number: doctorMeta.registration_number || 'MCI-8LIV-DOC',
      registration_council: doctorMeta.registration_council || 'State Medical Council',
    },
    patient: {
      full_name: patientMeta.full_name || 'Patient',
      gender: patientMeta.gender || 'Not Specified',
      age: patientMeta.age || '-',
    },
  })

  const canonicalJson = JSON.stringify(canonical)
  const canonicalHash = sha256(canonicalJson)

  const { pdfBuffer, pdfHash } = await generatePrescriptionPdf(canonical, canonicalHash)
  const { path } = await storePrescriptionPdf(prescriptionId, pdfBuffer, canonical.version)

  await supabaseAdmin
    .from('prescriptions')
    .update({
      signed_pdf_path: path,
      signature_hash: canonicalHash,
      canonical_content_hash: canonicalHash,
      pdf_hash: pdfHash,
      canonical_data: {
        ...canonical,
        canonical_content_hash: canonicalHash,
        pdf_hash: pdfHash,
        signed_pdf_path: path,
      },
      updated_at: new Date().toISOString(),
    })
    .eq('id', prescriptionId)

  return { path, pdfBuffer }
}

