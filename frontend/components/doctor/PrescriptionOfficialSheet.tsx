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

export interface PrescriptionOfficialSheetProps {
  patientName?: string
  prescriptionNumber?: string
  dateIssued?: string
  validUntil?: string
  diagnosis?: string
  items?: PrescriptionItemDisplay[]
  adviceNotes?: string
  doctorName?: string
  specialty?: string
  registrationNumber?: string
  signatureUrl?: string | null
  signatureHash?: string | null
  isDraftPreview?: boolean
  className?: string
}

export default function PrescriptionOfficialSheet({
  patientName = 'Patient',
  prescriptionNumber = '8LTV-RX-DRAFT',
  dateIssued,
  validUntil,
  diagnosis = 'Medical Weight Management Protocol — Overweight with Metabolic Risk Factors (BMI ≥ 27)',
  items = [],
  adviceNotes,
  doctorName = 'Dr. S',
  specialty = 'Physician',
  registrationNumber = 'MCI-RMP-78942',
  signatureUrl = null,
  signatureHash = null,
  isDraftPreview = false,
  className = '',
}: PrescriptionOfficialSheetProps) {
  const formattedDateIssued = dateIssued
    ? new Date(dateIssued).toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      })
    : new Date().toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      })

  const formattedValidUntil = validUntil
    ? new Date(validUntil).toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      })
    : (() => {
        const d = new Date()
        d.setDate(d.getDate() + 30)
        return d.toLocaleDateString('en-IN', {
          day: 'numeric',
          month: 'short',
          year: 'numeric',
        })
      })()

  return (
    <div
      className={`relative bg-white text-black font-sans shadow-lg border border-slate-300 p-6 sm:p-10 max-w-[800px] mx-auto select-none print:shadow-none print:border-none print:p-0 ${className}`}
      style={{ minHeight: '1050px' }}
    >
      {/* Optional Live Preview indicator */}
      {isDraftPreview && (
        <div className="mb-4 flex items-center justify-between rounded-lg border border-amber-300 bg-amber-50/80 px-3 py-1.5 text-xs text-amber-900 print:hidden">
          <span className="flex items-center gap-1.5 font-bold">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            Interactive Live Sheet Preview
          </span>
          <span className="text-[11px] font-medium text-amber-800">
            Auto-updating as you type
          </span>
        </div>
      )}

      {/* Optional Draft Watermark */}
      {isDraftPreview && (
        <div className="absolute inset-0 pointer-events-none flex items-center justify-center opacity-[0.03] select-none">
          <span className="text-8xl font-black rotate-[-30deg] tracking-widest text-slate-900 uppercase">
            LIVE PREVIEW
          </span>
        </div>
      )}

      {/* ── 1. HEADER ── */}
      <div className="pb-4">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          {/* Left: Organization Branding */}
          <div className="flex items-start gap-3">
            {/* Black Circle with White 8L */}
            <div className="w-11 h-11 rounded-full bg-black text-white flex items-center justify-center font-black text-lg tracking-tighter shrink-0 mt-0.5">
              8L
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-black tracking-tight text-black leading-tight uppercase">
                8LIV HEALTH NETWORK
              </h1>
              <p className="text-[11px] font-bold uppercase tracking-wider text-black mt-0.5">
                SPECIALTY TELEMEDICINE &amp; METABOLIC ENDOCRINOLOGY
              </p>
              <p className="text-[10px] text-slate-600 font-medium mt-0.5">
                Ministry of Health &amp; Family Welfare (MoHFW) Registered Care Facility
              </p>
            </div>
          </div>

          {/* Right: Prescribing Doctor Profile */}
          <div className="sm:text-right text-xs shrink-0">
            <h2 className="text-lg font-black text-black leading-tight">
              {doctorName.startsWith('Dr.') ? doctorName : `Dr. ${doctorName}`}
            </h2>
            <p className="text-xs font-semibold text-black mt-0.5">{specialty}</p>
            <p className="text-[11px] text-slate-700 font-medium mt-0.5">
              Reg. No: <span className="font-semibold">{registrationNumber}</span>
            </p>
            <p className="text-[10px] text-slate-500 mt-0.5">
              Telemedicine Practice Guidelines, 2020
            </p>
          </div>
        </div>

        {/* Thick Divider Line */}
        <div className="w-full border-b-2 border-black mt-4" />
      </div>

      {/* ── 2. FOUR-COLUMN METADATA BAR ── */}
      <div className="py-2">
        <div className="grid grid-cols-2 sm:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-slate-300 py-1 text-xs">
          <div className="px-2 sm:px-3 py-1">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-600">
              PATIENT NAME
            </p>
            <p className="text-sm font-black text-black mt-1 truncate">
              {patientName || 'Patient'}
            </p>
          </div>

          <div className="px-2 sm:px-3 py-1">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-600">
              PRESCRIPTION NUMBER
            </p>
            <p className="font-mono text-xs font-black text-black mt-1 break-all">
              {prescriptionNumber || '8LTV-RX-DRAFT'}
            </p>
          </div>

          <div className="px-2 sm:px-3 py-1">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-600">
              DATE ISSUED
            </p>
            <p className="text-sm font-black text-black mt-1">
              {formattedDateIssued}
            </p>
          </div>

          <div className="px-2 sm:px-3 py-1">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-600">
              VALID UNTIL
            </p>
            <p className="text-sm font-black text-black mt-1">
              {formattedValidUntil}
            </p>
          </div>
        </div>

        {/* Thick Divider Line */}
        <div className="w-full border-b-2 border-black mt-2" />
      </div>

      {/* ── 3. CLINICAL DIAGNOSIS & INDICATION ── */}
      <div className="mt-4">
        <p className="text-[11px] font-black uppercase tracking-wider text-black mb-1.5">
          CLINICAL DIAGNOSIS &amp; INDICATION
        </p>
        <div className="border border-black rounded-lg p-3 bg-white">
          <p className="text-xs sm:text-sm font-black text-black leading-relaxed">
            {diagnosis || 'Medical Weight Management Protocol — Overweight with Metabolic Risk Factors (BMI ≥ 27)'}
          </p>
        </div>
      </div>

      {/* ── 4. PRESCRIBED THERAPY & DISPENSATION ORDER ── */}
      <div className="mt-6">
        <div className="flex items-center gap-2 pb-2">
          <span className="text-3xl font-black font-serif text-black leading-none">℞</span>
          <h3 className="text-sm sm:text-base font-black uppercase tracking-wider text-black">
            PRESCRIBED THERAPY &amp; DISPENSATION ORDER
          </h3>
        </div>

        {/* Prescription Table */}
        <div className="w-full border-t border-b border-black">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-black text-[10px] font-black uppercase tracking-wider text-black">
                <th className="py-2 px-1 w-6 text-center">#</th>
                <th className="py-2 px-2">MEDICINE &amp; STRENGTH</th>
                <th className="py-2 px-2 w-28">DOSAGE &amp; ROUTE</th>
                <th className="py-2 px-2 w-32">SCHEDULE</th>
                <th className="py-2 px-2 w-20">DURATION</th>
                <th className="py-2 px-1 w-16 text-right">QUANTITY</th>
              </tr>
            </thead>
            <tbody>
              {items && items.length > 0 ? (
                items.map((item, idx) => {
                  const itemSpec = (item.special_instruction || '').trim()
                  const hasAdviceInItem = itemSpec.toLowerCase().includes('advice:')
                  const advicePart = (!hasAdviceInItem && adviceNotes && adviceNotes.trim())
                    ? `Advice: ${adviceNotes.trim().replace(/\r?\n+/g, ' ')}`
                    : ''
                  const combinedInstruction = [itemSpec, advicePart]
                    .filter(Boolean)
                    .join(' | ')

                  return (
                    <tr key={idx} className="border-b border-slate-200 align-top">
                      <td className="py-3 px-1 font-bold text-center text-sm">{idx + 1}</td>
                      
                      <td className="py-3 px-2">
                        <p className="font-black text-sm text-black">{item.medicine_name}</p>
                        {item.generic_name && (
                          <p className="text-[11px] text-slate-700 font-medium">
                            ({item.generic_name})
                          </p>
                        )}
                        {(item.dosage_form || item.strength) && (
                          <p className="text-[10px] text-slate-600 mt-0.5">
                            (Form: {item.dosage_form || 'Pen / Tablet'} - Strength: {item.strength || 'Standard'})
                          </p>
                        )}

                        {combinedInstruction && (
                          <div className="mt-2 rounded-lg border border-slate-300 bg-slate-50/70 p-2 text-[10px] text-slate-800 leading-relaxed max-w-md">
                            <span className="font-bold mr-1">⚠️</span>
                            {combinedInstruction}
                          </div>
                        )}
                      </td>

                      <td className="py-3 px-2">
                        <p className="font-black text-xs text-black">{item.dose || '—'}</p>
                        <p className="text-[11px] text-slate-700 mt-0.5">{item.route || 'Oral'}</p>
                      </td>

                      <td className="py-3 px-2">
                        <p className="font-black text-xs text-black">{item.frequency || 'Once daily'}</p>
                        {item.food_instruction && (
                          <p className="text-[10px] text-slate-600 mt-0.5">{item.food_instruction}</p>
                        )}
                      </td>

                      <td className="py-3 px-2">
                        <p className="font-black text-xs text-black">
                          {item.duration_value} {String(item.duration_unit || 'WEEKS').toLowerCase()}
                        </p>
                      </td>

                      <td className="py-3 px-1 text-right">
                        <p className="font-black text-xs text-black">
                          {item.quantity} {Number(item.quantity) === 1 ? 'Unit' : 'Units'}
                        </p>
                      </td>
                    </tr>
                  )
                })
              ) : (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-xs text-slate-400 font-bold">
                    No medications added yet. Add medications or pick a clinical preset.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── 5. MANDATORY CLINICAL DIRECTIVES & PATIENT SAFETY ADVICE ── */}
      <div className="mt-6 border border-black rounded-lg p-4 bg-white">
        <p className="text-[11px] font-black uppercase tracking-wider text-black mb-2">
          MANDATORY CLINICAL DIRECTIVES &amp; PATIENT SAFETY ADVICE:
        </p>
        <ul className="text-xs text-black space-y-1.5 pl-4 list-disc font-medium leading-relaxed">
          <li>Ensure minimum 2.5 - 3.0 Litres of daily hydration.</li>
          <li>Rotate injection sites each week across abdomen or thigh; do not inject into muscle.</li>
          <li>Report any severe persistent abdominal pain, intractable nausea, or symptoms of pancreatitis immediately.</li>
          <li>Schedule routine telemedicine review at week 4 prior to initiating dose escalation.</li>
        </ul>
      </div>

      {/* ── 6. SIGNATURE & ISSUANCE FOOTER ── */}
      <div className="mt-8 pt-4 flex flex-col sm:flex-row items-start sm:items-end justify-between gap-6">
        {/* Left: Issued by metadata */}
        <div className="text-xs text-black space-y-0.5">
          <p className="text-[11px] text-slate-500 font-medium">Issued by:</p>
          <p className="font-black text-base text-black">
            {doctorName.startsWith('Dr.') ? doctorName : `Dr. ${doctorName}`}
          </p>
          <p className="font-semibold text-slate-800 text-xs">{specialty}</p>
          <p className="font-medium text-slate-600 text-[11px]">Reg. No: {registrationNumber}</p>
          <p className="font-bold text-black text-xs mt-1">8LIV Health Network</p>

          {signatureHash && (
            <p className="font-mono text-[9px] text-slate-400 mt-2 break-all max-w-xs">
              SHA-256 Auth: {signatureHash}
            </p>
          )}
        </div>

        {/* Right: Signature & Doctor credentials */}
        <div className="sm:text-right text-xs shrink-0 flex flex-col items-start sm:items-end">
          {/* Signature Rendering */}
          <div className="min-h-[50px] flex items-end justify-center sm:justify-end pb-1 border-b border-black w-48">
            {signatureUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={signatureUrl}
                alt="Doctor Digital Signature"
                className="h-12 max-w-[160px] object-contain"
              />
            ) : (
              <span className="font-serif italic font-black text-2xl text-slate-900 tracking-wide select-none">
                {doctorName.replace(/^Dr\.\s*/i, '')}
              </span>
            )}
          </div>

          <p className="font-black text-sm text-black mt-1">
            {doctorName.startsWith('Dr.') ? doctorName : `Dr. ${doctorName}`}
          </p>
          <p className="text-xs text-slate-800 font-semibold">{specialty}</p>
          <p className="text-[11px] text-slate-600 font-medium">
            MCI Reg. No: {registrationNumber.replace(/^MCI-RMP-/i, '')}
          </p>
        </div>
      </div>
    </div>
  )
}
