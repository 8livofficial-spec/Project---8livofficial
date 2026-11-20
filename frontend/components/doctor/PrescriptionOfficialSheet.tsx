'use client'

import React from 'react'

export interface PrescriptionItemDisplay {
  medicine_name: string
  generic_name?: string
  brand_name?: string
  strength?: string
  dosage_form?: string
  dose?: string
  route?: string
  frequency?: string
  duration_value?: number | string
  duration_unit?: string
  quantity?: number | string
  food_instruction?: string
  special_instruction?: string
}

export interface PrescriptionVitals {
  weight_kg?: number | string
  height_cm?: number | string
  bmi?: number | string
  bp?: string
}

export interface PrescriptionOfficialSheetProps {
  patientName?: string
  patientId?: string
  patientAge?: string | number
  patientGender?: string
  patientPhone?: string
  patientAddress?: string
  vitals?: PrescriptionVitals
  chiefComplaints?: string | string[]
  clinicalFindings?: string | string[]
  prescriptionMode?: 'PRESCRIPTION' | 'INFORMATION_ONLY'
  followUpDate?: string
  prescriptionNumber?: string
  dateIssued?: string
  validUntil?: string
  diagnosis?: string
  items?: PrescriptionItemDisplay[]
  adviceNotes?: string
  doctorName?: string
  specialty?: string
  qualification?: string
  registrationNumber?: string
  registrationCouncil?: string
  signatureUrl?: string | null
  signatureHash?: string | null
  isDraftPreview?: boolean
  className?: string
}

export default function PrescriptionOfficialSheet({
  patientName = 'Patient',
  patientId,
  patientAge,
  patientGender,
  patientPhone,
  patientAddress,
  vitals,
  chiefComplaints,
  clinicalFindings,
  prescriptionMode = 'PRESCRIPTION',
  followUpDate,
  prescriptionNumber = '8LIV-RX-DRAFT',
  dateIssued,
  validUntil,
  diagnosis = 'Medical Weight Management Protocol — Overweight with Metabolic Risk Factors (BMI >= 27)',
  items = [],
  adviceNotes,
  doctorName = 'Dr. SJ',
  specialty = 'Physician',
  qualification = 'MBBS, MD',
  registrationNumber = 'MMC 2018',
  registrationCouncil = 'State Medical Council',
  signatureUrl = null,
  isDraftPreview = false,
  className = '',
}: PrescriptionOfficialSheetProps) {
  const formattedDateIssued = dateIssued
    ? new Date(dateIssued).toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      })
    : new Date().toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      })

  const formattedFollowUpDate = followUpDate
    ? new Date(followUpDate).toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      })
    : (() => {
        const d = new Date()
        d.setDate(d.getDate() + 28)
        return d.toLocaleDateString('en-IN', {
          day: '2-digit',
          month: 'short',
          year: 'numeric',
        })
      })()

  // Format complaints & findings into string arrays
  const parsedComplaints: string[] = Array.isArray(chiefComplaints)
    ? chiefComplaints
    : chiefComplaints
      ? chiefComplaints.split(/\n|;/).map((s) => s.trim().replace(/^[-*•]\s*/, '')).filter(Boolean)
      : ['Weight management evaluation & metabolic review', 'Sluggish metabolic rate & daytime fatigue']

  const parsedFindings: string[] = Array.isArray(clinicalFindings)
    ? clinicalFindings
    : clinicalFindings
      ? clinicalFindings.split(/\n|;/).map((s) => s.trim().replace(/^[-*•]\s*/, '')).filter(Boolean)
      : ['Elevated BMI (>= 27) with central adiposity', 'Target candidate for supervised clinical metabolic care']

  // Format advice into list items
  const parsedAdvice: string[] = adviceNotes
    ? adviceNotes
        .split('\n')
        .map((s) => s.trim().replace(/^\d+[\.\)]\s*|^[-*•]\s*/, ''))
        .filter(Boolean)
    : [
        'Maintain minimum 2.5 to 3.0 Litres of water daily.',
        'Follow tailored Indian high-protein meal progression (Roti, Dal, Sabzi).',
        'Avoid high-glycemic ultra-processed snacks and refined sugars.',
        'Report any persistent nausea, vomiting, or abdominal discomfort immediately.',
        'Schedule follow-up review for metabolic calibration.',
      ]

  const resolvedDocName = doctorName.startsWith('Dr.') ? doctorName : `Dr. ${doctorName}`
  const resolvedPatientId = patientId || (prescriptionNumber.startsWith('8LIV-') ? `PAT-${prescriptionNumber.slice(-8)}` : 'PAT-8LIV')
  const resolvedAge = patientAge && patientAge !== '-' ? patientAge : 'Adult'
  const resolvedGender = patientGender ? (patientGender.toLowerCase().startsWith('m') ? 'M' : patientGender.toLowerCase().startsWith('f') ? 'F' : patientGender) : 'M'
  const resolvedPhone = patientPhone || 'Registered Mobile'
  const resolvedAddress = patientAddress && patientAddress.trim() ? patientAddress : 'Address on verified patient record'

  const resolvedWeight = vitals?.weight_kg || '78'
  const resolvedHeight = vitals?.height_cm || '168'
  const resolvedBmi = vitals?.bmi || (vitals?.weight_kg && vitals?.height_cm ? (Number(vitals.weight_kg) / Math.pow(Number(vitals.height_cm) / 100, 2)).toFixed(2) : '27.60')
  const resolvedBp = vitals?.bp || '120/80 mmHg'

  const isInfoOnly = prescriptionMode === 'INFORMATION_ONLY' || (!items.length && prescriptionMode !== 'PRESCRIPTION')

  return (
    <div
      className={`relative bg-white text-black font-sans shadow-lg border border-slate-300 p-6 sm:p-10 max-w-[850px] mx-auto select-none print:shadow-none print:border-none print:p-0 ${className}`}
      style={{ minHeight: '1050px' }}
    >
      {/* Live Preview Indicator */}
      {isDraftPreview && (
        <div className="mb-4 flex items-center justify-between rounded-lg border border-amber-300 bg-amber-50/80 px-3 py-1.5 text-xs text-amber-900 print:hidden">
          <span className="flex items-center gap-1.5 font-bold">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            Standard OPD E-Prescription (Clean B&amp;W Medical Format)
          </span>
          <span className="text-[11px] font-semibold text-amber-800">
            {isInfoOnly ? 'Mode: Information Only' : 'Mode: Medication Prescription'}
          </span>
        </div>
      )}

      {/* ── 1. HEADER (Doctor Credentials Left, Colored Logo + Clinic Right) ── */}
      <div className="pb-3">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          {/* Top Left: Doctor Information */}
          <div className="text-left">
            <h1 className="text-lg sm:text-xl font-black text-black tracking-tight leading-tight">
              {resolvedDocName}
            </h1>
            <p className="text-xs font-bold text-black mt-0.5">{qualification}</p>
            <p className="text-xs font-bold text-black mt-0.5">
              Reg. No: <span className="font-semibold">{registrationNumber}</span>
            </p>
            <p className="text-[11px] text-slate-700 font-medium mt-0.5">
              Council: {registrationCouncil}
            </p>
          </div>

          {/* Top Right: Authentic 8Liv Logo (IN COLOR) + Hospital Details */}
          <div className="sm:text-right text-xs shrink-0 flex flex-col sm:items-end">
            <div className="flex items-center gap-2 mb-1 sm:justify-end">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/brand-logo-official.png"
                alt="8Liv Health"
                className="h-9 w-auto object-contain block drop-shadow-2xs"
              />
              <span className="text-base sm:text-lg font-black tracking-tight text-black leading-tight uppercase">
                8LIV HEALTH NETWORK
              </span>
            </div>
            <p className="text-[10px] text-slate-700 font-medium leading-tight">
              Ground Floor, Embassy TechVillage, Outer Ring Road, Bengaluru - 560103
            </p>
            <p className="text-[10px] text-slate-600 font-medium mt-0.5 leading-tight">
              Ph: +91 80 6900 8548 | Timing: 08:00 AM - 08:00 PM | Closed: Sunday
            </p>
          </div>
        </div>

        {/* Solid Black Divider Line */}
        <div className="w-full border-b-2 border-black mt-3.5" />
      </div>

      {/* ── 2. DATE (Right Aligned) ── */}
      <div className="text-right text-xs font-bold text-black py-1">
        Date: <span className="font-mono">{formattedDateIssued}</span>
      </div>

      {/* ── 3. PATIENT DEMOGRAPHICS & CLINICAL VITALS ── */}
      <div className="py-1 text-xs text-black leading-relaxed font-medium">
        <div>
          <span className="font-black">ID: {resolvedPatientId}</span>
          <span className="mx-1.5">-</span>
          <span className="font-black">{patientName.toUpperCase()}</span>
          <span className="mx-1">({resolvedGender})</span>
          <span className="mx-1">/</span>
          <span className="font-bold">{resolvedAge} Y</span>
          <span className="ml-4 font-bold">Mob. No.:</span>{' '}
          <span className="font-mono">{resolvedPhone}</span>
        </div>
        <div className="mt-0.5">
          <span className="font-bold">Address:</span> {resolvedAddress}
        </div>
        <div className="mt-0.5 font-bold">
          Weight (Kg): <span className="font-normal">{resolvedWeight}</span>, Height (Cm):{' '}
          <span className="font-normal">{resolvedHeight}</span> (B.M.I. ={' '}
          <span className="font-normal">{resolvedBmi}</span>), BP:{' '}
          <span className="font-normal">{resolvedBp}</span>
        </div>

        {/* Divider */}
        <div className="w-full border-b border-black mt-2.5 mb-2.5" />
      </div>

      {/* ── 4. CHIEF COMPLAINTS & CLINICAL FINDINGS (Two Columns) ── */}
      <div className="py-1">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div>
            <p className="font-black text-black uppercase tracking-wider mb-1.5 underline decoration-1 underline-offset-2">
              Chief Complaints
            </p>
            <ul className="space-y-1 text-black font-medium leading-relaxed pl-3">
              {parsedComplaints.map((c, i) => (
                <li key={i} className="flex items-start gap-1.5">
                  <span className="font-black">*</span>
                  <span>{c}</span>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <p className="font-black text-black uppercase tracking-wider mb-1.5 underline decoration-1 underline-offset-2">
              Clinical Findings
            </p>
            <ul className="space-y-1 text-black font-medium leading-relaxed pl-3">
              {parsedFindings.map((f, i) => (
                <li key={i} className="flex items-start gap-1.5">
                  <span className="font-black">*</span>
                  <span>{f}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Divider */}
        <div className="w-full border-b border-black mt-3 mb-3" />
      </div>

      {/* ── 5. DIAGNOSIS ── */}
      <div className="text-xs mb-3">
        <p className="font-black text-black mb-1">Diagnosis:</p>
        <p className="pl-3 font-bold text-black flex items-start gap-1.5">
          <span>*</span>
          <span>{diagnosis}</span>
        </p>
      </div>

      {/* ── 6. RX / MEDICATION ORDER OR INFORMATION ONLY ── */}
      <div className="mt-2 mb-4">
        {!isInfoOnly ? (
          <div>
            <div className="text-2xl font-black font-serif text-black leading-none mb-1 select-none">
              ℞
            </div>
            {/* Table */}
            <div className="w-full border-t border-b border-black">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-black text-[11px] font-black uppercase text-black">
                    <th className="py-2 px-1 w-8">#</th>
                    <th className="py-2 px-2 w-[48%]">Medicine Name</th>
                    <th className="py-2 px-2 w-[32%]">Dosage</th>
                    <th className="py-2 px-1 w-[16%]">Duration</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item, idx) => (
                    <tr key={idx} className="border-b border-slate-200 align-top">
                      <td className="py-2.5 px-1 font-bold text-black">{idx + 1})</td>
                      <td className="py-2.5 px-2">
                        <p className="font-black text-sm text-black uppercase">
                          {item.dosage_form?.toLowerCase().includes('tablet')
                            ? `TAB. ${item.medicine_name}`
                            : item.dosage_form?.toLowerCase().includes('pen') || item.route?.toLowerCase().includes('subcutaneous')
                            ? `INJ. ${item.medicine_name}`
                            : item.medicine_name}
                        </p>
                        {item.generic_name && (
                          <p className="text-[10px] text-slate-700 font-semibold mt-0.5">
                            {item.generic_name.toUpperCase()}
                          </p>
                        )}
                        {item.special_instruction && (
                          <p className="text-[10px] text-slate-600 italic mt-0.5">
                            {item.special_instruction}
                          </p>
                        )}
                      </td>
                      <td className="py-2.5 px-2 font-medium text-black">
                        <p className="font-bold">{item.dose || '1 Unit'}</p>
                        <p className="text-[11px] text-slate-800">{item.frequency || 'Once weekly'}</p>
                        {item.food_instruction && (
                          <p className="text-[10px] text-slate-600">({item.food_instruction})</p>
                        )}
                      </td>
                      <td className="py-2.5 px-1 font-bold text-black">
                        <p>
                          {item.duration_value} {String(item.duration_unit || 'WEEKS').toLowerCase()}
                        </p>
                        <p className="text-[10px] text-slate-600 font-normal">
                          (Tot: {item.quantity} {Number(item.quantity) === 1 ? 'Unit' : 'Units'})
                        </p>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="border border-black rounded-lg p-3.5 bg-slate-50/50">
            <p className="text-xs font-black uppercase tracking-wider text-black mb-1.5 underline decoration-1 underline-offset-2">
              Clinical Telehealth Advice &amp; Lifestyle Consultation Notes
            </p>
            <ul className="text-xs text-black space-y-1 font-medium pl-3">
              <li className="flex items-start gap-1.5">
                <span>*</span>
                <span>Patient assessed via comprehensive clinical telehealth evaluation.</span>
              </li>
              <li className="flex items-start gap-1.5">
                <span>*</span>
                <span>No pharmacological prescription issued at this stage. Focus on dietary calibration, physical activity, and metabolic tracking.</span>
              </li>
              <li className="flex items-start gap-1.5">
                <span>*</span>
                <span>Review progress and biomarkers prior to deciding on pharmacological GLP-1 initiation.</span>
              </li>
            </ul>
          </div>
        )}
      </div>

      {/* ── 7. ADVICE ── */}
      <div className="mt-3 text-xs">
        <p className="font-black text-black uppercase tracking-wider mb-1">Advice:</p>
        <ul className="space-y-1 text-black font-medium leading-relaxed pl-3">
          {parsedAdvice.map((a, i) => (
            <li key={i} className="flex items-start gap-1.5">
              <span className="font-black">*</span>
              <span>{a}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* ── 8. FOLLOW UP ── */}
      <div className="mt-4 text-xs font-black text-black">
        Follow Up: <span className="font-mono">{formattedFollowUpDate}</span>
      </div>

      {/* ── 9. SIGNATURE & STAMP FOOTER ── */}
      <div className="mt-8 pt-4 flex flex-col sm:flex-row items-end justify-between gap-4">
        {/* Left: Standard Pharmacy Dispensation Notice */}
        <div className="text-left">
          <p className="text-[11px] text-slate-700 italic font-medium">
            Substitute with equivalent Generics as required.
          </p>
          <p className="text-[10px] text-slate-400 font-mono mt-1">
            Ref: {prescriptionNumber}
          </p>
        </div>

        {/* Right: Prescribing Doctor Digital Signature */}
        <div className="text-right shrink-0">
          <div className="min-h-[48px] flex items-end justify-end pb-1 border-b border-black w-48">
            {signatureUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={signatureUrl}
                alt="Doctor Digital Signature"
                className="h-10 max-w-[150px] object-contain"
              />
            ) : (
              <span className="font-serif italic font-black text-xl text-black select-none">
                {doctorName.replace(/^Dr\.\s*/i, '')}
              </span>
            )}
          </div>
          <p className="font-black text-xs text-black mt-1">{resolvedDocName}</p>
          <p className="text-[11px] text-slate-700 font-medium">Reg. No: {registrationNumber}</p>
        </div>
      </div>

      {/* Clean Bottom Rule */}
      <div className="mt-8 pt-2 border-t border-slate-300 flex items-center justify-between text-[10px] text-slate-500">
        <span>8LIV Healthcare Pvt Ltd * support@8liv.in * www.8liv.in</span>
        <span>Valid Across Licensed Pharmacies in India</span>
      </div>
    </div>
  )
}
