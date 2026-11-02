'use client'

import { Suspense, useState, useEffect, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { AlertCircle, RefreshCw, PhoneOff, CheckCircle } from 'lucide-react'
import dynamic from 'next/dynamic'
import { supabase } from '@/lib/supabaseClient'

const StreamConsultationCall = dynamic(
  () => import('@/components/video/StreamConsultationCall'),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full min-h-[500px] items-center justify-center text-white">
        <RefreshCw className="h-6 w-6 animate-spin text-[#C4622D]" />
      </div>
    ),
  }
)

function VideoRoomContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const appointmentId = searchParams.get('id') || ''

  const [hasEnded, setHasEnded] = useState(false)
  const [concluding, setConcluding] = useState(false)
  const [countdown, setCountdown] = useState(3)
  const [returnPath, setReturnPath] = useState('/dietitian')
  const [sessionTitle, setSessionTitle] = useState('Clinical Consultation')

  const handleSessionReady = useCallback((meta: { providerRole?: string; participantRole?: string }) => {
    if (meta.participantRole === 'patient') {
      setReturnPath('/patient/appointments')
      setSessionTitle('Consultation')
    } else if (meta.providerRole === 'dietitian') {
      setReturnPath('/dietitian')
      setSessionTitle('Dietitian Consultation')
    } else if (meta.providerRole === 'doctor') {
      setReturnPath('/doctor/dashboard')
      setSessionTitle('Doctor Consultation')
    } else if (meta.providerRole === 'fitness_coach' || meta.providerRole === 'trainer') {
      setReturnPath('/provider')
      setSessionTitle('Fitness Consultation')
    }
  }, [])

  const handleEndCall = useCallback(async () => {
    if (concluding) return
    setConcluding(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const token = session?.access_token || ''
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      }

      // 1. Notify provider consultations API to mark as completed / ended
      await fetch('/api/provider/consultations', {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ consultationId: appointmentId, action: 'complete' }),
      }).catch((err) => console.warn('Provider complete error:', err))

      // 2. Also notify patient conclude API
      await fetch('/api/patient/conclude-consultation', {
        method: 'POST',
        headers,
        body: JSON.stringify({ appointmentId, forceStatus: 'completed' }),
      }).catch((err) => console.warn('Patient conclude error:', err))
    } catch (err) {
      console.error('Error concluding consultation:', err)
    } finally {
      setConcluding(false)
      setHasEnded(true)

      // Attempt window close if opened as new tab/window
      try {
        window.close()
      } catch (e) {
        console.warn('Window close blocked:', e)
      }
    }
  }, [appointmentId, concluding])

  useEffect(() => {
    if (!hasEnded) return
    if (countdown <= 0) {
      router.replace(returnPath)
      return
    }
    const timer = setTimeout(() => {
      setCountdown((prev) => prev - 1)
    }, 1000)
    return () => clearTimeout(timer)
  }, [hasEnded, countdown, returnPath, router])

  if (!appointmentId) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#0D101C] p-6 text-white">
        <div className="max-w-md rounded-2xl border border-white/10 bg-white/5 p-6 text-center">
          <AlertCircle className="mx-auto mb-3 h-8 w-8 text-amber-300" />
          <h1 className="mb-2 text-lg font-bold">Missing consultation ID</h1>
          <p className="text-sm text-white/70">Please return to your consultations and join again.</p>
        </div>
      </main>
    )
  }

  if (hasEnded) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center bg-[#0B0F19] text-white p-6 select-none">
        <div className="max-w-md w-full bg-[#13192B] border border-white/10 rounded-3xl p-8 text-center shadow-2xl space-y-6">
          <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center mx-auto text-emerald-400">
            <CheckCircle className="w-8 h-8" />
          </div>
          <div className="space-y-2">
            <h2 className="text-xl font-bold tracking-tight text-white">Consultation Concluded</h2>
            <p className="text-sm text-slate-400 leading-relaxed">
              The video session has ended and consultation records have been updated.
            </p>
          </div>
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/5 border border-white/10 text-xs text-slate-300 font-medium">
            <span>Redirecting to portal in {countdown}s...</span>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <button
              onClick={() => router.replace(returnPath)}
              className="flex-1 py-3 px-4 rounded-xl bg-[#00A884] hover:bg-[#008f6f] text-white text-xs font-semibold tracking-wide transition-all shadow-md shadow-emerald-900/30 cursor-pointer"
            >
              Return to Portal
            </button>
            <button
              onClick={() => window.close()}
              className="flex-1 py-3 px-4 rounded-xl bg-white/10 hover:bg-white/15 text-slate-300 text-xs font-semibold tracking-wide border border-white/10 transition-all cursor-pointer"
            >
              Close Tab
            </button>
          </div>
        </div>
      </main>
    )
  }

  return (
    <main className="flex min-h-screen flex-col bg-[#0B0F19] text-white select-none">
      <header className="bg-[#0B0F19]/90 backdrop-blur-xl border-b border-white/[0.08] px-4 sm:px-6 py-3 flex items-center justify-between text-white shrink-0 z-20 shadow-md">
        <div className="flex items-center gap-3.5">
          <div className="flex items-center shrink-0">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/brand-logo-official.png"
              alt="8Liv Health"
              className="h-7 w-auto object-contain brightness-105"
            />
          </div>
          <div className="h-5 w-px bg-white/15" />
          <h3 className="text-sm font-semibold text-slate-100 tracking-tight">{sessionTitle}</h3>
        </div>

        <button
          onClick={handleEndCall}
          disabled={concluding}
          className="bg-white/10 hover:bg-rose-600/90 text-slate-200 hover:text-white font-medium px-4 py-1.5 rounded-full flex items-center gap-1.5 text-xs transition-all border border-white/10 hover:border-rose-500/30 cursor-pointer shadow-xs disabled:opacity-60"
          title="Leave and conclude consultation"
        >
          {concluding ? (
            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <PhoneOff className="w-3.5 h-3.5" />
          )}
          <span>{concluding ? 'Ending...' : 'End Call'}</span>
        </button>
      </header>
      <div className="min-h-0 flex-1 relative bg-[#0B0F19]">
        <StreamConsultationCall
          appointmentId={appointmentId}
          onLeave={handleEndCall}
          onSessionReady={handleSessionReady}
        />
      </div>
    </main>
  )
}

export default function VideoRoomPage() {
  return (
    <Suspense fallback={
      <main className="flex min-h-screen items-center justify-center bg-[#0D101C] text-white">
        <RefreshCw className="h-6 w-6 animate-spin text-[#C4622D]" />
      </main>
    }>
      <VideoRoomContent />
    </Suspense>
  )
}
