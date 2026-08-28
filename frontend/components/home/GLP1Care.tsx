'use client'

/**
 * GLP1Care — Responsible Medical Guidance
 * Restructured to show a progressive step timeline: Assess -> Consult -> Treat -> Monitor -> Support
 */

import React, { useRef, useEffect } from 'react'
import { Pill, HeartHandshake, CheckCircle2 } from 'lucide-react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { prefersReducedMotion } from '@/lib/scrollMotion'
import ImageRevealList, { ImageRevealListItem } from '@/components/ui/image-reveal-list'

gsap.registerPlugin(ScrollTrigger)

const clinicalRevealItems: ImageRevealListItem[] = [
  {
    id: 'step-01',
    number: '01',
    phase: 'ASSESS',
    title: 'Confidential Metabolic Health Screening',
    description: 'Complete our online biological intake covering your medical history, symptoms, previous weight logs, and biomarkers.',
    subtitle: 'Biological Intake',
    image: '/images/hero_indian.png',
  },
  {
    id: 'step-02',
    number: '02',
    phase: 'CONSULT',
    title: '1-on-1 Clinical Video Consultation',
    description: 'Connect with a board-certified physician to evaluate your metabolic profile, review safety criteria, and co-design your care plan.',
    subtitle: 'Physician Review',
    image: '/images/doctor_consultation.png',
  },
  {
    id: 'step-03',
    number: '03',
    phase: 'TREAT',
    title: 'Evidence-Based Medical Treatment',
    description: 'If clinically appropriate and indicated, licensed medications are prescribed and delivered discreetly in cold-chain packaging.',
    subtitle: 'Cold-Chain Delivery',
    image: '/images/nutrition_indian.png',
  },
  {
    id: 'step-04',
    number: '04',
    phase: 'MONITOR',
    title: 'Dosage Titration & Active Monitoring',
    description: 'Scheduled check-ins allow doctors to monitor side effects, track metabolic progress, and safely calibrate dosage adjustments.',
    subtitle: 'Active Calibration',
    image: '/images/meal_prep.png',
  },
  {
    id: 'step-05',
    number: '05',
    phase: 'SUPPORT',
    title: 'Daily Nutrition & Behavioral Coaching',
    description: 'Partner with a clinical dietitian to establish high-protein Indian meal pacing and strength training guidelines for long-term health.',
    subtitle: 'Dietitian Coaching',
    image: '/images/nutrition_lifestyle.png',
  },
]

export default function GLP1Care() {
  const sectionRef = useRef<HTMLElement>(null)
  const headingWrapRef = useRef<HTMLDivElement>(null)
  const headingInnerRef = useRef<HTMLHeadingElement>(null)
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
    })

    return () => ctx.current?.revert()
  }, [])

  return (
    <section
      ref={sectionRef}
      id="glp1-care"
      className="py-16 sm:py-24 relative bg-white border-b border-[#0D9488]/15 overflow-hidden text-[#0F172A]"
    >
      <div className="pointer-events-none absolute -top-10 left-1/3 w-[600px] h-[500px] bg-[#0D9488]/5 rounded-full blur-[150px] -z-0" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">

        {/* Section Header */}
        <div className="text-[11px] font-bold uppercase tracking-[0.25em] text-[#0D9488] font-sora mb-3 select-none">
          07 / MEDICAL SUPPORT
        </div>
        <div className="grid lg:grid-cols-2 gap-8 lg:gap-10 items-end mb-10 sm:mb-14">
          <div>
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white border border-[#0D9488]/20 mb-4 sm:mb-5 shadow-xs">
              <Pill className="w-3.5 h-3.5 text-[#0D9488]" />
              <span className="text-xs font-semibold uppercase tracking-[0.16em] text-[#0F766E] font-sora">
                Medical Support
              </span>
            </div>

            <div ref={headingWrapRef} className="overflow-hidden">
              <h2
                ref={headingInnerRef}
                className="font-sora text-3xl sm:text-4xl md:text-5xl font-bold text-[#0F172A] leading-[1.1] will-change-transform"
                style={{ transform: 'translateY(0%)' }}
              >
                Clinical assistance, <br className="hidden sm:block" />
                <span className="teal-gradient-text">when appropriate.</span>
              </h2>
            </div>
          </div>

          <div>
            <p className="text-sm sm:text-base text-[#475569] leading-relaxed mb-5 font-light">
              Evidence-based medication is prescribed only when clinically indicated based on your biological safety screening. Never a standalone solution. Every prescription requires thorough physician evaluation.
            </p>
            <div className="p-4 rounded-2xl bg-white border border-[#0D9488]/20 shadow-xs flex items-center gap-3.5">
              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-[#0D9488]/15 flex items-center justify-center shrink-0">
                <HeartHandshake className="w-4 h-4 sm:w-5 sm:h-5 text-[#0D9488]" />
              </div>
              <div>
                <p className="text-xs font-bold text-[#0F172A] font-sora">Medically Governed Care</p>
                <p className="text-[11px] text-[#64748B]">Personalised titration, zero algorithmic dosing</p>
              </div>
            </div>
          </div>
        </div>

        {/* Vengeance UI Image Reveal List Component */}
        <div className="my-6 sm:my-10">
          <ImageRevealList items={clinicalRevealItems} />
        </div>

      </div>
    </section>
  )
}

