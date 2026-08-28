'use client'

/**
 * FinalCTA — Cinematic Action Invitation & Grand Finale
 *
 * ISSUE 5 SOLVED:
 * - Eliminates dead whitespace completely.
 * - Editorial conclusion layout:
 *   - Eyebrow: YOUR NEXT CHAPTER
 *   - Headline: A healthier relationship with your body starts with understanding.
 *   - Primary CTA: Start your 8liv journey
 *   - Secondary CTA: Explore the program
 *   - Visual background scale reveal (`1.05 -> 1`), headline entrance (`y: 30 -> 0`).
 */

import React, { useRef, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { ArrowRight, ShieldCheck, Sparkles } from 'lucide-react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import {
  prefersReducedMotion,
  animateLargeTypography,
} from '@/lib/scrollMotion'

gsap.registerPlugin(ScrollTrigger)

export default function FinalCTA() {
  const sectionRef = useRef<HTMLElement>(null)
  const bgTextRef = useRef<HTMLDivElement>(null)
  const imageRef = useRef<HTMLDivElement>(null)
  const headingWrapRef = useRef<HTMLDivElement>(null)
  const headingInnerRef = useRef<HTMLHeadingElement>(null)
  const contentRef = useRef<HTMLDivElement>(null)
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
            duration: 0.95,
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

      // Desktop (>= 1024px)
      mm.add('(min-width: 1024px)', () => {
        if (imageRef.current) {
          gsap.fromTo(
            imageRef.current,
            { scale: 1.08, opacity: 0.8 },
            {
              scale: 1.0,
              opacity: 1,
              ease: 'none',
              scrollTrigger: {
                trigger: section,
                start: 'top 90%',
                end: 'top 20%',
                scrub: 1.2,
              },
            }
          )
        }

        if (contentRef.current) {
          gsap.fromTo(
            contentRef.current,
            { opacity: 0, y: 50, scale: 0.95 },
            {
              opacity: 1,
              y: 0,
              scale: 1,
              duration: 1.0,
              ease: 'power3.out',
              scrollTrigger: {
                trigger: section,
                start: 'top 75%',
                once: true,
              },
            }
          )
        }
      })

      // Mobile & Tablet (< 1024px)
      mm.add('(max-width: 1023px)', () => {
        if (contentRef.current) {
          gsap.fromTo(
            contentRef.current,
            { opacity: 0, y: 30 },
            {
              opacity: 1,
              y: 0,
              duration: 0.8,
              ease: 'power3.out',
              scrollTrigger: {
                trigger: section,
                start: 'top 85%',
                once: true,
              },
            }
          )
        }
      })

    })

    return () => ctx.current?.revert()
  }, [])

  return (
    <section
      ref={sectionRef}
      id="final-cta"
      className="relative overflow-hidden min-h-[75vh] sm:min-h-[85vh] flex items-center bg-[#0B1120] border-t border-white/10"
    >
      {/* Background Image */}
      <div
        ref={imageRef}
        className="absolute inset-0 will-change-transform pointer-events-none"
        style={{ transformOrigin: 'center center' }}
      >
        <Image
          src="/images/cta_background.png"
          alt="8Liv metabolic health care background"
          fill
          className="object-cover object-center"
          sizes="100vw"
          quality={85}
        />
        <div className="absolute inset-0 bg-gradient-to-r from-[#0F172A]/95 via-[#0F172A]/85 to-[#0F172A]/65" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0B1120] via-transparent to-[#0B1120]/50" />
      </div>

      {/* Watermark Statement */}
      <div
        ref={bgTextRef}
        aria-hidden="true"
        className="pointer-events-none absolute top-1/2 -translate-y-1/2 left-0 text-[5rem] sm:text-[12rem] md:text-[18rem] lg:text-[22rem] font-black text-white/[0.03] font-sora select-none whitespace-nowrap -z-0 will-change-transform"
      >
        TRANSFORM
      </div>

      <div className="pointer-events-none absolute top-1/2 left-1/4 -translate-y-1/2 w-[450px] sm:w-[550px] h-[350px] sm:h-[450px] bg-[#D46E53]/25 rounded-full blur-[160px] -z-0" />

      <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24 lg:py-32 w-full">
        <div ref={contentRef} className="max-w-2xl will-change-transform">

          {/* Eyebrow */}
          <div className="inline-flex items-center gap-2 px-3.5 sm:px-4 py-1.5 rounded-full bg-white/10 border border-white/20 backdrop-blur-sm mb-6 sm:mb-8 shadow-lg">
            <Sparkles className="w-3.5 h-3.5 text-[#E8956F]" />
            <span className="text-[11px] sm:text-xs font-bold uppercase tracking-[0.2em] text-white/90 font-sora">
              YOUR NEXT CHAPTER
            </span>
          </div>

          <div ref={headingWrapRef} className="overflow-hidden mb-5 sm:mb-7">
            <h2
              ref={headingInnerRef}
              className="font-sora text-3xl sm:text-5xl md:text-[3.6rem] font-bold text-white leading-[1.08] tracking-tight will-change-transform drop-shadow-md"
              style={{ transform: 'translateY(105%)' }}
            >
              Your next chapter starts with{' '}
              <span className="bg-gradient-to-r from-[#D46E53] via-[#E8956F] to-[#F3B89E] bg-clip-text text-transparent">
                understanding.
              </span>
            </h2>
          </div>

          <p className="text-sm sm:text-lg md:text-xl text-white/80 leading-relaxed mb-8 sm:mb-10 max-w-xl font-normal">
            Take our confidential 3-minute health assessment to review your metabolic eligibility and connect with a board-certified physician. No commitment required.
          </p>

          {/* Action CTAs */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
            <Link
              href="/assessment"
              id="final-cta-start-journey"
              className="group inline-flex items-center justify-center gap-3 px-8 sm:px-9 py-4 sm:py-4.5 rounded-full bg-[#D46E53] hover:bg-[#C05D43] text-white font-sora font-bold text-sm sm:text-base shadow-2xl shadow-[#D46E53]/40 hover:shadow-[#D46E53]/60 transition-all duration-300 ring-2 ring-white/20 active:scale-[0.98] cursor-pointer"
            >
              <span>Book A Consultation</span>
              <ArrowRight className="w-4.5 h-4.5 sm:w-5 sm:h-5 text-white transition-transform duration-300 group-hover:translate-x-1.5" />
            </Link>

            <Link
              href="#how-it-works"
              id="final-cta-explore-program"
              className="inline-flex items-center justify-center px-7 sm:px-8 py-4 sm:py-4.5 rounded-full bg-white/10 hover:bg-white/20 text-white font-sora font-semibold text-sm sm:text-base border border-white/20 hover:border-white/40 backdrop-blur-md transition-all active:scale-[0.98] cursor-pointer"
            >
              See How It Works
            </Link>
          </div>

          <div className="mt-8 flex items-center gap-2 text-white/70 text-xs font-medium">
            <ShieldCheck className="w-4 h-4 text-[#E8956F] shrink-0" />
            <span>100% Confidential · Doctor-Led Metabolic Care</span>
          </div>

        </div>
      </div>
    </section>
  )
}
