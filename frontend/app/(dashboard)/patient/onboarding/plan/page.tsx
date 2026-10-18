'use client'

import React, { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import {
  Check, Zap, Star, ShieldCheck, ArrowRight,
  Dumbbell, Clock, Sparkles, CheckCircle2, HeartPulse, Stethoscope
} from 'lucide-react'
import { supabase } from '@/lib/supabaseClient'
import { authedFetch } from '@/lib/apiClient'
import { motion } from 'framer-motion'

const ICONS = [Zap, Clock, Dumbbell, Star, Sparkles]

const PLAN_ENRICHMENT: Record<number, {
  tagline: string
  badge?: string
  popular?: boolean
  bestFor: string
  features: string[]
}> = {
  1: {
    tagline: 'Kickstart & Initial Metabolic Baseline',
    badge: 'STARTER',
    bestFor: 'Evaluating your clinical response and establishing your personalized treatment protocol.',
    features: [
      '1 Full Treatment Cycle with doctor supervision',
      'Included doctor follow-up consultation (₹0)',
      'Customized dietary & metabolic nutrition roadmap',
      'Dedicated health coach direct chat access',
      'E-Prescription & licensed pharmacy coordination',
      'Weekly weight & biometric symptom tracking',
    ],
  },
  3: {
    tagline: 'Core Habit Reset & Visible Results',
    badge: 'MOST POPULAR',
    popular: true,
    bestFor: 'Achieving steady 5–10% weight loss and establishing consistent metabolic rhythm.',
    features: [
      '3 Structured Treatment Cycles provisioned',
      'Included physician follow-ups each cycle (₹0)',
      'Dedicated Dietitian + Fitness Coach support',
      'Personalized metabolic nutrition adjustments',
      'Priority pharmacy dispatch & refill management',
      'Continuous habit tracking & milestone check-ins',
    ],
  },
  6: {
    tagline: 'Deep Cellular Reversal & Fat Loss',
    badge: 'RECOMMENDED',
    popular: false,
    bestFor: 'Clinically proven HbA1c reversal, visceral fat reduction, and permanent lifestyle lock-in.',
    features: [
      '6 Progressive Treatment Cycles provisioned',
      'Included physician follow-ups each cycle (₹0)',
      'Comprehensive biomarker & lab progress monitoring',
      'Unlimited care team guidance (Doctor, Dietitian, Coach)',
      'Bi-weekly clinical dosage & dietary calibrations',
      'Long-term metabolic stabilization & maintenance',
    ],
  },
  10: {
    tagline: 'Complete Long-Term Health Reset',
    badge: 'BEST VALUE',
    popular: false,
    bestFor: 'Maximum health optimization, full care continuity, and highest bulk savings.',
    features: [
      '10 Comprehensive Treatment Cycles provisioned',
      'Included physician follow-ups each cycle (₹0)',
      'Full year multi-disciplinary care team continuity',
      'VIP physician access & expedited clinical reviews',
      'Advanced metabolic monitoring & quarterly checkups',
      'Maximum bulk cost savings with priority support',
    ],
  },
}

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
          if (durationParam) {
            const matched = fetched.find((p: any) => String(p.durationMonths) === durationParam)
            if (matched) {
              setSelectedPlanId(matched.id)
              setLoading(false)
              return
            }
          }
          // Default to 3-month if available, else first plan
          const defaultPlan = fetched.find((p: any) => p.durationMonths === 3) || fetched[0]
          setSelectedPlanId(defaultPlan.id)
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
        <div className="w-10 h-10 border-4 border-[#00A884] border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] py-12 px-4 sm:px-6 lg:px-8 font-sans">
      <div className="max-w-6xl mx-auto space-y-10">
        {/* Header */}
        <div className="text-center space-y-3 max-w-2xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-[#00A884] text-xs font-bold uppercase tracking-wider">
            <HeartPulse className="w-3.5 h-3.5" /> Step 1 of 2 — Select Treatment Program
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold font-sora text-[#0F172A] tracking-tight">
            Choose your care program duration
          </h1>
          <p className="text-sm sm:text-base text-slate-600 leading-relaxed">
            All programs are doctor-prescribed and include your dedicated care team (Physician, Clinical Dietitian, Fitness Coach) with included consultations and priority pharmacy dispatch.
          </p>
        </div>

        {/* Dynamic Duration Cards Grid */}
        <div className={`grid gap-6 ${
          plans.length === 1 ? 'grid-cols-1 max-w-md mx-auto' :
          plans.length === 2 ? 'grid-cols-1 md:grid-cols-2 max-w-3xl mx-auto' :
          plans.length === 3 ? 'grid-cols-1 md:grid-cols-3 max-w-5xl mx-auto' :
          'grid-cols-1 md:grid-cols-2 lg:grid-cols-4 max-w-7xl mx-auto'
        }`}>
          {plans.map((prog, idx) => {
            const isSelected = selectedPlanId === prog.id
            const Icon = ICONS[idx % ICONS.length]
            const duration = Number(prog.durationMonths) || 1
            const enrichment = PLAN_ENRICHMENT[duration] || {
              tagline: `${duration} Month Clinical Care`,
              bestFor: 'Targeted metabolic wellness and guided medical weight care.',
              features: prog.features || [
                `${duration} Treatment Cycle(s) with doctor supervision`,
                'Included doctor follow-ups (₹0)',
                'Dedicated dietitian & health coach support',
                'Personalized dietary & lifestyle protocol',
              ],
            }

            const discountPct = Number(prog.discountPercentage || 0)
            const discountAmt = Number(prog.discountAmount || 0)
            const monthlyRate = Math.round(Number(prog.finalPrice) / duration)

            return (
              <motion.div
                key={prog.id}
                whileHover={{ y: -4 }}
                transition={{ duration: 0.2 }}
                onClick={() => setSelectedPlanId(prog.id)}
                className={`relative rounded-3xl p-6 cursor-pointer transition-all border flex flex-col justify-between ${
                  isSelected
                    ? 'bg-white border-2 border-[#00A884] shadow-xl shadow-[#00A884]/10 ring-2 ring-[#00A884]/20'
                    : 'bg-white/90 border-slate-200/90 hover:border-slate-300 hover:shadow-md'
                }`}
              >
                {/* Discount pill at top if applicable */}
                {discountPct > 0 && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-[#00A884] px-3 py-0.5 text-[10px] font-black uppercase tracking-wider text-white shadow-sm whitespace-nowrap">
                    {discountPct}% OFF (Save ₹{discountAmt.toLocaleString('en-IN')})
                  </div>
                )}

                <div>
                  {/* Top Header */}
                  <div className="flex justify-between items-start mb-4 pt-1">
                    <div className={`w-11 h-11 rounded-2xl flex items-center justify-center transition-colors ${
                      isSelected ? 'bg-emerald-50 text-[#00A884]' : 'bg-slate-100 text-slate-700'
                    }`}>
                      <Icon size={22} />
                    </div>
                    <div className={`w-6 h-6 rounded-full border flex items-center justify-center transition-all ${
                      isSelected ? 'border-[#00A884] bg-[#00A884]' : 'border-slate-300 bg-white'
                    }`}>
                      {isSelected && <Check size={14} className="text-white stroke-[3]" />}
                    </div>
                  </div>

                  <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    {duration} {duration === 1 ? 'Month Program' : 'Months Program'}
                  </p>
                  <h3 className="text-xl font-bold font-sora text-slate-900 mt-1">{prog.name}</h3>
                  <p className="text-xs font-medium text-[#00A884] mt-0.5">
                    {enrichment.tagline}
                  </p>

                  {/* Pricing Block */}
                  <div className="mt-4 p-3.5 bg-slate-50 rounded-2xl border border-slate-100">
                    <div className="flex items-baseline gap-1">
                      <span className="text-2xl font-black font-sora text-slate-900">
                        ₹{monthlyRate.toLocaleString('en-IN')}
                      </span>
                      <span className="text-xs font-semibold text-slate-500">/ month</span>
                    </div>

                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs font-bold text-slate-700">
                        ₹{Number(prog.finalPrice).toLocaleString('en-IN')} total
                      </span>
                      {discountPct > 0 && (
                        <span className="text-[11px] font-semibold text-slate-400 line-through">
                          ₹{Number(prog.basePrice).toLocaleString('en-IN')}
                        </span>
                      )}
                      {discountAmt > 0 && (
                        <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100/70 px-1.5 py-0.2 rounded">
                          Save ₹{discountAmt.toLocaleString('en-IN')}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Best For Section */}
                  <div className="mt-3.5 text-xs text-slate-600 bg-emerald-50/40 p-2.5 rounded-xl border border-emerald-100/50">
                    <span className="font-bold text-slate-900">Best for: </span>
                    <span>{enrichment.bestFor}</span>
                  </div>

                  {/* What's Included */}
                  <div className="mt-4 space-y-2 pt-3 border-t border-slate-100">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">What&apos;s Included:</p>
                    <ul className="space-y-2">
                      {enrichment.features.map((feat) => (
                        <li key={feat} className="flex items-start gap-2 text-xs text-slate-700 leading-snug">
                          <CheckCircle2 size={13} className="text-[#00A884] shrink-0 mt-0.5" />
                          <span>{feat}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                {/* Choose / Selected Button */}
                <div className="mt-6 pt-4 border-t border-slate-100">
                  <button
                    type="button"
                    className={`w-full py-3 rounded-xl text-center text-xs font-bold uppercase tracking-wider transition-all shadow-sm ${
                      isSelected
                        ? 'bg-[#00A884] text-white hover:bg-[#008f70]'
                        : 'bg-slate-100 hover:bg-slate-200 text-slate-800'
                    }`}
                  >
                    {isSelected ? '✓ Selected Program' : 'Choose This Program'}
                  </button>
                </div>
              </motion.div>
            )
          })}
        </div>

        {/* Inclusions summary banner */}
        <div className="rounded-3xl bg-white p-6 sm:p-7 border border-slate-200 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-5">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-[#00A884]" />
              <h4 className="font-bold font-sora text-sm text-slate-900">Clinical Excellence Standard on All Plans</h4>
            </div>
            <p className="text-xs text-slate-500 leading-relaxed max-w-2xl">
              Doctor-led clinical care • Free included follow-up consultations each cycle • Licensed partner pharmacy dispatch • Dedicated dietitian &amp; fitness coach support.
            </p>
          </div>
          <button
            onClick={handleContinue}
            disabled={saving || !selectedPlan}
            className="w-full sm:w-auto bg-[#00A884] hover:bg-[#008f70] text-white font-sora font-bold rounded-2xl py-3.5 px-8 text-sm flex items-center justify-center gap-2 transition shadow-lg shadow-[#00A884]/20 cursor-pointer disabled:opacity-50 shrink-0"
          >
            {saving ? 'Saving...' : 'Continue to Program Activation'} <ArrowRight size={16} />
          </button>
        </div>
      </div>
    </div>
  )
}
