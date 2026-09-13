'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import {
  Sparkles,
  CheckCircle2,
  ShieldCheck,
  ArrowRight,
  Stethoscope,
  Truck,
  HeartPulse,
  CalendarCheck,
} from 'lucide-react'

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
    name: '1 Month Starter Plan',
    durationMonths: 1,
    basePrice: 1999,
    discountPercentage: 5,
    discountAmount: 100,
    finalPrice: 1899,
    monthlyEquivalent: 1899,
    currency: 'INR',
    description:
      'Initial clinical evaluation, personalized Indian dietary protocol, and doctor-guided onboarding.',
    features: [
      '1-on-1 Video Consultation with Licensed Doctor',
      'Follow-up review consultation included (₹0)',
      'High-protein Indian meal blueprint tailored to your family',
      'Dedicated fitness coach movement roadmap',
      'Doorstep prescription delivery via partner pharmacy',
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
    description:
      'Our most popular program. 3 structured months to build lasting metabolic habits with consistent doctor monitoring.',
    features: [
      'Monthly doctor follow-up consultations included (₹0)',
      'Continuous clinical dietitian guidance & chat',
      'Habit, energy & biomarker progress tracking',
      'Safe dosage titration as your body adapts',
      'Care team messaging & priority delivery dispatch',
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
    description:
      'Comprehensive 6-month protocol for significant weight reduction, clinical lab monitoring, and preventing rebound gain.',
    features: [
      'Included monthly doctor review consultations (₹0)',
      'Advanced metabolic coaching & progress reviews',
      'Dedicated clinical dietitian & certified trainer support',
      'Priority cold-chain pharmacy dispatch',
      'Long-term set-point maintenance protocol',
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
    description:
      'Full year metabolic reset with 10% instant bulk discount. Complete doctor oversight from reduction to lifelong maintenance.',
    features: [
      '10% Instant Discount (Save ₹1,999)',
      'Included doctor follow-up consultation each month (₹0)',
      'Full dedicated multi-disciplinary care team',
      'Priority partner pharmacy fulfillment',
      'Long-term habit lock-in & maintenance protocol',
    ],
    displayOrder: 4,
  },
]

export default function PricingShaderCards() {
  const [plans, setPlans] = useState<TreatmentPlan[]>(FALLBACK_PLANS)
  const [selectedDuration, setSelectedDuration] = useState<number | 'all'>('all')

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

  const filteredPlans =
    selectedDuration === 'all'
      ? plans
      : plans.filter((p) => p.durationMonths === selectedDuration)

  return (
    <section
      id="pricing"
      className="relative z-10 py-16 sm:py-24 bg-[#FDFBF7]/80 backdrop-blur-[2px] text-slate-900 overflow-hidden border-b border-slate-200/80"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto mb-12 sm:mb-16">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white border border-slate-200 text-[#0F766E] text-xs font-semibold uppercase tracking-wider mb-4 font-sora shadow-xs">
            <Sparkles className="w-3.5 h-3.5 text-[#00A884]" />
            <span>TRANSPARENT CARE PLANS</span>
          </div>

          <h2 className="font-sora text-3xl sm:text-4xl md:text-5xl font-bold text-slate-900 leading-tight mb-4">
            Doctor-led treatment plans,{' '}
            <span className="bg-gradient-to-r from-[#00A884] via-[#0D9488] to-[#0F766E] bg-clip-text text-transparent">
              tailored to your goals.
            </span>
          </h2>

          <p className="text-sm sm:text-base md:text-lg text-slate-600 font-light max-w-2xl mx-auto leading-relaxed">
            All plans include licensed doctor video consultations, personalized Indian meal plans, dedicated coach support, and doorstep delivery coordination.
          </p>
        </div>

        {/* Pricing Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          {filteredPlans.map((plan) => {
            const isPopular = plan.id === '3m-metabolic' || plan.durationMonths === 3

            return (
              <div
                key={plan.id}
                className={`relative flex flex-col justify-between rounded-3xl p-6 sm:p-7 transition-all duration-200 ${
                  isPopular
                    ? 'bg-white border-2 border-[#00A884] shadow-lg ring-4 ring-[#00A884]/10'
                    : 'bg-white border border-slate-200 shadow-xs hover:border-slate-300'
                }`}
              >
                {/* Popular Pill */}
                {isPopular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3.5 py-1 rounded-full bg-[#00A884] text-white text-[11px] font-bold font-sora tracking-wide shadow-sm uppercase">
                    Most Recommended
                  </div>
                )}

                <div>
                  {/* Plan Name & Tagline */}
                  <h3 className="font-sora text-lg font-bold text-slate-900 mb-2">
                    {plan.name}
                  </h3>

                  <p className="text-xs text-slate-500 font-light leading-relaxed mb-6 min-h-[36px]">
                    {plan.description}
                  </p>

                  {/* Price Block */}
                  <div className="mb-6 pb-6 border-b border-slate-100">
                    <div className="flex items-baseline gap-1">
                      <span className="font-sora text-3xl sm:text-4xl font-black text-slate-900">
                        ₹{plan.finalPrice.toLocaleString('en-IN')}
                      </span>
                      {plan.durationMonths > 1 && (
                        <span className="text-xs text-slate-500 font-medium">
                          / {plan.durationMonths} months
                        </span>
                      )}
                    </div>

                    {plan.durationMonths > 1 && (
                      <p className="text-xs text-[#00A884] font-semibold mt-1">
                        ≈ ₹{plan.monthlyEquivalent.toLocaleString('en-IN')}/month
                      </p>
                    )}

                    {plan.discountPercentage > 0 && (
                      <p className="text-[11px] text-amber-700 font-medium mt-0.5">
                        Includes {plan.discountPercentage}% savings (₹{plan.discountAmount.toLocaleString('en-IN')})
                      </p>
                    )}
                  </div>

                  {/* Features List */}
                  <div className="space-y-2.5 mb-8">
                    {(plan.features || []).map((feat, i) => (
                      <div key={i} className="flex items-start gap-2.5 text-xs text-slate-700">
                        <CheckCircle2 className="w-3.5 h-3.5 text-[#00A884] shrink-0 mt-0.5" />
                        <span className="leading-snug">{feat}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Card CTA */}
                <div>
                  <Link
                    href={`/assessment?plan=${plan.id}`}
                    className={`w-full flex items-center justify-center gap-2 py-3.5 rounded-xl font-sora font-bold text-xs sm:text-sm transition-all cursor-pointer ${
                      isPopular
                        ? 'bg-[#00A884] hover:bg-[#0F766E] text-white shadow-md'
                        : 'bg-slate-900 hover:bg-slate-800 text-white shadow-xs'
                    }`}
                  >
                    <span>Start with this plan</span>
                    <ArrowRight size={14} />
                  </Link>

                  <p className="text-[10px] text-slate-400 text-center mt-2.5 font-light">
                    Doctor evaluation required prior to prescription
                  </p>
                </div>
              </div>
            )
          })}
        </div>

        {/* Security & Reassurance Guarantee Strip */}
        <div className="max-w-3xl mx-auto rounded-2xl bg-white p-5 sm:p-6 border border-slate-200 flex flex-wrap items-center justify-center gap-6 text-xs text-slate-600 font-medium text-center">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-[#00A884]" />
            <span>100% Doctor-Led Care</span>
          </div>
          <div className="flex items-center gap-2">
            <CalendarCheck className="w-4 h-4 text-[#00A884]" />
            <span>No Hidden Cancellation Fees</span>
          </div>
          <div className="flex items-center gap-2">
            <Truck className="w-4 h-4 text-[#00A884]" />
            <span>Temperature-Controlled Delivery</span>
          </div>
        </div>

      </div>
    </section>
  )
}
