'use client'

import React, { useEffect, useRef } from 'react'
import Link from 'next/link'
import {
  ClipboardCheck,
  Video,
  PackageCheck,
  HeartPulse,
  ArrowRight,
} from 'lucide-react'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import ScrollReveal from '@/components/ui/ScrollReveal'
import ScrollFloat from '@/components/ui/ScrollFloat'

gsap.registerPlugin(ScrollTrigger)

const steps = [
  {
    step: '01',
    tag: 'Intake',
    icon: <ClipboardCheck className="w-5 h-5 text-[#00A884]" />,
    title: 'Complete your health profile',
    description:
      'A 3-minute confidential online assessment to evaluate your lifestyle, medical history, and biological metabolic goals.',
    bullet: 'Takes less than 3 minutes',
    side: 'left' as const,
  },
  {
    step: '02',
    tag: 'Consultation',
    icon: <Video className="w-5 h-5 text-[#00A884]" />,
    title: '1-on-1 doctor video call',
    description:
      'Connect directly over secure video with a licensed Indian physician to evaluate clinical safety and tailor your protocol.',
    bullet: '100% Confidential Online',
    side: 'right' as const,
  },
  {
    step: '03',
    tag: 'Delivery',
    icon: <PackageCheck className="w-5 h-5 text-[#00A884]" />,
    title: 'Doorstep cold-chain delivery',
    description:
      'Clinically prescribed medications shipped in discreet, temperature-controlled packaging, paired with your Indian meal blueprint.',
    bullet: 'From Verified Partner Pharmacies',
    side: 'left' as const,
  },
  {
    step: '04',
    tag: 'Care',
    icon: <HeartPulse className="w-5 h-5 text-[#00A884]" />,
    title: 'Continuous medical guidance',
    description:
      'Monthly doctor reviews, safe dose adjustments, and direct chat support with your dedicated clinical dietitian.',
    bullet: 'Monthly Doctor Check-Ins Included',
    side: 'right' as const,
  },
]

/** Individual animated step card */
function StepCard({ item }: { item: typeof steps[0] }) {
  const cardRef = useRef<HTMLDivElement>(null)
  const isLeft = item.side === 'left'

  useEffect(() => {
    const el = cardRef.current
    if (!el) return

    const ctx = gsap.context(() => {
      // Card glides in from its side — scrubbed to scroll for fluid motion
      gsap.fromTo(
        el,
        { opacity: 0, x: isLeft ? -40 : 40, y: 16 },
        {
          opacity: 1,
          x: 0,
          y: 0,
          ease: 'power2.out',
          scrollTrigger: {
            trigger: el,
            start: 'top 95%',
            end: 'top 30%',
            scrub: 1.2,       // smooth lag behind scroll
          },
        }
      )

      // Description fades in slightly after the card
      const desc = el.querySelector('.card-desc')
      if (desc) {
        gsap.fromTo(
          desc,
          { opacity: 0, y: 10 },
          {
            opacity: 1,
            y: 0,
            ease: 'power2.out',
            scrollTrigger: {
              trigger: el,
              start: 'top 88%',
              end: 'top 25%',
              scrub: 1.5,
            },
          }
        )
      }

      // Bullet row follows last
      const bullet = el.querySelector('.card-bullet')
      if (bullet) {
        gsap.fromTo(
          bullet,
          { opacity: 0, y: 6 },
          {
            opacity: 1,
            y: 0,
            ease: 'power2.out',
            scrollTrigger: {
              trigger: el,
              start: 'top 82%',
              end: 'top 20%',
              scrub: 1.8,
            },
          }
        )
      }
    }, el)

    return () => ctx.revert()
  }, [isLeft])

  return (
    <div
      ref={cardRef}
      className="p-5 sm:p-7 md:p-8 rounded-2xl sm:rounded-[2rem] bg-white border border-slate-200/90 shadow-[0_6px_24px_rgba(0,0,0,0.03)] hover:border-[#00A884]/40 hover:shadow-md transition-all will-change-transform"
    >
      <span className="inline-block px-2.5 py-0.5 sm:px-3 sm:py-1 rounded-full text-xs font-semibold text-[#00A884] border border-[#00A884]/30 bg-emerald-50/50 font-sora">
        {item.tag}
      </span>

      {/* ScrollFloat title — character-by-character float up */}
      <ScrollFloat
        animationDuration={1.2}
        ease="power3.out"
        scrollStart="top 90%"
        scrollEnd="top 20%"
        stagger={0.02}
        containerClassName="mt-3 sm:mt-4 mb-2 sm:mb-2.5"
        textClassName="font-sora text-lg sm:text-xl md:text-2xl font-bold text-[#0F172A] tracking-tight"
      >
        {item.title}
      </ScrollFloat>

      <p className="card-desc text-xs sm:text-sm md:text-base text-[#64748B] font-light leading-relaxed mb-3 sm:mb-4">
        {item.description}
      </p>

      <div className="card-bullet flex items-center gap-2 text-xs sm:text-sm font-semibold text-[#00A884]">
        <span className="w-2 h-2 rounded-full bg-[#00A884] shrink-0 animate-pulse" />
        <span>{item.bullet}</span>
      </div>
    </div>
  )
}

export default function HowItWorks() {
  return (
    <section id="how-it-works" className="relative z-10 py-20 sm:py-28 bg-transparent border-b border-slate-200/50 overflow-hidden">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16 sm:mb-20">
          <p className="text-xs sm:text-sm font-bold uppercase tracking-[0.25em] text-[#00A884] font-sora mb-3">
            YOUR CARE JOURNEY
          </p>
          <ScrollReveal
            baseOpacity={0}
            enableBlur={true}
            baseRotation={3}
            blurStrength={6}
            containerClassName="max-w-3xl mx-auto mb-4"
            textClassName="font-sora text-3xl sm:text-4xl md:text-5xl font-extrabold text-[#0F172A] leading-tight tracking-tight text-center"
          >
            How 8liv works: Simple, transparent, doctor-led.
          </ScrollReveal>
          <p className="text-base sm:text-lg text-[#64748B] font-light max-w-xl mx-auto leading-relaxed">
            Everything happens online with discretion, clinical safety, and genuine support every step of the way.
          </p>
        </div>

        {/* ALTERNATING VERTICAL TIMELINE */}
        <div className="relative">

          {/* Central Vertical Line */}
          <div
            aria-hidden="true"
            className="absolute top-8 bottom-8 left-4 sm:left-6 md:left-1/2 -translate-x-1/2 w-0.5 bg-slate-200 pointer-events-none"
          />

          <div className="space-y-10 sm:space-y-16">
            {steps.map((item) => {
              const isLeft = item.side === 'left'

              return (
                <div key={item.step} className="relative flex items-center">

                  {/* Timeline Row */}
                  <div className="w-full grid grid-cols-1 md:grid-cols-2 gap-8 items-center pl-10 sm:pl-14 md:pl-0">

                    {/* LEFT SIDE */}
                    <div className={`${isLeft ? 'block md:pr-12 lg:pr-16' : 'hidden md:block md:invisible'}`}>
                      {isLeft && <StepCard item={item} />}
                    </div>

                    {/* RIGHT SIDE */}
                    <div className={`${!isLeft ? 'block md:pl-12 lg:pl-16' : 'hidden md:block md:invisible'}`}>
                      {!isLeft && <StepCard item={item} />}
                    </div>

                  </div>

                  {/* CENTRAL NODE */}
                  <div className="absolute left-4 sm:left-6 md:left-1/2 -translate-x-1/2 flex flex-col items-center z-10">
                    <div className="w-9 h-9 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-white border-2 border-[#00A884]/40 shadow-xs flex items-center justify-center text-[#00A884] hover:scale-105 transition-transform">
                      {item.icon}
                    </div>
                    <span className="text-[11px] font-bold text-slate-400 font-sora mt-1">
                      {item.step}
                    </span>
                  </div>

                </div>
              )
            })}
          </div>

        </div>

        {/* Bottom CTA */}
        <div className="text-center pt-16 sm:pt-20">
          <Link
            href="/assessment"
            className="inline-flex items-center gap-2.5 px-8 sm:px-10 py-4 rounded-full bg-[#00A884] hover:bg-[#0F766E] text-white font-sora font-bold text-sm sm:text-base shadow-lg shadow-[#00A884]/20 transition-all active:scale-[0.98] cursor-pointer"
          >
            <span>START YOUR HEALTH CHECK</span>
            <ArrowRight size={16} />
          </Link>
          <p className="text-xs text-slate-400 mt-3 font-light">
            Confidential · No obligation · Direct doctor consultation
          </p>
        </div>

      </div>
    </section>
  )
}
