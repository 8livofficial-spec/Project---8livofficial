'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Lock } from 'lucide-react'
import { supabase, syncSupabaseAuthCookie } from '@/lib/supabaseClient'
import { getPatientJourneyTarget } from '@/lib/patientJourney'
import { logJourneyDebug } from '@/lib/logger'
import UnifiedAssessmentFunnel from '@/components/assessment/UnifiedAssessmentFunnel'

export default function AssessmentPage() {
  const router = useRouter()
  const [checkingAuth, setCheckingAuth] = useState(true)
  const [resumeNotice, setResumeNotice] = useState('')

  useEffect(() => {
    const checkRedirect = async () => {
      try {
        const explicitRetake =
          typeof window !== 'undefined' &&
          new URLSearchParams(window.location.search).get('retake') === 'true'
        const {
          data: { session },
        } = await supabase.auth.getSession()

        if (session?.user) {
          let role = ''
          try {
            const roleRes = await fetch('/api/auth/role', {
              headers: { Authorization: `Bearer ${session.access_token}` },
            })
            if (roleRes.ok) {
              const roleData = await roleRes.json()
              if (roleData?.role) role = roleData.role
            }
          } catch (e) {
            console.warn('[Assessment] Role fetch error:', e)
          }
          if (!role) role = 'patient'

          syncSupabaseAuthCookie(session)
          document.cookie = `user_role=${role}; path=/; max-age=86400; SameSite=Lax`

          if (role === 'admin') {
            router.replace('/admin')
            return
          } else if (role === 'doctor') {
            router.replace('/doctor/dashboard')
            return
          } else {
            const res = await fetch(`/api/patient/status?patientId=${session.user.id}`, {
              headers: { Authorization: `Bearer ${session.access_token}` },
            })
            if (!res.ok) {
              setCheckingAuth(false)
              return
            }
            const statusData = await res.json()
            const targetPath = getPatientJourneyTarget(statusData)
            logJourneyDebug('[assessment-gate]', {
              patientId: session.user.id,
              assessmentFound: Boolean(statusData.assessment),
              assessmentStatus: statusData.assessmentStatus,
              eligibilityStatus: statusData.eligibilityStatus,
              currentJourneyStep: statusData.currentJourneyStep,
              redirectTarget: targetPath,
              reason:
                targetPath === '/assessment'
                  ? 'assessment required or explicit retake'
                  : 'assessment already completed',
            })
            if (targetPath !== '/assessment' && !explicitRetake) {
              router.replace(targetPath)
              return
            }
            if (explicitRetake && targetPath !== '/assessment') {
              setResumeNotice(
                'Retake mode is active. Submitting this form will replace your latest assessment status.'
              )
            }
            setCheckingAuth(false)
          }
        } else {
          setCheckingAuth(false)
        }
      } catch (err) {
        console.error('[Assessment] Auth check exception:', err)
        setCheckingAuth(false)
      }
    }
    checkRedirect()
  }, [router])

  if (checkingAuth) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center text-[#00A884]">
        <div className="w-10 h-10 border-3 border-current border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-[#F7F9F6] via-[#F1F5EF] to-[#E9F0E7] py-6 sm:py-12 px-4 relative flex flex-col items-center justify-start overflow-hidden">
      {/* Ambient Atmospheric Caustic Glows */}
      <div className="absolute top-0 inset-x-0 h-[480px] bg-[radial-gradient(ellipse_at_top,rgba(0,168,132,0.16),transparent_72%)] pointer-events-none" />
      <div className="absolute top-1/3 left-0 w-80 h-80 bg-[radial-gradient(circle,rgba(0,168,132,0.08),transparent_70%)] pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-[500px] h-[500px] bg-[radial-gradient(circle,rgba(0,168,132,0.07),transparent_70%)] pointer-events-none" />

      {/* Top Header */}
      <div className="w-full max-w-[580px] lg:max-w-[1040px] mb-5 flex items-center justify-start relative z-10 px-1 transition-all duration-300">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-xs sm:text-sm font-sans font-semibold text-slate-600 hover:text-[#00A884] bg-white/90 hover:bg-white backdrop-blur-md px-3.5 py-1.5 rounded-full border border-slate-200/90 shadow-2xs transition-all cursor-pointer hover:shadow-xs"
        >
          <ArrowLeft className="w-4 h-4 text-[#00A884]" />
          <span>Back to 8Liv</span>
        </Link>
      </div>

      {resumeNotice && (
        <div className="w-full max-w-[580px] lg:max-w-[1040px] mb-4 p-3.5 bg-amber-50/90 border border-amber-200/80 text-amber-900 text-xs rounded-2xl shadow-xs relative z-10 font-sans transition-all duration-300">
          {resumeNotice}
        </div>
      )}

      {/* Common Unified Assessment Funnel */}
      <div className="w-full relative z-10 flex justify-center">
        <UnifiedAssessmentFunnel />
      </div>
    </main>
  )
}
