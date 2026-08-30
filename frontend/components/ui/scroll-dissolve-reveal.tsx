'use client'

import React, { useRef, useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Image from 'next/image'
import { Sparkles, CheckCircle2, ChevronLeft, ChevronRight, ArrowDown } from 'lucide-react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { prefersReducedMotion } from '@/lib/scrollMotion'

gsap.registerPlugin(ScrollTrigger)

export interface DissolveStageItem {
  step: string
  badge: string
  title: string
  description: string
  image: string
  highlights: string[]
  cardTag: string
}

interface ScrollDissolveRevealProps {
  items: DissolveStageItem[]
  eyebrow?: string
  mainTitle?: string
  mainTitleGradient?: string
  subtitle?: string
}

export default function ScrollDissolveReveal({
  items,
  eyebrow = "YOUR JOURNEY",
  mainTitle = "Your journey,",
  mainTitleGradient = "step by step.",
  subtitle = "A personalized path built around your body, your goals, and your progress."
}: ScrollDissolveRevealProps) {
  const sectionRef = useRef<HTMLDivElement>(null)
  const pinRef = useRef<HTMLDivElement>(null)
  const tabListRef = useRef<HTMLDivElement>(null)
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([])
  const [activeStep, setActiveStep] = useState(0)
  const [direction, setDirection] = useState<1 | -1>(1)
  const [scrollProgress, setScrollProgress] = useState(0)

  // Touch gesture handling for mobile swipe
  const touchStartX = useRef<number | null>(null)
  const touchEndX = useRef<number | null>(null)

  const goToStep = useCallback((newStep: number) => {
    if (newStep < 0 || newStep >= items.length) return
    setDirection(newStep >= activeStep ? 1 : -1)
    setActiveStep(newStep)

    // Center active tab pill in mobile horizontal scroll
    if (tabRefs.current[newStep]) {
      tabRefs.current[newStep]?.scrollIntoView({
        behavior: 'smooth',
        inline: 'center',
        block: 'nearest'
      })
    }
  }, [activeStep, items.length])

  const handleNext = useCallback(() => {
    goToStep((activeStep + 1) % items.length)
  }, [activeStep, items.length, goToStep])

  const handlePrev = useCallback(() => {
    goToStep((activeStep - 1 + items.length) % items.length)
  }, [activeStep, items.length, goToStep])

  const onTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.targetTouches[0].clientX
  }

  const onTouchMove = (e: React.TouchEvent) => {
    touchEndX.current = e.targetTouches[0].clientX
  }

  const onTouchEnd = () => {
    if (touchStartX.current === null || touchEndX.current === null) return
    const distance = touchStartX.current - touchEndX.current
    const minSwipeDistance = 45 // 45px threshold

    if (distance > minSwipeDistance) {
      handleNext()
    } else if (distance < -minSwipeDistance) {
      handlePrev()
    }
    touchStartX.current = null
    touchEndX.current = null
  }

  // ScrollTrigger Setup: Smooth scroll dissolve for BOTH mobile and desktop
  useEffect(() => {
    const pinElem = pinRef.current
    const sectionElem = sectionRef.current
    if (!pinElem || !sectionElem) return

    if (prefersReducedMotion()) return

    const mm = gsap.matchMedia()
    const totalSteps = items.length

    // Desktop: Generous scroll distance for immersive storytelling
    mm.add('(min-width: 1024px)', () => {
      const scrollDistance = totalSteps * 550

      const trigger = ScrollTrigger.create({
        trigger: sectionElem,
        pin: pinElem,
        start: 'top top',
        end: `+=${scrollDistance}`,
        scrub: 0.3,
        anticipatePin: 1,
        onUpdate: (self) => {
          const progress = self.progress
          setScrollProgress(progress)
          const step = Math.min(
            Math.floor(progress * totalSteps),
            totalSteps - 1
          )
          setActiveStep((prev) => {
            if (prev !== step) {
              setDirection(step >= prev ? 1 : -1)
              // Auto-center tab
              if (tabRefs.current[step]) {
                tabRefs.current[step]?.scrollIntoView({
                  behavior: 'smooth',
                  inline: 'center',
                  block: 'nearest'
                })
              }
            }
            return step
          })
        },
      })

      return () => trigger.kill()
    })

    // Mobile & Tablet: Snappy, responsive scroll dissolve pinning
    mm.add('(max-width: 1023px)', () => {
      const mobileScrollDistance = totalSteps * 340

      const trigger = ScrollTrigger.create({
        trigger: sectionElem,
        pin: pinElem,
        start: 'top top',
        end: `+=${mobileScrollDistance}`,
        scrub: 0.25,
        anticipatePin: 1,
        fastScrollEnd: true,
        onUpdate: (self) => {
          const progress = self.progress
          setScrollProgress(progress)
          const step = Math.min(
            Math.floor(progress * totalSteps),
            totalSteps - 1
          )
          setActiveStep((prev) => {
            if (prev !== step) {
              setDirection(step >= prev ? 1 : -1)
              if (tabRefs.current[step]) {
                tabRefs.current[step]?.scrollIntoView({
                  behavior: 'smooth',
                  inline: 'center',
                  block: 'nearest'
                })
              }
            }
            return step
          })
        },
      })

      return () => trigger.kill()
    })

    return () => mm.revert()
  }, [items.length])

  const currentItem = items[activeStep] || items[0]

  return (
    <div ref={sectionRef} className="relative w-full bg-white border-b border-[#00A884]/15 overflow-hidden">
      {/* Soft atmospheric gradient background */}
      <div className="pointer-events-none absolute top-1/4 left-1/2 -translate-x-1/2 w-[700px] h-[500px] bg-[#00A884]/5 rounded-full blur-[140px] -z-0" />

      {/* Main Container */}
      <div
        ref={pinRef}
        className="w-full min-h-screen flex flex-col justify-between py-6 sm:py-10 lg:py-12 px-3 sm:px-6 lg:px-8 max-w-7xl mx-auto relative z-10"
      >
        {/* Top Header Section */}
        <div className="text-center max-w-3xl mx-auto mb-3 sm:mb-6">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-[#00A884]/10 border border-[#00A884]/20 mb-2 sm:mb-3 shadow-xs">
            <Sparkles className="w-3.5 h-3.5 text-[#00A884]" />
            <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-[0.22em] text-[#0F766E] font-sora">
              {eyebrow}
            </span>
          </div>

          <h2 className="font-sora text-2xl sm:text-4xl md:text-5xl font-bold text-[#0F172A] leading-tight mb-1.5 sm:mb-2 tracking-tight">
            {mainTitle} <span className="teal-gradient-text">{mainTitleGradient}</span>
          </h2>
          <p className="text-xs sm:text-sm md:text-base text-[#475569] font-light max-w-xl mx-auto leading-relaxed hidden sm:block">
            {subtitle}
          </p>
        </div>

        {/* Stage Progress Tabs (Mobile: Horizontal Smooth Scrollbar / Desktop: Centered Pills) */}
        <div className="w-full mb-3 sm:mb-6">
          <div
            ref={tabListRef}
            className="flex items-center justify-start lg:justify-center gap-1.5 sm:gap-3 overflow-x-auto no-scrollbar py-1 px-1 sm:px-0 snap-x"
          >
            {items.map((item, idx) => {
              const isActive = idx === activeStep
              return (
                <button
                  key={idx}
                  ref={(el) => { tabRefs.current[idx] = el }}
                  onClick={() => goToStep(idx)}
                  className={`flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-1.5 sm:py-2 rounded-full text-xs sm:text-sm font-sora font-semibold transition-all duration-300 shrink-0 cursor-pointer snap-center select-none active:scale-95 ${
                    isActive
                      ? 'bg-[#00A884] text-white shadow-md shadow-[#00A884]/25 ring-2 ring-[#00A884]/30 scale-[1.02]'
                      : 'bg-white text-[#475569] border border-slate-200 hover:bg-slate-50 hover:text-[#0F172A] hover:border-[#00A884]/30'
                  }`}
                  aria-label={`Go to stage ${item.step}: ${item.cardTag}`}
                >
                  <span
                    className={`w-4 h-4 sm:w-5 sm:h-5 rounded-full flex items-center justify-center text-[9px] sm:text-[10px] font-bold ${
                      isActive ? 'bg-white/20 text-white' : 'bg-slate-100 text-[#00A884]'
                    }`}
                  >
                    {item.step}
                  </span>
                  <span className="truncate max-w-[120px] sm:max-w-none">{item.cardTag}</span>
                </button>
              )
            })}
          </div>
        </div>

        {/* Main Display Grid */}
        <div
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
          className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-8 lg:gap-12 items-center max-w-6xl mx-auto w-full my-auto px-1 sm:px-4"
        >
          {/* Left: Responsive Dissolving Image Card */}
          <div className="lg:col-span-6 relative w-full h-[200px] xs:h-[230px] sm:h-[300px] md:h-[360px] lg:h-[400px] rounded-2xl sm:rounded-3xl overflow-hidden shadow-lg sm:shadow-xl border border-slate-200 bg-slate-900 group">
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={activeStep}
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 1.02 }}
                transition={{ duration: 0.35, ease: 'easeOut' }}
                className="absolute inset-0 w-full h-full"
              >
                <Image
                  src={currentItem.image}
                  alt={currentItem.title}
                  fill
                  sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 600px"
                  className="object-cover"
                  priority={activeStep === 0}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#0F172A]/80 via-[#0F172A]/20 to-transparent pointer-events-none" />

                {/* Top Badge on Mobile / Image */}
                <div className="absolute top-3 left-3 sm:top-5 sm:left-5 px-2.5 py-1 sm:px-3.5 sm:py-1.5 rounded-full bg-[#0F172A]/80 backdrop-blur-md border border-white/20 text-white text-[10px] sm:text-xs font-bold font-sora shadow-md flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#2DD4BF] animate-pulse" />
                  <span>Stage {currentItem.step} of 0{items.length}</span>
                </div>

                {/* Floating Bottom Tag */}
                <div className="absolute bottom-3 left-3 sm:bottom-5 sm:left-5 px-3 py-1 sm:px-4 sm:py-2 rounded-full bg-white/95 backdrop-blur-md border border-[#00A884]/30 text-[#00A884] text-[11px] sm:text-xs font-bold font-sora shadow-lg flex items-center gap-1.5 sm:gap-2">
                  <span className="w-2 h-2 rounded-full bg-[#00A884]" />
                  <span>{currentItem.cardTag}</span>
                </div>
              </motion.div>
            </AnimatePresence>

            {/* Mobile swipe hint overlay (subtle arrows) */}
            <div className="lg:hidden absolute inset-y-0 left-0 right-0 flex items-center justify-between px-2 pointer-events-none z-10 opacity-80">
              <button
                onClick={handlePrev}
                aria-label="Previous step"
                className="pointer-events-auto w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-black/50 text-white backdrop-blur-sm flex items-center justify-center hover:bg-black/70 active:scale-95 transition-all shadow cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4 sm:w-5 sm:h-5" />
              </button>
              <button
                onClick={handleNext}
                aria-label="Next step"
                className="pointer-events-auto w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-black/50 text-white backdrop-blur-sm flex items-center justify-center hover:bg-black/70 active:scale-95 transition-all shadow cursor-pointer"
              >
                <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5" />
              </button>
            </div>
          </div>

          {/* Right: Text Content & Clinical Highlights */}
          <div className="lg:col-span-6 flex flex-col justify-center min-h-[190px] sm:min-h-[220px]">
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={activeStep}
                initial={{ opacity: 0, y: direction * 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -direction * 10 }}
                transition={{ duration: 0.28, ease: 'easeOut' }}
                className="space-y-2.5 sm:space-y-4"
              >
                <div className="inline-flex items-center gap-2 px-2.5 py-0.5 sm:px-3 sm:py-1 rounded-full bg-[#00A884]/10 text-[#0F766E] border border-[#00A884]/20 text-[11px] sm:text-xs font-bold font-sora uppercase tracking-wide">
                  <span>Stage {currentItem.step}</span>
                  <span>•</span>
                  <span>{currentItem.badge}</span>
                </div>

                <h3 className="font-sora text-lg sm:text-2xl lg:text-3xl font-extrabold text-[#0F172A] leading-snug tracking-tight">
                  {currentItem.title}
                </h3>

                <p className="text-xs sm:text-sm md:text-base text-[#475569] font-light leading-relaxed">
                  {currentItem.description}
                </p>

                {/* Highlights Checklist */}
                <div className="pt-1 sm:pt-3 space-y-1.5 sm:space-y-2.5">
                  {currentItem.highlights.map((highlight, hIdx) => (
                    <div
                      key={hIdx}
                      className="flex items-center gap-2 sm:gap-3 text-xs sm:text-sm text-[#0F172A] font-medium font-sora bg-slate-50 sm:bg-transparent p-1.5 sm:p-0 rounded-xl border sm:border-0 border-slate-100"
                    >
                      <div className="w-4 h-4 sm:w-5 sm:h-5 rounded-full bg-[#00A884]/10 text-[#00A884] flex items-center justify-center shrink-0">
                        <CheckCircle2 size={12} className="sm:w-[13px] sm:h-[13px]" />
                      </div>
                      <span className="truncate sm:truncate-none">{highlight}</span>
                    </div>
                  ))}
                </div>
              </motion.div>
            </AnimatePresence>
          </div>
        </div>

        {/* Bottom Navigation & Scroll Dissolve Progress Indicator */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 sm:pt-5 pb-1 border-t border-slate-200/60 mt-2 sm:mt-4">
          {/* Left: Scroll Prompt or Mobile Info */}
          <div className="flex items-center gap-2 text-xs font-sora font-semibold text-[#475569]">
            <span className="hidden lg:inline-flex items-center gap-1.5 text-xs text-[#00A884] bg-[#00A884]/10 px-3 py-1 rounded-full font-medium">
              <ArrowDown className="w-3.5 h-3.5 animate-bounce" />
              <span>Scroll down or tap tabs to dissolve through steps</span>
            </span>
            <span className="lg:hidden text-[11px] text-slate-500 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-[#00A884] animate-pulse" />
              Step <strong className="text-[#00A884] font-bold">{activeStep + 1}</strong> of {items.length} · Scroll down or swipe
            </span>
          </div>

          {/* Center / Right: Step Progress Bar & Quick Step Buttons */}
          <div className="flex items-center gap-3">
            {/* Step Dots */}
            <div className="flex items-center gap-1.5">
              {items.map((_, dotIdx) => (
                <button
                  key={dotIdx}
                  onClick={() => goToStep(dotIdx)}
                  aria-label={`Jump to stage ${dotIdx + 1}`}
                  className={`h-1.5 sm:h-2 rounded-full transition-all duration-300 cursor-pointer ${
                    dotIdx === activeStep
                      ? 'w-6 sm:w-7 bg-[#00A884]'
                      : 'w-1.5 sm:w-2 bg-slate-300 hover:bg-slate-400'
                  }`}
                />
              ))}
            </div>

            {/* Quick Next / Prev Buttons */}
            <div className="flex items-center gap-1.5 ml-1">
              <button
                onClick={handlePrev}
                disabled={activeStep === 0}
                aria-label="Previous step"
                className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full border border-slate-200 bg-white flex items-center justify-center text-slate-700 transition-all ${
                  activeStep === 0
                    ? 'opacity-40 cursor-not-allowed'
                    : 'hover:bg-[#00A884] hover:text-white hover:border-[#00A884] shadow-xs active:scale-90 cursor-pointer'
                }`}
              >
                <ChevronLeft className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </button>
              <button
                onClick={handleNext}
                disabled={activeStep === items.length - 1}
                aria-label="Next step"
                className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full border border-slate-200 bg-white flex items-center justify-center text-slate-700 transition-all ${
                  activeStep === items.length - 1
                    ? 'opacity-40 cursor-not-allowed'
                    : 'bg-[#00A884] text-white border-[#00A884] hover:bg-[#0F766E] shadow-xs active:scale-90 cursor-pointer'
                }`}
              >
                <ChevronRight className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </button>
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}
