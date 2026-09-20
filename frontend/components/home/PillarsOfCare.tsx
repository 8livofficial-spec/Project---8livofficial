'use client'

import React, { useEffect, useState, useRef, useCallback } from 'react'
import Link from 'next/link'
import {
  Stethoscope,
  Pill,
  Utensils,
  Dumbbell,
  ArrowRight,
  CheckCircle2,
} from 'lucide-react'
import FoldText from '@/components/ui/FoldText'

/* ─────────────────────────────────────────────
   PILLAR DATA — emotionally rewritten copy
   (Indian-market anchored, SEO-enriched)
───────────────────────────────────────────── */
const pillars = [
  {
    num: '01',
    icon: <Stethoscope className="w-4 h-4" />,
    tag: 'Physician Oversight',
    // Power label
    title: 'Your Doctor Stays With You',
    // Original title for SEO alt text
    seoTitle: 'Board-Certified Doctors',
    image: '/images/medical_supervision_visual.png',
    // Emotional hook headline
    hook: 'Not a one-time consult.\nA real relationship.',
    description:
      'Most clinics see you once and disappear. Ours stay. Licensed Indian physicians track your endocrine biomarkers, adjust your dosage as your body changes, and answer your 2 AM questions directly.',
    highlights: [
      'Monthly 1-on-1 video consultations',
      'Personalized dosing & biomarker reviews',
      'Direct messaging for clinical queries',
      'Root-cause metabolic screening',
    ],
    stat: '94%',
    statLabel: 'patient retention after 6 months',
    accent: '#00A884',
    accentMuted: 'rgba(0,168,132,0.10)',
    accentGlow: 'rgba(0,168,132,0.22)',
  },
  {
    num: '02',
    icon: <Pill className="w-4 h-4" />,
    tag: 'Evidence-Based Medicine',
    title: 'The Science Your Body\nHas Been Waiting For',
    seoTitle: 'Modern GLP-1 Therapy India',
    image: '/images/medical_supervision_visual6.png',
    hook: 'The medication your body\nalready understands.',
    description:
      'GLP-1 therapy doesn\'t force willpower — it resets the hormonal signals that created the problem. Constant food noise, appetite spikes, metabolic stalls: treated at the source, not the symptom.',
    highlights: [
      'Cold-chain delivered prescriptions',
      'Regulates hormonal hunger & satiety',
      'Physician-supervised titration',
      'CDSCO & international standards',
    ],
    stat: '87%',
    statLabel: 'see appetite reduction by week 2',
    accent: '#0D9488',
    accentMuted: 'rgba(13,148,136,0.10)',
    accentGlow: 'rgba(13,148,136,0.22)',
  },
  {
    num: '03',
    icon: <Utensils className="w-4 h-4" />,
    tag: 'Clinical Dietitian',
    title: 'Your Kitchen Is\nThe Medicine',
    seoTitle: 'Adaptive Indian Meal Plans',
    image: '/images/nutrition_indian.png',
    hook: 'Dal, paneer, idli —\nyour food, not a foreign diet.',
    description:
      'No boiled salads. No guilt about roti. Our clinical dietitians build high-protein nutrition around what your family already cooks — because a plan you can\'t keep is no plan at all.',
    highlights: [
      'Tailored to regional Indian cuisines',
      'Preserves household cooking traditions',
      'Protein pacing & sustained energy',
      'Weekly grocery & meal adjustments',
    ],
    stat: '3×',
    statLabel: 'higher adherence vs. standard diets',
    accent: '#0F766E',
    accentMuted: 'rgba(15,118,110,0.10)',
    accentGlow: 'rgba(15,118,110,0.22)',
  },
  {
    num: '04',
    icon: <Dumbbell className="w-4 h-4" />,
    tag: 'Movement Coaching',
    title: 'Lose Fat.\nKeep Strength.\nFeel Alive.',
    seoTitle: 'Muscle-Preserving Fitness',
    image: '/images/nutrition_lifestyle.png',
    hook: 'Weight loss without\nlosing who you are.',
    description:
      'Most weight loss programs shrink fat and muscle together. Ours protect your lean mass, keep your metabolism high, and design movement you\'ll actually do — home, gym, or anywhere.',
    highlights: [
      'Guards against muscle loss',
      'Home & gym routines for all levels',
      'Keeps metabolic rate elevated',
      'Postural & joint alignment tracking',
    ],
    stat: '2.4×',
    statLabel: 'more fat lost vs. diet alone',
    accent: '#065F46',
    accentMuted: 'rgba(6,95,70,0.10)',
    accentGlow: 'rgba(6,95,70,0.20)',
  },
]

/* ─────────────────────────────────────────────
   ANIMATED NUMBER COUNTER
───────────────────────────────────────────── */
function StatCounter({ value, label, accent }: { value: string; label: string; accent: string }) {
  const [visible, setVisible] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) setVisible(true) },
      { threshold: 0.5 }
    )
    if (ref.current) obs.observe(ref.current)
    return () => obs.disconnect()
  }, [])

  return (
    <div ref={ref} className="flex flex-col items-start gap-0.5">
      <span
        className="font-sora text-3xl lg:text-4xl font-black leading-none tracking-tight transition-all duration-700"
        style={{
          color: accent,
          opacity: visible ? 1 : 0,
          transform: visible ? 'translateY(0)' : 'translateY(12px)',
        }}
      >
        {value}
      </span>
      <span
        className="text-[11px] text-slate-500 font-medium leading-tight max-w-[120px] transition-all duration-700 delay-100"
        style={{
          opacity: visible ? 1 : 0,
          transform: visible ? 'translateY(0)' : 'translateY(8px)',
        }}
      >
        {label}
      </span>
    </div>
  )
}

/* ─────────────────────────────────────────────
   3D FOLDTEXT HEADLINE (HERO STYLE)
───────────────────────────────────────────── */
function PillarsHeadline({
  currentPillar,
  className = 'text-2xl lg:text-[1.85rem] xl:text-4xl leading-[1.2] mb-3',
}: {
  currentPillar: typeof pillars[0]
  className?: string
}) {
  return (
    <h2 className={`font-sora font-bold text-slate-900 tracking-tight ${className}`}>
      <span className="block">
        <FoldText
          text="Most programs treat"
          splitBy="char"
          hinge="top"
          trigger="scroll"
          duration={0.65}
          stagger={0.025}
          ease="power3.out"
          perspective={700}
          creaseShading={0.35}
          fontSize="inherit"
          fontWeight={700}
          color="#0F172A"
          className="inline-block font-sora"
        />
        {' '}
        <FoldText
          text="symptoms."
          splitBy="char"
          hinge="top"
          trigger="scroll"
          duration={0.65}
          stagger={0.025}
          ease="power3.out"
          perspective={700}
          creaseShading={0.35}
          fontSize="inherit"
          fontWeight={600}
          color="#94A3B8"
          className="inline-block font-sora"
        />
      </span>
      <span className="block mt-1">
        <FoldText
          text="We treat the"
          splitBy="char"
          hinge="top"
          trigger="scroll"
          duration={0.65}
          stagger={0.025}
          ease="power3.out"
          perspective={700}
          creaseShading={0.35}
          fontSize="inherit"
          fontWeight={700}
          color="#0F172A"
          className="inline-block font-sora"
        />
        {' '}
        <span className="relative inline-block">
          <FoldText
            text="system."
            splitBy="char"
            hinge="top"
            trigger="scroll"
            duration={0.7}
            stagger={0.03}
            ease="power3.out"
            perspective={700}
            creaseShading={0.35}
            fontSize="inherit"
            fontWeight={800}
            color={currentPillar.accent}
            className="inline-block font-sora transition-colors duration-500"
            style={{
              textShadow: `0 2px 14px ${currentPillar.accentGlow}`,
            }}
          />
        </span>
      </span>
    </h2>
  )
}

/* ─────────────────────────────────────────────
   MAIN COMPONENT — INTERACTIVE TABBED SHOWCASE
   (Zero scroll trapping, smooth natural flow)
───────────────────────────────────────────── */
export default function PillarsOfCare() {
  const DURATION = 4500 // 4.5 seconds per part
  const [activeIdx, setActiveIdx] = useState(0)
  const [prevIdx, setPrevIdx] = useState(0)
  const [isCardHovered, setIsCardHovered] = useState(false)
  const [isVisible, setIsVisible] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const hoverTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Mobile swipe
  const touchStartX = useRef<number | null>(null)
  const touchStartY = useRef<number | null>(null)
  const mobileCardRef = useRef<HTMLDivElement>(null)

  // Pause completely when section is off-screen (zero CPU/GPU overhead)
  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsVisible(entry.isIntersecting)
      },
      { threshold: 0.15 }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  // Auto-advance timer: ticks once per 4.5s; paused when hovered or off-screen
  useEffect(() => {
    if (!isVisible || isCardHovered) return

    const timer = setTimeout(() => {
      setPrevIdx(activeIdx)
      setActiveIdx((prev) => (prev + 1) % pillars.length)
    }, DURATION)

    return () => clearTimeout(timer)
  }, [activeIdx, isVisible, isCardHovered])

  // Deliberate hover intent: 60ms debounce ignores fast cursor sweeps while scrolling
  const handleTabHover = useCallback((idx: number) => {
    if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current)
    if (activeIdx === idx) return

    hoverTimeoutRef.current = setTimeout(() => {
      setPrevIdx(activeIdx)
      setActiveIdx(idx)
    }, 60)
  }, [activeIdx])

  const handleTabLeave = useCallback(() => {
    if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current)
  }, [])

  const handleTabClick = useCallback((idx: number) => {
    if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current)
    if (activeIdx !== idx) {
      setPrevIdx(activeIdx)
      setActiveIdx(idx)
    }
  }, [activeIdx])

  useEffect(() => {
    return () => {
      if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current)
    }
  }, [])

  /* ── Mobile touch swipe ── */
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX
    touchStartY.current = e.touches[0].clientY
  }
  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null || touchStartY.current === null) return
    const dx = e.changedTouches[0].clientX - touchStartX.current
    const dy = e.changedTouches[0].clientY - touchStartY.current
    if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 40) {
      if (dx < 0 && activeIdx < 3) handleTabClick(activeIdx + 1)
      if (dx > 0 && activeIdx > 0) handleTabClick(activeIdx - 1)
    }
    touchStartX.current = null
    touchStartY.current = null
  }

  const currentPillar = pillars[activeIdx]
  const direction = activeIdx >= prevIdx ? 1 : -1

  return (
    <div
      ref={containerRef}
      id="pillars"
      className="relative w-full bg-white border-b border-slate-200/80 py-16 sm:py-20 lg:py-24 overflow-hidden"
    >
      {/* Ambient glow blobs — smooth color morphing background */}
      <div
        aria-hidden
        className="pointer-events-none absolute top-1/4 right-0 w-[500px] h-[500px] rounded-full blur-[110px] transition-all duration-700"
        style={{ background: currentPillar.accentGlow, opacity: 0.55 }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute bottom-1/4 left-0 w-[380px] h-[380px] rounded-full blur-[90px] transition-all duration-700"
        style={{ background: currentPillar.accentGlow, opacity: 0.35 }}
      />

      {/* ════════════════════════════════════════════
          DESKTOP (md+): Interactive Tabbed Showcase
      ════════════════════════════════════════════ */}
      <div className="hidden md:block max-w-7xl mx-auto px-6 lg:px-12 xl:px-16 relative z-10">
        <div className="grid grid-cols-12 gap-8 lg:gap-12 xl:gap-16 items-center">

          {/* ── LEFT COLUMN: Interactive Tabs & Hook ── */}
          <div className="col-span-5 flex flex-col justify-center">
            {/* Section Headline with Dynamic Scroll Accent & Color Morph */}
            <PillarsHeadline
              currentPillar={currentPillar}
              className="text-2xl lg:text-[1.85rem] xl:text-4xl leading-tight mb-2"
            />

            <p className="text-xs lg:text-sm text-slate-500 font-light leading-relaxed mb-6 max-w-sm">
              Four parts of care that work together — not in isolation — to permanently reset your metabolic baseline.
            </p>

            {/* Pillar interactive nav tabs */}
            <div className="space-y-2 mb-6">
              {pillars.map((p, i) => {
                const isActive = activeIdx === i

                return (
                  <button
                    key={p.num}
                    type="button"
                    onMouseEnter={() => handleTabHover(i)}
                    onMouseLeave={handleTabLeave}
                    onClick={() => handleTabClick(i)}
                    className={`relative w-full text-left flex items-center justify-between p-3.5 rounded-2xl transition-all duration-300 group cursor-pointer overflow-hidden ${
                      isActive
                        ? 'bg-white shadow-[0_8px_24px_rgba(0,0,0,0.08)] border border-slate-200/90 ring-2 ring-emerald-500/20'
                        : 'bg-transparent hover:bg-slate-50/80 border border-transparent'
                    }`}
                  >
                    {/* Active Tab Accent Highlight Bar */}
                    {isActive && (
                      <div
                        className="absolute inset-y-0 left-0 w-1.5 rounded-l-2xl transition-all duration-300"
                        style={{ background: p.accent }}
                      />
                    )}

                    {/* Ambient Progress Fill on Tab Surface */}
                    {isActive && (
                      <div
                        key={`wash-${activeIdx}`}
                        className="absolute inset-y-0 left-0 pointer-events-none rounded-2xl opacity-50 pillar-progress-track"
                        style={{
                          background: `linear-gradient(90deg, ${p.accentMuted}, transparent)`,
                          animationPlayState: isCardHovered || !isVisible ? 'paused' : 'running',
                        }}
                      />
                    )}

                    {/* Dedicated Bottom Full-Width Progress Track */}
                    {isActive && (
                      <div className="absolute bottom-0 inset-x-0 h-1 bg-slate-100 overflow-hidden pointer-events-none">
                        <div
                          key={`track-${activeIdx}`}
                          className="h-full relative pillar-progress-track"
                          style={{
                            background: `linear-gradient(90deg, ${p.accent}, #2DD4BF)`,
                            boxShadow: `0 0 8px ${p.accent}`,
                            animationPlayState: isCardHovered || !isVisible ? 'paused' : 'running',
                          }}
                        >
                          {/* Glowing leading indicator bead */}
                          <span
                            className="absolute right-0 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-white shadow-[0_0_6px_rgba(0,168,132,0.9)]"
                          />
                        </div>
                      </div>
                    )}

                    <div className="relative z-10 flex items-center gap-3.5 min-w-0 pl-1">
                      {/* Circular Progress Ring + Number Icon Badge */}
                      <div className="relative w-9 h-9 shrink-0 flex items-center justify-center">
                        {isActive && (
                          <svg className="absolute inset-0 w-full h-full -rotate-90 pointer-events-none" viewBox="0 0 36 36">
                            <circle
                              cx="18"
                              cy="18"
                              r="15"
                              fill="none"
                              stroke="#E2E8F0"
                              strokeWidth="2.5"
                            />
                            <circle
                              key={`ring-${activeIdx}`}
                              cx="18"
                              cy="18"
                              r="15"
                              fill="none"
                              stroke={p.accent}
                              strokeWidth="2.5"
                              strokeDasharray="94.2"
                              strokeLinecap="round"
                              className="pillar-progress-ring"
                              style={{
                                animationPlayState: isCardHovered || !isVisible ? 'paused' : 'running',
                              }}
                            />
                          </svg>
                        )}
                        <div
                          className={`w-7 h-7 rounded-lg flex items-center justify-center font-sora text-xs font-bold transition-all duration-300 ${
                            isActive
                              ? 'text-white shadow-sm'
                              : 'text-slate-400 bg-slate-100 group-hover:text-slate-600'
                          }`}
                          style={{ background: isActive ? p.accent : undefined }}
                        >
                          {p.num}
                        </div>
                      </div>

                      {/* Label & Tag */}
                      <div className="flex flex-col min-w-0">
                        <span
                          className={`font-sora text-xs lg:text-sm font-semibold truncate transition-colors duration-200 ${
                            isActive ? 'text-slate-900 font-bold' : 'text-slate-500 group-hover:text-slate-800'
                          }`}
                        >
                          {p.seoTitle}
                        </span>
                        <span className="text-[10px] text-slate-400 font-medium truncate">{p.tag}</span>
                      </div>
                    </div>

                    {/* Active Live Pulse Indicator */}
                    <div className="relative z-10 flex items-center gap-1 shrink-0 pr-1">
                      {isActive ? (
                        <span
                          className="w-2 h-2 rounded-full animate-pulse shadow-sm"
                          style={{ background: p.accent }}
                        />
                      ) : (
                        <span className="text-[11px] text-slate-300 group-hover:text-slate-400 transition-colors">
                          →
                        </span>
                      )}
                    </div>
                  </button>
                )
              })}
            </div>

            {/* CTA */}
            <div className="pt-2.5 border-t border-slate-200/70">
              <Link
                href="/assessment"
                id="desktop-pillars-cta"
                className="inline-flex items-center justify-center gap-2.5 px-6 py-3 rounded-full text-white font-sora font-semibold text-xs lg:text-sm transition-all duration-300 active:scale-[0.97] group cursor-pointer pillars-cta-glow"
                style={{ background: currentPillar.accent }}
              >
                <span>See If GLP-1 Is Right For You</span>
                <ArrowRight className="w-4 h-4 transition-transform duration-200 group-hover:translate-x-1" />
              </Link>
              <p className="text-[10px] text-slate-400 mt-2 pl-1 font-medium">
                3 mins • 100% confidential • No commitment
              </p>
            </div>
          </div>

          {/* ── RIGHT COLUMN: Smooth Crossfade Card Deck ── */}
          <div
            onMouseEnter={() => setIsCardHovered(true)}
            onMouseLeave={() => setIsCardHovered(false)}
            className="col-span-7 relative h-[520px] lg:h-[540px] w-full"
          >
            {pillars.map((pillar, idx) => {
              const isCurrent = activeIdx === idx

              return (
                <div
                  key={pillar.num}
                  className="absolute inset-0 w-full h-full rounded-3xl border border-slate-200/80 bg-white overflow-hidden shadow-[0_20px_56px_rgba(0,0,0,0.08)] flex flex-col"
                  style={{
                    opacity: isCurrent ? 1 : 0,
                    transform: isCurrent ? 'translateY(0px) scale(1)' : 'translateY(14px) scale(0.98)',
                    transition: 'opacity 0.4s cubic-bezier(0.16,1,0.3,1), transform 0.4s cubic-bezier(0.16,1,0.3,1)',
                    pointerEvents: isCurrent ? 'auto' : 'none',
                    zIndex: isCurrent ? 10 : 1,
                  }}
                >
                  {/* ── Image with parallax slide ── */}
                  <div className="relative w-full h-52 lg:h-56 shrink-0 overflow-hidden bg-slate-100">
                    <img
                      src={pillar.image}
                      alt={pillar.seoTitle}
                      loading="lazy"
                      decoding="async"
                      className={`w-full h-full object-cover object-center ${isCurrent ? 'pillar-image-enter' : ''}`}
                      style={{ '--slide-dir': `${direction * 30}px` } as React.CSSProperties}
                    />

                    {/* Bottom gradient bleed */}
                    <div className="absolute inset-0 bg-gradient-to-t from-white via-white/15 to-black/10 pointer-events-none" />

                    {/* Part badge */}
                    <div className="absolute top-4 left-4 flex items-center gap-2">
                      <span
                        className="font-sora font-bold text-[11px] px-3 py-1 rounded-full text-white shadow-md backdrop-blur-sm"
                        style={{ background: pillar.accent }}
                      >
                        Part {pillar.num}
                      </span>
                    </div>

                    {/* Tag pill */}
                    <div className="absolute top-4 right-4">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold font-sora bg-white/95 text-slate-700 shadow-sm border border-slate-200/70 backdrop-blur-sm">
                        <span className="w-1.5 h-1.5 rounded-full" style={{ background: pillar.accent }} />
                        {pillar.tag}
                      </span>
                    </div>

                    {/* Stat floating on image */}
                    <div className="absolute bottom-4 right-4">
                      <div className="flex flex-col items-end bg-white/90 backdrop-blur-sm rounded-2xl px-3 py-2 shadow-sm border border-white/60">
                        <span className="font-sora font-black text-xl" style={{ color: pillar.accent }}>
                          {pillar.stat}
                        </span>
                        <span className="text-[10px] text-slate-500 font-medium text-right leading-tight max-w-[100px]">
                          {pillar.statLabel}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* ── Card Content ── */}
                  <div className="p-6 lg:p-7 flex-1 flex flex-col justify-between">
                    <div>
                      {/* Hook line — emotional anchor */}
                      <p
                        className="font-sora text-xs font-semibold uppercase tracking-widest mb-1.5"
                        style={{ color: pillar.accent }}
                      >
                        {pillar.hook.split('\n')[0]}
                      </p>

                      {/* Power title */}
                      <h3 className="font-sora text-xl lg:text-2xl font-bold text-slate-900 tracking-tight mb-3 leading-snug">
                        {pillar.title.split('\n').map((line, li) => (
                          <span key={li} className="block">{line}</span>
                        ))}
                      </h3>

                      <p className="text-xs lg:text-sm text-slate-500 font-light leading-relaxed">
                        {pillar.description}
                      </p>
                    </div>

                    {/* Highlights */}
                    <div className="pt-4 border-t border-slate-100/80 space-y-0">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 font-sora mb-2">
                        What this covers
                      </p>
                      <div className="grid grid-cols-2 gap-1.5">
                        {pillar.highlights.map((h, hIdx) => (
                          <div key={hIdx} className="flex items-start gap-1.5 text-[11px] lg:text-xs text-slate-700 font-medium">
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

      {/* ════════════════════════════════════════════
          MOBILE (<md): Swipeable Story Cards
      ════════════════════════════════════════════ */}
      <div className="block md:hidden px-4 sm:px-6">
        <div className="max-w-lg mx-auto">
          {/* Header */}
          <div className="text-center mb-6">
            <PillarsHeadline
              currentPillar={currentPillar}
              className="text-2xl sm:text-3xl leading-tight mb-2"
            />
            <p className="text-xs text-slate-500 font-light leading-relaxed">
              Explore the 4 parts that work together.
            </p>
          </div>

          {/* Quick Pillar Tabs on Mobile with Progress Countdown */}
          <div className="grid grid-cols-4 gap-1.5 p-1 bg-slate-100 rounded-2xl mb-5">
            {pillars.map((p, idx) => {
              const isActive = activeIdx === idx
              return (
                <button
                  key={p.num}
                  type="button"
                  onClick={() => handleTabClick(idx)}
                  className={`relative overflow-hidden py-2 px-1 rounded-xl text-center font-sora text-xs font-bold transition-all cursor-pointer ${
                    isActive
                      ? 'bg-white text-slate-900 shadow-sm'
                      : 'text-slate-400 hover:text-slate-700'
                  }`}
                  style={{
                    color: isActive ? p.accent : undefined,
                  }}
                >
                  <span className="block text-[9px] text-slate-400 font-normal">Part</span>
                  {p.num}
                  {isActive && (
                    <span
                      key={`mobile-track-${activeIdx}`}
                      className="absolute bottom-0 left-0 h-[2.5px] rounded-full pointer-events-none pillar-progress-track"
                      style={{
                        background: p.accent,
                        animationPlayState: isCardHovered || !isVisible ? 'paused' : 'running',
                      }}
                    />
                  )}
                </button>
              )
            })}
          </div>

          {/* Swipeable Card */}
          <div
            ref={mobileCardRef}
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
            className="relative overflow-hidden rounded-3xl border border-slate-200/90 bg-white shadow-[0_16px_40px_rgba(0,0,0,0.1)]"
          >
            {/* Ambient glow top bar */}
            <div
              className="h-1 w-full transition-all duration-500"
              style={{ background: `linear-gradient(90deg, ${currentPillar.accent}, ${currentPillar.accentGlow})` }}
            />

            {/* Image */}
            <div className="relative w-full h-52 overflow-hidden bg-slate-100">
              <img
                key={`mobile-${activeIdx}`}
                src={currentPillar.image}
                alt={currentPillar.seoTitle}
                loading="lazy"
                decoding="async"
                className="w-full h-full object-cover object-center pillar-image-enter"
                style={{ '--slide-dir': '30px' } as React.CSSProperties}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-white via-white/10 to-transparent pointer-events-none" />

              <div className="absolute top-3 left-3">
                <span
                  className="font-sora font-bold text-[11px] px-2.5 py-0.5 rounded-full text-white shadow-sm"
                  style={{ background: currentPillar.accent }}
                >
                  Part {currentPillar.num}
                </span>
              </div>

              {/* Stat chip on image */}
              <div className="absolute bottom-3 right-3">
                <div className="flex flex-col items-end bg-white/90 backdrop-blur-sm rounded-xl px-2.5 py-1.5 shadow-sm">
                  <span className="font-sora font-black text-lg" style={{ color: currentPillar.accent }}>
                    {currentPillar.stat}
                  </span>
                  <span className="text-[9px] text-slate-500 font-medium text-right leading-tight max-w-[90px]">
                    {currentPillar.statLabel}
                  </span>
                </div>
              </div>
            </div>

            {/* Body */}
            <div className="p-5 sm:p-6">
              {/* Hook */}
              <p className="font-sora text-[10px] font-semibold uppercase tracking-widest mb-1" style={{ color: currentPillar.accent }}>
                {currentPillar.hook.split('\n')[0]}
              </p>

              <h3 className="font-sora text-lg sm:text-xl font-bold text-slate-900 tracking-tight mb-2.5 leading-snug">
                {currentPillar.title.split('\n').map((line, li) => (
                  <span key={li} className="block">{line}</span>
                ))}
              </h3>

              <p className="text-xs sm:text-sm text-slate-500 font-light leading-relaxed mb-4">
                {currentPillar.description}
              </p>

              {/* Highlights */}
              <div className="space-y-2 pt-4 border-t border-slate-100 mb-5">
                {currentPillar.highlights.map((h, hIdx) => (
                  <div key={hIdx} className="flex items-start gap-2 text-xs text-slate-700 font-medium">
                    <CheckCircle2 className="w-3.5 h-3.5 shrink-0 mt-0.5" style={{ color: currentPillar.accent }} />
                    <span>{h}</span>
                  </div>
                ))}
              </div>

              {/* Navigation arrows + CTA */}
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => activeIdx > 0 && handleTabClick(activeIdx - 1)}
                  disabled={activeIdx === 0}
                  className="w-11 h-11 rounded-full border border-slate-200 flex items-center justify-center text-slate-400 transition-all hover:border-slate-300 hover:text-slate-600 disabled:opacity-30 cursor-pointer shrink-0"
                >
                  <ArrowRight className="w-4 h-4 rotate-180" />
                </button>
                <Link
                  href="/assessment"
                  id="mobile-pillars-cta"
                  className="flex-1 flex items-center justify-center gap-2 py-3 rounded-full text-white font-sora font-semibold text-xs sm:text-sm transition-all duration-300 pillars-cta-glow"
                  style={{ background: currentPillar.accent }}
                >
                  <span>See If GLP-1 Is Right For You</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
                <button
                  type="button"
                  onClick={() => activeIdx < 3 && handleTabClick(activeIdx + 1)}
                  disabled={activeIdx === 3}
                  className="w-11 h-11 rounded-full border border-slate-200 flex items-center justify-center text-slate-400 transition-all hover:border-slate-300 hover:text-slate-600 disabled:opacity-30 cursor-pointer shrink-0"
                >
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Swipe hint */}
          <p className="text-center text-[10px] text-slate-400 mt-3 font-medium">
            ← Swipe to explore all 4 parts →
          </p>
        </div>
      </div>
    </div>
  )
}
