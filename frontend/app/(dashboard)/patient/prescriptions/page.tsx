'use client'

import React, { useEffect, useState, useMemo } from 'react'
import Link from 'next/link'
import {
  FileText,
  Pill,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  Download,
  Clock,
  Utensils,
  Dumbbell,
  Droplets,
  Flame,
  Activity,
  Layers,
  Calendar,
  Sparkles,
} from 'lucide-react'
import { authedFetch } from '@/lib/apiClient'

type SpecialistFilter = 'all' | 'doctor' | 'dietitian' | 'trainer'

export default function PatientPrescriptionsPage() {
  const [filter, setFilter] = useState<SpecialistFilter>('all')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [data, setData] = useState<{
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
    setLoading(true)
    setError('')
    authedFetch('/api/patient/care-protocols')
      .then(async (res) => {
        const payload = await res.json()
        if (!res.ok) throw new Error(payload.error || 'Unable to load care protocols.')
        setData({
          prescriptions: payload.prescriptions || [],
          activePrescription: payload.activePrescription || null,
          nutritionPlans: payload.nutritionPlans || [],
          activeNutritionPlan: payload.activeNutritionPlan || null,
          fitnessPlans: payload.fitnessPlans || [],
          activeFitnessPlan: payload.activeFitnessPlan || null,
        })
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Unable to load care protocols.'))
      .finally(() => setLoading(false))
  }, [])

  // Unified Chronological History
  const unifiedHistory = useMemo(() => {
    const list: Array<{
      id: string
      specialist: 'doctor' | 'dietitian' | 'trainer'
      title: string
      subtitle: string
      date: string
      status: string
      statusColor: string
      link?: string
      itemsSummary?: string
      meta1Label: string
      meta1Value: string
      meta2Label: string
      meta2Value: string
      meta3Label: string
      meta3Value: string
    }> = []

    // Doctor Prescriptions
    if (filter === 'all' || filter === 'doctor') {
      for (const rx of data.prescriptions) {
        const isActive = ['ISSUED', 'ACTIVE', 'SIGNED'].includes(rx.status)
        list.push({
          id: rx.id,
          specialist: 'doctor',
          title: rx.prescription_number,
          subtitle: rx.doctor?.name || 'Authorized 8LIV Physician',
          date: rx.issued_at || rx.created_at,
          status: isActive ? 'Active Clinical Rx' : rx.status,
          statusColor: isActive ? 'bg-emerald-50 text-emerald-700 border-emerald-200/60' : 'bg-slate-100 text-slate-700 border-slate-200',
          link: `/patient/prescriptions/${rx.id}`,
          itemsSummary: (rx.prescription_items || []).map((m: any) => `${m.medicine_name} (${m.strength})`).join(', ') || 'Prescription medications',
          meta1Label: 'Issued Date',
          meta1Value: rx.issued_at ? new Date(rx.issued_at).toLocaleDateString('en-IN') : '-',
          meta2Label: 'Valid Until',
          meta2Value: rx.valid_until ? new Date(rx.valid_until).toLocaleDateString('en-IN') : '-',
          meta3Label: 'Pharmacy',
          meta3Value: 'Any licensed pharmacy',
        })
      }
    }

    // Dietitian Nutrition Plans
    if (filter === 'all' || filter === 'dietitian') {
      for (const plan of data.nutritionPlans) {
        const isCurrent = plan.status === 'PUBLISHED' || plan.status === 'ACKNOWLEDGED' || plan.status === 'ACTIVE'
        list.push({
          id: plan.id,
          specialist: 'dietitian',
          title: plan.title || 'Indian Metabolic Meal Blueprint',
          subtitle: plan.dietitian_name || 'Clinical Dietitian (RD)',
          date: plan.created_at,
          status: isCurrent ? `Active Blueprint v${plan.version || 1}` : plan.status,
          statusColor: isCurrent ? 'bg-teal-50 text-teal-700 border-teal-200/60' : 'bg-slate-100 text-slate-700 border-slate-200',
          link: '/patient/care-plan',
          itemsSummary: plan.description || 'Target macros and clinical nutritional therapy guidelines.',
          meta1Label: 'Target Calories',
          meta1Value: plan.target_calories ? `${plan.target_calories} kcal/day` : 'Calibrated plan',
          meta2Label: 'Protein & Hydration',
          meta2Value: `${plan.target_protein_g || 90}g protein • ${plan.hydration_liters || 3}L water`,
          meta3Label: 'Dietitian Review',
          meta3Value: plan.dietitian_name || 'Verified Care Team',
        })
      }
    }

    // Fitness Coach Workout Plans
    if (filter === 'all' || filter === 'trainer') {
      for (const fp of data.fitnessPlans) {
        const isCurrent = fp.status === 'ACTIVE'
        list.push({
          id: fp.id,
          specialist: 'trainer',
          title: fp.title || `${fp.workout_type || 'Custom'} Training Protocol`,
          subtitle: fp.coach_name || 'Certified Fitness Coach',
          date: fp.created_at,
          status: isCurrent ? 'Active Movement Plan' : fp.status,
          statusColor: isCurrent ? 'bg-amber-50 text-amber-700 border-amber-200/60' : 'bg-slate-100 text-slate-700 border-slate-200',
          link: '/patient/care-plan',
          itemsSummary: fp.notes || `Focus: ${fp.workout_type} (${fp.weekly_frequency} sessions/week)`,
          meta1Label: 'Split Frequency',
          meta1Value: `${fp.weekly_frequency} sessions/week`,
          meta2Label: 'Daily Steps',
          meta2Value: `${(fp.daily_step_goal || 8000).toLocaleString()} steps/day`,
          meta3Label: 'Restrictions',
          meta3Value: fp.exercise_restrictions || 'None reported',
        })
      }
    }

    return list.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
  }, [data, filter])

  return (
    <div className="space-y-6 text-[#1A1F36]">
      {/* Page Title & Specialist Filter Tabs */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl sm:text-3xl font-black font-sora tracking-tight text-slate-900">
            Care Protocols &amp; Prescriptions
          </h2>
          <p className="text-xs sm:text-sm font-semibold text-[#8896A4] mt-1">
            Official medical prescriptions, clinical nutrition blueprints, and coach movement protocols authorized by your 8LIV care team.
          </p>
        </div>

        <Link
          href="/patient/care-plan"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold font-sora bg-white border border-slate-200 text-slate-700 hover:text-slate-900 hover:bg-slate-50 transition-all shadow-xs w-fit"
        >
          <Layers className="w-3.5 h-3.5 text-[#0D9488]" />
          <span>Interactive Care Plan →</span>
        </Link>
      </div>

      {/* Specialist Filter Pill Navigation */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-thin">
        {[
          { key: 'all' as const, label: 'All Care Protocols', icon: Layers, count: unifiedHistory.length },
          { key: 'doctor' as const, label: 'Doctor (Medical Rx)', icon: Pill, count: data.prescriptions.length },
          { key: 'dietitian' as const, label: 'Dietitian (Nutrition)', icon: Utensils, count: data.nutritionPlans.length },
          { key: 'trainer' as const, label: 'Gym Trainer (Workouts)', icon: Dumbbell, count: data.fitnessPlans.length },
        ].map((tab) => {
          const Icon = tab.icon
          const isActive = filter === tab.key
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => setFilter(tab.key)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold font-sora whitespace-nowrap transition-all cursor-pointer ${
                isActive
                  ? 'bg-[#061810] text-white shadow-md shadow-emerald-950/20 ring-1 ring-emerald-500/40'
                  : 'bg-white hover:bg-slate-100 text-slate-600 border border-slate-200/80 shadow-2xs'
              }`}
            >
              <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-[#00A884]' : 'text-slate-500'}`} />
              <span>{tab.label}</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                isActive ? 'bg-[#00A884]/30 text-teal-300' : 'bg-slate-100 text-slate-600'
              }`}>
                {tab.count}
              </span>
            </button>
          )
        })}
      </div>

      {error && (
        <p className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-700">
          {error}
        </p>
      )}

      {loading ? (
        <div className="space-y-4">
          {[1, 2].map((i) => (
            <div key={i} className="dash-card p-6 animate-pulse space-y-3">
              <div className="h-5 w-40 bg-slate-100 rounded-lg" />
              <div className="h-8 w-64 bg-slate-100 rounded-lg" />
              <div className="h-16 bg-slate-50 rounded-xl" />
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-6">
          {/* ══════════════════════════════════════════════════════════════
              ACTIVE PROTOCOLS SPOTLIGHT SECTION
              ══════════════════════════════════════════════════════════════ */}

          {/* 1. Doctor Spotlight */}
          {(filter === 'all' || filter === 'doctor') && data.activePrescription && (
            <div className="rounded-3xl border-2 border-[#0D9488]/30 bg-gradient-to-br from-white to-[#0D9488]/5 p-6 shadow-sm">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-[#0D9488]/15 pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-[#0D9488]/15 flex items-center justify-center text-[#0D9488]">
                    <ShieldCheck className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-black uppercase tracking-wider text-[#0D9488]">
                        Active E-Prescription • Doctor Supervised
                      </span>
                      <span className="flex h-2 w-2 relative">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                      </span>
                    </div>
                    <h3 className="text-lg font-black text-[#1A1F36] mt-0.5">
                      {data.activePrescription.prescription_number}
                    </h3>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <Link
                    href={`/patient/prescriptions/${data.activePrescription.id}`}
                    className="inline-flex items-center gap-2 rounded-xl bg-[#0D9488] hover:bg-[#0B7A6F] text-white px-5 py-2.5 text-xs font-black uppercase tracking-wider transition-all shadow-md"
                  >
                    View prescription <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>

              {/* Medication details */}
              <div className="mt-4 grid gap-3">
                {(data.activePrescription.prescription_items || []).map((item: any) => (
                  <div key={item.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-3.5 rounded-2xl bg-white border border-[#0D9488]/20 gap-2">
                    <div>
                      <p className="text-sm font-black text-[#1A1F36] flex items-center gap-2">
                        <Pill className="w-4 h-4 text-[#0D9488]" />
                        {item.medicine_name}
                        <span className="text-xs font-bold text-[#8896A4]">({item.strength})</span>
                      </p>
                      <p className="text-xs font-semibold text-[#40516A] mt-0.5">
                        {item.dose} • {item.route} • {item.frequency} for {item.duration_value} {String(item.duration_unit || 'weeks').toLowerCase()}
                      </p>
                    </div>
                    <span className="text-xs font-black text-[#0D9488] bg-[#0D9488]/10 px-3 py-1 rounded-full w-fit">
                      Qty: {item.quantity}
                    </span>
                  </div>
                ))}
              </div>

              <div className="mt-4 grid gap-3 border-t border-[#0D9488]/15 pt-4 text-xs sm:grid-cols-3 text-[#40516A]">
                <div>
                  <span className="text-[10px] font-black uppercase tracking-wider text-[#8896A4] block">Prescribing Physician</span>
                  <span className="font-bold text-[#1A1F36]">{data.activePrescription.doctor?.name || '8LIV Physician'}</span>
                  {data.activePrescription.doctor?.reg_number && (
                    <span className="block text-[11px] text-[#8896A4]">Reg: {data.activePrescription.doctor.reg_number}</span>
                  )}
                </div>
                <div>
                  <span className="text-[10px] font-black uppercase tracking-wider text-[#8896A4] block">Issued On</span>
                  <span className="font-bold text-[#1A1F36]">
                    {data.activePrescription.issued_at ? new Date(data.activePrescription.issued_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '-'}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] font-black uppercase tracking-wider text-[#8896A4] block">Pharmacy</span>
                  <span className="font-black text-[#0D9488]">Use any licensed pharmacy</span>
                </div>
              </div>
            </div>
          )}

          {/* 2. Dietitian Spotlight */}
          {(filter === 'all' || filter === 'dietitian') && data.activeNutritionPlan && (
            <div className="rounded-3xl border-2 border-teal-500/30 bg-gradient-to-br from-white to-teal-50/20 p-6 shadow-sm">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-teal-500/15 pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-teal-500/15 flex items-center justify-center text-[#0D9488]">
                    <Utensils className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-black uppercase tracking-wider text-[#0D9488]">
                        Active Nutrition Blueprint • Dietitian Supervised
                      </span>
                      <span className="flex h-2 w-2 relative">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-teal-400 opacity-75" />
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-teal-500" />
                      </span>
                    </div>
                    <h3 className="text-lg font-black text-[#1A1F36] mt-0.5">
                      {data.activeNutritionPlan.title} (v{data.activeNutritionPlan.version || 1})
                    </h3>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <Link
                    href="/patient/care-plan"
                    className="inline-flex items-center gap-2 rounded-xl bg-[#0D9488] hover:bg-[#0B7A6F] text-white px-5 py-2.5 text-xs font-black uppercase tracking-wider transition-all shadow-md"
                  >
                    View Meal Guide <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>

              {/* Macro breakdown pills */}
              <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3.5 rounded-2xl bg-white border border-teal-100 shadow-2xs">
                  <span className="text-[10px] font-bold uppercase text-slate-400 block">Daily Calorie Target</span>
                  <span className="text-lg font-black text-[#1A1F36] font-sora mt-0.5 block">
                    {data.activeNutritionPlan.target_calories || 1650} <span className="text-xs font-normal text-slate-500">kcal</span>
                  </span>
                </div>
                <div className="p-3.5 rounded-2xl bg-white border border-emerald-100 shadow-2xs">
                  <span className="text-[10px] font-bold uppercase text-slate-400 block">Target Protein</span>
                  <span className="text-lg font-black text-emerald-700 font-sora mt-0.5 block">
                    {data.activeNutritionPlan.target_protein_g || 90}g <span className="text-xs font-normal text-slate-500">(Lean Preservation)</span>
                  </span>
                </div>
                <div className="p-3.5 rounded-2xl bg-white border border-amber-100 shadow-2xs">
                  <span className="text-[10px] font-bold uppercase text-slate-400 block">Target Carbs</span>
                  <span className="text-lg font-black text-amber-700 font-sora mt-0.5 block">
                    {data.activeNutritionPlan.target_carbs_g || 140}g <span className="text-xs font-normal text-slate-500">(Complex Fiber)</span>
                  </span>
                </div>
                <div className="p-3.5 rounded-2xl bg-white border border-teal-100 shadow-2xs">
                  <span className="text-[10px] font-bold uppercase text-slate-400 block">Hydration Goal</span>
                  <span className="text-lg font-black text-teal-700 font-sora mt-0.5 block flex items-center gap-1">
                    <Droplets className="w-4 h-4 text-teal-500" />
                    {data.activeNutritionPlan.hydration_liters || 3.0} <span className="text-xs font-normal text-slate-500">Liters / day</span>
                  </span>
                </div>
              </div>

              {/* Clinical Guidelines preview */}
              {data.activeNutritionPlan.guidelines && data.activeNutritionPlan.guidelines.length > 0 && (
                <div className="mt-4 p-3.5 rounded-2xl bg-white border border-teal-100 text-xs text-slate-700 space-y-1.5">
                  <span className="text-[10px] font-black uppercase tracking-wider text-[#0D9488] block">
                    Key Dietary Instructions from Dietitian Session
                  </span>
                  <ul className="space-y-1 text-slate-600">
                    {data.activeNutritionPlan.guidelines.slice(0, 3).map((g: string, i: number) => (
                      <li key={i} className="flex items-start gap-2">
                        <span className="text-[#0D9488] font-bold">•</span>
                        <span>{g}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="mt-4 grid gap-3 border-t border-teal-500/15 pt-4 text-xs sm:grid-cols-3 text-[#40516A]">
                <div>
                  <span className="text-[10px] font-black uppercase tracking-wider text-[#8896A4] block">Attending Dietitian</span>
                  <span className="font-bold text-[#1A1F36]">{data.activeNutritionPlan.dietitian_name || 'Clinical Dietitian (RD)'}</span>
                </div>
                <div>
                  <span className="text-[10px] font-black uppercase tracking-wider text-[#8896A4] block">Issued On</span>
                  <span className="font-bold text-[#1A1F36]">
                    {data.activeNutritionPlan.created_at ? new Date(data.activeNutritionPlan.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '-'}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] font-black uppercase tracking-wider text-[#8896A4] block">Plan Status</span>
                  <span className="font-black text-[#0D9488]">Active &amp; Calibrated</span>
                </div>
              </div>
            </div>
          )}

          {/* 3. Gym Trainer Spotlight */}
          {(filter === 'all' || filter === 'trainer') && data.activeFitnessPlan && (
            <div className="rounded-3xl border-2 border-amber-500/30 bg-gradient-to-br from-white to-amber-50/20 p-6 shadow-sm">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-amber-500/15 pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-amber-500/15 flex items-center justify-center text-amber-700">
                    <Dumbbell className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-black uppercase tracking-wider text-amber-700">
                        Active Fitness Protocol • Coach Supervised
                      </span>
                      <span className="flex h-2 w-2 relative">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500" />
                      </span>
                    </div>
                    <h3 className="text-lg font-black text-[#1A1F36] mt-0.5">
                      {data.activeFitnessPlan.title}
                    </h3>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <Link
                    href="/patient/care-plan"
                    className="inline-flex items-center gap-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white px-5 py-2.5 text-xs font-black uppercase tracking-wider transition-all shadow-md"
                  >
                    View Workout Details <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>

              {/* Movement metrics */}
              <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-3.5 rounded-2xl bg-white border border-amber-100 shadow-2xs">
                  <span className="text-[10px] font-bold uppercase text-slate-400 block">Weekly Split Frequency</span>
                  <span className="text-lg font-black text-[#1A1F36] font-sora mt-0.5 block">
                    {data.activeFitnessPlan.weekly_frequency} <span className="text-xs font-normal text-slate-500">sessions / week</span>
                  </span>
                </div>
                <div className="p-3.5 rounded-2xl bg-white border border-amber-100 shadow-2xs">
                  <span className="text-[10px] font-bold uppercase text-slate-400 block">Daily Step Goal</span>
                  <span className="text-lg font-black text-amber-800 font-sora mt-0.5 block">
                    {(data.activeFitnessPlan.daily_step_goal || 8000).toLocaleString()} <span className="text-xs font-normal text-slate-500">steps</span>
                  </span>
                </div>
                <div className="p-3.5 rounded-2xl bg-white border border-amber-100 shadow-2xs">
                  <span className="text-[10px] font-bold uppercase text-slate-400 block">Focus Type</span>
                  <span className="text-sm font-bold text-[#1A1F36] mt-0.5 block truncate">
                    {data.activeFitnessPlan.workout_type}
                  </span>
                </div>
              </div>

              {data.activeFitnessPlan.notes && (
                <div className="mt-4 p-3.5 rounded-2xl bg-white border border-amber-100 text-xs text-slate-700">
                  <span className="text-[10px] font-black uppercase tracking-wider text-amber-700 block">
                    Coach Session Instructions
                  </span>
                  <p className="mt-1 text-slate-600 leading-relaxed italic">
                    "{data.activeFitnessPlan.notes}"
                  </p>
                </div>
              )}

              <div className="mt-4 grid gap-3 border-t border-amber-500/15 pt-4 text-xs sm:grid-cols-3 text-[#40516A]">
                <div>
                  <span className="text-[10px] font-black uppercase tracking-wider text-[#8896A4] block">Certified Coach</span>
                  <span className="font-bold text-[#1A1F36]">{data.activeFitnessPlan.coach_name || 'Fitness Coach'}</span>
                </div>
                <div>
                  <span className="text-[10px] font-black uppercase tracking-wider text-[#8896A4] block">Assigned Date</span>
                  <span className="font-bold text-[#1A1F36]">
                    {data.activeFitnessPlan.created_at ? new Date(data.activeFitnessPlan.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '-'}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] font-black uppercase tracking-wider text-[#8896A4] block">Exercise Restrictions</span>
                  <span className="font-semibold text-slate-700">{data.activeFitnessPlan.exercise_restrictions || 'None'}</span>
                </div>
              </div>
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════════
              ALL PROTOCOLS & PRESCRIPTIONS HISTORY STREAM
              ══════════════════════════════════════════════════════════════ */}
          <div className="space-y-4 pt-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-black uppercase tracking-widest text-[#8896A4]">
                Care Protocols &amp; History ({unifiedHistory.length})
              </h3>
              <span className="text-[11px] text-slate-400 font-medium">
                Chronological care records
              </span>
            </div>

            {unifiedHistory.length === 0 ? (
              <Empty filter={filter} />
            ) : (
              <div className="grid gap-4">
                {unifiedHistory.map((item) => {
                  const SpecialistIcon = item.specialist === 'doctor' ? Pill : item.specialist === 'dietitian' ? Utensils : Dumbbell
                  return (
                    <div
                      key={`${item.specialist}-${item.id}`}
                      className="dash-card block p-5 hover:border-[#0D9488]/40 transition-all group bg-white rounded-2xl border border-slate-200"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div className="flex items-center gap-2.5">
                          <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                            item.specialist === 'doctor'
                              ? 'bg-emerald-50 text-emerald-600'
                              : item.specialist === 'dietitian'
                              ? 'bg-teal-50 text-[#0D9488]'
                              : 'bg-amber-50 text-amber-600'
                          }`}>
                            <SpecialistIcon className="w-4 h-4" />
                          </div>
                          <div>
                            <p className="text-xs font-black uppercase tracking-wider text-slate-800">
                              {item.title}
                            </p>
                            <p className="text-[11px] text-slate-500 font-medium">
                              {item.subtitle}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <span className={`text-[10px] font-bold px-3 py-1 rounded-full border ${item.statusColor}`}>
                            {item.status}
                          </span>
                          {item.link && (
                            <Link
                              href={item.link}
                              className="text-xs font-bold text-[#0D9488] hover:text-[#0B7A6F] flex items-center gap-1 group-hover:translate-x-0.5 transition-all"
                            >
                              <span>View</span>
                              <ArrowRight className="w-3.5 h-3.5" />
                            </Link>
                          )}
                        </div>
                      </div>

                      {item.itemsSummary && (
                        <p className="mt-3 text-xs text-slate-600 leading-relaxed font-sans">
                          {item.itemsSummary}
                        </p>
                      )}

                      <div className="mt-4 grid gap-3 border-t border-slate-100 pt-3 text-xs sm:grid-cols-3">
                        <Meta label={item.meta1Label} value={item.meta1Value} />
                        <Meta label={item.meta2Label} value={item.meta2Value} />
                        <Meta label={item.meta3Label} value={item.meta3Value} />
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function Empty({ filter }: { filter: SpecialistFilter }) {
  const label =
    filter === 'doctor'
      ? 'No doctor prescriptions issued yet'
      : filter === 'dietitian'
      ? 'No dietitian meal blueprints issued yet'
      : filter === 'trainer'
      ? 'No fitness coach workout plans assigned yet'
      : 'No care protocols recorded yet'

  const sub =
    filter === 'doctor'
      ? 'Official e-prescriptions authored by your physician will appear here.'
      : filter === 'dietitian'
      ? 'Custom meal plans and dietary targets authored by your clinical dietitian will appear here.'
      : filter === 'trainer'
      ? 'Personalized exercise schedules and movement guidelines will appear here.'
      : 'Your care team instructions will be visible here once your consultations begin.'

  return (
    <div className="dash-card p-10 text-center bg-white rounded-2xl border border-dashed border-slate-200">
      <FileText className="mx-auto mb-3 h-10 w-10 text-[#8896A4]" />
      <h3 className="font-black text-lg text-slate-800">{label}</h3>
      <p className="mt-2 text-sm font-semibold text-[#8896A4] max-w-sm mx-auto">
        {sub}
      </p>
    </div>
  )
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[10px] font-black uppercase tracking-wider text-[#8896A4]">{label}</p>
      <p className="mt-0.5 font-bold text-[#1A1F36]">{value}</p>
    </div>
  )
}
