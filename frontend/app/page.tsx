'use client'

import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'
import Navbar from '@/components/landing/Navbar'
import Hero from '@/components/landing/Hero'
import HowItWorks from '@/components/landing/HowItWorks'
import WhatIsIncluded from '@/components/landing/WhatIsIncluded'
import RealResults from '@/components/landing/RealResults'
import MealNutrition from '@/components/landing/MealNutrition'
import PortalTeaser from '@/components/landing/PortalTeaser'
import CTABanner from '@/components/landing/CTABanner'
import Footer from '@/components/landing/Footer'

export default function Home() {
  const router = useRouter()
  const [checkingAuth, setCheckingAuth] = useState(true)

  useEffect(() => {
    const checkRedirect = async () => {
      const { data: { session } } = await supabase.auth.getSession()
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
              .select('doctor_id')
              .eq('doctor_id', session.user.id)
              .single()

            if (docProfile) {
              role = 'doctor'
            } else {
              const { data: profile } = await supabase
                .from('profiles')
                .select('role')
                .eq('id', session.user.id)
                .single()
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
        } else {
          router.replace('/dashboard')
        }
      } else {
        setCheckingAuth(false)
      }
    }
    checkRedirect()
  }, [])

  if (checkingAuth) {
    return (
      <div className="min-h-screen bg-[#0A0A0F] flex items-center justify-center text-[#2DD4BF]">
        <div className="w-12 h-12 border-4 border-current border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  const Divider = () => (
    <div className="h-px w-full bg-gradient-to-r from-transparent via-[#D46E53]/30 to-transparent" />
  )

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
      <CTABanner />
      <Footer />
    </main>
  )
}
