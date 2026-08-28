'use client'

import React, { useRef, useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowRight, ShieldCheck, Stethoscope, Sparkles, ChevronDown, Volume2, VolumeX } from 'lucide-react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { prefersReducedMotion } from '@/lib/scrollMotion'
import CornerButton from '@/components/ui/corner-button'

gsap.registerPlugin(ScrollTrigger)


export default function Hero() {
  const sectionRef = useRef<HTMLElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const videoContainerRef = useRef<HTMLDivElement>(null)
  const eyebrowRef = useRef<HTMLDivElement>(null)
  const headlineLine1Ref = useRef<HTMLSpanElement>(null)
  const headlineLine2Ref = useRef<HTMLSpanElement>(null)
  const subtextRef = useRef<HTMLParagraphElement>(null)
  const ctaRef = useRef<HTMLDivElement>(null)
  const contentRef = useRef<HTMLDivElement>(null)
  const overlayRef = useRef<HTMLDivElement>(null)
  const scrollIndicatorRef = useRef<HTMLDivElement>(null)
  const ctx = useRef<gsap.Context | null>(null)



  const [isMuted, setIsMuted] = useState(true)

  const toggleSound = () => {
    if (videoRef.current) {
      videoRef.current.muted = !videoRef.current.muted
      setIsMuted(videoRef.current.muted)
    }
  }

  useEffect(() => {
    const section = sectionRef.current
    if (!section) return

    ctx.current = gsap.context(() => {
      if (prefersReducedMotion()) return

      // Entrance animation sequence
      const tl = gsap.timeline({ delay: 0.15 })

      if (videoContainerRef.current) {
        tl.fromTo(videoContainerRef.current,
          { scale: 1.12, opacity: 0.5 },
          { scale: 1.0, opacity: 1, duration: 1.6, ease: 'power2.out' },
          0
        )
      }

      if (eyebrowRef.current) {
        tl.fromTo(eyebrowRef.current,
          { y: 20, opacity: 0 },
          { y: 0, opacity: 1, duration: 0.65, ease: 'power3.out' },
          0.1
        )
      }

      ;[headlineLine1Ref, headlineLine2Ref].forEach((ref, i) => {
        if (ref.current) {
          tl.fromTo(ref.current,
            { y: '110%' },
            { y: '0%', duration: 0.95, ease: 'power3.out' },
            0.2 + i * 0.1
          )
        }
      })

      if (subtextRef.current) {
        tl.fromTo(subtextRef.current,
          { y: 24, opacity: 0 },
          { y: 0, opacity: 1, duration: 0.85, ease: 'power3.out' },
          0.45
        )
      }

      if (ctaRef.current) {
        tl.fromTo(ctaRef.current,
          { y: 20, opacity: 0, scale: 0.96 },
          { y: 0, opacity: 1, scale: 1, duration: 0.8, ease: 'power3.out' },
          0.6
        )
      }

      if (scrollIndicatorRef.current) {
        tl.fromTo(scrollIndicatorRef.current,
          { opacity: 0, y: 10 },
          { opacity: 1, y: 0, duration: 0.6, ease: 'power2.out' },
          0.9
        )
      }

      // STICKY SCROLL PINNING: Fades out text & overlays to reveal 100% bright video on scroll
      const pinTrigger = ScrollTrigger.create({
        trigger: section,
        pin: true,
        start: 'top top',
        end: '+=700',
        scrub: 0.6,
      })

      if (contentRef.current) {
        gsap.to(contentRef.current, {
          opacity: 0,
          y: -45,
          scale: 0.96,
          ease: 'none',
          scrollTrigger: {
            trigger: section,
            start: 'top top',
            end: '+=450',
            scrub: 0.5,
          }
        })
      }

      if (overlayRef.current) {
        gsap.to(overlayRef.current, {
          opacity: 0.15,
          ease: 'none',
          scrollTrigger: {
            trigger: section,
            start: 'top top',
            end: '+=500',
            scrub: 0.5,
          }
        })
      }

    })

    return () => ctx.current?.revert()
  }, [])

  return (
    <section
      ref={sectionRef}
      className="relative w-full min-h-[100svh] h-[100svh] flex flex-col justify-between overflow-hidden bg-[#0B1120]"
    >
      {/* FULL-SCREEN BRIGHT HERO BACKGROUND VIDEO */}
      <div
        ref={videoContainerRef}
        className="absolute inset-0 w-full h-full will-change-transform pointer-events-none"
        style={{ transformOrigin: 'center center' }}
      >
        <video
          ref={videoRef}
          src="/videos/Hero.mp4"
          autoPlay
          muted
          loop
          playsInline
          preload="auto"
          poster="/images/hero_indian.png"
          className="w-full h-full object-cover object-[80%_center] md:object-[75%_center] scale-105 brightness-125 contrast-[1.04] saturate-[1.05]"
        />
        
        {/* Soft gradient overlay that fades out on scroll to reveal video */}
        <div ref={overlayRef} className="absolute inset-0 bg-gradient-to-r from-[#0F172A]/85 via-[#0F172A]/40 to-transparent pointer-events-none z-10 transition-opacity" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0B1120]/70 via-transparent to-transparent pointer-events-none z-10" />
        <div className="absolute top-0 left-0 w-[450px] sm:w-[600px] h-[450px] sm:h-[600px] bg-[#0D9488]/10 rounded-full blur-[140px] pointer-events-none" />
      </div>

      {/* TOP HEADER SPACER */}
      <div className="pt-24 sm:pt-32" />

      {/* HERO MAIN CONTENT — fades out on scroll to reveal 100% video */}
      <div ref={contentRef} className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full relative z-20 mt-auto mb-8 sm:mb-10 md:mb-12">
        <div className="max-w-lg text-left">




          {/* Eyebrow badge */}
          <div
            ref={eyebrowRef}
            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#0D9488]/20 border border-[#0D9488]/40 shadow-lg mb-3 sm:mb-4 backdrop-blur-md opacity-0"
          >
            <span className="flex h-1.5 w-1.5 rounded-full bg-[#0D9488] animate-pulse" />
            <span className="text-[9px] sm:text-[10px] font-semibold uppercase tracking-[0.16em] text-[#5EEAD4] font-sora">
              Doctor-Led Metabolic Care
            </span>
          </div>

          {/* Headline with Responsive Clamp */}
          <h1 className="font-sora text-[1.5rem] sm:text-2xl md:text-3xl lg:text-[2.5rem] font-bold text-white leading-[1.16] tracking-tight mb-3 sm:mb-4 drop-shadow-[0_2px_10px_rgba(15,23,42,0.5)]">
            <span className="block overflow-hidden">
              <span ref={headlineLine1Ref} className="block will-change-transform">
                Weight loss,
              </span>
            </span>
            <span className="block overflow-hidden">
              <span ref={headlineLine2Ref} className="block will-change-transform">
                <span className="bg-gradient-to-r from-[#00A884] via-[#0D9488] to-[#5EEAD4] bg-clip-text text-transparent">
                  guided by people who understand your health.
                </span>
              </span>
            </span>
          </h1>

          {/* Subtext */}
          <p
            ref={subtextRef}
            className="text-[11px] sm:text-xs md:text-sm text-white/90 leading-relaxed mb-5 sm:mb-6 max-w-lg font-normal opacity-0 will-change-transform drop-shadow-[0_1px_6px_rgba(15,23,42,0.4)]"
          >
            Personalized metabolic healthcare — online physician consultations, clinical nutrition mapping, and continuous lifestyle support. Built for real lives.
          </p>

          {/* ACTION BUTTONS */}
          <div
            ref={ctaRef}
            className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4 opacity-0 will-change-transform"
          >
            <Link href="/assessment" id="hero-start-assessment-cta">
              <CornerButton accentColor="#0D9488">
                Book A Consultation
              </CornerButton>
            </Link>
          </div>

        </div>
      </div>


      {/* BOTTOM SCROLL INDICATOR */}
      <div
        ref={scrollIndicatorRef}
        className="relative z-20 mx-auto flex flex-col items-center gap-1 pb-4 sm:pb-6 opacity-0"
      >
        <span className="text-[10px] sm:text-[11px] font-semibold uppercase tracking-[0.2em] text-white/70">Scroll Down</span>
        <ChevronDown className="w-4 h-4 text-[#D46E53] animate-bounce" />
      </div>
    </section>
  )
}
