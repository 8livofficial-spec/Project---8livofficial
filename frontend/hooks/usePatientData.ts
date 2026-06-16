'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabaseClient'

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
  patient_id: string
  booking_date?: string
  booking_time?: string
  status?: string
  room_url?: string
  consultation_notes?: string
  created_at?: string
}

export interface DoctorSlot {
  id: string
  doctor_id?: string
  available_date: string
  time_slot: string
  is_booked?: boolean
}

/**
 * flowStep drives the onboarding gate in the layout:
 *   'loading'        - data not yet fetched
 *   'needs_plan'     - no membership_tier set → redirect to plan selection
 *   'needs_payment'  - plan chosen but consultation_fee_paid=false → redirect to payment
 *   'ready'          - fully onboarded, show dashboard
 */
export type FlowStep = 'loading' | 'needs_plan' | 'needs_payment' | 'ready'

export function usePatientData() {
  const [user, setUser] = useState<any>(null)
  const [profile, setProfile] = useState<PatientProfile | null>(null)
  const [assessment, setAssessment] = useState<HealthAssessment | null>(null)
  const [weightLogs, setWeightLogs] = useState<WeightLog[]>([])
  const [consultations, setConsultations] = useState<Consultation[]>([])
  const [consultation, setConsultation] = useState<Consultation | null>(null) // Latest doctor consult for meds
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [doctorSlots, setDoctorSlots] = useState<DoctorSlot[]>([])
  const [staffConsultations, setStaffConsultations] = useState<StaffConsultation[]>([])
  const [careTeam, setCareTeam] = useState<any>({
    doctor_name: 'Not Assigned',
    dietitian_name: 'Not Assigned',
    trainer_name: 'Not Assigned',
    dietitian_notes: null,
    trainer_notes: null
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [flowStep, setFlowStep] = useState<FlowStep>('loading')

  const reloadData = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        setLoading(false)
        setFlowStep('ready') // will be handled by auth redirect elsewhere
        return
      }

      setUser(session.user)

      // Fetch profile and assessment securely via backend API to bypass RLS select issues
      const res = await fetch(`/api/patient/status?patientId=${session.user.id}`)
      if (!res.ok) throw new Error("Failed to fetch patient onboarding status from backend API")
      const statusData = await res.json()

      setProfile(statusData.profile)
      setAssessment(statusData.assessment)
      setCareTeam(statusData.careTeam || {
        doctor_name: 'Not Assigned',
        dietitian_name: 'Not Assigned',
        trainer_name: 'Not Assigned',
        dietitian_notes: null,
        trainer_notes: null
      })
      setStaffConsultations(statusData.staffConsultations || [])
      const assessRow = statusData.assessment

      // 3. Derive onboarding flow step
      if (!assessRow || !assessRow.membership_tier) {
        // No plan chosen yet — gate to plan selection
        setFlowStep('needs_plan')
      } else if (!assessRow.consultation_fee_paid) {
        // Plan chosen but payment not done — gate to payment
        setFlowStep('needs_payment')
      } else {
        setFlowStep('ready')
      }

      // Only load the rest if we have a real assessment
      if (assessRow) {
        // 4. Fetch Weight Logs
        const { data: logs } = await supabase
          .from('progress_logs')
          .select('*')
          .eq('user_id', session.user.id)
          .order('created_at', { ascending: true })
        setWeightLogs(logs || [])

        // 5. Fetch consultations
        const { data: consults } = await supabase
          .from('doctor_consultations')
          .select('*, doctor_profiles(full_name, specialty)')
          .eq('patient_id', session.user.id)
          .order('created_at', { ascending: false })
        
        if (consults) {
          setConsultations(consults)
          // Find the latest "Doctor" consultation for prescription/medicine info
          const latestDoc = consults.find(c => !c.doctor_profiles?.specialty || c.doctor_profiles.specialty === 'Physician' || !['Dietitian', 'Fitness Trainer'].includes(c.doctor_profiles.specialty))
          if (latestDoc) {
            setConsultation(latestDoc)
          } else if (consults.length > 0) {
            setConsultation(consults[0])
          }
        }

        // 5b. Fetch staff consultations (trainer/dietitian sessions)
        const { data: staffConsults } = await supabase
          .from('staff_consultations')
          .select('*')
          .eq('patient_id', session.user.id)
          .order('created_at', { ascending: false })
        setStaffConsultations(staffConsults || [])

        // 6. Fetch Notifications
        const { data: notifs } = await supabase
          .from('patient_notifications')
          .select('*')
          .eq('patient_id', session.user.id)
          .order('created_at', { ascending: false })
        setNotifications(notifs || [])

        // 7. Fetch available Doctor Slots
        const { data: slots } = await supabase
          .from('doctor_availability')
          .select('*')
          .eq('is_booked', false)
        setDoctorSlots(slots || [])
      }

    } catch (err: any) {
      console.error("Error fetching patient data:", err)
      setError(err.message || "Failed to load patient data.")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    reloadData()
  }, [])

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
          reloadData()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [user?.id])

  return {
    user,
    profile,
    assessment,
    weightLogs,
    consultations,
    consultation,
    notifications,
    doctorSlots,
    careTeam,
    staffConsultations,
    loading,
    error,
    flowStep,
    reloadData
  }
}
