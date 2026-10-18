'use client'

import React, { useState, useEffect } from 'react'
import {
  X,
  ShieldCheck,
  Pill,
  Utensils,
  Dumbbell,
  Clock,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  ChevronRight,
  Droplets,
  Flame,
} from 'lucide-react'
import { authedFetch } from '@/lib/apiClient'

interface Props {
  isOpen: boolean
  onClose: () => void
  patientId?: string
}

type TabType = 'doctor' | 'dietitian' | 'trainer'

export default function InCallProtocolsDrawer({ isOpen, onClose, patientId }: Props) {
  const [activeTab, setActiveTab] = useState<TabType>('doctor')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [protocols, setProtocols] = useState<{
    prescriptions: any[]
    activePrescription: any | null
    nutritionPlans: any[]
    activeNutritionPlan: any | null
    fitnessPlans: any[]
    activeFitnessPlan: any | null
  }>({
    prescriptions: [],
    activePrescription: null,
    nutritionPlans: [],
    activeNutritionPlan: null,
    fitnessPlans: [],
    activeFitnessPlan: null,
  })

  useEffect(() => {
    if (!isOpen) return

    let isMounted = true
    setLoading(true)
    setError('')

    const endpoint = patientId
      ? `/api/patient/care-protocols?patientId=${encodeURIComponent(patientId)}`
      : '/api/patient/care-protocols'

    authedFetch(endpoint)
      .then(async (res) => {
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || 'Unable to load care protocols.')
        if (isMounted) {
          setProtocols({
            prescriptions: data.prescriptions || [],
            activePrescription: data.activePrescription || null,
            nutritionPlans: data.nutritionPlans || [],
            activeNutritionPlan: data.activeNutritionPlan || null,
            fitnessPlans: data.fitnessPlans || [],
            activeFitnessPlan: data.activeFitnessPlan || null,
          })
        }
      })
      .catch((err) => {
        if (isMounted) setError(err instanceof Error ? err.message : 'Unable to load protocols.')
      })
      .finally(() => {
        if (isMounted) setLoading(false)
      })

    return () => {
      isMounted = false
    }
  }, [isOpen, patientId])

  if (!isOpen) return null

  return (
    <aside
      className="absolute top-0 right-0 bottom-16 sm:bottom-20 z-40 w-full sm:w-96 bg-[#0B0F1D]/95 border-l border-white/10 shadow-2xl backdrop-blur-2xl flex flex-col text-white animate-in slide-in-from-right duration-300"
      aria-label="Care Protocols and Patient History Drawer"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-white/10 bg-slate-900/60">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-[#00A884]/20 border border-[#00A884]/30 flex items-center justify-center text-[#2DD4BF]">
            <ShieldCheck className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold font-sora">Care Protocols &amp; History</h3>
            <p className="text-[11px] text-slate-400">Live consultation reference</p>
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
          title="Close drawer"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Specialist Selector Tabs */}
      <div className="grid grid-cols-3 p-2 bg-slate-950/60 border-b border-white/10 gap-1 text-xs font-bold font-sora">
        <button
          type="button"
          onClick={() => setActiveTab('doctor')}
          className={`py-2 px-1 rounded-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
            activeTab === 'doctor'
              ? 'bg-[#00A884] text-white shadow-sm'
              : 'text-slate-400 hover:text-white hover:bg-white/5'
          }`}
        >
          <Pill className="w-3.5 h-3.5" />
          <span>Doctor Rx</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('dietitian')}
          className={`py-2 px-1 rounded-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
            activeTab === 'dietitian'
              ? 'bg-[#00A884] text-white shadow-sm'
              : 'text-slate-400 hover:text-white hover:bg-white/5'
          }`}
        >
          <Utensils className="w-3.5 h-3.5" />
          <span>Nutrition</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('trainer')}
          className={`py-2 px-1 rounded-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
            activeTab === 'trainer'
              ? 'bg-[#00A884] text-white shadow-sm'
              : 'text-slate-400 hover:text-white hover:bg-white/5'
          }`}
        >
          <Dumbbell className="w-3.5 h-3.5" />
          <span>Fitness</span>
        </button>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs scrollbar-thin">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-12 gap-3 text-slate-400">
            <div className="w-6 h-6 border-2 border-teal-400 border-t-transparent rounded-full animate-spin" />
            <span>Loading verified care records...</span>
          </div>
        ) : error ? (
          <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-200">
            <p className="font-bold">Notice</p>
            <p className="mt-1 text-[11px] text-red-300">{error}</p>
          </div>
        ) : (
          <>
            {/* ══════════════════════════════════════════════════════════════
                DOCTOR TAB
                ══════════════════════════════════════════════════════════════ */}
            {activeTab === 'doctor' && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">
                    Active E-Prescriptions
                  </span>
                  <span className="text-[10px] text-teal-400 font-semibold">
                    {protocols.prescriptions.length} Records
                  </span>
                </div>

                {protocols.activePrescription ? (
                  <div className="p-4 rounded-2xl bg-white/5 border border-teal-500/30 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-[11px] text-teal-300 font-bold">
                        {protocols.activePrescription.prescription_number}
                      </span>
                      <span className="text-[9px] uppercase px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/30">
                        Active Rx
                      </span>
                    </div>

                    <div className="space-y-2">
                      {(protocols.activePrescription.prescription_items || []).map((med: any) => (
                        <div key={med.id} className="p-2.5 rounded-xl bg-black/30 border border-white/5">
                          <p className="font-bold text-white text-xs">{med.medicine_name} ({med.strength})</p>
                          <p className="text-[11px] text-slate-300 mt-0.5">
                            {med.dose} • {med.frequency} • {med.duration_value} {med.duration_unit}
                          </p>
                          {med.instructions && (
                            <p className="text-[10px] text-teal-300 mt-1 italic">
                              "{med.instructions}"
                            </p>
                          )}
                        </div>
                      ))}
                    </div>

                    <div className="pt-2 border-t border-white/10 flex items-center justify-between text-[11px] text-slate-400">
                      <span>Doctor: {protocols.activePrescription.doctor?.name || 'Assigned Physician'}</span>
                      <span>
                        {protocols.activePrescription.issued_at
                          ? new Date(protocols.activePrescription.issued_at).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })
                          : ''}
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="p-6 rounded-2xl bg-white/5 border border-white/5 text-center text-slate-400">
                    <Pill className="w-8 h-8 mx-auto mb-2 text-slate-500 opacity-60" />
                    <p className="font-bold">No active e-prescription</p>
                    <p className="text-[11px] mt-1 text-slate-500">
                      Official medication orders prescribed by your doctor will show here.
                    </p>
                  </div>
                )}

                {protocols.prescriptions.length > 1 && (
                  <div className="pt-2 space-y-2">
                    <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500">
                      Previous Rx History
                    </span>
                    {protocols.prescriptions.slice(1).map((rx) => (
                      <div key={rx.id} className="p-3 rounded-xl bg-white/[0.02] border border-white/5">
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="font-mono text-slate-300 font-semibold">{rx.prescription_number}</span>
                          <span className="text-slate-400">{rx.issued_at ? new Date(rx.issued_at).toLocaleDateString('en-IN') : ''}</span>
                        </div>
                        <p className="text-[11px] text-slate-400 mt-1">
                          {(rx.prescription_items || []).map((m: any) => m.medicine_name).join(', ') || 'Prescription items'}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ══════════════════════════════════════════════════════════════
                DIETITIAN TAB
                ══════════════════════════════════════════════════════════════ */}
            {activeTab === 'dietitian' && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">
                    Active Nutrition Blueprint
                  </span>
                  <span className="text-[10px] text-teal-400 font-semibold">
                    {protocols.nutritionPlans.length} Plans
                  </span>
                </div>

                {protocols.activeNutritionPlan ? (
                  <div className="p-4 rounded-2xl bg-white/5 border border-teal-500/30 space-y-3">
                    <div>
                      <div className="flex items-center justify-between">
                        <h4 className="font-bold text-white text-xs">
                          {protocols.activeNutritionPlan.title}
                        </h4>
                        <span className="text-[9px] uppercase px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/30">
                          v{protocols.activeNutritionPlan.version || 1} Active
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-300 mt-1 leading-relaxed">
                        {protocols.activeNutritionPlan.description}
                      </p>
                    </div>

                    {/* Macro Target Pills */}
                    <div className="grid grid-cols-4 gap-1.5 p-2 rounded-xl bg-black/40 border border-white/5 text-center">
                      <div className="p-1">
                        <span className="text-[9px] text-slate-400 block">Kcal</span>
                        <span className="text-xs font-bold text-teal-300">{protocols.activeNutritionPlan.target_calories || 1650}</span>
                      </div>
                      <div className="p-1">
                        <span className="text-[9px] text-slate-400 block">Protein</span>
                        <span className="text-xs font-bold text-emerald-300">{protocols.activeNutritionPlan.target_protein_g || 90}g</span>
                      </div>
                      <div className="p-1">
                        <span className="text-[9px] text-slate-400 block">Carbs</span>
                        <span className="text-xs font-bold text-amber-300">{protocols.activeNutritionPlan.target_carbs_g || 140}g</span>
                      </div>
                      <div className="p-1">
                        <span className="text-[9px] text-slate-400 block">Fat</span>
                        <span className="text-xs font-bold text-rose-300">{protocols.activeNutritionPlan.target_fat_g || 45}g</span>
                      </div>
                    </div>

                    {/* Guidelines */}
                    {protocols.activeNutritionPlan.guidelines && protocols.activeNutritionPlan.guidelines.length > 0 && (
                      <div className="space-y-1.5 pt-1">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                          Dietitian Session Guidelines
                        </span>
                        <ul className="space-y-1">
                          {protocols.activeNutritionPlan.guidelines.slice(0, 3).map((g: string, i: number) => (
                            <li key={i} className="flex items-start gap-1.5 text-[11px] text-slate-300">
                              <span className="text-teal-400 mt-0.5">•</span>
                              <span>{g}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Hydration */}
                    <div className="flex items-center gap-2 p-2 rounded-xl bg-teal-500/10 text-teal-300 border border-teal-500/20 text-[11px]">
                      <Droplets className="w-3.5 h-3.5 shrink-0" />
                      <span>Daily Water Goal: <strong>{protocols.activeNutritionPlan.hydration_liters || 3.0} Liters</strong></span>
                    </div>

                    <div className="pt-2 border-t border-white/10 flex items-center justify-between text-[11px] text-slate-400">
                      <span>Dietitian: {protocols.activeNutritionPlan.dietitian_name || 'Clinical Dietitian'}</span>
                      <span>
                        {protocols.activeNutritionPlan.created_at
                          ? new Date(protocols.activeNutritionPlan.created_at).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })
                          : ''}
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="p-6 rounded-2xl bg-white/5 border border-white/5 text-center text-slate-400">
                    <Utensils className="w-8 h-8 mx-auto mb-2 text-slate-500 opacity-60" />
                    <p className="font-bold">No active nutrition plan</p>
                    <p className="text-[11px] mt-1 text-slate-500">
                      Your clinical dietitian will tailor and issue your meal plan after your session.
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* ══════════════════════════════════════════════════════════════
                GYM TRAINER TAB
                ══════════════════════════════════════════════════════════════ */}
            {activeTab === 'trainer' && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">
                    Active Movement Protocol
                  </span>
                  <span className="text-[10px] text-teal-400 font-semibold">
                    {protocols.fitnessPlans.length} Plans
                  </span>
                </div>

                {protocols.activeFitnessPlan ? (
                  <div className="p-4 rounded-2xl bg-white/5 border border-teal-500/30 space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="font-bold text-white text-xs">
                        {protocols.activeFitnessPlan.title}
                      </h4>
                      <span className="text-[9px] uppercase px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/30">
                        Active Protocol
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-[11px]">
                      <div className="p-2.5 rounded-xl bg-black/40 border border-white/5">
                        <span className="text-[9px] text-slate-400 block uppercase font-bold">Split Frequency</span>
                        <span className="font-bold text-white mt-0.5 block">
                          {protocols.activeFitnessPlan.weekly_frequency}x per week
                        </span>
                      </div>
                      <div className="p-2.5 rounded-xl bg-black/40 border border-white/5">
                        <span className="text-[9px] text-slate-400 block uppercase font-bold">Daily Step Target</span>
                        <span className="font-bold text-teal-300 mt-0.5 block">
                          {(protocols.activeFitnessPlan.daily_step_goal || 8000).toLocaleString()} steps
                        </span>
                      </div>
                    </div>

                    <div className="p-2.5 rounded-xl bg-white/[0.03] border border-white/5">
                      <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">
                        Focus Movement
                      </span>
                      <p className="text-white text-[11px] font-semibold mt-1">
                        {protocols.activeFitnessPlan.workout_type}
                      </p>
                    </div>

                    {protocols.activeFitnessPlan.notes && (
                      <div className="space-y-1">
                        <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">
                          Coach Session Instructions
                        </span>
                        <p className="text-[11px] text-slate-300 italic leading-relaxed">
                          "{protocols.activeFitnessPlan.notes}"
                        </p>
                      </div>
                    )}

                    <div className="pt-2 border-t border-white/10 flex items-center justify-between text-[11px] text-slate-400">
                      <span>Coach: {protocols.activeFitnessPlan.coach_name || 'Certified Fitness Coach'}</span>
                      <span>
                        {protocols.activeFitnessPlan.created_at
                          ? new Date(protocols.activeFitnessPlan.created_at).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })
                          : ''}
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="p-6 rounded-2xl bg-white/5 border border-white/5 text-center text-slate-400">
                    <Dumbbell className="w-8 h-8 mx-auto mb-2 text-slate-500 opacity-60" />
                    <p className="font-bold">No active fitness protocol</p>
                    <p className="text-[11px] mt-1 text-slate-500">
                      Your assigned coach will construct your tailored movement schedule.
                    </p>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </aside>
  )
}
