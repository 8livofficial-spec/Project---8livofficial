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

      // Mobile responsive GSAP animations
      const mm = gsap.matchMedia()

      mm.add('(min-width: 768px)', () => {
        // Sticky pinning only on tablet & desktop for buttery-smooth mobile scrolling
        ScrollTrigger.create({
          trigger: section,
          pin: true,
          start: 'top top',
          end: '+=650',
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

      mm.add('(max-width: 767px)', () => {
        // Lightweight non-blocking scroll fade for mobile screens
        if (contentRef.current) {
          gsap.to(contentRef.current, {
            opacity: 0.2,
            y: -20,
            ease: 'power1.out',
            scrollTrigger: {
              trigger: section,
              start: 'center top',
              end: 'bottom top',
              scrub: true,
            }
          })
        }
      })
    })

    // Programmatic play fallback to ensure video starts smoothly on mobile/Safari
    if (videoRef.current) {
      videoRef.current.muted = true
      const playPromise = videoRef.current.play()
      if (playPromise !== undefined) {
        playPromise.catch(() => {
          // If browser blocks autoplay, play on first user interaction
          const handleFirstTouch = () => {
            if (videoRef.current) {
              videoRef.current.play().catch(() => {})
            }
            window.removeEventListener('touchstart', handleFirstTouch)
            window.removeEventListener('click', handleFirstTouch)
          }
          window.addEventListener('touchstart', handleFirstTouch, { once: true })
          window.addEventListener('click', handleFirstTouch, { once: true })
        })
      }
    }

    return () => ctx.current?.revert()
  }, [])

  return (
    <section
      ref={sectionRef}
      className="relative w-full min-h-[100svh] flex flex-col justify-between overflow-hidden bg-[#0B1120]"
    >
      {/* FULL-SCREEN BRIGHT HERO BACKGROUND VIDEO */}
      <div
        ref={videoContainerRef}
        className="absolute inset-0 w-full h-full will-change-transform pointer-events-none"
        style={{ transformOrigin: 'center center' }}
      >
        <video
          ref={videoRef}
          src="https://res.cloudinary.com/junufjm3/video/upload/q_auto,f_auto,vc_auto,w_1280/v1787941971/Hero.mp4"
          autoPlay
          muted
          loop
          playsInline
          preload="metadata"
          poster="/images/hero_indian.png"
          className="w-full h-full object-cover object-[62%_center] sm:object-[70%_center] md:object-[75%_center] scale-100 md:scale-105 brightness-110 md:brightness-125 contrast-[1.04] saturate-[1.05]"
        />
        
        {/* Soft responsive gradient overlay */}
        <div ref={overlayRef} className="absolute inset-0 bg-gradient-to-t from-[#0B1120]/95 via-[#0B1120]/60 to-[#0B1120]/30 md:bg-gradient-to-r md:from-[#0F172A]/85 md:via-[#0F172A]/40 md:to-transparent pointer-events-none z-10 transition-opacity" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0B1120]/80 via-transparent to-transparent pointer-events-none z-10" />
        <div className="absolute top-0 left-0 w-[320px] sm:w-[500px] md:w-[600px] h-[320px] sm:h-[500px] md:h-[600px] bg-[#00A884]/15 rounded-full blur-[100px] sm:blur-[140px] pointer-events-none" />
      </div>

      {/* TOP HEADER SPACER */}
      <div className="pt-24 sm:pt-32" />

      {/* HERO MAIN CONTENT — fades out on scroll to reveal 100% video */}
      <div ref={contentRef} className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full relative z-20 mt-auto mb-8 sm:mb-10 md:mb-12">
        <div className="max-w-lg text-left">




          {/* Eyebrow badge */}
          <div
            ref={eyebrowRef}
            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#00A884]/20 border border-[#00A884]/40 shadow-lg mb-3 sm:mb-4 backdrop-blur-md opacity-0"
          >
            <span className="flex h-1.5 w-1.5 rounded-full bg-[#2DD4BF] animate-pulse" />
            <span className="text-[9px] sm:text-[10px] font-semibold uppercase tracking-[0.16em] text-[#5EEAD4] font-sora">
              Doctor-Led &amp; Trainer-Coached Metabolic Care
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
                <span className="bg-gradient-to-r from-[#00A884] via-[#0D9488] to-[#2DD4BF] bg-clip-text text-transparent">
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
            Personalized metabolic healthcare — online physician consultations, clinical nutrition mapping, and 1-on-1 certified fitness coaching. Built for real lives.
          </p>

          {/* ACTION BUTTONS */}
          <div
            ref={ctaRef}
            className="w-full flex flex-col sm:flex-row items-center sm:items-start justify-center sm:justify-start gap-3 sm:gap-4 opacity-0 will-change-transform"
          >
            <Link href="/assessment" id="hero-start-assessment-cta" className="inline-flex justify-center cursor-pointer">
              <CornerButton accentColor="#00A884" onClick={() => { window.location.href = '/assessment' }}>
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
        <ChevronDown className="w-4 h-4 text-[#2DD4BF] animate-bounce" />
      </div>
    </section>
  )
}
