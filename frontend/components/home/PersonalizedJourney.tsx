'use client'

/**
 * PersonalizedJourney — Nutrition & Lifestyle (07 / NUTRITION & LIFESTYLE)
 * Rebuilt as a clean, visual-first 4-column card grid in normal document flow.
 * Removes sticky timelines, deck stacks, and artificial heights.
 */

import React, { useRef, useEffect } from 'react'
import Image from 'next/image'
import { Milestone, CheckCircle2 } from 'lucide-react'
import AccordionGallery, { AccordionGalleryItem } from '@/components/ui/AccordionGallery'
import gsap from 'gsap'

import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { prefersReducedMotion } from '@/lib/scrollMotion'

gsap.registerPlugin(ScrollTrigger)

const deckSteps = [
  {
    step: '01',
    action: 'FOOD',
    tag: 'Metabolic Fueling',
    title: 'Adaptive Indian Meals',
    desc: 'No restrictive plans. Your clinical dietitian adapts your meal blueprint around paneer, dal, household spices, and home-cooked family favorites.',
    image: '/images/meal_indian.png',
  },
  {
    step: '02',
    action: 'MOVEMENT',
    tag: 'Lean Muscle Protection',
    title: 'Visceral Fat Control',
    desc: 'Simple physical activity and strength guidelines designed to reduce visceral fat indicators while fully protecting your active muscle mass.',
    image: '/images/meal_prep.png',
  },
  {
    step: '03',
    action: 'HABITS',
    tag: 'Daily Biomarker Tracking',
    title: 'Stress, Sleep & Hydration',
    desc: 'Targeted lifestyle check-ins that track hydration level, deep sleep cycles, and cortisol response to optimize daily insulin sensitivity.',
    image: '/images/hero_wellness.png',
  },
  {
    step: '04',
    action: 'CONSISTENCY',
    tag: 'Sustained Maintenance',
    title: 'Metabolic Set-Point Calibration',
    desc: 'Gradual adjustments to ensure your weight loss is held permanent as your hormones settle into a healthy new regulation state.',
    image: '/images/nutrition_indian.png',
  },
]

export default function PersonalizedJourney() {
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

      const mm = gsap.matchMedia()

      // Desktop animations
      mm.add('(min-width: 1024px)', () => {
        cards.forEach((card, i) => {
          gsap.fromTo(
            card,
            { opacity: 0, y: 30, scale: 0.96 },
            {
              opacity: 1,
              y: 0,
              scale: 1,
              duration: 0.85,
              delay: i * 0.08,
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

      // Mobile animations (no index delays, faster duration, tight translation offset)
      mm.add('(max-width: 1023px)', () => {
        cards.forEach((card) => {
          gsap.fromTo(
            card,
            { opacity: 0, y: 15, scale: 0.98 },
            {
              opacity: 1,
              y: 0,
              scale: 1,
              duration: 0.55,
              ease: 'power2.out',
              scrollTrigger: {
                trigger: card,
                start: 'top 90%',
                once: true,
              },
            }
          )
        })
      })
    })

    return () => ctx.current?.revert()
  }, [])

  return (
    <section
      ref={sectionRef}
      id="personalized-journey"
      className="relative bg-[#F9F6F0] border-b border-[#D46E53]/15 py-20 sm:py-28 overflow-hidden"
    >
      <div className="pointer-events-none absolute -bottom-10 right-0 w-[550px] h-[400px] bg-[#D46E53]/5 rounded-full blur-[140px] -z-0" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">

        {/* Section Header */}
        <div className="max-w-3xl mb-12 sm:mb-16">
          <div className="text-[11px] font-bold uppercase tracking-[0.25em] text-[#A84A33] font-sora mb-3 select-none">
            07 / NUTRITION &amp; LIFESTYLE
          </div>
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white border border-[#D46E53]/20 mb-4 sm:mb-5 shadow-xs">
            <Milestone className="w-3.5 h-3.5 text-[#D46E53]" />
            <span className="text-xs font-semibold uppercase tracking-[0.16em] text-[#A84A33] font-sora">
              Clinical Habits
            </span>
          </div>

          <div ref={headingWrapRef}>
            <h2
              ref={headingInnerRef}
              className="font-sora text-3xl sm:text-4xl md:text-5xl font-bold text-[#0F172A] leading-tight"
            >
              Nourishment <span className="teal-gradient-text">meets habit.</span>
            </h2>
          </div>

          <p className="text-sm sm:text-base md:text-lg text-[#5D7068] leading-relaxed mt-3 max-w-xl font-light">
            Culturally aligned nutrition pacing and activity guidelines built for sustainable daily compliance.
          </p>
        </div>

        {/* Interactive Accordion Gallery */}
        <div>
          <AccordionGallery
            items={[
              { image: '/images/meal_indian.png', label: 'Adaptive Indian Meals', link: '#' },
              { image: '/images/meal_prep.png', label: 'Glycemic Strength & Protection', link: '#' },
              { image: '/images/nutrition_indian.png', label: 'Daily Metabolic Routine', link: '#' },
              { image: '/images/nutrition_lifestyle.png', label: 'Clinical Dietitian Guidance', link: '#' },
              { image: '/images/hero_wellness.png', label: 'Long-term Health Mastery', link: '#' }
            ]}
            height={460}
            expandRatio={0.5}
            accentColor="#0D9488"
            overlayColor="#0F172A"
            trigger="hover"
            className="shadow-2xl border border-[#0D9488]/20"
          />
        </div>
      </div>
    </section>
  )
}
