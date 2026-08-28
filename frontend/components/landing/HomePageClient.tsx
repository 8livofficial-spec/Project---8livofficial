'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'
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
  const router = useRouter()
  
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

  // Auth session check & role-based dashboard redirection
  useEffect(() => {
    const checkRedirect = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession()
        if (error) {
          console.error('Auth check error:', error)
        }

        if (session?.user) {
          let role = 'patient'
          const match = document.cookie.match(/user_role=([^;]+)/)
          if (match) {
            role = match[1]
          } else {
            if (session.user.email === '8livofficial@gmail.com') {
              role = 'admin'
            } else {
              const { data: docProfile } = await supabase
                .from('doctor_profiles')
                .select('id')
                .eq('id', session.user.id)
                .maybeSingle()

              if (docProfile) {
                role = 'doctor'
              } else {
                const { data: profile } = await supabase
                  .from('profiles')
                  .select('role')
                  .eq('id', session.user.id)
                  .maybeSingle()
                role = profile?.role || session.user.user_metadata?.role || 'patient'
              }
            }
            document.cookie = `user_role=${role}; path=/; max-age=86400; SameSite=Lax`
          }

          if (role === 'admin') {
            router.replace('/admin')
          } else if (role === 'doctor') {
            router.replace('/doctor/dashboard')
          } else if (
            role === 'dietitian' ||
            role === 'trainer' ||
            role === 'fitness_coach' ||
            role === 'nutritionist'
          ) {
            router.replace('/provider/dashboard')
          } else {
            router.replace('/patient')
          }
        }
      } catch (err) {
        console.error('Auth session check threw an exception:', err)
      }
    }
    checkRedirect()
  }, [router])

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
      
      {/* 12. PRICING SHADER CARDS (SILVER & GOLD) */}
      <PricingShaderCards />

      {/* FOOTER */}
      <Footer />

    </main>
  )
}
