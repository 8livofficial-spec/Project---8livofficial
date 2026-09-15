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
  Sparkles,
} from 'lucide-react'

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
   MAIN COMPONENT
───────────────────────────────────────────── */
export default function PillarsOfCare() {
  const [activeIdx, setActiveIdx] = useState(0)
  const [prevIdx, setPrevIdx] = useState(0)
  const [scrollProgress, setScrollProgress] = useState(0)
  const [imageKey, setImageKey] = useState(0) // triggers image slide-in
  const containerRef = useRef<HTMLDivElement>(null)
  // Mobile swipe
  const touchStartX = useRef<number | null>(null)
  const touchStartY = useRef<number | null>(null)
  const mobileCardRef = useRef<HTMLDivElement>(null)

  /* ── Scroll-driven pillar sync (desktop) ── */
  useEffect(() => {
    const handleScroll = () => {
      const container = containerRef.current
      if (!container) return
      const rect = container.getBoundingClientRect()
      const totalScroll = rect.height - window.innerHeight
      if (totalScroll <= 0) return
      const raw = -rect.top / totalScroll
      const progress = Math.max(0, Math.min(1, raw))
      setScrollProgress(progress)
      const idx = Math.min(3, Math.max(0, Math.floor(progress * 4)))
      setActiveIdx(prev => {
        if (prev !== idx) {
          setPrevIdx(prev)
          setImageKey(k => k + 1)
          return idx
        }
        return prev
      })
    }
    window.addEventListener('scroll', handleScroll, { passive: true })
    window.addEventListener('resize', handleScroll, { passive: true })
    handleScroll()
    return () => {
      window.removeEventListener('scroll', handleScroll)
      window.removeEventListener('resize', handleScroll)
    }
  }, [])

  /* ── Click-jump to pillar ── */
  const handleJumpToPillar = useCallback((index: number) => {
    const container = containerRef.current
    if (!container) return
    const rect = container.getBoundingClientRect()
    const containerTop = rect.top + window.pageYOffset
    const totalScroll = container.offsetHeight - window.innerHeight
    const targetScroll = containerTop + totalScroll * (index / 4 + 0.05)
    window.scrollTo({ top: targetScroll, behavior: 'smooth' })
  }, [])

  /* ── Mobile tab switch (no scroll jump) ── */
  const handleMobileTab = useCallback((idx: number) => {
    setPrevIdx(activeIdx)
    setImageKey(k => k + 1)
    setActiveIdx(idx)
  }, [activeIdx])

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
      if (dx < 0 && activeIdx < 3) handleMobileTab(activeIdx + 1)
      if (dx > 0 && activeIdx > 0) handleMobileTab(activeIdx - 1)
    }
    touchStartX.current = null
    touchStartY.current = null
  }

  const currentPillar = pillars[activeIdx]

  /* ── Direction of transition (for image slide) ── */
  const direction = activeIdx >= prevIdx ? 1 : -1

  return (
    <div
      ref={containerRef}
      id="pillars"
      className="relative w-full bg-white border-b border-slate-200/80"
    >
      {/* ════════════════════════════════════════════
          DESKTOP (md+): Sticky Cinematic Viewport
      ════════════════════════════════════════════ */}
      <div className="hidden md:block relative h-[380vh]">
        <div className="sticky top-0 h-screen w-full flex items-center justify-center overflow-hidden px-6 lg:px-12 xl:px-16 pt-16">

          {/* Ambient glow blobs — alive background */}
          <div
            aria-hidden
            className="pointer-events-none absolute top-0 right-0 w-[520px] h-[520px] rounded-full blur-[100px] transition-all duration-700"
            style={{ background: currentPillar.accentGlow, opacity: 0.55 }}
          />
          <div
            aria-hidden
            className="pointer-events-none absolute bottom-0 left-0 w-[360px] h-[360px] rounded-full blur-[80px] transition-all duration-700"
            style={{ background: currentPillar.accentGlow, opacity: 0.35 }}
          />

          <div className="max-w-7xl w-full mx-auto relative z-10">
            <div className="grid grid-cols-12 gap-8 lg:gap-12 xl:gap-16 items-center">

              {/* ── LEFT COLUMN ── */}
              <div className="col-span-5 flex flex-col justify-center">
                {/* Eyebrow */}
                <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white border border-slate-200/90 text-[#0F766E] text-[11px] font-semibold uppercase tracking-wider mb-4 font-sora shadow-sm w-fit">
                  <Sparkles className="w-3.5 h-3.5" style={{ color: '#00A884' }} />
                  <span>The 8LIV Clinical Advantage</span>
                </div>

                {/* Section Headline — the "system not symptom" hook */}
                <h2 className="font-sora text-2xl lg:text-[1.85rem] xl:text-4xl font-bold text-slate-900 leading-tight mb-2 tracking-tight">
                  Most programs treat{' '}
                  <em className="not-italic" style={{ color: currentPillar.accent }}>symptoms.</em>
                  <br />We treat the{' '}
                  <em className="not-italic" style={{ color: currentPillar.accent }}>system.</em>
                </h2>

                <p className="text-xs lg:text-sm text-slate-500 font-light leading-relaxed mb-6 max-w-sm">
                  Four evidence-based pillars that work together — not in isolation — to permanently reset your metabolic baseline.
                </p>

                {/* Pillar nav list */}
                <div className="space-y-1.5 mb-6">
                  {pillars.map((p, i) => {
                    const isActive = activeIdx === i
                    const segProgress = Math.max(0, Math.min(1, (scrollProgress - i * 0.25) / 0.25))

                    return (
                      <button
                        key={p.num}
                        type="button"
                        onClick={() => handleJumpToPillar(i)}
                        className={`relative w-full text-left flex items-center justify-between p-3 rounded-2xl transition-all duration-300 group cursor-pointer overflow-hidden ${
                          isActive
                            ? 'bg-white shadow-[0_4px_20px_rgba(0,0,0,0.07)] border border-slate-200/90'
                            : 'bg-transparent hover:bg-slate-50/80 border border-transparent'
                        }`}
                      >
                        {/* Scroll progress fill */}
                        {isActive && (
                          <div
                            className="absolute inset-y-0 left-0 rounded-2xl pointer-events-none transition-[width] duration-75 ease-linear"
                            style={{
                              width: `${segProgress * 100}%`,
                              background: `linear-gradient(90deg, ${p.accentGlow}, transparent)`,
                            }}
                          />
                        )}

                        <div className="relative z-10 flex items-center gap-3 min-w-0">
                          {/* Number */}
                          <div
                            className={`w-7 h-7 rounded-xl flex items-center justify-center font-sora text-xs font-bold transition-all duration-300 shrink-0 ${
                              isActive ? 'text-white shadow-sm scale-105' : 'text-slate-400 bg-slate-100'
                            }`}
                            style={{ background: isActive ? p.accent : undefined }}
                          >
                            {p.num}
                          </div>

                          {/* Label */}
                          <div className="flex flex-col min-w-0">
                            <span
                              className={`font-sora text-xs lg:text-sm font-semibold truncate transition-colors duration-200 ${
                                isActive ? 'text-slate-900' : 'text-slate-500 group-hover:text-slate-800'
                              }`}
                            >
                              {p.seoTitle}
                            </span>
                            <span className="text-[10px] text-slate-400 font-medium truncate">{p.tag}</span>
                          </div>
                        </div>

                        {/* Live dot */}
                        <div className="relative z-10 flex items-center gap-1 shrink-0">
                          {isActive && (
                            <span
                              className="w-1.5 h-1.5 rounded-full animate-pulse"
                              style={{ background: p.accent }}
                            />
                          )}
                        </div>
                      </button>
                    )
                  })}
                </div>

                {/* CTA — breathing glow */}
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

              {/* ── RIGHT COLUMN: Cinematic Card Deck ── */}
              <div className="col-span-7 relative h-[520px] lg:h-[540px] w-full">
                {pillars.map((pillar, idx) => {
                  const isCurrent = activeIdx === idx
                  const isPast = idx < activeIdx

                  return (
                    <div
                      key={pillar.num}
                      className="absolute inset-0 w-full h-full rounded-3xl border border-slate-200/80 bg-white overflow-hidden shadow-[0_24px_64px_rgba(0,0,0,0.09)] flex flex-col"
                      style={{
                        opacity: isCurrent ? 1 : 0,
                        transform: isCurrent
                          ? 'translateY(0px) scale(1) rotateX(0deg)'
                          : isPast
                          ? 'translateY(-20px) scale(0.975) rotateX(2deg)'
                          : 'translateY(32px) scale(0.975) rotateX(-2deg)',
                        transition: 'opacity 0.55s cubic-bezier(0.16,1,0.3,1), transform 0.55s cubic-bezier(0.16,1,0.3,1)',
                        pointerEvents: isCurrent ? 'auto' : 'none',
                        zIndex: isCurrent ? 10 : 1,
                        perspective: '1000px',
                      }}
                    >
                      {/* ── Image with parallax slide ── */}
                      <div className="relative w-full h-52 lg:h-56 shrink-0 overflow-hidden bg-slate-100">
                        {isCurrent && (
                          <img
                            key={`${idx}-${imageKey}`}
                            src={pillar.image}
                            alt={pillar.seoTitle}
                            className="w-full h-full object-cover object-center pillar-image-enter"
                            style={{ '--slide-dir': `${direction * 40}px` } as React.CSSProperties}
                          />
                        )}

                        {/* Bottom gradient bleed */}
                        <div className="absolute inset-0 bg-gradient-to-t from-white via-white/15 to-black/10 pointer-events-none" />

                        {/* Pillar badge */}
                        <div className="absolute top-4 left-4 flex items-center gap-2">
                          <span
                            className="font-sora font-bold text-[11px] px-3 py-1 rounded-full text-white shadow-md backdrop-blur-sm"
                            style={{ background: pillar.accent }}
                          >
                            Pillar {pillar.num}
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
                          {/* Hook line — the emotional anchor */}
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
        </div>
      </div>

      {/* ════════════════════════════════════════════
          MOBILE (<md): Swipeable Story Cards
      ════════════════════════════════════════════ */}
      <div className="block md:hidden py-12 px-4 sm:px-6">
        <div className="max-w-lg mx-auto">

          {/* Header */}
          <div className="text-center mb-6">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white border border-slate-200/90 text-[#0F766E] text-[11px] font-semibold uppercase tracking-wider mb-3 font-sora shadow-sm">
              <Sparkles className="w-3 h-3 text-[#00A884]" />
              <span>The 8LIV Clinical Advantage</span>
            </div>
            <h2 className="font-sora text-2xl sm:text-3xl font-bold text-slate-900 leading-tight mb-2 tracking-tight">
              Most programs treat{' '}
              <em className="not-italic" style={{ color: currentPillar.accent }}>symptoms.</em>
              <br />We treat the{' '}
              <em className="not-italic" style={{ color: currentPillar.accent }}>system.</em>
            </h2>
            <p className="text-xs text-slate-500 font-light leading-relaxed">
              Swipe through the 4 pillars that work together.
            </p>
          </div>

          {/* Step dots */}
          <div className="flex items-center justify-center gap-2 mb-5">
            {pillars.map((p, idx) => (
              <button
                key={p.num}
                type="button"
                onClick={() => handleMobileTab(idx)}
                className="transition-all duration-300 rounded-full cursor-pointer"
                style={{
                  width: activeIdx === idx ? '32px' : '8px',
                  height: '8px',
                  background: activeIdx === idx ? p.accent : '#CBD5E1',
                }}
                aria-label={`Pillar ${p.num}`}
              />
            ))}
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
                key={`mobile-${activeIdx}-${imageKey}`}
                src={currentPillar.image}
                alt={currentPillar.seoTitle}
                className="w-full h-full object-cover object-center pillar-image-enter"
                style={{ '--slide-dir': '30px' } as React.CSSProperties}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-white via-white/10 to-transparent pointer-events-none" />

              <div className="absolute top-3 left-3">
                <span
                  className="font-sora font-bold text-[11px] px-2.5 py-0.5 rounded-full text-white shadow-sm"
                  style={{ background: currentPillar.accent }}
                >
                  Pillar {currentPillar.num}
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
                  onClick={() => activeIdx > 0 && handleMobileTab(activeIdx - 1)}
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
                  onClick={() => activeIdx < 3 && handleMobileTab(activeIdx + 1)}
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
            ← Swipe to explore all 4 pillars →
          </p>
        </div>
      </div>
    </div>
  )
}
