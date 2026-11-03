'use client'

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import {
  Activity,
  Apple,
  Calendar,
  CheckCircle2,
  ChevronRight,
  Clock,
  Download,
  Eye,
  FileCheck,
  FilePlus,
  FileText,
  Filter,
  Flame,
  HeartPulse,
  History,
  Info,
  LayoutDashboard,
  LogOut,
  MessageSquare,
  Plus,
  RefreshCw,
  Search,
  Send,
  Settings,
  ShieldAlert,
  Sparkles,
  TrendingDown,
  TrendingUp,
  UserCheck,
  Users,
  Utensils,
  Video,
  Wallet,
  XCircle,
  Droplets,
  AlertTriangle,
  CalendarDays,
  Trash2,
  Upload,
  MoreVertical,
  Check,
  Layers,
  ExternalLink,
  BookOpen,
  Volume2,
  VolumeX,
  BellRing,
  PhoneCall,
} from 'lucide-react'
import { supabase } from '@/lib/supabaseClient'
import ProviderProfileEditor from '@/components/provider/ProviderProfileEditor'
import ProviderAvailabilityScheduler, { AvailabilitySubmission } from '@/components/scheduling/ProviderAvailabilityScheduler'
import ProviderProtocolBuilderModal from '@/components/protocol/ProviderProtocolBuilderModal'
import OfficialProtocolModal from '@/components/protocol/OfficialProtocolModal'

// ==========================================
// TYPES & SCHEMAS
// ==========================================

type SectionKey =
  | 'dashboard'
  | 'patients'
  | 'assessments'
  | 'plans'
  | 'food-logs'
  | 'progress'
  | 'consultations'
  | 'schedule'
  | 'wallet'
  | 'profile'

type AvailabilitySlot = {
  id: string
  available_date: string
  start_time: string
  end_time: string
  is_available?: boolean
  source?: 'MANUAL' | 'GENERATED'
  status?: 'AVAILABLE' | 'BOOKED' | 'CANCELLED' | 'EXPIRED'
}

type ProviderConsultation = {
  id: string
  patient_id?: string
  patientName: string
  staff_role?: string
  roleLabel?: string
  booking_date?: string
  booking_time?: string
  status?: string
  meetingUrl?: string
  canJoin?: boolean
  appointmentType?: string
}

type MealItem = {
  food: string
  portion: string
  unit: string
  alternative?: string
  instructions?: string
}

type Meal = {
  id: string
  name: string
  time?: string
  items: MealItem[]
}

type PatientRecord = {
  id: string
  patient_name: string
  email?: string
  phone?: string
  gender?: string
  age?: number
  current_weight?: number | null
  height_cm?: number | null
  bmi?: number | null
  weight_change?: number | null
  active_plan_name?: string | null
  active_plan_version?: number | null
  active_plan_status?: string
  review_date?: string | null
  joined_at?: string
}

type PlanRecord = {
  id: string
  plan_name: string
  version: number
  status: 'DRAFT' | 'PUBLISHED' | 'ACKNOWLEDGED' | 'ARCHIVED' | 'ACTIVE' | string
  patient_id: string
  dietitian_id: string
  start_date?: string
  review_date?: string | null
  daily_calorie_target?: number | null
  water_target_liters: number
  meals?: Meal[]
  nutrition_goals?: string | null
  general_instructions?: string | null
  pdf_url?: string | null
  pdf_hash?: string | null
  attachment_url?: string | null
  attachment_type?: string | null
  attachment_signed_url?: string | null
  description?: string | null
  meal_schedule?: string | null
  food_restrictions?: string | null
  hydration_goal?: string | null
  notes?: string | null
  created_at: string
  updated_at: string
  profiles?: {
    full_name?: string
    email?: string
    phone?: string
  }
}

type TemplateRecord = {
  id: string
  name: string
  category: string
  description?: string | null
  target_calories?: number | null
  water_target_liters: number
  meals: Meal[]
  instructions?: string | null
}

type FoodLogRecord = {
  id: string
  patient_id: string
  log_date: string
  meal_type: string
  time?: string | null
  food_items: string
  portion?: string | null
  water_liters?: number | null
  notes?: string | null
  completed: boolean
  dietitian_reviewed: boolean
  dietitian_comment?: string | null
  dietitian_reviewed_at?: string | null
  created_at: string
  profiles?: {
    full_name?: string
  }
}

function formatInr(val: number) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(val || 0)
}

const formatDate = (value: string | null) => value ? new Date(value).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }) : '-'

const formatTime = (time?: string | null) => {
  if (!time) return '-'
  const [hourText, minuteText] = String(time).split(':')
  const date = new Date()
  date.setHours(Number(hourText), Number(minuteText), 0, 0)
  return date.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
}

const formatTimeKey = (time?: string | null) => String(time || '').slice(0, 5)

// ==========================================
// MAIN DIETITIAN PORTAL COMPONENT
// ==========================================

function DietitianPortalInner({ defaultSection = 'dashboard' }: { defaultSection?: SectionKey }) {
  const router = useRouter()
  const searchParams = useSearchParams()


  const [activeSection, setActiveSection] = useState<SectionKey>(defaultSection)
  const [providerUser, setProviderUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  // Dashboard Data State
  const [dashboardMetrics, setDashboardMetrics] = useState<any>(null)
  const [todaysActions, setTodaysActions] = useState<any[]>([])
  const [patientsNeedingAttention, setPatientsNeedingAttention] = useState<any[]>([])
  const [recentActivity, setRecentActivity] = useState<any[]>([])

  // Patient Workspace State
  const [patients, setPatients] = useState<PatientRecord[]>([])
  const [patientSearch, setPatientSearch] = useState('')
  const [selectedPatient, setSelectedPatient] = useState<PatientRecord | null>(null)
  const [workspaceData, setWorkspaceData] = useState<any>(null)
  const [workspaceTab, setWorkspaceTab] = useState<'overview' | 'assessment' | 'plans' | 'food-logs' | 'progress' | 'consultations'>('overview')

  // Plans & Templates State
  const [plans, setPlans] = useState<PlanRecord[]>([])
  const [templates, setTemplates] = useState<TemplateRecord[]>([])
  const [planSubTab, setPlanSubTab] = useState<'active' | 'drafts' | 'templates' | 'history'>('active')
  const [editingPlan, setEditingPlan] = useState<Partial<PlanRecord> | null>(null)
  const [isPublishing, setIsPublishing] = useState(false)

  // Food Logs State
  const [foodLogs, setFoodLogs] = useState<FoodLogRecord[]>([])
  const [foodLogFilter, setFoodLogFilter] = useState<'all' | 'unreviewed'>('all')
  const [reviewComment, setReviewComment] = useState('')
  const [selectedLogId, setSelectedLogId] = useState('')

  // Communication State
  const [commType, setCommType] = useState('CLINICAL_CONCERN')
  const [commSummary, setCommSummary] = useState('')
  const [commMessage, setCommMessage] = useState('')
  const [sendingComm, setSendingComm] = useState(false)

  // Wallet State (Exact reuse)
  const [walletState, setWalletState] = useState<any>({ balance: 0, pending_payout: 0, completed_payout: 0, lifetime_earnings: 0 })
  const [walletTransactions, setWalletTransactions] = useState<any[]>([])
  const [walletPayouts, setWalletPayouts] = useState<any[]>([])
  const [showPayoutModal, setShowPayoutModal] = useState(false)
  const [payoutAmount, setPayoutAmount] = useState('')
  const [payoutError, setPayoutError] = useState('')
  const [payoutRequesting, setPayoutRequesting] = useState(false)

  // Consultations & Availability State
  const [availability, setAvailability] = useState<AvailabilitySlot[]>([])
  const [dietitianConsultations, setDietitianConsultations] = useState<ProviderConsultation[]>([])
  const [consultationStats, setConsultationStats] = useState<any>({})
  const [consultationsSearch, setConsultationsSearch] = useState('')
  const [consultationsStatus, setConsultationsStatus] = useState('')
  const [consultationsPage, setConsultationsPage] = useState(1)
  const [consultationsTotalPages, setConsultationsTotalPages] = useState(1)
  const [savingAvailability, setSavingAvailability] = useState(false)

  // Quick Slot State
  const [showQuickSlotModal, setShowQuickSlotModal] = useState(false)
  const [quickSlotDate, setQuickSlotDate] = useState(() => {
    const d = new Date()
    d.setDate(d.getDate() + 1)
    return d.toISOString().split('T')[0]
  })
  const [quickSlotTime, setQuickSlotTime] = useState('10:00')
  const [quickSlotDuration, setQuickSlotDuration] = useState(30)
  const [savingQuickSlot, setSavingQuickSlot] = useState(false)

  // Upload Nutrition Plan State
  const [showUploadPlanModal, setShowUploadPlanModal] = useState(false)
  const [uploadPlanPatientId, setUploadPlanPatientId] = useState('')
  const [uploadPlanAppointmentId, setUploadPlanAppointmentId] = useState('')
  const [uploadPlanTitle, setUploadPlanTitle] = useState('Personalized Clinical Nutrition Plan')
  const [uploadPlanCalories, setUploadPlanCalories] = useState('1600')
  const [uploadPlanWater, setUploadPlanWater] = useState('2.5')
  const [uploadPlanNotes, setUploadPlanNotes] = useState('')
  const [uploadPlanFile, setUploadPlanFile] = useState<File | null>(null)
  const [uploadingPlan, setUploadingPlan] = useState(false)
  const [planAssignMode, setPlanAssignMode] = useState<'upload' | 'template'>('upload')
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('')

  // Official Letterhead Protocol Builder & Viewer State
  const [showProtocolBuilder, setShowProtocolBuilder] = useState(false)
  const [protocolBuilderPatient, setProtocolBuilderPatient] = useState<{ id: string; name?: string } | null>(null)
  const [protocolBuilderConsultation, setProtocolBuilderConsultation] = useState<any>(null)
  const [viewingOfficialProtocol, setViewingOfficialProtocol] = useState<any>(null)

  // Consultation Row Action State
  const [actionMenuOpenSessionId, setActionMenuOpenSessionId] = useState<string | null>(null)
  const [confirmModal, setConfirmModal] = useState<{
    type: 'missed' | 'cancel'
    sessionId: string
    patientName: string
  } | null>(null)

  const allPatientOptions = useMemo(() => {
    const map = new Map<string, { id: string; name: string }>()
    for (const p of patients) {
      map.set(p.id, { id: p.id, name: p.patient_name || p.email || 'Patient' })
    }
    for (const c of dietitianConsultations) {
      if (c.patient_id && !map.has(c.patient_id)) {
        map.set(c.patient_id, { id: c.patient_id, name: c.patientName || 'Patient' })
      }
    }
    return Array.from(map.values())
  }, [patients, dietitianConsultations])

  // Computed Today & Agenda for Clean Clinical Dashboard
  const todayDateStr = useMemo(() => new Date().toISOString().split('T')[0], [])
  const todayConsultations = useMemo(() => {
    return dietitianConsultations.filter((c) => c.booking_date === todayDateStr)
  }, [dietitianConsultations, todayDateStr])

  const pendingPlanConsultations = useMemo(() => {
    return dietitianConsultations.filter(
      (c) => String(c.status || '').toLowerCase() === 'attended'
    )
  }, [dietitianConsultations])

  // Telehealth Audio Chime Generator
  const playTelehealthChime = useCallback(() => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext
      if (!AudioCtx) return
      const ctx = new AudioCtx()
      if (ctx.state === 'suspended') ctx.resume().catch(() => {})
      const now = ctx.currentTime

      const osc1 = ctx.createOscillator()
      const osc2 = ctx.createOscillator()
      const gain = ctx.createGain()

      osc1.type = 'sine'
      osc1.frequency.setValueAtTime(523.25, now)
      osc1.frequency.setValueAtTime(783.99, now + 0.18)

      osc2.type = 'triangle'
      osc2.frequency.setValueAtTime(523.25, now)
      osc2.frequency.setValueAtTime(783.99, now + 0.18)

      gain.gain.setValueAtTime(0.001, now)
      gain.gain.linearRampToValueAtTime(0.2, now + 0.04)
      gain.gain.setValueAtTime(0.2, now + 0.16)
      gain.gain.linearRampToValueAtTime(0.25, now + 0.22)
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.75)

      osc1.connect(gain)
      osc2.connect(gain)
      gain.connect(ctx.destination)

      osc1.start(now)
      osc2.start(now)
      osc1.stop(now + 0.75)
      osc2.stop(now + 0.75)
    } catch (err) {
      console.debug('Telehealth chime notice:', err)
    }
  }, [])

  // Robust session joinability evaluator
  const isSessionJoinable = useCallback((sess: any): boolean => {
    if (!sess) return false
    const status = String(sess.status || '').toLowerCase()
    if (['completed', 'cancelled', 'cancelled_by_doctor', 'cancelled_by_patient', 'missed', 'missed_by_patient', 'attended'].includes(status)) {
      return false
    }
    if (status === 'calling' || status === 'in_progress') return true
    if (sess.canJoin) return true

    if (sess.booking_date) {
      if (sess.booking_date === todayDateStr) {
        if (!sess.booking_time) return true
        try {
          const timeStr = String(sess.booking_time).slice(0, 5)
          const istStart = new Date(`${sess.booking_date}T${timeStr}:00+05:30`).getTime()
          const start = Number.isFinite(istStart) ? istStart : new Date(`${sess.booking_date} ${sess.booking_time}`).getTime()
          if (Number.isFinite(start)) {
            const now = Date.now()
            return now >= start - 20 * 60 * 1000 && now <= start + 150 * 60 * 1000
          }
        } catch {
          return true
        }
        return true
      }
    }
    return false
  }, [todayDateStr])

  const liveConsultation = useMemo(() => {
    const calling = dietitianConsultations.find((c) => String(c.status || '').toLowerCase() === 'calling')
    if (calling) return calling
    const joinable = dietitianConsultations.find((c) => isSessionJoinable(c))
    if (joinable) return joinable
    return null
  }, [dietitianConsultations, isSessionJoinable])

  const [chimeMuted, setChimeMuted] = useState(false)
  const lastChimeSessionIdRef = useRef<string | null>(null)

  // Audio & tab title notification for live calls
  useEffect(() => {
    if (!liveConsultation) {
      document.title = '8LIV Health · Provider Portal'
      return
    }

    const patientName = liveConsultation.patientName || 'Patient'
    document.title = `(1) 🔴 LIVE CALL: ${patientName} | 8Liv Health`

    if (!chimeMuted && lastChimeSessionIdRef.current !== liveConsultation.id) {
      lastChimeSessionIdRef.current = liveConsultation.id
      playTelehealthChime()
    }

    const interval = setInterval(() => {
      document.title = document.title.includes('LIVE CALL')
        ? `📹 CLICK TO JOIN - ${patientName}`
        : `(1) 🔴 LIVE CALL: ${patientName} | 8Liv Health`
    }, 1500)

    return () => {
      clearInterval(interval)
      document.title = '8LIV Health · Provider Portal'
    }
  }, [liveConsultation, chimeMuted, playTelehealthChime])

  // 1. Initial Authentication & User Verification
  useEffect(() => {
    async function checkAuth() {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (!session) {
          router.replace('/login')
          return
        }

        const meRes = await fetch('/api/provider/me', {
          headers: { Authorization: `Bearer ${session.access_token}` },
        })
        const me = await meRes.json()

        if (!meRes.ok || !me.provider) {
          setError('Failed to authenticate clinical provider profile.')
          return
        }

        setProviderUser(me.provider)
      } catch (err: any) {
        setError(err.message || 'Authentication error')
      } finally {
        setLoading(false)
      }
    }
    checkAuth()
  }, [router])

  // 2. Fetch Section-Specific Real Data
  const loadData = useCallback(async () => {
    if (!providerUser) return
    setError('')

    try {
      const { data: { session } } = await supabase.auth.getSession()
      const token = session?.access_token || ''
      const headers = { Authorization: `Bearer ${token}` }

      // Dashboard
      if (activeSection === 'dashboard') {
        const res = await fetch('/api/dietitian/dashboard', { headers })
        const json = await res.json()
        if (json.success) {
          setDashboardMetrics(json.metrics)
          setTodaysActions(json.todaysActions || [])
          setPatientsNeedingAttention(json.patientsNeedingAttention || [])
          setRecentActivity(json.recentActivity || [])
        }
      }

      // Patients
      if (activeSection === 'patients' || activeSection === 'dashboard' || activeSection === 'plans') {
        const res = await fetch(`/api/dietitian/patients?search=${encodeURIComponent(patientSearch)}`, { headers })
        const json = await res.json()
        if (json.success) {
          setPatients(json.patients || [])
        }
      }

      // Plans & Templates
      if (activeSection === 'plans' || activeSection === 'consultations' || activeSection === 'dashboard') {
        const [plansRes, tmplRes] = await Promise.all([
          fetch('/api/dietitian/plans', { headers }),
          fetch('/api/dietitian/templates', { headers }),
        ])
        const plansJson = await plansRes.json()
        const tmplJson = await tmplRes.json()
        if (plansJson.success) setPlans(plansJson.plans || [])
        if (tmplJson.success) setTemplates(tmplJson.templates || [])
      }

      // Food Logs
      if (activeSection === 'food-logs') {
        const res = await fetch(`/api/dietitian/food-logs?filter=${foodLogFilter}`, { headers })
        const json = await res.json()
        if (json.success) setFoodLogs(json.foodLogs || [])
      }

      // Consultations & Availability
      if (activeSection === 'consultations' || activeSection === 'schedule' || activeSection === 'dashboard') {
        try {
          const availRes = await fetch('/api/provider/availability', { headers })
          const availJson = await availRes.json()
          if (availRes.ok) {
            setAvailability(availJson.availability || [])
          }
        } catch (e) {
          console.warn('Availability fetch notice:', e)
        }

        try {
          const consRes = await fetch(
            `/api/provider/consultations?page=${consultationsPage}&limit=25&search=${encodeURIComponent(consultationsSearch)}&status=${consultationsStatus}`,
            { headers }
          )
          const consJson = await consRes.json()
          if (consRes.ok) {
            setDietitianConsultations(consJson.consultations || [])
            setConsultationStats(consJson.stats || {})
            if (consJson.totalPages !== undefined) setConsultationsTotalPages(consJson.totalPages)
          }
        } catch (e) {
          console.warn('Consultations fetch notice:', e)
        }
      }

      // Wallet
      if (activeSection === 'wallet' || activeSection === 'dashboard') {
        const res = await fetch('/api/provider/wallet', { headers })
        const json = await res.json()
        if (res.ok) {
          setWalletState(json.wallet || { balance: 0, pending_payout: 0, completed_payout: 0, lifetime_earnings: 0 })
          setWalletTransactions(json.transactions || [])
          setWalletPayouts(json.payouts || [])
        }
      }
    } catch (err: any) {
      console.warn('Dietitian data fetch notice:', err)
    }
  }, [activeSection, patientSearch, foodLogFilter, providerUser, consultationsPage, consultationsSearch, consultationsStatus])

  useEffect(() => {
    loadData()
  }, [loadData])

  // 3. Load Patient Workspace if selected
  const openPatientWorkspace = async (patient: PatientRecord) => {
    setSelectedPatient(patient)
    setWorkspaceTab('overview')
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch(`/api/dietitian/patients/${patient.id}`, {
        headers: { Authorization: `Bearer ${session?.access_token || ''}` },
      })
      const json = await res.json()
      if (json.success) {
        setWorkspaceData(json)
      }
    } catch (err) {
      console.warn('Error loading workspace:', err)
    }
  }

  // 5. Availability Schedule Generation & Management
  const handleGenerateAvailability = async (submission: AvailabilitySubmission) => {
    setSavingAvailability(true)
    setError('')
    setSuccess('')
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const token = session?.access_token || ''
      const headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }

      if (submission.scheduleMode === 'MANUAL') {
        let createdCount = 0
        let overlapErrors = 0
        const otherErrors: string[] = []

        for (const slot of submission.slots) {
          try {
            const res = await fetch('/api/provider/availability', {
              method: 'POST',
              headers,
              body: JSON.stringify({
                scheduleMode: 'MANUAL',
                date: slot.available_date,
                startTime: slot.time_slot,
                duration: slot.slot_duration,
              }),
            })
            const data = await res.json()
            if (!res.ok) {
              if (res.status === 409) overlapErrors++
              else otherErrors.push(data.error || 'Unknown error')
            } else {
              createdCount++
            }
          } catch (err: any) {
            otherErrors.push(err.message || 'Network error')
          }
        }

        await loadData()
        if (otherErrors.length > 0) {
          setError(`Created ${createdCount} slot(s). Errors: ${otherErrors.join(', ')}`)
        } else if (overlapErrors > 0) {
          setSuccess(`Created ${createdCount} slot(s). ${overlapErrors} slot(s) skipped due to overlap.`)
        } else {
          setSuccess(`Created all ${createdCount} manual slot(s) successfully.`)
        }
      } else {
        const res = await fetch('/api/provider/availability', {
          method: 'POST',
          headers,
          body: JSON.stringify(submission),
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || 'Unable to generate availability.')
        setSuccess(data.message || 'Availability schedule generated successfully.')
        await loadData()
      }
    } catch (err: any) {
      setError(err.message || 'Unable to generate availability.')
    } finally {
      setSavingAvailability(false)
    }
  }

  const handleDeleteAvailability = async (slotId: string) => {
    setError('')
    setSuccess('')
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const token = session?.access_token || ''
      const res = await fetch(`/api/provider/availability?id=${slotId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Unable to cancel slot.')
      setSuccess('Availability slot cancelled.')
      await loadData()
    } catch (err: any) {
      setError(err.message || 'Unable to cancel slot.')
    }
  }

  const handleCreateQuickSlot = async (e: React.FormEvent) => {
    e.preventDefault()
    setSavingQuickSlot(true)
    setError('')
    setSuccess('')
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const token = session?.access_token || ''
      const res = await fetch('/api/provider/availability', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          scheduleMode: 'MANUAL',
          date: quickSlotDate,
          startTime: quickSlotTime,
          duration: Number(quickSlotDuration),
          providerRole: 'dietitian',
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Unable to create slot.')
      setSuccess('Availability slot created successfully.')
      setShowQuickSlotModal(false)
      await loadData()
    } catch (err: any) {
      setError(err.message || 'Unable to create slot.')
    } finally {
      setSavingQuickSlot(false)
    }
  }

  const handleUploadNutritionPlan = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!uploadPlanPatientId) {
      setError('Please select a patient.')
      return
    }

    if (planAssignMode === 'upload' && !uploadPlanFile) {
      setError('Please select a nutrition plan file (PDF, image, or spreadsheet).')
      return
    }

    if (planAssignMode === 'template' && !selectedTemplateId) {
      setError('Please choose a template from your diet library.')
      return
    }

    setUploadingPlan(true)
    setError('')
    setSuccess('')
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const token = session?.access_token || ''

      let attachmentUrl = ''
      let attachmentType = ''
      let finalMealSchedule = 'Follow personalized schedule in attached document'

      if (planAssignMode === 'upload') {
        const formData = new FormData()
        formData.append('file', uploadPlanFile!)
        formData.append('patientId', uploadPlanPatientId)
        formData.append('planType', 'diet')

        const uploadRes = await fetch('/api/provider/plans/upload', {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
          body: formData,
        })
        const uploadData = await uploadRes.json()
        if (!uploadRes.ok) throw new Error(uploadData.error || 'Failed to upload plan file.')
        attachmentUrl = uploadData.attachmentUrl
        attachmentType = uploadData.attachmentType
      } else {
        const tmpl = templates.find((t) => t.id === selectedTemplateId)
        if (tmpl?.meals?.length) {
          finalMealSchedule = JSON.stringify(tmpl.meals)
        } else {
          finalMealSchedule = tmpl?.instructions || 'Standard balanced metabolic meal routine'
        }
      }

      const planRes = await fetch('/api/provider/plans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          patientId: uploadPlanPatientId,
          appointmentId: uploadPlanAppointmentId || undefined,
          title: uploadPlanTitle,
          description: uploadPlanNotes || 'Dietitian assigned clinical nutrition protocol',
          attachmentUrl: attachmentUrl || undefined,
          attachmentType: attachmentType || undefined,
          notes: uploadPlanNotes,
          caloriesPerDay: Number(uploadPlanCalories) || 1600,
          hydrationGoal: `${uploadPlanWater} L`,
          mealSchedule: finalMealSchedule,
        }),
      })
      const planResult = await planRes.json()
      if (!planRes.ok) throw new Error(planResult.error || 'Failed to assign nutrition plan to patient.')

      setSuccess(
        planResult.consultationCompleted
          ? 'Nutrition plan successfully assigned! Consultation completed and wallet earnings credited.'
          : 'Nutrition plan successfully assigned to patient!'
      )
      setUploadPlanAppointmentId('')
      setShowUploadPlanModal(false)
      setUploadPlanFile(null)
      setUploadPlanNotes('')
      setSelectedTemplateId('')
      await loadData()
    } catch (err: any) {
      setError(err.message || 'Unable to assign nutrition plan.')
    } finally {
      setUploadingPlan(false)
    }
  }

  const handleUpdateConsultation = async (consultationId: string, action: 'complete' | 'missed' | 'cancel') => {
    setError('')
    setSuccess('')
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const token = session?.access_token || ''
      const res = await fetch('/api/provider/consultations', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ consultationId, action }),
      })
      const data = await res.json()
      if (!res.ok) {
        if (data.requiresDietPlan && data.patientId) {
          setUploadPlanPatientId(data.patientId)
          setUploadPlanAppointmentId(consultationId)
          setShowUploadPlanModal(true)
        }
        throw new Error(data.error || 'Unable to update consultation.')
      }
      setSuccess(action === 'complete' ? 'Session marked completed.' : action === 'missed' ? 'Session marked missed.' : 'Session cancelled.')
      await loadData()
    } catch (err: any) {
      setError(err.message || 'Unable to update consultation.')
    }
  }

  // 6. Publish Nutrition Plan
  const handlePublishPlan = async (planId: string) => {
    setIsPublishing(true)
    setError('')
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch(`/api/dietitian/plans/${planId}/publish`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${session?.access_token || ''}` },
      })
      const json = await res.json()
      if (json.success) {
        setSuccess(`Nutrition plan v${json.plan.version} published! PDF generated and patient notified.`)
        setEditingPlan(null)
        loadData()
      } else {
        setError(json.error || 'Failed to publish plan')
      }
    } catch (err: any) {
      setError(err.message || 'Publishing error')
    } finally {
      setIsPublishing(false)
    }
  }

  // 6. Food Log Review
  const handleReviewFoodLog = async (logId: string) => {
    if (!reviewComment.trim()) return
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch('/api/dietitian/food-logs', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session?.access_token || ''}`,
        },
        body: JSON.stringify({ foodLogId: logId, comment: reviewComment }),
      })
      const json = await res.json()
      if (json.success) {
        setSuccess('Clinical feedback sent to patient!')
        setSelectedLogId('')
        setReviewComment('')
        loadData()
      }
    } catch (err: any) {
      setError(err.message || 'Failed to review log')
    }
  }

  // 7. Wallet Payout Request (Exact matching)
  const handleRequestPayout = async (e: React.FormEvent) => {
    e.preventDefault()
    setPayoutError('')
    const amountVal = Number(payoutAmount)
    if (!amountVal || amountVal <= 0) {
      setPayoutError('Enter a valid payout amount')
      return
    }
    if (amountVal > Number(walletState.balance || 0)) {
      setPayoutError('Requested amount exceeds available balance')
      return
    }

    setPayoutRequesting(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch('/api/provider/payout/request', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session?.access_token || ''}`,
        },
        body: JSON.stringify({
          amount: amountVal,
          idempotencyKey: `payout:dietitian:${Date.now()}:${Math.random().toString(36).substring(2, 9)}`,
        }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Failed to submit payout request')

      setSuccess('Payout request submitted successfully! Funds will be transferred to your registered account.')
      setShowPayoutModal(false)
      setPayoutAmount('')
      loadData()
    } catch (err: any) {
      setPayoutError(err.message || 'Payout request failed')
    } finally {
      setPayoutRequesting(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FAF8F5] flex flex-col items-center justify-center p-6">
        <div className="w-12 h-12 border-4 border-[#0D9488] border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-sm font-bold text-[#1A1F36]">Loading 8LIV Clinical Nutrition Portal...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#FAF8F5] flex flex-col md:flex-row text-[#1A1F36] font-sans antialiased">
      {/* ==========================================
          SIDEBAR NAVIGATION (8LIV Navy & Emerald)
         ========================================== */}
      <aside className="w-full md:w-64 bg-[#1A1F36] text-white flex-shrink-0 flex flex-col border-r border-[#2C344E]">
        {/* Brand Header */}
        <div className="p-5 border-b border-[#2C344E] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-[#0D9488] to-[#2DD4BF] flex items-center justify-center text-white font-black shadow-md">
              <Apple className="w-5 h-5" />
            </div>
            <div>
              <span className="font-black text-lg tracking-tight text-white">8LIV HEALTH</span>
              <p className="text-[10px] font-bold text-[#2DD4BF] uppercase tracking-wider">Clinical Nutrition</p>
            </div>
          </div>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          <button
            onClick={() => { setActiveSection('dashboard'); setSelectedPatient(null) }}
            className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all ${
              activeSection === 'dashboard' ? 'bg-[#0D9488] text-white shadow-sm' : 'text-slate-300 hover:bg-[#252C48]'
            }`}
          >
            <LayoutDashboard className="w-4 h-4" />
            <span>Dashboard</span>
          </button>

          <button
            onClick={() => { setActiveSection('patients'); setSelectedPatient(null) }}
            className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all ${
              activeSection === 'patients' ? 'bg-[#0D9488] text-white shadow-sm' : 'text-slate-300 hover:bg-[#252C48]'
            }`}
          >
            <div className="flex items-center gap-3">
              <Users className="w-4 h-4" />
              <span>Patients</span>
            </div>
            {patients.length > 0 && (
              <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-[#2C344E] text-[#2DD4BF] font-black">
                {patients.length}
              </span>
            )}
          </button>

          <button
            onClick={() => { setActiveSection('plans'); setSelectedPatient(null) }}
            className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all ${
              activeSection === 'plans' ? 'bg-[#0D9488] text-white shadow-sm' : 'text-slate-300 hover:bg-[#252C48]'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>Nutrition Plans</span>
          </button>

          <button
            onClick={() => { setActiveSection('food-logs'); setSelectedPatient(null) }}
            className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all ${
              activeSection === 'food-logs' ? 'bg-[#0D9488] text-white shadow-sm' : 'text-slate-300 hover:bg-[#252C48]'
            }`}
          >
            <Utensils className="w-4 h-4" />
            <span>Food & Water Logs</span>
          </button>

          <button
            onClick={() => { setActiveSection('consultations'); setSelectedPatient(null) }}
            className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all ${
              activeSection === 'consultations' ? 'bg-[#0D9488] text-white shadow-sm' : 'text-slate-300 hover:bg-[#252C48]'
            }`}
          >
            <Video className="w-4 h-4" />
            <span>Consultations</span>
          </button>

          <button
            onClick={() => { setActiveSection('schedule'); setSelectedPatient(null) }}
            className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all ${
              activeSection === 'schedule' ? 'bg-[#0D9488] text-white shadow-sm' : 'text-slate-300 hover:bg-[#252C48]'
            }`}
          >
            <div className="flex items-center gap-3">
              <CalendarDays className="w-4 h-4" />
              <span>Availability</span>
            </div>
            {availability.filter(s => new Date(`${s.available_date}T${s.start_time}`).getTime() > Date.now()).length > 0 && (
              <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-[#2C344E] text-[#2DD4BF] font-black">
                {availability.filter(s => new Date(`${s.available_date}T${s.start_time}`).getTime() > Date.now()).length}
              </span>
            )}
          </button>

          <button
            onClick={() => { setActiveSection('wallet'); setSelectedPatient(null) }}
            className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all ${
              activeSection === 'wallet' ? 'bg-[#0D9488] text-white shadow-sm' : 'text-slate-300 hover:bg-[#252C48]'
            }`}
          >
            <div className="flex items-center gap-3">
              <Wallet className="w-4 h-4" />
              <span>Wallet & Payouts</span>
            </div>
            <span className="text-[11px] font-black text-[#2DD4BF]">
              {formatInr(walletState.balance || 0)}
            </span>
          </button>

          <button
            onClick={() => { setActiveSection('profile'); setSelectedPatient(null) }}
            className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all ${
              activeSection === 'profile' ? 'bg-[#0D9488] text-white shadow-sm' : 'text-slate-300 hover:bg-[#252C48]'
            }`}
          >
            <Settings className="w-4 h-4" />
            <span>Profile & Credentials</span>
          </button>
        </nav>

        {/* User Info & Logout Footer */}
        <div className="p-4 border-t border-[#2C344E] bg-[#141829] flex items-center justify-between">
          <div className="truncate mr-2">
            <p className="text-xs font-bold text-white truncate">{providerUser?.name || 'Dietitian'}</p>
            <p className="text-[10px] text-slate-400 capitalize">{providerUser?.role || 'Clinical Dietitian'}</p>
          </div>
          <button
            onClick={async () => {
              await supabase.auth.signOut()
              router.replace('/login')
            }}
            title="Sign out"
            className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-[#2C344E] transition-colors"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </aside>

      {/* ==========================================
          MAIN CONTENT AREA
         ========================================== */}
      <main className="flex-1 overflow-y-auto p-4 md:p-8 space-y-6">
        {/* Alerts */}
        {error && (
          <div className="rounded-2xl bg-[#FEE2E2] border border-[#FCA5A5] p-4 text-xs font-bold text-[#991B1B] flex items-center justify-between">
            <span>{error}</span>
            <button onClick={() => setError('')} className="text-[#991B1B] hover:opacity-75 font-black">✕</button>
          </div>
        )}
        {success && (
          <div className="rounded-2xl bg-[#DCFCE7] border border-[#86EFAC] p-4 text-xs font-bold text-[#166534] flex items-center justify-between">
            <span>{success}</span>
            <button onClick={() => setSuccess('')} className="text-[#166534] hover:opacity-75 font-black">✕</button>
          </div>
        )}

        {/* UNMISSABLE GLOBAL LIVE CONSULTATION BANNER */}
        {liveConsultation && (
          <div className="rounded-3xl bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 text-white p-5 sm:p-6 shadow-xl shadow-emerald-950/20 border-2 border-emerald-300 flex flex-col md:flex-row items-center justify-between gap-5 animate-in slide-in-from-top-4 duration-300">
            <div className="flex items-center gap-4">
              <div className="relative shrink-0">
                <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-md text-white flex items-center justify-center border border-white/30 shadow-inner">
                  <Video className="w-7 h-7 text-white animate-pulse" />
                </div>
                <span className="absolute -top-1.5 -right-1.5 flex h-4 w-4">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-90" />
                  <span className="relative inline-flex rounded-full h-4 w-4 bg-amber-300 border-2 border-emerald-700" />
                </span>
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-white/25 text-white backdrop-blur-sm border border-white/30 flex items-center gap-1.5 shadow-2xs">
                    <span className="w-2 h-2 rounded-full bg-amber-300 animate-ping" />
                    LIVE VIDEO CONSULTATION READY
                  </span>
                  <span className="text-xs font-bold text-emerald-100 flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" />
                    <span>{formatTime(liveConsultation.booking_time)} · Telehealth Call</span>
                  </span>
                </div>
                <h3 className="text-xl sm:text-2xl font-black text-white mt-1 leading-tight tracking-tight">
                  {liveConsultation.patientName} is waiting for consultation
                </h3>
                <p className="text-xs text-emerald-100 font-medium mt-0.5">
                  Secure encrypted video room is active. Click below to enter the live session immediately.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 w-full md:w-auto shrink-0">
              <button
                type="button"
                onClick={() => setChimeMuted(!chimeMuted)}
                className="p-3.5 rounded-2xl bg-white/15 hover:bg-white/25 text-white border border-white/20 transition-all cursor-pointer"
                title={chimeMuted ? 'Unmute call alerts' : 'Mute call alerts'}
              >
                {chimeMuted ? <VolumeX className="w-5 h-5 text-emerald-200" /> : <Volume2 className="w-5 h-5 text-white" />}
              </button>
              <a
                href={liveConsultation.meetingUrl || `/video/room?id=${liveConsultation.id}`}
                target="_blank"
                rel="opener"
                className="flex-1 md:flex-initial inline-flex items-center justify-center gap-2.5 px-8 py-4 rounded-2xl bg-white text-emerald-950 hover:bg-emerald-50 text-sm font-black shadow-xl shadow-black/20 hover:scale-105 active:scale-95 transition-all cursor-pointer group"
              >
                <Video className="w-5 h-5 text-emerald-700 group-hover:scale-110 transition-transform" />
                <span>JOIN VIDEO ROOM NOW</span>
              </a>
            </div>
          </div>
        )}

        {/* SECTION 1: DASHBOARD (Clean & Neat Clinical Cockpit) */}
        {activeSection === 'dashboard' && (
          <div className="space-y-6">
            {/* Header Greeting & Action Bar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs">
              <div>
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <p className="text-[11px] font-black uppercase tracking-wider text-[#0D9488]">Clinical Nutrition Center</p>
                </div>
                <h1 className="text-2xl md:text-3xl font-black text-[#1A1F36] mt-1">
                  Welcome, {providerUser?.name || 'Doctor / Dietitian'}
                </h1>
                <p className="text-xs text-slate-500 font-semibold mt-1">
                  {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' })} · Daily Clinical Workspace
                </p>
              </div>

              <div className="flex items-center gap-2.5 flex-wrap">
                <button
                  onClick={() => {
                    setProtocolBuilderPatient(null)
                    setProtocolBuilderConsultation(null)
                    setShowProtocolBuilder(true)
                  }}
                  className="rounded-2xl bg-gradient-to-r from-[#0D9488] to-teal-700 hover:from-teal-700 hover:to-teal-800 text-white px-4 py-2.5 text-xs font-bold transition-all flex items-center gap-2 shadow-sm cursor-pointer"
                >
                  <Sparkles className="w-4 h-4 text-emerald-200" />
                  <span>Author Official Protocol</span>
                </button>
                <button
                  onClick={() => {
                    setUploadPlanPatientId('')
                    setUploadPlanAppointmentId('')
                    setPlanAssignMode('upload')
                    setShowUploadPlanModal(true)
                  }}
                  className="rounded-2xl border border-slate-200 hover:bg-slate-50 text-slate-700 px-4 py-2.5 text-xs font-bold transition-all flex items-center gap-2 cursor-pointer"
                >
                  <Upload className="w-4 h-4 text-slate-500" />
                  <span>Upload File Plan</span>
                </button>
                <button
                  onClick={() => setActiveSection('schedule')}
                  className="rounded-2xl border border-slate-200 hover:bg-slate-50 text-slate-700 px-4 py-2.5 text-xs font-bold transition-all flex items-center gap-2 cursor-pointer"
                >
                  <CalendarDays className="w-4 h-4 text-slate-400" />
                  <span>Manage Slots</span>
                </button>
              </div>
            </div>

            {/* 4 Focused Clinical Vitals */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Card 1: Today's Appointments */}
              <div
                onClick={() => setActiveSection('consultations')}
                className="rounded-3xl border border-slate-200/80 bg-white p-5 shadow-xs hover:border-[#0D9488]/50 hover:shadow-md transition-all cursor-pointer group"
              >
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-black uppercase tracking-wider text-slate-400">Today's Sessions</span>
                  <div className="w-8 h-8 rounded-xl bg-teal-50 text-[#0D9488] flex items-center justify-center group-hover:scale-110 transition-transform">
                    <Video className="w-4 h-4" />
                  </div>
                </div>
                <p className="mt-3 text-3xl font-black text-[#1A1F36]">{todayConsultations.length}</p>
                <p className="text-[11px] font-semibold text-slate-500 mt-1">
                  {todayConsultations.length === 1 ? '1 video call scheduled today' : `${todayConsultations.length} video calls scheduled today`}
                </p>
              </div>

              {/* Card 2: Pending Diet Plans (Alert) */}
              <div
                onClick={() => {
                  if (pendingPlanConsultations.length > 0) {
                    const first = pendingPlanConsultations[0]
                    setProtocolBuilderPatient({ id: first.patient_id || '', name: first.patientName || 'Patient' })
                    setProtocolBuilderConsultation(first)
                    setShowProtocolBuilder(true)
                  } else {
                    setActiveSection('consultations')
                  }
                }}
                className={`rounded-3xl border p-5 shadow-xs transition-all cursor-pointer group ${
                  pendingPlanConsultations.length > 0
                    ? 'border-amber-300 bg-amber-50/40 hover:bg-amber-50/70 hover:shadow-md'
                    : 'border-slate-200/80 bg-white hover:border-slate-300'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className={`text-[11px] font-black uppercase tracking-wider ${pendingPlanConsultations.length > 0 ? 'text-amber-700' : 'text-slate-400'}`}>
                    Plans to Deliver
                  </span>
                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform ${
                    pendingPlanConsultations.length > 0 ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-400'
                  }`}>
                    <AlertTriangle className="w-4 h-4" />
                  </div>
                </div>
                <div className="flex items-baseline gap-2 mt-3">
                  <p className={`text-3xl font-black ${pendingPlanConsultations.length > 0 ? 'text-amber-800' : 'text-slate-800'}`}>
                    {pendingPlanConsultations.length}
                  </p>
                  {pendingPlanConsultations.length > 0 && (
                    <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-amber-200/60 text-amber-900">
                      Action Needed
                    </span>
                  )}
                </div>
                <p className={`text-[11px] font-semibold mt-1 ${pendingPlanConsultations.length > 0 ? 'text-amber-700' : 'text-slate-500'}`}>
                  {pendingPlanConsultations.length > 0 ? 'Upload to release wallet credit' : 'All consultation plans delivered'}
                </p>
              </div>

              {/* Card 3: Active Patients */}
              <div
                onClick={() => setActiveSection('patients')}
                className="rounded-3xl border border-slate-200/80 bg-white p-5 shadow-xs hover:border-[#0D9488]/50 hover:shadow-md transition-all cursor-pointer group"
              >
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-black uppercase tracking-wider text-slate-400">Active Patients</span>
                  <div className="w-8 h-8 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                    <Users className="w-4 h-4" />
                  </div>
                </div>
                <p className="mt-3 text-3xl font-black text-[#1A1F36]">{patients.length}</p>
                <p className="text-[11px] font-semibold text-slate-500 mt-1">Enrolled under your clinical care</p>
              </div>

              {/* Card 4: Wallet Balance */}
              <div
                onClick={() => setActiveSection('wallet')}
                className="rounded-3xl border border-slate-200/80 bg-white p-5 shadow-xs hover:border-[#0D9488]/50 hover:shadow-md transition-all cursor-pointer group"
              >
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-black uppercase tracking-wider text-slate-400">Available Wallet</span>
                  <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center group-hover:scale-110 transition-transform">
                    <Wallet className="w-4 h-4" />
                  </div>
                </div>
                <p className="mt-3 text-3xl font-black text-[#0D9488]">
                  {formatInr(walletState.balance || 0)}
                </p>
                <p className="text-[11px] font-semibold text-slate-500 mt-1 flex items-center gap-1">
                  <span>Available for payout</span>
                  <span className="text-[#0D9488] font-bold group-hover:underline">· Withdraw ↗</span>
                </p>
              </div>
            </div>

            {/* Main Clinical Columns */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Left Column (7 cols): Today's Schedule & Telehealth */}
              <div className="lg:col-span-7 bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-teal-50 text-[#0D9488] flex items-center justify-center">
                      <Clock className="w-4 h-4" />
                    </div>
                    <div>
                      <h2 className="text-base font-black text-[#1A1F36]">Today's Video Consultations</h2>
                      <p className="text-[11px] text-slate-400 font-medium">Your scheduled telehealth appointments for today</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setActiveSection('consultations')}
                    className="text-xs font-bold text-[#0D9488] hover:underline cursor-pointer"
                  >
                    View All Calls →
                  </button>
                </div>

                {todayConsultations.length > 0 ? (
                  <div className="space-y-3">
                    {todayConsultations.map((sess) => {
                      const sessStatus = String(sess.status || '').toLowerCase()
                      const sessInitials = (sess.patientName || 'Patient')
                        .trim()
                        .split(' ')
                        .filter(Boolean)
                        .map((n) => n[0])
                        .slice(0, 2)
                        .join('')
                        .toUpperCase() || 'PT'

                      return (
                        <div
                          key={sess.id}
                          className="p-4 rounded-2xl bg-[#FAF8F5]/80 border border-slate-200/70 hover:border-slate-300 hover:bg-[#FAF8F5] transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-2xl bg-teal-50 text-[#0D9488] font-black text-xs flex items-center justify-center shrink-0 border border-teal-200/50">
                              {sessInitials}
                            </div>
                            <div>
                              <p className="font-bold text-sm text-[#1A1F36]">{sess.patientName}</p>
                              <div className="flex items-center gap-2 text-[11px] text-slate-500 font-medium mt-0.5">
                                <span className="flex items-center gap-1 font-semibold text-slate-700">
                                  <Clock className="w-3 h-3 text-slate-400" />
                                  {formatTime(sess.booking_time)}
                                </span>
                                <span>·</span>
                                <span>{sess.appointmentType || 'Nutrition Care'}</span>
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 self-end sm:self-auto">
                            {sessStatus === 'attended' ? (
                              <button
                                onClick={() => {
                                  setProtocolBuilderPatient({ id: sess.patient_id || '', name: sess.patientName || 'Patient' })
                                  setProtocolBuilderConsultation(sess)
                                  setShowProtocolBuilder(true)
                                }}
                                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#0D9488] hover:bg-[#0F766E] text-white text-xs font-bold shadow-xs transition-all cursor-pointer"
                              >
                                <Sparkles className="w-3.5 h-3.5 text-emerald-200" />
                                <span>Deliver Official Plan</span>
                              </button>
                            ) : sessStatus === 'completed' ? (
                              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-bold">
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                                <span>Completed</span>
                              </span>
                            ) : isSessionJoinable(sess) ? (
                              <a
                                href={sess.meetingUrl || `/video/room?id=${sess.id}`}
                                target="_blank"
                                rel="opener"
                                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white text-xs font-black shadow-md shadow-emerald-700/25 hover:scale-105 active:scale-95 transition-all cursor-pointer animate-pulse"
                              >
                                <Video className="w-4 h-4 text-white animate-pulse" />
                                <span>JOIN VIDEO CALL NOW</span>
                              </a>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-slate-500 text-[11px] font-semibold">
                                <Clock className="w-3 h-3 text-slate-400" />
                                <span>Opens 15m prior</span>
                              </span>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                ) : (
                  <div className="p-8 text-center bg-[#FAF8F5] rounded-2xl border border-dashed border-slate-200 space-y-2">
                    <CalendarDays className="w-8 h-8 text-slate-300 mx-auto" />
                    <p className="text-sm font-bold text-[#1A1F36]">No consultations scheduled for today</p>
                    <p className="text-xs text-slate-400 max-w-sm mx-auto">
                      Patients book sessions based on your availability slots. You can add or adjust your hours anytime.
                    </p>
                    <button
                      onClick={() => setActiveSection('schedule')}
                      className="mt-2 inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl border border-slate-200 hover:bg-white text-xs font-bold text-slate-700 transition cursor-pointer"
                    >
                      <span>Manage Available Slots</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Right Column (5 cols): Action Required (Pending Plans) */}
              <div className="lg:col-span-5 bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center">
                      <AlertTriangle className="w-4 h-4" />
                    </div>
                    <div>
                      <h2 className="text-base font-black text-[#1A1F36]">Pending Plan Deliveries</h2>
                      <p className="text-[11px] text-slate-400 font-medium">Attended calls needing diet plans to release payout</p>
                    </div>
                  </div>
                </div>

                {pendingPlanConsultations.length > 0 ? (
                  <div className="space-y-3">
                    {pendingPlanConsultations.slice(0, 4).map((pConsult) => (
                      <div
                        key={pConsult.id}
                        className="p-3.5 rounded-2xl bg-amber-50/50 border border-amber-200/80 flex items-center justify-between gap-3"
                      >
                        <div>
                          <p className="font-bold text-xs text-[#1A1F36]">{pConsult.patientName}</p>
                          <p className="text-[10px] text-amber-800 font-medium mt-0.5">
                            Attended on {formatDate(pConsult.booking_date || null)} · Claim ₹250
                          </p>
                        </div>
                        <button
                          onClick={() => {
                            setProtocolBuilderPatient({ id: pConsult.patient_id || '', name: pConsult.patientName || 'Patient' })
                            setProtocolBuilderConsultation(pConsult)
                            setShowProtocolBuilder(true)
                          }}
                          className="px-3 py-1.5 rounded-xl bg-[#0D9488] hover:bg-[#0F766E] text-white text-[11px] font-bold shadow-xs whitespace-nowrap cursor-pointer flex items-center gap-1"
                        >
                          <Sparkles className="w-3 h-3 text-emerald-200" />
                          <span>Deliver Plan</span>
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-8 text-center bg-[#FAF8F5] rounded-2xl border border-dashed border-slate-200 space-y-2">
                    <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto" />
                    <p className="text-sm font-bold text-[#1A1F36]">All consultation plans delivered!</p>
                    <p className="text-xs text-slate-400">
                      No patients are currently waiting for a nutrition plan. All completed consultations have been credited to your wallet.
                    </p>
                  </div>
                )}

                {/* Quick Shortcuts Box */}
                <div className="pt-2">
                  <div className="p-4 rounded-2xl bg-[#FAF8F5] border border-slate-200/70 space-y-2">
                    <p className="text-xs font-bold text-slate-700">Quick Clinical Shortcuts</p>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => setActiveSection('patients')}
                        className="p-2.5 rounded-xl bg-white border border-slate-200 text-left hover:border-slate-300 transition cursor-pointer"
                      >
                        <p className="text-xs font-bold text-[#1A1F36]">Search Patients</p>
                        <p className="text-[10px] text-slate-400">View intake &amp; history</p>
                      </button>
                      <button
                        onClick={() => setActiveSection('plans')}
                        className="p-2.5 rounded-xl bg-white border border-slate-200 text-left hover:border-slate-300 transition cursor-pointer"
                      >
                        <p className="text-xs font-bold text-[#1A1F36]">Plan Templates</p>
                        <p className="text-[10px] text-slate-400">Pre-built diet charts</p>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom Row: Active Patient Roster Preview */}
            <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center">
                    <Users className="w-4 h-4" />
                  </div>
                  <div>
                    <h2 className="text-base font-black text-[#1A1F36]">Your Active Patients</h2>
                    <p className="text-[11px] text-slate-400 font-medium">Quick access to medical intake and dietary tracking</p>
                  </div>
                </div>
                <button
                  onClick={() => setActiveSection('patients')}
                  className="text-xs font-bold text-[#0D9488] hover:underline cursor-pointer"
                >
                  View All ({patients.length}) →
                </button>
              </div>

              {patients.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  {patients.slice(0, 4).map((pat) => {
                    const initials = (pat.patient_name || 'Patient')
                      .trim()
                      .split(' ')
                      .filter(Boolean)
                      .map((n) => n[0])
                      .slice(0, 2)
                      .join('')
                      .toUpperCase() || 'PT'

                    return (
                      <div
                        key={pat.id}
                        onClick={() => openPatientWorkspace(pat)}
                        className="p-4 rounded-2xl bg-[#FAF8F5]/80 border border-slate-200/70 hover:border-[#0D9488]/60 hover:bg-white hover:shadow-xs transition-all cursor-pointer flex items-center justify-between group"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-2xl bg-teal-50 text-[#0D9488] font-bold text-xs flex items-center justify-center shrink-0 border border-teal-200/40">
                            {initials}
                          </div>
                          <div>
                            <p className="font-bold text-xs text-[#1A1F36] group-hover:text-[#0D9488] transition-colors">{pat.patient_name}</p>
                            <p className="text-[10px] text-slate-400 mt-0.5">{pat.phone || pat.email || 'Active Patient'}</p>
                          </div>
                        </div>
                        <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-[#0D9488] group-hover:translate-x-0.5 transition-all" />
                      </div>
                    )
                  })}
                </div>
              ) : (
                <div className="p-6 text-center bg-[#FAF8F5] rounded-2xl border border-dashed border-slate-200 text-xs text-slate-400 font-medium">
                  No assigned patients yet. When patients subscribe to clinical nutrition, they will appear here.
                </div>
              )}
            </div>
          </div>
        )}

        {/* SECTION 2: PATIENT MANAGEMENT & WORKSPACE */}
        {activeSection === 'patients' && (
          <div className="space-y-6">
            {!selectedPatient ? (
              <>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <h1 className="text-2xl font-black text-[#1A1F36]">Assigned Patient Roster</h1>
                    <p className="text-xs text-slate-500 font-semibold">Patients enrolled in clinical nutrition care</p>
                  </div>
                  <div className="relative w-full sm:w-72">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="Search patient by name or phone..."
                      value={patientSearch}
                      onChange={(e) => setPatientSearch(e.target.value)}
                      className="w-full pl-9 pr-4 py-2 bg-white border border-[#E8DED4] rounded-xl text-xs font-semibold focus:outline-none focus:border-[#0D9488]"
                    />
                  </div>
                </div>

                {patients.length > 0 ? (
                  <div className="rounded-2xl border border-[#E8DED4] bg-white overflow-hidden shadow-sm">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-[#FAF8F5] border-b border-[#E8DED4] text-slate-500 font-bold uppercase text-[10px]">
                          <tr>
                            <th className="py-3.5 px-4">Patient</th>
                            <th className="py-3.5 px-4">Current Weight & BMI</th>
                            <th className="py-3.5 px-4">Active Nutrition Plan</th>
                            <th className="py-3.5 px-4">Contact</th>
                            <th className="py-3.5 px-4 text-right">Clinical Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {patients.map((p) => {
                            const initials = (p.patient_name || 'Patient')
                              .trim()
                              .split(' ')
                              .filter(Boolean)
                              .map((n) => n[0])
                              .slice(0, 2)
                              .join('')
                              .toUpperCase() || 'PT'

                            const bmiVal = p.bmi ? Number(p.bmi) : null
                            const bmiCategory = !bmiVal
                              ? null
                              : bmiVal < 18.5
                              ? 'Underweight'
                              : bmiVal < 25
                              ? 'Healthy'
                              : bmiVal < 30
                              ? 'Overweight'
                              : 'Obese'

                            return (
                              <tr key={p.id} className="hover:bg-slate-50/80 transition-colors">
                                {/* Patient Info */}
                                <td className="py-3.5 px-4">
                                  <div className="flex items-center gap-3">
                                    <div className="w-9 h-9 rounded-2xl bg-[#E6F4F1] text-[#0D9488] font-black text-xs flex items-center justify-center shrink-0 border border-teal-200/60 shadow-xs">
                                      {initials}
                                    </div>
                                    <div>
                                      <p className="font-bold text-[#1A1F36] text-sm leading-tight">{p.patient_name}</p>
                                      <p className="text-[11px] text-slate-400 font-medium mt-0.5">
                                        ID: {p.id.substring(0, 8)}...
                                      </p>
                                    </div>
                                  </div>
                                </td>

                                {/* Weight & BMI */}
                                <td className="py-3.5 px-4">
                                  {p.current_weight ? (
                                    <div>
                                      <div className="flex items-baseline gap-1.5 font-bold text-slate-800 text-xs">
                                        <span>{p.current_weight} kg</span>
                                        {bmiVal && <span className="text-slate-400 font-medium text-[11px]">(BMI {bmiVal})</span>}
                                      </div>
                                      {bmiCategory && (
                                        <span className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded-md mt-1 ${
                                          bmiCategory === 'Healthy'
                                            ? 'bg-emerald-50 text-emerald-700'
                                            : bmiCategory === 'Overweight'
                                            ? 'bg-amber-50 text-amber-800'
                                            : 'bg-rose-50 text-rose-700'
                                        }`}>
                                          {bmiCategory}
                                        </span>
                                      )}
                                    </div>
                                  ) : (
                                    <span className="text-slate-400 italic text-xs">Assessment pending</span>
                                  )}
                                </td>

                                {/* Active Plan */}
                                <td className="py-3.5 px-4">
                                  {p.active_plan_name ? (
                                    <div className="space-y-1">
                                      <div className="flex items-center gap-1.5">
                                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-50 text-emerald-800 border border-emerald-200">
                                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                          <span>Active</span>
                                        </span>
                                        <span className="font-bold text-slate-800 text-xs">{p.active_plan_name}</span>
                                      </div>
                                      {p.review_date && (
                                        <p className="text-[10px] text-slate-400">
                                          Review: {new Date(p.review_date).toLocaleDateString()}
                                        </p>
                                      )}
                                    </div>
                                  ) : (
                                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                                      <AlertTriangle className="w-3 h-3 text-amber-600" />
                                      <span>Plan Pending</span>
                                    </span>
                                  )}
                                </td>

                                {/* Contact info */}
                                <td className="py-3.5 px-4">
                                  <p className="text-xs font-semibold text-slate-700">{p.phone || p.email || '--'}</p>
                                  {p.phone && p.email && (
                                    <p className="text-[11px] text-slate-400 truncate max-w-[160px]">{p.email}</p>
                                  )}
                                </td>

                                {/* Actions */}
                                <td className="py-3.5 px-4 text-right">
                                  <div className="flex items-center justify-end gap-2">
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setUploadPlanPatientId(p.id)
                                        setShowUploadPlanModal(true)
                                      }}
                                      className="px-3 py-1.5 rounded-xl border border-teal-200 bg-teal-50/70 text-[#0D9488] hover:bg-teal-100 text-xs font-bold transition cursor-pointer"
                                    >
                                      Assign Plan
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => openPatientWorkspace(p)}
                                      className="px-3.5 py-1.5 rounded-xl bg-[#1A1F36] text-white text-xs font-bold hover:bg-[#2C344E] transition cursor-pointer shadow-xs"
                                    >
                                      Workspace ↗
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            )
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ) : (
                  <div className="rounded-2xl border border-dashed border-[#E8DED4] p-12 text-center bg-white space-y-3">
                    <div className="w-12 h-12 rounded-2xl bg-slate-50 text-slate-400 flex items-center justify-center mx-auto">
                      <Users className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-[#1A1F36]">No patients found</h3>
                      <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                        {patientSearch
                          ? `No patients match "${patientSearch}". Try searching by another term.`
                          : 'Patients with booked consultations or assigned nutrition programs will automatically appear in this roster.'}
                      </p>
                    </div>
                    {patientSearch ? (
                      <button
                        type="button"
                        onClick={() => setPatientSearch('')}
                        className="text-xs font-bold text-[#0D9488] hover:underline"
                      >
                        Clear search
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setActiveSection('consultations')}
                        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#0D9488] text-white text-xs font-bold shadow-xs hover:bg-[#0F766E] transition cursor-pointer"
                      >
                        <Calendar className="w-3.5 h-3.5" />
                        <span>View Consultations</span>
                      </button>
                    )}
                  </div>
                )}
              </>
            ) : (
              /* Patient Nutrition Workspace (Tabbed View) */
              <div className="space-y-6">
                {/* Header with back button */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#E8DED4]">
                  <div>
                    <button
                      onClick={() => setSelectedPatient(null)}
                      className="text-xs font-bold text-[#0D9488] hover:underline flex items-center gap-1 mb-1"
                    >
                      ← Back to Patient Roster
                    </button>
                    <h1 className="text-2xl font-black text-[#1A1F36]">{selectedPatient.patient_name}</h1>
                    <p className="text-xs text-slate-500 font-semibold">
                      {selectedPatient.gender} • {selectedPatient.age} yrs • ID: {selectedPatient.id.slice(0, 10)}...
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => {
                        setEditingPlan({
                          patient_id: selectedPatient.id,
                          plan_name: `Nutrition Protocol for ${selectedPatient.patient_name}`,
                          meals: [],
                        })
                        setActiveSection('plans')
                      }}
                      className="px-4 py-2 rounded-full bg-[#0D9488] text-white text-xs font-bold hover:bg-[#0F766E] transition-colors flex items-center gap-1.5"
                    >
                      <Plus className="w-4 h-4" />
                      <span>New Plan</span>
                    </button>
                  </div>
                </div>

                {/* Workspace Tabs */}
                <div className="flex border-b border-[#E8DED4] gap-6 text-xs font-bold overflow-x-auto">
                  {(['overview', 'assessment', 'plans', 'food-logs', 'progress'] as const).map((tab) => (
                    <button
                      key={tab}
                      onClick={() => setWorkspaceTab(tab)}
                      className={`pb-3 border-b-2 capitalize transition-colors whitespace-nowrap ${
                        workspaceTab === tab ? 'border-[#0D9488] text-[#0D9488]' : 'border-transparent text-slate-400 hover:text-slate-600'
                      }`}
                    >
                      {tab.replace('-', ' ')}
                    </button>
                  ))}
                </div>

                {/* Tab 1: Overview */}
                {workspaceTab === 'overview' && (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="md:col-span-2 space-y-6">
                      <div className="rounded-2xl border border-[#E8DED4] bg-white p-5 shadow-sm space-y-4">
                        <h3 className="text-sm font-black text-[#1A1F36]">Anthropometric Baseline</h3>
                        <div className="grid grid-cols-3 gap-4">
                          <div className="bg-[#FAF8F5] p-3 rounded-xl">
                            <p className="text-[10px] uppercase font-bold text-slate-400">Current Weight</p>
                            <p className="text-xl font-black text-[#1A1F36] mt-1">{workspaceData?.currentAssessment?.current_weight_kg ? `${workspaceData.currentAssessment.current_weight_kg} kg` : 'Not assessed'}</p>
                          </div>
                          <div className="bg-[#FAF8F5] p-3 rounded-xl">
                            <p className="text-[10px] uppercase font-bold text-slate-400">Height / BMI</p>
                            <p className="text-xl font-black text-[#1A1F36] mt-1">{workspaceData?.currentAssessment?.height_cm ? `${workspaceData.currentAssessment.height_cm} cm` : '-'} / {workspaceData?.currentAssessment?.bmi || '-'}</p>
                          </div>
                          <div className="bg-[#FAF8F5] p-3 rounded-xl">
                            <p className="text-[10px] uppercase font-bold text-slate-400">Weight Change</p>
                            <p className="text-xl font-black text-[#0D9488] mt-1">{workspaceData?.currentAssessment?.weight_change_kg ? `${workspaceData.currentAssessment.weight_change_kg} kg` : '0 kg'}</p>
                          </div>
                        </div>
                      </div>

                      {/* Current Nutrition Plan Card */}
                      <div className="rounded-2xl border border-[#E8DED4] bg-white p-5 shadow-sm space-y-3">
                        <div className="flex items-center justify-between">
                          <h3 className="text-sm font-black text-[#1A1F36]">Active Nutrition Plan</h3>
                          {workspaceData?.activePlan && (
                            <span className="px-2.5 py-0.5 text-[10px] font-black uppercase rounded-full bg-[#DCFCE7] text-[#166534]">
                              v{workspaceData.activePlan.version} Published
                            </span>
                          )}
                        </div>
                        {workspaceData?.activePlan ? (
                          <div className="space-y-2">
                            <p className="font-bold text-base text-[#0D9488]">{workspaceData.activePlan.plan_name}</p>
                            <p className="text-xs text-slate-600">{workspaceData.activePlan.nutrition_goals || 'Follow prescribed daily meal intervals and hydration.'}</p>
                            <div className="pt-2 flex items-center gap-3">
                              <a
                                href={`/api/dietitian/plans/${workspaceData.activePlan.id}/pdf`}
                                target="_blank"
                                rel="noreferrer"
                                className="px-3.5 py-1.5 rounded-lg border border-[#E8DED4] hover:bg-slate-50 text-xs font-bold text-[#1A1F36] flex items-center gap-1.5"
                              >
                                <Download className="w-3.5 h-3.5 text-[#0D9488]" />
                                <span>Download PDF</span>
                              </a>
                            </div>
                          </div>
                        ) : (
                          <p className="text-xs text-slate-400 py-4">No active nutrition plan published for this patient yet.</p>
                        )}
                      </div>
                    </div>

                    {/* Right column: Goals and Reminders */}
                    <div className="space-y-6">
                      <div className="rounded-2xl border border-[#E8DED4] bg-white p-5 shadow-sm space-y-3">
                        <h3 className="text-sm font-black text-[#1A1F36]">Patient Nutrition Goals</h3>
                        <p className="text-xs text-slate-600 leading-relaxed">
                          {workspaceData?.currentAssessment?.primary_goal || 'Weight management, metabolic health optimization, and sustained protein adherence.'}
                        </p>
                        <div className="pt-2 border-t border-slate-100">
                          <p className="text-[10px] uppercase font-bold text-slate-400">Target Hydration</p>
                          <p className="text-xs font-bold text-[#0D9488] mt-0.5">{workspaceData?.currentAssessment?.water_goal_liters || 2.5} Liters / Day</p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Tab 2: Nutrition Assessment */}
                {workspaceTab === 'assessment' && (
                  <div className="rounded-2xl border border-[#E8DED4] bg-white p-6 shadow-sm space-y-6">
                    <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                      <div>
                        <h3 className="text-base font-black text-[#1A1F36]">Clinical Nutrition Assessment</h3>
                        <p className="text-xs text-slate-400 font-semibold">Evidence-based anthropometric, dietary, and lifestyle evaluation</p>
                      </div>
                    </div>

                    {/* Assessment Form (Interactive Structured 6 Sections) */}
                    <form
                      onSubmit={async (e) => {
                        e.preventDefault()
                        const form = new FormData(e.currentTarget)
                        const payload = {
                          height_cm: form.get('height_cm') ? Number(form.get('height_cm')) : null,
                          current_weight_kg: form.get('current_weight_kg') ? Number(form.get('current_weight_kg')) : null,
                          previous_weight_kg: form.get('previous_weight_kg') ? Number(form.get('previous_weight_kg')) : null,
                          waist_circumference_cm: form.get('waist_circumference_cm') ? Number(form.get('waist_circumference_cm')) : null,
                          goal_weight_kg: form.get('goal_weight_kg') ? Number(form.get('goal_weight_kg')) : null,
                          typical_breakfast: form.get('typical_breakfast'),
                          typical_lunch: form.get('typical_lunch'),
                          typical_dinner: form.get('typical_dinner'),
                          snacks: form.get('snacks'),
                          water_intake_liters: form.get('water_intake_liters') ? Number(form.get('water_intake_liters')) : null,
                          dietary_preference: form.get('dietary_preference'),
                          foods_disliked: form.get('foods_disliked'),
                          dietary_restrictions: form.get('dietary_restrictions'),
                          physical_activity_level: form.get('physical_activity_level'),
                          primary_goal: form.get('primary_goal'),
                          status: 'COMPLETED',
                        }

                        try {
                          const { data: { session } } = await supabase.auth.getSession()
                          const res = await fetch(`/api/dietitian/patients/${selectedPatient.id}/assessment`, {
                            method: 'POST',
                            headers: {
                              'Content-Type': 'application/json',
                              Authorization: `Bearer ${session?.access_token || ''}`,
                            },
                            body: JSON.stringify(payload),
                          })
                          const json = await res.json()
                          if (json.success) {
                            setSuccess('Clinical assessment completed and saved!')
                            openPatientWorkspace(selectedPatient)
                          }
                        } catch (err: any) {
                          setError(err.message || 'Error saving assessment')
                        }
                      }}
                      className="space-y-6"
                    >
                      {/* Section 1: Anthropometrics */}
                      <div>
                        <h4 className="text-xs font-black uppercase tracking-wider text-[#0D9488] mb-3">1. Anthropometrics</h4>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                          <div>
                            <label className="block text-[11px] font-bold text-slate-600 mb-1">Height (cm)</label>
                            <input
                              type="number"
                              name="height_cm"
                              defaultValue={workspaceData?.currentAssessment?.height_cm || ''}
                              className="w-full px-3 py-2 border border-[#E8DED4] rounded-xl text-xs"
                              placeholder="170"
                            />
                          </div>
                          <div>
                            <label className="block text-[11px] font-bold text-slate-600 mb-1">Current Weight (kg)</label>
                            <input
                              type="number"
                              step="0.1"
                              name="current_weight_kg"
                              defaultValue={workspaceData?.currentAssessment?.current_weight_kg || ''}
                              className="w-full px-3 py-2 border border-[#E8DED4] rounded-xl text-xs"
                              placeholder="75.5"
                            />
                          </div>
                          <div>
                            <label className="block text-[11px] font-bold text-slate-600 mb-1">Previous Weight (kg)</label>
                            <input
                              type="number"
                              step="0.1"
                              name="previous_weight_kg"
                              defaultValue={workspaceData?.currentAssessment?.previous_weight_kg || ''}
                              className="w-full px-3 py-2 border border-[#E8DED4] rounded-xl text-xs"
                              placeholder="78.0"
                            />
                          </div>
                          <div>
                            <label className="block text-[11px] font-bold text-slate-600 mb-1">Goal Weight (kg)</label>
                            <input
                              type="number"
                              step="0.1"
                              name="goal_weight_kg"
                              defaultValue={workspaceData?.currentAssessment?.goal_weight_kg || ''}
                              className="w-full px-3 py-2 border border-[#E8DED4] rounded-xl text-xs"
                              placeholder="68.0"
                            />
                          </div>
                        </div>
                      </div>

                      {/* Section 2: Dietary History */}
                      <div>
                        <h4 className="text-xs font-black uppercase tracking-wider text-[#0D9488] mb-3">2. Dietary History & Routine</h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-[11px] font-bold text-slate-600 mb-1">Typical Breakfast</label>
                            <input
                              type="text"
                              name="typical_breakfast"
                              defaultValue={workspaceData?.currentAssessment?.typical_breakfast || ''}
                              className="w-full px-3 py-2 border border-[#E8DED4] rounded-xl text-xs"
                              placeholder="Oats with nuts or eggs"
                            />
                          </div>
                          <div>
                            <label className="block text-[11px] font-bold text-slate-600 mb-1">Typical Lunch</label>
                            <input
                              type="text"
                              name="typical_lunch"
                              defaultValue={workspaceData?.currentAssessment?.typical_lunch || ''}
                              className="w-full px-3 py-2 border border-[#E8DED4] rounded-xl text-xs"
                              placeholder="2 Rotis with Dal and Salad"
                            />
                          </div>
                          <div>
                            <label className="block text-[11px] font-bold text-slate-600 mb-1">Typical Dinner</label>
                            <input
                              type="text"
                              name="typical_dinner"
                              defaultValue={workspaceData?.currentAssessment?.typical_dinner || ''}
                              className="w-full px-3 py-2 border border-[#E8DED4] rounded-xl text-xs"
                              placeholder="Soup and Grilled Protein"
                            />
                          </div>
                          <div>
                            <label className="block text-[11px] font-bold text-slate-600 mb-1">Snacks & Beverages</label>
                            <input
                              type="text"
                              name="snacks"
                              defaultValue={workspaceData?.currentAssessment?.snacks || ''}
                              className="w-full px-3 py-2 border border-[#E8DED4] rounded-xl text-xs"
                              placeholder="Green tea, roasted foxnuts"
                            />
                          </div>
                        </div>
                      </div>

                      {/* Section 3: Preferences & Restrictions */}
                      <div>
                        <h4 className="text-xs font-black uppercase tracking-wider text-[#0D9488] mb-3">3. Food Preferences & Dietary Restrictions</h4>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                          <div>
                            <label className="block text-[11px] font-bold text-slate-600 mb-1">Dietary Preference</label>
                            <select
                              name="dietary_preference"
                              defaultValue={workspaceData?.currentAssessment?.dietary_preference || 'Vegetarian'}
                              className="w-full px-3 py-2 border border-[#E8DED4] rounded-xl text-xs"
                            >
                              <option value="Vegetarian">Vegetarian</option>
                              <option value="Non-Vegetarian">Non-Vegetarian</option>
                              <option value="Eggetarian">Eggetarian</option>
                              <option value="Vegan">Vegan</option>
                              <option value="Jain">Jain</option>
                            </select>
                          </div>
                          <div>
                            <label className="block text-[11px] font-bold text-slate-600 mb-1">Foods Disliked</label>
                            <input
                              type="text"
                              name="foods_disliked"
                              defaultValue={workspaceData?.currentAssessment?.foods_disliked || ''}
                              className="w-full px-3 py-2 border border-[#E8DED4] rounded-xl text-xs"
                              placeholder="Bitter gourd, excess oil"
                            />
                          </div>
                          <div>
                            <label className="block text-[11px] font-bold text-slate-600 mb-1">Food Intolerances / Restrictions</label>
                            <input
                              type="text"
                              name="dietary_restrictions"
                              defaultValue={workspaceData?.currentAssessment?.dietary_restrictions || ''}
                              className="w-full px-3 py-2 border border-[#E8DED4] rounded-xl text-xs"
                              placeholder="Lactose intolerance, gluten sensitive"
                            />
                          </div>
                        </div>
                      </div>

                      {/* Submit Buttons */}
                      <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
                        <button
                          type="submit"
                          className="px-5 py-2.5 rounded-full bg-[#0D9488] text-white text-xs font-bold hover:bg-[#0F766E] transition-colors"
                        >
                          Complete Assessment
                        </button>
                      </div>
                    </form>
                  </div>
                )}

                {/* Tab 3: Plans */}
                {workspaceTab === 'plans' && (
                  <div className="space-y-6">
                    <div className="flex items-center justify-between">
                      <h3 className="text-base font-black text-[#1A1F36]">Nutrition Plans History</h3>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => {
                            setUploadPlanPatientId(selectedPatient.id)
                            setShowUploadPlanModal(true)
                          }}
                          className="px-4 py-2 rounded-full bg-[#1A1F36] text-white text-xs font-bold hover:bg-slate-800 flex items-center gap-1.5 shadow-sm"
                        >
                          <Upload className="w-3.5 h-3.5 text-emerald-400" />
                          <span>Upload Plan File</span>
                        </button>
                        <button
                          onClick={() => {
                            setEditingPlan({
                              patient_id: selectedPatient.id,
                              plan_name: `Plan for ${selectedPatient.patient_name}`,
                              meals: [],
                            })
                            setActiveSection('plans')
                          }}
                          className="px-4 py-2 rounded-full bg-[#0D9488] text-white text-xs font-bold hover:bg-[#0F766E]"
                        >
                          + Create New Plan Draft
                        </button>
                      </div>
                    </div>

                    {workspaceData?.plans && workspaceData.plans.length > 0 ? (
                      <div className="space-y-4">
                        {workspaceData.plans.map((pl: PlanRecord) => (
                          <div key={pl.id} className="p-5 rounded-2xl border border-[#E8DED4] bg-white shadow-sm flex items-center justify-between">
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-base text-[#1A1F36]">{pl.plan_name}</span>
                                <span className="px-2 py-0.5 rounded text-[10px] font-black bg-slate-100 text-slate-700">v{pl.version}</span>
                                <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                                  pl.status === 'PUBLISHED' ? 'bg-[#DCFCE7] text-[#166534]' : 'bg-[#FEF3C7] text-[#92400E]'
                                }`}>
                                  {pl.status}
                                </span>
                              </div>
                              <p className="text-xs text-slate-400 mt-1">Start: {pl.start_date} | Review: {pl.review_date || 'None scheduled'}</p>
                            </div>
                            <div className="flex items-center gap-2">
                              {pl.status === 'PUBLISHED' ? (
                                <a
                                  href={`/api/dietitian/plans/${pl.id}/pdf`}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="px-3.5 py-1.5 rounded-lg border border-[#E8DED4] text-xs font-bold hover:bg-slate-50 flex items-center gap-1.5"
                                >
                                  <Download className="w-3.5 h-3.5 text-[#0D9488]" />
                                  <span>PDF</span>
                                </a>
                              ) : (
                                <button
                                  onClick={() => handlePublishPlan(pl.id)}
                                  className="px-4 py-1.5 rounded-lg bg-[#0D9488] text-white text-xs font-bold hover:bg-[#0F766E]"
                                >
                                  Publish Plan
                                </button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-slate-400 py-6 text-center">No plans recorded for this patient.</p>
                    )}
                  </div>
                )}

                {/* Tab 4: Food Logs */}
                {workspaceTab === 'food-logs' && (
                  <div className="space-y-4">
                    <h3 className="text-base font-black text-[#1A1F36]">Submitted Patient Logs</h3>
                    {workspaceData?.foodLogs && workspaceData.foodLogs.length > 0 ? (
                      <div className="space-y-3">
                        {workspaceData.foodLogs.map((log: FoodLogRecord) => (
                          <div key={log.id} className="p-4 rounded-xl border border-[#E8DED4] bg-white shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-xs text-[#0D9488] uppercase">{log.meal_type}</span>
                                <span className="text-[10px] text-slate-400">{log.log_date} {log.time ? `• ${log.time}` : ''}</span>
                              </div>
                              <p className="text-xs font-semibold text-[#1A1F36] mt-1">{log.food_items || (log.water_liters ? `${log.water_liters} L Water` : '')}</p>
                              {log.portion && <p className="text-[11px] text-slate-400">Portion: {log.portion}</p>}
                              {log.dietitian_comment && (
                                <p className="mt-2 text-xs font-medium text-[#0D9488] bg-[#0D9488]/10 p-2 rounded-lg">
                                  Feedback: {log.dietitian_comment}
                                </p>
                              )}
                            </div>
                            {!log.dietitian_reviewed && (
                              <div className="flex items-center gap-2">
                                <input
                                  type="text"
                                  placeholder="Clinical comment..."
                                  value={selectedLogId === log.id ? reviewComment : ''}
                                  onChange={(e) => {
                                    setSelectedLogId(log.id)
                                    setReviewComment(e.target.value)
                                  }}
                                  className="px-3 py-1.5 border border-[#E8DED4] rounded-lg text-xs"
                                />
                                <button
                                  onClick={() => handleReviewFoodLog(log.id)}
                                  className="px-3 py-1.5 rounded-lg bg-[#0D9488] text-white text-xs font-bold hover:bg-[#0F766E]"
                                >
                                  Submit
                                </button>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-slate-400 py-6 text-center">No food logs submitted by patient yet.</p>
                    )}
                  </div>
                )}

                {/* Tab 5: Progress */}
                {workspaceTab === 'progress' && (
                  <div className="rounded-2xl border border-[#E8DED4] bg-white p-6 shadow-sm space-y-6">
                    <h3 className="text-base font-black text-[#1A1F36]">Progress & Adherence Metrics</h3>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                      <div className="p-4 rounded-xl bg-[#FAF8F5]">
                        <p className="text-[10px] uppercase font-bold text-slate-400">Starting Weight</p>
                        <p className="text-xl font-black text-[#1A1F36] mt-1">{workspaceData?.currentAssessment?.previous_weight_kg ? `${workspaceData.currentAssessment.previous_weight_kg} kg` : '-'}</p>
                      </div>
                      <div className="p-4 rounded-xl bg-[#FAF8F5]">
                        <p className="text-[10px] uppercase font-bold text-slate-400">Current Weight</p>
                        <p className="text-xl font-black text-[#0D9488] mt-1">{workspaceData?.currentAssessment?.current_weight_kg ? `${workspaceData.currentAssessment.current_weight_kg} kg` : '-'}</p>
                      </div>
                      <div className="p-4 rounded-xl bg-[#FAF8F5]">
                        <p className="text-[10px] uppercase font-bold text-slate-400">Total Change</p>
                        <p className="text-xl font-black text-[#1A1F36] mt-1">{workspaceData?.currentAssessment?.weight_change_kg ? `${workspaceData.currentAssessment.weight_change_kg} kg` : '0 kg'}</p>
                      </div>
                      <div className="p-4 rounded-xl bg-[#FAF8F5]">
                        <p className="text-[10px] uppercase font-bold text-slate-400">Goal Target</p>
                        <p className="text-xl font-black text-[#C4622D] mt-1">{workspaceData?.currentAssessment?.goal_weight_kg ? `${workspaceData.currentAssessment.goal_weight_kg} kg` : '-'}</p>
                      </div>
                    </div>
                  </div>
                )}


              </div>
            )}
          </div>
        )}

        {/* SECTION 3: NUTRITION PLANS & BUILDER */}
        {activeSection === 'plans' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h1 className="text-2xl font-black text-[#1A1F36]">Clinical Nutrition Plans</h1>
                <p className="text-xs text-slate-500 font-semibold">Immutable versioned dietary protocols & meal builders</p>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => {
                    setProtocolBuilderPatient(null)
                    setProtocolBuilderConsultation(null)
                    setShowProtocolBuilder(true)
                  }}
                  className="rounded-full bg-gradient-to-r from-[#0D9488] to-teal-700 hover:from-teal-700 hover:to-teal-800 text-white px-5 py-2.5 text-xs font-bold flex items-center gap-2 shadow-sm cursor-pointer"
                >
                  <Sparkles className="w-4 h-4 text-emerald-200" />
                  <span>Author Official Protocol</span>
                </button>
                <button
                  onClick={() => {
                    if (allPatientOptions.length > 0 && !uploadPlanPatientId) {
                      setUploadPlanPatientId(allPatientOptions[0].id)
                    }
                    setShowUploadPlanModal(true)
                  }}
                  className="rounded-full bg-[#1A1F36] hover:bg-slate-800 text-white px-5 py-2.5 text-xs font-bold flex items-center gap-2 shadow-sm cursor-pointer"
                >
                  <Upload className="w-4 h-4 text-emerald-400" />
                  <span>Upload Nutrition Plan</span>
                </button>
                <button
                  onClick={() => setEditingPlan({
                    plan_name: 'Metabolic Nutrition Protocol',
                    daily_calorie_target: 1600,
                    water_target_liters: 2.5,
                    meals: [
                      { id: '1', name: 'Breakfast', time: '08:30 AM', items: [{ food: 'Vegetable Oats + Boiled Eggs', portion: '1 bowl', unit: 'serving' }] },
                      { id: '2', name: 'Lunch', time: '01:30 PM', items: [{ food: 'Millet Roti + Dal + Green Salad', portion: '1 plate', unit: 'serving' }] },
                      { id: '3', name: 'Dinner', time: '08:00 PM', items: [{ food: 'Clear Lentil Soup + Grilled Tofu/Fish', portion: '1 bowl', unit: 'serving' }] },
                    ]
                  })}
                  className="rounded-full bg-[#0D9488] hover:bg-[#0F766E] text-white px-5 py-2.5 text-xs font-bold flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  <span>New Plan Builder</span>
                </button>
              </div>
            </div>

            {/* Editing / Creating Plan Builder Modal/Card */}
            {editingPlan ? (
              <div className="rounded-2xl border border-[#0D9488] bg-white p-6 shadow-md space-y-6">
                <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                  <div>
                    <h3 className="text-base font-black text-[#1A1F36]">Clinical Nutrition Plan Builder</h3>
                    <p className="text-xs text-slate-400 font-semibold">Design structured meal schedules with calorie and hydration targets</p>
                  </div>
                  <button
                    onClick={() => setEditingPlan(null)}
                    className="text-xs font-bold text-slate-400 hover:text-slate-600"
                  >
                    Cancel
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">Plan Name</label>
                    <input
                      type="text"
                      value={editingPlan.plan_name || ''}
                      onChange={(e) => setEditingPlan({ ...editingPlan, plan_name: e.target.value })}
                      className="w-full px-3 py-2 border border-[#E8DED4] rounded-xl text-xs"
                      placeholder="e.g. Weight Management Balanced Plan"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">Assign to Patient</label>
                    <select
                      value={editingPlan.patient_id || ''}
                      onChange={(e) => setEditingPlan({ ...editingPlan, patient_id: e.target.value })}
                      className="w-full px-3 py-2 border border-[#E8DED4] rounded-xl text-xs"
                    >
                      <option value="">Select patient...</option>
                      {patients.map((p) => (
                        <option key={p.id} value={p.id}>{p.patient_name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">Daily Calorie Target (kcal)</label>
                    <input
                      type="number"
                      value={editingPlan.daily_calorie_target || ''}
                      onChange={(e) => setEditingPlan({ ...editingPlan, daily_calorie_target: Number(e.target.value) })}
                      className="w-full px-3 py-2 border border-[#E8DED4] rounded-xl text-xs"
                      placeholder="1600"
                    />
                  </div>
                </div>

                {/* Structured Meals */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-black uppercase tracking-wider text-[#0D9488]">Structured Meals</h4>
                    <button
                      type="button"
                      onClick={() => {
                        const newMeals = [...(editingPlan.meals || [])]
                        newMeals.push({
                          id: `meal-${Date.now()}`,
                          name: 'Mid-Meal Snack',
                          time: '04:30 PM',
                          items: [{ food: 'Foxnuts / Fruit', portion: '1', unit: 'serving' }],
                        })
                        setEditingPlan({ ...editingPlan, meals: newMeals })
                      }}
                      className="text-xs font-bold text-[#0D9488] hover:underline"
                    >
                      + Add Meal
                    </button>
                  </div>

                  {editingPlan.meals?.map((meal, mIdx) => (
                    <div key={meal.id || mIdx} className="p-4 rounded-xl border border-[#E8DED4] bg-[#FAF8F5] space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <input
                            type="text"
                            value={meal.name}
                            onChange={(e) => {
                              const newMeals = [...(editingPlan.meals || [])]
                              newMeals[mIdx].name = e.target.value
                              setEditingPlan({ ...editingPlan, meals: newMeals })
                            }}
                            className="px-2.5 py-1 font-bold text-xs bg-white border border-[#E8DED4] rounded-lg"
                          />
                          <input
                            type="text"
                            value={meal.time || ''}
                            onChange={(e) => {
                              const newMeals = [...(editingPlan.meals || [])]
                              newMeals[mIdx].time = e.target.value
                              setEditingPlan({ ...editingPlan, meals: newMeals })
                            }}
                            className="px-2.5 py-1 text-xs bg-white border border-[#E8DED4] rounded-lg w-28"
                            placeholder="08:30 AM"
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            const newMeals = editingPlan.meals?.filter((_, idx) => idx !== mIdx)
                            setEditingPlan({ ...editingPlan, meals: newMeals })
                          }}
                          className="text-xs text-[#B94D4D] font-bold hover:underline"
                        >
                          Remove Meal
                        </button>
                      </div>

                      {/* Items */}
                      {meal.items.map((it, iIdx) => (
                        <div key={iIdx} className="grid grid-cols-1 sm:grid-cols-4 gap-2 text-xs">
                          <input
                            type="text"
                            placeholder="Food item"
                            value={it.food}
                            onChange={(e) => {
                              const newMeals = [...(editingPlan.meals || [])]
                              newMeals[mIdx].items[iIdx].food = e.target.value
                              setEditingPlan({ ...editingPlan, meals: newMeals })
                            }}
                            className="px-2.5 py-1.5 bg-white border border-[#E8DED4] rounded-lg sm:col-span-2"
                          />
                          <input
                            type="text"
                            placeholder="Portion & Unit"
                            value={`${it.portion} ${it.unit}`}
                            onChange={(e) => {
                              const newMeals = [...(editingPlan.meals || [])]
                              newMeals[mIdx].items[iIdx].portion = e.target.value
                              setEditingPlan({ ...editingPlan, meals: newMeals })
                            }}
                            className="px-2.5 py-1.5 bg-white border border-[#E8DED4] rounded-lg"
                          />
                          <input
                            type="text"
                            placeholder="Alternative"
                            value={it.alternative || ''}
                            onChange={(e) => {
                              const newMeals = [...(editingPlan.meals || [])]
                              newMeals[mIdx].items[iIdx].alternative = e.target.value
                              setEditingPlan({ ...editingPlan, meals: newMeals })
                            }}
                            className="px-2.5 py-1.5 bg-white border border-[#E8DED4] rounded-lg"
                          />
                        </div>
                      ))}
                    </div>
                  ))}
                </div>

                {/* Save Draft & Publish */}
                <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={async () => {
                      if (!editingPlan.patient_id) {
                        setError('Please select a patient to assign this plan.')
                        return
                      }
                      try {
                        const { data: { session } } = await supabase.auth.getSession()
                        const res = await fetch('/api/dietitian/plans', {
                          method: 'POST',
                          headers: {
                            'Content-Type': 'application/json',
                            Authorization: `Bearer ${session?.access_token || ''}`,
                          },
                          body: JSON.stringify(editingPlan),
                        })
                        const json = await res.json()
                        if (json.success) {
                          setSuccess('Plan draft saved!')
                          setEditingPlan(null)
                          loadData()
                        }
                      } catch (err: any) {
                        setError(err.message || 'Error saving draft')
                      }
                    }}
                    className="px-5 py-2.5 rounded-full border border-[#E8DED4] text-xs font-bold hover:bg-slate-50"
                  >
                    Save Draft
                  </button>
                  <button
                    type="button"
                    onClick={async () => {
                      if (!editingPlan.patient_id) {
                        setError('Please select a patient to assign this plan.')
                        return
                      }
                      try {
                        const { data: { session } } = await supabase.auth.getSession()
                        const res = await fetch('/api/dietitian/plans', {
                          method: 'POST',
                          headers: {
                            'Content-Type': 'application/json',
                            Authorization: `Bearer ${session?.access_token || ''}`,
                          },
                          body: JSON.stringify(editingPlan),
                        })
                        const json = await res.json()
                        if (json.success && json.plan?.id) {
                          await handlePublishPlan(json.plan.id)
                        }
                      } catch (err: any) {
                        setError(err.message || 'Error publishing plan')
                      }
                    }}
                    className="px-6 py-2.5 rounded-full bg-[#0D9488] text-white text-xs font-bold hover:bg-[#0F766E]"
                  >
                    Publish Nutrition Plan
                  </button>
                </div>
              </div>
            ) : (
              /* Plans Catalog & Templates */
              <div className="space-y-6">
                <div className="flex border-b border-[#E8DED4] gap-6 text-xs font-bold">
                  {(['active', 'templates'] as const).map((tab) => (
                    <button
                      key={tab}
                      onClick={() => setPlanSubTab(tab)}
                      className={`pb-3 border-b-2 capitalize transition-colors ${
                        planSubTab === tab ? 'border-[#0D9488] text-[#0D9488]' : 'border-transparent text-slate-400'
                      }`}
                    >
                      {tab}
                    </button>
                  ))}
                </div>

                {planSubTab === 'active' && (
                  plans.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {plans.map((p) => {
                        const patName = p.profiles?.full_name || 'Assigned Patient'
                        const patInitials = patName
                          .trim()
                          .split(' ')
                          .filter(Boolean)
                          .map((n) => n[0])
                          .slice(0, 2)
                          .join('')
                          .toUpperCase() || 'PT'

                        const fileUrl = p.attachment_signed_url || p.pdf_url || null
                        const hasAttachment = Boolean(p.attachment_url || p.attachment_signed_url)

                        return (
                          <div key={p.id} className="p-5 rounded-2xl border border-[#E8DED4] bg-white shadow-xs hover:shadow-md transition-all space-y-4">
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-2xl bg-[#E6F4F1] text-[#0D9488] font-black text-xs flex items-center justify-center shrink-0 border border-teal-200/60 shadow-xs">
                                  {patInitials}
                                </div>
                                <div>
                                  <h3 className="font-bold text-sm text-[#1A1F36] leading-tight">{p.plan_name}</h3>
                                  <p className="text-xs text-slate-500 font-medium mt-0.5">
                                    Patient: <span className="font-bold text-slate-700">{patName}</span> • v{p.version || 1}
                                  </p>
                                </div>
                              </div>
                              <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider shrink-0 ${
                                p.status === 'PUBLISHED' || p.status === 'ACTIVE'
                                  ? 'bg-[#DCFCE7] text-[#166534] border border-emerald-200'
                                  : 'bg-[#FEF3C7] text-[#92400E] border border-amber-200'
                              }`}>
                                {p.status}
                              </span>
                            </div>

                            {/* Targets & Specs */}
                            <div className="flex flex-wrap items-center gap-2 text-xs">
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-teal-50 text-[#0D9488] font-bold border border-teal-100">
                                <span>🔥</span>
                                <span>{p.daily_calorie_target || 1600} kcal/day</span>
                              </span>
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-sky-50 text-sky-800 font-bold border border-sky-100">
                                <span>💧</span>
                                <span>{p.water_target_liters || 2.5} L water</span>
                              </span>
                              {p.meals && p.meals.length > 0 && (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-50 text-slate-700 font-semibold border border-slate-200">
                                  <span>🍽️</span>
                                  <span>{p.meals.length} meals</span>
                                </span>
                              )}
                            </div>

                            {/* Attached Clinical Document (if uploaded) */}
                            {hasAttachment && (
                              <div className="p-3 rounded-xl bg-[#FAF8F5] border border-[#E8DED4]/80 flex items-center justify-between gap-3 text-xs">
                                <div className="flex items-center gap-2 truncate">
                                  <FileText className="w-4 h-4 text-[#0D9488] shrink-0" />
                                  <div className="truncate">
                                    <p className="font-bold text-[#1A1F36] truncate">
                                      {p.attachment_type?.includes('pdf')
                                        ? 'Dietary Protocol PDF'
                                        : 'Dietary Protocol Attachment'}
                                    </p>
                                    <p className="text-[10px] text-slate-400">Verified Clinical Document</p>
                                  </div>
                                </div>
                                {fileUrl && (
                                  <a
                                    href={fileUrl}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="shrink-0 inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-white border border-[#E8DED4] hover:border-[#0D9488] text-xs font-bold text-[#0D9488] transition shadow-xs"
                                  >
                                    <ExternalLink className="w-3.5 h-3.5" />
                                    <span>View File</span>
                                  </a>
                                )}
                              </div>
                            )}

                            {/* Card Footer */}
                            <div className="pt-3 flex items-center justify-between border-t border-slate-100 text-xs">
                              <span className="text-[11px] text-slate-400 font-medium">
                                Created {p.created_at ? new Date(p.created_at).toLocaleDateString() : 'Recently'}
                              </span>
                              <div className="flex items-center gap-3">
                                <button
                                  type="button"
                                  onClick={() => setViewingOfficialProtocol({
                                    ...p,
                                    title: p.plan_name,
                                    patient_name: patName,
                                    calories_per_day: p.daily_calorie_target,
                                    hydration_goal: `${p.water_target_liters || 2.5} L`,
                                    dietitian_name: providerUser?.name || 'Assigned Dietitian',
                                    notes: p.notes || (p.meals && p.meals.length > 0 ? JSON.stringify(p.meals, null, 2) : ''),
                                  })}
                                  className="text-xs font-bold text-[#0D9488] hover:underline flex items-center gap-1 cursor-pointer"
                                >
                                  <FileText className="w-3.5 h-3.5" />
                                  <span>Official Letterhead</span>
                                </button>
                                {p.status === 'PUBLISHED' && (
                                  <a
                                    href={`/api/dietitian/plans/${p.id}/pdf`}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="text-xs font-bold text-slate-600 hover:text-slate-900 hover:underline flex items-center gap-1"
                                  >
                                    <Download className="w-3.5 h-3.5" />
                                    <span>PDF</span>
                                  </a>
                                )}
                              </div>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  ) : (
                    <div className="rounded-2xl border border-dashed border-[#E8DED4] p-12 text-center bg-white space-y-3">
                      <div className="w-12 h-12 rounded-2xl bg-teal-50 text-[#0D9488] flex items-center justify-center mx-auto">
                        <BookOpen className="w-6 h-6" />
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-[#1A1F36]">No active nutrition plans yet</h3>
                        <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                          Upload a nutrition protocol document or build a customized meal plan for your assigned patients.
                        </p>
                      </div>
                      <div className="flex items-center justify-center gap-3 pt-2">
                        <button
                          type="button"
                          onClick={() => {
                            if (allPatientOptions.length > 0 && !uploadPlanPatientId) {
                              setUploadPlanPatientId(allPatientOptions[0].id)
                            }
                            setShowUploadPlanModal(true)
                          }}
                          className="px-4 py-2 rounded-xl bg-[#0D9488] hover:bg-[#0F766E] text-white text-xs font-bold transition shadow-xs cursor-pointer flex items-center gap-1.5"
                        >
                          <Upload className="w-3.5 h-3.5" />
                          <span>Upload Plan Document</span>
                        </button>
                      </div>
                    </div>
                  )
                )}

                {planSubTab === 'templates' && (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {templates.map((tmpl) => (
                      <div key={tmpl.id} className="p-5 rounded-2xl border border-[#E8DED4] bg-white shadow-sm space-y-3 flex flex-col justify-between">
                        <div>
                          <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase bg-[#0D9488]/10 text-[#0D9488]">
                            {tmpl.category}
                          </span>
                          <h4 className="font-bold text-sm text-[#1A1F36] mt-2">{tmpl.name}</h4>
                          <p className="text-xs text-slate-500 mt-1 leading-relaxed">{tmpl.description}</p>
                        </div>
                        <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                          <span className="text-xs font-bold text-slate-400">{tmpl.target_calories} kcal</span>
                          <button
                            onClick={() => {
                              setEditingPlan({
                                plan_name: `${tmpl.name} (Customized)`,
                                daily_calorie_target: tmpl.target_calories,
                                water_target_liters: tmpl.water_target_liters,
                                meals: tmpl.meals,
                                general_instructions: tmpl.instructions,
                              })
                            }}
                            className="px-3 py-1.5 rounded-lg bg-[#0D9488] text-white text-[11px] font-bold hover:bg-[#0F766E]"
                          >
                            Use Template
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* SECTION 4: FOOD LOGS */}
        {activeSection === 'food-logs' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h1 className="text-2xl font-black text-[#1A1F36]">Patient Food & Hydration Logs</h1>
                <p className="text-xs text-slate-500 font-semibold">Review patient-logged meals and offer structured clinical feedback</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setFoodLogFilter('all')}
                  className={`px-3.5 py-1.5 rounded-full text-xs font-bold ${
                    foodLogFilter === 'all' ? 'bg-[#1A1F36] text-white' : 'bg-white border border-[#E8DED4] text-slate-600'
                  }`}
                >
                  All Logs
                </button>
                <button
                  onClick={() => setFoodLogFilter('unreviewed')}
                  className={`px-3.5 py-1.5 rounded-full text-xs font-bold ${
                    foodLogFilter === 'unreviewed' ? 'bg-[#1A1F36] text-white' : 'bg-white border border-[#E8DED4] text-slate-600'
                  }`}
                >
                  Unreviewed Only
                </button>
              </div>
            </div>

            {foodLogs.length > 0 ? (
              <div className="space-y-3">
                {foodLogs.map((log) => (
                  <div key={log.id} className="p-5 rounded-2xl border border-[#E8DED4] bg-white shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-[#1A1F36]">{log.profiles?.full_name || 'Patient'}</span>
                        <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase bg-[#FAF8F5] text-[#0D9488]">
                          {log.meal_type}
                        </span>
                        <span className="text-xs text-slate-400">{log.log_date} {log.time ? `• ${log.time}` : ''}</span>
                      </div>
                      <p className="text-xs font-semibold text-slate-700 mt-1">{log.food_items || (log.water_liters ? `${log.water_liters} L Water Intake` : '')}</p>
                      {log.dietitian_comment && (
                        <p className="mt-2 text-xs font-semibold text-[#0D9488] bg-[#0D9488]/10 p-2.5 rounded-xl">
                          Dietitian Feedback: {log.dietitian_comment}
                        </p>
                      )}
                    </div>
                    {!log.dietitian_reviewed && (
                      <div className="flex items-center gap-2 w-full md:w-auto">
                        <input
                          type="text"
                          placeholder="Provide clinical feedback..."
                          value={selectedLogId === log.id ? reviewComment : ''}
                          onChange={(e) => {
                            setSelectedLogId(log.id)
                            setReviewComment(e.target.value)
                          }}
                          className="px-3 py-2 border border-[#E8DED4] rounded-xl text-xs flex-1 md:w-64"
                        />
                        <button
                          onClick={() => handleReviewFoodLog(log.id)}
                          className="px-4 py-2 rounded-xl bg-[#0D9488] text-white text-xs font-bold hover:bg-[#0F766E] whitespace-nowrap"
                        >
                          Send
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-[#E8DED4] p-12 text-center bg-white">
                <Utensils className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                <h3 className="text-sm font-bold text-[#1A1F36]">No food logs submitted</h3>
                <p className="text-xs text-slate-400 mt-1">Meals logged by patients in their portal will appear here.</p>
              </div>
            )}
          </div>
        )}



        {/* SECTION 6: CONSULTATIONS */}
        {activeSection === 'consultations' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <p className="text-xs font-black uppercase tracking-wider text-[#0D9488]">Telehealth Consultations</p>
                <h1 className="text-2xl font-black text-[#1A1F36]">Nutrition Consultations</h1>
                <p className="text-xs text-slate-500 font-semibold">Scheduled and historical clinical telehealth sessions</p>
              </div>
              <button
                onClick={() => setActiveSection('schedule')}
                className="px-4 py-2 rounded-full bg-[#0D9488] hover:bg-[#0F766E] text-white text-xs font-bold transition-colors flex items-center gap-2 shadow-sm self-start"
              >
                <CalendarDays className="w-4 h-4 text-white" />
                <span>Manage Availability</span>
              </button>
            </div>

            {/* Stat Cards */}
            <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-5">
              {[
                { label: 'Today', value: consultationStats?.today || 0, color: 'text-[#0D9488]' },
                { label: 'Upcoming', value: consultationStats?.upcoming || 0, color: 'text-[#1A1F36]' },
                { label: 'Completed', value: consultationStats?.completed || 0, color: 'text-[#166534]' },
                { label: 'Missed', value: consultationStats?.missed || 0, color: 'text-[#B94D4D]' },
                { label: 'Cancelled', value: consultationStats?.cancelled || 0, color: 'text-slate-400' },
              ].map((card) => (
                <div key={card.label} className="rounded-2xl border border-[#E8DED4] bg-white p-4 shadow-sm">
                  <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">{card.label}</p>
                  <p className={`mt-2 text-2xl font-black ${card.color}`}>{card.value}</p>
                </div>
              ))}
            </div>

            {/* Sessions Table Container */}
            <div className="rounded-2xl border border-[#E8DED4] bg-white p-5 md:p-6 shadow-sm">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-5">
                <h3 className="text-base font-black text-[#1A1F36]">Assigned Video Sessions</h3>
                <div className="flex flex-col sm:flex-row gap-2.5">
                  <div className="relative">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Search sessions..."
                      value={consultationsSearch}
                      onChange={(e) => {
                        setConsultationsSearch(e.target.value)
                        setConsultationsPage(1)
                      }}
                      className="pl-10 pr-4 py-2 border border-[#E8DED4] rounded-xl text-xs w-full sm:w-52"
                    />
                  </div>
                  <select
                    value={consultationsStatus}
                    onChange={(e) => {
                      setConsultationsStatus(e.target.value)
                      setConsultationsPage(1)
                    }}
                    className="px-3 py-2 border border-[#E8DED4] rounded-xl text-xs bg-white text-slate-700"
                  >
                    <option value="">All Statuses</option>
                    <option value="scheduled">Scheduled</option>
                    <option value="completed">Completed</option>
                    <option value="missed_by_patient">Missed by Patient</option>
                    <option value="cancelled_by_doctor">Cancelled by Provider</option>
                    <option value="cancelled_by_patient">Cancelled by Patient</option>
                  </select>
                </div>
              </div>

              {dietitianConsultations.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-left min-w-[760px]">
                    <thead>
                      <tr className="border-b border-[#E8DED4] text-[11px] font-black uppercase tracking-wider text-slate-400">
                        <th className="py-3.5 px-3">Patient</th>
                        <th className="py-3.5 px-3">Date &amp; Time</th>
                        <th className="py-3.5 px-3">Consultation Type</th>
                        <th className="py-3.5 px-3">Status</th>
                        <th className="py-3.5 px-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E8DED4]">
                      {dietitianConsultations.map((session) => {
                        const status = String(session.status || '').toLowerCase()
                        const terminal = ['completed', 'cancelled', 'cancelled_by_doctor', 'cancelled_by_patient', 'missed', 'missed_by_patient'].includes(status)
                        const isMenuOpen = actionMenuOpenSessionId === session.id
                        const initials = (session.patientName || 'Patient')
                          .trim()
                          .split(' ')
                          .filter(Boolean)
                          .map((n) => n[0])
                          .slice(0, 2)
                          .join('')
                          .toUpperCase() || 'PT'

                        return (
                          <tr key={session.id} className="text-xs hover:bg-[#FAF8F5]/60 transition-colors">
                            {/* Patient Info with Avatar */}
                            <td className="py-4 px-3">
                              <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-2xl bg-[#E6F4F1] text-[#0D9488] font-black text-xs flex items-center justify-center shrink-0 border border-teal-200/60 shadow-xs">
                                  {initials}
                                </div>
                                <div>
                                  <p className="font-bold text-[#1A1F36] text-sm leading-tight">{session.patientName}</p>
                                  <p className="text-[11px] text-slate-400 font-medium mt-0.5">
                                    ID: {session.patient_id ? `${session.patient_id.substring(0, 8)}...` : 'Patient'}
                                  </p>
                                </div>
                              </div>
                            </td>

                            {/* Date & Time */}
                            <td className="py-4 px-3">
                              <p className="font-bold text-[#1A1F36] text-xs">{formatDate(session.booking_date || null)}</p>
                              <p className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-500 mt-0.5">
                                <Clock className="w-3 h-3 text-slate-400" />
                                <span>{formatTime(session.booking_time)}</span>
                              </p>
                            </td>

                            {/* Type */}
                            <td className="py-4 px-3">
                              <span className="inline-block px-2.5 py-1 rounded-lg bg-slate-100/80 text-slate-700 font-bold text-[11px]">
                                {session.appointmentType || session.roleLabel || 'Nutrition Consult'}
                              </span>
                            </td>

                            {/* Status */}
                            <td className="py-4 px-3">
                              {status === 'completed' ? (
                                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-[#DCFCE7] text-[#166534] border border-emerald-200">
                                  <CheckCircle2 className="w-3 h-3 text-[#166534]" />
                                  <span>Completed</span>
                                </span>
                              ) : status === 'attended' ? (
                                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-50 text-amber-900 border border-amber-300">
                                  <AlertTriangle className="w-3 h-3 text-amber-600" />
                                  <span>Attended · Plan Pending</span>
                                </span>
                              ) : status === 'scheduled' ? (
                                session.canJoin ? (
                                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-50 text-emerald-800 border border-emerald-300 shadow-xs">
                                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                                    <span>Live Now</span>
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-[#E0F2FE] text-[#0369A1] border border-sky-200">
                                    <Clock className="w-3 h-3 text-sky-600" />
                                    <span>Scheduled</span>
                                  </span>
                                )
                              ) : ['missed', 'missed_by_patient'].includes(status) ? (
                                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-orange-50 text-orange-800 border border-orange-200">
                                  <span>Missed by Patient</span>
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-slate-100 text-slate-600 border border-slate-200">
                                  <span>{session.status || 'Cancelled'}</span>
                                </span>
                              )}
                            </td>

                            {/* Actions Column */}
                            <td className="py-4 px-3 text-right">
                              <div className="flex items-center justify-end gap-2 relative">
                                {/* State-Aware Primary CTA */}
                                {status === 'attended' ? (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setProtocolBuilderPatient({ id: session.patient_id || '', name: session.patientName || 'Patient' })
                                      setProtocolBuilderConsultation(session)
                                      setShowProtocolBuilder(true)
                                    }}
                                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-gradient-to-r from-[#0D9488] to-teal-700 hover:from-teal-700 hover:to-teal-800 text-white text-xs font-bold shadow-xs hover:shadow transition-all cursor-pointer"
                                    title="Deliver official letterhead nutrition plan to complete consultation and release wallet earnings"
                                  >
                                    <Sparkles className="w-3.5 h-3.5 text-emerald-200" />
                                    <span>Deliver Protocol &amp; Complete</span>
                                  </button>
                                ) : status === 'completed' ? (
                                  <button
                                    type="button"
                                    onClick={() => setActiveSection('plans')}
                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-emerald-200 bg-emerald-50/60 text-[#166534] hover:bg-emerald-100 text-xs font-bold transition cursor-pointer"
                                  >
                                    <FileCheck className="w-3.5 h-3.5 text-emerald-600" />
                                    <span>View Plan</span>
                                  </button>
                                ) : isSessionJoinable(session) && !terminal ? (
                                  <a
                                    href={session.meetingUrl || `/video/room?id=${session.id}`}
                                    target="_blank"
                                    rel="opener"
                                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white text-xs font-black shadow-md shadow-emerald-700/25 hover:scale-105 active:scale-95 transition-all cursor-pointer animate-pulse"
                                  >
                                    <Video className="w-3.5 h-3.5 text-white animate-pulse" />
                                    <span>JOIN VIDEO CALL</span>
                                  </a>
                                ) : terminal ? (
                                  <span className="px-2.5 py-1.5 text-[11px] text-slate-400 font-semibold italic">
                                    Ended
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-slate-500 text-[11px] font-semibold">
                                    <Clock className="w-3 h-3 text-slate-400" />
                                    <span>Opens 15m prior</span>
                                  </span>
                                )}

                                {/* More Options (••• Dropdown Menu) */}
                                {!terminal && (
                                  <div className="relative">
                                    <button
                                      type="button"
                                      onClick={() => setActionMenuOpenSessionId(isMenuOpen ? null : session.id)}
                                      className="p-2 rounded-xl border border-slate-200 hover:border-slate-300 text-slate-500 hover:text-slate-800 hover:bg-slate-50 transition cursor-pointer"
                                      title="More session options"
                                    >
                                      <MoreVertical className="w-4 h-4" />
                                    </button>

                                    {isMenuOpen && (
                                      <>
                                        <div
                                          className="fixed inset-0 z-20"
                                          onClick={() => setActionMenuOpenSessionId(null)}
                                        />
                                        <div className="absolute right-0 top-full mt-1.5 w-52 rounded-2xl bg-white shadow-xl border border-slate-200/90 py-1.5 z-30 animate-in fade-in zoom-in-95 text-left divide-y divide-slate-100">
                                          <div className="py-1">
                                            {session.patient_id && (
                                              <button
                                                type="button"
                                                onClick={() => {
                                                  setActionMenuOpenSessionId(null)
                                                  const pat = patients.find((p) => p.id === session.patient_id)
                                                  if (pat) {
                                                    openPatientWorkspace(pat)
                                                  } else if (session.patient_id) {
                                                    setSelectedPatient({
                                                      id: session.patient_id,
                                                      patient_name: session.patientName,
                                                    })
                                                  }
                                                  setActiveSection('patients')
                                                }}
                                                className="w-full text-left px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 flex items-center gap-2 cursor-pointer"
                                              >
                                                <UserCheck className="w-4 h-4 text-slate-400" />
                                                <span>View Patient Chart</span>
                                              </button>
                                            )}
                                            {status === 'attended' && (
                                              <button
                                                type="button"
                                                onClick={() => {
                                                  setActionMenuOpenSessionId(null)
                                                  setUploadPlanPatientId(session.patient_id || '')
                                                  setUploadPlanAppointmentId(session.id || '')
                                                  setPlanAssignMode('template')
                                                  setShowUploadPlanModal(true)
                                                }}
                                                className="w-full text-left px-3.5 py-2 text-xs font-semibold text-[#0D9488] hover:bg-teal-50 flex items-center gap-2 cursor-pointer"
                                              >
                                                <Layers className="w-4 h-4 text-[#0D9488]" />
                                                <span>Assign from Templates</span>
                                              </button>
                                            )}
                                          </div>
                                          <div className="py-1">
                                            <button
                                              type="button"
                                              onClick={() => {
                                                setActionMenuOpenSessionId(null)
                                                setConfirmModal({
                                                  type: 'missed',
                                                  sessionId: session.id,
                                                  patientName: session.patientName,
                                                })
                                              }}
                                              className="w-full text-left px-3.5 py-2 text-xs font-semibold text-amber-700 hover:bg-amber-50 flex items-center gap-2 cursor-pointer"
                                            >
                                              <AlertTriangle className="w-4 h-4 text-amber-500" />
                                              <span>Mark Missed by Patient</span>
                                            </button>
                                            <button
                                              type="button"
                                              onClick={() => {
                                                setActionMenuOpenSessionId(null)
                                                setConfirmModal({
                                                  type: 'cancel',
                                                  sessionId: session.id,
                                                  patientName: session.patientName,
                                                })
                                              }}
                                              className="w-full text-left px-3.5 py-2 text-xs font-semibold text-rose-700 hover:bg-rose-50 flex items-center gap-2 cursor-pointer"
                                            >
                                              <XCircle className="w-4 h-4 text-rose-500" />
                                              <span>Cancel Consultation</span>
                                            </button>
                                          </div>
                                        </div>
                                      </>
                                    )}
                                  </div>
                                )}
                              </div>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="p-8 text-center bg-[#FAF8F5] rounded-xl text-slate-400 text-xs font-bold">
                  No scheduled video consultations found. Set your availability slots so patients can book sessions!
                </div>
              )}

              {consultationsTotalPages > 1 && (
                <div className="flex items-center justify-between border-t border-[#E8DED4] pt-4 mt-4 text-xs font-bold text-slate-600">
                  <button
                    disabled={consultationsPage <= 1}
                    onClick={() => setConsultationsPage((p) => Math.max(1, p - 1))}
                    className="px-3 py-1.5 border border-[#E8DED4] rounded-lg disabled:opacity-40 hover:bg-slate-50"
                  >
                    Previous
                  </button>
                  <span>Page {consultationsPage} of {consultationsTotalPages}</span>
                  <button
                    disabled={consultationsPage >= consultationsTotalPages}
                    onClick={() => setConsultationsPage((p) => Math.min(consultationsTotalPages, p + 1))}
                    className="px-3 py-1.5 border border-[#E8DED4] rounded-lg disabled:opacity-40 hover:bg-slate-50"
                  >
                    Next
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* SECTION 7: SCHEDULE & AVAILABILITY */}
        {activeSection === 'schedule' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <p className="text-xs font-black uppercase tracking-wider text-[#0D9488]">Appointment Availability</p>
                <h1 className="text-2xl font-black text-[#1A1F36]">Manage Availability & Schedule</h1>
                <p className="text-xs text-slate-500 font-semibold mt-0.5">Define your available hours and consultation slots for patients</p>
              </div>
              <button
                onClick={() => setActiveSection('consultations')}
                className="px-4 py-2 rounded-full border border-[#E8DED4] text-xs font-bold text-[#1A1F36] hover:bg-white flex items-center gap-2 self-start"
              >
                <Video className="w-4 h-4 text-[#0D9488]" />
                <span>View Consultations</span>
              </button>
            </div>

            {/* Scheduler Component */}
            <ProviderAvailabilityScheduler
              providerLabel="dietitian"
              onGenerate={handleGenerateAvailability}
              isSaving={savingAvailability}
            />

            {/* Slots Overview: Available Slots vs Booked Slots */}
            <div className="grid gap-6 xl:grid-cols-2">
              {/* Available Slots */}
              <div className="rounded-2xl border border-[#E8DED4] bg-white p-6 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-base font-black text-[#1A1F36] flex items-center gap-2">
                    <CalendarDays className="w-4 h-4 text-[#0D9488]" />
                    Upcoming Available Slots
                  </h3>
                  <div className="flex items-center gap-2.5">
                    <button
                      onClick={() => setShowQuickSlotModal(true)}
                      className="px-3.5 py-1.5 rounded-lg bg-[#0D9488] hover:bg-[#0F766E] text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>+ New Slot</span>
                    </button>
                    <span className="text-xs font-bold text-slate-400">
                      {availability.filter(s => new Date(`${s.available_date}T${s.start_time}`).getTime() > Date.now()).length} Slots
                    </span>
                  </div>
                </div>
                {(() => {
                  const now = Date.now()
                  const futureSlots = availability.filter(
                    (slot) => new Date(`${slot.available_date}T${slot.start_time}`).getTime() > now
                  )
                  const bookedKeys = new Set(
                    dietitianConsultations
                      .filter((c) => ['scheduled', 'calling', 'attended'].includes(String(c.status || '').toLowerCase()))
                      .map((c) => `${c.booking_date}-${formatTimeKey(c.booking_time)}`)
                  )
                  const unbookedSlots = futureSlots.filter(
                    (slot) => !bookedKeys.has(`${slot.available_date}-${formatTimeKey(slot.start_time)}`)
                  )

                  return unbookedSlots.length > 0 ? (
                    <div className="space-y-2.5 max-h-[500px] overflow-y-auto pr-1">
                      {unbookedSlots.slice(0, 50).map((slot) => (
                        <div key={slot.id} className="flex items-center justify-between gap-3 p-3.5 rounded-xl bg-[#FAF8F5] border border-[#E8DED4]">
                          <div>
                            <p className="font-bold text-xs text-[#1A1F36]">{formatDate(slot.available_date)}</p>
                            <p className="text-[11px] font-semibold text-slate-500 mt-0.5">
                              {formatTime(slot.start_time)} – {formatTime(slot.end_time)} <span className="text-slate-400">• {slot.source || 'GENERATED'}</span>
                            </p>
                          </div>
                          <button
                            onClick={() => handleDeleteAvailability(slot.id)}
                            className="p-2 rounded-lg text-[#B94D4D] hover:bg-[#FEE2E2] transition-colors"
                            title="Cancel slot"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-8 text-center bg-[#FAF8F5] rounded-xl text-slate-400 text-xs font-bold">
                      No upcoming availability slots. Use the scheduler above to generate slots.
                    </div>
                  )
                })()}
              </div>

              {/* Booked Slots */}
              <div className="rounded-2xl border border-[#E8DED4] bg-white p-6 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-base font-black text-[#1A1F36] flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-[#0D9488]" />
                    Booked Patient Sessions
                  </h3>
                  <span className="text-xs font-bold text-slate-400">
                    {dietitianConsultations.filter(c => ['scheduled', 'calling', 'attended'].includes(String(c.status || '').toLowerCase())).length} Booked
                  </span>
                </div>
                {(() => {
                  const booked = dietitianConsultations.filter(c => ['scheduled', 'calling', 'attended'].includes(String(c.status || '').toLowerCase()))
                  return booked.length > 0 ? (
                    <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
                      {booked.map((item) => {
                        const canJoinNow = isSessionJoinable(item)
                        const meetingLink = item.meetingUrl || `/video/room?id=${item.id}`
                        const patientInitials = (item.patientName || 'Patient')
                          .trim()
                          .split(' ')
                          .filter(Boolean)
                          .map((n: string) => n[0])
                          .slice(0, 2)
                          .join('')
                          .toUpperCase() || 'PT'
                        const isAttended = String(item.status || '').toLowerCase() === 'attended'

                        return (
                          <div
                            key={item.id}
                            className={`p-4 sm:p-5 rounded-2xl border transition-all ${
                              canJoinNow
                                ? 'bg-gradient-to-r from-emerald-50 via-teal-50/80 to-emerald-50 border-2 border-emerald-500 shadow-md ring-2 ring-emerald-500/20'
                                : isAttended
                                ? 'bg-amber-50/60 border-amber-200'
                                : 'bg-[#FAF8F5] border-[#E8DED4]'
                            } flex flex-col sm:flex-row sm:items-center justify-between gap-4`}
                          >
                            <div className="flex items-center gap-3.5">
                              <div className="relative shrink-0">
                                <div className={`w-12 h-12 rounded-2xl font-black text-sm flex items-center justify-center shadow-xs ${
                                  canJoinNow ? 'bg-emerald-600 text-white' : 'bg-teal-50 text-[#0D9488] border border-teal-200/50'
                                }`}>
                                  {patientInitials}
                                </div>
                                {canJoinNow && (
                                  <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                                    <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-emerald-500 border-2 border-white" />
                                  </span>
                                )}
                              </div>
                              <div>
                                {canJoinNow ? (
                                  <div className="flex items-center gap-2 mb-1">
                                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-200 text-emerald-950 border border-emerald-300 animate-pulse flex items-center gap-1">
                                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-ping" />
                                      Live Now · Ready to Join
                                    </span>
                                    <span className="text-[11px] font-bold text-emerald-700">Patient in Room</span>
                                  </div>
                                ) : (
                                  <div className="flex items-center gap-1.5 mb-0.5">
                                    <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded bg-slate-100 text-slate-600">
                                      {item.status || 'Scheduled'}
                                    </span>
                                  </div>
                                )}
                                <p className="font-black text-base text-[#1A1F36]">{item.patientName}</p>
                                <p className="text-xs font-semibold text-slate-600 mt-0.5 flex items-center gap-1.5">
                                  <Clock className="w-3.5 h-3.5 text-slate-400" />
                                  <span>{formatDate(item.booking_date || null)} at {formatTime(item.booking_time)}</span>
                                </p>
                              </div>
                            </div>

                            <div className="flex items-center gap-2 self-end sm:self-auto shrink-0 w-full sm:w-auto">
                              {canJoinNow ? (
                                <a
                                  href={meetingLink}
                                  target="_blank"
                                  rel="opener"
                                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 px-6 py-3.5 rounded-2xl bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 hover:from-emerald-700 hover:to-teal-700 text-white text-xs font-black shadow-lg shadow-emerald-700/30 transition-all hover:scale-105 active:scale-95 cursor-pointer uppercase tracking-wider animate-bounce"
                                >
                                  <Video className="w-4 h-4 text-white" />
                                  <span>JOIN VIDEO CALL NOW</span>
                                </a>
                              ) : isAttended ? (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setProtocolBuilderPatient({ id: item.patient_id || '', name: item.patientName || 'Patient' })
                                    setProtocolBuilderConsultation(item)
                                    setShowProtocolBuilder(true)
                                  }}
                                  className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#0D9488] hover:bg-[#0F766E] text-white text-xs font-bold shadow-xs cursor-pointer"
                                >
                                  <Sparkles className="w-3.5 h-3.5 text-emerald-200" />
                                  <span>Deliver Plan</span>
                                </button>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-sky-50 text-sky-800 border border-sky-200 text-xs font-bold">
                                  <Clock className="w-3.5 h-3.5 text-sky-600" />
                                  <span>Opens 15m prior</span>
                                </span>
                              )}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  ) : (
                    <div className="p-8 text-center bg-[#FAF8F5] rounded-xl text-slate-400 text-xs font-bold">
                      No booked consultations yet. Bookings will appear here when patients schedule a slot.
                    </div>
                  )
                })()}
              </div>
            </div>
          </div>
        )}

        {/* SECTION 7: WALLET & PAYOUTS (Exact preservation) */}
        {activeSection === 'wallet' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <p className="text-xs font-black uppercase tracking-wider text-[#0D9488]">Financial Settlements</p>
                <h1 className="text-2xl md:text-3xl font-black text-[#1A1F36]">Provider Earnings Wallet</h1>
              </div>
              <div className="flex items-center gap-3">
                <Link
                  href="/provider/banking"
                  className="rounded-full border border-[#E8DED4] bg-white hover:bg-slate-50 text-[#1A1F36] px-5 py-2.5 text-xs font-bold transition-colors flex items-center gap-2 shadow-sm"
                >
                  <Settings className="w-4 h-4 text-[#0D9488]" />
                  <span>Payout Settings</span>
                </Link>
                <button
                  onClick={() => {
                    setPayoutError('')
                    setPayoutAmount('')
                    setShowPayoutModal(true)
                  }}
                  className="rounded-full bg-[#0D9488] hover:bg-[#0F766E] text-white px-6 py-2.5 text-xs font-bold transition-colors shadow-sm"
                >
                  Request Payout
                </button>
              </div>
            </div>

            {/* Wallet Stat Cards */}
            <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
              <div className="rounded-2xl border border-[#E8DED4] bg-white p-5 shadow-sm">
                <p className="text-[10px] font-black uppercase tracking-wider text-slate-500">Wallet Balance</p>
                <p className="mt-2 text-2xl font-black text-[#1A1F36]">{formatInr(walletState.balance || 0)}</p>
              </div>
              <div className="rounded-2xl border border-[#E8DED4] bg-white p-5 shadow-sm">
                <p className="text-[10px] font-black uppercase tracking-wider text-slate-500">Pending Payout</p>
                <p className="mt-2 text-2xl font-black text-[#C4622D]">{formatInr(walletState.pending_payout || 0)}</p>
              </div>
              <div className="rounded-2xl border border-[#E8DED4] bg-white p-5 shadow-sm">
                <p className="text-[10px] font-black uppercase tracking-wider text-slate-500">Completed Payout</p>
                <p className="mt-2 text-2xl font-black text-[#0D9488]">{formatInr(walletState.completed_payout || 0)}</p>
              </div>
              <div className="rounded-2xl border border-[#E8DED4] bg-white p-5 shadow-sm">
                <p className="text-[10px] font-black uppercase tracking-wider text-slate-500">Lifetime Earnings</p>
                <p className="mt-2 text-2xl font-black text-[#1A1F36]">{formatInr(walletState.lifetime_earnings || 0)}</p>
              </div>
            </div>

            {/* Ledger Transactions */}
            <div className="rounded-2xl border border-[#E8DED4] bg-white p-6 shadow-sm">
              <h3 className="text-base font-black text-[#1A1F36] mb-4">Transaction History</h3>
              {walletTransactions.length > 0 ? (
                <div className="space-y-3">
                  {walletTransactions.map((tx) => (
                    <div key={tx.id} className="p-3.5 rounded-xl bg-[#FAF8F5] border border-[#E8DED4] flex items-center justify-between">
                      <div>
                        <p className="font-bold text-xs text-[#1A1F36]">{tx.description || tx.transaction_type}</p>
                        <p className="text-[10px] text-slate-400">{new Date(tx.created_at).toLocaleDateString()}</p>
                      </div>
                      <div className="text-right">
                        <p className={`font-bold text-xs ${tx.amount < 0 ? 'text-[#B94D4D]' : 'text-[#0D9488]'}`}>
                          {tx.amount < 0 ? '-' : '+'}{formatInr(Math.abs(tx.amount))}
                        </p>
                        <span className="text-[9px] font-black uppercase text-slate-400">{tx.status}</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-400 py-6 text-center">Earnings appear after completed attended sessions.</p>
              )}
            </div>

            {/* Payout Request Modal */}
            {showPayoutModal && (
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl border border-[#E8DED4]">
                  <h3 className="text-lg font-black text-[#1A1F36] mb-2">Request Payout</h3>
                  <p className="text-xs text-slate-500 mb-4">Transfer available funds to your configured bank account.</p>

                  <form onSubmit={handleRequestPayout} className="space-y-4">
                    <div>
                      <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">Available Balance</label>
                      <p className="text-xl font-black text-[#1A1F36]">{formatInr(walletState.balance || 0)}</p>
                    </div>

                    <div>
                      <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">Payout Amount (₹)</label>
                      <input
                        type="number"
                        required
                        value={payoutAmount}
                        onChange={(e) => setPayoutAmount(e.target.value)}
                        placeholder="Enter amount"
                        className="w-full px-3 py-2 border border-[#E8DED4] rounded-xl text-xs font-bold"
                      />
                    </div>

                    {payoutError && (
                      <p className="text-xs font-bold text-[#B94D4D] bg-[#FEE2E2] p-2.5 rounded-lg">{payoutError}</p>
                    )}

                    <div className="flex justify-end gap-3 pt-2">
                      <button
                        type="button"
                        onClick={() => setShowPayoutModal(false)}
                        className="px-4 py-2 rounded-full border border-[#E8DED4] text-xs font-bold"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={payoutRequesting}
                        className="px-5 py-2 rounded-full bg-[#0D9488] text-white text-xs font-bold hover:bg-[#0F766E]"
                      >
                        {payoutRequesting ? 'Processing...' : 'Confirm Payout'}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}
          </div>
        )}

        {/* SECTION 8: PROFILE & CREDENTIALS */}
        {activeSection === 'profile' && (
          <div className="space-y-6">
            <div>
              <h1 className="text-2xl font-black text-[#1A1F36]">Profile & Clinical Credentials</h1>
              <p className="text-xs text-slate-500 font-semibold">Manage professional registration, degrees, and provider biography</p>
            </div>
            <div className="rounded-2xl border border-[#E8DED4] bg-white p-6 shadow-sm">
              <ProviderProfileEditor provider={providerUser} copy={{ label: 'Dietitian', accent: '#0D9488' }} onProfileUpdated={() => loadData()} />
            </div>

          </div>
        )}
        {/* Quick Slot Modal */}
        {showQuickSlotModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
            <div className="w-full max-w-md bg-white rounded-3xl p-6 shadow-2xl border border-slate-100 space-y-5 animate-in fade-in zoom-in-95">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <CalendarDays className="w-5 h-5 text-[#0D9488]" />
                  <h3 className="text-lg font-black text-[#1A1F36]">Add Availability Slot</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setShowQuickSlotModal(false)}
                  className="p-1 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer"
                >
                  <XCircle className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleCreateQuickSlot} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Date</label>
                  <input
                    type="date"
                    required
                    min={new Date().toISOString().split('T')[0]}
                    value={quickSlotDate}
                    onChange={(e) => setQuickSlotDate(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold focus:border-[#0D9488] outline-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Start Time</label>
                    <input
                      type="time"
                      required
                      value={quickSlotTime}
                      onChange={(e) => setQuickSlotTime(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold focus:border-[#0D9488] outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Duration</label>
                    <select
                      value={quickSlotDuration}
                      onChange={(e) => setQuickSlotDuration(Number(e.target.value))}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold focus:border-[#0D9488] outline-none"
                    >
                      <option value={15}>15 minutes</option>
                      <option value={30}>30 minutes</option>
                      <option value={45}>45 minutes</option>
                      <option value={60}>60 minutes</option>
                    </select>
                  </div>
                </div>

                <div className="flex gap-2.5 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowQuickSlotModal(false)}
                    className="flex-1 py-2.5 px-4 rounded-xl border border-slate-200 text-slate-600 text-xs font-bold hover:bg-slate-50 transition cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={savingQuickSlot}
                    className="flex-1 py-2.5 px-4 rounded-xl bg-[#0D9488] hover:bg-[#0F766E] text-white text-xs font-bold shadow-md shadow-emerald-900/20 transition disabled:opacity-50 cursor-pointer"
                  >
                    {savingQuickSlot ? 'Publishing...' : 'Publish Slot'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Confirm Destructive Consultation Action Modal (Missed / Cancel) */}
        {confirmModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
            <div className="w-full max-w-md bg-white rounded-3xl p-6 shadow-2xl border border-slate-100 space-y-4 animate-in fade-in zoom-in-95">
              <div className="flex items-center gap-3">
                <div
                  className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 ${
                    confirmModal.type === 'missed' ? 'bg-amber-100 text-amber-700' : 'bg-rose-100 text-rose-700'
                  }`}
                >
                  {confirmModal.type === 'missed' ? (
                    <AlertTriangle className="w-6 h-6" />
                  ) : (
                    <XCircle className="w-6 h-6" />
                  )}
                </div>
                <div>
                  <h3 className="text-base font-black text-[#1A1F36]">
                    {confirmModal.type === 'missed' ? 'Mark Consultation as Missed?' : 'Cancel Consultation?'}
                  </h3>
                  <p className="text-xs text-slate-500 font-semibold mt-0.5">
                    Patient: <span className="text-slate-900 font-bold">{confirmModal.patientName}</span>
                  </p>
                </div>
              </div>

              <p className="text-xs text-slate-600 leading-relaxed">
                {confirmModal.type === 'missed'
                  ? 'Are you sure the patient did not attend this scheduled session? This consultation will be closed and recorded as missed by patient.'
                  : 'Are you sure you want to cancel this scheduled consultation? The patient appointment status will be updated to cancelled.'}
              </p>

              <div className="flex gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setConfirmModal(null)}
                  className="flex-1 py-2.5 px-4 rounded-xl border border-slate-200 text-slate-600 text-xs font-bold hover:bg-slate-50 transition cursor-pointer"
                >
                  Keep Session
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    const { sessionId, type } = confirmModal
                    setConfirmModal(null)
                    await handleUpdateConsultation(sessionId, type)
                  }}
                  className={`flex-1 py-2.5 px-4 rounded-xl text-white text-xs font-bold shadow-md transition cursor-pointer ${
                    confirmModal.type === 'missed'
                      ? 'bg-[#C4622D] hover:bg-[#A34E20]'
                      : 'bg-rose-600 hover:bg-rose-700'
                  }`}
                >
                  {confirmModal.type === 'missed' ? 'Confirm Missed' : 'Confirm Cancel'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Upload or Assign Nutrition Plan Modal */}
        {showUploadPlanModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
            <div className="w-full max-w-lg bg-white rounded-3xl p-6 shadow-2xl border border-slate-100 space-y-5 animate-in fade-in zoom-in-95 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <div className="w-9 h-9 rounded-xl bg-teal-50 text-[#0D9488] flex items-center justify-center">
                    <Upload className="w-5 h-5 text-[#0D9488]" />
                  </div>
                  <div>
                    <h3 className="text-base font-black text-[#1A1F36]">Assign Patient Nutrition Plan</h3>
                    <p className="text-[11px] text-slate-500 font-medium">Finalizes consultation &amp; releases consultation payout</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowUploadPlanModal(false)}
                  className="p-1 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer"
                >
                  <XCircle className="w-5 h-5" />
                </button>
              </div>

              {/* Preferred Option: Official 8Liv Letterhead Studio */}
              <div className="p-3.5 rounded-2xl bg-gradient-to-r from-teal-50 to-emerald-50 border border-teal-200 flex items-center justify-between gap-3 shadow-xs">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-[#0D9488] text-white flex items-center justify-center shrink-0">
                    <Sparkles className="w-4 h-4 text-emerald-200" />
                  </div>
                  <div>
                    <p className="text-xs font-black text-[#1A1F36]">Author Official 8Liv Letterhead</p>
                    <p className="text-[11px] text-slate-500 font-medium">Type or copy-paste clinical diet with 8Liv header, logo &amp; signature.</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setShowUploadPlanModal(false)
                    const pat = allPatientOptions.find((p) => p.id === uploadPlanPatientId)
                    setProtocolBuilderPatient(pat || null)
                    setProtocolBuilderConsultation(uploadPlanAppointmentId ? { id: uploadPlanAppointmentId } : null)
                    setShowProtocolBuilder(true)
                  }}
                  className="shrink-0 px-3 py-1.5 rounded-xl bg-[#0D9488] hover:bg-[#0F766E] text-white text-xs font-bold shadow-xs cursor-pointer flex items-center gap-1"
                >
                  <span>Open Letterhead</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Mode Switcher Tabs */}
              <div className="flex p-1 bg-slate-100 rounded-2xl gap-1">
                <button
                  type="button"
                  onClick={() => setPlanAssignMode('upload')}
                  className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                    planAssignMode === 'upload'
                      ? 'bg-white text-[#0D9488] shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>Upload File (PDF/Image)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPlanAssignMode('template')}
                  className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                    planAssignMode === 'template'
                      ? 'bg-white text-[#0D9488] shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Layers className="w-3.5 h-3.5" />
                  <span>From Saved Templates</span>
                </button>
              </div>

              <form onSubmit={handleUploadNutritionPlan} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Select Patient *</label>
                  <select
                    required
                    value={uploadPlanPatientId}
                    onChange={(e) => setUploadPlanPatientId(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold focus:border-[#0D9488] outline-none"
                  >
                    <option value="">-- Choose patient --</option>
                    {allPatientOptions.map((pat) => (
                      <option key={pat.id} value={pat.id}>{pat.name}</option>
                    ))}
                  </select>
                </div>

                {planAssignMode === 'template' && (
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Select Nutrition Template *</label>
                    <select
                      value={selectedTemplateId}
                      onChange={(e) => {
                        const tmplId = e.target.value
                        setSelectedTemplateId(tmplId)
                        const tmpl = templates.find((t) => t.id === tmplId)
                        if (tmpl) {
                          setUploadPlanTitle(tmpl.name)
                          if (tmpl.target_calories) setUploadPlanCalories(String(tmpl.target_calories))
                          if (tmpl.water_target_liters) setUploadPlanWater(String(tmpl.water_target_liters))
                          if (tmpl.description || tmpl.instructions) {
                            setUploadPlanNotes(tmpl.description || tmpl.instructions || '')
                          }
                        }
                      }}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold focus:border-[#0D9488] outline-none"
                    >
                      <option value="">-- Choose from your template library ({templates.length} available) --</option>
                      {templates.map((tmpl) => (
                        <option key={tmpl.id} value={tmpl.id}>
                          {tmpl.name} ({tmpl.category} · {tmpl.target_calories || 1600} kcal)
                        </option>
                      ))}
                    </select>
                    {templates.length === 0 && (
                      <p className="text-[11px] text-amber-600 mt-1 font-medium">
                        No saved templates found. You can switch to "Upload File" or create templates in the Plans tab.
                      </p>
                    )}
                  </div>
                )}

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Plan Title *</label>
                  <input
                    type="text"
                    required
                    value={uploadPlanTitle}
                    onChange={(e) => setUploadPlanTitle(e.target.value)}
                    placeholder="e.g. Personalized Indian Nutrition & Calorie Chart"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold focus:border-[#0D9488] outline-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Daily Calories (kcal)</label>
                    <input
                      type="number"
                      value={uploadPlanCalories}
                      onChange={(e) => setUploadPlanCalories(e.target.value)}
                      placeholder="1600"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold focus:border-[#0D9488] outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Hydration Goal (Liters)</label>
                    <input
                      type="number"
                      step="0.5"
                      value={uploadPlanWater}
                      onChange={(e) => setUploadPlanWater(e.target.value)}
                      placeholder="2.5"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold focus:border-[#0D9488] outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Clinical Notes / Instructions</label>
                  <textarea
                    rows={3}
                    value={uploadPlanNotes}
                    onChange={(e) => setUploadPlanNotes(e.target.value)}
                    placeholder="Follow the attached meal schedule, maintain daily hydration, avoid refined sugars..."
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold focus:border-[#0D9488] outline-none"
                  />
                </div>

                {planAssignMode === 'upload' && (
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Plan Document / Chart (PDF, Image, Excel) *</label>
                    <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50/50 hover:bg-slate-50 transition">
                      <div className="space-y-2 text-center">
                        <Upload className="mx-auto h-8 w-8 text-slate-400" />
                        <div className="flex text-xs text-slate-600 justify-center">
                          <label
                            htmlFor="plan-upload-input"
                            className="relative cursor-pointer rounded-md font-bold text-[#0D9488] hover:text-[#0F766E] focus-within:outline-none"
                          >
                            <span>Choose file</span>
                            <input
                              id="plan-upload-input"
                              type="file"
                              required={planAssignMode === 'upload'}
                              accept=".pdf,.png,.jpg,.jpeg,.webp,.xlsx,.xls"
                              onChange={(e) => setUploadPlanFile(e.target.files?.[0] || null)}
                              className="sr-only"
                            />
                          </label>
                          <p className="pl-1 font-medium">or drag and drop</p>
                        </div>
                        <p className="text-[11px] text-slate-400">PDF, JPG, PNG, WEBP, XLSX up to 10MB</p>
                        {uploadPlanFile && (
                          <p className="text-xs font-bold text-[#0D9488] mt-2 bg-emerald-50 py-1 px-2.5 rounded-lg inline-block">
                            ✓ {uploadPlanFile.name} ({(uploadPlanFile.size / (1024 * 1024)).toFixed(2)} MB)
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                <div className="flex gap-2.5 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowUploadPlanModal(false)}
                    className="flex-1 py-2.5 px-4 rounded-xl border border-slate-200 text-slate-600 text-xs font-bold hover:bg-slate-50 transition cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={uploadingPlan}
                    className="flex-1 py-2.5 px-4 rounded-xl bg-[#0D9488] hover:bg-[#0F766E] text-white text-xs font-bold shadow-md shadow-emerald-900/20 transition disabled:opacity-50 cursor-pointer"
                  >
                    {uploadingPlan
                      ? 'Assigning Plan...'
                      : planAssignMode === 'upload'
                      ? 'Upload & Complete Session'
                      : 'Assign Template & Complete'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
        {/* Official Protocol Builder Studio Modal */}
        <ProviderProtocolBuilderModal
          isOpen={showProtocolBuilder}
          onClose={() => {
            setShowProtocolBuilder(false)
            setProtocolBuilderPatient(null)
            setProtocolBuilderConsultation(null)
          }}
          onSuccess={() => {
            setShowProtocolBuilder(false)
            setProtocolBuilderPatient(null)
            setProtocolBuilderConsultation(null)
            loadData()
          }}
          providerRole="dietitian"
          patient={protocolBuilderPatient}
          consultation={protocolBuilderConsultation}
          patientsList={allPatientOptions}
          providerProfile={providerUser}
        />

        {/* Official Protocol Letterhead Viewer Modal */}
        <OfficialProtocolModal
          isOpen={Boolean(viewingOfficialProtocol)}
          onClose={() => setViewingOfficialProtocol(null)}
          protocol={viewingOfficialProtocol}
          role="dietitian"
          specialistProfile={providerUser}
        />
      </main>
    </div>
  )
}

export default function DietitianPortal(props: { defaultSection?: SectionKey }) {
  return (
    <React.Suspense
      fallback={
        <div className="min-h-screen bg-[#FAF8F5] flex flex-col items-center justify-center p-6">
          <div className="w-12 h-12 border-4 border-[#0D9488] border-t-transparent rounded-full animate-spin mb-4" />
          <p className="text-sm font-bold text-[#1A1F36]">Loading 8LIV Clinical Nutrition Portal...</p>
        </div>
      }
    >
      <DietitianPortalInner {...props} />
    </React.Suspense>
  )
}

