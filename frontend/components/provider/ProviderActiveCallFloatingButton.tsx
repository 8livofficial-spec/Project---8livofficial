'use client'

import React, { useCallback, useEffect, useRef, useState } from 'react'
import { usePathname } from 'next/navigation'
import { Video, ExternalLink, Volume2, VolumeX, X, ChevronUp, Clock, AlertCircle } from 'lucide-react'
import { supabase } from '@/lib/supabaseClient'

interface ActiveConsultation {
  id: string
  patientName: string
  patientId: string
  bookingDate: string
  bookingTime: string
  status: string
  meetingStatus?: string
  meetingUrl: string
  providerRole: string
  appointmentType?: string
}

export default function ProviderActiveCallFloatingButton() {
  const pathname = usePathname()
  const [activeConsultation, setActiveConsultation] = useState<ActiveConsultation | null>(null)
  const [minimized, setMinimized] = useState(false)
  const [chimeMuted, setChimeMuted] = useState(false)
  const lastAlertedIdRef = useRef<string | null>(null)

  // Skip showing inside the video room itself or on public/login pages
  const shouldHide = !pathname ||
    pathname.startsWith('/video') ||
    pathname.includes('/login') ||
    pathname.includes('/register') ||
    pathname.includes('/activate')

  // Subtle audio chime
  const playTelehealthChime = useCallback(() => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext
      if (!AudioCtx) return
      const ctx = new AudioCtx()
      if (ctx.state === 'suspended') ctx.resume().catch(() => { })
      const now = ctx.currentTime

      const osc1 = ctx.createOscillator()
      const osc2 = ctx.createOscillator()
      const gain = ctx.createGain()

      osc1.type = 'sine'
      osc1.frequency.setValueAtTime(587.33, now) // D5
      osc1.frequency.setValueAtTime(880.00, now + 0.15) // A5

      osc2.type = 'triangle'
      osc2.frequency.setValueAtTime(587.33, now)
      osc2.frequency.setValueAtTime(880.00, now + 0.15)

      gain.gain.setValueAtTime(0.001, now)
      gain.gain.linearRampToValueAtTime(0.2, now + 0.04)
      gain.gain.setValueAtTime(0.2, now + 0.14)
      gain.gain.linearRampToValueAtTime(0.25, now + 0.18)
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.65)

      osc1.connect(gain)
      osc2.connect(gain)
      gain.connect(ctx.destination)

      osc1.start(now)
      osc2.start(now)
      osc1.stop(now + 0.65)
      osc2.stop(now + 0.65)
    } catch {
      // AudioContext failure tolerated
    }
  }, [])

  const checkActiveCall = useCallback(async () => {
    if (shouldHide) return
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        setActiveConsultation(null)
        return
      }

      const res = await fetch('/api/provider/active-call', {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
        cache: 'no-store',
      })
      if (!res.ok) {
        setActiveConsultation(null)
        return
      }

      const data = await res.json()
      if (data.hasActiveCall && data.consultation) {
        setActiveConsultation(data.consultation)
        if (!chimeMuted && lastAlertedIdRef.current !== data.consultation.id) {
          lastAlertedIdRef.current = data.consultation.id
          playTelehealthChime()
        }
      } else {
        setActiveConsultation(null)
      }
    } catch {
      // Network hiccup tolerated
    }
  }, [shouldHide, chimeMuted, playTelehealthChime])

  useEffect(() => {
    if (shouldHide) return
    checkActiveCall()
    const interval = setInterval(checkActiveCall, 8000)
    return () => clearInterval(interval)
  }, [shouldHide, checkActiveCall])

  if (shouldHide || !activeConsultation) {
    return null
  }

  const joinLink = activeConsultation.meetingUrl || `/video/room?id=${encodeURIComponent(activeConsultation.id)}`
  const isCalling = String(activeConsultation.status || '').toLowerCase() === 'calling'

  // Minimized Floating Pill
  if (minimized) {
    return (
      <aside
        aria-label="Active Consultation Notification"
        className="fixed bottom-6 right-6 z-50 flex items-center gap-2 group animate-in slide-in-from-bottom-5 duration-300 pointer-events-auto"
      >
        <button
          type="button"
          onClick={() => setMinimized(false)}
          className="flex items-center gap-2.5 px-4 py-3 rounded-full bg-gradient-to-r from-emerald-600 to-teal-700 text-white font-black text-xs shadow-2xl shadow-emerald-950/40 border-2 border-emerald-300 hover:brightness-110 transition-all cursor-pointer"
          title="Expand active consultation"
        >
          <span className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-300 opacity-75" />
            <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500" />
          </span>
          <Video className="w-4 h-4 animate-bounce" />
          <span>Active Call: {activeConsultation.patientName}</span>
          <ChevronUp className="w-3.5 h-3.5 opacity-80" />
        </button>
      </aside>
    )
  }

  // Expanded Floating Card
  return (
    <aside
      aria-label="Active Consultation Notification"
      className="fixed bottom-6 right-6 z-50 max-w-sm sm:max-w-md w-[calc(100vw-3rem)] pointer-events-auto animate-in slide-in-from-bottom-5 duration-300"
    >
      <div className="relative rounded-3xl bg-linear-to-r from-slate-900 via-emerald-950 to-teal-950 p-5 text-white shadow-2xl shadow-black/50 border-2 border-emerald-500/50 backdrop-blur-md">
        {/* Top Header */}
        <div className="flex items-center justify-between gap-3 pb-3 border-b border-white/10">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500" />
            </span>
            <span className="text-[10px] font-black uppercase tracking-widest text-emerald-300">
              {isCalling ? '● Live Call · Patient Waiting' : '● Scheduled Consultation Active'}
            </span>
          </div>

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setChimeMuted(!chimeMuted)}
              className="p-1.5 rounded-lg hover:bg-white/10 text-emerald-200 hover:text-white transition cursor-pointer"
              title={chimeMuted ? 'Unmute alerts' : 'Mute alerts'}
            >
              {chimeMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
            </button>
            <button
              type="button"
              onClick={() => setMinimized(true)}
              className="p-1.5 rounded-lg hover:bg-white/10 text-slate-300 hover:text-white transition cursor-pointer"
              title="Minimize to corner"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Body Content */}
        <div className="mt-3 flex items-start gap-3">
          <div className="w-11 h-11 rounded-2xl bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center shrink-0 text-emerald-300 shadow-inner">
            <Video className="w-5 h-5 animate-pulse" />
          </div>

          <div className="flex-1 min-w-0">
            <h4 className="text-base font-black text-white truncate">
              {activeConsultation.patientName}
            </h4>
            <div className="flex items-center gap-2 text-xs text-emerald-100 font-medium mt-0.5">
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3 text-emerald-300" />
                <span>{activeConsultation.bookingTime || 'Now'}</span>
              </span>
              <span>·</span>
              <span className="truncate">{activeConsultation.appointmentType || 'Consultation'}</span>
            </div>
          </div>
        </div>

        {/* Join Button */}
        <div className="mt-4 flex items-center gap-2.5">
          <a
            href={joinLink}
            target="_blank"
            rel="noreferrer"
            className="flex-1 py-3 px-5 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 text-xs font-black uppercase tracking-wider shadow-lg shadow-emerald-900/50 flex items-center justify-center gap-2 transition-all transform active:scale-95 cursor-pointer"
          >
            <Video className="w-4 h-4 text-slate-950" />
            <span>JOIN VIDEO ROOM NOW</span>
            <ExternalLink className="w-3.5 h-3.5 opacity-80" />
          </a>
        </div>
      </div>
    </aside>
  )
}

