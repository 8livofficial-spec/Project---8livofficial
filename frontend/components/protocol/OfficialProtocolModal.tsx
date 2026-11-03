'use client'

import React, { useRef } from 'react'
import {
  X,
  Printer,
  Download,
  FileText,
  Apple,
  Dumbbell,
  CheckCircle2,
} from 'lucide-react'
import CareProtocolOfficialSheet, { CareProtocolOfficialSheetProps } from './CareProtocolOfficialSheet'

export interface OfficialProtocolModalProps {
  isOpen: boolean
  onClose: () => void
  protocol: any | null
  role?: 'dietitian' | 'nutritionist' | 'fitness_coach'
  specialistProfile?: any | null
}

export default function OfficialProtocolModal({
  isOpen,
  onClose,
  protocol,
  role = 'dietitian',
  specialistProfile,
}: OfficialProtocolModalProps) {
  const [downloading, setDownloading] = React.useState(false)

  if (!isOpen || !protocol) return null

  const isFitness =
    role === 'fitness_coach' ||
    protocol.workout_type ||
    protocol.weekly_frequency ||
    protocol.type === 'FITNESS_PLAN' ||
    protocol.daily_step_goal

  const patientName =
    protocol.patient_name ||
    protocol.patient?.full_name ||
    protocol.patient?.name ||
    (protocol.patient?.first_name ? `${protocol.patient.first_name} ${protocol.patient.last_name || ''}`.trim() : '') ||
    'Patient'

  const specialistName =
    protocol.dietitian_name ||
    protocol.coach_name ||
    protocol.specialist_name ||
    specialistProfile?.full_name ||
    (isFitness ? 'Certified Fitness Coach' : 'Clinical Dietitian')

  const title = protocol.title || (isFitness ? 'Personalized Movement & Strength Protocol' : 'Clinical Metabolic Nutrition Plan')

  const protocolContent =
    protocol.meal_schedule ||
    protocol.mealSchedule ||
    protocol.workout_schedule ||
    protocol.notes ||
    protocol.description ||
    ''

  const handlePrint = () => {
    window.print()
  }

  const handleDownloadText = () => {
    setDownloading(true)
    try {
      const headerText = `========================================================\n8LIV HEALTH NETWORK - OFFICIAL CARE PROTOCOL\n${isFitness ? 'CLINICAL MOVEMENT & EXERCISE PHYSIOLOGY' : 'CLINICAL METABOLIC NUTRITION & LIFESTYLE THERAPY'}\n========================================================\n`
      const metaText = `Protocol ID: ${protocol.id || '8LIV-PROT'}\nPatient: ${patientName}\nAuthorized By: ${specialistName}\nDate: ${protocol.created_at ? new Date(protocol.created_at).toLocaleDateString('en-IN') : new Date().toLocaleDateString('en-IN')}\n\nTITLE: ${title}\n`
      const targetText = isFitness
        ? `\nWeekly Split: ${protocol.weekly_frequency || 3} sessions/week\nDaily Step Goal: ${protocol.daily_step_goal || 8000} steps/day\n\n`
        : `\nTarget Calories: ${protocol.calories_per_day || protocol.target_calories || 1600} kcal/day\nHydration Goal: ${protocol.hydration_goal || protocol.hydration_liters || 3} L/day\n\n`
      const bodyText = `SCHEDULE & PROTOCOL DIRECTIVES:\n${protocolContent}\n\n========================================================\nDigitally Certified by 8LIV Care Team • www.8liv.in\n`
      
      const blob = new Blob([headerText + metaText + targetText + bodyText], { type: 'text/plain;charset=utf-8' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `8LIV-${isFitness ? 'Fitness' : 'Diet'}-Protocol-${protocol.id ? String(protocol.id).slice(0, 8) : 'Official'}.txt`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
    } finally {
      setDownloading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/60 backdrop-blur-sm p-3 sm:p-6 overflow-y-auto">
      <div className="relative w-full max-w-4xl rounded-3xl bg-white shadow-2xl border border-[#1A1F36]/10 flex flex-col max-h-[92vh] overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-200">
        
        {/* Top Control Bar (Screen only, hidden in print) */}
        <div className="print:hidden sticky top-0 z-20 flex items-center justify-between border-b border-[#1A1F36]/10 bg-white px-6 py-4 sm:px-8">
          <div className="flex items-center gap-3">
            <div className={`flex h-10 w-10 items-center justify-center rounded-2xl ${isFitness ? 'bg-amber-500/10 text-amber-600' : 'bg-[#0D9488]/10 text-[#0D9488]'}`}>
              {isFitness ? <Dumbbell className="h-5 w-5" /> : <Apple className="h-5 w-5" />}
            </div>
            <div>
              <p className={`text-[10px] font-black uppercase tracking-widest ${isFitness ? 'text-amber-700' : 'text-[#0D9488]'}`}>
                Official Care Record
              </p>
              <h2 className="text-lg font-black text-[#1A1F36]">
                {protocol.title || (isFitness ? 'Official Movement Protocol' : 'Official Nutrition Protocol')}
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleDownloadText}
              disabled={downloading}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-black text-slate-700 hover:bg-slate-50 transition-all shadow-xs cursor-pointer"
              title="Download text summary"
            >
              <Download className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Export Text</span>
            </button>

            <button
              onClick={handlePrint}
              className={`inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-black text-white shadow-sm transition-all cursor-pointer ${isFitness ? 'bg-amber-600 hover:bg-amber-700' : 'bg-[#0D9488] hover:bg-[#0B7D73]'}`}
              title="Print official letterhead document"
            >
              <Printer className="h-3.5 w-3.5" />
              <span>Print Official Sheet</span>
            </button>

            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition-colors ml-2 cursor-pointer"
              aria-label="Close"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Sheet Body (Scrollable preview) */}
        <div className="overflow-y-auto p-4 sm:p-8 bg-slate-100/70 print:p-0 print:bg-white">
          <CareProtocolOfficialSheet
            role={isFitness ? 'fitness_coach' : 'dietitian'}
            specialistName={specialistName}
            specialistTitle={specialistProfile?.specialty || specialistProfile?.specialization}
            specialistRegistration={specialistProfile?.registration_number}
            patientName={patientName}
            patientId={protocol.patient_id}
            protocolNumber={protocol.id ? `8LIV-${isFitness ? 'FIT' : 'NUT'}-${String(protocol.id).slice(0, 8).toUpperCase()}` : undefined}
            dateIssued={protocol.created_at}
            title={title}
            targetCalories={protocol.calories_per_day || protocol.target_calories}
            targetProtein={protocol.target_protein_g}
            targetCarbs={protocol.target_carbs_g}
            targetFat={protocol.target_fat_g}
            hydrationLiters={protocol.hydration_goal ? parseFloat(protocol.hydration_goal) : protocol.hydration_liters}
            weeklyFrequency={protocol.weekly_frequency}
            dailyStepGoal={protocol.daily_step_goal}
            protocolContent={protocolContent}
            guidelines={protocol.guidelines || protocol.food_restrictions}
            clinicalNotes={protocol.notes || protocol.dietitian_notes}
          />
        </div>
      </div>
    </div>
  )
}
