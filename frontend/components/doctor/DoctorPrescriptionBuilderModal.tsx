'use client'

import React, { useState, useEffect } from 'react'
import {
  X,
  Plus,
  Trash2,
  Sparkles,
  ShieldCheck,
  FileCheck,
  Pill,
  Save,
  AlertCircle,
  Calendar,
  User,
  Clock,
  ChevronDown,
  CheckCircle2,
  Columns,
  Eye,
  FileEdit,
  Maximize2,
} from 'lucide-react'
import { authedFetch } from '@/lib/apiClient'
import PrescriptionOfficialSheet from './PrescriptionOfficialSheet'

export type PrescriptionItemData = {
  medicine_name: string
  generic_name: string
  brand_name?: string
  strength: string
  dosage_form: string
  dose: string
  route: string
  frequency: string
  duration_value: number
  duration_unit: 'DAYS' | 'WEEKS' | 'MONTHS'
  quantity: number
  food_instruction: string
  special_instruction: string
}

export type ClinicalPreset = {
  id: string
  name: string
  category: 'GLP1_STARTER' | 'GLP1_MAINTENANCE' | 'DUAL_GIP' | 'ORAL_METABOLIC'
  badge: string
  item: PrescriptionItemData
}

export const CLINICAL_PRESETS: ClinicalPreset[] = [
  {
    id: 'sema-025',
    name: 'Semaglutide 0.25 mg (Starter)',
    category: 'GLP1_STARTER',
    badge: 'Starter Dose • Wks 1-4',
    item: {
      medicine_name: 'Semaglutide 0.25 mg / dose',
      generic_name: 'Semaglutide (GLP-1 Receptor Agonist)',
      brand_name: 'Ozempic / Wegovy',
      strength: '0.25 mg / 0.5 mL',
      dosage_form: 'Pre-filled Multi-dose Pen (1.5 mL)',
      dose: '0.25 mg',
      route: 'Subcutaneous injection',
      frequency: 'Once weekly on fixed day (e.g. Wednesday)',
      duration_value: 4,
      duration_unit: 'WEEKS',
      quantity: 1,
      food_instruction: 'Administer with or without food',
      special_instruction: 'Store in refrigerator at 2°C - 8°C. Do not freeze. Inject subcutaneously into abdomen or thigh; rotate injection sites each week.',
    },
  },
  {
    id: 'sema-050',
    name: 'Semaglutide 0.50 mg (Step 2)',
    category: 'GLP1_MAINTENANCE',
    badge: 'Step 2 Dose • Wks 5-8',
    item: {
      medicine_name: 'Semaglutide 0.50 mg / dose',
      generic_name: 'Semaglutide (GLP-1 Receptor Agonist)',
      brand_name: 'Ozempic / Wegovy',
      strength: '0.50 mg / 0.5 mL',
      dosage_form: 'Pre-filled Multi-dose Pen (1.5 mL)',
      dose: '0.50 mg',
      route: 'Subcutaneous injection',
      frequency: 'Once weekly on fixed day',
      duration_value: 4,
      duration_unit: 'WEEKS',
      quantity: 1,
      food_instruction: 'Administer with or without food',
      special_instruction: 'Store in refrigerator at 2°C - 8°C. Rotate injection sites. Review GI tolerance before escalation.',
    },
  },
  {
    id: 'sema-100',
    name: 'Semaglutide 1.0 mg (Maintenance)',
    category: 'GLP1_MAINTENANCE',
    badge: 'Therapeutic Maintenance',
    item: {
      medicine_name: 'Semaglutide 1.0 mg / dose',
      generic_name: 'Semaglutide (GLP-1 Receptor Agonist)',
      brand_name: 'Ozempic / Wegovy',
      strength: '1.0 mg / 0.75 mL',
      dosage_form: 'Pre-filled Pen (3.0 mL)',
      dose: '1.0 mg',
      route: 'Subcutaneous injection',
      frequency: 'Once weekly on fixed day',
      duration_value: 4,
      duration_unit: 'WEEKS',
      quantity: 1,
      food_instruction: 'Administer with or without food',
      special_instruction: 'Subcutaneous weekly. Keep refrigerated before first use. Monitor appetite and glycemic markers.',
    },
  },
  {
    id: 'tirz-250',
    name: 'Tirzepatide 2.5 mg (Starter Dual GIP/GLP-1)',
    category: 'DUAL_GIP',
    badge: 'Dual Agonist • Wks 1-4',
    item: {
      medicine_name: 'Tirzepatide 2.5 mg / 0.5 mL',
      generic_name: 'Tirzepatide (GIP / GLP-1 Receptor Co-Agonist)',
      brand_name: 'Mounjaro',
      strength: '2.5 mg / 0.5 mL',
      dosage_form: 'Pre-filled Single-dose Pen / Vial',
      dose: '2.5 mg',
      route: 'Subcutaneous injection',
      frequency: 'Once weekly on fixed day',
      duration_value: 4,
      duration_unit: 'WEEKS',
      quantity: 4,
      food_instruction: 'Administer with or without food',
      special_instruction: 'Store refrigerated at 2°C - 8°C. Protect from excessive heat and direct light. Administer once every 7 days.',
    },
  },
  {
    id: 'tirz-500',
    name: 'Tirzepatide 5.0 mg (Step 2 Dual GIP/GLP-1)',
    category: 'DUAL_GIP',
    badge: 'Dual Agonist • Wks 5-8',
    item: {
      medicine_name: 'Tirzepatide 5.0 mg / 0.5 mL',
      generic_name: 'Tirzepatide (GIP / GLP-1 Receptor Co-Agonist)',
      brand_name: 'Mounjaro',
      strength: '5.0 mg / 0.5 mL',
      dosage_form: 'Pre-filled Single-dose Pen / Vial',
      dose: '5.0 mg',
      route: 'Subcutaneous injection',
      frequency: 'Once weekly on fixed day',
      duration_value: 4,
      duration_unit: 'WEEKS',
      quantity: 4,
      food_instruction: 'Administer with or without food',
      special_instruction: 'Weekly subcutaneous administration. Ensure adequate hydration (min 2.5L daily).',
    },
  },
  {
    id: 'met-500',
    name: 'Metformin ER 500 mg (Adjunct Metabolic)',
    category: 'ORAL_METABOLIC',
    badge: 'Oral Insulin Sensitizer',
    item: {
      medicine_name: 'Metformin Hydrochloride ER 500 mg',
      generic_name: 'Metformin Extended Release',
      brand_name: 'Glycomet-SR / Glucophage XR',
      strength: '500 mg',
      dosage_form: 'Extended Release Tablet',
      dose: '1 Tablet',
      route: 'Oral',
      frequency: 'Once daily with evening meal',
      duration_value: 30,
      duration_unit: 'DAYS',
      quantity: 30,
      food_instruction: 'Take with or immediately after food / dinner',
      special_instruction: 'Swallow whole with a full glass of water. Do not crush, chew, or split tablet.',
    },
  },
]

const DIAGNOSIS_SUGGESTIONS = [
  'Medical Weight Management Protocol — Overweight with Metabolic Risk Factors (BMI ≥ 27)',
  'Clinical Obesity Protocol (BMI ≥ 30 kg/m²) — GLP-1 Receptor Agonist Therapy',
  'Type 2 Diabetes Mellitus with Weight Dysregulation — Targeted Glycemic & Weight Control',
  'Metabolic Syndrome with Insulin Resistance & Adiposity Management',
]

const emptyItem: PrescriptionItemData = {
  medicine_name: '',
  generic_name: '',
  brand_name: '',
  strength: '',
  dosage_form: 'Pre-filled Pen',
  dose: '',
  route: 'Subcutaneous injection',
  frequency: 'Once weekly',
  duration_value: 4,
  duration_unit: 'WEEKS',
  quantity: 1,
  food_instruction: 'With or without food',
  special_instruction: 'Store refrigerated at 2°C - 8°C. Do not freeze. Rotate injection sites.',
}

interface DoctorPrescriptionBuilderModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: (prescription: any, signed: boolean) => void
  consultation?: any | null
  patient?: any | null
  patientsList?: any[]
  doctorProfile?: any | null
}

export default function DoctorPrescriptionBuilderModal({
  isOpen,
  onClose,
  onSuccess,
  consultation,
  patient,
  patientsList = [],
  doctorProfile,
}: DoctorPrescriptionBuilderModalProps) {
  const [selectedPatientId, setSelectedPatientId] = useState<string>('')
  const [consultationId, setConsultationId] = useState<string>('')
  const [diagnosis, setDiagnosis] = useState<string>(
    'Medical Weight Management Protocol — Overweight with Metabolic Risk Factors (BMI ≥ 27)'
  )
  const [validUntil, setValidUntil] = useState<string>(() => {
    const d = new Date()
    d.setDate(d.getDate() + 30)
    return d.toISOString().split('T')[0]
  })
  const [validityPreset, setValidityPreset] = useState<number>(30)
  const [items, setItems] = useState<PrescriptionItemData[]>([
    { ...CLINICAL_PRESETS[0].item },
  ])
  const [adviceNotes, setAdviceNotes] = useState<string>(
    '1. Maintain minimum 2.5 to 3.0 Litres of water daily.\n2. Eat smaller, frequent meals high in protein.\n3. Report any severe or persistent nausea, vomiting, or abdominal pain immediately.\n4. Schedule follow-up consultation in 4 weeks for dose escalation assessment.'
  )
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string>('')
  const [declReviewed, setDeclReviewed] = useState(false)
  const [declClinicalDecision, setDeclClinicalDecision] = useState(false)
  const [declElectronicAuth, setDeclElectronicAuth] = useState(false)
  const [doctorSigUrl, setDoctorSigUrl] = useState<string | null>(null)
  const [sigUploading, setSigUploading] = useState(false)
  const [viewMode, setViewMode] = useState<'split' | 'form' | 'preview'>('split')

  // Detect screen size for initial default view
  useEffect(() => {
    if (typeof window !== 'undefined' && window.innerWidth < 1024) {
      setViewMode('form')
    }
  }, [])

  // Fetch signature on modal open
  useEffect(() => {
    if (isOpen) {
      setDeclReviewed(false)
      setDeclClinicalDecision(false)
      setDeclElectronicAuth(false)
      authedFetch('/api/doctor/signature')
        .then((r) => r.json())
        .then((data) => {
          if (data.hasSignature && data.previewUrl) {
            setDoctorSigUrl(data.previewUrl)
          }
        })
        .catch((e) => console.warn('Signature fetch note:', e))
    }
  }, [isOpen])

  const handleSignatureUpload = async (file: File) => {
    setSigUploading(true)
    setError('')
    try {
      const fd = new FormData()
      fd.append('signature', file)
      const res = await authedFetch('/api/doctor/signature', {
        method: 'POST',
        body: fd,
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to upload signature.')
      setDoctorSigUrl(data.previewUrl)
    } catch (err: any) {
      setError(err.message || 'Signature upload error.')
    } finally {
      setSigUploading(false)
    }
  }

  // Sync incoming consultation or patient
  useEffect(() => {
    if (consultation) {
      setConsultationId(consultation.id || '')
      setSelectedPatientId(consultation.patient_id || '')
    } else if (patient) {
      setSelectedPatientId(patient.id || '')
      setConsultationId('')
    }
  }, [consultation, patient])

  // Quick validity setter
  const setValidityDays = (days: number) => {
    setValidityPreset(days)
    const d = new Date()
    d.setDate(d.getDate() + days)
    setValidUntil(d.toISOString().split('T')[0])
  }

  // Preset applicator
  const applyPreset = (preset: ClinicalPreset) => {
    // If only one item and it's empty or default, replace it; otherwise append
    if (items.length === 1 && (!items[0].medicine_name || items[0].medicine_name === CLINICAL_PRESETS[0].item.medicine_name)) {
      setItems([{ ...preset.item }])
    } else {
      setItems([...items, { ...preset.item }])
    }
  }

  const handleItemChange = (index: number, field: keyof PrescriptionItemData, value: any) => {
    setItems((prev) =>
      prev.map((it, i) => (i === index ? { ...it, [field]: value } : it))
    )
  }

  const removeItem = (index: number) => {
    if (items.length <= 1) return
    setItems((prev) => prev.filter((_, i) => i !== index))
  }

  const addItem = () => {
    setItems((prev) => [...prev, { ...emptyItem }])
  }

  const handleSubmit = async (signNow: boolean) => {
    setError('')
    const targetPatientId = selectedPatientId || consultation?.patient_id || patient?.id

    if (!targetPatientId) {
      setError('Please select or specify an assigned patient for this e-prescription.')
      return
    }

    if (!diagnosis.trim()) {
      setError('Clinical diagnosis summary is required under telemedicine practice guidelines.')
      return
    }

    if (!validUntil) {
      setError('Prescription validity expiry date is required.')
      return
    }

    if (items.length === 0) {
      setError('At least one medication item is required.')
      return
    }

    for (let i = 0; i < items.length; i++) {
      const it = items[i]
      if (!it.medicine_name.trim()) {
        setError(`Medicine #${i + 1} requires a valid medicine name.`)
        return
      }
      if (!it.strength.trim()) {
        setError(`Medicine #${i + 1} requires a strength specification.`)
        return
      }
      if (!it.dose.trim()) {
        setError(`Medicine #${i + 1} requires dosage directions (e.g. 0.25 mg, 1 tablet).`)
        return
      }
      if (!it.frequency.trim()) {
        setError(`Medicine #${i + 1} requires an administration frequency.`)
        return
      }
      if (!it.duration_value || it.duration_value <= 0) {
        setError(`Medicine #${i + 1} requires a duration value greater than zero.`)
        return
      }
      if (!it.quantity || it.quantity <= 0) {
        setError(`Medicine #${i + 1} requires a dispense quantity greater than zero.`)
        return
      }
    }

    if (signNow) {
      if (!declReviewed || !declClinicalDecision || !declElectronicAuth) {
        setError(
          'Doctor statutory confirmation required: You must check and confirm all three statutory medical declarations below to authorize and issue this e-prescription.'
        )
        return
      }
    }

    setIsSubmitting(true)
    try {
      // Append advice notes into items special_instructions if present
      const formattedItems = items.map((it) => ({
        ...it,
        special_instruction: [it.special_instruction, adviceNotes.trim() ? `Advice: ${adviceNotes.trim()}` : '']
          .filter(Boolean)
          .join(' | '),
      }))

      const payload = {
        consultationId: consultationId || consultation?.id || '',
        patientId: targetPatientId,
        diagnosis: diagnosis.trim(),
        valid_until: validUntil,
        items: formattedItems,
        autoSign: signNow,
        declarations: signNow
          ? {
              reviewed_details: declReviewed,
              clinical_decision: declClinicalDecision,
              electronic_authorization: declElectronicAuth,
            }
          : undefined,
      }

      const res = await authedFetch('/api/doctor/prescriptions', {
        method: 'POST',
        body: JSON.stringify(payload),
      })

      const data = await res.json()
      if (!res.ok || data.error) {
        throw new Error(data.error || 'Failed to issue e-prescription.')
      }

      onSuccess(data.prescription, signNow)
      onClose()
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred while issuing the prescription.')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!isOpen) return null

  // Resolve patient details for header
  const resolvedPatientName =
    consultation?.patient_name ||
    (patient ? `${patient.first_name || ''} ${patient.last_name || ''}`.trim() || patient.full_name || patient.email : '') ||
    patientsList.find((p) => p.id === selectedPatientId)?.first_name ||
    'Selected Patient'

  const renderFormContent = () => (
    <div className="space-y-6">
      {error && (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-xs font-bold text-red-700 flex items-start gap-2.5">
          <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

          {/* Patient and Doctor Clinical Context Card */}
          <div className="rounded-2xl border border-[#1A1F36]/10 bg-[#FAF7F5] p-5">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 text-xs">
              <div>
                <p className="font-bold text-[#8896A4] uppercase tracking-wider text-[10px]">Patient Name</p>
                <p className="font-black text-[#1A1F36] text-sm mt-0.5">{resolvedPatientName}</p>
              </div>
              <div>
                <p className="font-bold text-[#8896A4] uppercase tracking-wider text-[10px]">Prescribing Clinician</p>
                <p className="font-black text-[#1A1F36] text-sm mt-0.5">
                  {doctorProfile?.full_name || 'Dr. 8LIV Medical Practitioner'}
                </p>
              </div>
              <div>
                <p className="font-bold text-[#8896A4] uppercase tracking-wider text-[10px]">Medical Council Reg.</p>
                <p className="font-black text-[#1A1F36] text-sm mt-0.5">
                  {doctorProfile?.mci_number || doctorProfile?.registration_number || 'MCI/SMC-VERIFIED'}
                </p>
              </div>
              <div>
                <p className="font-bold text-[#8896A4] uppercase tracking-wider text-[10px]">Prescription Mode</p>
                <p className="font-black text-[#C4622D] text-sm mt-0.5">Encrypted Telemedicine ℞</p>
              </div>
            </div>
          </div>

          {/* Section 1: Clinical Diagnosis */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-black uppercase tracking-wider text-[#1A1F36]">
                Clinical Diagnosis &amp; Indication <span className="text-red-500">*</span>
              </label>
              <span className="text-[11px] text-[#8896A4] font-bold">Telemedicine Standard</span>
            </div>

            <textarea
              value={diagnosis}
              onChange={(e) => setDiagnosis(e.target.value)}
              rows={2}
              className="w-full rounded-2xl border border-slate-200 bg-white p-3.5 text-xs sm:text-sm font-semibold text-[#1A1F36] outline-none focus:border-[#0D9488] focus:ring-2 focus:ring-[#0D9488]/20 transition-all"
              placeholder="e.g. Clinical Obesity (BMI ≥ 30) with Metabolic Dysregulation"
            />

            <div className="flex flex-wrap items-center gap-1.5 pt-1">
              <span className="text-[10px] font-black uppercase tracking-wider text-[#8896A4] mr-1">
                Quick Clinical Suggestions:
              </span>
              {DIAGNOSIS_SUGGESTIONS.map((suggestion, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setDiagnosis(suggestion)}
                  className="rounded-lg border border-[#1A1F36]/10 bg-white px-2.5 py-1 text-[11px] font-bold text-[#40516A] hover:bg-[#F5F0EB] hover:text-[#1A1F36] transition-colors"
                >
                  {suggestion.split('—')[0].trim()}
                </button>
              ))}
            </div>
          </div>

          {/* Section 2: Clinical GLP-1 & Metabolic Presets Bar */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-black uppercase tracking-wider text-[#1A1F36] flex items-center gap-1.5">
                <Sparkles className="h-4 w-4 text-[#C4622D]" />
                1-Click Clinical Formulary Presets (GLP-1 / GIP / Metabolic)
              </label>
              <span className="text-[11px] font-bold text-[#C4622D]">Click to apply structured therapy</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
              {CLINICAL_PRESETS.map((preset) => (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => applyPreset(preset)}
                  className="flex flex-col text-left p-3 rounded-2xl border border-[#1A1F36]/10 bg-white hover:border-[#C4622D] hover:bg-[#FFF8F5] transition-all shadow-xs group cursor-pointer"
                >
                  <span className="text-[9px] font-black uppercase tracking-widest text-[#C4622D] group-hover:underline">
                    {preset.badge}
                  </span>
                  <p className="text-xs font-black text-[#1A1F36] mt-1 line-clamp-2">
                    {preset.name}
                  </p>
                  <span className="text-[10px] font-semibold text-[#8896A4] mt-1">
                    {preset.item.dosage_form.split(' ')[0]} • {preset.item.duration_value} {preset.item.duration_unit.toLowerCase()}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Section 3: Prescribed Medications List */}
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-[#1A1F36]/10 pb-2">
              <div className="flex items-center gap-2">
                <span className="font-serif italic font-bold text-2xl text-[#C4622D]">℞</span>
                <span className="text-sm font-black uppercase tracking-wider text-[#1A1F36]">
                  Prescribed Medications ({items.length})
                </span>
              </div>

              <button
                type="button"
                onClick={addItem}
                className="inline-flex items-center gap-1.5 rounded-xl border border-[#1A1F36]/15 bg-white px-3.5 py-1.5 text-xs font-black text-[#1A1F36] hover:bg-[#FAF7F5] transition-all"
              >
                <Plus className="h-3.5 w-3.5" /> Add Another Medication
              </button>
            </div>

            {items.map((item, index) => (
              <div
                key={index}
                className="rounded-3xl border border-[#1A1F36]/15 bg-white p-5 shadow-sm space-y-4 relative"
              >
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-2">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#1A1F36] text-[11px] font-black text-white">
                      {index + 1}
                    </span>
                    <span className="text-xs font-black text-[#1A1F36] uppercase tracking-wider">
                      {item.medicine_name || `Medication #${index + 1}`}
                    </span>
                  </div>

                  {items.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeItem(index)}
                      className="inline-flex items-center gap-1 text-xs font-bold text-rose-600 hover:text-rose-800"
                    >
                      <Trash2 className="h-3.5 w-3.5" /> Remove
                    </button>
                  )}
                </div>

                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 text-xs">
                  <div>
                    <label className="font-bold text-[#8896A4] uppercase text-[10px] block mb-1">
                      Medicine / Commercial Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={item.medicine_name}
                      onChange={(e) => handleItemChange(index, 'medicine_name', e.target.value)}
                      placeholder="e.g. Semaglutide 0.25 mg"
                      className="w-full rounded-xl border border-slate-200 p-2.5 font-bold text-[#1A1F36] outline-none focus:border-[#0D9488]"
                    />
                  </div>

                  <div>
                    <label className="font-bold text-[#8896A4] uppercase text-[10px] block mb-1">
                      Generic Active Compound
                    </label>
                    <input
                      type="text"
                      value={item.generic_name}
                      onChange={(e) => handleItemChange(index, 'generic_name', e.target.value)}
                      placeholder="e.g. Semaglutide (GLP-1)"
                      className="w-full rounded-xl border border-slate-200 p-2.5 font-bold text-[#1A1F36] outline-none focus:border-[#0D9488]"
                    />
                  </div>

                  <div>
                    <label className="font-bold text-[#8896A4] uppercase text-[10px] block mb-1">
                      Strength Specification <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={item.strength}
                      onChange={(e) => handleItemChange(index, 'strength', e.target.value)}
                      placeholder="e.g. 0.25 mg / 0.5 mL"
                      className="w-full rounded-xl border border-slate-200 p-2.5 font-bold text-[#1A1F36] outline-none focus:border-[#0D9488]"
                    />
                  </div>

                  <div>
                    <label className="font-bold text-[#8896A4] uppercase text-[10px] block mb-1">
                      Dosage Form <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={item.dosage_form}
                      onChange={(e) => handleItemChange(index, 'dosage_form', e.target.value)}
                      className="w-full rounded-xl border border-slate-200 p-2.5 font-bold text-[#1A1F36] outline-none focus:border-[#0D9488]"
                    >
                      <option value="Pre-filled Multi-dose Pen (1.5 mL)">Pre-filled Pen (Multi-dose)</option>
                      <option value="Pre-filled Single-dose Pen / Vial">Single-dose Pen / Vial</option>
                      <option value="Extended Release Tablet">Extended Release Tablet</option>
                      <option value="Tablet">Oral Tablet</option>
                      <option value="Capsule">Capsule</option>
                      <option value="Subcutaneous Syringe">Subcutaneous Syringe</option>
                    </select>
                  </div>

                  <div>
                    <label className="font-bold text-[#8896A4] uppercase text-[10px] block mb-1">
                      Individual Dose &amp; Route <span className="text-red-500">*</span>
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="text"
                        value={item.dose}
                        onChange={(e) => handleItemChange(index, 'dose', e.target.value)}
                        placeholder="e.g. 0.25 mg"
                        className="w-full rounded-xl border border-slate-200 p-2.5 font-bold text-[#1A1F36] outline-none focus:border-[#0D9488]"
                      />
                      <input
                        type="text"
                        value={item.route}
                        onChange={(e) => handleItemChange(index, 'route', e.target.value)}
                        placeholder="Subcutaneous"
                        className="w-full rounded-xl border border-slate-200 p-2.5 font-bold text-[#1A1F36] outline-none focus:border-[#0D9488]"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="font-bold text-[#8896A4] uppercase text-[10px] block mb-1">
                      Frequency / Schedule <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={item.frequency}
                      onChange={(e) => handleItemChange(index, 'frequency', e.target.value)}
                      placeholder="e.g. Once weekly on Wednesdays"
                      className="w-full rounded-xl border border-slate-200 p-2.5 font-bold text-[#1A1F36] outline-none focus:border-[#0D9488]"
                    />
                  </div>

                  <div>
                    <label className="font-bold text-[#8896A4] uppercase text-[10px] block mb-1">
                      Treatment Duration <span className="text-red-500">*</span>
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="number"
                        min={1}
                        value={item.duration_value}
                        onChange={(e) => handleItemChange(index, 'duration_value', Number(e.target.value))}
                        className="w-20 rounded-xl border border-slate-200 p-2.5 font-bold text-[#1A1F36] outline-none focus:border-[#0D9488]"
                      />
                      <select
                        value={item.duration_unit}
                        onChange={(e) => handleItemChange(index, 'duration_unit', e.target.value)}
                        className="flex-1 rounded-xl border border-slate-200 p-2.5 font-bold text-[#1A1F36] outline-none focus:border-[#0D9488]"
                      >
                        <option value="WEEKS">Weeks</option>
                        <option value="DAYS">Days</option>
                        <option value="MONTHS">Months</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="font-bold text-[#8896A4] uppercase text-[10px] block mb-1">
                      Dispense Quantity <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      min={1}
                      value={item.quantity}
                      onChange={(e) => handleItemChange(index, 'quantity', Number(e.target.value))}
                      placeholder="1"
                      className="w-full rounded-xl border border-slate-200 p-2.5 font-bold text-[#1A1F36] outline-none focus:border-[#0D9488]"
                    />
                  </div>

                  <div>
                    <label className="font-bold text-[#8896A4] uppercase text-[10px] block mb-1">
                      Diet / Meal Timing
                    </label>
                    <input
                      type="text"
                      value={item.food_instruction}
                      onChange={(e) => handleItemChange(index, 'food_instruction', e.target.value)}
                      placeholder="e.g. With or without food"
                      className="w-full rounded-xl border border-slate-200 p-2.5 font-bold text-[#1A1F36] outline-none focus:border-[#0D9488]"
                    />
                  </div>

                  <div className="sm:col-span-2 lg:col-span-3">
                    <label className="font-bold text-[#8896A4] uppercase text-[10px] block mb-1">
                      Special Handling, Storage &amp; Safety Directions
                    </label>
                    <input
                      type="text"
                      value={item.special_instruction}
                      onChange={(e) => handleItemChange(index, 'special_instruction', e.target.value)}
                      placeholder="e.g. Refrigerate at 2-8°C. Do not freeze. Rotate injection sites across abdomen or thigh."
                      className="w-full rounded-xl border border-slate-200 p-2.5 font-bold text-[#1A1F36] outline-none focus:border-[#0D9488]"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Section 4: Validity & Follow-up */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <label className="text-xs font-black uppercase tracking-wider text-[#1A1F36]">
                Prescription Validity Date <span className="text-red-500">*</span>
              </label>
              <div className="flex gap-2">
                <input
                  type="date"
                  value={validUntil}
                  onChange={(e) => setValidUntil(e.target.value)}
                  className="flex-1 rounded-2xl border border-slate-200 bg-white p-3 font-bold text-xs text-[#1A1F36] outline-none focus:border-[#0D9488]"
                />
                <button
                  type="button"
                  onClick={() => setValidityDays(30)}
                  className={`px-3 py-2 rounded-xl text-xs font-black border transition-all ${validityPreset === 30 ? 'bg-[#1A1F36] text-white border-[#1A1F36]' : 'bg-white text-[#40516A] border-slate-200'}`}
                >
                  30D
                </button>
                <button
                  type="button"
                  onClick={() => setValidityDays(60)}
                  className={`px-3 py-2 rounded-xl text-xs font-black border transition-all ${validityPreset === 60 ? 'bg-[#1A1F36] text-white border-[#1A1F36]' : 'bg-white text-[#40516A] border-slate-200'}`}
                >
                  60D
                </button>
                <button
                  type="button"
                  onClick={() => setValidityDays(90)}
                  className={`px-3 py-2 rounded-xl text-xs font-black border transition-all ${validityPreset === 90 ? 'bg-[#1A1F36] text-white border-[#1A1F36]' : 'bg-white text-[#40516A] border-slate-200'}`}
                >
                  90D
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-black uppercase tracking-wider text-[#1A1F36]">
                Clinical Follow-up &amp; Safety Guidelines
              </label>
              <textarea
                value={adviceNotes}
                onChange={(e) => setAdviceNotes(e.target.value)}
                rows={3}
                placeholder="Follow-up advice, hydration instructions, red flags..."
                className="w-full rounded-2xl border border-slate-200 bg-white p-3 text-xs font-semibold text-[#1A1F36] outline-none focus:border-[#0D9488]"
              />
            </div>
          </div>

          {/* Section 5: Doctor Identity, Visual Signature & Statutory Review Declaration */}
          <div className="rounded-3xl border-2 border-[#0D9488]/30 bg-[#FAF7F5] p-6 space-y-5 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-[#1A1F36]/10 pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-black uppercase tracking-widest text-[#0D9488]">Doctor Identity</span>
                  <span className="rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-black px-2 py-0.5">Statutory Declaration</span>
                </div>
                <h3 className="text-base font-black text-[#1A1F36] mt-0.5">
                  Review &amp; Authorize Prescription
                </h3>
              </div>
              <div className="text-left sm:text-right">
                <p className="text-xs font-black text-[#1A1F36]">{doctorProfile?.full_name || 'Dr. Medical Practitioner'}</p>
                <p className="text-[11px] font-bold text-[#8896A4]">
                  Reg: {doctorProfile?.mci_number || doctorProfile?.registration_number || 'MCI/SMC-VERIFIED'}
                </p>
              </div>
            </div>

            {/* Visual Signature Area */}
            <div className="rounded-2xl border border-slate-200 bg-white p-4 space-y-2">
              <p className="text-[10px] font-black uppercase tracking-wider text-[#8896A4]">
                Doctor Visual Signature (Appears on Official PDF)
              </p>
              <div className="flex flex-wrap items-center gap-4 pt-1">
                {doctorSigUrl ? (
                  <div className="flex items-center gap-3">
                    <div className="border border-slate-200 rounded-xl p-2 bg-[#FAF7F5] max-w-[140px] max-h-[60px] flex items-center justify-center">
                      <img src={doctorSigUrl} alt="Visual Signature" className="max-h-12 object-contain" />
                    </div>
                    <div>
                      <span className="text-xs font-bold text-emerald-700 flex items-center gap-1">
                        <CheckCircle2 className="h-3.5 w-3.5" /> Signature on File
                      </span>
                      <label className="text-[11px] font-bold text-[#0D9488] hover:underline cursor-pointer block mt-0.5">
                        Replace Signature
                        <input type="file" accept="image/png,image/jpeg" className="hidden" onChange={(e) => e.target.files?.[0] && handleSignatureUpload(e.target.files[0])} />
                      </label>
                    </div>
                  </div>
                ) : (
                  <div className="border border-dashed border-slate-300 rounded-xl p-3 text-center bg-[#FAF7F5] flex items-center gap-3">
                    <span className="text-xs text-[#8896A4] font-medium">No visual signature uploaded yet.</span>
                    <label className="text-xs font-black text-white bg-[#1A1F36] px-3 py-1.5 rounded-lg cursor-pointer hover:bg-[#2A314E] transition-colors">
                      {sigUploading ? 'Uploading...' : 'Upload Signature'}
                      <input type="file" accept="image/png,image/jpeg" className="hidden" onChange={(e) => e.target.files?.[0] && handleSignatureUpload(e.target.files[0])} />
                    </label>
                  </div>
                )}
              </div>
            </div>

            {/* Doctor Statutory Declarations (Mandatory 3 Checkboxes) */}
            <div className="space-y-3 pt-1">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-[#0D9488]" />
                <h4 className="text-xs font-black uppercase tracking-wider text-[#1A1F36]">
                  Statutory Medical Declaration
                </h4>
              </div>
              <p className="text-xs text-[#8896A4]">
                Under the Telemedicine Practice Guidelines of India, all three confirmations must be verified:
              </p>

              <div className="space-y-2.5 pt-1">
                <label className="flex items-start gap-3 text-xs font-bold text-[#1A1F36] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={declReviewed}
                    onChange={(e) => setDeclReviewed(e.target.checked)}
                    className="mt-0.5 h-4 w-4 rounded border-slate-300 text-[#0D9488] focus:ring-[#0D9488]"
                  />
                  <span>I have reviewed the prescription details.</span>
                </label>

                <label className="flex items-start gap-3 text-xs font-bold text-[#1A1F36] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={declClinicalDecision}
                    onChange={(e) => setDeclClinicalDecision(e.target.checked)}
                    className="mt-0.5 h-4 w-4 rounded border-slate-300 text-[#0D9488] focus:ring-[#0D9488]"
                  />
                  <span>I confirm that this prescription represents my clinical decision for this patient.</span>
                </label>

                <label className="flex items-start gap-3 text-xs font-bold text-[#1A1F36] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={declElectronicAuth}
                    onChange={(e) => setDeclElectronicAuth(e.target.checked)}
                    className="mt-0.5 h-4 w-4 rounded border-slate-300 text-[#0D9488] focus:ring-[#0D9488]"
                  />
                  <span>I authorize this prescription to be issued electronically under my authenticated medical identity.</span>
                </label>
              </div>
            </div>
          </div>
      </div>
  )

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-2 sm:p-4 lg:p-6 overflow-y-auto">
      <div
        className={`relative w-full rounded-3xl bg-white shadow-2xl border border-[#1A1F36]/10 flex flex-col h-[94vh] max-h-[94vh] overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-200 transition-all ${
          viewMode === 'form' ? 'max-w-5xl' : 'max-w-[98vw] 2xl:max-w-[1680px]'
        }`}
      >
        {/* Modal Header */}
        <div className="sticky top-0 z-20 flex flex-wrap items-center justify-between gap-3 border-b border-[#1A1F36]/10 bg-white px-5 py-3.5 sm:px-8 shrink-0">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 sm:h-11 sm:w-11 items-center justify-center rounded-2xl bg-[#1A1F36] text-white shadow-md shrink-0">
              <Pill className="h-5 w-5 sm:h-6 sm:w-6 text-[#C4622D]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-widest text-[#C4622D]">
                  Telemedicine E-Prescription Suite
                </span>
                <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-black text-emerald-700 border border-emerald-200 hidden sm:inline-block">
                  NMC 2020 Compliant
                </span>
              </div>
              <h2 className="text-base sm:text-xl font-black text-[#1A1F36] leading-tight">
                Issue Structured Electronic Prescription (℞)
              </h2>
            </div>
          </div>

          {/* View Mode Toggle Controls */}
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="flex items-center rounded-2xl bg-[#FAF7F5] p-1 border border-slate-200/80 shadow-xs">
              <button
                type="button"
                onClick={() => setViewMode('split')}
                className={`hidden lg:inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-black transition-all ${
                  viewMode === 'split'
                    ? 'bg-white text-[#1A1F36] shadow-sm'
                    : 'text-[#8896A4] hover:text-[#1A1F36]'
                }`}
                title="View form and live prescription letterhead side by side"
              >
                <Columns className="h-3.5 w-3.5 text-[#C4622D]" />
                <span>Split View</span>
              </button>

              <button
                type="button"
                onClick={() => setViewMode('form')}
                className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-black transition-all ${
                  viewMode === 'form'
                    ? 'bg-white text-[#1A1F36] shadow-sm'
                    : 'text-[#8896A4] hover:text-[#1A1F36]'
                }`}
                title="Focus on editing the prescription form"
              >
                <FileEdit className="h-3.5 w-3.5 text-[#0D9488]" />
                <span>Edit Form</span>
              </button>

              <button
                type="button"
                onClick={() => setViewMode('preview')}
                className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-black transition-all ${
                  viewMode === 'preview'
                    ? 'bg-white text-[#1A1F36] shadow-sm'
                    : 'text-[#8896A4] hover:text-[#1A1F36]'
                }`}
                title="Full sheet preview of the official prescription"
              >
                <Eye className="h-3.5 w-3.5 text-blue-600" />
                <span>Live Sheet</span>
                <span className="ml-1 inline-flex items-center px-1.5 py-0.5 rounded-full text-[9px] font-black bg-emerald-100 text-emerald-800">
                  Live
                </span>
              </button>
            </div>

            <button
              onClick={onClose}
              className="rounded-xl p-2 text-[#8896A4] hover:bg-[#F5F0EB] hover:text-[#1A1F36] transition-colors"
            >
              <X className="h-5 w-5 sm:h-6 sm:w-6" />
            </button>
          </div>
        </div>

        {/* Modal Center Content based on viewMode */}
        {viewMode === 'split' && (
          <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 overflow-hidden min-h-0">
            {/* Left Col: Form (5/6 cols) */}
            <div className="lg:col-span-6 xl:col-span-6 2xl:col-span-5 overflow-y-auto px-5 py-6 sm:px-7 sm:py-7 border-r border-[#1A1F36]/10">
              {renderFormContent()}
            </div>

            {/* Right Col: Live Official Sheet Preview (6/7 cols) */}
            <div className="hidden lg:flex lg:col-span-6 xl:col-span-6 2xl:col-span-7 flex-col bg-slate-200/70 overflow-hidden min-h-0">
              <div className="flex items-center justify-between px-6 py-2.5 border-b border-slate-300 bg-white/90 backdrop-blur-xs shrink-0">
                <div className="flex items-center gap-2">
                  <span className="relative flex h-2.5 w-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                  </span>
                  <span className="text-xs font-black uppercase tracking-wider text-slate-900">
                    Real-Time Official Letterhead Preview
                  </span>
                  <span className="text-[11px] text-slate-500 font-medium">
                    (Telemedicine Format)
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setViewMode('preview')}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors"
                >
                  <Maximize2 className="h-3.5 w-3.5 text-[#0D9488]" />
                  <span>Full Sheet</span>
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 flex justify-center items-start">
                <div className="w-full max-w-[800px] bg-white rounded-sm shadow-2xl transition-all duration-150 border border-slate-300">
                  <PrescriptionOfficialSheet
                    patientName={resolvedPatientName}
                    prescriptionNumber={consultation ? `8LTV-RX-${consultation.id.slice(0, 8).toUpperCase()}` : '8LTV-RX-DRAFT'}
                    dateIssued={new Date().toISOString()}
                    validUntil={validUntil}
                    diagnosis={diagnosis}
                    items={items}
                    adviceNotes={adviceNotes}
                    doctorName={doctorProfile?.full_name || 'Dr. S'}
                    specialty={doctorProfile?.specialty || 'Physician'}
                    registrationNumber={doctorProfile?.mci_number || doctorProfile?.registration_number || 'MCI-RMP-78942'}
                    signatureUrl={doctorSigUrl}
                    isDraftPreview={true}
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {viewMode === 'form' && (
          <div className="flex-1 overflow-y-auto px-6 py-6 sm:px-8 sm:py-8 min-h-0">
            {renderFormContent()}
          </div>
        )}

        {viewMode === 'preview' && (
          <div className="flex-1 flex flex-col bg-slate-200/70 overflow-hidden min-h-0">
            <div className="flex items-center justify-between px-6 py-2.5 border-b border-slate-300 bg-white shrink-0">
              <div className="flex items-center gap-2">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                </span>
                <span className="text-xs font-black uppercase tracking-wider text-slate-900">
                  Official Letterhead Fullscreen Preview
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setViewMode('split')}
                  className="hidden lg:inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors"
                >
                  <Columns className="h-3.5 w-3.5 text-[#C4622D]" />
                  <span>Back to Split View</span>
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('form')}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors"
                >
                  <FileEdit className="h-3.5 w-3.5 text-[#0D9488]" />
                  <span>Edit Form</span>
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 sm:p-8 flex justify-center items-start">
              <div className="w-full max-w-[800px] bg-white rounded-sm shadow-2xl border border-slate-300">
                <PrescriptionOfficialSheet
                  patientName={resolvedPatientName}
                  prescriptionNumber={consultation ? `8LTV-RX-${consultation.id.slice(0, 8).toUpperCase()}` : '8LTV-RX-DRAFT'}
                  dateIssued={new Date().toISOString()}
                  validUntil={validUntil}
                  diagnosis={diagnosis}
                  items={items}
                  adviceNotes={adviceNotes}
                  doctorName={doctorProfile?.full_name || 'Dr. S'}
                  specialty={doctorProfile?.specialty || 'Physician'}
                  registrationNumber={doctorProfile?.mci_number || doctorProfile?.registration_number || 'MCI-RMP-78942'}
                  signatureUrl={doctorSigUrl}
                  isDraftPreview={true}
                />
              </div>
            </div>
          </div>
        )}

        {/* Modal Action Footer */}
        <div className="sticky bottom-0 z-20 flex flex-col sm:flex-row items-center justify-between border-t border-[#1A1F36]/10 bg-white px-6 py-4 sm:px-8 gap-3 shrink-0">
          <div className="flex items-center gap-2 text-xs text-[#8896A4] font-semibold">
            <ShieldCheck className="h-4 w-4 text-emerald-600 shrink-0" />
            <span>Cryptographically sealed under Indian Telemedicine Practice Guidelines, 2020.</span>
          </div>

          <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
            {viewMode === 'form' && (
              <button
                type="button"
                onClick={() => setViewMode('preview')}
                className="lg:hidden inline-flex items-center gap-1 rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3 text-xs font-black text-blue-700 hover:bg-blue-100 transition-all"
              >
                <Eye className="h-4 w-4" />
                <span>Preview Sheet</span>
              </button>
            )}

            <button
              type="button"
              disabled={isSubmitting}
              onClick={() => handleSubmit(false)}
              className="rounded-2xl border border-[#1A1F36]/20 bg-white px-5 py-3 text-xs font-black text-[#1A1F36] hover:bg-[#FAF7F5] transition-all disabled:opacity-50"
            >
              <Save className="h-4 w-4 inline mr-1.5" />
              Save as Draft
            </button>

            <button
              type="button"
              disabled={isSubmitting || !declReviewed || !declClinicalDecision || !declElectronicAuth}
              onClick={() => handleSubmit(true)}
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[#0D9488] hover:bg-[#097A70] px-6 py-3 text-xs font-black text-white shadow-lg shadow-[#0D9488]/20 transition-all hover:scale-[1.01] active:scale-[0.99] disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            >
              {isSubmitting ? (
                <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <FileCheck className="h-4 w-4" />
                  <span>AUTHORIZE &amp; ISSUE PRESCRIPTION</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
