'use client'

import React, { useEffect, useState, useRef } from 'react'
import Link from 'next/link'
import {
  Stethoscope,
  Pill,
  Utensils,
  Dumbbell,
  ArrowRight,
  CheckCircle2,
  Sparkles,
  ChevronRight,
} from 'lucide-react'

const pillars = [
  {
    num: '01',
    icon: <Stethoscope className="w-4 h-4" />,
    tag: 'Physician Oversight',
    title: 'Board-Certified Doctors',
    image: '/images/medical_supervision_visual.png',
    description:
      'Continuous 1-on-1 care with licensed Indian physicians who monitor endocrine biomarkers, assess safety, and tailor dosages to your metabolic profile.',
    highlights: [
      'Monthly 1-on-1 video consultations',
      'Personalized medical dosing & biomarker reviews',
      'Direct messaging for clinical queries',
      'Root-cause metabolic screening',
    ],
    accent: '#00A884',
    badgeBg: 'rgba(0,168,132,0.12)',
  },
  {
    num: '02',
    icon: <Pill className="w-4 h-4" />,
    tag: 'Evidence-Based Medicine',
    title: 'Modern GLP-1 Therapy',
    image: '/images/medical_supervision_visual6.png',
    description:
      'Clinically proven medications that regulate appetite signals, quiet constant food noise, and reset metabolic set-points when clinically indicated.',
    highlights: [
      'Prescriptions delivered in cold-chain packaging',
      'Regulates hormonal hunger & satiety pathways',
      'Physician-supervised titration schedule',
      'CDSCO & international clinical standards',
    ],
    accent: '#0D9488',
    badgeBg: 'rgba(13,148,136,0.12)',
  },
  {
    num: '03',
    icon: <Utensils className="w-4 h-4" />,
    tag: 'Clinical Dietitian',
    title: 'Adaptive Indian Meal Plans',
    image: '/images/nutrition_indian.png',
    description:
      'No starvation diets or plain boiled salads. Our clinical dietitians adapt high-protein nutrition around dal, paneer, and your regional household favorites.',
    highlights: [
      'Tailored specifically to regional Indian cuisines',
      'Preserves household cooking traditions',
      'Optimized for protein pacing & sustained energy',
      'Weekly grocery and meal adjustments',
    ],
    accent: '#0F766E',
    badgeBg: 'rgba(15,118,110,0.12)',
  },
  {
    num: '04',
    icon: <Dumbbell className="w-4 h-4" />,
    tag: 'Movement Coaching',
    title: 'Muscle-Preserving Fitness',
    image: '/images/nutrition_lifestyle.png',
    description:
      'Personalized, joint-friendly strength routines with certified trainers that burn visceral fat while actively protecting your lean muscle mass.',
    highlights: [
      'Guards against muscle loss during weight reduction',
      'Customized home or gym routines for all fitness levels',
      'Keeps your baseline metabolic rate elevated',
      'Postural & joint alignment tracking',
    ],
    accent: '#065F46',
    badgeBg: 'rgba(6,95,70,0.12)',
  },
]

export default function PillarsOfCare() {
  const [activeIdx, setActiveIdx] = useState(0)
  const [scrollProgress, setScrollProgress] = useState(0)
  const containerRef = useRef<HTMLDivElement>(null)

  // Live scroll listener tracking progress through the pinned container
  useEffect(() => {
    const handleScroll = () => {
      const container = containerRef.current
      if (!container) return

      const rect = container.getBoundingClientRect()
      const totalScroll = rect.height - window.innerHeight

      if (totalScroll <= 0) return

      // rect.top is 0 when the top of the container touches the top of the screen
      // As you scroll through the container, -rect.top goes from 0 to totalScroll
      const rawProgress = -rect.top / totalScroll
      const progress = Math.max(0, Math.min(1, rawProgress))
      setScrollProgress(progress)

      // Map progress across 4 cards: [0-0.25), [0.25-0.5), [0.5-0.75), [0.75-1.0]
      const idx = Math.min(3, Math.max(0, Math.floor(progress * 4)))
      setActiveIdx(idx)
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    window.addEventListener('resize', handleScroll, { passive: true })
    handleScroll()

    return () => {
      window.removeEventListener('scroll', handleScroll)
      window.removeEventListener('resize', handleScroll)
    }
  }, [])

  // Smooth jump to a specific pillar on click
  const handleJumpToPillar = (index: number) => {
    const container = containerRef.current
    if (!container) return
    const rect = container.getBoundingClientRect()
    const containerTop = rect.top + window.pageYOffset
    const totalScroll = container.offsetHeight - window.innerHeight
    const targetScroll = containerTop + totalScroll * (index / 4 + 0.1)
    window.scrollTo({ top: targetScroll, behavior: 'smooth' })
  }

  const currentPillar = pillars[activeIdx]

  return (
    <div
      ref={containerRef}
      id="pillars"
      className="relative w-full bg-[#FDFBF7] border-b border-slate-200/80"
    >
      {/* ================================================================ */}
      {/* DESKTOP & TABLET (md+): Pure Sticky Viewport (360vh Virtual Track) */}
      {/* The screen is LOCKED at top-0 while scrolling up/down through cards*/}
      {/* Cards change in place with zero jumping and zero moving down     */}
      {/* ================================================================ */}
      <div className="hidden md:block relative h-[300vh]">
        {/* Sticky viewport frame: locks to top-0 for the full 360vh */}
        <div className="sticky top-0 h-screen w-full flex items-center justify-center overflow-hidden px-6 lg:px-12 xl:px-16 pt-16">
          {/* Ambient background glow */}
          <div
            aria-hidden
            className="pointer-events-none absolute top-12 right-12 w-96 h-96 rounded-full opacity-[0.06] blur-3xl"
            style={{ background: '#00A884' }}
          />
          <div
            aria-hidden
            className="pointer-events-none absolute bottom-12 left-12 w-96 h-96 rounded-full opacity-[0.05] blur-3xl"
            style={{ background: '#0D9488' }}
          />

          <div className="max-w-7xl w-full mx-auto relative z-10">
            <div className="grid grid-cols-12 gap-8 lg:gap-12 xl:gap-16 items-center">

              {/* ── LEFT COLUMN: Stays permanently locked in place ── */}
              <div className="col-span-5 flex flex-col justify-center">
                {/* Eyebrow badge */}
                <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white border border-slate-200/90 text-[#0F766E] text-xs font-semibold uppercase tracking-wider mb-3.5 font-sora shadow-xs w-fit">
                  <Sparkles className="w-3.5 h-3.5 text-[#00A884]" />
                  <span>THE 8LIV CLINICAL ADVANTAGE</span>
                </div>

                {/* Headline */}
                <h2 className="font-sora text-2xl lg:text-3xl xl:text-4xl font-bold text-slate-900 leading-tight mb-3 tracking-tight">
                  The 4 pillars of complete metabolic care.
                </h2>

                <p className="text-xs lg:text-sm xl:text-base text-slate-600 font-light leading-relaxed mb-6">
                  Sustainable weight reset is not just a prescription. It unites clinical doctor oversight, GLP-1 science, home-cooked nutrition, and muscle-sparing movement.
                </p>

                {/* 4 Pillar Indicators with Live Scroll Progress Fill */}
                <div className="space-y-2 mb-6">
                  {pillars.map((p, i) => {
                    const isActive = activeIdx === i
                    const segmentProgress = Math.max(
                      0,
                      Math.min(1, (scrollProgress - i * 0.25) / 0.25)
                    )

                    return (
                      <button
                        key={p.num}
                        type="button"
                        onClick={() => handleJumpToPillar(i)}
                        className={`relative w-full text-left flex items-center justify-between p-3 rounded-2xl transition-all duration-300 group cursor-pointer overflow-hidden ${
                          isActive
                            ? 'bg-white shadow-[0_4px_20px_rgba(0,0,0,0.06)] border border-slate-200/90 ring-1 ring-black/5'
                            : 'bg-transparent hover:bg-white/60 border border-transparent'
                        }`}
                      >
                        {/* Live progress fill bar */}
                        {isActive && (
                          <div
                            className="absolute inset-y-0 left-0 opacity-15 pointer-events-none transition-all duration-75 ease-out"
                            style={{
                              width: `${segmentProgress * 100}%`,
                              background: p.accent,
                            }}
                          />
                        )}

                        <div className="relative z-10 flex items-center gap-3 min-w-0">
                          {/* Number badge */}
                          <div
                            className={`w-7 h-7 rounded-xl flex items-center justify-center font-sora text-xs font-bold transition-all duration-300 shrink-0 ${
                              isActive
                                ? 'text-white scale-105 shadow-sm'
                                : 'text-slate-400 bg-slate-100 group-hover:text-slate-600'
                            }`}
                            style={{
                              background: isActive ? p.accent : undefined,
                            }}
                          >
                            {p.num}
                          </div>

                          {/* Title & tag */}
                          <div className="flex flex-col min-w-0">
                            <span
                              className={`font-sora text-xs lg:text-sm font-semibold truncate transition-colors duration-200 ${
                                isActive ? 'text-slate-900 font-bold' : 'text-slate-500 group-hover:text-slate-800'
                              }`}
                            >
                              {p.title}
                            </span>
                            <span className="text-[10px] lg:text-[11px] text-slate-400 font-medium">
                              {p.tag}
                            </span>
                          </div>
                        </div>

                        {/* Status dot & chevron */}
                        <div className="relative z-10 flex items-center gap-1 shrink-0">
                          {isActive && (
                            <span
                              className="w-1.5 h-1.5 rounded-full animate-pulse mr-1"
                              style={{ background: p.accent }}
                            />
                          )}
                          <ChevronRight
                            className={`w-4 h-4 transition-transform duration-200 ${
                              isActive
                                ? 'translate-x-0 opacity-100'
                                : '-translate-x-1 opacity-0 group-hover:opacity-40 text-slate-400'
                            }`}
                            style={{ color: isActive ? p.accent : undefined }}
                          />
                        </div>
                      </button>
                    )
                  })}
                </div>

                {/* Primary CTA */}
                <div className="pt-2.5 border-t border-slate-200/70">
                  <Link
                    href="/assessment"
                    id="desktop-pillars-cta"
                    className="inline-flex items-center justify-center gap-2.5 w-auto px-6 py-3 rounded-full bg-[#00A884] hover:bg-[#009272] text-white font-sora font-semibold text-xs lg:text-sm shadow-md shadow-[#00A884]/25 hover:shadow-lg hover:shadow-[#00A884]/35 transition-all duration-200 active:scale-[0.98] group cursor-pointer"
                  >
                    <span>Check My Eligibility</span>
                    <ArrowRight className="w-4 h-4 transition-transform duration-200 group-hover:translate-x-1" />
                  </Link>
                  <p className="text-[10px] lg:text-[11px] text-slate-400 mt-2 pl-1 font-medium">
                    Takes 3 mins • 100% Confidential Online Care
                  </p>
                </div>
              </div>

              {/* ── RIGHT COLUMN: Locked Card Deck (Cards Change In Place) ── */}
              <div className="col-span-7 relative h-[500px] lg:h-[520px] w-full">
                {pillars.map((pillar, idx) => {
                  const isCurrent = activeIdx === idx
                  const isPast = idx < activeIdx

                  return (
                    <div
                      key={pillar.num}
                      className="absolute inset-0 w-full h-full rounded-3xl border border-slate-200/90 bg-white overflow-hidden shadow-[0_16px_48px_rgba(0,0,0,0.08)] flex flex-col group transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)]"
                      style={{
                        opacity: isCurrent ? 1 : 0,
                        transform: isCurrent
                          ? 'translateY(0px) scale(1)'
                          : isPast
                          ? 'translateY(-24px) scale(0.97)'
                          : 'translateY(28px) scale(0.97)',
                        pointerEvents: isCurrent ? 'auto' : 'none',
                        zIndex: isCurrent ? 10 : 1,
                      }}
                    >
                      {/* Top Partial Image with Scrim */}
                      <div className="relative w-full h-48 lg:h-52 shrink-0 overflow-hidden bg-slate-100">
                        <img
                          src={pillar.image}
                          alt={pillar.title}
                          className="w-full h-full object-cover object-center group-hover:scale-[1.02] transition-transform duration-500 ease-out"
                        />

                        {/* Gentle gradient into card content */}
                        <div className="absolute inset-0 bg-gradient-to-t from-white via-white/20 to-black/10 pointer-events-none" />

                        {/* Number badge on image */}
                        <div className="absolute top-3.5 left-3.5 flex items-center gap-2">
                          <span
                            className="font-sora font-bold text-[11px] px-2.5 py-0.5 rounded-full text-white shadow-sm backdrop-blur-md"
                            style={{ background: pillar.accent }}
                          >
                            Pillar {pillar.num}
                          </span>
                        </div>

                        {/* Tag pill */}
                        <div className="absolute top-3.5 right-3.5">
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold font-sora bg-white/95 text-slate-800 shadow-sm border border-slate-200/60 backdrop-blur-md">
                            <span
                              className="w-1.5 h-1.5 rounded-full"
                              style={{ background: pillar.accent }}
                            />
                            {pillar.tag}
                          </span>
                        </div>
                      </div>

                      {/* Card Content */}
                      <div className="p-6 lg:p-7 flex-1 flex flex-col justify-between">
                        <div>
                          <div className="flex items-center gap-2.5 mb-2">
                            <div
                              className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
                              style={{ background: pillar.badgeBg, color: pillar.accent }}
                            >
                              {pillar.icon}
                            </div>
                            <h3 className="font-sora text-xl lg:text-2xl font-bold text-slate-900 tracking-tight">
                              {pillar.title}
                            </h3>
                          </div>

                          <p className="text-xs lg:text-sm text-slate-600 font-light leading-relaxed mb-4">
                            {pillar.description}
                          </p>
                        </div>

                        {/* Highlights */}
                        <div className="pt-3.5 border-t border-slate-100 space-y-2">
                          <p className="text-[10px] lg:text-[11px] font-semibold uppercase tracking-wider text-slate-400 font-sora">
                            Key Clinical Highlights
                          </p>
                          <div className="grid grid-cols-2 gap-2">
                            {pillar.highlights.map((h, hIdx) => (
                              <div
                                key={hIdx}
                                className="flex items-start gap-1.5 text-[11px] lg:text-xs text-slate-700 font-medium"
                              >
                                <CheckCircle2
                                  className="w-3.5 h-3.5 shrink-0 mt-0.5"
                                  style={{ color: pillar.accent }}
                                />
                                <span className="leading-snug">{h}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>

            </div>
          </div>
        </div>
      </div>

      {/* ================================================================ */}
      {/* MOBILE (< md): Fluid Tabbed Deck (Zero Scroll Trapping)          */}
      {/* ================================================================ */}
      <div className="block md:hidden py-14 px-4 sm:px-6">
        <div className="max-w-xl mx-auto">
          {/* Header */}
          <div className="text-center mb-6">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white border border-slate-200/90 text-[#0F766E] text-[11px] font-semibold uppercase tracking-wider mb-3 font-sora shadow-xs">
              <Sparkles className="w-3 h-3 text-[#00A884]" />
              <span>THE 8LIV CLINICAL ADVANTAGE</span>
            </div>
            <h2 className="font-sora text-2xl sm:text-3xl font-bold text-slate-900 leading-tight mb-2 tracking-tight">
              The 4 pillars of complete metabolic care.
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 font-light leading-relaxed">
              Sustainable weight reset combines medical care, nutrition, fitness, and coaching.
            </p>
          </div>

          {/* Quick Pillar Tabs */}
          <div className="grid grid-cols-4 gap-1.5 p-1.5 bg-slate-100/90 rounded-2xl mb-6">
            {pillars.map((p, idx) => {
              const isSelected = activeIdx === idx
              return (
                <button
                  key={p.num}
                  type="button"
                  onClick={() => setActiveIdx(idx)}
                  className={`py-2 px-1 rounded-xl text-center font-sora text-xs font-bold transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-white text-slate-900 shadow-sm'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                  style={{
                    color: isSelected ? p.accent : undefined,
                  }}
                >
                  <span className="block text-[10px] text-slate-400 font-normal">Pillar</span>
                  {p.num}
                </button>
              )
            })}
          </div>

          {/* Mobile Card */}
          <div className="rounded-3xl border border-slate-200/90 bg-white overflow-hidden shadow-lg">
            {/* Image banner */}
            <div className="relative w-full h-44 overflow-hidden bg-slate-100">
              <img
                src={currentPillar.image}
                alt={currentPillar.title}
                className="w-full h-full object-cover object-center"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-white via-white/20 to-transparent pointer-events-none" />
              <div className="absolute top-3 left-3">
                <span
                  className="font-sora font-bold text-[11px] px-2.5 py-0.5 rounded-full text-white shadow-sm"
                  style={{ background: currentPillar.accent }}
                >
                  Pillar {currentPillar.num}
                </span>
              </div>
              <div className="absolute top-3 right-3">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold font-sora bg-white/95 text-slate-800 shadow-sm border border-slate-200/60">
                  {currentPillar.tag}
                </span>
              </div>
            </div>

            {/* Body */}
            <div className="p-5 sm:p-6">
              <div className="flex items-center gap-2.5 mb-2.5">
                <div
                  className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
                  style={{ background: currentPillar.badgeBg, color: currentPillar.accent }}
                >
                  {currentPillar.icon}
                </div>
                <h3 className="font-sora text-lg sm:text-xl font-bold text-slate-900 tracking-tight">
                  {currentPillar.title}
                </h3>
              </div>

              <p className="text-xs sm:text-sm text-slate-600 font-light leading-relaxed mb-5">
                {currentPillar.description}
              </p>

              {/* Highlights */}
              <div className="space-y-2 pt-4 border-t border-slate-100 mb-6">
                {currentPillar.highlights.map((h, hIdx) => (
                  <div
                    key={hIdx}
                    className="flex items-start gap-2 text-xs text-slate-700 font-medium"
                  >
                    <CheckCircle2
                      className="w-3.5 h-3.5 shrink-0 mt-0.5"
                      style={{ color: currentPillar.accent }}
                    />
                    <span>{h}</span>
                  </div>
                ))}
              </div>

              {/* CTA */}
              <Link
                href="/assessment"
                id="mobile-pillars-cta"
                className="flex items-center justify-center gap-2 w-full py-3 rounded-full bg-[#00A884] hover:bg-[#009272] text-white font-sora font-semibold text-xs sm:text-sm shadow-md shadow-[#00A884]/25 transition-all"
              >
                <span>Check My Eligibility</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
