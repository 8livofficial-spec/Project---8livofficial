'use client'

import React, { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import {
  Check, Zap, Star, ShieldCheck, ArrowRight,
  Dumbbell, Clock, Sparkles
} from 'lucide-react'
import { supabase } from '@/lib/supabaseClient'
import { authedFetch } from '@/lib/apiClient'
import { motion } from 'framer-motion'

const ICONS = [Zap, Clock, Dumbbell, Star, Sparkles]
const COLORS = ['#0D9488', '#3B82F6', '#6366F1', '#C4622D', '#8B5CF6']

export default function PlanSelectionPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const durationParam = searchParams.get('duration')
  const [plans, setPlans] = useState<any[]>([])
  const [selectedPlanId, setSelectedPlanId] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetch('/api/subscriptions/pricing')
      .then(res => res.json())
      .then(data => {
        const fetched = data.plans || data.tiers || []
        setPlans(fetched)
        if (fetched.length > 0) {
          // If duration query param passed, match it; else pick first or last
          if (durationParam) {
            const matched = fetched.find((p: any) => String(p.durationMonths) === durationParam)
            if (matched) {
              setSelectedPlanId(matched.id)
              setLoading(false)
              return
            }
          }
          // Default to first active plan
          setSelectedPlanId(fetched[0].id)
        }
        setLoading(false)
      })
      .catch(err => {
        console.warn('Error fetching plans:', err)
        setLoading(false)
      })
  }, [durationParam])

  const selectedPlan = plans.find(p => p.id === selectedPlanId) || plans[0]

  const handleContinue = async () => {
    if (!selectedPlan) return
    setSaving(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.push('/login'); return }

      const response = await authedFetch('/api/plan', {
        method: 'POST',
        body: JSON.stringify({
          membershipTier: selectedPlan.name,
          planId: selectedPlan.id,
          durationMonths: selectedPlan.durationMonths,
        })
      })

      const resData = await response.json()
      if (!response.ok) {
        throw new Error(resData.error || 'Failed to save treatment program selection.')
      }

      router.push('/patient/onboarding/payment')
    } catch (err: any) {
      alert("Error saving program: " + err.message)
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-[#0D9488] border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 py-12 px-4 sm:px-6 lg:px-8 font-sans">
      <div className="max-w-5xl mx-auto space-y-8">
        {/* Header */}
        <div className="text-center space-y-3">
          <span className="text-[#0D9488] text-xs font-black uppercase tracking-[0.2em] font-sora">
            Step 1 of 2 — Select Treatment Program
          </span>
          <h1 className="text-3xl sm:text-4xl font-extrabold font-sora text-[#0F172A]">
            Choose your care program duration
          </h1>
          <p className="text-sm text-[#475569] max-w-xl mx-auto leading-relaxed">
            All doctor-led programs include your multi-disciplinary care team (doctor, dietitian, fitness coach), monthly clinical treatment cycles, and included follow-up consultations.
          </p>
        </div>

        {/* Dynamic Duration Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {plans.map((prog, idx) => {
            const isSelected = selectedPlanId === prog.id
            const Icon = ICONS[idx % ICONS.length]
            const color = COLORS[idx % COLORS.length]
            const discountPct = Number(prog.discountPercentage || 0)
            const discountAmt = Number(prog.discountAmount || 0)

            return (
              <motion.div
                key={prog.id}
                whileHover={{ y: -3 }}
                onClick={() => setSelectedPlanId(prog.id)}
                className={`relative rounded-3xl p-6 cursor-pointer transition-all border flex flex-col justify-between ${
                  isSelected
                    ? 'bg-white border-2 shadow-xl ring-2'
                    : 'bg-white/80 border-slate-200 hover:border-slate-300 shadow-sm'
                }`}
                style={{
                  borderColor: isSelected ? color : undefined,
                  boxShadow: isSelected ? `0 12px 30px ${color}15` : undefined,
                }}
              >
                {discountPct > 0 && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-[#C4622D] px-3 py-0.5 text-[10px] font-black uppercase tracking-wider text-white shadow-sm whitespace-nowrap">
                    {discountPct}% OFF (Save ₹{discountAmt.toLocaleString('en-IN')})
                  </div>
                )}

                <div>
                  <div className="flex justify-between items-start mb-4">
                    <div
                      className="w-10 h-10 rounded-2xl flex items-center justify-center"
                      style={{ backgroundColor: `${color}15`, color }}
                    >
                      <Icon size={20} />
                    </div>
                    <div
                      className={`w-5 h-5 rounded-full border flex items-center justify-center ${
                        isSelected ? 'border-transparent' : 'border-slate-300'
                      }`}
                      style={{ backgroundColor: isSelected ? color : 'transparent' }}
                    >
                      {isSelected && <Check size={12} className="text-white stroke-[3]" />}
                    </div>
                  </div>

                  <p className="text-xs font-black uppercase tracking-wider text-[#64748B]">
                    {prog.durationMonths} {prog.durationMonths === 1 ? 'Month Program' : 'Months Program'}
                  </p>
                  <h3 className="text-xl font-bold font-sora text-[#0F172A] mt-1">{prog.name}</h3>
                  <p className="text-xs font-bold text-[#0D9488] mt-0.5">
                    {prog.durationMonths} {prog.durationMonths === 1 ? 'Treatment Cycle' : 'Treatment Cycles'}
                  </p>

                  <div className="mt-4 border-t border-slate-100 pt-3">
                    <p className="text-2xl font-black font-sora text-[#0F172A]">
                      ₹{Number(prog.finalPrice).toLocaleString('en-IN')}
                    </p>
                    {discountPct > 0 ? (
                      <p className="text-[11px] font-semibold text-emerald-600 mt-0.5 line-through text-slate-400">
                        ₹{Number(prog.basePrice).toLocaleString('en-IN')}
                      </p>
                    ) : (
                      <p className="text-[11px] font-semibold text-[#8896A4] mt-0.5">Program fee</p>
                    )}
                  </div>

                  {prog.description && (
                    <p className="mt-3 text-xs leading-relaxed text-[#475569]">{prog.description}</p>
                  )}
                </div>

                <div className="mt-6 pt-3 border-t border-slate-100">
                  <div
                    className={`w-full py-2.5 rounded-xl text-center text-xs font-bold transition ${
                      isSelected ? 'text-white' : 'bg-slate-100 text-[#0F172A]'
                    }`}
                    style={{ backgroundColor: isSelected ? color : undefined }}
                  >
                    {isSelected ? 'Selected' : 'Choose'}
                  </div>
                </div>
              </motion.div>
            )
          })}
        </div>

        {/* Inclusions summary banner */}
        <div className="rounded-3xl bg-white p-6 border border-slate-200 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-[#0D9488]" />
              <h4 className="font-bold font-sora text-sm text-[#0F172A]">All programs include clinical care standard:</h4>
            </div>
            <p className="text-xs text-[#64748B]">
              Initial ₹499 doctor review • Free included cycle follow-ups • Partner pharmacy tracking • Full multi-disciplinary care team
            </p>
          </div>
          <button
            onClick={handleContinue}
            disabled={saving || !selectedPlan}
            className="w-full sm:w-auto bg-[#0D9488] hover:bg-[#097A70] text-white font-sora font-bold rounded-2xl py-3.5 px-8 text-sm flex items-center justify-center gap-2 transition shadow-lg shadow-[#0D9488]/20 cursor-pointer disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Continue to Program Activation'} <ArrowRight size={16} />
          </button>
        </div>
      </div>
    </div>
  )
}
