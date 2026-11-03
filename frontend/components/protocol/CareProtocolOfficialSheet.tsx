'use client'

import React from 'react'
import {
  Apple,
  Dumbbell,
  CheckCircle2,
  Droplet,
  Flame,
  ShieldCheck,
  Calendar,
  User,
  HeartPulse,
} from 'lucide-react'

export interface CareProtocolOfficialSheetProps {
  role?: 'dietitian' | 'nutritionist' | 'fitness_coach'
  specialistName?: string
  specialistTitle?: string
  specialistRegistration?: string
  patientName?: string
  patientId?: string
  patientAgeGender?: string
  programName?: string
  protocolNumber?: string
  dateIssued?: string
  validUntil?: string
  title?: string
  targetCalories?: number | string
  targetProtein?: number | string
  targetCarbs?: number | string
  targetFat?: number | string
  hydrationLiters?: number | string
  weeklyFrequency?: number | string
  dailyStepGoal?: number | string
  protocolContent?: string
  guidelines?: string[] | string
  clinicalNotes?: string
  signatureUrl?: string | null
  isDraftPreview?: boolean
  className?: string
}

export default function CareProtocolOfficialSheet({
  role = 'dietitian',
  specialistName = 'Care Specialist',
  specialistTitle,
  specialistRegistration,
  patientName = 'Patient',
  patientId = '',
  patientAgeGender = 'Adult',
  programName = '8LIV Medical Care Program',
  protocolNumber = '8LIV-PROT-DRAFT',
  dateIssued,
  validUntil,
  title,
  targetCalories,
  targetProtein,
  targetCarbs,
  targetFat,
  hydrationLiters = 3.0,
  weeklyFrequency = 3,
  dailyStepGoal = 8000,
  protocolContent = '',
  guidelines,
  clinicalNotes,
  signatureUrl = null,
  isDraftPreview = false,
  className = '',
}: CareProtocolOfficialSheetProps) {
  const isFitness = role === 'fitness_coach'

  const defaultTitle = isFitness
    ? 'Personalized Movement & Strength Protocol'
    : 'Clinical Metabolic Nutrition & Diet Blueprint'

  const defaultSpecialistTitle = isFitness
    ? 'Certified Fitness Coach & Movement Specialist'
    : 'Clinical Dietitian & Metabolic Nutritionist'

  const defaultReg = isFitness ? 'ACSM-CPT / CSCS Certified' : 'IDA-RD / Clinical Nutritionist'

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

  // Parse guidelines if string
  const guidelinesList = Array.isArray(guidelines)
    ? guidelines
    : guidelines
    ? String(guidelines).split('\n').filter((l) => l.trim().length > 0)
    : isFitness
    ? [
        'Perform 5-10 minutes of dynamic warm-up before any resistance training.',
        'Hydrate with minimum 500 mL water throughout training sessions.',
        'Focus on controlled eccentric tempos and full range of motion.',
        'Take a 10-15 minute gentle walk within 30 minutes after major meals to reduce glucose spikes.',
        'Report persistent joint or tendon discomfort immediately to your care team.',
      ]
    : [
        `Maintain minimum ${hydrationLiters || 3} Litres of daily water intake.`,
        'Prioritize protein intake at each meal to safeguard lean muscle mass.',
        'Avoid refined sugars, sugar-sweetened beverages, and ultra-processed seed oils.',
        'Eat meals slowly over 20-30 minutes to facilitate satiety signaling.',
        'Contact your assigned dietitian via the patient portal for real-time macro calibrations.',
      ]

  return (
    <div
      className={`relative bg-white text-black font-sans shadow-lg border border-slate-300 p-6 sm:p-10 max-w-[850px] mx-auto select-none print:shadow-none print:border-none print:p-0 ${className}`}
      style={{ minHeight: '1050px' }}
    >
      {/* Draft Preview Indicator */}
      {isDraftPreview && (
        <div className="mb-4 flex items-center justify-between rounded-lg border border-teal-300 bg-teal-50/80 px-3 py-1.5 text-xs text-teal-900 print:hidden">
          <span className="flex items-center gap-1.5 font-bold">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-teal-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-teal-500"></span>
            </span>
            Official Live Care Sheet Preview
          </span>
          <span className="text-[11px] font-medium text-teal-800">
            Real-time letterhead preview
          </span>
        </div>
      )}

      {/* ── 1. HEADER (BRAND LOGO & SPECIALIST CREDENTIALS) ── */}
      <div className="pb-4">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          {/* Left: 8Liv Health Official Brand Logo & Credentials */}
          <div className="flex items-start gap-3.5">
            {/* Official 8Liv Brand Logo */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/brand-logo-official.png"
              alt="8Liv Health Official Logo"
              className="h-10 sm:h-12 w-auto object-contain block shrink-0 mt-0.5 drop-shadow-2xs"
            />
            <div>
              <h1 className="text-xl sm:text-2xl font-black tracking-tight text-black leading-tight uppercase">
                8LIV HEALTH NETWORK
              </h1>
              <p className="text-[11px] font-bold uppercase tracking-wider text-black mt-0.5">
                {isFitness ? 'CLINICAL MOVEMENT & EXERCISE PHYSIOLOGY' : 'CLINICAL METABOLIC NUTRITION & LIFESTYLE THERAPY'}
              </p>
              <p className="text-[10px] text-slate-600 font-medium mt-0.5">
                Infinity Liv Healthcare Technologies Pvt. Ltd. • Ministry of Corporate Affairs Registered
              </p>
              <p className="text-[10px] text-slate-500 font-medium">
                Concierge Care Telehealth Protocol • care@8liv.in • www.8liv.in
              </p>
            </div>
          </div>

          {/* Right: Specialist Profile */}
          <div className="sm:text-right text-xs shrink-0">
            <h2 className="text-lg font-black text-black leading-tight">
              {specialistName}
            </h2>
            <p className="text-xs font-semibold text-black mt-0.5">
              {specialistTitle || defaultSpecialistTitle}
            </p>
            <p className="text-[11px] text-slate-700 font-medium mt-0.5">
              Credentials: <span className="font-semibold">{specialistRegistration || defaultReg}</span>
            </p>
            <p className="text-[10px] text-slate-500 mt-0.5">
              8LIV Certified Clinical Care Team
            </p>
          </div>
        </div>

        {/* Thick Divider Line */}
        <div className="w-full border-b-2 border-black mt-4" />
      </div>

      {/* ── 2. FOUR-COLUMN PATIENT & PROTOCOL METADATA BAR ── */}
      <div className="py-2">
        <div className="grid grid-cols-2 sm:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-slate-300 py-1 text-xs">
          <div className="px-2 sm:px-3 py-1">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-600">
              PATIENT NAME
            </p>
            <p className="text-sm font-black text-black mt-1 truncate">
              {patientName || 'Patient'}
            </p>
            {patientId && (
              <p className="text-[9px] font-mono text-slate-500 mt-0.5 truncate">
                ID: {patientId.slice(0, 12)}
              </p>
            )}
          </div>

          <div className="px-2 sm:px-3 py-1">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-600">
              DOCUMENT ID
            </p>
            <p className="font-mono text-xs font-black text-black mt-1 break-all">
              {protocolNumber || (isFitness ? '8LIV-FIT-DRAFT' : '8LIV-NUT-DRAFT')}
            </p>
            <p className="text-[9px] font-bold text-teal-800 mt-0.5 uppercase">
              {programName}
            </p>
          </div>

          <div className="px-2 sm:px-3 py-1">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-600">
              DATE AUTHORIZED
            </p>
            <p className="text-sm font-black text-black mt-1">
              {formattedDateIssued}
            </p>
          </div>

          <div className="px-2 sm:px-3 py-1">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-600">
              VALID THROUGH
            </p>
            <p className="text-sm font-black text-black mt-1">
              {formattedValidUntil}
            </p>
          </div>
        </div>

        {/* Thick Divider Line */}
        <div className="w-full border-b-2 border-black mt-2" />
      </div>

      {/* ── 3. PROTOCOL TITLE & CLINICAL INDICATION ── */}
      <div className="mt-4">
        <p className="text-[11px] font-black uppercase tracking-wider text-black mb-1.5 flex items-center gap-1.5">
          {isFitness ? <Dumbbell className="w-3.5 h-3.5 text-black" /> : <Apple className="w-3.5 h-3.5 text-black" />}
          <span>CARE PROTOCOL TITLE &amp; CLINICAL OBJECTIVE</span>
        </p>
        <div className="border border-black rounded-xl p-3 bg-slate-50/50">
          <p className="text-sm font-black text-black leading-snug">
            {title || defaultTitle}
          </p>
          <p className="text-xs text-slate-700 font-medium mt-1">
            {isFitness
              ? 'Calibrated for lean muscle preservation, resting metabolic rate elevation, and insulin sensitivity.'
              : 'Calibrated for sustained glycemic stability, optimal satiety signaling, and fat oxidation under GLP-1 therapy.'}
          </p>
        </div>
      </div>

      {/* ── 4. KEY TARGET METRICS SUMMARY STRIP ── */}
      <div className="mt-5">
        <p className="text-[11px] font-black uppercase tracking-wider text-black mb-2">
          {isFitness ? 'PRIMARY MOVEMENT TARGETS' : 'PRIMARY METABOLIC TARGETS'}
        </p>
        {!isFitness ? (
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-center">
            <div className="border border-black rounded-xl p-2.5 bg-white">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-600 block">Daily Energy</span>
              <span className="text-base font-black text-black block mt-0.5">{targetCalories ? `${targetCalories} kcal` : 'Calibrated'}</span>
            </div>
            <div className="border border-black rounded-xl p-2.5 bg-white">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-600 block">Protein</span>
              <span className="text-base font-black text-black block mt-0.5">{targetProtein ? `${targetProtein}g` : '80-100g'}</span>
            </div>
            <div className="border border-black rounded-xl p-2.5 bg-white">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-600 block">Carbs</span>
              <span className="text-base font-black text-black block mt-0.5">{targetCarbs ? `${targetCarbs}g` : '120-140g'}</span>
            </div>
            <div className="border border-black rounded-xl p-2.5 bg-white">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-600 block">Healthy Fats</span>
              <span className="text-base font-black text-black block mt-0.5">{targetFat ? `${targetFat}g` : '40-50g'}</span>
            </div>
            <div className="border border-black rounded-xl p-2.5 bg-white col-span-2 sm:col-span-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-600 block">Hydration</span>
              <span className="text-base font-black text-black block mt-0.5">{hydrationLiters ? `${hydrationLiters} L/day` : '3.0 L/day'}</span>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
            <div className="border border-black rounded-xl p-2.5 bg-white">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-600 block">Weekly Split</span>
              <span className="text-base font-black text-black block mt-0.5">{weeklyFrequency} Sessions/wk</span>
            </div>
            <div className="border border-black rounded-xl p-2.5 bg-white">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-600 block">Daily Step Goal</span>
              <span className="text-base font-black text-black block mt-0.5">{Number(dailyStepGoal || 8000).toLocaleString()} steps</span>
            </div>
            <div className="border border-black rounded-xl p-2.5 bg-white">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-600 block">Cardio Focus</span>
              <span className="text-base font-black text-black block mt-0.5">Zone 2 Aerobic</span>
            </div>
            <div className="border border-black rounded-xl p-2.5 bg-white">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-600 block">Rest &amp; Recovery</span>
              <span className="text-base font-black text-black block mt-0.5">2-3 Days Active</span>
            </div>
          </div>
        )}
      </div>

      {/* ── 5. DETAILED PROTOCOL SPECIFICATION (CUSTOM / COPY-PASTED TEXT) ── */}
      <div className="mt-6">
        <p className="text-[11px] font-black uppercase tracking-wider text-black mb-2 flex items-center justify-between">
          <span>{isFitness ? 'SCHEDULED WORKOUT & EXERCISE REGIMEN' : 'CLINICAL MEAL SCHEDULE & DIETARY PROTOCOL'}</span>
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Authorized Prescription</span>
        </p>

        <div className="border border-black rounded-xl p-4 sm:p-5 bg-white text-xs leading-relaxed font-sans text-black whitespace-pre-wrap min-h-[220px]">
          {protocolContent ? (
            protocolContent
          ) : (
            <div className="text-slate-400 italic py-6 text-center">
              [Protocol details will be formatted here as written or pasted by the specialist]
            </div>
          )}
        </div>
      </div>

      {/* ── 6. MANDATORY CLINICAL DIRECTIVES & SAFETY GUIDELINES ── */}
      <div className="mt-5 border border-black rounded-xl p-4 bg-white">
        <p className="text-[11px] font-black uppercase tracking-wider text-black mb-2 flex items-center gap-1.5">
          <ShieldCheck className="w-3.5 h-3.5 text-black" />
          <span>MANDATORY CARE DIRECTIVES &amp; CLINICAL INSTRUCTIONS:</span>
        </p>
        <ul className="text-xs text-black space-y-1.5 pl-4 list-disc font-medium leading-relaxed">
          {guidelinesList.map((g, idx) => (
            <li key={idx}>{g}</li>
          ))}
        </ul>

        {clinicalNotes && (
          <div className="mt-3 pt-3 border-t border-slate-200">
            <p className="text-[10px] font-bold uppercase text-slate-600 mb-0.5">Specialist Clinical Notes:</p>
            <p className="text-xs text-black font-semibold whitespace-pre-wrap">{clinicalNotes}</p>
          </div>
        )}
      </div>

      {/* ── 7. FOOTER (SIGNATURE, COMPLIANCE & LEGAL) ── */}
      <div className="mt-8 pt-4 flex flex-col sm:flex-row items-start sm:items-end justify-between gap-6 border-t border-slate-300">
        {/* Left: Issued by metadata & legal disclaimer */}
        <div className="text-xs text-black space-y-0.5 max-w-sm">
          <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Authorized Specialist:</p>
          <p className="font-black text-sm text-black">
            {specialistName}
          </p>
          <p className="font-semibold text-slate-800 text-[11px]">{specialistTitle || defaultSpecialistTitle}</p>
          <p className="font-medium text-slate-600 text-[10px]">Credentials: {specialistRegistration || defaultReg}</p>
          <p className="font-bold text-black text-[11px] mt-1">8LIV Concierge Health Network</p>

          <p className="text-[9px] text-slate-500 font-medium leading-tight mt-2 pt-2 border-t border-slate-200">
            This official care protocol is prepared under clinical supervision for the sole use of the designated patient.
            Delivered securely via the 8LIV Health Patient Portal.
          </p>
        </div>

        {/* Right: Signature stamp & Certification */}
        <div className="sm:text-right text-xs shrink-0 flex flex-col items-start sm:items-end">
          <div className="min-h-[50px] flex items-end justify-center sm:justify-end pb-1 border-b border-black w-48">
            {signatureUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={signatureUrl}
                alt="Specialist Digital Signature"
                className="h-12 max-w-[160px] object-contain"
              />
            ) : (
              <span className="font-serif italic font-black text-2xl text-slate-900 tracking-wide select-none">
                {specialistName}
              </span>
            )}
          </div>

          <p className="font-black text-xs text-black mt-1">
            {specialistName}
          </p>
          <p className="text-[10px] text-slate-600 font-semibold uppercase tracking-wider">
            Digitally Certified Care Protocol
          </p>
          <p className="text-[9px] font-mono text-slate-500 mt-0.5">
            Ref: {protocolNumber}
          </p>
        </div>
      </div>
    </div>
  )
}

