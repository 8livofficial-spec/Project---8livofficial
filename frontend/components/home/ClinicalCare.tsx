'use client'

/**
 * ClinicalCare — A Dedicated Care Team
 * Restructured as a clean, visual-first 4-column grid layout (no sticky pinning columns).
 */

import React, { useRef, useEffect } from 'react'
import Image from 'next/image'
import { Stethoscope, CheckCircle2 } from 'lucide-react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { prefersReducedMotion } from '@/lib/scrollMotion'

gsap.registerPlugin(ScrollTrigger)

const clinicalCards = [
  {
    step: '01',
    badge: 'Physician / Endocrinologist',
    title: 'Licensed Medical Oversight',
    subtitle: 'Direct Physician Consultations',
    desc: 'All medical diagnoses, safety reviews, and protocol titrations are handled directly by certified doctors — never automated bots.',
    image: '/images/medical_supervision_slide1.png',
    tag: 'Board Certified Doctors',
    highlights: [
      'Comprehensive history check',
      '1-on-1 video evaluation',
      'Contraindications screening',
    ],
  },
  {
    step: '02',
    badge: 'Clinical Dietitian',
    title: 'Culturally Adapted Nutrition',
    subtitle: 'Expert Nutritional Architecture',
    desc: 'Collaborate with a certified dietitian who translates clinical goals into meals built around home-cooked Indian foods.',
    image: '/images/nutrition_indian.png',
    tag: 'Metabolic Nutrition',
    highlights: [
      'Pacing high-quality protein',
      'Integrating home-cooked foods',
      'Weekly log review strategy',
    ],
  },
  {
    step: '03',
    badge: 'Fitness & Strength Lead',
    title: 'Muscle & Metabolic Control',
    subtitle: 'Visceral Fat Reduction',
    desc: 'Our exercise experts design simple strength and activity guidelines aimed at visceral fat reduction while protecting lean mass.',
    image: '/images/meal_prep.png',
    tag: 'Muscle Protection Protocols',
    highlights: [
      'Targeted preservation routines',
      'Visceral fat indicators tracking',
      'Step progress calibration',
    ],
  },
  {
    step: '04',
    badge: 'Care Coach & Advocate',
    title: 'Ongoing Daily Support',
    subtitle: 'Continuous Guidance',
    desc: 'A dedicated health advocate keeps you accountable, tracks habits, and handles all communication with your physician.',
    image: '/images/medical_supervision_slide3.png',
    tag: 'Daily Habit Coaching',
    highlights: [
      'Continuous chat interface',
      'Sleep & stress indicators audits',
      'Coordination of doctor visits',
    ],
  },
]

export default function ClinicalCare() {
  const sectionRef = useRef<HTMLElement>(null)
  const headingWrapRef = useRef<HTMLDivElement>(null)
  const headingInnerRef = useRef<HTMLHeadingElement>(null)
  const cardRefs = useRef<(HTMLDivElement | null)[]>([])
  const ctx = useRef<gsap.Context | null>(null)

  useEffect(() => {
    const section = sectionRef.current
    const cards = cardRefs.current.filter(Boolean) as HTMLDivElement[]
    if (!section || cards.length === 0) return

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

      cards.forEach((card, i) => {
        gsap.fromTo(
          card,
          { opacity: 0, y: 30, scale: 0.97 },
          {
            opacity: 1,
            y: 0,
            scale: 1,
            duration: 0.8,
            delay: i * 0.1,
            ease: 'power3.out',
            scrollTrigger: {
              trigger: card,
              start: 'top 85%',
              once: true,
            },
          }
        )
      })
    })

    return () => ctx.current?.revert()
  }, [])

  return (
    <section
      ref={sectionRef}
      id="clinical-governance"
      className="relative bg-[#FDFBF7] border-b border-[#D46E53]/15 py-20 sm:py-28"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">

        {/* Section Header */}
        <div className="max-w-3xl mb-12 sm:mb-16">
          <div className="text-[11px] font-bold uppercase tracking-[0.25em] text-[#A84A33] font-sora mb-3 select-none">
            05 / THE CARE TEAM
          </div>

          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white border border-[#D46E53]/20 mb-4 sm:mb-5 shadow-xs">
            <Stethoscope className="w-3.5 h-3.5 text-[#D46E53]" />
            <span className="text-xs font-semibold uppercase tracking-[0.16em] text-[#A84A33] font-sora">
              Clinical Care Team
            </span>
          </div>

          <div ref={headingWrapRef} className="overflow-hidden">
            <h2
              ref={headingInnerRef}
              className="font-sora text-3xl sm:text-4xl md:text-5xl font-bold text-[#0F172A] leading-[1.08] will-change-transform"
              style={{ transform: 'translateY(105%)' }}
            >
              A dedicated team <span className="teal-gradient-text">beside you.</span>
            </h2>
          </div>
          <p className="text-sm sm:text-base md:text-lg text-[#475569] leading-relaxed mt-3 max-w-xl font-light">
            No automated bots. No algorithms. Real medical experts co-managing your metabolic progress.
          </p>
        </div>

        {/* 4-Column Card Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-8">
          {clinicalCards.map((card, idx) => (
            <div
              key={idx}
              ref={(el) => { cardRefs.current[idx] = el }}
              className="group relative rounded-[2rem] bg-white border border-[#D46E53]/15 hover:border-[#D46E53]/35 transition-all duration-300 shadow-md hover:shadow-xl flex flex-col justify-between overflow-hidden will-change-transform"
            >
              <div>
                {/* Visual Area */}
                <div className="relative aspect-[16/11] w-full overflow-hidden bg-[#F9F6F0] shrink-0">
                  <Image
                    src={card.image}
                    alt={card.title}
                    fill
                    className="object-cover transition-transform duration-700 group-hover:scale-105"
                    sizes="300px"
                    quality={85}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#0F172A]/70 via-transparent to-transparent pointer-events-none" />
                  <div className="absolute top-3 left-3 px-3 py-1 rounded-full bg-white/95 text-[#A84A33] text-[9px] font-bold font-sora shadow-sm">
                    {card.tag}
                  </div>
                </div>

                {/* Content details */}
                <div className="p-6">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[#A84A33] font-sora">
                      {card.badge}
                    </span>
                    <span className="text-lg font-black font-sora text-[#D46E53]/25">0{idx + 1}</span>
                  </div>

                  <h3 className="font-sora text-base sm:text-lg font-bold text-[#0F172A] mb-1.5 leading-snug">
                    {card.title}
                  </h3>

                  <p className="text-xs sm:text-sm text-[#5D7068] leading-relaxed mb-4 font-light">
                    {card.desc}
                  </p>

                  <div className="space-y-2 pt-3 border-t border-[#D46E53]/10">
                    {card.highlights.map((item, hIdx) => (
                      <div key={hIdx} className="flex items-start gap-2 text-xs font-semibold text-[#0F172A]">
                        <CheckCircle2 className="w-3.5 h-3.5 text-[#D46E53] shrink-0 mt-0.5" />
                        <span>{item}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="mx-6 mb-6 pt-3.5 border-t border-[#D46E53]/10 flex items-center justify-between text-[11px] font-bold text-[#A84A33] font-sora">
                <span>Integrated Protocol</span>
                <span className="px-2 py-0.5 rounded-full bg-[#EDF4F2] text-[#5D7068]">Step 0{idx + 1}</span>
              </div>
            </div>
          ))}
        </div>

      </div>
    </section>
  )
}
