'use client'

import React, { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'
import Navbar from '@/components/landing/Navbar'
import Hero from '@/components/landing/Hero'
import HowItWorks from '@/components/landing/HowItWorks'
import WhatIsIncluded from '@/components/landing/WhatIsIncluded'
import RealResults from '@/components/landing/RealResults'
import MealNutrition from '@/components/landing/MealNutrition'
import PortalTeaser from '@/components/landing/PortalTeaser'
import CompanySection from '@/components/landing/CompanySection'
import CTABanner from '@/components/landing/CTABanner'
import Footer from '@/components/landing/Footer'

function Divider() {
  return <div className="h-px w-full bg-gradient-to-r from-transparent via-[#D46E53]/30 to-transparent" />
}

export default function Home() {
  const router = useRouter()

  useEffect(() => {
    if (!window.location.hash) return

    const sectionId = window.location.hash.slice(1)
    window.setTimeout(() => {
      document.getElementById(sectionId)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      window.history.replaceState(null, '', window.location.pathname + window.location.search)
    }, 0)
  }, [])

  useEffect(() => {
    const checkRedirect = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession()
        if (error) {
          console.error("Auth check error:", error)
        }
        
        if (session?.user) {
          let role = 'patient'
          const match = document.cookie.match(/user_role=([^;]+)/)
          if (match) {
            role = match[1]
          } else {
            // Fallback if role cookie is missing (fetch from db and write it)
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
            // Set role cookie
            document.cookie = `user_role=${role}; path=/; max-age=86400; SameSite=Lax`
          }

          // Redirect to their active flow
          if (role === 'admin') {
            router.replace('/admin')
          } else if (role === 'doctor') {
            router.replace('/doctor/dashboard')
          } else if (role === 'dietitian' || role === 'trainer' || role === 'fitness_coach' || role === 'nutritionist') {
            router.replace('/provider/dashboard')
          } else {
            router.replace('/patient')
          }
        }
      } catch (err) {
        console.error("Auth session check threw an exception:", err)
      }
    }
    checkRedirect()
  }, [router])

  return (
    <main className="min-h-screen overflow-x-hidden text-[#0F172A] font-sans selection:bg-[#D46E53]/30 selection:text-[#A84A33]">
      <Navbar />
      <Hero />
      <Divider />
      <HowItWorks />
      <Divider />
      <WhatIsIncluded />
      <Divider />
      <RealResults />
      <Divider />
      <MealNutrition />
      <Divider />
      <PortalTeaser />
      <Divider />
      <CompanySection />
      <Divider />
      <CTABanner />
      <Footer />
    </main>
  )
}
