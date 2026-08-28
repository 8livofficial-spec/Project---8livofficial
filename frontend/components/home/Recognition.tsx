'use client'

/**
 * Brand Statement — Your body isn't a template.
 * Restructured to show a single high-impact clinical statement with a large visual background.
 */

import React, { useRef, useEffect } from 'react'
import Image from 'next/image'
import { Stethoscope } from 'lucide-react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import {
  prefersReducedMotion,
  animateLargeTypography,
  animateImageDepthWindow,
} from '@/lib/scrollMotion'
import ChromaCard from '@/components/ui/chroma-card'

gsap.registerPlugin(ScrollTrigger)

export default function Recognition() {
  const sectionRef = useRef<HTMLElement>(null)
  const bgTextRef = useRef<HTMLDivElement>(null)
  const eyebrowRef = useRef<HTMLDivElement>(null)
  const headlineLine1Ref = useRef<HTMLSpanElement>(null)
  const headlineLine2Ref = useRef<HTMLSpanElement>(null)
  const subtextRef = useRef<HTMLParagraphElement>(null)
  const imageContainerRef = useRef<HTMLDivElement>(null)
  const imageInnerRef = useRef<HTMLDivElement>(null)
  const ctx = useRef<gsap.Context | null>(null)

  useEffect(() => {
    const section = sectionRef.current
    if (!section) return

    ctx.current = gsap.context(() => {
      if (prefersReducedMotion()) return

      if (bgTextRef.current) {
        animateLargeTypography(bgTextRef.current, section, {
          xStart: '10%',
          xEnd: '-25%',
        })
      }

      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: section,
          start: 'top 80%',
          once: true,
        },
      })

      if (eyebrowRef.current) {
        tl.fromTo(eyebrowRef.current,
          { y: 20, opacity: 0 },
          { y: 0, opacity: 1, duration: 0.6, ease: 'power3.out' },
          0
        )
      }

      ;[headlineLine1Ref, headlineLine2Ref].forEach((ref, i) => {
        if (ref.current) {
          tl.fromTo(ref.current,
            { y: '108%' },
            { y: '0%', duration: 0.9, ease: 'power3.out' },
            0.1 + i * 0.1
          )
        }
      })

      if (subtextRef.current) {
        tl.fromTo(subtextRef.current,
          { y: 25, opacity: 0 },
          { y: 0, opacity: 1, duration: 0.8, ease: 'power3.out' },
          0.35
        )
      }

      if (imageContainerRef.current) {
        gsap.fromTo(
          imageContainerRef.current,
          {
            clipPath: 'inset(10% 0 10% 0 round 2.5rem)',
            filter: 'blur(4px)',
            opacity: 0.7,
            scale: 0.95,
          },
          {
            clipPath: 'inset(0% 0 0% 0 round 2.5rem)',
            filter: 'blur(0px)',
            opacity: 1,
            scale: 1,
            duration: 1.1,
            ease: 'power3.out',
            scrollTrigger: {
              trigger: imageContainerRef.current,
              start: 'top 80%',
              once: true,
            },
          }
        )
      }

      if (imageInnerRef.current) {
        animateImageDepthWindow(imageInnerRef.current, section, {
          direction: 'up',
          amount: 6,
        })
      }
    })

    return () => ctx.current?.revert()
  }, [])

  return (
    <section
      ref={sectionRef}
      id="recognition"
      className="py-20 sm:py-28 lg:py-36 relative overflow-hidden bg-[#FDFBF7]"
    >
      {/* Watermark Typography */}
      <div
        ref={bgTextRef}
        aria-hidden="true"
        className="pointer-events-none absolute -top-10 left-0 text-[5rem] sm:text-[10rem] md:text-[14rem] lg:text-[18rem] font-black text-[#D46E53]/[0.035] font-sora select-none whitespace-nowrap -z-0 will-change-transform"
      >
        METABOLIC
      </div>

      <div className="pointer-events-none absolute -left-24 top-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-[#D46E53]/7 rounded-full blur-[140px] -z-0" />
      <div className="pointer-events-none absolute right-0 bottom-0 w-[400px] h-[400px] bg-[#A84A33]/5 rounded-full blur-[140px] -z-0" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">

        {/* Brand Statement Layout */}
        <div className="grid lg:grid-cols-12 gap-8 lg:gap-16 items-center">

          {/* Left: Huge Editorial Headline & Whitespace */}
          <div className="lg:col-span-7 pr-0 lg:pr-8">
            <div className="text-[11px] font-bold uppercase tracking-[0.25em] text-[#A84A33] font-sora mb-3 select-none">
              02 / BRAND STATEMENT
            </div>

            <div
              ref={eyebrowRef}
              className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white border border-[#D46E53]/20 mb-4 sm:mb-6 shadow-xs backdrop-blur-sm opacity-0"
            >
              <span className="w-2 h-2 rounded-full bg-[#D46E53]" />
              <span className="text-xs font-semibold uppercase tracking-[0.16em] text-[#A84A33] font-sora">
                The Metabolic Reality
              </span>
            </div>

            <h2 className="font-sora text-3xl sm:text-5xl md:text-6xl font-bold text-[#0F172A] leading-[1.08] mb-6 sm:mb-8 tracking-tight">
              <span className="block overflow-hidden">
                <span ref={headlineLine1Ref} className="block will-change-transform">
                  Your body is
                </span>
              </span>
              <span className="block overflow-hidden">
                <span ref={headlineLine2Ref} className="block will-change-transform">
                  <span className="teal-gradient-text">not a template.</span>
                </span>
              </span>
            </h2>

            <p
              ref={subtextRef}
              className="text-sm sm:text-lg md:text-xl text-[#475569] leading-relaxed max-w-xl opacity-0 will-change-transform font-light"
            >
              Weight regulation is governed by complex hormonal signaling, metabolic set-points, genetics, and insulin response — not simple willpower. We diagnose the baseline first.
            </p>
          </div>

          {/* Right: Large Visual storytelling asset with ChromaCard Shimmer */}
          <div className="lg:col-span-5 flex justify-center lg:justify-end">
            <ChromaCard className="w-full max-w-md aspect-[3/4]">
              <div
                ref={imageContainerRef}
                className="relative w-full h-full rounded-[2.4rem] overflow-hidden bg-white"
              >
                <div ref={imageInnerRef} className="absolute inset-0 will-change-transform">
                  <Image
                    src="/images/hero_wellness.png"
                    alt="A patient experiencing healthy, sustainable vitality with 8Liv"
                    fill
                    className="object-cover object-center"
                    sizes="(max-width: 1024px) 92vw, 520px"
                    quality={90}
                  />
                </div>
                <div className="absolute inset-0 bg-gradient-to-t from-[#0F172A]/70 via-transparent to-transparent pointer-events-none" />
                <div className="absolute bottom-6 left-6 right-6 p-4 rounded-2xl bg-white/95 backdrop-blur-md border border-white/80 shadow-md">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-[#0D9488] font-sora">Physician Oversight</p>
                  <p className="text-xs sm:text-sm font-bold text-[#0F172A] font-sora">Endocrine &amp; Metabolic Balance</p>
                </div>
              </div>
            </ChromaCard>
          </div>


        </div>

      </div>
    </section>
  )
}
