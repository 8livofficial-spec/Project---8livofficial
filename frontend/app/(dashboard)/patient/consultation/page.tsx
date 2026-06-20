'use client'

import React, { useState, useEffect, useMemo, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Video, PhoneCall, Lock, Shield, CheckCircle, MapPin, Users, CreditCard, Smartphone, Building2, AlertCircle, CalendarPlus, Sun, CloudSun, Moon, Clock, CalendarDays } from 'lucide-react'
import { usePatientData } from '@/hooks/usePatientData'
import { supabase } from '@/lib/supabaseClient'

const CONSULTATION_FEE = 499
const SESSION_EXPIRED = 'SESSION_EXPIRED'

async function patientFetch(input: RequestInfo | URL, init: RequestInit = {}) {
  const { data: sessionData } = await supabase.auth.getSession()
  const token = sessionData.session?.access_token
  if (!token) throw new Error(SESSION_EXPIRED)

  const request = (accessToken: string) => fetch(input, {
    ...init,
    headers: {
      ...init.headers,
      Authorization: `Bearer ${accessToken}`,
    },
  })

  const response = await request(token)
  if (response.status !== 401) return response

  const { data: refreshed, error } = await supabase.auth.refreshSession()
  const refreshedToken = refreshed.session?.access_token
  if (error || !refreshedToken) {
    await supabase.auth.signOut()
    throw new Error(SESSION_EXPIRED)
  }

  const retriedResponse = await request(refreshedToken)
  if (retriedResponse.status === 401) {
    await supabase.auth.signOut()
    throw new Error(SESSION_EXPIRED)
  }
  return retriedResponse
}

type AvailableDoctorSlot = {
  slotId?: string
  providerId?: string
  providerRole?: string
  date?: string
  startTime?: string
  endTime?: string
  status?: string
  source?: string
  available_date: string
  time_slot: string
  available_count?: number
}

type PaymentMethod = 'upi' | 'card' | 'netbanking'
type PaymentStage = 'method' | 'assigning' | 'confirmed'
type AssignmentDetails = {
  consultationId: string
  bookingId?: string
  paymentId?: string
  paymentAmount?: number
  paymentStatus?: string
  appointmentStatus?: string
  doctorName: string
  specialty: string
  bookingDate: string
  bookingTime: string
  meetingType: string
}

// Design System Tokens
const designTokens = {
  colors: {
    primary: '#1A1F36',
    primaryHover: '#0D101C',
    secondary: '#C4622D',
    success: '#5C7A6B',
    background: '#F5F0EB',
    surface: '#FFFFFF',
    border: 'rgba(26, 31, 54, 0.08)',
    textPrimary: '#1A1F36',
    textSecondary: '#40516A',
    textTertiary: '#8896A4',
  },
  borderRadius: {
    sm: '0.5rem',
    md: '0.75rem',
    lg: '1rem',
    xl: '1.25rem',
    '2xl': '1.5rem',
  },
  spacing: {
    xs: '0.25rem',
    sm: '0.5rem',
    md: '1rem',
    lg: '1.5rem',
    xl: '2rem',
    '2xl': '2.5rem',
    '3xl': '3rem',
  },
  shadows: {
    sm: '0 1px 3px 0 rgba(26, 31, 54, 0.08), 0 1px 2px 0 rgba(26, 31, 54, 0.04)',
    md: '0 4px 14px -2px rgba(26, 31, 54, 0.08)',
    lg: '0 18px 40px -18px rgba(26, 31, 54, 0.22)',
  },
}

function formatSlotTime(time: string) {
  const [hourPart, minutePart = '00'] = time.split(':')
  const hours = Number(hourPart)
  if (!Number.isFinite(hours)) return time
  const suffix = hours >= 12 ? 'PM' : 'AM'
  const displayHour = hours % 12 || 12
  return `${String(displayHour).padStart(2, '0')}:${minutePart} ${suffix}`
}

function formatSlotDate(date: string, long = false) {
  const parsed = new Date(`${date}T00:00:00`)
  if (Number.isNaN(parsed.getTime())) return date
  return parsed.toLocaleDateString('en-US', long
    ? { day: 'numeric', month: 'long', year: 'numeric' }
    : { weekday: 'short', month: 'short', day: 'numeric' }
  )
}
function getDateHeading(date: string) {
  const today = new Date()
  const tomorrow = new Date()
  tomorrow.setDate(today.getDate() + 1)
  const target = new Date(`${date}T00:00:00`)
  const sameDay = (a: Date, b: Date) => a.toDateString() === b.toDateString()
  if (sameDay(target, today)) return 'Today'
  if (sameDay(target, tomorrow)) return 'Tomorrow'
  return formatSlotDate(date)
}

function getDateParts(date: string) {
  const parsed = new Date(`${date}T00:00:00`)
  if (Number.isNaN(parsed.getTime())) {
    return { weekday: date, day: '' }
  }

  return {
    weekday: parsed.toLocaleDateString('en-US', { weekday: 'short' }),
    day: parsed.toLocaleDateString('en-US', { day: '2-digit' }),
  }
}

function getSlotPeriod(time: string): 'morning' | 'afternoon' | 'evening' {
  const hour = Number(time.split(':')[0])
  if (hour < 12) return 'morning'
  if (hour < 17) return 'afternoon'
  return 'evening'
}

const periodMeta = {
  morning: { label: 'Morning', icon: Sun },
  afternoon: { label: 'Afternoon', icon: CloudSun },
  evening: { label: 'Evening', icon: Moon },
}

export default function ConsultationSchedulingPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { reloadData, onboardingState, loading: patientDataLoading } = usePatientData()
  const reusePaymentFromBookingId = searchParams.get('rescheduleFrom') || ''
  const isActiveMemberFollowUp = onboardingState.membershipStatus === 'ACTIVE' && onboardingState.firstConsultationCompleted === true

  const [availableDates, setAvailableDates] = useState<string[]>([])
  const [selectedDateSlots, setSelectedDateSlots] = useState<AvailableDoctorSlot[]>([])
  const [selectedDate, setSelectedDate] = useState('')
  const [slotsLoading, setSlotsLoading] = useState(true)
  const [dateSlotsLoading, setDateSlotsLoading] = useState(false)
  const [loading, setLoading] = useState(false)
  const [paymentOpen, setPaymentOpen] = useState(false)
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('upi')
  const [paymentStage, setPaymentStage] = useState<PaymentStage>('method')
  const [paymentError, setPaymentError] = useState('')
  const [assignment, setAssignment] = useState<AssignmentDetails | null>(null)

  if (patientDataLoading) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center text-[#C4622D]">
        <div className="w-10 h-10 border-4 border-current border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }
  const [selectedSlot, setSelectedSlot] = useState<AvailableDoctorSlot | null>(null)

  // Real-time calling alert state
  const [doctorCallingAlert, setDoctorCallingAlert] = useState<{ roomUrl: string; consultationId: string } | null>(null)

  const selectableDates = useMemo(() => {
    return [...availableDates].sort((a, b) => {
      return new Date(`${a}T00:00:00`).getTime() - new Date(`${b}T00:00:00`).getTime()
    })
  }, [availableDates])

  const groupedSlots = useMemo(() => {
    const sorted = [...selectedDateSlots].sort((a, b) => {
      const aTime = new Date(`${a.available_date} ${a.time_slot}`).getTime()
      const bTime = new Date(`${b.available_date} ${b.time_slot}`).getTime()
      return aTime - bTime
    })

    return sorted.reduce<Record<'morning' | 'afternoon' | 'evening', AvailableDoctorSlot[]>>((acc, slot) => {
      const period = getSlotPeriod(slot.time_slot)
      acc[period].push(slot)
      return acc
    }, { morning: [], afternoon: [], evening: [] })
  }, [selectedDateSlots])

  const loadSlotsForDate = useCallback(async (date: string) => {
    if (!date) {
      setSelectedDateSlots([])
      return
    }

    setDateSlotsLoading(true)
    try {
      const params = new URLSearchParams({ role: 'DOCTOR', date })
      const res = await patientFetch(`/api/appointments/available-slots?${params.toString()}`)
      const data = await res.json()
      if (!res.ok || data.error) {
        throw new Error(data.error || 'Failed to load slots for selected date')
      }

      const uniqueTimes = new Map<string, AvailableDoctorSlot>()
      for (const slot of data.slots || []) {
        const mapped: AvailableDoctorSlot = {
          ...slot,
          available_date: slot.date,
          time_slot: slot.startTime,
        }
        if (!uniqueTimes.has(mapped.time_slot)) uniqueTimes.set(mapped.time_slot, mapped)
      }
      setSelectedDateSlots(Array.from(uniqueTimes.values()))
    } catch (err) {
      if (err instanceof Error && err.message === SESSION_EXPIRED) {
        router.replace('/login')
        return
      }
      console.error('Failed to load slots for selected date:', err)
      setSelectedDateSlots([])
    } finally {
      setDateSlotsLoading(false)
    }
  }, [router])

  const loadAvailableSlots = useCallback(async () => {
    setSlotsLoading(true)
    try {
      const params = new URLSearchParams({ role: 'DOCTOR' })
      const res = await patientFetch(`/api/appointments/available-dates?${params.toString()}`)
      const data = await res.json()
      if (!res.ok || data.error) {
        throw new Error(data.error || 'Failed to load available slots')
      }

      const dates = ((data.dates || []) as Array<{ date: string }>).map(item => item.date).sort((a, b) => {
        return new Date(`${a}T00:00:00`).getTime() - new Date(`${b}T00:00:00`).getTime()
      })
      setAvailableDates(dates)

      if (dates.length > 0) {
        const nextDate = dates[0]
        setSelectedSlot(null)
        setSelectedDate(nextDate)
        await loadSlotsForDate(nextDate)
      } else {
        setSelectedSlot(null)
        setSelectedDate('')
        setSelectedDateSlots([])
      }
    } catch (err) {
      if (err instanceof Error && err.message === SESSION_EXPIRED) {
        router.replace('/login')
        return
      }
      console.error('Failed to load available doctor slots:', err)
    } finally {
      setSlotsLoading(false)
    }
  }, [loadSlotsForDate, router])

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadAvailableSlots()
    }, 0)

    return () => window.clearTimeout(timer)
  }, [loadAvailableSlots])

  // Real-time: Listen for doctor calling
  useEffect(() => {
    let channel: ReturnType<typeof supabase.channel> | null = null
    let active = true

    const setupRealtime = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session || !active) return

      const patientId = session.user.id
      const channelName = `patient-call-alert-${patientId}`

      const existingChannel = supabase.getChannels().find((channel) => {
        const cachedChannel = channel as { topic?: string; name?: string }
        return cachedChannel.topic === channelName || cachedChannel.name === channelName
      })
      if (existingChannel) {
        await supabase.removeChannel(existingChannel)
      }

      if (!active) return

      channel = supabase
        .channel(channelName)
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'doctor_consultations',
            filter: `patient_id=eq.${patientId}`,
          },
          (payload) => {
            const updated = payload.new as { id?: string; room_url?: string; status?: string }
            if (updated.status === 'calling' && updated.room_url && updated.id) {
              setDoctorCallingAlert({ roomUrl: updated.room_url, consultationId: updated.id })
            } else if (updated.status === 'attended' || updated.status === 'completed') {
              setDoctorCallingAlert(null)
            }
          }
        )

      channel.subscribe()
    }

    setupRealtime()

    return () => {
      active = false
      if (channel) supabase.removeChannel(channel)
    }
  }, [])

  const handleConfirmBooking = async () => {
    if (!selectedSlot) {
      alert("Please select a consultation time first.")
      return
    }

    if (reusePaymentFromBookingId || isActiveMemberFollowUp) {
      void handlePaidBooking()
      return
    }

    setPaymentError('')
    setPaymentStage('method')
    setPaymentOpen(true)
  }

  const handlePaidBooking = async () => {
    if (!selectedSlot) {
      setPaymentError('Please select a consultation time before payment.')
      setPaymentStage('method')
      return
    }

    setLoading(true)
    setPaymentError('')
    setPaymentStage('assigning')
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) throw new Error(SESSION_EXPIRED)

      const res = await patientFetch('/api/patient/consultations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          patientId: session.user.id,
          paymentMethod: isActiveMemberFollowUp ? undefined : paymentMethod,
          reusePaymentFromBookingId: reusePaymentFromBookingId || undefined,
          selectedDate: selectedSlot.available_date,
          selectedTime: selectedSlot.time_slot
        })
      })

      const data = await res.json()
      if (!res.ok || data.error) {
        throw new Error(data.error || 'Failed to book consultation slot')
      }

      setAssignment(data.assignment || null)
      setPaymentStage('confirmed')
      await reloadData()
      await loadAvailableSlots()
      router.replace(`/patient/appointments/${data.bookingId || data.assignment?.bookingId || data.assignment?.consultationId}`)
    } catch (err: unknown) {
      if (err instanceof Error && err.message === SESSION_EXPIRED) {
        router.replace('/login')
        return
      }
      const message = err instanceof Error ? err.message : 'Unable to schedule consultation.'
      setPaymentError(message)
      setPaymentStage('method')
      if (reusePaymentFromBookingId) {
        alert(message)
      }
    } finally {
      setLoading(false)
    }
  }

  const handleAddToCalendar = () => {
    if (!assignment) return
    const start = new Date(`${assignment.bookingDate} ${assignment.bookingTime}`)
    const end = new Date(start.getTime() + 30 * 60 * 1000)
    const formatCalendarDate = (date: Date) => date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z'
    const params = new URLSearchParams({
      action: 'TEMPLATE',
      text: `8Liv Consultation with ${assignment.doctorName}`,
      dates: `${formatCalendarDate(start)}/${formatCalendarDate(end)}`,
      details: 'Video consultation. The session length depends on your discussion with the doctor. Join from your 8Liv dashboard.'
    })
    window.open(`https://calendar.google.com/calendar/render?${params.toString()}`, '_blank')
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: designTokens.colors.background }}>
      {/* Real-time Doctor Calling Alert */}
      {doctorCallingAlert && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setDoctorCallingAlert(null)} />
          <div
            className="relative bg-white rounded-2xl p-8 max-w-sm w-full shadow-2xl animate-in fade-in zoom-in-95"
            style={{ backgroundColor: designTokens.colors.surface }}
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-[#C4622D]/10 rounded-full blur-3xl" />
            <div className="relative space-y-6 text-center">
              <div className="w-20 h-20 mx-auto rounded-full flex items-center justify-center animate-pulse" style={{ backgroundColor: `${designTokens.colors.primary}15` }}>
                <PhoneCall className="w-10 h-10" style={{ color: designTokens.colors.primary }} />
              </div>
              <div>
                <span className="text-xs font-semibold uppercase tracking-wider px-3 py-1 rounded-full inline-block" style={{ backgroundColor: `${designTokens.colors.primary}10`, color: designTokens.colors.primary }}>
                  Incoming Call
                </span>
                <h3 className="text-2xl font-bold mt-4" style={{ color: designTokens.colors.textPrimary }}>
                  Your Doctor is Ready
                </h3>
                <p className="text-sm mt-2" style={{ color: designTokens.colors.textSecondary }}>
                  Your consultation session is starting now. Click below to join.
                </p>
              </div>
              <div className="flex flex-col gap-3 pt-4">
                <button
                  onClick={() => {
                    router.push(`/patient/consultation/room?id=${encodeURIComponent(doctorCallingAlert.roomUrl)}`)
                    setDoctorCallingAlert(null)
                  }}
                  className="w-full py-3 px-4 rounded-lg font-semibold text-white transition-all flex items-center justify-center gap-2"
                  style={{ backgroundColor: designTokens.colors.primary }}
                >
                  <Video className="w-5 h-5" /> Join Now
                </button>
                <button
                  onClick={() => setDoctorCallingAlert(null)}
                  className="text-sm font-medium"
                  style={{ color: designTokens.colors.textSecondary }}
                >
                  I&apos;ll join in a moment
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {paymentOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-950/40 backdrop-blur-sm" onClick={() => !loading && setPaymentOpen(false)} />
          <div className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl border" style={{ borderColor: designTokens.colors.border }}>
            {paymentStage === 'method' && (
              <>
                <div className="flex items-start justify-between gap-4 mb-6">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wider" style={{ color: designTokens.colors.textTertiary }}>
                      Consultation Fee
                    </p>
                    <h3 className="text-xl font-bold mt-1" style={{ color: designTokens.colors.textPrimary }}>
                      Confirm your selected consultation time
                    </h3>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold" style={{ color: designTokens.colors.primary }}>
                      INR {CONSULTATION_FEE}
                    </p>
                    <p className="text-xs" style={{ color: designTokens.colors.textTertiary }}>
                      Razorpay simulated
                    </p>
                  </div>
                </div>

                <div className="rounded-xl p-4 mb-5" style={{ backgroundColor: designTokens.colors.background }}>
                  <p className="text-sm font-semibold" style={{ color: designTokens.colors.textPrimary }}>
                    After payment, we will reserve your selected time and assign the best available specialist.
                  </p>
                  <p className="text-xs mt-1" style={{ color: designTokens.colors.textSecondary }}>
                    You choose the time. 8Liv handles specialist matching and workload balancing behind the scenes.
                  </p>
                </div>

                <div className="mb-5">
                  <p className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: designTokens.colors.textTertiary }}>
                    Payment Method
                  </p>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { key: 'upi' as PaymentMethod, label: 'UPI', icon: Smartphone },
                      { key: 'card' as PaymentMethod, label: 'Card', icon: CreditCard },
                      { key: 'netbanking' as PaymentMethod, label: 'NetBanking', icon: Building2 },
                    ].map(({ key, label, icon: Icon }) => {
                      const selected = paymentMethod === key
                      return (
                        <button
                          key={key}
                          type="button"
                          onClick={() => setPaymentMethod(key)}
                          className="h-20 rounded-xl border-2 text-xs font-bold flex flex-col items-center justify-center gap-2 transition-all"
                          style={{
                            borderColor: selected ? designTokens.colors.primary : designTokens.colors.border,
                            color: selected ? designTokens.colors.primary : designTokens.colors.textSecondary,
                            backgroundColor: selected ? `${designTokens.colors.primary}10` : designTokens.colors.surface
                          }}
                        >
                          <Icon className="w-5 h-5" />
                          {label}
                        </button>
                      )
                    })}
                  </div>
                </div>

                {paymentError && (
                  <div className="flex items-start gap-2 rounded-xl p-3 mb-5 bg-red-50 text-red-700 text-sm">
                    <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                    <span>{paymentError}</span>
                  </div>
                )}

                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setPaymentOpen(false)}
                    disabled={loading}
                    className="flex-1 py-3 rounded-xl font-bold border disabled:opacity-50"
                    style={{ borderColor: designTokens.colors.border, color: designTokens.colors.textSecondary }}
                  >
                    Back
                  </button>
                  <button
                    type="button"
                    onClick={handlePaidBooking}
                    disabled={loading}
                    className="flex-[1.4] py-3 rounded-xl font-bold text-white disabled:opacity-50 flex items-center justify-center gap-2"
                    style={{ backgroundColor: designTokens.colors.primary }}
                  >
                    <Lock className="w-4 h-4" />
                    Pay INR {CONSULTATION_FEE}
                  </button>
                </div>
              </>
            )}

            {paymentStage === 'assigning' && (
              <div className="text-center py-8">
                <div className="w-16 h-16 mx-auto rounded-full flex items-center justify-center mb-5" style={{ backgroundColor: `${designTokens.colors.success}12` }}>
                  <CheckCircle className="w-9 h-9" style={{ color: designTokens.colors.success }} />
                </div>
                <h3 className="text-2xl font-bold" style={{ color: designTokens.colors.textPrimary }}>
                  Payment Successful
                </h3>
                <p className="text-sm mt-2" style={{ color: designTokens.colors.textSecondary }}>
                  Reserving your selected time and assigning the best available specialist.
                </p>
                <div className="w-10 h-10 border-4 border-[#F5F0EB] border-t-[#C4622D] rounded-full animate-spin mx-auto mt-6" />
              </div>
            )}

            {paymentStage === 'confirmed' && assignment && (
              <div className="space-y-5">
                <div className="text-center">
                  <div className="w-16 h-16 mx-auto rounded-full flex items-center justify-center mb-4" style={{ backgroundColor: `${designTokens.colors.success}12` }}>
                    <CheckCircle className="w-9 h-9" style={{ color: designTokens.colors.success }} />
                  </div>
                  <h3 className="text-xl font-bold" style={{ color: designTokens.colors.textPrimary }}>
                    Appointment Confirmed
                  </h3>
                  <p className="text-sm mt-2" style={{ color: designTokens.colors.textSecondary }}>
                    Your consultation has been successfully scheduled. You will receive reminders before your appointment.
                  </p>
                </div>

                <div className="rounded-xl p-4 space-y-3" style={{ backgroundColor: designTokens.colors.background }}>
                  {[
                    { label: 'Assigned Healthcare Professional', value: assignment.doctorName },
                    { label: 'Specialization', value: assignment.specialty },
                    { label: 'Date', value: formatSlotDate(assignment.bookingDate, true) },
                    { label: 'Time', value: formatSlotTime(assignment.bookingTime) },
                    { label: 'Booking ID', value: assignment.bookingId || assignment.consultationId },
                    { label: 'Meeting Type', value: assignment.meetingType },
                    { label: 'Status', value: assignment.appointmentStatus || 'SCHEDULED' },
                    { label: 'Payment Amount', value: `INR ${(assignment.paymentAmount || CONSULTATION_FEE).toLocaleString('en-IN')}` },
                    { label: 'Payment Status', value: assignment.paymentStatus || 'PAID' },
                    { label: 'Payment ID', value: assignment.paymentId || 'Recorded' },
                  ].map((row) => (
                    <div key={row.label} className="flex justify-between gap-4 text-sm">
                      <span style={{ color: designTokens.colors.textSecondary }}>{row.label}</span>
                      <span className="font-semibold text-right" style={{ color: designTokens.colors.textPrimary }}>{row.value}</span>
                    </div>
                  ))}
                </div>

                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setPaymentOpen(false)
                      router.push(`/patient/appointments/${assignment.bookingId || assignment.consultationId}`)
                    }}
                    className="flex-1 py-3 rounded-xl font-bold text-white"
                    style={{ backgroundColor: designTokens.colors.primary }}
                  >
                    View Appointment
                  </button>
                  <button
                    type="button"
                    onClick={handleAddToCalendar}
                    className="flex-1 py-3 rounded-xl font-bold border flex items-center justify-center gap-2"
                    style={{ borderColor: designTokens.colors.border, color: designTokens.colors.textPrimary }}
                  >
                    <CalendarPlus className="w-4 h-4" />
                    Add Calendar
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="mb-12">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold" style={{ color: designTokens.colors.textPrimary }}>
                Choose Your Preferred Consultation Time
              </h1>
                <p className="text-base mt-2" style={{ color: designTokens.colors.textSecondary }}>
                {reusePaymentFromBookingId
                  ? 'Choose a new consultation slot. Your eligible consultation payment will be reused.'
                  : isActiveMemberFollowUp
                    ? 'Select a follow-up time that fits your schedule. Your active membership covers this consultation.'
                  : 'Select a consultation time that fits your schedule. We&apos;ll automatically assign the best available specialist for your chosen time.'}
              </p>
            </div>
          </div>
        </div>

        {/* Specialist Assignment Card */}
        <div className="mb-8 rounded-2xl p-6 border-2" style={{ backgroundColor: designTokens.colors.surface, borderColor: designTokens.colors.border }}>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
            <div>
              <div className="flex items-center gap-3 mb-3">
                <div className="w-12 h-12 rounded-full flex items-center justify-center font-bold text-white" style={{ backgroundColor: designTokens.colors.primary }}>
                  AD
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: designTokens.colors.textTertiary }}>
                    Automatic Specialist Assignment
                  </p>
                  <h3 className="text-lg font-bold" style={{ color: designTokens.colors.textPrimary }}>
                    You choose the time
                  </h3>
                </div>
              </div>
              <p className="text-sm" style={{ color: designTokens.colors.textSecondary }}>
                Doctor names and photos are hidden during booking. Once you confirm a time, 8Liv reserves that slot and assigns the best available healthcare professional.
              </p>
            </div>

            <div className="text-center">
                <Video className="w-6 h-6 mx-auto mb-1" style={{ color: designTokens.colors.primary }} />
                <p className="text-xs" style={{ color: designTokens.colors.textSecondary }}>Video Call</p>
            </div>
          </div>
        </div>

        {/* Main Booking Layout - Two Column on Desktop */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-12">
          <div className="lg:col-span-2 rounded-2xl p-8 border-2" style={{ backgroundColor: designTokens.colors.surface, borderColor: designTokens.colors.border }}>
            <div className="flex items-start justify-between gap-4 mb-8">
              <div>
                <h2 className="text-xl font-bold" style={{ color: designTokens.colors.textPrimary }}>
                  Available Consultation Times
                </h2>
                <p className="text-sm max-w-2xl mt-2" style={{ color: designTokens.colors.textSecondary }}>
                  Choose a time that works for you. Booked and unavailable slots are hidden automatically.
                </p>
              </div>
              <Clock className="w-6 h-6 shrink-0" style={{ color: designTokens.colors.secondary }} />
            </div>

            {slotsLoading ? (
              <div className="flex items-center gap-3 rounded-xl p-5 border" style={{ borderColor: designTokens.colors.border }}>
                <div className="w-8 h-8 border-4 border-[#F5F0EB] border-t-[#C4622D] rounded-full animate-spin" />
                <p className="text-sm font-semibold" style={{ color: designTokens.colors.textSecondary }}>
                  Checking available consultation dates...
                </p>
              </div>
            ) : selectableDates.length > 0 ? (
              <div className="space-y-6">
                <div>
                  <div className="mb-3 flex items-center gap-2">
                    <CalendarDays className="w-4 h-4" style={{ color: designTokens.colors.secondary }} />
                    <p className="text-xs font-bold uppercase tracking-wider" style={{ color: designTokens.colors.textSecondary }}>
                      Select Consultation Date
                    </p>
                  </div>
                  <div className="flex gap-3 overflow-x-auto pb-2">
                    {selectableDates.map((date) => {
                      const selected = selectedDate === date
                      const parts = getDateParts(date)
                      return (
                        <button
                          key={date}
                          type="button"
                          onClick={() => {
                            setSelectedSlot(null)
                            setSelectedDate(date)
                            void loadSlotsForDate(date)
                          }}
                          className="min-w-24 rounded-2xl border-2 px-4 py-3 text-center transition-all duration-200 hover:-translate-y-0.5"
                          style={{
                            borderColor: selected ? designTokens.colors.primary : designTokens.colors.border,
                            backgroundColor: selected ? designTokens.colors.primary : designTokens.colors.surface,
                            color: selected ? '#FFFFFF' : designTokens.colors.textPrimary,
                            boxShadow: selected ? designTokens.shadows.md : 'none'
                          }}
                        >
                          <span className="block text-xs font-bold">{getDateHeading(date)}</span>
                          <span className="block text-2xl font-bold leading-tight mt-1">{parts.day}</span>
                          <span className="block text-[11px] font-semibold opacity-75">{parts.weekday}</span>
                        </button>
                      )
                    })}
                  </div>
                </div>

                <div className="rounded-2xl border p-5" style={{ borderColor: designTokens.colors.border, backgroundColor: `${designTokens.colors.background}70` }}>
                  <div className="mb-5">
                    <h3 className="text-lg font-bold" style={{ color: designTokens.colors.textPrimary }}>
                      {selectedDate ? getDateHeading(selectedDate) : 'Selected Date'}
                    </h3>
                    <p className="text-xs font-semibold mt-1" style={{ color: designTokens.colors.textTertiary }}>
                      {selectedDate ? formatSlotDate(selectedDate, true) : 'Choose a date above'}
                    </p>
                  </div>

                  {dateSlotsLoading ? (
                    <div className="flex items-center gap-3 rounded-xl p-5 border bg-white" style={{ borderColor: designTokens.colors.border }}>
                      <div className="w-7 h-7 border-4 border-[#F5F0EB] border-t-[#C4622D] rounded-full animate-spin" />
                      <p className="text-sm font-semibold" style={{ color: designTokens.colors.textSecondary }}>
                        Loading available slots for this date...
                      </p>
                    </div>
                  ) : selectedDateSlots.length > 0 ? (
                    <div className="space-y-5">
                      {(['morning', 'afternoon', 'evening'] as const).map((period) => {
                        const slots = groupedSlots[period]
                        if (slots.length === 0) return null
                        const Icon = periodMeta[period].icon
                        return (
                          <div key={period}>
                            <div className="flex items-center gap-2 mb-3">
                              <Icon className="w-4 h-4" style={{ color: designTokens.colors.secondary }} />
                              <p className="text-xs font-bold uppercase tracking-wider" style={{ color: designTokens.colors.textSecondary }}>
                                {periodMeta[period].label}
                              </p>
                            </div>
                            <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3">
                              {slots.map((slot) => {
                                const selected = selectedSlot?.available_date === slot.available_date && selectedSlot?.time_slot === slot.time_slot
                                return (
                                  <button
                                    key={`${slot.available_date}-${slot.time_slot}`}
                                    type="button"
                                    onClick={() => setSelectedSlot(slot)}
                                    className="rounded-2xl border-2 px-4 py-4 text-left transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md"
                                    style={{
                                      borderColor: selected ? designTokens.colors.primary : designTokens.colors.border,
                                      backgroundColor: selected ? `${designTokens.colors.primary}10` : designTokens.colors.surface,
                                      color: selected ? designTokens.colors.primary : designTokens.colors.textPrimary,
                                      boxShadow: selected ? designTokens.shadows.md : 'none'
                                    }}
                                  >
                                    <span className="block text-base font-bold">{formatSlotTime(slot.time_slot)}</span>
                                    <span className="block text-[11px] font-semibold mt-1" style={{ color: designTokens.colors.textTertiary }}>
                                      Video consultation
                                    </span>
                                  </button>
                                )
                              })}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  ) : (
                    <div className="rounded-xl p-5 border border-dashed text-center bg-white" style={{ borderColor: designTokens.colors.border }}>
                      <h3 className="text-base font-bold" style={{ color: designTokens.colors.textPrimary }}>
                        No slots available on this date.
                      </h3>
                      <p className="text-sm mt-2" style={{ color: designTokens.colors.textSecondary }}>
                        Please choose another available date above.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="rounded-xl p-5 border border-dashed text-center" style={{ borderColor: designTokens.colors.border }}>
                <h3 className="text-base font-bold" style={{ color: designTokens.colors.textPrimary }}>
                  No consultation times are currently available.
                </h3>
                <p className="text-sm mt-2" style={{ color: designTokens.colors.textSecondary }}>
                  You can join the waiting list, request a callback, or check again for future availability.
                </p>
              </div>
            )}
          </div>
          {/* Right: Sticky Summary Card */}
          <div className="lg:col-span-1">
            <div className="sticky top-8 rounded-2xl p-6 border-2 space-y-6" style={{ backgroundColor: designTokens.colors.surface, borderColor: designTokens.colors.border }}>
              <h3 className="font-bold text-lg" style={{ color: designTokens.colors.textPrimary }}>
                Booking Summary
              </h3>

              {/* Summary Details */}
              <div className="space-y-4">
                <div className="pb-4 border-b-2" style={{ borderColor: designTokens.colors.border }}>
                  <p className="text-xs font-semibold uppercase" style={{ color: designTokens.colors.textTertiary }}>
                    Selected Consultation
                  </p>
                  <p className="text-base font-bold mt-2" style={{ color: designTokens.colors.textPrimary }}>
                    {selectedSlot ? formatSlotDate(selectedSlot.available_date, true) : 'Not selected'}
                  </p>
                  <p className="text-sm mt-1" style={{ color: designTokens.colors.textSecondary }}>
                    {selectedSlot ? formatSlotTime(selectedSlot.time_slot) : 'Choose an available time'}
                  </p>
                </div>

                <div className="pb-4 border-b-2" style={{ borderColor: designTokens.colors.border }}>
                  <p className="text-xs font-semibold uppercase" style={{ color: designTokens.colors.textTertiary }}>
                    Type
                  </p>
                  <div className="flex items-center gap-2 mt-2">
                    <Video className="w-4 h-4" style={{ color: designTokens.colors.primary }} />
                    <span className="font-semibold" style={{ color: designTokens.colors.textPrimary }}>
                      Video Consultation
                    </span>
                  </div>
                </div>

                <div>
                  <p className="text-xs font-semibold uppercase" style={{ color: designTokens.colors.textTertiary }}>
                    Healthcare Professional
                  </p>
                  <p className="font-semibold mt-2" style={{ color: designTokens.colors.textPrimary }}>
                    Automatically Assigned
                  </p>
                </div>

                <div className="pt-4 border-t-2" style={{ borderColor: designTokens.colors.border }}>
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-semibold uppercase" style={{ color: designTokens.colors.textTertiary }}>
                    {isActiveMemberFollowUp ? 'Included in membership' : 'Consultation Fee'}
                    </p>
                    <p className="font-bold" style={{ color: designTokens.colors.textPrimary }}>
                      {isActiveMemberFollowUp ? 'INR 0' : `INR ${CONSULTATION_FEE}`}
                    </p>
                  </div>
                </div>
              </div>

              {/* CTA Button */}
              <button
                onClick={handleConfirmBooking}
                disabled={!selectedSlot || loading}
                className="w-full py-4 px-6 rounded-xl font-bold text-white transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-lg"
                style={{
                  backgroundColor: selectedSlot ? designTokens.colors.primary : designTokens.colors.textTertiary,
                }}
              >
                {loading ? 'Processing...' : reusePaymentFromBookingId || isActiveMemberFollowUp ? 'Confirm Appointment' : 'Confirm Appointment'}
              </button>

              <p className="text-xs text-center" style={{ color: designTokens.colors.textTertiary }}>
                You can reschedule anytime in your account
              </p>
            </div>
          </div>
        </div>

        {/* Guidance Section */}
        <div className="rounded-2xl p-8 border-2 mb-8" style={{ backgroundColor: `${designTokens.colors.secondary}08`, borderColor: `${designTokens.colors.secondary}20` }}>
          <div className="flex items-center gap-3 mb-6">
            <Shield className="w-6 h-6" style={{ color: designTokens.colors.secondary }} />
            <div>
              <h2 className="text-xl font-bold" style={{ color: designTokens.colors.textPrimary }}>
                What Happens Next
              </h2>
              <p className="text-sm mt-1" style={{ color: designTokens.colors.textSecondary }}>
                Here is how 8Liv handles your consultation after payment.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              {
                title: 'Automatic matching',
                description: 'You choose a convenient time, then we assign an available specialist with workload balancing.'
              },
              {
                title: 'Clear appointment card',
                description: 'Your dashboard will show the doctor, date, time, status, and countdown once the appointment is assigned.'
              },
              {
                title: 'Join window',
                description: 'The video room becomes available 15 minutes before your scheduled consultation time.'
              },
              {
                title: 'After the call',
                description: 'You can return to the dashboard to view appointment details, prescriptions, and next care steps.'
              }
            ].map((item, index) => (
              <div key={item.title} className="rounded-xl p-5 border bg-white" style={{ borderColor: designTokens.colors.border }}>
                <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold text-white mb-4" style={{ backgroundColor: index === 0 ? designTokens.colors.primary : designTokens.colors.secondary }}>
                  {index + 1}
                </div>
                <h3 className="text-sm font-bold" style={{ color: designTokens.colors.textPrimary }}>
                  {item.title}
                </h3>
                <p className="text-xs mt-2 leading-relaxed" style={{ color: designTokens.colors.textSecondary }}>
                  {item.description}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Trust Badges */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { icon: Lock, label: 'Secure & Encrypted', color: '#1A1F36' },
            { icon: Shield, label: 'HIPAA Compliant', color: '#5C7A6B' },
            { icon: Users, label: 'Licensed Doctors', color: '#C4622D' },
            { icon: MapPin, label: 'Private Sessions', color: '#8896A4' }
          ].map((badge, idx) => (
            <div key={idx} className="text-center p-4 rounded-lg" style={{ backgroundColor: `${badge.color}08`, borderRadius: designTokens.borderRadius.lg }}>
              <badge.icon className="w-6 h-6 mx-auto mb-2" style={{ color: badge.color }} />
              <p className="text-xs font-semibold" style={{ color: designTokens.colors.textPrimary }}>
                {badge.label}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
