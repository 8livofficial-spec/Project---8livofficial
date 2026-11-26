'use client'

import React, { useEffect, useState } from 'react'
import { Calendar, Clock, Lock, ShieldCheck, Video } from 'lucide-react'
import { authedFetch } from '@/lib/apiClient'

export type MaskedSessionItem = {
  id: string
  title: string
  coach_role: string
  scheduled_start: string
  scheduled_end: string
  status: 'SCHEDULED' | 'COMPLETED' | 'CANCELLED'
  can_join: boolean
  join_window_opens_at: string
  mid_session_grace: boolean
}

export default function MaskedCoachingSessionsList({
  isPlanExpired = false,
}: {
  isPlanExpired?: boolean
}) {
  const [sessions, setSessions] = useState<MaskedSessionItem[]>([])
  const [loading, setLoading] = useState(true)
  const [joiningId, setJoiningId] = useState<string | null>(null)
  const [joinError, setJoinError] = useState('')

  useEffect(() => {
    let active = true
    const load = async () => {
      try {
        const res = await authedFetch('/api/sessions/my-sessions')
        if (res.ok && active) {
          const json = await res.json()
          setSessions(json.sessions || [])
        }
      } catch {
        // Non-blocking
      } finally {
        if (active) setLoading(false)
      }
    }
    load()
    const timer = setInterval(load, 30_000)
    return () => {
      active = false
      clearInterval(timer)
    }
  }, [])

  const handleJoinSession = async (sessionId: string) => {
    setJoinError('')
    setJoiningId(sessionId)
    try {
      const res = await authedFetch(`/api/sessions/${sessionId}/join`, {
        method: 'POST',
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok || !json.joinUrl) {
        throw new Error(json.error || 'Unable to open join gatekeeper.')
      }
      // Navigate via gatekeeper endpoint (issues 302 redirect to external Google Meet without exposing URL in DOM)
      const popup = window.open(json.joinUrl, '_blank', 'noopener,noreferrer')
      if (!popup) {
        window.location.assign(json.joinUrl)
      }
      setJoiningId(null)
    } catch (err: any) {
      setJoinError(err?.message || 'Unable to join session right now.')
      setJoiningId(null)
    }
  }

  const upcomingSessions = sessions.filter(
    (s) => s.status === 'SCHEDULED' && new Date(s.scheduled_end).getTime() >= Date.now()
  )
  const pastSessions = sessions.filter(
    (s) => s.status !== 'SCHEDULED' || new Date(s.scheduled_end).getTime() < Date.now()
  )

  if (loading) return null
  if (sessions.length === 0) return null

  return (
    <div
      className="rounded-3xl border border-slate-200 bg-white p-5 sm:p-6 shadow-sm space-y-4 select-none"
      onContextMenu={(e) => e.preventDefault()}
    >
      <div className="flex items-center justify-between border-b border-slate-100 pb-3">
        <div>
          <span className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-teal-700">
            <ShieldCheck className="w-3.5 h-3.5" /> Protected Coaching Sessions
          </span>
          <h3 className="text-base sm:text-lg font-black text-slate-900 mt-0.5">
            {isPlanExpired ? 'Past Coaching Session History (Read-Only)' : 'Your Coaching Sessions'}
          </h3>
        </div>
      </div>

      {joinError && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs font-semibold text-rose-800">
          {joinError}
        </div>
      )}

      {/* Hide upcoming session cards & Join buttons when plan is EXPIRED (unless mid-session grace applies) */}
      {!isPlanExpired && upcomingSessions.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          {upcomingSessions.map((session) => {
            const localStart = new Date(session.scheduled_start)
            const localEnd = new Date(session.scheduled_end)
            const timeLabel = localStart.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            const endLabel = localEnd.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            const dateLabel = localStart.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })

            return (
              <div
                key={session.id}
                onContextMenu={(e) => e.preventDefault()}
                className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 flex flex-col justify-between gap-3 select-none"
              >
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[10px] font-black uppercase tracking-wider text-teal-700 bg-teal-50 border border-teal-200 px-2 py-0.5 rounded-full">
                      {session.coach_role.replace('_', ' ')}
                    </span>
                    <span className="text-[11px] font-semibold text-slate-500 flex items-center gap-1">
                      <Calendar className="w-3 h-3" /> {dateLabel}
                    </span>
                  </div>
                  <h4 className="font-black text-slate-900 text-sm mt-2">{session.title}</h4>
                  <p className="text-xs text-slate-600 mt-1 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                    <span>{timeLabel} – {endLabel} (Local Time)</span>
                  </p>
                </div>

                {session.can_join ? (
                  <button
                    type="button"
                    disabled={joiningId === session.id}
                    onClick={() => handleJoinSession(session.id)}
                    onContextMenu={(e) => e.preventDefault()}
                    className="w-full rounded-xl bg-[#00A884] hover:bg-[#009272] text-white py-2.5 px-4 text-xs font-black flex items-center justify-center gap-2 transition-all cursor-pointer shadow-sm"
                  >
                    <Video className="w-4 h-4" />
                    <span>{joiningId === session.id ? 'Authorizing...' : 'Join Session'}</span>
                  </button>
                ) : (
                  <div className="w-full rounded-xl bg-slate-200/80 text-slate-600 py-2.5 px-4 text-xs font-bold flex items-center justify-center gap-1.5 cursor-not-allowed">
                    <Lock className="w-3.5 h-3.5" />
                    <span>Starts at {timeLabel}</span>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Read-only session history (always visible, including during Soft-Lock expiry) */}
      {pastSessions.length > 0 && (
        <div className="space-y-2 pt-1">
          <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">
            Session History
          </p>
          <div className="divide-y divide-slate-100 rounded-2xl border border-slate-100 bg-slate-50/40">
            {pastSessions.map((s) => (
              <div key={s.id} className="px-4 py-2.5 flex items-center justify-between text-xs">
                <div>
                  <p className="font-bold text-slate-800">{s.title}</p>
                  <p className="text-[11px] text-slate-500">
                    {new Date(s.scheduled_start).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
                  </p>
                </div>
                <span className="rounded-full bg-slate-200/70 text-slate-700 px-2.5 py-0.5 text-[10px] font-bold">
                  {s.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
