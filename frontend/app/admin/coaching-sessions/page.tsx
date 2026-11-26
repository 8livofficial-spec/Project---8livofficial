'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import {
  ArrowLeft,
  Calendar,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock,
  Download,
  RefreshCw,
  Search,
  Users,
  Video,
} from 'lucide-react'
import { authedFetch } from '@/lib/apiClient'

type Attendee = {
  sessionId: string
  patientId: string
  patientName: string
  patientEmail: string | null
  patientPhone: string | null
  joinedAt: string | null
  status: string
}

type SessionGroup = {
  sessionKey: string
  title: string
  coachId: string
  coachName: string
  coachEmail: string | null
  coachRole: string
  scheduledStart: string
  scheduledEnd: string
  status: string
  invitedCount: number
  joinedCount: number
  pendingCount: number
  attendees: Attendee[]
}

type ProviderSummary = {
  coachId: string
  coachName: string
  coachEmail: string | null
  coachRole: string
  totalSessions: number
  totalInvited: number
  totalJoined: number
}

export default function AdminCoachingSessionsPage() {
  const [sessions, setSessions] = useState<SessionGroup[]>([])
  const [providerSummaries, setProviderSummaries] = useState<ProviderSummary[]>([])
  const [totals, setTotals] = useState({ totalSessions: 0, totalInvited: 0, totalJoined: 0 })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState('')
  const [selectedCoachId, setSelectedCoachId] = useState('')
  const [expandedKey, setExpandedKey] = useState<string | null>(null)

  const loadData = async () => {
    setLoading(true)
    setError('')
    try {
      const params = new URLSearchParams()
      if (roleFilter) params.set('role', roleFilter)
      if (selectedCoachId) params.set('coachId', selectedCoachId)
      const res = await authedFetch(`/api/admin/coaching-sessions?${params.toString()}`)
      const payload = await res.json()
      if (!res.ok) throw new Error(payload.error || 'Failed to load coaching attendance.')
      setSessions(payload.sessions || [])
      setProviderSummaries(payload.providerSummaries || [])
      setTotals(payload.totals || { totalSessions: 0, totalInvited: 0, totalJoined: 0 })
    } catch (err: any) {
      setError(err?.message || 'Unable to load coaching session attendance.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [roleFilter, selectedCoachId])

  const filteredSessions = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return sessions
    return sessions.filter(
      (s) =>
        s.title.toLowerCase().includes(q) ||
        s.coachName.toLowerCase().includes(q) ||
        s.attendees.some((a) => a.patientName.toLowerCase().includes(q))
    )
  }, [sessions, search])

  const joinRate = totals.totalInvited > 0
    ? Math.round((totals.totalJoined / totals.totalInvited) * 100)
    : 0

  const exportCsv = () => {
    const header = ['Session Title', 'Provider', 'Role', 'Start Time', 'End Time', 'Invited', 'Joined Count', 'Pending']
    const rows = filteredSessions.map((s) => [
      `"${s.title.replace(/"/g, '""')}"`,
      `"${s.coachName.replace(/"/g, '""')}"`,
      s.coachRole,
      new Date(s.scheduledStart).toISOString(),
      new Date(s.scheduledEnd).toISOString(),
      String(s.invitedCount),
      String(s.joinedCount),
      String(s.pendingCount),
    ])
    const csv = [header.join(','), ...rows.map((r) => r.join(','))].join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `coaching-session-attendance-${new Date().toISOString().slice(0, 10)}.csv`
    link.click()
    URL.revokeObjectURL(url)
  }

  return (
    <main className="min-h-screen bg-[#F5F0EB] p-6 text-[#1A1F36]">
      <div className="mx-auto max-w-7xl space-y-6">
        {/* Header & Navigation */}
        <div className="flex flex-col gap-4 border-b border-[#1A1F36]/10 pb-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-2">
            <Link
              href="/admin"
              className="inline-flex items-center gap-2 rounded-xl border border-[#1A1F36]/15 bg-white px-3.5 py-2 text-xs font-black text-[#1A1F36] hover:bg-[#FAF7F5] shadow-sm transition-all group"
            >
              <ArrowLeft className="h-4 w-4 text-[#8896A4] group-hover:text-[#1A1F36]" />
              <span>Back to Admin Dashboard</span>
            </Link>
            <div>
              <p className="text-xs font-black uppercase tracking-[0.18em] text-[#0D9488]">
                90-Day Coaching Payout & Attendance
              </p>
              <h1 className="text-2xl sm:text-3xl font-black text-[#1A1F36]">
                Coaching Session Join Counts
              </h1>
              <p className="text-xs text-[#64748B] font-medium mt-0.5">
                Track exact patient join counts per session and per provider for attendance-based provider payouts.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={loadData}
              className="inline-flex items-center gap-1.5 rounded-xl border border-[#1A1F36]/15 bg-white px-4 py-2.5 text-xs font-black text-[#1A1F36] hover:bg-slate-50 cursor-pointer"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>
            <button
              type="button"
              onClick={exportCsv}
              disabled={filteredSessions.length === 0}
              className="inline-flex items-center gap-1.5 rounded-xl bg-[#1A1F36] px-4 py-2.5 text-xs font-black text-white hover:bg-[#11162A] disabled:opacity-50 cursor-pointer"
            >
              <Download className="h-3.5 w-3.5" />
              <span>Export CSV</span>
            </button>
          </div>
        </div>

        {error && (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-xs font-bold text-rose-800">
            {error}
          </div>
        )}

        {/* KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="rounded-2xl bg-white p-5 border border-[#1A1F36]/10 shadow-xs">
            <p className="text-[11px] font-black uppercase tracking-wider text-slate-400">Scheduled Sessions</p>
            <p className="mt-2 text-3xl font-black text-[#1A1F36]">{totals.totalSessions}</p>
          </div>
          <div className="rounded-2xl bg-white p-5 border border-[#1A1F36]/10 shadow-xs">
            <p className="text-[11px] font-black uppercase tracking-wider text-slate-400">Patients Invited</p>
            <p className="mt-2 text-3xl font-black text-[#1A1F36]">{totals.totalInvited}</p>
          </div>
          <div className="rounded-2xl bg-emerald-50 p-5 border border-emerald-200 shadow-xs">
            <p className="text-[11px] font-black uppercase tracking-wider text-emerald-700">Total Joined (Payable)</p>
            <p className="mt-2 text-3xl font-black text-emerald-800">{totals.totalJoined}</p>
          </div>
          <div className="rounded-2xl bg-white p-5 border border-[#1A1F36]/10 shadow-xs">
            <p className="text-[11px] font-black uppercase tracking-wider text-slate-400">Join Rate</p>
            <p className="mt-2 text-3xl font-black text-[#0D9488]">{joinRate}%</p>
          </div>
        </div>

        {/* Provider Payout Join Count Summary */}
        <section className="rounded-3xl bg-white p-5 sm:p-6 border border-[#1A1F36]/10 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base sm:text-lg font-black text-[#1A1F36]">
                Provider Join Count Summary (For Payouts)
              </h2>
              <p className="text-xs text-slate-500">
                Total unique patient joins recorded across each provider&apos;s scheduled 90-Day coaching sessions.
              </p>
            </div>
          </div>

          {providerSummaries.length === 0 ? (
            <p className="text-xs text-slate-500 py-4">No coaching sessions found yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-100 text-[10px] font-black uppercase tracking-wider text-slate-400">
                    <th className="py-3 pr-4">Provider</th>
                    <th className="py-3 pr-4">Role</th>
                    <th className="py-3 pr-4">Sessions Conducted</th>
                    <th className="py-3 pr-4">Total Invited</th>
                    <th className="py-3 pr-4">Total People Joined</th>
                    <th className="py-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {providerSummaries.map((prov) => (
                    <tr key={prov.coachId} className="hover:bg-slate-50/70">
                      <td className="py-3 pr-4 font-bold text-[#1A1F36]">
                        <div>{prov.coachName}</div>
                        {prov.coachEmail && <div className="text-[11px] font-normal text-slate-400">{prov.coachEmail}</div>}
                      </td>
                      <td className="py-3 pr-4">
                        <span className="rounded-full bg-teal-50 px-2.5 py-1 text-[10px] font-black uppercase text-teal-800 border border-teal-200">
                          {prov.coachRole.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="py-3 pr-4 font-bold">{prov.totalSessions}</td>
                      <td className="py-3 pr-4 font-semibold text-slate-600">{prov.totalInvited}</td>
                      <td className="py-3 pr-4">
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-3 py-1 font-black text-emerald-800 border border-emerald-200">
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          {prov.totalJoined} joined
                        </span>
                      </td>
                      <td className="py-3 text-right">
                        <button
                          type="button"
                          onClick={() => setSelectedCoachId(selectedCoachId === prov.coachId ? '' : prov.coachId)}
                          className="rounded-lg border border-slate-200 px-3 py-1.5 text-[11px] font-bold hover:bg-slate-100 cursor-pointer"
                        >
                          {selectedCoachId === prov.coachId ? 'Show All' : 'Filter Sessions'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* Session-by-Session Attendance */}
        <section className="rounded-3xl bg-white p-5 sm:p-6 border border-[#1A1F36]/10 shadow-xs space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-base sm:text-lg font-black text-[#1A1F36]">
                Each Session Attendance Breakdown
              </h2>
              <p className="text-xs text-slate-500">
                Click any session row to inspect exactly which patients joined and their join timestamps.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search session, provider, patient..."
                  className="rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-3 py-2 text-xs font-medium outline-none focus:border-[#0D9488]"
                />
              </div>
              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-bold outline-none focus:border-[#0D9488]"
              >
                <option value="">All Roles</option>
                <option value="fitness_coach">Fitness Coach</option>
                <option value="dietitian">Dietitian</option>
              </select>
            </div>
          </div>

          {loading ? (
            <div className="py-10 text-center text-xs font-bold text-slate-400">Loading coaching sessions...</div>
          ) : filteredSessions.length === 0 ? (
            <div className="py-10 text-center text-xs font-bold text-slate-400">
              No coaching sessions match the selected filters.
            </div>
          ) : (
            <div className="space-y-3">
              {filteredSessions.map((session) => {
                const isExpanded = expandedKey === session.sessionKey
                const startDate = new Date(session.scheduledStart)
                const endDate = new Date(session.scheduledEnd)

                return (
                  <div
                    key={session.sessionKey}
                    className="rounded-2xl border border-slate-200 overflow-hidden"
                  >
                    <button
                      type="button"
                      onClick={() => setExpandedKey(isExpanded ? null : session.sessionKey)}
                      className="w-full flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-slate-50/70 hover:bg-slate-100/70 text-left transition cursor-pointer"
                    >
                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="rounded-full bg-teal-50 border border-teal-200 px-2.5 py-0.5 text-[10px] font-black uppercase text-teal-800">
                            {session.coachRole.replace('_', ' ')}
                          </span>
                          <span className="text-sm font-black text-[#1A1F36]">{session.title}</span>
                        </div>
                        <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 font-medium">
                          <span className="inline-flex items-center gap-1">
                            <Video className="h-3.5 w-3.5 text-slate-400" />
                            {session.coachName}
                          </span>
                          <span className="inline-flex items-center gap-1">
                            <Calendar className="h-3.5 w-3.5 text-slate-400" />
                            {startDate.toLocaleDateString('en-IN', { dateStyle: 'medium' })}
                          </span>
                          <span className="inline-flex items-center gap-1">
                            <Clock className="h-3.5 w-3.5 text-slate-400" />
                            {startDate.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })} –{' '}
                            {endDate.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 shrink-0">
                        <div className="inline-flex items-center gap-1.5 rounded-xl bg-white border border-slate-200 px-3 py-1.5 text-xs font-bold text-slate-700">
                          <Users className="h-3.5 w-3.5 text-slate-400" />
                          <span>{session.invitedCount} Invited</span>
                        </div>
                        <div className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-100 border border-emerald-200 px-3 py-1.5 text-xs font-black text-emerald-800">
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          <span>{session.joinedCount} Joined</span>
                        </div>
                        {isExpanded ? <ChevronUp className="h-4 w-4 text-slate-400" /> : <ChevronDown className="h-4 w-4 text-slate-400" />}
                      </div>
                    </button>

                    {isExpanded && (
                      <div className="p-4 bg-white border-t border-slate-200 overflow-x-auto">
                        <table className="w-full text-left text-xs">
                          <thead>
                            <tr className="border-b border-slate-100 text-[10px] font-black uppercase tracking-wider text-slate-400">
                              <th className="py-2 pr-4">Patient</th>
                              <th className="py-2 pr-4">Phone / Email</th>
                              <th className="py-2 pr-4">Attendance</th>
                              <th className="py-2">Joined At</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {session.attendees.map((att) => (
                              <tr key={att.sessionId}>
                                <td className="py-2.5 pr-4 font-bold text-[#1A1F36]">{att.patientName}</td>
                                <td className="py-2.5 pr-4 text-slate-500">
                                  {att.patientPhone || att.patientEmail || '—'}
                                </td>
                                <td className="py-2.5 pr-4">
                                  {att.joinedAt ? (
                                    <span className="rounded-full bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 text-[10px] font-black uppercase text-emerald-800">
                                      Joined
                                    </span>
                                  ) : (
                                    <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[10px] font-bold uppercase text-slate-500">
                                      Not Joined
                                    </span>
                                  )}
                                </td>
                                <td className="py-2.5 text-slate-500">
                                  {att.joinedAt
                                    ? new Date(att.joinedAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })
                                    : '—'}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </section>
      </div>
    </main>
  )
}
