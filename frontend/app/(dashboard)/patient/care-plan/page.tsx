'use client'

import React, { useState, useEffect } from 'react'
import {
  CheckCircle2,
  Apple,
  Dumbbell,
  FileText,
  Calendar,
  Flame,
  Footprints,
  ShieldCheck,
  ChevronRight,
  Printer,
  Sparkles,
} from 'lucide-react'
import PatientNutritionWidget from '@/components/patient/PatientNutritionWidget'
import OfficialProtocolModal from '@/components/protocol/OfficialProtocolModal'
import { supabase } from '@/lib/supabaseClient'

export default function CarePlanPage() {
  const [activeTab, setActiveTab] = useState<'nutrition' | 'fitness'>('nutrition')
  const [fitnessPlans, setFitnessPlans] = useState<any[]>([])
  const [activeFitnessPlan, setActiveFitnessPlan] = useState<any>(null)
  const [loadingFitness, setLoadingFitness] = useState(true)
  const [viewingOfficialFitnessModal, setViewingOfficialFitnessModal] = useState<any>(null)

  useEffect(() => {
    async function loadProtocols() {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (!session) return

        const res = await fetch('/api/patient/care-protocols', {
          headers: { Authorization: `Bearer ${session.access_token}` },
        })
        const json = await res.json()
        if (json.success) {
          setFitnessPlans(json.fitnessPlans || [])
          setActiveFitnessPlan(json.activeFitnessPlan || null)
        }
      } catch (err) {
        console.warn('Failed to load care protocols:', err)
      } finally {
        setLoadingFitness(false)
      }
    }
    loadProtocols()
  }, [])

  return (
    <div className="p-6 md:p-8 max-w-5xl mx-auto w-full animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header section */}
      <div className="mb-8">
        <h1 className="text-3xl font-sora font-bold text-slate-900 tracking-tight">Your Care Plan</h1>
        <p className="text-slate-500 mt-2 text-sm leading-relaxed max-w-2xl">
          Follow your personalized diet and fitness guidelines to maximize the results of your treatment.
          These plans are designed specifically for your body metrics and medical history.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-4 mb-8 border-b border-slate-200">
        <button
          onClick={() => setActiveTab('nutrition')}
          className={`pb-4 px-2 font-bold text-sm transition-colors border-b-2 cursor-pointer ${
            activeTab === 'nutrition'
              ? 'border-[#00A884] text-[#00A884]'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <div className="flex items-center gap-2">
            <Apple className="w-4 h-4" /> Nutritionist Diet Plan
          </div>
        </button>
        <button
          onClick={() => setActiveTab('fitness')}
          className={`pb-4 px-2 font-bold text-sm transition-colors border-b-2 cursor-pointer ${
            activeTab === 'fitness'
              ? 'border-[#00A884] text-[#00A884]'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <div className="flex items-center gap-2">
            <Dumbbell className="w-4 h-4" /> Fitness Coach Plan
            {fitnessPlans.length > 0 && (
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
            )}
          </div>
        </button>
      </div>

      {/* Content */}
      <div className="mt-4">
        {activeTab === 'nutrition' && (
          <div className="animate-in fade-in duration-300">
            <PatientNutritionWidget />
          </div>
        )}

        {activeTab === 'fitness' && (
          <div className="animate-in fade-in duration-300 space-y-6">
            {loadingFitness ? (
              <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center">
                <div className="w-10 h-10 border-4 border-[#00A884] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                <p className="text-sm font-bold text-slate-700">Loading fitness protocols...</p>
              </div>
            ) : activeFitnessPlan ? (
              <div className="space-y-6">
                {/* Active Fitness Card */}
                <div className="bg-white rounded-3xl border border-slate-200 p-6 md:p-8 shadow-xs space-y-6">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-100">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-50 text-emerald-800 border border-emerald-200">
                          {activeFitnessPlan.status || 'ACTIVE'}
                        </span>
                        <span className="text-xs text-slate-400 font-semibold">
                          Assigned on {activeFitnessPlan.created_at ? new Date(activeFitnessPlan.created_at).toLocaleDateString() : 'Recently'}
                        </span>
                      </div>
                      <h2 className="text-2xl font-black text-slate-900 mt-2">
                        {activeFitnessPlan.title || 'Personalized Movement & Strength Protocol'}
                      </h2>
                      <p className="text-xs font-semibold text-slate-500 mt-1 flex items-center gap-1.5">
                        <ShieldCheck className="w-4 h-4 text-[#00A884]" />
                        <span>Prescribed by {activeFitnessPlan.coach_name || 'Certified Fitness Coach'}</span>
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => setViewingOfficialFitnessModal(activeFitnessPlan)}
                      className="px-5 py-2.5 rounded-2xl bg-gradient-to-r from-[#1A1F36] to-slate-800 hover:from-slate-800 hover:to-slate-900 text-white text-xs font-bold flex items-center gap-2 shadow-sm self-start cursor-pointer transition-all hover:scale-[1.02]"
                    >
                      <Sparkles className="w-4 h-4 text-amber-300" />
                      <span>View Official Letterhead</span>
                    </button>
                  </div>

                  {/* Primary Targets Strip */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="p-4 rounded-2xl bg-teal-50/70 border border-teal-100">
                      <p className="text-[11px] font-black uppercase tracking-wider text-[#0D9488]">Workout Focus</p>
                      <p className="text-base font-black text-slate-900 mt-1">{activeFitnessPlan.workout_type || 'Strength & Conditioning'}</p>
                    </div>
                    <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-100">
                      <p className="text-[11px] font-black uppercase tracking-wider text-amber-700">Weekly Target</p>
                      <p className="text-base font-black text-slate-900 mt-1">{activeFitnessPlan.weekly_frequency || 3} sessions / week</p>
                    </div>
                    <div className="p-4 rounded-2xl bg-sky-50/70 border border-sky-100">
                      <p className="text-[11px] font-black uppercase tracking-wider text-sky-700">Daily Step Goal</p>
                      <p className="text-base font-black text-slate-900 mt-1">{(activeFitnessPlan.daily_step_goal || 8000).toLocaleString()} steps / day</p>
                    </div>
                  </div>

                  {/* Protocol Body / Instructions */}
                  {activeFitnessPlan.notes && (
                    <div className="space-y-2">
                      <h3 className="text-xs font-black uppercase tracking-wider text-slate-500">Coach Directives & Routine</h3>
                      <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 text-slate-800 text-sm whitespace-pre-wrap leading-relaxed font-mono">
                        {activeFitnessPlan.notes}
                      </div>
                    </div>
                  )}

                  {/* Restrictions if any */}
                  {activeFitnessPlan.exercise_restrictions && activeFitnessPlan.exercise_restrictions !== 'None reported' && (
                    <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-xs text-rose-900 font-semibold">
                      <p className="font-black text-rose-700 uppercase tracking-wider text-[10px]">Medical Restrictions / Avoid</p>
                      <p className="mt-1">{activeFitnessPlan.exercise_restrictions}</p>
                    </div>
                  )}

                  <div className="pt-2 flex items-center justify-between border-t border-slate-100 text-xs">
                    <span className="text-slate-400 font-medium">8Liv Concierge Care Network · Official Telehealth Protocol</span>
                    <button
                      type="button"
                      onClick={() => setViewingOfficialFitnessModal(activeFitnessPlan)}
                      className="text-[#00A884] font-bold hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <Printer className="w-3.5 h-3.5" />
                      <span>Print Official Document</span>
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-3xl border border-slate-200 p-8 text-center shadow-sm">
                <div className="w-16 h-16 bg-[#00A884]/10 text-[#00A884] rounded-full flex items-center justify-center mx-auto mb-4">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
                <h2 className="text-xl font-bold text-slate-900 mb-2">Fitness Plan Generation in Progress</h2>
                <p className="text-slate-500 max-w-md mx-auto text-sm leading-relaxed">
                  Your assigned fitness coach is currently reviewing your medical profile and will deliver your personalized workout protocol shortly. You will receive an instant notification once it is signed.
                </p>
              </div>
            )}

            {/* Official Protocol Letterhead Modal */}
            <OfficialProtocolModal
              isOpen={Boolean(viewingOfficialFitnessModal)}
              onClose={() => setViewingOfficialFitnessModal(null)}
              protocol={viewingOfficialFitnessModal}
              role="fitness_coach"
            />
          </div>
        )}
      </div>
    </div>
  )
}

