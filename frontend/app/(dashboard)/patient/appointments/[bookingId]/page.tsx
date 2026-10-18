'use client'

import React, { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, CalendarPlus, Download, ReceiptText, Star, Video } from 'lucide-react'
import { supabase } from '@/lib/supabaseClient'

type AppointmentDetails = {
  bookingId: string
  assignedHealthcareProfessional: string
  specialization: string
  date?: string | null
  time?: string | null
  meetingType: string
  status: string
  rawStatus?: string | null
  appointmentType?: string | null
  consultationStatus?: string | null
  membershipStatus?: string | null
  dashboardAccess?: boolean
  meetingProvider?: string | null
  meetingRoom?: string | null
  roomUrl?: string | null
  callId?: string | null
  callType?: string | null
  paymentAmount: number
  paymentStatus: string
  paymentId?: string | null
  paymentMethod?: string | null
  paymentProvider?: string | null
  paymentDate?: string | null
  freeRescheduleEligible?: boolean
  requiresNewPayment?: boolean
  cancellationReason?: string | null
}

type ConsultationRating = {
  rating: number
  review?: string | null
  created_at?: string | null
  updated_at?: string | null
}

function formatDate(date?: string | null) {
  if (!date) return 'Not set'
  const parsed = new Date(`${date}T00:00:00`)
  if (Number.isNaN(parsed.getTime())) return date
  return parsed.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })
}

function formatTime(time?: string | null) {
  if (!time) return 'Not set'
  const [hourPart, minutePart = '00'] = time.split(':')
  const hours = Number(hourPart)
  if (!Number.isFinite(hours)) return time
  const suffix = hours >= 12 ? 'PM' : 'AM'
  const displayHour = hours % 12 || 12
  return `${String(displayHour).padStart(2, '0')}:${minutePart} ${suffix}`
}

function formatDateTime(value?: string | null) {
  if (!value) return 'Not recorded'
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return value
  return parsed.toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })
}

function buildCalendarUrl(appointment: AppointmentDetails) {
  if (!appointment.date || !appointment.time) return ''
  const start = new Date(`${appointment.date} ${appointment.time}`)
  if (Number.isNaN(start.getTime())) return ''
  const end = new Date(start.getTime() + 30 * 60 * 1000)
  const formatCalendarDate = (date: Date) => date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z'
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: `8Liv Consultation with ${appointment.assignedHealthcareProfessional}`,
    dates: `${formatCalendarDate(start)}/${formatCalendarDate(end)}`,
    details: `Video consultation. Booking ID: ${appointment.bookingId}`
  })
  return `https://calendar.google.com/calendar/render?${params.toString()}`
}

function getAppointmentStart(appointment: AppointmentDetails) {
  if (!appointment.date || !appointment.time) return null
  const parsed = new Date(`${appointment.date} ${appointment.time}`)
  return Number.isNaN(parsed.getTime()) ? null : parsed
}

function formatCountdown(ms: number) {
  if (ms <= 0) return 'Available now'
  const totalMinutes = Math.ceil(ms / 60000)
  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60
  if (hours > 0) return `${hours}h ${minutes}m`
  return `${minutes}m`
}

export default function AppointmentDetailsPage() {
  const params = useParams<{ bookingId: string }>()
  const router = useRouter()
  const bookingId = params.bookingId
  const [appointment, setAppointment] = useState<AppointmentDetails | null>(null)
  const [loading, setLoading] = useState(true)
  const [cancelling, setCancelling] = useState(false)
  const [error, setError] = useState('')
  const [now, setNow] = useState(() => Date.now())
  const [savedRating, setSavedRating] = useState<ConsultationRating | null>(null)
  const [ratingValue, setRatingValue] = useState(0)
  const [ratingReview, setRatingReview] = useState('')
  const [downloadingReceipt, setDownloadingReceipt] = useState(false)

  const handleDownloadReceipt = async () => {
    try {
      setDownloadingReceipt(true)
      const { data: sessionData } = await supabase.auth.getSession()
      const token = sessionData.session?.access_token
      if (!token) throw new Error('Please log in again.')

      const res = await fetch(`/api/patient/appointments/${bookingId}/receipt`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}))
        throw new Error(errData.error || 'Failed to download receipt.')
      }
      const blob = await res.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `8LIV-Receipt-${bookingId.slice(0, 8)}.pdf`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      a.remove()
    } catch (err: any) {
      alert('Could not download receipt: ' + err.message)
    } finally {
      setDownloadingReceipt(false)
    }
  }
  const [ratingLoading, setRatingLoading] = useState(false)
  const [ratingSaving, setRatingSaving] = useState(false)
  const [ratingError, setRatingError] = useState('')
  const [ratingSuccess, setRatingSuccess] = useState('')

  useEffect(() => {
    const loadAppointment = async () => {
      setLoading(true)
      setError('')
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (!session) {
          router.replace('/login')
          return
        }

        const res = await fetch(`/api/patient/appointments/${bookingId}?patientId=${session.user.id}`, {
          headers: {
            Authorization: `Bearer ${session.access_token}`
          }
        })
        const data = await res.json()
        if (!res.ok || data.error) {
          throw new Error(data.details ? `${data.error}: ${data.details}` : data.error || 'Unable to load appointment.')
        }

        setAppointment(data.appointment)
        if (data.appointment?.consultationStatus === 'COMPLETED') {
          setRatingLoading(true)
          const ratingRes = await fetch(`/api/patient/appointments/${bookingId}/rating`, {
            headers: { Authorization: `Bearer ${session.access_token}` }
          })
          const ratingData = await ratingRes.json()
          if (ratingRes.ok && ratingData.rating) {
            setSavedRating(ratingData.rating)
            setRatingValue(Number(ratingData.rating.rating || 0))
            setRatingReview(ratingData.rating.review || '')
          } else if (!ratingRes.ok) {
            setRatingError(ratingData.error || 'Unable to load your rating.')
          }
          setRatingLoading(false)
        }
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Unable to load appointment.'
        setError(message)
      } finally {
        setLoading(false)
      }
    }

    void loadAppointment()
  }, [bookingId, router])

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 30 * 1000)
    return () => window.clearInterval(timer)
  }, [])

  const calendarUrl = useMemo(() => appointment ? buildCalendarUrl(appointment) : '', [appointment])
  const appointmentStart = appointment ? getAppointmentStart(appointment) : null
  const joinWindowOpen = appointmentStart
    ? now >= appointmentStart.getTime() - 15 * 60 * 1000 && now <= appointmentStart.getTime() + 90 * 60 * 1000
    : false
  const consultationCompleted = appointment?.consultationStatus === 'COMPLETED'
  const terminalStatus = ['cancelled_by_doctor', 'cancelled_by_patient', 'missed_by_patient', 'approved', 'rejected', 'completed'].includes(String(appointment?.rawStatus || '').toLowerCase())
  const isInitialConsultation = ['INITIAL_DOCTOR_CONSULTATION', 'INITIAL_CONSULTATION'].includes(String(appointment?.appointmentType || '').toUpperCase())
  const needsMembership = isInitialConsultation && consultationCompleted && appointment?.membershipStatus === 'NOT_SELECTED'
  const needsMembershipPayment = isInitialConsultation && consultationCompleted && appointment?.membershipStatus === 'SELECTED'
  const canReschedule = Boolean(appointment?.freeRescheduleEligible)
  const requiresNewConsultationPayment = Boolean(appointment?.requiresNewPayment)
  const canJoin = Boolean(appointment?.bookingId && joinWindowOpen && !terminalStatus)
  const canCancel = appointment?.status === 'SCHEDULED' && !consultationCompleted
  const joinUnlocksIn = appointmentStart ? formatCountdown(appointmentStart.getTime() - 15 * 60 * 1000 - now) : null

  const handleCancelAppointment = async () => {
    if (!appointment || !confirm('Cancel this consultation appointment?')) return
    setCancelling(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        router.replace('/login')
        return
      }

      const res = await fetch(`/api/patient/appointments/${appointment.bookingId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          patientId: session.user.id,
          action: 'cancel_by_patient'
        })
      })
      const data = await res.json()
      if (!res.ok || data.error) {
        throw new Error(data.error || 'Unable to cancel appointment.')
      }

      window.location.reload()
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unable to cancel appointment.'
      alert(message)
    } finally {
      setCancelling(false)
    }
  }

  const handleSaveRating = async () => {
    if (!appointment || ratingValue < 1 || ratingValue > 5) {
      setRatingError('Choose a star rating before submitting.')
      return
    }
    setRatingSaving(true)
    const isUpdate = Boolean(savedRating)
    setRatingError('')
    setRatingSuccess('')
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        router.replace('/login')
        return
      }
      const res = await fetch(`/api/patient/appointments/${appointment.bookingId}/rating`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ rating: ratingValue, review: ratingReview }),
      })
      const data = await res.json()
      if (!res.ok || data.error) throw new Error(data.error || 'Unable to save your rating.')
      setSavedRating(data.rating)
      setRatingSuccess(isUpdate ? 'Your rating has been updated.' : 'Thank you for rating your doctor.')
    } catch (err: unknown) {
      setRatingError(err instanceof Error ? err.message : 'Unable to save your rating.')
    } finally {
      setRatingSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-[#00A884] border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (error || !appointment) {
    return (
      <div className="space-y-5">
        <Link href="/patient/appointments" className="inline-flex items-center gap-2 text-sm font-bold text-slate-900 hover:text-[#00A884] transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back to appointments
        </Link>
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-rose-700">
          <h2 className="text-lg font-bold">Appointment unavailable</h2>
          <p className="mt-2 text-sm">{error || 'This appointment could not be found.'}</p>
        </div>
      </div>
    )
  }

  const rows = [
    { label: 'Assigned Healthcare Professional', value: appointment.assignedHealthcareProfessional },
    { label: 'Specialization', value: appointment.specialization },
    { label: 'Date', value: formatDate(appointment.date) },
    { label: 'Time', value: formatTime(appointment.time) },
    { label: 'Booking ID', value: appointment.bookingId },
    { label: 'Meeting Type', value: appointment.meetingType },
    { label: 'Meeting Provider', value: appointment.meetingProvider || '8Liv Telehealth (Encrypted Video)' },
    { label: 'Status', value: appointment.status },
    { label: 'Consultation Fee', value: `₹${(appointment.paymentAmount ?? 0).toLocaleString('en-IN')}` },
    { label: 'Payment Status', value: appointment.paymentStatus },
    { label: 'Payment ID', value: appointment.paymentId || 'Not recorded' },
    { label: 'Payment Method', value: appointment.paymentMethod ? appointment.paymentMethod.toUpperCase() : 'Not recorded' },
    { label: 'Payment Date', value: formatDateTime(appointment.paymentDate) },
  ]

  const statusBadgeClass = appointment.status === 'COMPLETED'
    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
    : appointment.status === 'SCHEDULED'
      ? 'bg-teal-50 text-teal-700 border-teal-200'
      : appointment.status.includes('CANCEL') || appointment.status.includes('MISSED')
        ? 'bg-rose-50 text-rose-700 border-rose-200'
        : 'bg-slate-100 text-slate-700 border-slate-200'

  return (
    <div className="space-y-6 text-slate-900">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <Link href="/patient/appointments" className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500 hover:text-slate-900 transition-colors">
            <ArrowLeft className="w-4 h-4" /> Appointments
          </Link>
          <h1 className="mt-3 text-2xl font-bold font-sora text-slate-900">Appointment Details</h1>
          <p className="mt-1 text-sm text-slate-500">Your confirmed consultation and receipt information.</p>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row">
          {calendarUrl && (
            <Link
              href={calendarUrl}
              target="_blank"
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-xs font-bold uppercase tracking-wider text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition-all shadow-sm"
            >
              <CalendarPlus className="w-4 h-4 text-[#00A884]" /> Add Calendar
            </Link>
          )}
          <button
            type="button"
            onClick={handleDownloadReceipt}
            disabled={downloadingReceipt}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-3 text-xs font-bold uppercase tracking-wider text-white hover:bg-slate-800 transition-all shadow-sm cursor-pointer disabled:opacity-50"
          >
            <Download className="w-4 h-4 text-[#00A884]" /> {downloadingReceipt ? 'Generating Receipt...' : 'Download Official Receipt (PDF)'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <section className="lg:col-span-2 rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm">
          <div className="mb-6 flex items-center justify-between gap-4 border-b border-slate-100 pb-5">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Confirmed Consultation</p>
              <h2 className="mt-2 text-xl font-bold text-slate-900">{appointment.assignedHealthcareProfessional}</h2>
              <p className="mt-1 text-sm text-slate-500 font-medium">{appointment.specialization}</p>
            </div>
            <span className={`rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wider border ${statusBadgeClass}`}>
              {appointment.status}
            </span>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {rows.map((row) => (
              <div key={row.label} className="rounded-xl border border-slate-200/70 bg-slate-50/70 p-4 transition-colors hover:bg-slate-50">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{row.label}</p>
                <p className="mt-2 break-words text-sm font-bold text-slate-900">{row.value}</p>
              </div>
            ))}
          </div>
        </section>

        <aside className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-50 text-[#00A884]">
              <ReceiptText className="w-6 h-6" />
            </div>
            <h3 className="mt-4 text-lg font-bold text-slate-900">Receipt</h3>
            <p className="mt-2 text-sm leading-relaxed text-slate-500">
              Payment is recorded as {appointment.paymentStatus}. Use the receipt button to view or save this appointment confirmation.
            </p>

            {appointment.cancellationReason && (
              <div className="mt-5 rounded-xl border border-rose-200/80 bg-rose-50/60 p-4">
                <h4 className="text-sm font-bold text-rose-800">
                  {appointment.status === 'MISSED_BY_PATIENT' ? 'Missed consultation' : 'Reschedule available'}
                </h4>
                <p className="mt-1 text-xs leading-relaxed text-rose-600">
                  {appointment.cancellationReason}
                </p>
                {canReschedule && (
                  <Link
                    href={`/patient/consultation?rescheduleFrom=${encodeURIComponent(appointment.bookingId)}`}
                    className="mt-3 inline-flex w-full items-center justify-center rounded-xl bg-[#00A884] hover:bg-[#008f70] px-4 py-3 text-xs font-bold uppercase tracking-wider text-white transition-all shadow-sm"
                  >
                    Reschedule for Free
                  </Link>
                )}
                {requiresNewConsultationPayment && (
                  <Link
                    href="/patient/consultation"
                    className="mt-3 inline-flex w-full items-center justify-center rounded-xl bg-[#00A884] hover:bg-[#008f70] px-4 py-3 text-xs font-bold uppercase tracking-wider text-white transition-all shadow-sm"
                  >
                    Pay ₹{(appointment.paymentAmount ?? 499).toLocaleString('en-IN')} and Book Again
                  </Link>
                )}
              </div>
            )}

            {needsMembership && (
              <div className="mt-5 rounded-xl border border-teal-200/80 bg-teal-50/60 p-4">
                <h4 className="text-sm font-bold text-teal-900">Consultation completed</h4>
                <p className="mt-1 text-xs leading-relaxed text-teal-700">
                  Choose a membership plan to continue your treatment journey.
                </p>
                <Link
                  href="/plans"
                  className="mt-3 inline-flex w-full items-center justify-center rounded-xl bg-slate-900 hover:bg-slate-800 px-4 py-3 text-xs font-bold uppercase tracking-wider text-white transition-all shadow-sm"
                >
                  Choose Treatment Program
                </Link>
              </div>
            )}

            {needsMembershipPayment && (
              <div className="mt-5 rounded-xl border border-teal-200/80 bg-teal-50/60 p-4">
                <h4 className="text-sm font-bold text-teal-900">Plan selected</h4>
                <p className="mt-1 text-xs leading-relaxed text-teal-700">
                  Complete membership payment to unlock your dashboard.
                </p>
                <Link
                  href="/membership-payment"
                  className="mt-3 inline-flex w-full items-center justify-center rounded-xl bg-slate-900 hover:bg-slate-800 px-4 py-3 text-xs font-bold uppercase tracking-wider text-white transition-all shadow-sm"
                >
                  Complete Plan Payment
                </Link>
              </div>
            )}

            <div className="mt-5 space-y-3 border-t border-slate-100 pt-5">
              <div className="flex justify-between gap-4 text-sm">
                <span className="text-slate-500 font-medium">Amount</span>
                <span className="font-bold text-slate-900">₹{(appointment.paymentAmount ?? 0).toLocaleString('en-IN')}</span>
              </div>
              <div className="flex justify-between gap-4 text-sm">
                <span className="text-slate-500 font-medium">Payment ID</span>
                <span className="text-right font-mono text-xs font-bold text-slate-800">{appointment.paymentId || 'Not recorded'}</span>
              </div>
            </div>
          </div>

          <div className="mt-6">
            <button
              type="button"
              disabled={!canJoin}
              onClick={() => {
                if (canJoin) {
                  router.push(`/patient/consultation/room?id=${encodeURIComponent(appointment.bookingId)}`)
                }
              }}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#00A884] hover:bg-[#008f70] px-4 py-3.5 text-xs font-bold uppercase tracking-wider text-white shadow-sm transition-all disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400 disabled:shadow-none"
            >
              <Video className="w-4 h-4" /> Join Consultation
            </button>

            {terminalStatus ? (
              <p className="mt-3 text-center text-xs font-semibold text-slate-400">
                Join is no longer available for completed, cancelled, or missed consultations.
              </p>
            ) : !canJoin ? (
              <p className="mt-3 text-center text-xs font-semibold text-slate-400">
                Join button will be available 15 minutes before consultation{joinUnlocksIn ? ` (${joinUnlocksIn})` : ''}.
              </p>
            ) : null}

            {canCancel && (
              <button
                type="button"
                onClick={handleCancelAppointment}
                disabled={cancelling}
                className="mt-3 inline-flex w-full items-center justify-center rounded-xl border border-rose-200 px-4 py-3 text-xs font-bold uppercase tracking-wider text-rose-600 hover:bg-rose-50 transition-colors disabled:cursor-not-allowed disabled:opacity-60"
              >
                {cancelling ? 'Cancelling...' : 'Cancel Appointment'}
              </button>
            )}
          </div>
        </aside>
      </div>

      {consultationCompleted && (
        <section className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm">
          <div className="max-w-2xl">
            <p className="text-xs font-bold uppercase tracking-wider text-[#00A884]">Consultation feedback</p>
            <h2 className="mt-2 text-xl font-bold text-slate-900">Rate your doctor</h2>
            <p className="mt-1 text-sm text-slate-500">Your feedback is reviewed by the 8Liv administration team and helps maintain care quality.</p>

            {ratingLoading ? (
              <p className="mt-5 text-sm font-semibold text-slate-400">Loading your feedback...</p>
            ) : (
              <div className="mt-5 space-y-4">
                <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Doctor rating">
                  {[1, 2, 3, 4, 5].map(value => (
                    <button
                      key={value}
                      type="button"
                      role="radio"
                      aria-checked={ratingValue === value}
                      aria-label={`${value} star${value === 1 ? '' : 's'}`}
                      onClick={() => { setRatingValue(value); setRatingError(''); setRatingSuccess('') }}
                      className="rounded-xl border border-slate-200 bg-slate-50 p-3 transition hover:-translate-y-0.5 hover:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-400/30"
                    >
                      <Star className={`h-7 w-7 ${value <= ratingValue ? 'fill-amber-400 text-amber-400' : 'text-slate-300'}`} />
                    </button>
                  ))}
                </div>
                <p className="text-xs font-bold text-slate-600">{ratingValue ? `${ratingValue} out of 5` : 'Select a rating'}</p>
                <textarea
                  value={ratingReview}
                  onChange={event => setRatingReview(event.target.value.slice(0, 1000))}
                  rows={4}
                  placeholder="Share an optional comment about your consultation"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm font-medium outline-none transition focus:border-[#00A884] focus:bg-white focus:ring-4 focus:ring-[#00A884]/10"
                />
                <div className="flex items-center justify-between gap-4 text-xs font-semibold text-slate-400">
                  <span>{ratingReview.length}/1000</span>
                  {savedRating?.updated_at && <span>Last updated {formatDateTime(savedRating.updated_at)}</span>}
                </div>
                {ratingError && <p className="rounded-xl bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">{ratingError}</p>}
                {ratingSuccess && <p className="rounded-xl bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">{ratingSuccess}</p>}
                <button
                  type="button"
                  disabled={ratingSaving || ratingValue === 0}
                  onClick={handleSaveRating}
                  className="rounded-xl bg-slate-900 px-6 py-3 text-xs font-bold uppercase tracking-wider text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {ratingSaving ? 'Saving...' : savedRating ? 'Update Rating' : 'Submit Rating'}
                </button>
              </div>
            )}
          </div>
        </section>
      )}
    </div>
  )
}
