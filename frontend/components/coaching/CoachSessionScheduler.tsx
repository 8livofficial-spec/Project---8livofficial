'use client'

import React, { useEffect, useMemo, useState } from 'react'
import { Calendar, Clock, Link2, CheckCircle2, AlertCircle, Shield } from 'lucide-react'
import { authedFetch } from '@/lib/apiClient'

export type AssignedPatientOption = {
  id: string
  name: string
  planEndsAt?: string | null
  planName?: string | null
}

type ScheduledSessionRow = {
  id: string
  user_id: string
  title: string
  scheduled_start: string
  scheduled_end: string
  status: string
}

export default function CoachSessionScheduler({
  patients,
  defaultTitle = '90-Day Coaching Session',
}: {
  patients: AssignedPatientOption[]
  defaultTitle?: string
}) {
  const [selectedPatientId, setSelectedPatientId] = useState<string>('ALL_90_DAY')
  const [active90DayMembers, setActive90DayMembers] = useState<AssignedPatientOption[]>([])
  const [title, setTitle] = useState<string>(defaultTitle)
  const [date, setDate] = useState<string>('')
  const [startTime, setStartTime] = useState<string>('10:00')
  const [endTime, setEndTime] = useState<string>('10:45')
  const [meetingUrl, setMeetingUrl] = useState<string>('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [successMsg, setSuccessMsg] = useState('')
  const [sessions, setSessions] = useState<ScheduledSessionRow[]>([])

  const mergedPatients = useMemo(() => {
    const map = new Map<string, AssignedPatientOption>()
    for (const p of active90DayMembers) {
      if (p.id) map.set(p.id, p)
    }
    for (const p of patients) {
      if (p.id && !map.has(p.id)) map.set(p.id, p)
    }
    return Array.from(map.values())
  }, [active90DayMembers, patients])

  const selectedPatient = useMemo(
    () => (selectedPatientId === 'ALL_90_DAY' ? null : mergedPatients.find((p) => p.id === selectedPatientId) || null),
    [mergedPatients, selectedPatientId]
  )

  // Local YYYY-MM-DD bounds: today min, patient's plan end_date max
  const todayLocal = useMemo(() => new Date().toLocaleDateString('en-CA'), [])
  const maxDateLocal = useMemo(() => {
    if (!selectedPatient?.planEndsAt) return undefined
    const d = new Date(selectedPatient.planEndsAt)
    if (Number.isNaN(d.getTime())) return undefined
    return d.toLocaleDateString('en-CA')
  }, [selectedPatient])

  const loadSessions = async (pid?: string) => {
    try {
      const qs = pid && pid !== 'ALL_90_DAY' ? `?patientId=${encodeURIComponent(pid)}` : ''
      const res = await authedFetch(`/api/sessions${qs}`)
      if (res.ok) {
        const json = await res.json()
        setSessions(json.sessions || [])
        if (Array.isArray(json.active90DayPatients)) {
          setActive90DayMembers(json.active90DayPatients)
        }
      }
    } catch {
      // Non-blocking
    }
  }

  useEffect(() => {
    loadSessions(selectedPatientId)
  }, [selectedPatientId])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccessMsg('')

    if (!selectedPatientId || !date || !startTime || !endTime || !meetingUrl.trim()) {
      setError('Please select a patient, date, time window, and valid Google Meet / Zoom link.')
      return
    }

    if (maxDateLocal && date > maxDateLocal) {
      setError(`Cannot schedule beyond the patient's 90-day plan expiry date (${maxDateLocal}).`)
      return
    }

    const startLocal = new Date(`${date}T${startTime}:00`)
    const endLocal = new Date(`${date}T${endTime}:00`)
    if (Number.isNaN(startLocal.getTime()) || Number.isNaN(endLocal.getTime()) || endLocal <= startLocal) {
      setError('End time must be after start time.')
      return
    }

    setSubmitting(true)
    try {
      const res = await authedFetch('/api/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: selectedPatientId,
          title: title.trim() || defaultTitle,
          scheduled_start: startLocal.toISOString(),
          scheduled_end: endLocal.toISOString(),
          meeting_url: meetingUrl.trim(),
        }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error(json.error || 'Failed to schedule coaching session.')
      }
      setSuccessMsg(
        json.scheduledCount > 1
          ? `Session scheduled & notified for ${json.scheduledCount} active 90-Day Pack members!`
          : 'Session scheduled! The meeting link is masked and gated for the patient(s).'
      )
      setMeetingUrl('')
      await loadSessions(selectedPatientId)
    } catch (err: any) {
      setError(err?.message || 'Unable to schedule session.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 sm:p-6 shadow-sm space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-slate-100 pb-4">
        <div>
          <span className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-teal-700 bg-teal-50 px-2.5 py-1 rounded-full">
            <Shield className="w-3 h-3" /> Masked &amp; Time-Gated Scheduler
          </span>
          <h3 className="text-lg font-black text-slate-900 mt-1.5">
            Schedule 90-Day Coaching Session
          </h3>
          <p className="text-xs text-slate-500">
            Meeting URLs are stored server-side only and never exposed to patients.
          </p>
        </div>
        {maxDateLocal && (
          <div className="text-left sm:text-right bg-slate-50 border border-slate-200 px-3 py-2 rounded-xl">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Patient Plan Valid Until</p>
            <p className="text-xs font-black text-slate-900">{maxDateLocal}</p>
          </div>
        )}
      </div>

      {error && (
        <div className="flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs font-semibold text-rose-800">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {successMsg && (
        <div className="flex items-start gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs font-semibold text-emerald-800">
          <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{successMsg}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <div>
          <label className="text-[11px] font-bold uppercase tracking-wider text-slate-600 block mb-1.5">
            90-Day Pack Members *
          </label>
          <select
            value={selectedPatientId}
            onChange={(e) => setSelectedPatientId(e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs font-bold text-slate-800 outline-none focus:border-teal-600"
          >
            <option value="ALL_90_DAY">
              All Active 90-Day Pack Members ({active90DayMembers.length})
            </option>
            {mergedPatients.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="text-[11px] font-bold uppercase tracking-wider text-slate-600 block mb-1.5">
            Session Title *
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Week 2 Nutrition & Movement Check-in"
            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs font-semibold text-slate-800 outline-none focus:border-teal-600"
          />
        </div>

        <div>
          <label className="text-[11px] font-bold uppercase tracking-wider text-slate-600 block mb-1.5">
            <Calendar className="w-3 h-3 inline mr-1" />
            Session Date {maxDateLocal ? `(Max ${maxDateLocal})` : ''} *
          </label>
          <input
            type="date"
            value={date}
            min={todayLocal}
            max={maxDateLocal}
            onChange={(e) => setDate(e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs font-bold text-slate-800 outline-none focus:border-teal-600"
          />
        </div>

        <div>
          <label className="text-[11px] font-bold uppercase tracking-wider text-slate-600 block mb-1.5">
            <Clock className="w-3 h-3 inline mr-1" /> Start Time *
          </label>
          <input
            type="time"
            value={startTime}
            onChange={(e) => setStartTime(e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs font-bold text-slate-800 outline-none focus:border-teal-600"
          />
        </div>

        <div>
          <label className="text-[11px] font-bold uppercase tracking-wider text-slate-600 block mb-1.5">
            <Clock className="w-3 h-3 inline mr-1" /> End Time *
          </label>
          <input
            type="time"
            value={endTime}
            onChange={(e) => setEndTime(e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs font-bold text-slate-800 outline-none focus:border-teal-600"
          />
        </div>

        <div>
          <label className="text-[11px] font-bold uppercase tracking-wider text-slate-600 block mb-1.5">
            <Link2 className="w-3 h-3 inline mr-1" /> Google Meet / Zoom URL *
          </label>
          <input
            type="url"
            value={meetingUrl}
            onChange={(e) => setMeetingUrl(e.target.value)}
            placeholder="https://meet.google.com/xxx-xxxx-xxx"
            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs font-semibold text-slate-800 outline-none focus:border-teal-600"
          />
        </div>

        <div className="sm:col-span-2 lg:col-span-3 flex justify-end pt-1">
          <button
            type="submit"
            disabled={submitting}
            className="rounded-xl bg-slate-900 hover:bg-teal-700 text-white px-5 py-2.5 text-xs font-black transition-all disabled:opacity-50 cursor-pointer"
          >
            {submitting ? 'Scheduling...' : 'Schedule Masked Session'}
          </button>
        </div>
      </form>

      {sessions.length > 0 && (
        <div className="border-t border-slate-100 pt-4 space-y-2">
          <p className="text-[11px] font-black uppercase tracking-wider text-slate-500">
            Scheduled Masked Sessions ({sessions.length})
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {sessions.map((s) => (
              <div key={s.id} className="rounded-xl border border-slate-200 bg-slate-50/70 p-3 flex items-center justify-between text-xs">
                <div>
                  <p className="font-bold text-slate-900">{s.title}</p>
                  <p className="text-[11px] text-slate-500">
                    {new Date(s.scheduled_start).toLocaleString(undefined, {
                      dateStyle: 'medium',
                      timeStyle: 'short',
                    })}
                  </p>
                </div>
                <span className="rounded-full bg-teal-100 text-teal-800 px-2 py-0.5 text-[10px] font-black">
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
