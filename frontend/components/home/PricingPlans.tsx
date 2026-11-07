'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { Check, ArrowRight, AlertCircle, CheckCircle2 } from 'lucide-react'
import KineticText from '@/components/ui/KineticText'
import ScrollRevealBox from '@/components/ui/ScrollRevealBox'
import { supabase } from '@/lib/supabaseClient'

interface PlanTier {
  id: string
  name: string
  durationText: string
  regularPrice: number
  activePrice: number
  isFirstTimeOffer?: boolean
  gstAmount: number
  totalWithGst: number
  savingsAmount: number
  features: string[]
  ctaText: string
  ctaHref: string
}

const PRICING_PLANS: PlanTier[] = [
  {
    id: 'seed-plan-1m',
    name: '1-Month Trial Plan',
    durationText: '1 Month Kickstart',
    regularPrice: 1820,
    activePrice: 1470,
    gstAmount: 265, // 1470 * 0.18 = 264.60 -> 265
    totalWithGst: 1735,
    savingsAmount: 350,
    features: [
      '1 Doctor Video Telehealth Consultation',
      '1 Clinical Dietitian Indian Meal Calibration',
      '1 Fitness Coach Movement Coaching Session',
      'Official CDSCO Digital E-Prescription in Portal',
      'Personalized Indian Diet Plan (Roti, Dal, Sabzi)',
      'Daily In-App Food & Water Log Tracking',
      'Prescriptions fulfilled at your preferred pharmacy',
    ],
    ctaText: 'Start 1-Month Trial',
    ctaHref: '/assessment?plan=seed-plan-1m',
  },
  {
    id: 'seed-plan-3m',
    name: '3-Month Metabolic Reset',
    durationText: '3 Months Continuous Care',
    regularPrice: 5460,
    activePrice: 4900,
    gstAmount: 882, // 4900 * 0.18 = 882
    totalWithGst: 5782,
    savingsAmount: 560,
    features: [
      'Multi-Cycle Doctor Follow-ups & Dosage Reviews',
      'Dedicated Clinical Dietitian Support Throughout',
      'Progressive Muscle-Defense Resistance Routines',
      'Continuous Metabolic Telemetry Monitoring',
      'Direct In-App Care Team Messaging',
      'Official Digital E-Prescription Renewals',
      'Prescriptions fulfilled at your preferred pharmacy',
    ],
    ctaText: 'Get 3-Month Plan',
    ctaHref: '/assessment?plan=seed-plan-3m',
  },
  {
    id: 'seed-plan-5m',
    name: '5-Month Transformation',
    durationText: '5 Months Complete Program',
    regularPrice: 9100,
    activePrice: 8225,
    gstAmount: 1481, // 8225 * 0.18 = 1480.50 -> 1481
    totalWithGst: 9706,
    savingsAmount: 875,
    features: [
      'Full 5-Month Physician-Supervised Protocol',
      'Bi-Weekly Biomarker & Clinical Review Cycles',
      'Dynamic Macro & Indian Meal Progression Strategy',
      'Guided Gym & Home Resistance Routines',
      'Long-Term Weight Regain Defense Protocol',
      'Priority Patient Support & Care Team Access',
      'Prescriptions fulfilled at your preferred pharmacy',
    ],
    ctaText: 'Get 5-Month Plan',
    ctaHref: '/assessment?plan=seed-plan-5m',
  },
]

export default function PricingPlans() {
  const [plans, setPlans] = useState<PlanTier[]>(PRICING_PLANS)
  // Interactive selection state: whichever plan is selected or hovered turns deep green!
  const [selectedPlanId, setSelectedPlanId] = useState<string>('seed-plan-3m')
  const [hoveredPlanId, setHoveredPlanId] = useState<string | null>(null)

  useEffect(() => {
    async function loadDynamicPricing() {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        const headers: Record<string, string> = {}
        if (session?.access_token) {
          headers['Authorization'] = `Bearer ${session.access_token}`
        }
        const res = await fetch('/api/subscriptions/pricing', { headers })
        const data = await res.json()
        const fetched = data.plans || data.tiers || []
        if (Array.isArray(fetched) && fetched.length > 0) {
          const mapped: PlanTier[] = fetched.map((p: any) => {
            const duration = Number(p.durationMonths) || 1
            const regularPrice = Number(p.originalPrice || p.basePrice || p.finalPrice)
            const activePrice = Number(p.finalPrice)
            const gstAmount = Math.round(activePrice * 0.18)
            const totalWithGst = activePrice + gstAmount
            const savingsAmount = regularPrice > activePrice ? regularPrice - activePrice : 0

            const durationText = duration === 1
              ? '1 Month Kickstart'
              : duration === 3
              ? '3 Months Continuous Care'
              : `${duration} Months Complete Program`

            return {
              id: p.id,
              name: p.name,
              durationText,
              regularPrice,
              activePrice,
              isFirstTimeOffer: p.isFirstTimeOffer !== undefined ? Boolean(p.isFirstTimeOffer) : true,
              gstAmount,
              totalWithGst,
              savingsAmount,
              features: Array.isArray(p.features) && p.features.length > 0 ? p.features : [
                `${duration} Treatment Cycle(s) with doctor supervision`,
                'Included doctor follow-ups (₹0)',
                'Dedicated clinical dietitian support',
                'Dedicated fitness coach movement roadmap',
                'Official CDSCO digital e-prescriptions',
                'Prescriptions fulfilled at your preferred pharmacy',
              ],
              ctaText: duration === 1 ? 'Start 1-Month Trial' : `Get ${duration}-Month Plan`,
              ctaHref: `/assessment?plan=${p.id}&duration=${duration}`,
            }
          })
          setPlans(mapped)
          const def = mapped.find((m) => m.name.includes('3') || m.durationText.includes('3')) || mapped[0]
          if (def) setSelectedPlanId(def.id)
        }
      } catch (err) {
        console.warn('Failed to load dynamic pricing for home page:', err)
      }
    }
    loadDynamicPricing()
  }, [])

  const activePlanId = hoveredPlanId || selectedPlanId

  return (
    <section
      id="pricing"
      aria-label="Clinical Care Plans"
      className="py-20 sm:py-24 lg:py-28 bg-[#FAFBF9] border-b border-slate-200/80 scroll-mt-20"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-14 sm:mb-18">
          <KineticText
            as="h2"
            className="font-sans text-[28px] xs:text-[32px] sm:text-4xl lg:text-5xl font-extrabold text-[#11241A] tracking-tight leading-tight mb-4"
          >
            Doctor-Supervised Care Plans
          </KineticText>
          <ScrollRevealBox variant="fade-up" delay={0.15}>
            <p className="text-slate-600 font-sans text-base sm:text-lg leading-relaxed">
              Transparent clinical pricing with dedicated physician supervision, personalized Indian metabolic nutrition, and lean-muscle coaching.
            </p>
          </ScrollRevealBox>
        </div>

        {/* 3 Interactive Pricing Cards Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-7 lg:gap-8 items-stretch">
          {plans.map((plan, idx) => {
            const isSelected = activePlanId === plan.id

            return (
              <ScrollRevealBox
                key={plan.id}
                variant="fade-up"
                delay={0.1 + idx * 0.1}
                className="h-full"
              >
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => setSelectedPlanId(plan.id)}
                  onMouseEnter={() => setHoveredPlanId(plan.id)}
                  onMouseLeave={() => setHoveredPlanId(null)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault()
                      setSelectedPlanId(plan.id)
                    }
                  }}
                  className={`h-full cursor-pointer relative rounded-[2.25rem] p-7 sm:p-8 flex flex-col justify-between transition-all duration-300 text-left outline-none ${
                    isSelected
                      ? 'bg-[#163824] text-white shadow-2xl ring-2 ring-[#00A884] -translate-y-2'
                      : 'bg-white text-slate-900 border border-slate-200/90 shadow-xs hover:border-slate-300 hover:shadow-lg'
                  }`}
                >
                  <div>
                    {/* Header: Duration & Selection Indicator */}
                    <div className="flex items-center justify-between gap-2 mb-4">
                      <span
                        className={`text-xs font-bold uppercase tracking-wider ${
                          isSelected ? 'text-emerald-400' : 'text-slate-500'
                        }`}
                      >
                        {plan.durationText}
                      </span>
                      {isSelected ? (
                        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-[#00A884] text-white shadow-xs">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Selected</span>
                        </span>
                      ) : (
                        <span className="text-xs font-semibold text-slate-400 group-hover:text-slate-600">
                          Click to select
                        </span>
                      )}
                    </div>

                    {/* Plan Name */}
                    <h3
                      className={`font-sans text-2xl font-extrabold mb-3 tracking-tight ${
                        isSelected ? 'text-white' : 'text-slate-900'
                      }`}
                    >
                      {plan.name}
                    </h3>

                    {/* Pricing Display */}
                    <div className="mb-5">
                      <div className="flex items-baseline gap-2.5">
                        {(plan.isFirstTimeOffer ?? true) && plan.regularPrice > plan.activePrice && (
                          <span
                            className="text-sm font-semibold line-through text-slate-400"
                          >
                            ₹{plan.regularPrice.toLocaleString('en-IN')}
                          </span>
                        )}
                        <span
                          className={`font-sans text-4xl sm:text-5xl font-extrabold tracking-tight tabular-nums ${
                            isSelected ? 'text-white' : 'text-slate-900'
                          }`}
                        >
                          ₹{plan.activePrice.toLocaleString('en-IN')}
                        </span>
                      </div>
                    </div>

                    {/* Features Divider */}
                    <div
                      className={`border-t my-6 ${
                        isSelected ? 'border-white/15' : 'border-slate-100'
                      }`}
                    />

                    {/* Features List */}
                    <ul className="space-y-3.5 mb-8">
                      {plan.features.map((feat) => (
                        <li key={feat} className="flex items-start gap-2.5 text-xs sm:text-sm">
                          <div
                            className={`w-4 h-4 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${
                              isSelected
                                ? 'bg-[#00A884] text-white'
                                : 'bg-emerald-100 text-[#00A884]'
                            }`}
                          >
                            <Check className="w-2.5 h-2.5 stroke-[3]" />
                          </div>
                          <span className={isSelected ? 'text-slate-200' : 'text-slate-600'}>
                            {feat}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Action CTA Button */}
                  <div>
                    <Link
                      href={plan.ctaHref}
                      onClick={(e) => e.stopPropagation()}
                      className={`w-full py-4 px-6 rounded-full font-sans font-bold text-sm sm:text-base flex items-center justify-center gap-2 transition-all shadow-md ${
                        isSelected
                          ? 'bg-[#00A884] hover:bg-[#009272] text-white hover:scale-[1.02] active:scale-[0.98]'
                          : 'bg-slate-900 hover:bg-[#163824] text-white hover:scale-[1.02] active:scale-[0.98]'
                      }`}
                    >
                      <span>{plan.ctaText}</span>
                      <ArrowRight className="w-4 h-4" />
                    </Link>
                  </div>
                </div>
              </ScrollRevealBox>
            )
          })}
        </div>

        {/* ========================================================= */}
        {/* STATUTORY PHARMACY & MEDICINE FULFILLMENT NOTICE           */}
        {/* ========================================================= */}
        <div className="mt-14 max-w-4xl mx-auto p-6 sm:p-7 rounded-3xl bg-amber-50/80 border border-amber-200/90 text-amber-950 flex flex-col sm:flex-row items-start sm:items-center gap-4 shadow-xs">
          <div className="w-10 h-10 rounded-2xl bg-amber-100 border border-amber-200 flex items-center justify-center shrink-0 text-amber-800">
            <AlertCircle className="w-5 h-5" />
          </div>
          <div className="flex-1 text-xs sm:text-sm leading-relaxed text-amber-900">
            <strong className="font-bold text-amber-950 block mb-0.5 text-sm sm:text-base">
              Medicine Fulfillment & Delivery Policy:
            </strong>
            8Liv provides doctor consultations, clinical diet plans, and official digital e-prescriptions. <strong>8Liv does NOT provide medicine delivery or sell medications directly to patients.</strong> Patients collect and purchase their prescribed medications independently from their own preferred licensed retail pharmacy using their official 8Liv e-prescription.
          </div>
        </div>

        {/* GST Tax Note */}
        <div className="mt-6 text-center max-w-2xl mx-auto">
          <p className="text-xs text-slate-500 font-sans leading-relaxed">
            *18% GST will be calculated and added during checkout payment in compliance with statutory regulations.
          </p>
        </div>

      </div>
    </section>
  )
}
