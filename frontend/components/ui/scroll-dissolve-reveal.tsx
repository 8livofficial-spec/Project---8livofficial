'use client'

import React, { useRef, useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Image from 'next/image'
import { Sparkles, CheckCircle2, ArrowDown, Touchpad, ArrowRight } from 'lucide-react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

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
  const [activeStep, setActiveStep] = useState(0)

  useEffect(() => {
    const pinElem = pinRef.current
    const sectionElem = sectionRef.current
    if (!pinElem || !sectionElem) return

    const totalSteps = items.length
    // Each step gets 750px of scroll distance
    const scrollDistance = totalSteps * 750

    const trigger = ScrollTrigger.create({
      trigger: sectionElem,
      pin: pinElem,
      start: 'top top',
      end: `+=${scrollDistance}`,
      scrub: 0.5,
      onUpdate: (self) => {
        const progress = self.progress
        // Map progress [0, 1] to step index [0..totalSteps-1]
        const step = Math.min(
          Math.floor(progress * totalSteps),
          totalSteps - 1
        )
        setActiveStep(step)
      },
    })

    return () => {
      trigger.kill()
    }
  }, [items.length])

  const currentItem = items[activeStep] || items[0]

  return (
    <div ref={sectionRef} className="relative w-full bg-white">
      {/* GSAP PINNED CONTAINER */}
      <div
        ref={pinRef}
        className="w-full min-h-screen flex flex-col justify-between py-10 sm:py-14 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto overflow-hidden bg-white z-20"
      >
        {/* Top Header Section */}
        <div className="text-center max-w-3xl mx-auto z-20">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#0D9488]/10 border border-[#0D9488]/20 mb-3 shadow-xs">
            <Sparkles className="w-3.5 h-3.5 text-[#0D9488]" />
            <span className="text-[11px] font-bold uppercase tracking-[0.22em] text-[#0F766E] font-sora">
              {eyebrow}
            </span>
          </div>

          <h2 className="font-sora text-3xl sm:text-4xl md:text-5xl font-bold text-[#0F172A] leading-tight mb-3 tracking-tight">
            {mainTitle} <span className="teal-gradient-text">{mainTitleGradient}</span>
          </h2>
          <p className="text-sm sm:text-base text-[#475569] font-light max-w-xl mx-auto leading-relaxed">
            {subtitle}
          </p>
        </div>

        {/* Stage Progress Tabs (Clean Spacing) */}
        <div className="my-6 sm:my-8 flex flex-wrap items-center justify-center gap-2.5 sm:gap-4 z-20 px-2">
          {items.map((item, idx) => {
            const isActive = idx === activeStep
            return (
              <button
                key={idx}
                onClick={() => setActiveStep(idx)}
                className={`flex items-center gap-2.5 px-4 py-2 rounded-full text-xs sm:text-sm font-sora font-semibold transition-all duration-300 cursor-pointer ${
                  isActive
                    ? 'bg-[#0D9488] text-white shadow-lg shadow-[#0D9488]/30 ring-2 ring-[#0D9488]/20 scale-105'
                    : 'bg-slate-100 text-[#475569] hover:bg-slate-200 hover:text-[#0F172A]'
                }`}
              >
                <span className="w-5 h-5 rounded-full bg-white/25 flex items-center justify-center text-[10px] font-bold">
                  {item.step}
                </span>
                <span>{item.cardTag}</span>
              </button>
            )
          })}
        </div>

        {/* Main Dissolve Display Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 sm:gap-12 lg:gap-16 items-center max-w-6xl mx-auto w-full my-auto z-20 px-2 py-4">
          
          {/* Left: Dissolving Image Reveal */}
          <div className="lg:col-span-6 relative w-full h-[280px] sm:h-[340px] md:h-[380px] rounded-3xl overflow-hidden shadow-2xl border border-[#0D9488]/20 bg-slate-50">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeStep}
                initial={{ opacity: 0, scale: 0.95, filter: 'blur(6px)' }}
                animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
                exit={{ opacity: 0, scale: 1.05, filter: 'blur(6px)' }}
                transition={{ duration: 0.5, ease: 'easeOut' }}
                className="absolute inset-0 w-full h-full"
              >
                <Image
                  src={currentItem.image}
                  alt={currentItem.title}
                  fill
                  className="object-cover"
                  priority
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#0F172A]/50 via-transparent to-transparent pointer-events-none" />
                
                {/* Image Overlay Tag */}
                <div className="absolute bottom-5 left-5 sm:left-6 px-4 py-2 rounded-full bg-white/95 backdrop-blur-md border border-[#0D9488]/30 text-[#0F766E] text-xs font-bold font-sora shadow-lg flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-[#0D9488] animate-pulse" />
                  <span>{currentItem.cardTag}</span>
                </div>
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Right: Dissolving Text & Clinical Highlights */}
          <div className="lg:col-span-6 flex flex-col justify-center">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeStep}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.4, ease: 'easeOut' }}
                className="space-y-4"
              >
                <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-[#0D9488]/10 text-[#0F766E] border border-[#0D9488]/30 text-xs font-bold font-sora uppercase">
                  <span>Stage {currentItem.step}</span>
                  <span>•</span>
                  <span>{currentItem.badge}</span>
                </div>

                <h3 className="font-sora text-2xl sm:text-3xl lg:text-4xl font-extrabold text-[#0F172A] leading-snug">
                  {currentItem.title}
                </h3>

                <p className="text-sm sm:text-base text-[#475569] font-light leading-relaxed">
                  {currentItem.description}
                </p>

                {/* Highlights Checklist */}
                <div className="pt-3 space-y-3">
                  {currentItem.highlights.map((highlight, hIdx) => (
                    <div key={hIdx} className="flex items-center gap-3 text-xs sm:text-sm text-[#0F172A] font-medium font-sora">
                      <div className="w-5 h-5 rounded-full bg-[#0D9488]/15 text-[#0D9488] flex items-center justify-center shrink-0">
                        <CheckCircle2 size={13} />
                      </div>
                      <span>{highlight}</span>
                    </div>
                  ))}
                </div>
              </motion.div>
            </AnimatePresence>
          </div>
        </div>

        {/* Bottom Scroll Guidance Indicator */}
        <div className="flex flex-col items-center gap-2.5 z-20 pt-4 pb-2">

          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-slate-900 text-white text-xs font-sora font-semibold shadow-xl">
            <Touchpad className="w-3.5 h-3.5 text-[#5EEAD4]" />
            <span>Scroll down to step through stages ({activeStep + 1} / {items.length})</span>
            <ArrowDown className="w-3.5 h-3.5 text-[#5EEAD4] animate-bounce" />
          </div>

          {/* Progress Bar */}
          <div className="w-44 h-1.5 bg-slate-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-[#0D9488] transition-all duration-300"
              style={{
                width: `${((activeStep + 1) / items.length) * 100}%`
              }}
            />
          </div>
        </div>

      </div>
    </div>
  )
}
