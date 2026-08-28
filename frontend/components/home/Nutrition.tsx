'use client'

import React, { useRef, useEffect } from 'react'
import { Utensils, Sparkles, CheckCircle2, ArrowRight } from 'lucide-react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import {
  prefersReducedMotion,
  animateLargeTypography,
} from '@/lib/scrollMotion'
import GradientCarousel, { CarouselItem } from '@/components/ui/gradient-carousel'

gsap.registerPlugin(ScrollTrigger)

const GUIDANCE_CAROUSEL_ITEMS: CarouselItem[] = [
  {
    id: 'step-01',
    badge: 'Step 01 / Nutrition',
    title: 'Personalized Indian Meals',
    subtitle: 'Preserving Traditional Regional Flavors',
    description: 'No generic Western templates. Your dietitian tailors high-protein meals around regional spices, home-cooked family favorites, and Indian ingredients.',
    tag: 'Nutrition',
    image: '/images/meal_indian.png'
  },
  {
    id: 'step-02',
    badge: 'Step 02 / Movement',
    title: 'Movement & Muscle Protection',
    subtitle: 'Protecting Lean Muscle Mass & Metabolism',
    description: 'Simple, habit-forming strength guidelines to protect lean muscle mass and optimize glycemic control — with zero extreme exercise strain.',
    tag: 'Exercise',
    image: '/images/meal_prep.png'
  },
  {
    id: 'step-03',
    badge: 'Step 03 / Habits',
    title: 'Daily Metabolic Habits',
    subtitle: 'Metabolic Stability & Routines',
    description: 'Clinical strategies for hydration, sleep, stress response, and consistent daily routines that stabilize your metabolic markers.',
    tag: 'Behavior',
    image: '/images/nutrition_indian.png'
  },
  {
    id: 'step-04',
    badge: 'Step 04 / Support',
    title: 'Dedicated Dietitian & Care Support',
    subtitle: 'Continuous Guidance That Adapts To You',
    description: 'Direct 1-on-1 guidance with certified clinical dietitians to adjust your personalized blueprint whenever your schedule changes.',
    tag: 'Coaching',
    image: '/images/nutrition_lifestyle.png'
  }
]

export default function Nutrition() {
  const sectionRef = useRef<HTMLElement>(null)
  const bgTextRef = useRef<HTMLDivElement>(null)
  const headingWrapRef = useRef<HTMLDivElement>(null)
  const headingInnerRef = useRef<HTMLHeadingElement>(null)
  const ctx = useRef<gsap.Context | null>(null)

  useEffect(() => {
    const section = sectionRef.current
    if (!section) return

    ctx.current = gsap.context(() => {
      if (prefersReducedMotion()) return

      if (bgTextRef.current) {
        animateLargeTypography(bgTextRef.current, section, {
          xStart: '15%',
          xEnd: '-30%',
        })
      }

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
      id="nutrition-rail"
      className="relative bg-white text-[#0F172A] border-b border-[#0D9488]/15 overflow-hidden py-10 sm:py-16"
    >
      {/* Watermark typography */}
      <div
        ref={bgTextRef}
        aria-hidden="true"
        className="pointer-events-none absolute top-6 left-0 text-[4rem] sm:text-[8rem] md:text-[12rem] font-black text-[#0D9488]/[0.03] font-sora select-none whitespace-nowrap -z-0 will-change-transform"
      >
        NOURISHMENT
      </div>

      <div className="pointer-events-none absolute right-0 top-1/3 w-[400px] h-[400px] bg-[#0D9488]/5 rounded-full blur-[140px] -z-0" />

      {/* Section Header */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 mb-6 sm:mb-10">
        <div className="text-[11px] font-bold uppercase tracking-[0.25em] text-[#0D9488] font-sora mb-2 select-none">
          06 / THE PLAN
        </div>
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-3 sm:gap-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-white border border-[#0D9488]/20 mb-2 sm:mb-3 shadow-xs">
              <Utensils className="w-3.5 h-3.5 text-[#0D9488]" />
              <span className="text-xs font-semibold uppercase tracking-[0.16em] text-[#0F766E] font-sora">
                Adaptive Lifestyle Protocols
              </span>
            </div>

            <div ref={headingWrapRef} className="overflow-hidden">
              <h2
                ref={headingInnerRef}
                className="font-sora text-2xl sm:text-4xl md:text-5xl font-bold text-[#0F172A] leading-tight will-change-transform"
                style={{ transform: 'translateY(0%)' }}
              >
                Guidance built <span className="teal-gradient-text">around your life.</span>
              </h2>
            </div>
          </div>

          <div className="max-w-md">
            <p className="text-xs sm:text-sm text-[#475569] leading-relaxed font-light">
              No rigid templates. Your care adapts to your food, regional culture, daily routine, and personal goals.
            </p>
          </div>
        </div>
      </div>

      {/* Flat Scroll Rail Container */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <GradientCarousel
          items={GUIDANCE_CAROUSEL_ITEMS}
          autoPlay={true}
          autoPlayInterval={3000}
          cardWidth={320}
          cardHeight={390}
          className="shadow-xl border border-slate-200 bg-white"
        />
      </div>

    </section>
  )
}


