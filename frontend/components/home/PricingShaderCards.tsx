'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import {
  Sparkles,
  CheckCircle2,
  ShieldCheck,
  ArrowRight,
  Zap,
  Clock,
  Stethoscope,
  Package,
  CalendarCheck,
  Truck,
  HeartPulse
} from 'lucide-react'
import ShaderCard from '@/components/ui/shader-card'

interface TreatmentPlan {
  id: string
  name: string
  durationMonths: number
  basePrice: number
  discountPercentage: number
  discountAmount: number
  finalPrice: number
  monthlyEquivalent: number
  currency: string
  description?: string
  features?: string[]
  displayOrder?: number
}

const FALLBACK_PLANS: TreatmentPlan[] = [
  {
    id: '1m-starter',
    name: '1 Month Kickstart',
    durationMonths: 1,
    basePrice: 1999,
    discountPercentage: 5,
    discountAmount: 100,
    finalPrice: 1899,
    monthlyEquivalent: 1899,
    currency: 'INR',
    description: '1 monthly treatment cycle with comprehensive clinical review, personalized dietary protocol, and initial lifestyle onboarding.',
    features: [
      '1 Clinical Treatment Cycle provisioned',
      'Doctor evaluation & dosing protocol',
      'Follow-up consultation included (₹0)',
      'High-protein Indian meal blueprint',
      'Dedicated fitness coach movement roadmap',
      'Partner pharmacy delivery coordination',
    ],
    displayOrder: 1,
  },
  {
    id: '3m-metabolic',
    name: '3 Month Metabolic Reset',
    durationMonths: 3,
    basePrice: 5997,
    discountPercentage: 0,
    discountAmount: 0,
    finalPrice: 5997,
    monthlyEquivalent: 1999,
    currency: 'INR',
    description: '3 structured treatment cycles to build lasting metabolic habits with consistent doctor monitoring and follow-up reviews.',
    features: [
      '3 Clinical Treatment Cycles provisioned',
      'Monthly doctor follow-up consultations (₹0)',
      'Dedicated clinical dietitian coaching',
      'Continuous habit & weight progress tracking',
      'Care team messaging & pharmacy dispatch',
      'Biomarker tracking in 8LIV patient portal',
    ],
    displayOrder: 2,
  },
  {
    id: '6m-transformation',
    name: '6 Month Transformation',
    durationMonths: 6,
    basePrice: 11994,
    discountPercentage: 0,
    discountAmount: 0,
    finalPrice: 11994,
    monthlyEquivalent: 1999,
    currency: 'INR',
    description: '6 monthly treatment cycles for sustained weight reduction, clinical lab monitoring, and metabolic set-point lock-in.',
    features: [
      '6 Clinical Treatment Cycles provisioned',
      'Included monthly doctor review consultations (₹0)',
      'Advanced metabolic coaching & progress reviews',
      'Dedicated clinical dietitian & fitness coach',
      'Partner pharmacy priority dispatch',
      'Complete access to 8LIV care team portal',
    ],
    displayOrder: 3,
  },
  {
    id: '10m-complete',
    name: '10 Month Complete Reset',
    durationMonths: 10,
    basePrice: 19990,
    discountPercentage: 10,
    discountAmount: 1999,
    finalPrice: 17991,
    monthlyEquivalent: 1799,
    currency: 'INR',
    description: 'Full year metabolic reset with 10% instant bulk discount. 10 monthly treatment cycles and priority partner pharmacy fulfillment.',
    features: [
      '10 Clinical Treatment Cycles provisioned',
      '10% Instant Bulk Discount (Saves ₹1,999)',
      'Included doctor follow-up consultation each cycle (₹0)',
      'Full dedicated multi-disciplinary care team',
      'Priority partner pharmacy fulfillment',
      'Long-term milestone maintenance protocol',
    ],
    displayOrder: 4,
  },
]

export default function PricingShaderCards() {
  const [plans, setPlans] = useState<TreatmentPlan[]>(FALLBACK_PLANS)
  const [selectedDuration, setSelectedDuration] = useState<number | 'all'>('all')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    fetch('/api/subscriptions/pricing')
      .then((res) => res.json())
      .then((data) => {
        const fetched = data.plans || data.tiers || []
        if (Array.isArray(fetched) && fetched.length > 0) {
          setPlans(fetched)
        }
      })
      .catch((err) => {
        console.warn('Failed to fetch dynamic pricing, keeping cached plans:', err)
      })
  }, [])

  const filteredPlans = selectedDuration === 'all'
    ? plans
    : plans.filter((p) => p.durationMonths === selectedDuration)

  return (
    <section className="relative py-20 sm:py-28 bg-[#F9F6F0] text-[#0F172A] overflow-hidden border-t border-slate-200">
      {/* Ambient background glows */}
      <div className="absolute top-0 right-1/4 w-96 h-96 bg-[#00A884]/10 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute bottom-0 left-1/4 w-96 h-96 bg-[#D46E53]/10 rounded-full blur-[140px] pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-10 sm:mb-14">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white border border-[#00A884]/20 text-[#0F766E] text-xs font-semibold uppercase tracking-widest mb-4 shadow-xs">
            <Sparkles className="w-4 h-4 text-[#00A884]" />
            <span>Doctor-Led Care Programs</span>
          </div>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tight text-[#0F172A] font-sora">
            Select Your <span className="green-gradient-text">Care Protocol</span>
          </h2>
          <p className="mt-4 text-[#475569] text-base md:text-lg leading-relaxed font-light">
            Evidence-based medical weight management tailored to your biological profile. Every program provisions structured monthly treatment cycles with dedicated multi-disciplinary clinical care.
          </p>
        </div>

        {/* Step 1 Clarity Callout: ₹499 Initial Consultation */}
        <div className="max-w-3xl mx-auto mb-12 p-4 sm:p-5 rounded-2xl bg-white border border-[#00A884]/25 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3.5 text-left">
            <div className="w-11 h-11 rounded-xl bg-[#00A884]/10 border border-[#00A884]/20 flex items-center justify-center shrink-0 text-[#00A884]">
              <Stethoscope className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm font-bold text-[#0F172A] font-sora flex items-center gap-2">
                Step 1: ₹499 Doctor Clinical Evaluation
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-[#00A884]/15 text-[#0F766E]">
                  Required
                </span>
              </p>
              <p className="text-xs text-[#475569] mt-0.5">
                Every journey begins with an initial consultation with a licensed physician to confirm medical eligibility, review lab markers, and personalize your treatment duration.
              </p>
            </div>
          </div>
          <Link
            href="/assessment"
            className="shrink-0 inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#0F172A] hover:bg-[#1E293B] text-white text-xs font-bold font-sora transition shadow-sm hover:scale-[1.02]"
          >
            <span>Book Assessment</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {/* Duration Quick Filter Tabs */}
        <div className="flex items-center justify-center gap-2 mb-10 overflow-x-auto pb-2 scrollbar-none">
          <button
            type="button"
            onClick={() => setSelectedDuration('all')}
            className={`px-4 py-2 rounded-full text-xs font-bold font-sora transition-all cursor-pointer ${
              selectedDuration === 'all'
                ? 'bg-[#0F172A] text-white shadow-md'
                : 'bg-white text-[#475569] hover:bg-slate-100 border border-slate-200'
            }`}
          >
            All Protocols ({plans.length})
          </button>
          {plans.map((p) => {
            const isDiscounted = p.discountPercentage > 0
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => setSelectedDuration(p.durationMonths)}
                className={`px-4 py-2 rounded-full text-xs font-bold font-sora transition-all flex items-center gap-1.5 cursor-pointer ${
                  selectedDuration === p.durationMonths
                    ? 'bg-[#00A884] text-white shadow-md'
                    : 'bg-white text-[#475569] hover:bg-slate-100 border border-slate-200'
                }`}
              >
                <span>{p.durationMonths} {p.durationMonths === 1 ? 'Month' : 'Months'}</span>
                {isDiscounted && (
                  <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-black ${
                    selectedDuration === p.durationMonths
                      ? 'bg-white text-[#00A884]'
                      : 'bg-emerald-100 text-[#00A884]'
                  }`}>
                    {p.discountPercentage}% OFF
                  </span>
                )}
              </button>
            )
          })}
        </div>

        {/* Pricing Cards Grid */}
        <div className={`grid grid-cols-1 ${
          filteredPlans.length === 1
            ? 'max-w-md mx-auto'
            : filteredPlans.length === 2
            ? 'md:grid-cols-2 max-w-4xl mx-auto'
            : filteredPlans.length === 3
            ? 'md:grid-cols-2 lg:grid-cols-3 max-w-6xl mx-auto'
            : 'md:grid-cols-2 lg:grid-cols-4 max-w-7xl mx-auto'
        } gap-6`}>
          {filteredPlans.map((plan) => {
            const isDiscounted = plan.discountPercentage > 0
            const isBestValue = plan.durationMonths === 10 || plan.discountPercentage >= 10
            const monthlyPrice = plan.monthlyEquivalent || Math.round(plan.finalPrice / plan.durationMonths)

            return (
              <ShaderCard
                key={plan.id}
                colorTheme={isBestValue ? 'emerald' : 'slate'}
                className={`flex flex-col justify-between p-6 sm:p-7 bg-white rounded-3xl transition-all duration-300 ${
                  isBestValue
                    ? 'border-2 border-[#00A884] shadow-xl hover:shadow-2xl ring-2 ring-[#00A884]/20'
                    : 'border border-slate-200 shadow-lg hover:shadow-xl hover:border-slate-300'
                }`}
              >
                <div className="flex flex-col h-full justify-between">
                  <div>
                    {/* Top Tag & Badge */}
                    <div className="flex items-center justify-between gap-2 mb-4">
                      <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold font-sora ${
                        isBestValue
                          ? 'bg-[#00A884]/15 text-[#0F766E] border border-[#00A884]/30'
                          : 'bg-slate-100 text-[#334155] border border-slate-200'
                      }`}>
                        <Clock className="w-3.5 h-3.5 text-[#00A884]" />
                        <span>{plan.durationMonths} {plan.durationMonths === 1 ? 'Month Plan' : 'Months Plan'}</span>
                      </div>

                      {isBestValue && (
                        <div className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-gradient-to-r from-emerald-600 to-[#00A884] text-white text-[10px] font-black font-sora uppercase tracking-wider shadow-xs">
                          <Zap className="w-3 h-3 fill-white" />
                          <span>Best Value</span>
                        </div>
                      )}
                    </div>

                    {/* Plan Name & Description */}
                    <h3 className="text-xl sm:text-2xl font-extrabold text-[#0F172A] font-sora mb-2">
                      {plan.name}
                    </h3>
                    <p className="text-xs text-[#475569] font-light leading-relaxed mb-5 min-h-[36px]">
                      {plan.description || `${plan.durationMonths} structured treatment cycles with continuous doctor oversight, dietary guidance, and partner pharmacy fulfillment.`}
                    </p>

                    {/* Pricing Block */}
                    <div className="p-4 rounded-2xl bg-[#F9F6F0] border border-slate-200/80 mb-6">
                      <div className="flex items-baseline gap-2">
                        <span className="text-3xl sm:text-4xl font-black text-[#0F172A] font-sora">
                          ₹{plan.finalPrice.toLocaleString('en-IN')}
                        </span>
                        {isDiscounted && (
                          <span className="text-sm text-slate-400 line-through font-medium">
                            ₹{plan.basePrice.toLocaleString('en-IN')}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center justify-between gap-2 mt-2 pt-2 border-t border-slate-200/60">
                        <span className="text-xs text-[#475569] font-medium">
                          ₹{monthlyPrice.toLocaleString('en-IN')} / month
                        </span>
                        {isDiscounted && (
                          <span className="text-[11px] font-bold text-[#00A884] bg-[#00A884]/10 px-2 py-0.5 rounded-full">
                            Save ₹{plan.discountAmount.toLocaleString('en-IN')} ({plan.discountPercentage}% OFF)
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Treatment Cycle Highlight */}
                    <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-[#00A884]/10 border border-[#00A884]/20 text-[#0F766E] text-xs font-bold font-sora mb-5">
                      <Package className="w-4 h-4 text-[#00A884] shrink-0" />
                      <span>{plan.durationMonths} Monthly Treatment {plan.durationMonths === 1 ? 'Cycle' : 'Cycles'}</span>
                    </div>

                    {/* Feature List */}
                    <div className="space-y-2.5 mb-6">
                      {(plan.features && plan.features.length > 0 ? plan.features : [
                        `${plan.durationMonths} Treatment ${plan.durationMonths === 1 ? 'Cycle' : 'Cycles'} provisioned`,
                        'Doctor follow-up consultations included (₹0)',
                        'Dedicated clinical dietitian support',
                        'Personalized high-protein Indian meals',
                        'Prescription & pharmacy coordination',
                        '8LIV portal biomarker & weight tracker'
                      ]).map((feat, idx) => (
                        <div key={idx} className="flex items-start gap-2.5 text-xs text-[#0F172A]">
                          <CheckCircle2 className="w-3.5 h-3.5 text-[#00A884] shrink-0 mt-0.5" />
                          <span className="leading-snug">{feat}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* CTA Action Button */}
                  <Link
                    href={`/assessment?duration=${plan.durationMonths}`}
                    className={`w-full inline-flex items-center justify-center gap-2 py-3.5 px-4 rounded-xl font-sora font-bold text-xs transition-all hover:scale-[1.02] cursor-pointer mt-4 shadow-md ${
                      isBestValue
                        ? 'bg-[#00A884] hover:bg-[#0F766E] text-white shadow-[#00A884]/25'
                        : 'bg-[#0F172A] hover:bg-[#1E293B] text-white'
                    }`}
                  >
                    <span>Select {plan.durationMonths}M Protocol</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </ShaderCard>
            )
          })}
        </div>

        {/* Clinical Safety & Fulfillment Trust Bar */}
        <div className="mt-16 pt-10 border-t border-slate-200 grid grid-cols-1 md:grid-cols-3 gap-6 text-center md:text-left">
          <div className="flex items-center gap-3.5 justify-center md:justify-start">
            <div className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center shrink-0 text-[#00A884] shadow-xs">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-bold font-sora text-[#0F172A]">CDSCO & NMC Licensed Physicians</p>
              <p className="text-[11px] text-[#475569]">All prescriptions authored by certified doctors.</p>
            </div>
          </div>

          <div className="flex items-center gap-3.5 justify-center md:justify-start">
            <div className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center shrink-0 text-[#00A884] shadow-xs">
              <Truck className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-bold font-sora text-[#0F172A]">Partner Pharmacy Cold-Chain</p>
              <p className="text-[11px] text-[#475569]">Temperature-controlled doorstep dispatch.</p>
            </div>
          </div>

          <div className="flex items-center gap-3.5 justify-center md:justify-start">
            <div className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center shrink-0 text-[#00A884] shadow-xs">
              <CalendarCheck className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-bold font-sora text-[#0F172A]">Flexible Monthly Cycles</p>
              <p className="text-[11px] text-[#475569]">Clinical review before each medication renewal.</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
