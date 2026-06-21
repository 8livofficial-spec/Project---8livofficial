'use client'

import React, { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { AlertCircle, Calendar, Search, Video } from 'lucide-react'
import { supabase } from '@/lib/supabaseClient'

type FilterKey = 'all' | 'upcoming' | 'past' | 'cancelled' | 'missed'

type AppointmentRecord = {
  id: string
  source: 'doctor' | 'staff'
  providerId?: string | null
  providerName: string
  providerRole: string
  appointmentType: string
  bookingDate?: string | null
  bookingTime?: string | null
  status: string
  meetingUrl?: string | null
  createdAt?: string | null
}

type DoctorConsultationRow = {
  id: string
  doctor_id?: string | null
  booking_date?: string | null
  booking_time?: string | null
  status?: string | null
  room_url?: string | null
  meeting_url?: string | null
  appointment_type?: string | null
  created_at?: string | null
}

type StaffConsultationRow = {
  id: string
  staff_id?: string | null
  staff_role?: string | null
  booking_date?: string | null
  booking_time?: string | null
  status?: string | null
  room_url?: string | null
  meeting_url?: string | null
  appointment_type?: string | null
  created_at?: string | null
}

const filters: Array<{ key: FilterKey; label: string }> = [
  { key: 'all', label: 'All' },
  { key: 'upcoming', label: 'Upcoming' },
  { key: 'past', label: 'Past' },
  { key: 'cancelled', label: 'Cancelled' },
  { key: 'missed', label: 'Missed' },
]

function normalizeStatus(status?: string | null) {
  return String(status || 'scheduled').trim().toLowerCase()
}

function titleCase(value: string) {
  return value
    .replaceAll('_', ' ')
    .toLowerCase()
    .replace(/\b\w/g, char => char.toUpperCase())
}

function roleLabel(role?: string | null) {
  const normalized = String(role || '').toLowerCase()
  if (normalized === 'doctor') return 'Doctor'
  if (normalized === 'dietitian') return 'Dietitian'
  if (normalized === 'nutritionist') return 'Nutritionist'
  if (normalized === 'trainer' || normalized === 'fitness_coach') return 'Fitness Coach'
  return 'Provider'
}

function appointmentTypeLabel(type?: string | null, fallbackRole?: string | null) {
  const normalized = String(type || '').toUpperCase()
  if (normalized === 'INITIAL_CONSULTATION') return 'Initial Consultation'
  if (normalized === 'FOLLOW_UP_CONSULTATION') return 'Follow-up Consultation'
  if (normalized === 'DIETITIAN_CONSULTATION') return 'Dietitian Consultation'
  if (normalized === 'NUTRITIONIST_CONSULTATION') return 'Nutritionist Consultation'
  if (normalized === 'FITNESS_COACH_CONSULTATION') return 'Fitness Coach Consultation'
  return `${roleLabel(fallbackRole)} Appointment`
}

function getCategory(appointment: AppointmentRecord): Exclude<FilterKey, 'all'> {
  const status = normalizeStatus(appointment.status)
  if (status.includes('cancelled')) return 'cancelled'
  if (status.includes('missed')) return 'missed'
  if (['completed', 'approved', 'rejected'].includes(status)) return 'past'
  return 'upcoming'
}

function canJoin(appointment: AppointmentRecord) {
  if (!appointment.meetingUrl || !appointment.bookingDate || !appointment.bookingTime) return false
  if (getCategory(appointment) !== 'upcoming') return false

  const start = new Date(`${appointment.bookingDate} ${appointment.bookingTime}`).getTime()
  return Number.isFinite(start) && Date.now() >= start - 15 * 60 * 1000
}

function canCancel(appointment: AppointmentRecord) {
  if (appointment.source !== 'doctor') return false
  return ['scheduled', 'calling'].includes(normalizeStatus(appointment.status))
}

function formatDate(date?: string | null) {
  if (!date) return 'Not scheduled'
  const parsed = new Date(`${date}T00:00:00`)
  if (Number.isNaN(parsed.getTime())) return date
  return parsed.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
}

function sortAppointments(a: AppointmentRecord, b: AppointmentRecord) {
  const aTime = new Date(`${a.bookingDate || a.createdAt || ''} ${a.bookingTime || ''}`).getTime()
  const bTime = new Date(`${b.bookingDate || b.createdAt || ''} ${b.bookingTime || ''}`).getTime()
  return (Number.isFinite(bTime) ? bTime : 0) - (Number.isFinite(aTime) ? aTime : 0)
}

export default function AppointmentsPage() {
  const [appointments, setAppointments] = useState<AppointmentRecord[]>([])
  const [filter, setFilter] = useState<FilterKey>('all')
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [cancelTarget, setCancelTarget] = useState<AppointmentRecord | null>(null)
  const [cancelling, setCancelling] = useState(false)
  const [page, setPage] = useState(1)
  const limit = 20

  const loadAppointments = async () => {
    setLoading(true)
    setError('')
    try {
      const { data: sessionData } = await supabase.auth.getSession()
      const session = sessionData.session
      if (!session) throw new Error('Please sign in again.')

      const response = await fetch('/api/patient/appointments', {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      })
      if (!response.ok) {
        const errData = await response.json().catch(() => ({}))
        throw new Error(errData.error || 'Failed to fetch appointments.')
      }
      const data = await response.json()

      const doctorRows = (data.doctorConsultations || []) as DoctorConsultationRow[]
      const staffRows = (data.staffConsultations || []) as StaffConsultationRow[]

      const doctorNames = new Map<string, string>(
        (data.doctorProfiles || []).map((profile: any) => [
          profile.id,
          profile.full_name || 'Assigned Doctor',
        ])
      )
      const providerNames = new Map<string, string>(
        (data.providerProfiles || []).map((profile: any) => [
          profile.provider_id,
          profile.full_name || 'Assigned Provider',
        ])
      )
      const profileNames = new Map<string, string>(
        (data.profiles || []).map((profile: any) => [
          profile.id,
          [profile.first_name, profile.last_name].filter(Boolean).join(' ') || profile.display_id || 'Assigned Provider',
        ])
      )

      const doctorAppointments = doctorRows.map((row): AppointmentRecord => ({
        id: row.id,
        source: 'doctor',
        providerId: row.doctor_id,
        providerName: row.doctor_id ? doctorNames.get(row.doctor_id) || 'Assigned Doctor' : 'Assigned Doctor',
        providerRole: 'Doctor',
        appointmentType: appointmentTypeLabel(row.appointment_type, 'doctor'),
        bookingDate: row.booking_date,
        bookingTime: row.booking_time,
        status: normalizeStatus(row.status),
        meetingUrl: row.meeting_url || row.room_url || null,
        createdAt: row.created_at,
      }))

      const staffAppointments = staffRows.map((row): AppointmentRecord => ({
        id: row.id,
        source: 'staff',
        providerId: row.staff_id,
        providerName: row.staff_id ? providerNames.get(row.staff_id) || profileNames.get(row.staff_id) || `Assigned ${roleLabel(row.staff_role)}` : `Assigned ${roleLabel(row.staff_role)}`,
        providerRole: roleLabel(row.staff_role),
        appointmentType: appointmentTypeLabel(row.appointment_type, row.staff_role),
        bookingDate: row.booking_date,
        bookingTime: row.booking_time,
        status: normalizeStatus(row.status),
        meetingUrl: row.meeting_url || row.room_url || null,
        createdAt: row.created_at,
      }))

      setAppointments([...doctorAppointments, ...staffAppointments].sort(sortAppointments))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load appointments.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadAppointments()
    }, 0)

    return () => window.clearTimeout(timer)
  }, [])

  useEffect(() => {
    setPage(1)
  }, [filter, search])

  const filteredAppointments = useMemo(() => {
    const query = search.trim().toLowerCase()
    return appointments.filter(appointment => {
      const category = getCategory(appointment)
      const matchesFilter = filter === 'all' || category === filter
      if (!matchesFilter) return false
      if (!query) return true

      return [
        appointment.providerName,
        appointment.providerRole,
        appointment.appointmentType,
        appointment.bookingDate || '',
        formatDate(appointment.bookingDate),
      ].some(value => value.toLowerCase().includes(query))
    })
  }, [appointments, filter, search])

  const paginatedAppointments = useMemo(() => {
    const from = (page - 1) * limit
    return filteredAppointments.slice(from, from + limit)
  }, [filteredAppointments, page])

  const counts = useMemo(() => {
    return appointments.reduce<Record<FilterKey, number>>((acc, appointment) => {
      acc.all += 1
      acc[getCategory(appointment)] += 1
      return acc
    }, { all: 0, upcoming: 0, past: 0, cancelled: 0, missed: 0 })
  }, [appointments])

  const handleCancel = async () => {
    if (!cancelTarget || cancelTarget.source !== 'doctor') return
    setCancelling(true)
    try {
      const { data: sessionData } = await supabase.auth.getSession()
      const token = sessionData.session?.access_token
      if (!sessionData.session || !token) throw new Error('Please sign in again.')

      const res = await fetch(`/api/patient/appointments/${cancelTarget.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          patientId: sessionData.session.user.id,
          action: 'cancel_by_patient',
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Unable to cancel appointment.')

      setCancelTarget(null)
      await loadAppointments()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to cancel appointment.')
    } finally {
      setCancelling(false)
    }
  }

  const renderActions = (appointment: AppointmentRecord) => {
    const category = getCategory(appointment)
    const detailsHref = appointment.source === 'doctor' ? `/patient/appointments/${appointment.id}` : '/patient/appointments'

    if (category === 'missed') {
      return (
        <Link href="/patient/consultation" className="rounded-lg bg-[#1A1F36] px-3 py-2 text-xs font-bold text-white">
          Book Follow-up
        </Link>
      )
    }

    if (category === 'past') {
      return (
        <Link href={detailsHref} className="rounded-lg border border-[#1A1F36]/12 px-3 py-2 text-xs font-bold text-[#1A1F36]">
          View Summary
        </Link>
      )
    }

    if (category === 'cancelled') {
      return (
        <Link href={detailsHref} className="rounded-lg border border-[#1A1F36]/12 px-3 py-2 text-xs font-bold text-[#1A1F36]">
          View Details
        </Link>
      )
    }

    return (
      <>
        <Link href={detailsHref} className="rounded-lg border border-[#1A1F36]/12 px-3 py-2 text-xs font-bold text-[#1A1F36]">
          View Details
        </Link>
        {canJoin(appointment) ? (
          <Link
            href={appointment.meetingUrl || '#'}
            target={appointment.source === 'staff' ? '_blank' : undefined}
            className="rounded-lg bg-[#C4622D] px-3 py-2 text-xs font-bold text-white"
          >
            Join Meeting
          </Link>
        ) : (
          <span className="rounded-lg bg-[#E8DED4] px-3 py-2 text-xs font-bold text-[#6B7A90]">
            Opens 15 min before
          </span>
        )}
        {canCancel(appointment) && (
          <button
            type="button"
            onClick={() => setCancelTarget(appointment)}
            className="rounded-lg border border-rose-500/20 px-3 py-2 text-xs font-bold text-rose-600"
          >
            Cancel
          </button>
        )}
      </>
    )
  }

  return (
    <div className="space-y-6 text-[#1A1F36]">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-xl font-bold font-sora">Appointments</h2>
          <p className="text-xs font-medium text-[#8896A4]">Manage appointment records and meeting access.</p>
        </div>
        <Link
          href="/patient/consultation"
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#1A1F36] px-5 py-3 text-sm font-bold text-white"
        >
          <Calendar className="h-4 w-4" />
          Book Follow-up
        </Link>
      </div>

      <div className="rounded-2xl border border-[#1A1F36]/8 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap gap-2">
            {filters.map(item => (
              <button
                key={item.key}
                type="button"
                onClick={() => setFilter(item.key)}
                className={`rounded-xl px-4 py-2 text-xs font-bold transition-colors ${
                  filter === item.key
                    ? 'bg-[#1A1F36] text-white'
                    : 'bg-[#F5F0EB] text-[#40516A] hover:bg-[#E8DED4]'
                }`}
              >
                {item.label} ({counts[item.key]})
              </button>
            ))}
          </div>

          <label className="relative block w-full lg:w-80">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8896A4]" />
            <input
              value={search}
              onChange={event => setSearch(event.target.value)}
              placeholder="Search provider, type, or date"
              className="w-full rounded-xl border border-[#1A1F36]/10 bg-white py-2.5 pl-9 pr-3 text-sm font-semibold outline-none focus:border-[#C4622D]"
            />
          </label>
        </div>
      </div>

      {error && (
        <div className="flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm font-semibold text-rose-700">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      <div className="overflow-hidden rounded-2xl border border-[#1A1F36]/8 bg-white shadow-sm">
        <div className="hidden grid-cols-[1.1fr_1fr_1fr_0.8fr_1.4fr] gap-4 border-b border-[#1A1F36]/8 bg-[#F5F0EB] px-5 py-3 text-xs font-black uppercase tracking-wider text-[#6B7A90] lg:grid">
          <span>Date and Time</span>
          <span>Provider</span>
          <span>Appointment</span>
          <span>Status</span>
          <span>Actions</span>
        </div>

        {loading ? (
          <div className="flex items-center justify-center p-12 text-sm font-semibold text-[#8896A4]">
            Loading appointments...
          </div>
        ) : filteredAppointments.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 p-12 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#F5F0EB] text-[#8896A4]">
              <Calendar className="h-6 w-6" />
            </div>
            <div>
              <h3 className="text-sm font-bold">No appointments found</h3>
              <p className="mt-1 text-xs font-medium text-[#8896A4]">Try another filter or search term.</p>
            </div>
          </div>
        ) : (
          <div className="divide-y divide-[#1A1F36]/8">
            {paginatedAppointments.map(appointment => {
              const category = getCategory(appointment)
              return (
                <div key={`${appointment.source}-${appointment.id}`} className="grid gap-4 px-5 py-5 lg:grid-cols-[1.1fr_1fr_1fr_0.8fr_1.4fr] lg:items-center">
                  <div>
                    <p className="text-sm font-bold">{formatDate(appointment.bookingDate)}</p>
                    <p className="mt-1 text-xs font-semibold text-[#6B7A90]">{appointment.bookingTime || 'Time unavailable'}</p>
                  </div>

                  <div>
                    <p className="text-sm font-bold">{appointment.providerName}</p>
                    <p className="mt-1 text-xs font-semibold text-[#6B7A90]">{appointment.providerRole}</p>
                  </div>

                  <div>
                    <p className="text-sm font-bold">{appointment.appointmentType}</p>
                    <p className="mt-1 inline-flex items-center gap-1 text-xs font-semibold text-[#6B7A90]">
                      <Video className="h-3.5 w-3.5" />
                      Video (Jitsi)
                    </p>
                  </div>

                  <div>
                    <span className={`inline-flex rounded-full px-3 py-1 text-[11px] font-black uppercase tracking-wider ${
                      category === 'upcoming'
                        ? 'bg-[#5C7A6B]/10 text-[#5C7A6B]'
                        : category === 'past'
                          ? 'bg-[#1A1F36]/8 text-[#40516A]'
                          : category === 'missed'
                            ? 'bg-amber-100 text-amber-700'
                            : 'bg-rose-50 text-rose-600'
                    }`}>
                      {titleCase(appointment.status)}
                    </span>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {renderActions(appointment)}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {filteredAppointments.length > limit && (
        <div className="mt-6 flex items-center justify-between">
          <button
            type="button"
            onClick={() => setPage(p => Math.max(p - 1, 1))}
            disabled={page === 1}
            className="rounded-xl border border-[#1A1F36]/10 bg-white px-4 py-2.5 text-xs font-black uppercase tracking-wider text-[#1A1F36] hover:bg-[#F5F0EB] disabled:opacity-50"
          >
            Previous
          </button>
          <span className="text-xs font-bold text-[#6B7A90]">
            Page {page} of {Math.ceil(filteredAppointments.length / limit)}
          </span>
          <button
            type="button"
            onClick={() => setPage(p => Math.min(p + 1, Math.ceil(filteredAppointments.length / limit)))}
            disabled={page >= Math.ceil(filteredAppointments.length / limit)}
            className="rounded-xl border border-[#1A1F36]/10 bg-white px-4 py-2.5 text-xs font-black uppercase tracking-wider text-[#1A1F36] hover:bg-[#F5F0EB] disabled:opacity-50"
          >
            Next
          </button>
        </div>
      )}

      {cancelTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 text-center shadow-2xl">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-rose-50 text-rose-600">
              <AlertCircle className="h-6 w-6" />
            </div>
            <h3 className="mt-4 text-lg font-bold">Cancel appointment?</h3>
            <p className="mt-2 text-sm font-medium text-[#6B7A90]">
              This will cancel your appointment on {formatDate(cancelTarget.bookingDate)} at {cancelTarget.bookingTime}.
            </p>
            <div className="mt-6 flex flex-col gap-2">
              <button
                type="button"
                onClick={handleCancel}
                disabled={cancelling}
                className="rounded-xl bg-rose-600 px-4 py-3 text-xs font-black uppercase tracking-wider text-white disabled:opacity-60"
              >
                {cancelling ? 'Cancelling...' : 'Cancel Appointment'}
              </button>
              <button
                type="button"
                onClick={() => setCancelTarget(null)}
                className="rounded-xl bg-[#F5F0EB] px-4 py-3 text-xs font-black uppercase tracking-wider text-[#1A1F36]"
              >
                Keep Appointment
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
