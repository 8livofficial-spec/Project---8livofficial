'use client'

import React, { useState, useEffect, useMemo, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Video, Lock, Shield, CheckCircle, MapPin, Users, CreditCard, Smartphone, Building2, AlertCircle, CalendarPlus, Sun, CloudSun, Moon, Clock, CalendarDays, ArrowLeft, Stethoscope, Utensils, Dumbbell } from 'lucide-react'
import { usePatientData } from '@/hooks/usePatientData'
import { supabase, syncSupabaseAuthCookie } from '@/lib/supabaseClient'
import ConsultationSkeleton from '@/components/patient/ConsultationSkeleton'

const CONSULTATION_FEE = 499
const SESSION_EXPIRED = 'SESSION_EXPIRED'
const INITIAL_DOCTOR_CONSULTATION = 'INITIAL_DOCTOR_CONSULTATION'
const DOCTOR_FOLLOW_UP = 'DOCTOR_FOLLOW_UP'

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

  // Session refreshed successfully — retry request with fresh token.
  // Never sign out on retried response: if an endpoint responds with 401/502/etc.,
  // return the response so the UI error handler can display the server's error message.
  return await request(refreshedToken)
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
type BookingMode = 'slot' | 'manual'
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

// Design System Tokens - Harmonized with 8liv Emerald Green & Clean Slate System
const designTokens = {
  colors: {
    primary: '#0F172A',
    primaryHover: '#1E293B',
    secondary: '#00A884',
    secondaryHover: '#0A8F70',
    success: '#00A884',
    background: '#F8FAFC',
    surface: '#FFFFFF',
    border: '#E2E8F0',
    textPrimary: '#0F172A',
    textSecondary: '#475569',
    textTertiary: '#94A3B8',
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

export type ProviderRoleTab = 'doctor' | 'dietitian' | 'trainer'

export const PROVIDER_TABS = [
  {
    id: 'doctor' as const,
    label: 'Doctor',
    sublabel: 'Physician',
    icon: Stethoscope,
    roleName: 'Doctor',
    defaultName: 'Primary Care Physician',
    defaultSpecialty: 'Metabolic Health Specialist',
    avatarInitials: 'MD',
    badgeText: '1-on-1 Physician Video Session',
    description: 'Review your GLP-1 therapy, discuss lab reports, adjust dosing, or get clinical answers directly from your physician.',
    benefits: ['Dosage titration & safety review', 'Lab biomarker evaluation', 'Medical prescription review'],
  },
  {
    id: 'dietitian' as const,
    label: 'Dietitian',
    sublabel: 'Nutritionist',
    icon: Utensils,
    roleName: 'Clinical Dietitian',
    defaultName: 'Clinical Dietitian',
    defaultSpecialty: 'Clinical Nutrition & Metabolic Diet',
    avatarInitials: 'RD',
    badgeText: '1-on-1 Nutritionist Video Session',
    description: 'Calibrate your daily calorie & protein targets, customize your personalized Indian meal plan, and manage dietary symptoms.',
    benefits: ['Personalized meal blueprints', 'Macro & protein optimization', 'Anti-nausea & satiety strategies'],
  },
  {
    id: 'trainer' as const,
    label: 'Gym Trainer',
    sublabel: 'Fitness Coach',
    icon: Dumbbell,
    roleName: 'Fitness Coach',
    defaultName: 'Certified Fitness Coach',
    defaultSpecialty: 'Metabolic Conditioning & Strength Coach',
    avatarInitials: 'HC',
    badgeText: '1-on-1 Fitness Video Session',
    description: 'Build lean muscle mass, protect metabolic rate during weight loss, and implement progressive home or gym strength routines.',
    benefits: ['Muscle preservation protocols', 'Progressive resistance training plan', 'Home or gym guided routines'],
  },
]

export default function ConsultationSchedulingPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { reloadData, user, profile, assessment, careTeam, onboardingState, loading: patientDataLoading } = usePatientData()
  const reusePaymentFromBookingId = searchParams.get('rescheduleFrom') || ''
  const isPatientDataReady = !patientDataLoading
  const isActiveMemberFollowUp = isPatientDataReady && onboardingState.membershipStatus === 'ACTIVE' && onboardingState.firstConsultationCompleted === true
  const isBookingPending = onboardingState.appointmentStatus === 'BOOKING_PENDING' || onboardingState.consultationPaymentStatus === 'PAID'
  const appointmentType = isActiveMemberFollowUp ? DOCTOR_FOLLOW_UP : INITIAL_DOCTOR_CONSULTATION

  const [activeProviderTab, setActiveProviderTab] = useState<ProviderRoleTab>('doctor')
  const [availableDates, setAvailableDates] = useState<string[]>([])
  const [selectedDateSlots, setSelectedDateSlots] = useState<AvailableDoctorSlot[]>([])
  const [selectedDate, setSelectedDate] = useState('')
  const [slotsLoading, setSlotsLoading] = useState(true)
  const [dateSlotsLoading, setDateSlotsLoading] = useState(false)
  const [slotsError, setSlotsError] = useState('')
  const [loading, setLoading] = useState(false)
  const [paymentOpen, setPaymentOpen] = useState(false)
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('upi')
  const [paymentStage, setPaymentStage] = useState<PaymentStage>('method')
  const [paymentError, setPaymentError] = useState('')
  const [assignment, setAssignment] = useState<AssignmentDetails | null>(null)
  const [selectedSlot, setSelectedSlot] = useState<AvailableDoctorSlot | null>(null)
  const [bookingMode, setBookingMode] = useState<BookingMode>('slot')
  const [manualDate, setManualDate] = useState('')
  const [manualTime, setManualTime] = useState('')

  const abortControllerRef = React.useRef<AbortController | null>(null)
  const dateAbortControllerRef = React.useRef<AbortController | null>(null)

  const currentTabMeta = useMemo(() => {
    return PROVIDER_TABS.find(t => t.id === activeProviderTab) || PROVIDER_TABS[0]
  }, [activeProviderTab])

  const activeProviderName = useMemo(() => {
    if (activeProviderTab === 'doctor') {
      return careTeam?.doctor?.name ? `Dr. ${careTeam.doctor.name}` : currentTabMeta.defaultName
    }
    if (activeProviderTab === 'dietitian') {
      return careTeam?.dietitian?.name ? careTeam.dietitian.name : currentTabMeta.defaultName
    }
    return (careTeam?.fitness_coach?.name || (careTeam as any)?.trainer?.name) || currentTabMeta.defaultName
  }, [activeProviderTab, careTeam, currentTabMeta])

  const selectableDates = useMemo(() => {
    return [...availableDates].sort((a, b) => a.localeCompare(b))
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

  const slotCacheRef = React.useRef<Map<string, AvailableDoctorSlot[]>>(new Map())

  const handleTabSwitch = useCallback((tabId: ProviderRoleTab) => {
    if (activeProviderTab === tabId) return
    if (abortControllerRef.current) abortControllerRef.current.abort()
    if (dateAbortControllerRef.current) dateAbortControllerRef.current.abort()

    setActiveProviderTab(tabId)
    setSelectedSlot(null)
    setSelectedDateSlots([])
    setAvailableDates([])
    setSelectedDate('')
    setSlotsLoading(true)
    setSlotsError('')
    slotCacheRef.current.clear()
  }, [activeProviderTab])

  const loadSlotsForDate = useCallback(async (date: string) => {
    if (!date) {
      setSelectedDateSlots([])
      return
    }

    const cacheKey = `${activeProviderTab}-${date}`
    if (slotCacheRef.current.has(cacheKey)) {
      setSelectedDateSlots(slotCacheRef.current.get(cacheKey) || [])
      return
    }

    if (dateAbortControllerRef.current) {
      dateAbortControllerRef.current.abort()
    }
    const controller = new AbortController()
    dateAbortControllerRef.current = controller

    setDateSlotsLoading(true)
    try {
      const activeRole = activeProviderTab === 'trainer' ? 'fitness_coach' : activeProviderTab
      const params = new URLSearchParams({ role: activeRole, date })
      if (activeProviderTab === 'doctor') {
        params.set('appointmentType', appointmentType)
      }
      const res = await patientFetch(`/api/patient/appointments/availability?${params.toString()}`, {
        signal: controller.signal,
      })
      const data = await res.json()
      if (!res.ok || data.error) {
        throw new Error(data.error || 'Failed to load slots for selected date')
      }

      const uniqueTimes = new Map<string, AvailableDoctorSlot>()
      for (const slot of (data.slots || []).filter(Boolean)) {
        // Strict role isolation guarantee: reject any slot that belongs to a different role
        const slotRole = String(slot.providerRole || slot.provider_role || '').toLowerCase()
        if (slotRole && slotRole !== activeRole.toLowerCase()) continue

        const timeSlot = slot.startTime || slot.time_slot || slot.start_time || ''
        if (!timeSlot) continue
        const mapped: AvailableDoctorSlot = {
          ...slot,
          available_date: slot.date || slot.available_date || date || '',
          time_slot: timeSlot,
        }
        const key = `${mapped.slotId || mapped.providerId || activeRole}-${mapped.time_slot}`
        if (!uniqueTimes.has(key)) uniqueTimes.set(key, mapped)
      }
      const slotsList = Array.from(uniqueTimes.values())
      slotCacheRef.current.set(cacheKey, slotsList)
      setSelectedDateSlots(slotsList)
    } catch (err) {
      if (err instanceof Error && (err.name === 'AbortError' || controller.signal.aborted)) {
        return
      }
      if (err instanceof Error && err.message === SESSION_EXPIRED) {
        router.replace('/login')
        return
      }
      console.error('Failed to load slots for selected date:', err)
      setSelectedDateSlots([])
    } finally {
      if (!controller.signal.aborted) {
        setDateSlotsLoading(false)
      }
    }
  }, [activeProviderTab, appointmentType, router])

  const loadAvailableSlots = useCallback(async () => {
    if (patientDataLoading) return

    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }
    const controller = new AbortController()
    abortControllerRef.current = controller

    setSlotsLoading(true)
    setSlotsError('')
    slotCacheRef.current.clear()
    try {
      const activeRole = activeProviderTab === 'trainer' ? 'fitness_coach' : activeProviderTab
      const params = new URLSearchParams({ role: activeRole })
      if (activeProviderTab === 'doctor') {
        params.set('appointmentType', appointmentType)
      }
      const res = await patientFetch(`/api/patient/appointments/availability?${params.toString()}`, {
        signal: controller.signal,
      })
      const data = await res.json()
      if (!res.ok || data.error) {
        throw new Error(data.error || 'Failed to load available slots')
      }

      const dates = ((data.dates || []) as Array<{ date: string }>).map(item => item.date).sort((a, b) => {
        return a.localeCompare(b)
      })
      setAvailableDates(dates)

      // Pre-populate slotCacheRef with slots strictly filtered by activeRole
      if (Array.isArray(data.slots) && data.slots.length > 0) {
        const slotsByDate = new Map<string, AvailableDoctorSlot[]>()
        for (const slot of data.slots) {
          if (!slot) continue
          // Strict role isolation guarantee: reject any slot that belongs to a different role
          const slotRole = String(slot.providerRole || slot.provider_role || '').toLowerCase()
          if (slotRole && slotRole !== activeRole.toLowerCase()) continue

          const timeSlot = slot.startTime || slot.time_slot || slot.start_time || ''
          if (!timeSlot) continue
          const slotDate = slot.date || slot.available_date || ''
          if (!slotDate) continue
          const mapped: AvailableDoctorSlot = {
            ...slot,
            available_date: slotDate,
            time_slot: timeSlot,
          }
          if (!slotsByDate.has(slotDate)) slotsByDate.set(slotDate, [])
          const existing = slotsByDate.get(slotDate)!
          const key = `${mapped.slotId || mapped.providerId || activeRole}-${mapped.time_slot}`
          if (!existing.some(s => `${s.slotId || s.providerId || activeRole}-${s.time_slot}` === key)) {
            existing.push(mapped)
          }
        }
        for (const [d, sList] of slotsByDate) {
          slotCacheRef.current.set(`${activeProviderTab}-${d}`, sList)
        }
      }

      if (dates.length > 0) {
        const nextDate = dates[0]
        setSelectedSlot(null)
        setSelectedDate(nextDate)
        const cached = slotCacheRef.current.get(`${activeProviderTab}-${nextDate}`)
        if (cached && cached.length > 0) {
          setSelectedDateSlots(cached)
        } else {
          await loadSlotsForDate(nextDate)
        }
      } else {
        setSelectedSlot(null)
        setSelectedDate('')
        setSelectedDateSlots([])
      }
    } catch (err) {
      if (err instanceof Error && (err.name === 'AbortError' || controller.signal.aborted)) {
        return
      }
      if (err instanceof Error && err.message === SESSION_EXPIRED) {
        router.replace('/login')
        return
      }
      console.error('Failed to load available slots:', err)
      setSlotsError(err instanceof Error ? err.message : 'Failed to load available slots.')
    } finally {
      if (!controller.signal.aborted) {
        setSlotsLoading(false)
      }
    }
  }, [activeProviderTab, appointmentType, loadSlotsForDate, patientDataLoading, router])

  useEffect(() => {
    if (patientDataLoading) return

    const timer = window.setTimeout(() => {
      void loadAvailableSlots()
    }, 0)

    return () => window.clearTimeout(timer)
  }, [loadAvailableSlots, patientDataLoading])


  useEffect(() => {
    return () => {
      if (abortControllerRef.current) abortControllerRef.current.abort()
      if (dateAbortControllerRef.current) dateAbortControllerRef.current.abort()
    }
  }, [])




  if (patientDataLoading) {
    return <ConsultationSkeleton />
  }

  // Strict Onboarding Guard: Patient must have completed the assessment before choosing slots
  const rawEligibility = String(
    onboardingState.eligibilityStatus ||
    (assessment as any)?.medical_history?.eligibility_status ||
    ((assessment as any)?.is_eligible ? 'ELIGIBLE' : '')
  ).toUpperCase()

  const assessmentCompleted = Boolean(
    assessment?.id ||
    (assessment as any)?.created_at ||
    onboardingState.assessmentStatus === 'COMPLETED'
  )
  if (!assessmentCompleted) {
    if (typeof window !== 'undefined') {
      router.replace('/assessment')
    }
    return (
      <div className="min-h-[50vh] flex items-center justify-center text-[#C4622D]">
        <div className="w-10 h-10 border-4 border-current border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  const isAlreadyPaid = Boolean(
    assessment?.consultation_fee_paid ||
    onboardingState.consultationPaymentStatus === 'PAID' ||
    isActiveMemberFollowUp ||
    reusePaymentFromBookingId ||
    isBookingPending
  )
  const selectedManualDateTime = Boolean(bookingMode === 'manual' && manualDate && manualTime)

  const handleConfirmBooking = async () => {
    if (bookingMode === 'slot' && !selectedSlot) {
      alert("Please select a consultation time first.")
      return
    }
    if (bookingMode === 'manual' && !selectedManualDateTime) {
      alert("Please choose your preferred consultation date and time.")
      return
    }
    setPaymentError('')
    void handlePaidBooking()
  }

  const loadRazorpayScript = () => {
    return new Promise<boolean>((resolve) => {
      if (typeof window !== 'undefined' && (window as any).Razorpay) {
        return resolve(true)
      }
      const existingScript = document.querySelector('script[src="https://checkout.razorpay.com/v1/checkout.js"]') as HTMLScriptElement | null
      if (existingScript) {
        if ((window as any).Razorpay) return resolve(true)
        existingScript.addEventListener('load', () => resolve(true), { once: true })
        existingScript.addEventListener('error', () => resolve(false), { once: true })
      } else {
        const script = document.createElement('script')
        script.src = 'https://checkout.razorpay.com/v1/checkout.js'
        script.async = true
        script.onload = () => resolve(true)
        script.onerror = () => resolve(false)
        document.body.appendChild(script)
      }
      setTimeout(() => {
        resolve(typeof window !== 'undefined' && Boolean((window as any).Razorpay))
      }, 3000)
    })
  }

  const handlePaidBooking = async () => {
    if (bookingMode === 'slot' && !selectedSlot) {
      setPaymentError('Please select a consultation time before payment.')
      return
    }
    if (bookingMode === 'manual' && !selectedManualDateTime) {
      setPaymentError('Please choose your preferred consultation date and time.')
      return
    }

    setLoading(true)
    setPaymentError('')

    try {
      // Direct booking for Dietitian and Gym Trainer (covered in program membership)
      if (activeProviderTab !== 'doctor') {
        setPaymentStage('assigning')
        const patientId = user?.id || profile?.id || assessment?.patient_id
        const providerRole = activeProviderTab === 'trainer' ? 'fitness_coach' : 'dietitian'
        const bookingDate = selectedSlot?.available_date || selectedSlot?.date
        const bookingTime = selectedSlot?.time_slot || selectedSlot?.startTime

        const res = await patientFetch('/api/patient/provider-consultations', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            patientId,
            role: providerRole,
            bookingDate,
            bookingTime,
          }),
        })

        const data = await res.json()
        if (!res.ok || data.error) {
          throw new Error(data.error || `Failed to book ${currentTabMeta.label} consultation.`)
        }

        const consult = data.consultation
        setAssignment({
          consultationId: consult.id,
          bookingId: consult.id,
          paymentAmount: 0,
          paymentStatus: 'COVERED',
          appointmentStatus: 'SCHEDULED',
          doctorName: activeProviderName,
          specialty: currentTabMeta.defaultSpecialty,
          bookingDate: consult.booking_date,
          bookingTime: consult.booking_time,
          meetingType: '1-on-1 Video Session',
        })
        setPaymentStage('confirmed')
        const { data: { session: activeSession } } = await supabase.auth.getSession()
        syncSupabaseAuthCookie(activeSession)
        await reloadData()
        await loadAvailableSlots()
        router.replace(`/patient/appointments/${consult.id}`)
        return
      }

      const needsPayment = !isAlreadyPaid

      if (needsPayment) {
        // 1. Create order on backend
        const orderRes = await patientFetch('/api/create-order', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            amount: CONSULTATION_FEE,
            currency: 'INR',
            paymentType: 'consultation',
          }),
        })
        const orderData = await orderRes.json()
        if (orderRes.status === 409 && (orderData.alreadyPaid || orderData.alreadyCovered)) {
          // Consultation fee already paid on backend — proceed directly to slot confirmation
          console.log('[booking] Consultation fee already verified on backend. Proceeding to slot assignment.')
        } else if (!orderRes.ok || orderData.error) {
          throw new Error(orderData.error || 'Failed to initialize payment gateway')
        } else {
          const patientId = user?.id || profile?.id || assessment?.patient_id
          const patientName = [profile?.first_name, profile?.last_name].filter(Boolean).join(' ') || assessment?.first_name || 'Patient'
          const patientEmail = user?.email || (profile as any)?.email || 'care@8liv.in'
          const rawContact = profile?.phone_number || assessment?.phone_number || ''
          const patientContact = rawContact.replace(/\D/g, '').slice(-10)

          // 2. Open Razorpay Checkout
          await loadRazorpayScript()
          if (typeof window === 'undefined' || !(window as any).Razorpay) {
            throw new Error('Could not load Razorpay checkout interface. Please disable ad-blockers and try again.')
          }

          await new Promise<void>((resolve, reject) => {
            const options: any = {
              key: orderData.key,
              amount: orderData.amount,
              currency: orderData.currency || 'INR',
              name: '8Liv',
              description: 'Initial Doctor Consultation Fee',
              prefill: {
                name: patientName,
                email: patientEmail,
                ...(patientContact.length === 10 ? { contact: patientContact } : {}),
              },
              theme: {
                color: '#C4622D',
              },
            }
            if (orderData.id && String(orderData.id).startsWith('order_') && !orderData.isMock) {
              options.order_id = orderData.id
            }
            options.handler = async function (response: any) {
              try {
                // Verify payment on backend
                const verifyRes = await patientFetch('/api/verify-payment', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    patientId,
                    paymentType: 'consultation',
                    amount: CONSULTATION_FEE,
                    paymentMethod,
                    razorpay_order_id: response.razorpay_order_id,
                    razorpay_payment_id: response.razorpay_payment_id,
                    razorpay_signature: response.razorpay_signature,
                  }),
                })
                const verifyData = await verifyRes.json()
                if (!verifyRes.ok || verifyData.error) {
                  throw new Error(verifyData.error || 'Payment verification failed.')
                }
                resolve()
              } catch (verifyErr) {
                reject(verifyErr)
              }
            }
            options.modal = {
              ondismiss: function () {
                reject(new Error('Payment cancelled.'))
              },
            }
            try {
              const rzp = new (window as any).Razorpay(options)
              rzp.on('payment.failed', function (resp: any) {
                reject(new Error(resp?.error?.description || 'Payment failed. Please try again.'))
              })
              rzp.open()
            } catch (openErr: any) {
              reject(new Error(openErr?.message || 'Unable to open Razorpay payment gateway.'))
            }
          })
        }
      }

      setPaymentStage('assigning')

      const idempotencyKey = `patient-booking-${Date.now()}-${Math.random().toString(36).slice(2)}`

      const res = await patientFetch('/api/patient/appointments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          appointmentType,
          bookingMode,
          slotId: selectedSlot?.slotId,
          selectedDate: bookingMode === 'manual' ? manualDate : undefined,
          selectedTime: bookingMode === 'manual' ? manualTime : undefined,
          idempotencyKey,
          paymentMethod: isActiveMemberFollowUp ? undefined : paymentMethod,
          reusePaymentFromBookingId: reusePaymentFromBookingId || (isBookingPending ? 'pending' : undefined),
        })
      })

      if (res.status === 429) {
        const retryAfter = res.headers.get('Retry-After')
        const data = await res.json().catch(() => ({}))
        const errorMsg = data.error || `Too many attempts. Please try again in ${retryAfter || '60'} seconds.`
        throw new Error(errorMsg)
      }

      const data = await res.json()
      if (!res.ok || data.error) {
        throw new Error(data.error || 'Failed to book consultation slot')
      }

      setAssignment(data.assignment || null)
      setPaymentStage('confirmed')
      const { data: { session: activeSession } } = await supabase.auth.getSession()
      syncSupabaseAuthCookie(activeSession)
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
      if (reusePaymentFromBookingId || isBookingPending) {
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
                    <p className="text-xs font-semibold text-[#5C7A6B]">
                      Official Razorpay Gateway
                    </p>
                  </div>
                </div>

                <div className="rounded-xl p-4 mb-5" style={{ backgroundColor: designTokens.colors.background }}>
                  <p className="text-sm font-semibold" style={{ color: designTokens.colors.textPrimary }}>
                    After payment, we will reserve your selected time and assign the best available specialist.
                  </p>
                  <p className="text-xs mt-1" style={{ color: designTokens.colors.textSecondary }}>
                    Pay securely via UPI (GPay, PhonePe, Paytm), Cards, or NetBanking.
                  </p>
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
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handlePaidBooking}
                    disabled={loading}
                    className="flex-[1.4] py-3 rounded-xl font-bold text-white disabled:opacity-50 flex items-center justify-center gap-2 shadow-md hover:shadow-lg transition-all"
                    style={{ backgroundColor: designTokens.colors.primary }}
                  >
                    <Lock className="w-4 h-4" />
                    {loading ? 'Opening Razorpay...' : `Pay INR ${CONSULTATION_FEE}`}
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
                    { label: 'Payment Amount', value: `INR ${Number(assignment.paymentAmount || CONSULTATION_FEE).toLocaleString('en-IN')}` },
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
      {isActiveMemberFollowUp ? (
        /* ═════════════════════════════════════════════════════════════════════
           IN-APP CONSULTATION UI (Active Members / Follow-Up Care)
           ═════════════════════════════════════════════════════════════════════ */
        <div className="min-h-screen bg-slate-50/70 pb-16 font-sans">
          {/* Top Bar Navigation */}
          <div className="bg-white border-b border-slate-200/80 sticky top-0 z-20 backdrop-blur-md bg-white/90">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => router.push('/patient')}
                  className="inline-flex items-center gap-2 text-xs sm:text-sm font-bold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 px-3.5 py-2 rounded-xl transition-colors cursor-pointer font-sora"
                >
                  <span className="text-base leading-none">←</span> Dashboard
                </button>
                <div className="h-5 w-[1px] bg-slate-200 hidden sm:block" />
                <span className="text-xs sm:text-sm font-extrabold text-slate-800 font-sora hidden sm:inline-block">
                  Schedule Care Consultation
                </span>
              </div>

              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold bg-[#0D9488]/10 text-[#0D9488] border border-[#0D9488]/20 font-sora">
                  <span className="w-2 h-2 rounded-full bg-[#0D9488] animate-pulse" />
                  Active Member Benefit • ₹0 Covered
                </span>
              </div>
            </div>
          </div>

          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
            {/* 3-Tab Care Specialist Switcher */}
            <div className="mb-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
                <div>
                  <h2 className="text-base sm:text-lg font-extrabold text-slate-900 font-sora tracking-tight flex items-center gap-2">
                    <span>Select Specialist to Consult</span>
                  </h2>
                  <p className="text-xs text-slate-500">
                    Switch between your dedicated care team members to schedule your session
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 p-1.5 bg-slate-200/70 rounded-2xl border border-slate-200/90 shadow-inner">
                {PROVIDER_TABS.map((tab) => {
                  const Icon = tab.icon
                  const isActive = activeProviderTab === tab.id
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => handleTabSwitch(tab.id)}
                      className={`py-3 px-3.5 rounded-xl flex items-center gap-3 transition-all cursor-pointer font-sora text-left ${
                        isActive
                          ? 'bg-[#061810] text-white shadow-md shadow-emerald-950/20 ring-1 ring-emerald-500/40 scale-[1.01]'
                          : 'bg-white/80 hover:bg-white text-slate-700 hover:text-slate-900 shadow-xs'
                      }`}
                    >
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
                        isActive ? 'bg-[#00A884] text-white shadow-sm' : 'bg-slate-100 text-slate-600'
                      }`}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <p className="text-xs sm:text-sm font-bold truncate">{tab.label}</p>
                          {isActive && (
                            <span className="w-1.5 h-1.5 rounded-full bg-[#00A884] animate-pulse shrink-0" />
                          )}
                        </div>
                        <p className={`text-[10px] truncate ${isActive ? 'text-teal-300 font-medium' : 'text-slate-400'}`}>
                          {tab.sublabel}
                        </p>
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Header Hero Banner */}
            <div className="bg-gradient-to-br from-[#0B1120] via-[#0F172A] to-[#0D9488]/90 rounded-3xl p-6 sm:p-8 text-white relative overflow-hidden shadow-xl shadow-slate-900/10 mb-8">
              <div className="absolute top-0 right-0 w-80 h-80 bg-[#5EEAD4]/10 rounded-full blur-3xl pointer-events-none" />
              <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 border border-white/15 backdrop-blur-md text-[10px] font-extrabold uppercase tracking-widest text-[#5EEAD4] font-sora mb-3">
                    <currentTabMeta.icon className="w-3.5 h-3.5" /> {currentTabMeta.badgeText}
                  </div>
                  <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold font-sora tracking-tight">
                    Book Your {currentTabMeta.label} Consultation
                  </h1>
                  <p className="text-white/70 text-xs sm:text-sm mt-2 max-w-xl font-light leading-relaxed">
                    {currentTabMeta.description}
                  </p>
                </div>

                <div className="bg-white/10 border border-white/15 rounded-2xl p-4 backdrop-blur-md flex items-center gap-4 shrink-0">
                  <div className="w-12 h-12 rounded-xl bg-[#0D9488] flex items-center justify-center font-bold text-white text-lg font-sora shadow-sm">
                    {currentTabMeta.avatarInitials}
                  </div>
                  <div>
                    <p className="text-[10px] uppercase font-bold text-white/60 tracking-wider">
                      {currentTabMeta.roleName}
                    </p>
                    <p className="text-sm font-bold font-sora text-white">
                      {activeProviderName}
                    </p>
                    <p className="text-[11px] text-[#5EEAD4] font-medium">
                      {currentTabMeta.defaultSpecialty}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Two Column Booking Workspace */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Left 2 Cols: Slot Selection & Calendar */}
              <div className="lg:col-span-2 space-y-6">
                <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-xs">
                  <div className="flex items-center justify-between gap-4 mb-6">
                    <div>
                      <h2 className="text-lg sm:text-xl font-extrabold font-sora text-slate-900">
                        Choose Date & Time
                      </h2>
                      <p className="text-slate-500 text-xs sm:text-sm mt-1">
                        Select an available slot with your {currentTabMeta.label.toLowerCase()}. Times are in Indian Standard Time (IST).
                      </p>
                    </div>
                    <div className="w-10 h-10 rounded-2xl bg-teal-50 border border-teal-100 flex items-center justify-center text-[#0D9488] shrink-0">
                      <Clock className="w-5 h-5" />
                    </div>
                  </div>

                  {slotsLoading ? (
                    <div className="space-y-6 py-4 animate-in fade-in duration-200">
                      <div>
                        <div className="w-28 h-4 bg-slate-200 rounded mb-3 animate-pulse" />
                        <div className="flex gap-2.5 overflow-x-auto pb-2">
                          {[1, 2, 3, 4, 5].map((i) => (
                            <div key={i} className="min-w-22 h-20 rounded-2xl border border-slate-200 bg-slate-50 animate-pulse" />
                          ))}
                        </div>
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5 pt-2">
                        {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                          <div key={i} className="h-11 rounded-xl bg-slate-100 border border-slate-200 animate-pulse" />
                        ))}
                      </div>
                    </div>
                  ) : selectableDates.length > 0 ? (
                    <div className="space-y-6">
                      {/* Date Carousel */}
                      <div>
                        <p className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-3 font-sora flex items-center gap-2">
                          <CalendarDays className="w-4 h-4 text-[#0D9488]" /> Select Date
                        </p>
                        <div className="flex gap-2.5 overflow-x-auto pb-2 scrollbar-thin">
                          {selectableDates.map((date) => {
                            const isSelected = selectedDate === date
                            const parts = getDateParts(date)
                            const heading = getDateHeading(date)
                            return (
                              <button
                                key={date}
                                type="button"
                                onClick={() => {
                                  setSelectedSlot(null)
                                  setSelectedDate(date)
                                  void loadSlotsForDate(date)
                                }}
                                className={`min-w-22 py-3 px-3 rounded-2xl border text-center transition-all cursor-pointer ${
                                  isSelected
                                    ? 'bg-[#0D9488] border-[#0D9488] text-white shadow-md shadow-[#0D9488]/25 scale-[1.02]'
                                    : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-800'
                                }`}
                              >
                                <span className="block text-[10px] font-bold uppercase tracking-wider opacity-85">
                                  {heading}
                                </span>
                                <span className="block text-xl font-extrabold font-sora my-0.5">
                                  {parts.day}
                                </span>
                                <span className="block text-[10px] font-semibold opacity-75">
                                  {parts.weekday}
                                </span>
                              </button>
                            )
                          })}
                        </div>
                      </div>

                      {/* Time Slots Area */}
                      <div className="bg-slate-50/80 rounded-2xl p-5 border border-slate-200/80">
                        <div className="flex items-center justify-between mb-4">
                          <div>
                            <h3 className="font-bold text-sm font-sora text-slate-900">
                              {selectedDate ? formatSlotDate(selectedDate, true) : 'Available Slots'}
                            </h3>
                            <p className="text-xs text-slate-500">Pick the best time for your 30-minute consultation</p>
                          </div>
                        </div>

                        {dateSlotsLoading ? (
                          <div className="flex items-center justify-center py-8 gap-3">
                            <div className="w-6 h-6 border-2 border-teal-200 border-t-[#0D9488] rounded-full animate-spin" />
                            <span className="text-xs font-semibold text-slate-600">Updating slots...</span>
                          </div>
                        ) : selectedDateSlots.length > 0 ? (
                          <div className="space-y-4">
                            {(['morning', 'afternoon', 'evening'] as const).map((period) => {
                              const slots = groupedSlots[period]
                              if (slots.length === 0) return null
                              const Icon = periodMeta[period].icon
                              return (
                                <div key={period}>
                                  <div className="flex items-center gap-1.5 mb-2.5">
                                    <Icon className="w-3.5 h-3.5 text-[#0D9488]" />
                                    <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-600 font-sora">
                                      {periodMeta[period].label}
                                    </span>
                                  </div>
                                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5">
                                    {slots.map((slot) => {
                                      const isSelected = selectedSlot?.available_date === slot.available_date && selectedSlot?.time_slot === slot.time_slot
                                      return (
                                        <button
                                          key={`${slot.available_date}-${slot.time_slot}`}
                                          type="button"
                                          onClick={() => setSelectedSlot(slot)}
                                          className={`py-3 px-3.5 rounded-xl border text-center font-sora text-xs font-bold transition-all cursor-pointer ${
                                            isSelected
                                              ? 'bg-[#0D9488] text-white border-[#0D9488] shadow-md shadow-[#0D9488]/20 scale-[1.02]'
                                              : 'bg-white hover:bg-teal-50/50 border-slate-200 text-slate-800 hover:border-teal-300'
                                          }`}
                                        >
                                          {formatSlotTime(slot.time_slot)}
                                        </button>
                                      )
                                    })}
                                  </div>
                                </div>
                              )
                            })}
                          </div>
                        ) : (
                          <div className="text-center py-8 bg-white rounded-xl border border-dashed border-slate-200">
                            <p className="text-xs font-bold text-slate-700 font-sora">No slots available on this date</p>
                            <p className="text-xs text-slate-500 mt-1">Please pick another date from the carousel above.</p>
                          </div>
                        )}
                      </div>
                    </div>
                  ) : slotsError ? (
                    <div className="text-center py-10 bg-amber-50/70 rounded-2xl border border-amber-200/80 p-6">
                      <div className="w-10 h-10 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center mx-auto mb-3">
                        <AlertCircle className="w-5 h-5" />
                      </div>
                      <p className="text-sm font-bold text-amber-900 font-sora">{slotsError}</p>
                      <p className="text-xs text-amber-700/80 mt-1 max-w-sm mx-auto">
                        Please check your requirements or try refreshing available appointments.
                      </p>
                      <div className="mt-4 flex items-center justify-center gap-3">
                        <button
                          type="button"
                          onClick={() => void loadAvailableSlots()}
                          className="px-4 py-2 bg-[#0D9488] hover:bg-[#0F766E] text-white rounded-xl text-xs font-bold font-sora transition-colors cursor-pointer"
                        >
                          Refresh Slots
                        </button>
                        <button
                          type="button"
                          onClick={() => router.push('/patient')}
                          className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold font-sora transition-colors cursor-pointer"
                        >
                          Go to Dashboard
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-10 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                      <p className="text-sm font-bold text-slate-800 font-sora">No consultation slots currently open</p>
                      <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                        Your {currentTabMeta.label.toLowerCase()} will open new schedule availability shortly. You can also request an urgent callback from support.
                      </p>
                      <button
                        type="button"
                        onClick={() => void loadAvailableSlots()}
                        className="mt-4 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold font-sora transition-colors cursor-pointer"
                      >
                        Refresh Availability
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Right 1 Col: Summary & Action Card */}
              <div className="lg:col-span-1 space-y-6">
                <div className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-200/80 shadow-xs sticky top-24">
                  <h3 className="font-extrabold text-base font-sora text-slate-900 mb-4 flex items-center justify-between">
                    <span>Session Summary</span>
                    <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 font-bold border border-emerald-200">
                      {currentTabMeta.label}
                    </span>
                  </h3>

                  <div className="space-y-3.5 text-xs text-slate-600 pb-4 border-b border-slate-100">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">Provider</span>
                      <span className="font-bold text-slate-900 font-sora">
                        {activeProviderName}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">Specialty</span>
                      <span className="font-semibold text-slate-700 text-[11px]">
                        {currentTabMeta.roleName}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">Date</span>
                      <span className="font-bold text-slate-900 font-sora">
                        {selectedSlot ? formatSlotDate(selectedSlot.available_date, true) : 'Select a date'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">Time</span>
                      <span className="font-bold text-slate-900 font-sora">
                        {selectedSlot ? formatSlotTime(selectedSlot.time_slot) : 'Select a time'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">Format</span>
                      <span className="font-bold text-slate-900 font-sora flex items-center gap-1">
                        <Video className="w-3.5 h-3.5 text-[#0D9488]" /> 1:1 Video Call
                      </span>
                    </div>
                    <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                      <span className="text-slate-500">Consultation Fee</span>
                      <div className="text-right">
                        <span className="line-through text-slate-400 mr-2 text-[11px]">₹499</span>
                        <span className="font-extrabold text-[#0D9488] font-sora text-sm">₹0 Free</span>
                      </div>
                    </div>
                  </div>

                  {paymentError && (
                    <div className="flex items-start gap-2 rounded-xl p-3 mb-4 bg-red-50 text-red-700 text-xs font-medium border border-red-200">
                      <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                      <span>{paymentError}</span>
                    </div>
                  )}

                  <div className="mt-5 space-y-3">
                    <button
                      type="button"
                      onClick={handleConfirmBooking}
                      disabled={!selectedSlot || loading}
                      className="w-full py-4 px-4 rounded-2xl font-bold font-sora text-sm text-white bg-[#0D9488] hover:bg-[#097A70] disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-[#0D9488]/20 hover:scale-[1.01] active:scale-[0.99] flex items-center justify-center gap-2 cursor-pointer"
                    >
                      {loading ? (
                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      ) : (
                        <>
                          <span>Confirm {currentTabMeta.label} Appointment</span>
                          <span className="text-base leading-none">→</span>
                        </>
                      )}
                    </button>
                    <p className="text-[11px] text-center text-slate-400 font-medium">
                      Free cancellation &amp; reschedule anytime from your portal
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* ═════════════════════════════════════════════════════════════════════
           ONBOARDING CONSULTATION UI (Initial Intake & Razorpay Flow)
           ═════════════════════════════════════════════════════════════════════ */
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          {isBookingPending && (
            <div className="mb-8 p-4 rounded-2xl border-2 bg-amber-50 border-amber-200 text-amber-900 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 mt-0.5 shrink-0 text-amber-600" />
              <div>
                <h4 className="font-bold text-sm">Complete Your Consultation Booking</h4>
                <p className="text-xs mt-1 leading-relaxed">
                  Your payment was processed successfully, but the consultation slot could not be finalized. 
                  Please choose any available time below to complete your appointment scheduling. 
                  <strong> You do not need to pay again.</strong>
                </p>
              </div>
            </div>
          )}
          <div className="mb-8">
            <Link
              href="/"
              className="inline-flex items-center gap-2 text-xs sm:text-sm font-bold font-sora transition-colors mb-4 px-3.5 py-2 rounded-xl bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 hover:text-slate-900 shadow-xs cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4 text-slate-600" />
              <span>Back</span>
            </Link>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h1 className="text-3xl font-bold" style={{ color: designTokens.colors.textPrimary }}>
                  Choose Your Preferred Consultation Time
                </h1>
                <p className="text-base mt-2" style={{ color: designTokens.colors.textSecondary }}>
                  {reusePaymentFromBookingId
                    ? 'Choose a new consultation slot. Your eligible consultation payment will be reused.'
                    : `Select a consultation time that fits your schedule. We will reserve your chosen time with an eligible ${currentTabMeta.label.toLowerCase()}.`}
                </p>
              </div>
            </div>
          </div>

          {/* 3-Tab Care Specialist Switcher */}
          <div className="mb-6">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 p-1.5 bg-slate-200/70 rounded-2xl border border-slate-200/90 shadow-inner">
              {PROVIDER_TABS.map((tab) => {
                const Icon = tab.icon
                const isActive = activeProviderTab === tab.id
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => handleTabSwitch(tab.id)}
                    className={`py-3 px-3.5 rounded-xl flex items-center gap-3 transition-all cursor-pointer font-sora text-left ${
                      isActive
                        ? 'bg-[#061810] text-white shadow-md shadow-emerald-950/20 ring-1 ring-emerald-500/40 scale-[1.01]'
                        : 'bg-white/80 hover:bg-white text-slate-700 hover:text-slate-900 shadow-xs'
                    }`}
                  >
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
                      isActive ? 'bg-[#00A884] text-white shadow-sm' : 'bg-slate-100 text-slate-600'
                    }`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <p className="text-xs sm:text-sm font-bold truncate">{tab.label}</p>
                        {isActive && (
                          <span className="w-1.5 h-1.5 rounded-full bg-[#00A884] animate-pulse shrink-0" />
                        )}
                      </div>
                      <p className={`text-[10px] truncate ${isActive ? 'text-teal-300 font-medium' : 'text-slate-400'}`}>
                        {tab.sublabel}
                      </p>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Specialist Assignment Card */}
          <div className="mb-8 rounded-2xl p-6 border-2" style={{ backgroundColor: designTokens.colors.surface, borderColor: designTokens.colors.border }}>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
              <div>
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-12 h-12 rounded-full flex items-center justify-center font-bold text-white bg-[#061810] shadow-sm">
                    {currentTabMeta.avatarInitials}
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: designTokens.colors.textTertiary }}>
                      {currentTabMeta.roleName} Consultation
                    </p>
                    <h3 className="text-lg font-bold" style={{ color: designTokens.colors.textPrimary }}>
                      {currentTabMeta.label} Appointment
                    </h3>
                  </div>
                </div>
                <p className="text-sm" style={{ color: designTokens.colors.textSecondary }}>
                  {currentTabMeta.description}
                </p>
              </div>

              <div className="text-center shrink-0">
                <Video className="w-6 h-6 mx-auto mb-1 text-[#00A884]" />
                <p className="text-xs font-semibold text-slate-700">1:1 Video Call</p>
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

              <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
                {[
                  { key: 'slot' as const, title: 'Choose available slot', copy: `Instantly reserve a ${currentTabMeta.label.toLowerCase()}-published time.` },
                  { key: 'manual' as const, title: 'Request my own time', copy: `Send your preferred time to all eligible ${currentTabMeta.label.toLowerCase()}s.` },
                ].map((item) => {
                  const selected = bookingMode === item.key
                  return (
                    <button
                      key={item.key}
                      type="button"
                      onClick={() => {
                        setBookingMode(item.key)
                        setPaymentError('')
                      }}
                      className="rounded-2xl border-2 p-4 text-left transition-all duration-200 hover:-translate-y-0.5"
                      style={{
                        borderColor: selected ? designTokens.colors.primary : designTokens.colors.border,
                        backgroundColor: selected ? `${designTokens.colors.primary}08` : designTokens.colors.surface,
                        boxShadow: selected ? designTokens.shadows.md : 'none',
                      }}
                    >
                      <span className="flex items-center gap-2 text-sm font-bold" style={{ color: designTokens.colors.textPrimary }}>
                        {item.key === 'slot' ? <Clock className="h-4 w-4" /> : <CalendarPlus className="h-4 w-4" />}
                        {item.title}
                      </span>
                      <span className="mt-1 block text-xs font-semibold" style={{ color: designTokens.colors.textSecondary }}>
                        {item.copy}
                      </span>
                    </button>
                  )
                })}
              </div>

              {bookingMode === 'manual' ? (
                <div className="rounded-2xl border p-5" style={{ borderColor: designTokens.colors.border, backgroundColor: `${designTokens.colors.background}70` }}>
                  <div className="mb-5">
                    <h3 className="text-lg font-bold" style={{ color: designTokens.colors.textPrimary }}>
                      Request a Preferred Consultation Time
                    </h3>
                    <p className="mt-1 text-sm" style={{ color: designTokens.colors.textSecondary }}>
                      {`This request is visible to all eligible ${currentTabMeta.label.toLowerCase()}s. The first ${currentTabMeta.label.toLowerCase()} who accepts it will confirm your appointment.`}
                    </p>
                  </div>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <label className="block">
                      <span className="mb-2 block text-xs font-bold uppercase tracking-wider" style={{ color: designTokens.colors.textSecondary }}>
                        Preferred Date
                      </span>
                      <input
                        type="date"
                        value={manualDate}
                        min={new Date().toISOString().slice(0, 10)}
                        onChange={(event) => setManualDate(event.target.value)}
                        className="w-full rounded-xl border-2 bg-white px-4 py-3 text-sm font-semibold outline-none transition focus:border-[#1A1F36]"
                        style={{ borderColor: designTokens.colors.border, color: designTokens.colors.textPrimary }}
                      />
                    </label>
                    <label className="block">
                      <span className="mb-2 block text-xs font-bold uppercase tracking-wider" style={{ color: designTokens.colors.textSecondary }}>
                        Preferred Time
                      </span>
                      <input
                        type="time"
                        value={manualTime}
                        onChange={(event) => setManualTime(event.target.value)}
                        className="w-full rounded-xl border-2 bg-white px-4 py-3 text-sm font-semibold outline-none transition focus:border-[#1A1F36]"
                        style={{ borderColor: designTokens.colors.border, color: designTokens.colors.textPrimary }}
                      />
                    </label>
                  </div>
                  <div className="mt-5 rounded-xl border p-4" style={{ borderColor: `${designTokens.colors.secondary}30`, backgroundColor: `${designTokens.colors.secondary}08` }}>
                    <p className="text-sm font-bold" style={{ color: designTokens.colors.textPrimary }}>
                      {`Open ${currentTabMeta.label.toLowerCase()} request`}
                    </p>
                    <p className="mt-1 text-xs font-semibold" style={{ color: designTokens.colors.textSecondary }}>
                      {`Your payment stays attached to this request. You do not pay again when a ${currentTabMeta.label.toLowerCase()} accepts it.`}
                    </p>
                  </div>
                </div>
              ) : slotsLoading ? (
                <div className="space-y-6 py-4 animate-in fade-in duration-200">
                  <div className="flex gap-3 overflow-x-auto pb-2">
                    {[1, 2, 3, 4, 5].map((i) => (
                      <div key={i} className="min-w-24 h-20 rounded-2xl border-2 border-slate-200 bg-slate-50 animate-pulse" />
                    ))}
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 pt-2">
                    {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                      <div key={i} className="h-12 rounded-xl bg-slate-100 border border-slate-200 animate-pulse" />
                    ))}
                  </div>
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
                            className={`min-w-24 rounded-2xl border-2 px-4 py-3 text-center transition-all duration-200 hover:-translate-y-0.5 cursor-pointer ${
                              selected
                                ? 'border-[#00A884] bg-[#00A884] text-white shadow-md shadow-[#00A884]/20'
                                : 'border-slate-200 bg-white text-slate-800 hover:border-slate-300'
                            }`}
                          >
                            <span className="block text-xs font-bold">{getDateHeading(date)}</span>
                            <span className="block text-2xl font-bold leading-tight mt-1">{parts.day}</span>
                            <span className="block text-[11px] font-semibold opacity-80">{parts.weekday}</span>
                          </button>
                        )
                      })}
                    </div>
                  </div>

                  <div className="rounded-2xl border border-slate-200 p-5 bg-slate-50/60">
                    <div className="mb-5">
                      <h3 className="text-lg font-bold text-slate-900">
                        {selectedDate ? getDateHeading(selectedDate) : 'Selected Date'}
                      </h3>
                      <p className="text-xs font-semibold mt-1 text-slate-500">
                        {selectedDate ? formatSlotDate(selectedDate, true) : 'Choose a date above'}
                      </p>
                    </div>

                    {dateSlotsLoading ? (
                      <div className="flex items-center gap-3 rounded-xl p-5 border border-slate-200 bg-white">
                        <div className="w-6 h-6 border-3 border-emerald-100 border-t-[#00A884] rounded-full animate-spin" />
                        <p className="text-sm font-semibold text-slate-600">
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
                                <Icon className="w-4 h-4 text-[#00A884]" />
                                <p className="text-xs font-bold uppercase tracking-wider text-slate-600">
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
                                      className={`rounded-2xl border-2 px-4 py-4 text-left transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md cursor-pointer ${
                                        selected
                                          ? 'border-[#00A884] bg-emerald-50/70 text-[#00A884] shadow-md shadow-[#00A884]/15'
                                          : 'border-slate-200 bg-white text-slate-800 hover:border-slate-300'
                                      }`}
                                    >
                                      <span className="block text-base font-bold">{formatSlotTime(slot.time_slot)}</span>
                                      <span className="block text-[11px] font-semibold mt-1 text-slate-400">
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
                      <div className="rounded-xl p-5 border border-dashed border-slate-200 text-center bg-white">
                        <h3 className="text-base font-bold text-slate-800">
                          No slots available on this date.
                        </h3>
                        <p className="text-sm mt-2 text-slate-500">
                          Please choose another available date above.
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              ) : slotsError ? (
                <div className="rounded-2xl border border-slate-200 p-8 text-center bg-slate-50/70">
                  <div className="w-12 h-12 rounded-full bg-emerald-50 text-[#00A884] flex items-center justify-center mx-auto mb-3 border border-emerald-100">
                    <AlertCircle className="w-6 h-6" />
                  </div>
                  <h3 className="text-base font-bold text-slate-900">
                    {slotsError}
                  </h3>
                  <p className="text-xs mt-1.5 max-w-md mx-auto text-slate-500">
                    {slotsError.toLowerCase().includes('assessment')
                      ? 'Please complete your health intake assessment before proceeding to book your initial physician consultation.'
                      : `Please check your status or try reloading the latest ${currentTabMeta.label.toLowerCase()} schedules.`}
                  </p>
                  <div className="mt-5 flex items-center justify-center gap-3">
                    {slotsError.toLowerCase().includes('assessment') ? (
                      <button
                        type="button"
                        onClick={() => router.push('/patient/assessment')}
                        className="px-5 py-2.5 rounded-xl font-bold text-xs text-white bg-[#00A884] hover:bg-[#0A8F70] transition-all cursor-pointer shadow-sm"
                      >
                        Complete Health Assessment
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => void loadAvailableSlots()}
                        className="px-5 py-2.5 rounded-xl font-bold text-xs text-white bg-slate-900 hover:bg-slate-800 transition-all cursor-pointer shadow-sm"
                      >
                        Refresh Availability
                      </button>
                    )}
                  </div>
                </div>
              ) : (
                <div className="rounded-xl p-5 border border-dashed border-slate-200 text-center bg-white">
                  <h3 className="text-base font-bold" style={{ color: designTokens.colors.textPrimary }}>
                    No consultation times are currently available.
                  </h3>
                  <p className="text-sm mt-2" style={{ color: designTokens.colors.textSecondary }}>
                    You can join the waiting list, request a callback, or check again for future availability.
                  </p>
                  <button
                    type="button"
                    onClick={() => void loadAvailableSlots()}
                    className="mt-4 px-5 py-2.5 rounded-xl font-bold text-xs text-white transition-all cursor-pointer"
                    style={{ backgroundColor: designTokens.colors.primary }}
                  >
                    Check for New Slots
                  </button>
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
                      {bookingMode === 'manual'
                        ? (manualDate ? formatSlotDate(manualDate, true) : 'Not selected')
                        : (selectedSlot ? formatSlotDate(selectedSlot.available_date, true) : 'Not selected')}
                    </p>
                    <p className="text-sm mt-1" style={{ color: designTokens.colors.textSecondary }}>
                      {bookingMode === 'manual'
                        ? (manualTime ? `${formatSlotTime(manualTime)} - open doctor request` : 'Choose your preferred time')
                        : (selectedSlot ? formatSlotTime(selectedSlot.time_slot) : 'Choose an available time')}
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
                      {bookingMode === 'manual' ? `Open to eligible ${currentTabMeta.label.toLowerCase()}s` : activeProviderName}
                    </p>
                  </div>

                  <div className="pt-4 border-t-2" style={{ borderColor: designTokens.colors.border }}>
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-semibold uppercase" style={{ color: designTokens.colors.textTertiary }}>
                        Consultation Fee
                      </p>
                      <p className="font-bold" style={{ color: (activeProviderTab !== 'doctor' || isAlreadyPaid) ? '#0D9488' : designTokens.colors.textPrimary }}>
                        {activeProviderTab !== 'doctor'
                          ? '₹0 (Care Program Benefit)'
                          : (isAlreadyPaid ? (isActiveMemberFollowUp ? '₹0 (Member Benefit)' : '₹0 (Paid ✓)') : `INR ${CONSULTATION_FEE}`)}
                      </p>
                    </div>
                  </div>
                </div>

                {paymentError && (
                  <div className="flex items-start gap-2 rounded-xl p-3 mb-4 bg-red-50 text-red-700 text-xs font-medium border border-red-200">
                    <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                    <span>{paymentError}</span>
                  </div>
                )}

                {/* CTA Button */}
                <button
                  type="button"
                  onClick={handleConfirmBooking}
                  disabled={(bookingMode === 'slot' ? !selectedSlot : !selectedManualDateTime) || loading || patientDataLoading}
                  className="w-full py-4 px-6 rounded-2xl font-bold text-white transition-all duration-300 disabled:opacity-40 disabled:cursor-not-allowed hover:shadow-lg cursor-pointer bg-gradient-to-r from-[#00A884] to-[#0A8F70] hover:from-[#009977] hover:to-[#087F63] shadow-md shadow-[#00A884]/25 hover:scale-[1.01] active:scale-[0.99]"
                >
                  {loading
                    ? 'Processing...'
                    : activeProviderTab !== 'doctor'
                    ? `Confirm ${currentTabMeta.label} Appointment (₹0)`
                    : (isAlreadyPaid ? 'Confirm Appointment (₹0)' : 'Pay & Confirm Appointment')}
                </button>

                <p className="text-xs text-center text-slate-400 font-medium">
                  You can reschedule anytime in your account
                </p>
              </div>
            </div>
          </div>

          {/* Guidance Section */}
          <div className="rounded-3xl p-8 border border-slate-200/80 mb-8 bg-white shadow-xs">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-[#00A884] flex items-center justify-center border border-emerald-100">
                <Shield className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-xl font-bold font-sora text-slate-900">
                  What Happens Next
                </h2>
                <p className="text-sm mt-0.5 text-slate-500 font-sans">
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
                  description: `Your dashboard will show the ${currentTabMeta.label.toLowerCase()}, date, time, status, and countdown once the appointment is assigned.`
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
      )}
    </div>
  )
}
