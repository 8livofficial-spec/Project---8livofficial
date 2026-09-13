'use client'

import { useEffect } from 'react'
import Navbar from '@/components/landing/Navbar'
import Footer from '@/components/landing/Footer'
import Hero from '@/components/home/Hero'
import TrustStrip from '@/components/home/TrustStrip'
import Recognition from '@/components/home/Recognition'
import HowItWorks from '@/components/home/HowItWorks'
import PillarsOfCare from '@/components/home/PillarsOfCare'
import Dashboard from '@/components/home/Dashboard'
import PricingShaderCards from '@/components/home/PricingShaderCards'
import FAQ from '@/components/home/FAQ'
import CurvyJourneyLine from '@/components/home/CurvyJourneyLine'

export default function HomePageClient() {
  // Handle smooth anchor hash scrolling for navigation links
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
    <main className="min-h-screen text-[#0F172A] font-sans selection:bg-[#00A884]/20 selection:text-[#0F766E] bg-[#FDFBF7] relative">
      {/* 00. SEAMLESS AMBIENT CURVY JOURNEY RIBBON (FLOWS NATURALLY IN BACKGROUND) */}
      <CurvyJourneyLine />

      {/* 01. NAVIGATION HEADER */}
      <Navbar />

      {/* 02. HERO SECTION */}
      <Hero />

      {/* 03. CLINICAL TRUST STRIP */}
      <TrustStrip />

      {/* 04. THE METABOLIC REALITY (BRAND STATEMENT) */}
      <Recognition />

      {/* 05. HOW IT WORKS (4 TRANSPARENT STEPS) */}
      <HowItWorks />

      {/* 06. THE 4 PILLARS OF 8LIV CLINICAL CARE */}
      <PillarsOfCare />

      {/* 07. REAL CLINICAL RESULTS & COMPARISON */}
      <Dashboard />

      {/* 08. TRANSPARENT TREATMENT PLANS & PRICING */}
      <PricingShaderCards />

      {/* 09. FREQUENTLY ASKED QUESTIONS */}
      <FAQ />

      {/* 10. FOOTER */}
      <Footer />
    </main>
  )
}
