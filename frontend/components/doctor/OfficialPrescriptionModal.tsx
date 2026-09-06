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
import PrescriptionOfficialSheet from './PrescriptionOfficialSheet'

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
  const [downloadingPdf, setDownloadingPdf] = React.useState(false)

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

  const handleDownloadPdf = async () => {
    if (!prescription?.id) return
    setDownloadingPdf(true)
    try {
      const link = document.createElement('a')
      link.href = `/api/doctor/prescriptions/${prescription.id}/pdf?download=1`
      link.download = `8LIV-Prescription-${prescription.prescription_number || prescription.id}.pdf`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    } catch (e) {
      console.error('Failed to download vector PDF:', e)
    } finally {
      setDownloadingPdf(false)
    }
  }

  const handlePrint = async () => {
    try {
      const res = await fetch(`/api/doctor/prescriptions/${prescription.id}/pdf`)
      const data = await res.json()
      if (res.ok && data.url) {
        const win = window.open(data.url, '_blank')
        if (win) {
          win.focus()
          return
        }
      }
    } catch (e) {
      console.warn('Could not open signed PDF URL for printing, falling back to window.print', e)
    }
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
              onClick={handleDownloadPdf}
              disabled={downloadingPdf}
              className="inline-flex items-center gap-1.5 rounded-xl bg-[#0D9488] px-4 py-2 text-xs font-black text-white hover:bg-[#0B7D73] shadow-sm transition-all disabled:opacity-50"
              title="Download official vector PDF document"
            >
              <Download className="h-4 w-4" />
              <span>{downloadingPdf ? 'Generating...' : 'Download Official PDF'}</span>
            </button>
            <button
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 rounded-xl border border-[#1A1F36]/15 bg-white px-4 py-2 text-xs font-black text-[#1A1F36] hover:bg-[#FAF7F5] shadow-sm transition-all"
            >
              <Printer className="h-4 w-4 text-[#0D9488]" />
              <span>Print</span>
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
        <div ref={printRef} className="flex-1 overflow-y-auto p-4 sm:p-8 bg-slate-100 print:bg-white print:p-0 print:overflow-visible flex justify-center">
          <PrescriptionOfficialSheet
            patientName={patientName}
            prescriptionNumber={prescription.prescription_number || prescription.id}
            dateIssued={prescription.issued_at || prescription.created_at}
            validUntil={prescription.valid_until}
            diagnosis={prescription.diagnosis}
            items={items}
            adviceNotes={prescription.advice_notes}
            doctorName={doctorName}
            specialty={specialty}
            registrationNumber={registrationNumber}
            signatureUrl={prescription.doctor_signature_url || prescription.signature_url}
            signatureHash={prescription.signature_hash}
            isDraftPreview={false}
            className="w-full"
          />
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
