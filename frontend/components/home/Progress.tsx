'use client'

/**
 * Progress (Realistic Outcomes) — Outcomes transformations grid
 * Rebuilt as a clean, visual-first 3-column card grid in normal document flow.
 * Removes sticky visual split screens and absolute timelines.
 */

import React, { useRef, useEffect, useState } from 'react'
import Image from 'next/image'
import { Sparkles, Activity, Play } from 'lucide-react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { prefersReducedMotion, animateLargeTypography } from '@/lib/scrollMotion'

gsap.registerPlugin(ScrollTrigger)

const outcomeStories = [
  {
    type: 'video' as const,
    videoSrc: '/videos/Hero.mp4',
    imageFallback: '/images/outcome_1.png',
    tag: 'Outcome Journey 01',
    patient: 'Rahul M. — Bangalore',
    age: '34 yrs',
    duration: '12 Weeks',
    protocol: '12-Week Doctor-Led Care Protocol',
    headline: 'Gradual, Clinically Monitored Metabolic Fat Loss',
    quote: `"For the first time, weight loss didn't feel like starvation. My doctor tracked my blood panels monthly while the dietitian built meals around home-cooked South Indian food."`,
    doctorNote: 'Clinically verified: 11.4 kg reduction with zero loss in lean muscle mass.',
    metrics: [
      { label: 'Weight Reduction', value: '-11.4 kg', highlight: true },
      { label: 'Muscle Mass', value: '100% Preserved', highlight: false },
      { label: 'HbA1c Level', value: '5.4% (Normal)', highlight: false },
    ],
  },
  {
    type: 'image' as const,
    videoSrc: '/videos/Hero.mp4',
    imageFallback: '/images/outcome_2.png',
    tag: 'Outcome Journey 02',
    patient: 'Ananya S. — Mumbai',
    age: '29 yrs',
    duration: '16 Weeks',
    protocol: '16-Week Comprehensive Lifestyle Protocol',
    headline: 'Restored Energy & Metabolic Set-Point Shift',
    quote: `"Continuous doctor check-ins made all the difference. No more 3 PM energy crashes, and my metabolic markers have significantly improved without extreme restrictions."`,
    doctorNote: 'Sustained energy restoration; fasting insulin levels normalized.',
    metrics: [
      { label: 'Waist Circumference', value: '-4.2 inches', highlight: true },
      { label: 'Daily Energy', value: 'Significantly High', highlight: false },
      { label: 'Diet Adherence', value: '96% Consistent', highlight: false },
    ],
  },
  {
    type: 'image' as const,
    videoSrc: '/videos/transformation_1.png',
    imageFallback: '/images/transformation_1.png',
    tag: 'Outcome Journey 03',
    patient: 'Vikram K. — Gurgaon',
    age: '41 yrs',
    duration: '20 Weeks',
    protocol: '20-Week Metabolic Reset Pathway',
    headline: 'Cardiovascular Marker & Weight Normalization',
    quote: `"Working directly with an endocrinologist and a clinical nutritionist gave me complete peace of mind. The GLP-1 titrations were managed with extreme care."`,
    doctorNote: 'Triglycerides down 32%; visceral fat index reduced by 3 points.',
    metrics: [
      { label: 'Total Weight Loss', value: '-14.8 kg', highlight: true },
      { label: 'Visceral Fat', value: 'Level 4 (Healthy)', highlight: false },
      { label: 'Blood Pressure', value: '118/78 mmHg', highlight: false },
    ],
  },
]

export default function Progress() {
  const sectionRef = useRef<HTMLElement>(null)
  const bgTextRef = useRef<HTMLDivElement>(null)
  const headingWrapRef = useRef<HTMLDivElement>(null)
  const headingInnerRef = useRef<HTMLHeadingElement>(null)
  const cardRefs = useRef<(HTMLDivElement | null)[]>([])
  const videoRef = useRef<HTMLVideoElement>(null)
  const ctx = useRef<gsap.Context | null>(null)

  const [videoLoaded, setVideoLoaded] = useState(false)

  // Lazy video loading
  useEffect(() => {
    const video = videoRef.current
    if (!video) return
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          video.play().then(() => setVideoLoaded(true)).catch(() => {})
        } else {
          video.pause()
        }
      },
      { threshold: 0.2 }
    )
    observer.observe(video)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    const section = sectionRef.current
    const cards = cardRefs.current.filter(Boolean) as HTMLDivElement[]
    if (!section || cards.length === 0) return

    ctx.current = gsap.context(() => {
      if (prefersReducedMotion()) return

      if (bgTextRef.current) {
        animateLargeTypography(bgTextRef.current, section, {
          xStart: '10%',
          xEnd: '-25%',
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

      cards.forEach((card, i) => {
        gsap.fromTo(
          card,
          { opacity: 0, y: 30, scale: 0.97 },
          {
            opacity: 1,
            y: 0,
            scale: 1,
            duration: 0.85,
            delay: i * 0.12,
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
      id="realistic-outcomes"
      className="relative bg-[#F9F6F0] border-b border-[#D46E53]/15 py-20 sm:py-28 overflow-hidden"
    >
      {/* Watermark */}
      <div
        ref={bgTextRef}
        aria-hidden="true"
        className="pointer-events-none absolute top-12 left-0 text-[5rem] sm:text-[10rem] md:text-[14rem] lg:text-[18rem] font-black text-[#D46E53]/[0.035] font-sora select-none whitespace-nowrap -z-0 will-change-transform"
      >
        PROGRESSION
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">

        {/* Section Header */}
        <div className="max-w-3xl mb-12 sm:mb-16">
          <div className="text-[11px] font-bold uppercase tracking-[0.25em] text-[#A84A33] font-sora mb-3 select-none">
            08 / REALISTIC OUTCOMES
          </div>
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white border border-[#D46E53]/20 mb-4 sm:mb-5 shadow-xs">
            <Sparkles className="w-3.5 h-3.5 text-[#D46E53]" />
            <span className="text-xs font-semibold uppercase tracking-[0.16em] text-[#A84A33] font-sora">
              Patient Transformations
            </span>
          </div>

          <div ref={headingWrapRef} className="overflow-hidden">
            <h2
              ref={headingInnerRef}
              className="font-sora text-3xl sm:text-4xl md:text-5xl font-bold text-[#0F172A] leading-tight will-change-transform"
              style={{ transform: 'translateY(105%)' }}
            >
              Your progress is <span className="teal-gradient-text">personal.</span>
            </h2>
          </div>
          <p className="text-sm sm:text-base md:text-lg text-[#5D7068] leading-relaxed mt-3 max-w-xl font-light">
            Different bodies need different paths. What matters is having the right clinical team beside you at every step.
          </p>
        </div>

        {/* 3-Column Outcomes Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-stretch">
          {outcomeStories.map((story, idx) => (
            <div
              key={idx}
              ref={(el) => { cardRefs.current[idx] = el }}
              className="group relative rounded-[2.5rem] bg-white border border-[#D46E53]/15 hover:border-[#D46E53]/35 transition-all duration-300 shadow-md hover:shadow-xl flex flex-col justify-between overflow-hidden will-change-transform"
            >
              <div>
                {/* Visual Header Block */}
                <div className="relative aspect-[4/3] w-full overflow-hidden bg-[#0F172A] shrink-0">
                  {story.type === 'video' ? (
                    <>
                      <Image
                        src={story.imageFallback}
                        alt={story.patient}
                        fill
                        className={`object-cover transition-opacity duration-700 ${videoLoaded ? 'opacity-0' : 'opacity-100'}`}
                        sizes="400px"
                      />
                      <video
                        ref={videoRef}
                        src={story.videoSrc}
                        muted
                        loop
                        playsInline
                        preload="none"
                        className={`w-full h-full object-cover brightness-105 transition-opacity duration-700 ${videoLoaded ? 'opacity-100' : 'opacity-0'}`}
                      />
                    </>
                  ) : (
                    <Image
                      src={story.imageFallback}
                      alt={story.patient}
                      fill
                      className="object-cover"
                      sizes="400px"
                      quality={85}
                    />
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-[#0F172A]/75 via-transparent to-transparent pointer-events-none" />
                  <div className="absolute top-4 left-4 px-3 py-1 rounded-full bg-white/95 text-[#A84A33] text-[9px] font-bold font-sora shadow-sm flex items-center gap-1.5">
                    {story.type === 'video' && <Play className="w-2.5 h-2.5 fill-[#A84A33]" />}
                    <span>{story.tag}</span>
                  </div>
                  <div className="absolute bottom-4 left-4 right-4 text-white z-10">
                    <p className="text-[9px] uppercase font-bold tracking-wider text-[#F3B89E] font-sora">
                      {story.protocol}
                    </p>
                    <p className="font-sora font-bold text-sm">{story.patient} • {story.age}</p>
                  </div>
                </div>

                {/* Content details */}
                <div className="p-6">
                  <h3 className="font-sora text-base sm:text-lg font-bold text-[#0F172A] mb-2 leading-snug">
                    {story.headline}
                  </h3>
                  <p className="text-xs sm:text-sm text-[#475569] leading-relaxed italic mb-4 font-normal">
                    {story.quote}
                  </p>

                  <div className="p-3.5 rounded-xl bg-[#F9F6F0] border border-[#D46E53]/15 flex items-start gap-2.5">
                    <Activity className="w-4 h-4 text-[#D46E53] shrink-0 mt-0.5" />
                    <p className="text-[11px] text-[#0F172A] font-medium leading-snug">
                      <strong className="font-bold text-[#A84A33]">Clinical Note: </strong>
                      {story.doctorNote}
                    </p>
                  </div>
                </div>
              </div>

              {/* Bottom Metrics Grid */}
              <div className="mx-6 mb-6 pt-4 border-t border-[#D46E53]/10 grid grid-cols-3 gap-2">
                {story.metrics.map((m, mIdx) => (
                  <div
                    key={mIdx}
                    className={`p-2 rounded-xl text-center border ${
                      m.highlight ? 'bg-[#D46E53]/10 border-[#D46E53]/25' : 'bg-[#F9F6F0]/80 border-transparent'
                    }`}
                  >
                    <p className="text-[8px] font-semibold text-[#64748B] uppercase tracking-wider mb-0.5">
                      {m.label}
                    </p>
                    <p className={`font-sora font-extrabold text-[11px] sm:text-xs ${m.highlight ? 'text-[#A84A33]' : 'text-[#0F172A]'}`}>
                      {m.value}
                    </p>
                  </div>
                ))}
              </div>

            </div>
          ))}
        </div>

      </div>
    </section>
  )
}
