'use client'

import { useEffect, useRef } from 'react'
import Lenis from 'lenis'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import Navbar from '@/components/landing/Navbar'
import Footer from '@/components/landing/Footer'
import Hero from '@/components/home/Hero'
import ScienceResults from '@/components/home/ScienceResults'
import PersonalizedCare from '@/components/home/PersonalizedCare'
import RealStories from '@/components/home/RealStories'
import FAQ from '@/components/home/FAQ'

gsap.registerPlugin(ScrollTrigger)

export default function HomePageClient() {
  const lenisRef = useRef<Lenis | null>(null)

  // Initialize Lenis luxury smooth scroll & GSAP sync
  useEffect(() => {
    if (typeof window === 'undefined') return

    // Respect reduced motion
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (prefersReducedMotion) return

    const lenis = new Lenis({
      duration: 1.15,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      orientation: 'vertical',
      gestureOrientation: 'vertical',
      smoothWheel: true,
      wheelMultiplier: 0.95,
      touchMultiplier: 1.5,
    })

    lenisRef.current = lenis

    // Sync Lenis with GSAP ScrollTrigger
    lenis.on('scroll', ScrollTrigger.update)

    const tickerCb = (time: number) => {
      lenis.raf(time * 1000)
    }

    gsap.ticker.add(tickerCb)
    gsap.ticker.lagSmoothing(0)

    // Handle smooth anchor hash scrolling for navigation links
    if (window.location.hash) {
      const sectionId = window.location.hash.slice(1)
      setTimeout(() => {
        const el = document.getElementById(sectionId)
        if (el) lenis.scrollTo(el, { offset: -80 })
      }, 200)
    }

    return () => {
      gsap.ticker.remove(tickerCb)
      lenis.destroy()
      lenisRef.current = null
    }
  }, [])

  return (
    <main className="min-h-screen text-[#0F172A] font-sans selection:bg-[#00A884] selection:text-white bg-[#FAFBF9] relative">
      {/* 01. NAVIGATION HEADER (FLOATING GLASS CAPSULE) */}
      <Navbar />

      {/* 02. HERO: "TRANSFORM YOUR BODY, BOOST YOUR CONFIDENCE" (3 GLASS CARDS) */}
      <Hero />

      {/* 03. SCIENCE & RESULTS + TRANSFORM YOUR LIFE PRODUCTS */}
      <ScienceResults />

      {/* 04. PERSONALIZED CARE ANYTIME YOU NEED (VIDEO CONSULT & BODY WEIGHT GRAPH) */}
      <PersonalizedCare />

      {/* 05. REAL STORIES REAL TRANSFORMATIONS & COUPLE BANNER */}
      <RealStories />

      {/* 07. FREQUENTLY ASKED QUESTIONS */}
      <FAQ />

      {/* 08. FOOTER */}
      <Footer />
    </main>
  )
}
