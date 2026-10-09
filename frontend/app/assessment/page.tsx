'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { supabase } from '@/lib/supabaseClient'
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
    <main className="min-h-screen bg-slate-50 py-8 sm:py-12 px-4 flex flex-col items-center justify-center">
      {/* Top Header */}
      <div className="w-full max-w-[460px] md:max-w-[760px] lg:max-w-[980px] mb-4 flex items-center justify-between">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-900 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to 8Liv
        </Link>
        <span className="text-xs text-slate-400 font-medium">8Liv Clinical Telehealth</span>
      </div>

      {resumeNotice && (
        <div className="w-full max-w-[460px] md:max-w-[760px] lg:max-w-[980px] mb-4 p-3 bg-amber-50 border border-amber-200 text-amber-900 text-xs rounded-xl">
          {resumeNotice}
        </div>
      )}

      {/* Common Unified Assessment Funnel */}
      <UnifiedAssessmentFunnel />
    </main>
  )
}
