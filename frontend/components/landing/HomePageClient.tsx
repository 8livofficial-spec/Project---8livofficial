'use client'

import { useEffect } from 'react'
import { useLenis } from '@/hooks/useLenis'

import Navbar from '@/components/landing/Navbar'
import Footer from '@/components/landing/Footer'

import Hero from '@/components/home/Hero'
import TrustStrip from '@/components/home/TrustStrip'
import Recognition from '@/components/home/Recognition'
import HowItWorks from '@/components/home/HowItWorks'
import Nutrition from '@/components/home/Nutrition'
import Dashboard from '@/components/home/Dashboard'
import GLP1Care from '@/components/home/GLP1Care'
import PersonalizedJourney from '@/components/home/PersonalizedJourney'
import ScrollMaskSection from '@/components/home/ScrollMaskSection'
import Trust from '@/components/home/Trust'



import FAQ from '@/components/home/FAQ'
import FinalCTA from '@/components/home/FinalCTA'
import PricingShaderCards from '@/components/home/PricingShaderCards'


export default function HomePageClient() {
  // Initialize Lenis smooth scroll linked to GSAP ScrollTrigger
  useLenis()

  // Handle hash scrolling if navigating with anchor
  useEffect(() => {
    if (!window.location.hash) return

    const sectionId = window.location.hash.slice(1)
    const timer = window.setTimeout(() => {
      document.getElementById(sectionId)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      window.history.replaceState(null, '', window.location.pathname + window.location.search)
    }, 100)

    return () => clearTimeout(timer)
  }, [])



  return (
    <main className="min-h-screen text-[#0F172A] font-sans selection:bg-[#0D9488]/30 selection:text-[#0F766E] bg-white">

      <Navbar />
      
      {/* 01. HERO */}
      <Hero />

      {/* TRUST STRIP */}
      <TrustStrip />
      
      {/* 02. BRAND STATEMENT */}
      <Recognition />
      
      {/* 03. THE 8LIV JOURNEY */}
      <HowItWorks />
      
      {/* 05. GUIDANCE THAT FITS YOUR LIFE */}
      <Nutrition />
      
      {/* METABOLIC DIGITAL PORTAL VISUALIZATION */}
      <Dashboard />
      
      {/* 06. MEDICAL SUPPORT / GLP-1 */}
      <GLP1Care />

      {/* 07. NUTRITION & LIFESTYLE */}
      <PersonalizedJourney />

      {/* 08. CLINICAL SCIENCE SCROLL MASK */}
      <ScrollMaskSection />

      {/* 09. WHY 8LIV */}



      <Trust />

      {/* 10. FAQ */}
      <FAQ />

      {/* 11. FINAL CTA */}
      <FinalCTA />
      
      {/* 12. DURATION-BASED CARE PROTOCOLS & TREATMENT PLANS */}
      <PricingShaderCards />

      {/* FOOTER */}
      <Footer />

    </main>
  )
}
