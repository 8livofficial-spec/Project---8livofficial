'use client'

/**
 * Trust — Why 8Liv (09 / WHY 8LIV)
 * Restructured as an asymmetric visual hierarchy layout.
 * One primary dominant clinical differentiator on the left, and three supporting ones on the right.
 */

import React, { useRef, useEffect } from 'react'
import { ShieldCheck, Stethoscope, HeartHandshake, Compass, CheckCircle2, Lock, Truck } from 'lucide-react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { prefersReducedMotion } from '@/lib/scrollMotion'

gsap.registerPlugin(ScrollTrigger)

export default function Trust() {
  const sectionRef = useRef<HTMLElement>(null)
  const headingWrapRef = useRef<HTMLDivElement>(null)
  const headingInnerRef = useRef<HTMLHeadingElement>(null)
  const leftCardRef = useRef<HTMLDivElement>(null)
  const rightCardsContainerRef = useRef<HTMLDivElement>(null)
  const ctx = useRef<gsap.Context | null>(null)

  useEffect(() => {
    const section = sectionRef.current
    if (!section) return

    ctx.current = gsap.context(() => {
      if (prefersReducedMotion()) return

      if (headingInnerRef.current) {
        gsap.fromTo(
          headingInnerRef.current,
          { y: '105%' },
          {
            y: '0%',
            duration: 0.9,
            ease: 'power3.out',
            scrollTrigger: {
              trigger: section,
              start: 'top 80%',
              once: true,
            },
          }
        )
      }

      if (leftCardRef.current) {
        gsap.fromTo(
          leftCardRef.current,
          { opacity: 0, x: -40, scale: 0.96 },
          {
            opacity: 1,
            x: 0,
            scale: 1,
            duration: 0.85,
            ease: 'power3.out',
            scrollTrigger: {
              trigger: leftCardRef.current,
              start: 'top 85%',
              once: true,
            },
          }
        )
      }

      if (rightCardsContainerRef.current) {
        gsap.fromTo(
          rightCardsContainerRef.current.children,
          { opacity: 0, x: 30 },
          {
            opacity: 1,
            x: 0,
            stagger: 0.12,
            duration: 0.8,
            ease: 'power3.out',
            scrollTrigger: {
              trigger: rightCardsContainerRef.current,
              start: 'top 85%',
              once: true,
            },
          }
        )
      }
    })

    return () => ctx.current?.revert()
  }, [])

  return (
    <section
      ref={sectionRef}
      id="trust"
      className="py-20 sm:py-28 relative overflow-hidden bg-[#FDFBF7]"
    >
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#D46E53]/20 to-transparent" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">

        {/* Header */}
        <div className="max-w-3xl mx-auto text-center mb-12 sm:mb-20">
          <div className="text-[11px] font-bold uppercase tracking-[0.25em] text-[#A84A33] font-sora mb-3 select-none">
            09 / WHY 8LIV
          </div>
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white border border-[#D46E53]/20 mb-3 sm:mb-4 shadow-sm">
            <ShieldCheck className="w-3.5 h-3.5 text-[#D46E53]" />
            <span className="text-xs font-semibold uppercase tracking-[0.16em] text-[#A84A33] font-sora">
              Clinical Governance
            </span>
          </div>

          <div ref={headingWrapRef} className="overflow-hidden">
            <h2
              ref={headingInnerRef}
              className="font-sora text-3xl sm:text-4xl md:text-5xl font-bold text-[#0F172A] leading-tight mb-4 sm:mb-5 will-change-transform"
              style={{ transform: 'translateY(105%)' }}
            >
              Built on clinical <br className="hidden sm:block" />
              <span className="teal-gradient-text">accountability.</span>
            </h2>
          </div>

          <p className="text-sm sm:text-base md:text-lg text-[#5D7068] leading-relaxed max-w-2xl mx-auto font-light">
            Your safety and long-term health are our absolute priority. We operate under strict clinical oversight at every stage.
          </p>
        </div>

        {/* Asymmetric Visual Hierarchy Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">

          {/* Left: Dominant Primary Differentiator (Clinical Oversight & Accountability) */}
          <div
            ref={leftCardRef}
            className="lg:col-span-7 rounded-[2.5rem] bg-white border border-[#D46E53]/20 hover:border-[#D46E53]/35 shadow-xl hover:shadow-2xl transition-all duration-300 p-8 sm:p-10 flex flex-col justify-between will-change-transform"
          >
            <div>
              <div className="inline-flex items-center gap-2.5 px-4.5 py-1.5 rounded-full bg-[#D46E53]/10 border border-[#D46E53]/15 text-[#A84A33] font-sora text-xs font-bold mb-6">
                <Stethoscope className="w-4 h-4" />
                <span>PRIMARY STANDARD</span>
              </div>

              <h3 className="font-sora text-2xl sm:text-3xl font-extrabold text-[#0F172A] mb-4 leading-tight">
                Clinician-Led Care &amp; Complete Accountability
              </h3>
              
              <p className="text-sm sm:text-base text-[#5D7068] leading-relaxed mb-6 font-light">
                All weight logs, medical prescriptions, and titration plans are reviewed directly by verified, licensed doctors following safety screenings. Your biological details are encrypted with bank-level records protection.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-6 border-t border-[#D46E53]/10">
                <div className="flex items-start gap-2.5">
                  <Lock className="w-5 h-5 text-[#D46E53] shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-xs font-bold text-[#0F172A]">Protected Health Records</h4>
                    <p className="text-[11px] text-[#5D7068] mt-0.5">Strict database encryption protocols</p>
                  </div>
                </div>
                <div className="flex items-start gap-2.5">
                  <Truck className="w-5 h-5 text-[#D46E53] shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-xs font-bold text-[#0F172A]">Regulated Pharmacy cold-chain</h4>
                    <p className="text-[11px] text-[#5D7068] mt-0.5">Discreet temperature-controlled delivery</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-8 pt-4 border-t border-[#D46E53]/10 flex items-center justify-between text-xs font-bold text-[#A84A33] font-sora">
              <span>Licensed Physicians Oversight</span>
              <CheckCircle2 className="w-4.5 h-4.5 text-[#D46E53]" />
            </div>
          </div>

          {/* Right: Supporting Differentiators Stack */}
          <div
            ref={rightCardsContainerRef}
            className="lg:col-span-5 flex flex-col justify-between gap-6"
          >
            {/* 01. Personalized */}
            <div className="p-6 rounded-[2rem] bg-white border border-[#D46E53]/12 hover:border-[#D46E53]/25 shadow-sm hover:shadow-md transition-all duration-300 flex items-start gap-4">
              <div className="w-10 h-10 rounded-xl bg-[#EDF4F2] flex items-center justify-center text-[#5D7068] shrink-0">
                <Compass className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-sora text-sm sm:text-base font-bold text-[#0F172A] mb-1">
                  Plan Tailored to Physiology
                </h4>
                <p className="text-xs sm:text-sm text-[#5D7068] leading-relaxed font-light">
                  Dietitians co-design blueprints around home-cooked food habits, avoiding restrictive generic Western templates.
                </p>
              </div>
            </div>

            {/* 02. Continuous Support */}
            <div className="p-6 rounded-[2rem] bg-white border border-[#D46E53]/12 hover:border-[#D46E53]/25 shadow-sm hover:shadow-md transition-all duration-300 flex items-start gap-4">
              <div className="w-10 h-10 rounded-xl bg-[#EDF4F2] flex items-center justify-center text-[#5D7068] shrink-0">
                <HeartHandshake className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-sora text-sm sm:text-base font-bold text-[#0F172A] mb-1">
                  Multidisciplinary Care Support
                </h4>
                <p className="text-xs sm:text-sm text-[#5D7068] leading-relaxed font-light">
                  Direct collaboration between your physician, clinical dietitian, and dedicated fitness trainer ensures synchronized medical, nutritional, and movement care.
                </p>
              </div>
            </div>

            {/* 03. Evidence Tracked */}
            <div className="p-6 rounded-[2rem] bg-white border border-[#D46E53]/12 hover:border-[#D46E53]/25 shadow-sm hover:shadow-md transition-all duration-300 flex items-start gap-4">
              <div className="w-10 h-10 rounded-xl bg-[#EDF4F2] flex items-center justify-center text-[#5D7068] shrink-0">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-sora text-sm sm:text-base font-bold text-[#0F172A] mb-1">
                  Evidence-based metabolic progress
                </h4>
                <p className="text-xs sm:text-sm text-[#5D7068] leading-relaxed font-light">
                  Track fat index and blood parameters over time. Safe fat reduction prioritizing muscle preservation.
                </p>
              </div>
            </div>
          </div>

        </div>

      </div>
    </section>
  )
}
