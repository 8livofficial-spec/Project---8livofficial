'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
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
          } else if (
            ['PHARMACY', 'PHARMACY_ADMIN', 'PHARMACY_STAFF'].includes(String(role).toUpperCase())
          ) {
            router.replace('/pharmacy')
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
    <main className="min-h-screen bg-[#FAFBF9] py-6 sm:py-10 px-4 relative flex flex-col items-center justify-start overflow-hidden">
      {/* Ambient Atmospheric Glow */}
      <div className="absolute top-0 inset-x-0 h-96 bg-[radial-gradient(ellipse_at_top,rgba(0,168,132,0.1),transparent_70%)] pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-[radial-gradient(circle,rgba(0,168,132,0.05),transparent_70%)] pointer-events-none" />

      {/* Top Header */}
      <div className="w-full max-w-[580px] mb-6 flex items-center justify-between relative z-10">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-xs sm:text-sm font-sans font-semibold text-slate-600 hover:text-[#00A884] bg-white/80 hover:bg-white backdrop-blur-md px-3.5 py-1.5 rounded-full border border-slate-200/80 shadow-2xs transition-all"
        >
          <ArrowLeft className="w-4 h-4 text-[#00A884]" />
          <span>Back to 8Liv</span>
        </Link>
        
        <div className="flex items-center gap-2 text-xs font-sans font-medium text-slate-500 bg-white/60 backdrop-blur-md px-3 py-1 rounded-full border border-slate-200/60">
          <span className="w-2 h-2 rounded-full bg-[#00A884]" />
          <span>Clinical Telehealth Assessment</span>
        </div>
      </div>

      {resumeNotice && (
        <div className="w-full max-w-[580px] mb-4 p-3.5 bg-amber-50/90 border border-amber-200/80 text-amber-900 text-xs rounded-2xl shadow-xs relative z-10 font-sans">
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
