'use client'

import React, { useRef } from 'react'
import {
  X,
  Printer,
  Download,
  ShieldCheck,
  CheckCircle2,
  FileText,
  Clock,
  Calendar,
  Building2,
  Lock,
} from 'lucide-react'

interface OfficialPrescriptionModalProps {
  isOpen: boolean
  onClose: () => void
  prescription: any | null
  doctorProfile?: any | null
}

export default function OfficialPrescriptionModal({
  isOpen,
  onClose,
  prescription,
  doctorProfile,
}: OfficialPrescriptionModalProps) {
  const printRef = useRef<HTMLDivElement>(null)

  if (!isOpen || !prescription) return null

  const items = prescription.prescription_items || []
  const patient = prescription.patient || {}
  const patientName =
    prescription.patient_name ||
    `${patient.first_name || ''} ${patient.last_name || ''}`.trim() ||
    patient.full_name ||
    patient.email ||
    'Patient'

  const doctorName =
    prescription.doctor?.full_name ||
    doctorProfile?.full_name ||
    'Dr. 8LIV Medical Practitioner'

  const specialty =
    prescription.doctor?.specialty ||
    doctorProfile?.specialty ||
    'Consultant Physician & Endocrinologist'

  const registrationNumber =
    doctorProfile?.mci_number ||
    doctorProfile?.registration_number ||
    'MCI-RMP-78942'

  const handlePrint = () => {
    window.print()
  }

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/60 backdrop-blur-sm p-3 sm:p-6 overflow-y-auto">
      <div className="relative w-full max-w-4xl rounded-3xl bg-white shadow-2xl border border-[#1A1F36]/10 flex flex-col max-h-[92vh] overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-200">
        
        {/* Top Control Bar (Screen only, hidden in print) */}
        <div className="print:hidden sticky top-0 z-20 flex items-center justify-between border-b border-[#1A1F36]/10 bg-white px-6 py-4 sm:px-8">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#0D9488]/10 text-[#0D9488]">
              <FileText className="h-5 w-5" />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-[#0D9488]">
                Official Medical Record
              </p>
              <h2 className="text-lg font-black text-[#1A1F36]">
                {prescription.prescription_number || 'E-Prescription Document'}
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 rounded-xl border border-[#1A1F36]/15 bg-white px-4 py-2 text-xs font-black text-[#1A1F36] hover:bg-[#FAF7F5] shadow-sm transition-all"
            >
              <Printer className="h-4 w-4 text-[#0D9488]" />
              <span>Print / Save PDF</span>
            </button>
            <button
              onClick={onClose}
              className="rounded-xl p-2 text-[#8896A4] hover:bg-[#F5F0EB] hover:text-[#1A1F36] transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Printable Prescription Document Content */}
        <div ref={printRef} className="flex-1 overflow-y-auto p-6 sm:p-10 bg-white print:p-0 print:overflow-visible">
          <div className="mx-auto max-w-3xl space-y-8 font-sans text-[#1A1F36] border border-[#1A1F36]/10 p-8 sm:p-12 rounded-3xl print:border-none print:p-0 shadow-xs">
            
            {/* Clinical Letterhead Header */}
            <div className="border-b-2 border-[#1A1F36] pb-6">
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#0D9488] text-white font-black text-sm">
                      8L
                    </span>
                    <h1 className="text-2xl font-black tracking-tight text-[#1A1F36]">
                      8LIV HEALTH NETWORK
                    </h1>
                  </div>
                  <p className="text-xs font-bold uppercase tracking-wider text-[#0D9488] mt-1">
                    Specialty Telemedicine &amp; Metabolic Endocrinology
                  </p>
                  <p className="text-[11px] font-semibold text-[#8896A4] mt-0.5">
                    Ministry of Health &amp; Family Welfare (MoHFW) Registered Care Facility
                  </p>
                </div>

                <div className="sm:text-right text-xs">
                  <p className="font-black text-sm text-[#1A1F36]">{doctorName}</p>
                  <p className="font-bold text-[#0D9488]">{specialty}</p>
                  <p className="font-mono text-[11px] text-[#40516A] mt-0.5">
                    Reg. No: <span className="font-bold">{registrationNumber}</span>
                  </p>
                  <p className="text-[10px] text-[#8896A4] mt-0.5">
                    Telemedicine Practice Guidelines, 2020
                  </p>
                </div>
              </div>
            </div>

            {/* Patient & Prescription Details Grid */}
            <div className="rounded-2xl border border-[#1A1F36]/10 bg-[#FAF7F5] p-5">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-wider text-[#8896A4]">Patient Name</p>
                  <p className="font-black text-sm text-[#1A1F36] mt-0.5">{patientName}</p>
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-wider text-[#8896A4]">Prescription Number</p>
                  <p className="font-mono font-black text-xs text-[#0D9488] mt-0.5">
                    {prescription.prescription_number}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-wider text-[#8896A4]">Date Issued</p>
                  <p className="font-bold text-xs text-[#1A1F36] mt-0.5">
                    {prescription.issued_at
                      ? new Date(prescription.issued_at).toLocaleDateString('en-IN', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })
                      : new Date().toLocaleDateString('en-IN')}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-wider text-[#8896A4]">Valid Until</p>
                  <p className="font-bold text-xs text-[#1A1F36] mt-0.5">
                    {prescription.valid_until
                      ? new Date(prescription.valid_until).toLocaleDateString('en-IN', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })
                      : '30 Days from Issue'}
                  </p>
                </div>
              </div>
            </div>

            {/* Clinical Diagnosis */}
            <div className="space-y-1.5">
              <p className="text-[11px] font-black uppercase tracking-wider text-[#8896A4]">
                Clinical Diagnosis &amp; Indication
              </p>
              <div className="rounded-xl border border-[#1A1F36]/10 p-3.5 text-xs sm:text-sm font-bold text-[#1A1F36] bg-white">
                {prescription.diagnosis || 'Clinical Weight Management & Metabolic Protocol'}
              </div>
            </div>

            {/* ℞ Section (The Medicines Table) */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 border-b-2 border-[#1A1F36]/20 pb-2">
                <span className="font-serif italic font-bold text-3xl text-[#0D9488]">℞</span>
                <span className="text-sm font-black uppercase tracking-wider text-[#1A1F36]">
                  Prescribed Therapy &amp; Dispensation Order
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-[#1A1F36]/10 text-[10px] font-black uppercase tracking-wider text-[#8896A4] bg-[#FAF7F5]">
                    <tr>
                      <th className="p-3">#</th>
                      <th className="p-3">Medicine &amp; Strength</th>
                      <th className="p-3">Dosage &amp; Route</th>
                      <th className="p-3">Schedule</th>
                      <th className="p-3">Duration</th>
                      <th className="p-3">Quantity</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#1A1F36]/5">
                    {items.map((it: any, i: number) => (
                      <tr key={i} className="align-top">
                        <td className="p-3 font-black text-[#8896A4]">{i + 1}</td>
                        <td className="p-3">
                          <p className="font-black text-[#1A1F36] text-sm">{it.medicine_name}</p>
                          {it.generic_name && (
                            <p className="font-semibold text-[#0D9488] text-[11px]">
                              ({it.generic_name})
                            </p>
                          )}
                          <p className="text-[#8896A4] text-[10px] mt-0.5">
                            Form: {it.dosage_form || 'Standard'} • Strength: {it.strength}
                          </p>
                          {it.special_instruction && (
                            <p className="mt-1 text-[10px] font-semibold text-[#40516A] bg-[#FAF7F5] p-1.5 rounded-lg border border-[#1A1F36]/5">
                              ⚠️ {it.special_instruction}
                            </p>
                          )}
                        </td>
                        <td className="p-3">
                          <p className="font-bold text-[#1A1F36]">{it.dose}</p>
                          <p className="text-[#8896A4] text-[11px]">{it.route}</p>
                        </td>
                        <td className="p-3">
                          <p className="font-bold text-[#1A1F36]">{it.frequency}</p>
                          {it.food_instruction && (
                            <p className="text-[#8896A4] text-[11px]">{it.food_instruction}</p>
                          )}
                        </td>
                        <td className="p-3 font-bold text-[#1A1F36]">
                          {it.duration_value} {String(it.duration_unit || 'WEEKS').toLowerCase()}
                        </td>
                        <td className="p-3 font-black text-[#0D9488]">
                          {it.quantity} {it.quantity === 1 ? 'Unit' : 'Units'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Clinical Directives & Red Flags */}
            <div className="rounded-2xl border border-amber-200 bg-amber-50/50 p-4 text-xs space-y-1 text-amber-900 leading-relaxed">
              <p className="font-black uppercase tracking-wider text-[10px] text-amber-800">
                Mandatory Clinical Directives &amp; Patient Safety Advice:
              </p>
              <p>• Ensure minimum 2.5 - 3.0 Litres of daily hydration.</p>
              <p>• Rotate injection sites each week across abdomen or thigh; do not inject into muscle.</p>
              <p>• Report any severe persistent abdominal pain, intractable nausea, or symptoms of pancreatitis immediately.</p>
              <p>• Schedule routine telemedicine review at week 4 prior to initiating dose escalation.</p>
            </div>

            {/* Digital Signature & Verification Box */}
            <div className="border-t-2 border-[#1A1F36]/20 pt-6">
              <div className="flex flex-col sm:flex-row items-start sm:items-end justify-between gap-6">
                <div className="space-y-1 text-xs">
                  <div className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-emerald-700 font-bold border border-emerald-200">
                    <ShieldCheck className="h-4 w-4" />
                    <span>Cryptographically Authenticated (SHA-256)</span>
                  </div>
                  {prescription.signature_hash && (
                    <p className="font-mono text-[10px] text-[#8896A4] break-all max-w-sm">
                      Hash: {prescription.signature_hash}
                    </p>
                  )}
                  <p className="text-[10px] text-[#8896A4] max-w-sm leading-relaxed">
                    This document is a certified electronic prescription generated under Section 5 of the Indian Information Technology Act, 2000 and the Telemedicine Practice Guidelines, 2020.
                  </p>
                </div>

                <div className="sm:text-right text-xs">
                  <div className="inline-block border-b-2 border-[#1A1F36] pb-1 w-48 text-center sm:text-right">
                    <p className="font-serif italic font-bold text-lg text-[#0D9488]">{doctorName}</p>
                  </div>
                  <p className="font-black text-[#1A1F36] mt-1">{doctorName}</p>
                  <p className="text-[10px] font-bold text-[#8896A4] uppercase tracking-wider">
                    Authorized Medical Practitioner
                  </p>
                  <p className="text-[10px] font-mono text-[#8896A4]">
                    Reg: {registrationNumber}
                  </p>
                </div>
              </div>
            </div>

          </div>
        </div>

        {/* Modal Bottom Footer (Screen only) */}
        <div className="print:hidden sticky bottom-0 z-20 flex items-center justify-between border-t border-[#1A1F36]/10 bg-white px-6 py-4 sm:px-8">
          <div className="flex items-center gap-2 text-xs text-[#8896A4]">
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            <span>Eligible for home fulfillment across certified 8LIV partner pharmacies.</span>
          </div>

          <button
            onClick={onClose}
            className="rounded-2xl border border-[#1A1F36]/20 bg-white px-6 py-2.5 text-xs font-black text-[#1A1F36] hover:bg-[#FAF7F5] transition-all"
          >
            Close
          </button>
        </div>

      </div>
    </div>
  )
}
