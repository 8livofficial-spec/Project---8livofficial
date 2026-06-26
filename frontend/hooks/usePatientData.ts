'use client'

import React, { useState, useEffect, createContext, useContext, useCallback } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { usePathname } from 'next/navigation'


const PATIENT_STATUS_CACHE_MS = 15000
let patientStatusCache: { userId: string; data: any; fetchedAt: number } | null = null
const patientStatusRequests = new Map<string, Promise<any>>()

async function fetchPatientStatus(userId: string, accessToken: string, force = false) {
  const now = Date.now()
  if (!force && patientStatusCache?.userId === userId && now - patientStatusCache.fetchedAt < PATIENT_STATUS_CACHE_MS) {
    return patientStatusCache.data
  }

  if (!force && patientStatusRequests.has(userId)) {
    return patientStatusRequests.get(userId)!
  }

  const request = fetch(`/api/patient/status?patientId=${userId}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
    .then(async (res) => {
      if (!res.ok) throw new Error("Failed to fetch patient onboarding status from backend API")
      const data = await res.json()
      patientStatusCache = { userId, data, fetchedAt: Date.now() }
      return data
    })
    .finally(() => {
      patientStatusRequests.delete(userId)
    })

  patientStatusRequests.set(userId, request)
  return request
}

async function fetchPatientDashboard(userId: string, accessToken: string) {
  const res = await fetch(`/api/patient/dashboard?patientId=${userId}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  if (!res.ok) throw new Error("Failed to fetch patient dashboard from backend API")
  return res.json()
}


export interface PatientProfile {
  id: string
  first_name?: string
  last_name?: string
  display_id?: string
  role?: string
  phone_number?: string
}

export interface HealthAssessment {
  id: string
  patient_id: string
  first_name?: string
  last_name?: string
  age?: number
  phone_number?: string
  address?: string
  agree_terms?: boolean
  height_cm?: number
  weight_kg?: number
  goal_weight_kg?: number
  is_eligible?: boolean
  booking_date?: string
  booking_time?: string
  room_url?: string
  membership_tier?: string
  shipping_state?: string
  consultation_fee_paid?: boolean
  created_at?: string
  updated_at?: string
}

export interface WeightLog {
  id: string
  created_at: string
  weight_kg: number
}

export interface Consultation {
  id: string
  patient_id: string
  doctor_id?: string
  booking_date?: string
  booking_time?: string
  status?: string
  prescription_text?: string
  room_url?: string
  created_at?: string
  updated_at?: string
  doctor_profiles?: {
    full_name?: string
    specialty?: string
  }
}

export interface Notification {
  id: string
  patient_id: string
  type?: string
  title?: string
  message?: string
  is_read?: boolean
  created_at: string
}

export interface StaffConsultation {
  id: string
  staff_id?: string
  staff_role?: string
  appointment_type?: string
  patient_id: string
  booking_date?: string
  booking_time?: string
  status?: string
  room_url?: string
  meeting_url?: string
  meeting_provider?: string
  meeting_room?: string
  consultation_notes?: string
  created_at?: string
}

export interface DietPlan {
  id: string
  patient_id: string
  dietitian_id?: string
  calories_per_day?: number
  meal_schedule?: string
  food_restrictions?: string
  hydration_goal?: string
  notes?: string
  status?: string
  appointment_id?: string
  title?: string
  description?: string
  attachment_url?: string
  attachment_type?: string
  created_at?: string
  updated_at?: string
}

export interface FitnessPlan {
  id: string
  patient_id: string
  fitness_coach_id?: string
  workout_type?: string
  weekly_frequency?: number
  daily_step_goal?: number
  exercise_restrictions?: string
  notes?: string
  status?: string
  appointment_id?: string
  title?: string
  description?: string
  attachment_url?: string
  attachment_type?: string
  created_at?: string
  updated_at?: string
}

export interface PatientOnboardingState {
  onboardingCompleted: boolean
  appointmentBooked: boolean
  assessmentStatus?: string
  eligibilityStatus?: string
  consultationPaymentStatus?: string
  appointmentStatus?: string
  consultationStatus?: string
  membershipStatus?: string
  membershipExpiresAt?: string | null
  dashboardAccess?: boolean
  firstConsultationCompleted?: boolean
  currentJourneyStep?: string | null
  appointmentType?: string | null
  bookingId?: string | null
  paymentId?: string | null
}

/**
 * flowStep drives the onboarding gate in the layout:
 *   'loading'        - data not yet fetched
 *   'needs_consultation' - assessment completed and eligible, but no attended doctor session yet → redirect to consultation booking
 *   'needs_plan'         - no membership_tier set → redirect to plan selection
 *   'needs_payment'      - plan chosen but consultation_fee_paid=false → redirect to payment
 *   'ready'              - fully onboarded, show dashboard
 */
export type FlowStep = 'loading' | 'needs_assessment' | 'not_eligible' | 'needs_consultation' | 'appointment_scheduled' | 'needs_plan' | 'needs_payment' | 'ready'

export interface PatientDataContextValue {
  user: any
  profile: PatientProfile | null
  assessment: HealthAssessment | null
  weightLogs: WeightLog[]
  consultations: Consultation[]
  consultation: Consultation | null
  notifications: Notification[]
  careTeam: any
  staffConsultations: StaffConsultation[]
  onboardingState: PatientOnboardingState
  loading: boolean
  error: string | null
  flowStep: FlowStep
  reloadData: (options?: { force?: boolean }) => Promise<void>
  dietPlan: DietPlan | null
  fitnessPlan: FitnessPlan | null
}

const PatientDataContext = createContext<PatientDataContextValue | null>(null)

export function PatientDataProvider({ children }: { children: React.ReactNode }) {
  const value = usePatientDataInternal()
  return React.createElement(PatientDataContext.Provider, { value }, children)
}

export function usePatientData() {
  const context = useContext(PatientDataContext)
  if (!context) {
    return usePatientDataInternal()
  }
  return context
}

function usePatientDataInternal() {
  const pathname = usePathname()
  const [user, setUser] = useState<any>(null)
  const [profile, setProfile] = useState<PatientProfile | null>(null)
  const [assessment, setAssessment] = useState<HealthAssessment | null>(null)
  const [weightLogs, setWeightLogs] = useState<WeightLog[]>([])
  const [consultations, setConsultations] = useState<Consultation[]>([])
  const [consultation, setConsultation] = useState<Consultation | null>(null) // Latest doctor consult for meds
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [onboardingState, setOnboardingState] = useState<PatientOnboardingState>({
    onboardingCompleted: false,
    appointmentBooked: false,
    bookingId: null,
    paymentId: null
  })
  const [staffConsultations, setStaffConsultations] = useState<StaffConsultation[]>([])
  const [careTeam, setCareTeam] = useState<any>({
    doctor_name: 'Not Assigned',
    dietitian_name: 'Not Assigned',
    nutritionist_name: 'Not Assigned',
    fitness_coach_name: 'Not Assigned',
    trainer_name: 'Not Assigned',
    dietitian_notes: null,
    nutritionist_notes: null,
    trainer_notes: null
  })
  const [dietPlan, setDietPlan] = useState<DietPlan | null>(null)
  const [fitnessPlan, setFitnessPlan] = useState<FitnessPlan | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [flowStep, setFlowStep] = useState<FlowStep>('loading')

  const reloadData = useCallback(async (options?: { force?: boolean }) => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        setLoading(false)
        setFlowStep('ready') // will be handled by auth redirect elsewhere
        setDietPlan(null)
        setFitnessPlan(null)
        return
      }

      setUser(session.user)

      if (pathname === '/patient') {
        // Aggregated Dashboard call: loads everything in one batch
        const dashboardData = await fetchPatientDashboard(
          session.user.id,
          session.access_token,
        )

        setProfile(dashboardData.profile)
        setAssessment(dashboardData.assessment)
        setCareTeam(dashboardData.careTeam || {
          doctor_name: 'Not Assigned',
          dietitian_name: 'Not Assigned',
          nutritionist_name: 'Not Assigned',
          fitness_coach_name: 'Not Assigned',
          trainer_name: 'Not Assigned',
          dietitian_notes: null,
          nutritionist_notes: null,
          trainer_notes: null
        })
        setStaffConsultations(dashboardData.staffConsultations || [])
        setOnboardingState({
          onboardingCompleted: dashboardData.onboardingCompleted === true,
          appointmentBooked: dashboardData.appointmentBooked === true,
          assessmentStatus: dashboardData.assessmentStatus,
          eligibilityStatus: dashboardData.eligibilityStatus,
          consultationPaymentStatus: dashboardData.consultationPaymentStatus,
          appointmentStatus: dashboardData.appointmentStatus,
          consultationStatus: dashboardData.consultationStatus,
          membershipStatus: dashboardData.membershipStatus,
          membershipExpiresAt: dashboardData.membershipExpiresAt || null,
          dashboardAccess: dashboardData.dashboardAccess === true,
          firstConsultationCompleted: dashboardData.firstConsultationCompleted === true,
          currentJourneyStep: dashboardData.currentJourneyStep || null,
          appointmentType: dashboardData.appointmentType || null,
          bookingId: dashboardData.bookingId || null,
          paymentId: dashboardData.paymentId || null
        })

        setWeightLogs(dashboardData.weightLogs || [])
        setConsultations(dashboardData.consultations || [])
        if (dashboardData.consultations && dashboardData.consultations.length > 0) {
          setConsultation(dashboardData.consultations[0])
        }
        setNotifications(dashboardData.notifications || [])
        setDietPlan(dashboardData.dietPlan || null)
        setFitnessPlan(dashboardData.fitnessPlan || null)

        // Set Flow Step
        const assessRow = dashboardData.assessment
        const assessmentStatus = dashboardData.assessmentStatus
        const eligibilityStatus = dashboardData.eligibilityStatus
        const consultationPaymentStatus = dashboardData.consultationPaymentStatus
        const appointmentStatus = dashboardData.appointmentStatus
        const consultationStatus = dashboardData.consultationStatus
        const membershipStatus = dashboardData.membershipStatus
        const dashboardAccess = dashboardData.dashboardAccess === true
        const firstConsultationCompleted = dashboardData.firstConsultationCompleted === true

        // Derive onboarding flow step
        if (dashboardAccess) {
          setFlowStep('ready')
        } else if (dashboardData.bookingId && consultationStatus !== 'COMPLETED' && membershipStatus === 'NOT_SELECTED') {
          setFlowStep('appointment_scheduled')
        } else if (consultationStatus === 'COMPLETED' && membershipStatus === 'NOT_SELECTED') {
          setFlowStep('needs_plan')
        } else if (assessRow?.membership_tier && membershipStatus !== 'ACTIVE') {
          setFlowStep('needs_payment')
        } else if (assessRow?.is_eligible) {
          setFlowStep('needs_consultation')
        } else {
          setFlowStep('needs_plan')
        }

        const journeyFlowStep: FlowStep = dashboardAccess
          || (membershipStatus === 'ACTIVE' && firstConsultationCompleted)
          ? 'ready'
          : assessmentStatus !== 'COMPLETED'
            ? 'needs_assessment'
            : eligibilityStatus === 'NOT_ELIGIBLE'
              ? 'not_eligible'
              : eligibilityStatus !== 'ELIGIBLE' && eligibilityStatus !== 'REVIEW_REQUIRED'
              ? 'needs_assessment'
              : consultationPaymentStatus === 'PAID' && appointmentStatus === 'SCHEDULED' && consultationStatus !== 'COMPLETED'
                ? 'appointment_scheduled'
                : consultationStatus === 'COMPLETED' && membershipStatus === 'NOT_SELECTED'
                  ? 'needs_plan'
                  : consultationStatus === 'COMPLETED' && membershipStatus === 'SELECTED'
                    ? 'needs_payment'
                    : 'needs_consultation'

        setFlowStep(journeyFlowStep)
      } else {
        // Lightweight status call (bypasses large collections queries)
        const statusData = await fetchPatientStatus(
          session.user.id,
          session.access_token,
          options?.force === true,
        )

        setProfile(statusData.profile)
        setAssessment(statusData.assessment)
        setCareTeam(statusData.careTeam || {
          doctor_name: 'Not Assigned',
          dietitian_name: 'Not Assigned',
          nutritionist_name: 'Not Assigned',
          fitness_coach_name: 'Not Assigned',
          trainer_name: 'Not Assigned',
          dietitian_notes: null,
          nutritionist_notes: null,
          trainer_notes: null
        })
        setStaffConsultations(statusData.staffConsultations || [])
        setOnboardingState({
          onboardingCompleted: statusData.onboardingCompleted === true,
          appointmentBooked: statusData.appointmentBooked === true,
          assessmentStatus: statusData.assessmentStatus,
          eligibilityStatus: statusData.eligibilityStatus,
          consultationPaymentStatus: statusData.consultationPaymentStatus,
          appointmentStatus: statusData.appointmentStatus,
          consultationStatus: statusData.consultationStatus,
          membershipStatus: statusData.membershipStatus,
          membershipExpiresAt: statusData.membershipExpiresAt || null,
          dashboardAccess: statusData.dashboardAccess === true,
          firstConsultationCompleted: statusData.firstConsultationCompleted === true,
          currentJourneyStep: statusData.currentJourneyStep || null,
          appointmentType: statusData.appointmentType || null,
          bookingId: statusData.bookingId || null,
          paymentId: statusData.paymentId || null
        })

        // Set Flow Step
        const assessRow = statusData.assessment
        const assessmentStatus = statusData.assessmentStatus
        const eligibilityStatus = statusData.eligibilityStatus
        const consultationPaymentStatus = statusData.consultationPaymentStatus
        const appointmentStatus = statusData.appointmentStatus
        const consultationStatus = statusData.consultationStatus
        const membershipStatus = statusData.membershipStatus
        const dashboardAccess = statusData.dashboardAccess === true
        const firstConsultationCompleted = statusData.firstConsultationCompleted === true

        // Derive onboarding flow step
        if (dashboardAccess) {
          setFlowStep('ready')
        } else if (statusData.bookingId && consultationStatus !== 'COMPLETED' && membershipStatus === 'NOT_SELECTED') {
          setFlowStep('appointment_scheduled')
        } else if (consultationStatus === 'COMPLETED' && membershipStatus === 'NOT_SELECTED') {
          setFlowStep('needs_plan')
        } else if (assessRow?.membership_tier && membershipStatus !== 'ACTIVE') {
          setFlowStep('needs_payment')
        } else if (assessRow?.is_eligible) {
          setFlowStep('needs_consultation')
        } else {
          setFlowStep('needs_plan')
        }

        const journeyFlowStep: FlowStep = dashboardAccess
          || (membershipStatus === 'ACTIVE' && firstConsultationCompleted)
          ? 'ready'
          : assessmentStatus !== 'COMPLETED'
            ? 'needs_assessment'
            : eligibilityStatus === 'NOT_ELIGIBLE'
              ? 'not_eligible'
              : eligibilityStatus !== 'ELIGIBLE' && eligibilityStatus !== 'REVIEW_REQUIRED'
              ? 'needs_assessment'
              : consultationPaymentStatus === 'PAID' && appointmentStatus === 'SCHEDULED' && consultationStatus !== 'COMPLETED'
                ? 'appointment_scheduled'
                : consultationStatus === 'COMPLETED' && membershipStatus === 'NOT_SELECTED'
                  ? 'needs_plan'
                  : consultationStatus === 'COMPLETED' && membershipStatus === 'SELECTED'
                    ? 'needs_payment'
                    : 'needs_consultation'

        setFlowStep(journeyFlowStep)

        // Lazy load module-specific collections only when matching pages are opened
        if (assessRow) {
          if (pathname === '/patient/progress') {
            const [logsRes, consultsRes] = await Promise.all([
              supabase
                .from('progress_logs')
                .select('*')
                .eq('user_id', session.user.id)
                .order('created_at', { ascending: true }),
              supabase
                .from('doctor_consultations')
                .select('id, patient_id, doctor_id, booking_date, booking_time, status, prescription_text, room_url, created_at, updated_at')
                .eq('patient_id', session.user.id)
                .order('created_at', { ascending: false })
            ])
            setWeightLogs(logsRes.data || [])
            setConsultations(consultsRes.data || [])
            if (consultsRes.data && consultsRes.data.length > 0) {
              setConsultation(consultsRes.data[0])
            }
          } else if (pathname === '/patient/notifications') {
            const { data: notifs } = await supabase
              .from('patient_notifications')
              .select('*')
              .eq('patient_id', session.user.id)
              .order('created_at', { ascending: false })
            setNotifications(notifs || [])
          } else if (pathname === '/patient/appointments') {
            const [consultsRes, staffConsultsRes] = await Promise.all([
              supabase
                .from('doctor_consultations')
                .select('id, patient_id, doctor_id, booking_date, booking_time, status, prescription_text, room_url, created_at, updated_at')
                .eq('patient_id', session.user.id)
                .order('created_at', { ascending: false }),
              supabase
                .from('staff_consultations')
                .select('*')
                .eq('patient_id', session.user.id)
                .order('created_at', { ascending: false })
            ])
            setConsultations(consultsRes.data || [])
            if (consultsRes.data && consultsRes.data.length > 0) {
              setConsultation(consultsRes.data[0])
            }
            setStaffConsultations(staffConsultsRes.data || [])
          } else if (pathname === '/patient/prescriptions') {
            const { data: consults } = await supabase
              .from('doctor_consultations')
              .select('id, patient_id, doctor_id, booking_date, booking_time, status, prescription_text, room_url, created_at, updated_at')
              .eq('patient_id', session.user.id)
              .order('created_at', { ascending: false })
            if (consults && consults.length > 0) {
              setConsultation(consults[0])
            }
          }
        }
      }

    } catch (err: any) {
      console.error("Error fetching patient data:", err)
      setError(err.message || "Failed to load patient data.")
    } finally {
      setLoading(false)
    }
  }, [pathname])

  useEffect(() => {
    reloadData()
  }, [reloadData])

  useEffect(() => {
    if (!user?.id) return

    // Realtime channel for live notifications updates with unique suffix to avoid cache collisions
    const channelName = `live-notifs-${user.id}-${Math.floor(Math.random() * 1000000)}`
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'patient_notifications',
          filter: `patient_id=eq.${user.id}`
        },
        () => {
          // Trigger data reload immediately to refresh dashboard indicators
          reloadData({ force: true })
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [user?.id, reloadData])

  return {
    user,
    profile,
    assessment,
    weightLogs,
    consultations,
    consultation,
    notifications,
    careTeam,
    staffConsultations,
    onboardingState,
    loading,
    error,
    flowStep,
    reloadData,
    dietPlan,
    fitnessPlan
  }
}
