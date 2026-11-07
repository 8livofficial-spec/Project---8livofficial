'use client'

import React, { useState, useMemo, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { 
  Scale, Calendar, Video, ArrowRight,
  Pill, MessageSquare, ChevronRight, BarChart3, Plus, X,
  ShieldCheck, Stethoscope, Clock, Check, Sparkles, FileText,
  UserCheck, Activity, HeartPulse, ExternalLink, Download, Share2,
  Trash2, Edit3, Eye, PhoneCall, HelpCircle, AlertCircle, CheckCircle2,
  Salad, Dumbbell, UploadCloud, File, Image as ImageIcon
} from 'lucide-react'
import { usePatientData, PatientUploadRecord } from '@/hooks/usePatientData'
import { authedFetch } from '@/lib/apiClient'
import DashboardOverviewSkeleton from '@/components/patient/DashboardOverviewSkeleton'

export default function PatientDashboardHome() {
  const { 
    user,
    profile, 
    assessment, 
    weightLogs = [], 
    consultation, 
    consultations = [],
    careTeam,
    dietPlan,
    fitnessPlan,
    activePrescription,
    consultationQuota,
    patientUploads: initialUploads = [],
    onboardingState,
    flowStep,
    loading,
    error,
    reloadData,
  } = usePatientData()

  const router = useRouter()

  useEffect(() => {
    if (loading) return
    if (flowStep === 'needs_plan' || (onboardingState.membershipStatus === 'NOT_SELECTED' && !onboardingState.dashboardAccess)) {
      router.replace('/patient/onboarding/plan')
    } else if (flowStep === 'needs_payment' || onboardingState.membershipStatus === 'SELECTED') {
      router.replace('/patient/onboarding/payment')
    }
  }, [loading, flowStep, onboardingState, router])

  // Weight Modals
  const [showWeightModal, setShowWeightModal] = useState(false)
  const [showProgressModal, setShowProgressModal] = useState(false)
  const [newWeight, setNewWeight] = useState('')
  const [logLoading, setLogLoading] = useState(false)
  const [logError, setLogError] = useState('')

  // Uploaded Records State & Modals
  const [records, setRecords] = useState<PatientUploadRecord[]>(initialUploads)
  const [showUploadModal, setShowUploadModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showPreviewModal, setShowPreviewModal] = useState(false)
  const [selectedRecord, setSelectedRecord] = useState<PatientUploadRecord | null>(null)

  // Upload Form State
  const [uploadFile, setUploadFile] = useState<File | null>(null)
  const [uploadCategory, setUploadCategory] = useState('blood_test')
  const [uploadTitle, setUploadTitle] = useState('')
  const [uploadTestDate, setUploadTestDate] = useState('')
  const [isUploading, setIsUploading] = useState(false)
  const [uploadError, setUploadError] = useState('')

  // Edit Form State
  const [editTitle, setEditTitle] = useState('')
  const [editCategory, setEditCategory] = useState('blood_test')
  const [editTestDate, setEditTestDate] = useState('')
  const [isSavingEdit, setIsSavingEdit] = useState(false)
  const [editError, setEditError] = useState('')

  // Support Ticket Modal
  const [showTicketModal, setShowTicketModal] = useState(false)
  const [ticketSubject, setTicketSubject] = useState('')
  const [ticketCategory, setTicketCategory] = useState('medical')
  const [ticketMessage, setTicketMessage] = useState('')
  const [isSubmittingTicket, setIsSubmittingTicket] = useState(false)
  const [ticketSuccess, setTicketSuccess] = useState(false)
  const [ticketError, setTicketError] = useState('')

  // Sync initial uploads
  useEffect(() => {
    if (initialUploads && initialUploads.length > 0) {
      setRecords(initialUploads)
    }
  }, [initialUploads])

  // Fetch uploads on mount or refresh
  const fetchRecords = async () => {
    try {
      const res = await authedFetch('/api/patient/uploads')
      if (res.ok) {
        const json = await res.json()
        if (json.records) setRecords(json.records)
      }
    } catch (e) {
      console.warn('Failed to fetch patient uploads:', e)
    }
  }

  // Patient clean display name
  const patientName = useMemo(() => {
    const raw =
      profile?.first_name ||
      assessment?.first_name ||
      user?.user_metadata?.first_name ||
      user?.user_metadata?.full_name?.split(' ')?.[0] ||
      ''
    if (raw && raw !== 'Patient' && raw !== 'JK') return raw
    if (user?.email) {
      const emailPrefix = user.email.split('@')[0]
      return emailPrefix.charAt(0).toUpperCase() + emailPrefix.slice(1)
    }
    return 'Patient Member'
  }, [profile, assessment, user])

  // Membership & Plan Duration Calculations
  const durationMonths = useMemo(() => {
    // 1. Authoritative duration from active subscription / quota summary
    if (typeof (consultationQuota as any)?.durationMonths === 'number' && (consultationQuota as any).durationMonths > 0) {
      return (consultationQuota as any).durationMonths
    }
    if (consultationQuota?.doctor?.planName) {
      const match = String(consultationQuota.doctor.planName).match(/(\d+)/)
      if (match) return parseInt(match[1], 10)
    }
    // 2. Parse from assessment?.membership_tier (e.g. "1 Month Treatment Program" -> 1)
    const raw = assessment?.membership_tier
    if (raw) {
      const match = String(raw).match(/(\d+)/)
      if (match) {
        const n = parseInt(match[1], 10)
        if (n > 0) return n
      }
    }
    // 3. Fallback to 1 (starter duration)
    return 1
  }, [assessment?.membership_tier, consultationQuota])

  const membershipLabel = `${durationMonths} Month Treatment Program`

  const expiresAt = useMemo(() => {
    if (onboardingState.membershipExpiresAt) {
      return onboardingState.membershipExpiresAt
    }
    if (assessment?.created_at) {
      const start = new Date(assessment.created_at).getTime()
      return new Date(start + durationMonths * 30 * 86400000).toISOString()
    }
    return null
  }, [onboardingState.membershipExpiresAt, assessment?.created_at, durationMonths])

  const daysRemaining = useMemo(() => {
    if (!expiresAt) return durationMonths * 30
    const diff = new Date(expiresAt).getTime() - Date.now()
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)))
  }, [expiresAt, durationMonths])

  const planProgressPercent = useMemo(() => {
    const totalDays = durationMonths * 30
    const elapsed = totalDays - daysRemaining
    return Math.min(100, Math.max(5, Math.round((elapsed / totalDays) * 100)))
  }, [durationMonths, daysRemaining])

  // Dynamic Metrics
  const startWeight = assessment?.weight_kg ? Number(assessment.weight_kg) : 84.0
  const goalWeight = assessment?.goal_weight_kg ? Number(assessment.goal_weight_kg) : 68.0

  const currentWeight = useMemo(() => {
    if (weightLogs && weightLogs.length > 0) {
      const latest = weightLogs[weightLogs.length - 1]
      if (latest?.weight_kg) return Number(latest.weight_kg)
    }
    return startWeight
  }, [weightLogs, startWeight])

  // Consultation Quotas
  const quotas = useMemo(() => {
    const docMax = consultationQuota?.doctor?.maxAllowed ?? durationMonths
    const docUsed = consultationQuota?.doctor?.usedCount ?? 0
    const docRemaining = consultationQuota?.doctor?.remaining ?? Math.max(0, docMax - docUsed)

    const dietMax = consultationQuota?.dietitian?.maxAllowed ?? durationMonths
    const dietUsed = consultationQuota?.dietitian?.usedCount ?? 0
    const dietRemaining = consultationQuota?.dietitian?.remaining ?? Math.max(0, dietMax - dietUsed)

    const fitMax = consultationQuota?.fitness_coach?.maxAllowed ?? durationMonths
    const fitUsed = consultationQuota?.fitness_coach?.usedCount ?? 0
    const fitRemaining = consultationQuota?.fitness_coach?.remaining ?? Math.max(0, fitMax - fitUsed)

    return {
      doctor: {
        used: docUsed,
        max: docMax,
        remaining: docRemaining,
      },
      dietitian: {
        used: dietUsed,
        max: dietMax,
        remaining: dietRemaining,
      },
      fitness_coach: {
        used: fitUsed,
        max: fitMax,
        remaining: fitRemaining,
      },
    }
  }, [consultationQuota, durationMonths])

  // Next Upcoming Appointment (if any)
  const upcomingAppointment = useMemo(() => {
    const activeCons = consultations.find(c => ['scheduled', 'calling'].includes((c.status || '').toLowerCase()))
    if (activeCons) {
      const dt = activeCons.booking_date ? new Date(activeCons.booking_date) : null
      const month = dt ? dt.toLocaleString('en-US', { month: 'short' }) : 'Nov'
      const day = dt ? dt.getDate() : '03'
      const doctor = activeCons.doctor_profiles?.full_name || careTeam?.doctor_name || 'Dr. Assigned'

      return {
        id: activeCons.id,
        hasAppointment: true,
        month,
        day,
        title: 'Physician Video Check-in',
        doctor,
        time: activeCons.booking_time || '10:00 AM',
        status: activeCons.status || 'scheduled',
      }
    }
    return null
  }, [consultations, careTeam])

  // WhatsApp Share Helper
  const handleWhatsAppShare = (title: string, details: string, url?: string | null) => {
    const shareText = `*8Liv Clinical Care Record*\n\n📋 *${title}*\n${details}${url ? `\n\n🔗 Document Link:\n${url}` : ''}\n\nShared securely via 8Liv Concierge Care.`
    window.open(`https://wa.me/?text=${encodeURIComponent(shareText)}`, '_blank')
  }

  // Weight Log Handler
  const handleLogWeightSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const weightNum = parseFloat(newWeight)
    if (Number.isNaN(weightNum) || weightNum < 30 || weightNum > 300) {
      setLogError('Please enter a realistic weight between 30 kg and 300 kg.')
      return
    }

    setLogLoading(true)
    setLogError('')
    try {
      const res = await authedFetch('/api/patient/progress-logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ weight_kg: weightNum }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || 'Failed to record weight log.')
      }

      setNewWeight('')
      setShowWeightModal(false)
      reloadData({ force: true })
    } catch (err: unknown) {
      setLogError(err instanceof Error ? err.message : 'Error recording weight.')
    } finally {
      setLogLoading(false)
    }
  }

  // Handle New Upload Submit
  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!uploadFile) {
      setUploadError('Please select a file to upload.')
      return
    }

    setIsUploading(true)
    setUploadError('')
    try {
      const formData = new FormData()
      formData.append('file', uploadFile)
      formData.append('reportCategory', uploadCategory)
      formData.append('title', uploadTitle || uploadFile.name)
      if (uploadTestDate) formData.append('testDate', uploadTestDate)

      const res = await authedFetch('/api/patient/uploads', {
        method: 'POST',
        body: formData,
      })

      const data = await res.json()
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to upload document.')
      }

      setUploadFile(null)
      setUploadTitle('')
      setUploadTestDate('')
      setShowUploadModal(false)
      fetchRecords()
    } catch (err: any) {
      setUploadError(err.message || 'Error uploading file.')
    } finally {
      setIsUploading(false)
    }
  }

  // Handle Record Edit Submit
  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedRecord) return

    setIsSavingEdit(true)
    setEditError('')
    try {
      const res = await authedFetch(`/api/patient/uploads/${selectedRecord.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: editTitle,
          reportCategory: editCategory,
          testDate: editTestDate || null,
        }),
      })

      const data = await res.json()
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to update record.')
      }

      setShowEditModal(false)
      setSelectedRecord(null)
      fetchRecords()
    } catch (err: any) {
      setEditError(err.message || 'Error updating record.')
    } finally {
      setIsSavingEdit(false)
    }
  }

  // Handle Delete Record
  const handleDeleteRecord = async (recordId: string) => {
    if (!confirm('Are you sure you want to remove this health document?')) return

    try {
      const res = await authedFetch(`/api/patient/uploads/${recordId}`, {
        method: 'DELETE',
      })
      if (res.ok) {
        setRecords(prev => prev.filter(r => r.id !== recordId))
      }
    } catch (err) {
      console.error('Failed to delete record:', err)
    }
  }

  // Handle Support Ticket Submit
  const handleSupportTicketSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!ticketSubject || !ticketMessage) {
      setTicketError('Please provide both a subject and message.')
      return
    }

    setIsSubmittingTicket(true)
    setTicketError('')
    try {
      const res = await authedFetch('/api/support/tickets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subject: ticketSubject,
          category: ticketCategory,
          message: ticketMessage,
          priority: 'medium',
        }),
      })

      const data = await res.json()
      if (!res.ok || !data.ticket) {
        throw new Error(data.error || 'Failed to submit ticket.')
      }

      setTicketSuccess(true)
      setTimeout(() => {
        setShowTicketModal(false)
        setTicketSuccess(false)
        setTicketSubject('')
        setTicketMessage('')
      }, 2000)
    } catch (err: any) {
      setTicketError(err.message || 'Error submitting ticket.')
    } finally {
      setIsSubmittingTicket(false)
    }
  }

  if (loading) {
    return <DashboardOverviewSkeleton />
  }

  if (error) {
    return (
      <div className="max-w-xl mx-auto my-12 p-8 bg-white rounded-3xl border border-rose-200/80 shadow-sm text-center space-y-4">
        <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto">
          <ShieldCheck className="w-6 h-6" />
        </div>
        <div>
          <h2 className="text-lg font-extrabold text-slate-900">Clinical Dashboard Synchronizing</h2>
          <p className="text-xs text-slate-500 mt-1">{error}</p>
        </div>
        <button
          onClick={() => reloadData({ force: true })}
          className="px-6 py-2.5 rounded-full bg-[#00A884] text-white text-xs font-bold hover:bg-[#009272] transition-colors cursor-pointer shadow-sm"
        >
          Retry Connection
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-6 pb-20 max-w-7xl mx-auto font-sans text-[#11241A]">
      
      {/* ========================================================================= */}
      {/* 1. HERO & MEMBERSHIP PLAN DURATION COUNTDOWN                              */}
      {/* ========================================================================= */}
      <div className="relative overflow-hidden rounded-[32px] bg-gradient-to-br from-[#061810] via-[#092218] to-[#04100B] border border-emerald-500/25 p-6 sm:p-8 text-white shadow-xl">
        <div className="absolute -top-24 -right-24 w-96 h-96 bg-[#00A884]/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-72 h-72 bg-emerald-700/15 rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-3.5 max-w-2xl">
            {/* Regimen & Duration Badges */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/15 border border-emerald-400/30 text-teal-300 text-[11px] font-bold tracking-wide">
                <span className="w-2 h-2 rounded-full bg-[#00A884] animate-pulse" />
                <span>{membershipLabel.toUpperCase()}</span>
              </span>

              <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-white/10 border border-white/20 text-white text-[11px] font-semibold">
                <Clock size={11} className="text-emerald-400" />
                <span>{daysRemaining} Days Remaining</span>
              </span>

              {expiresAt && (
                <span className="text-[11px] text-slate-400 font-medium">
                  Valid through {new Date(expiresAt).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' })}
                </span>
              )}
            </div>

            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-white tracking-tight leading-tight">
              Welcome back, {patientName}
            </h1>

            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed max-w-xl">
              Your personalized medical care program is active. Track your consultation quotas, review prescriptions and diet plans, and access concierge support below.
            </p>

            {/* Program Duration Progress Track */}
            <div className="pt-1 max-w-md">
              <div className="flex justify-between items-center text-[11px] text-slate-300 mb-1.5 font-medium">
                <span>Program Journey Timeline</span>
                <span className="font-mono text-teal-300 font-bold">{planProgressPercent}% elapsed</span>
              </div>
              <div className="w-full h-2 bg-white/15 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-[#00A884] to-teal-300 rounded-full transition-all duration-700"
                  style={{ width: `${planProgressPercent}%` }}
                />
              </div>
            </div>
          </div>

          {/* Quick Telehealth Card */}
          <div className="shrink-0 w-full lg:w-80 bg-white/10 border border-white/15 backdrop-blur-md rounded-2xl p-4 sm:p-5 flex flex-col justify-between space-y-3">
            {upcomingAppointment ? (
              <div>
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-teal-300 bg-teal-500/20 px-2 py-0.5 rounded">
                  Upcoming Call
                </span>
                <p className="text-sm font-bold text-white mt-1.5 leading-tight">
                  {upcomingAppointment.title}
                </p>
                <p className="text-xs text-slate-300 mt-1 flex items-center gap-1.5">
                  <Clock size={12} className="text-teal-300 shrink-0" />
                  <span>{upcomingAppointment.month} {upcomingAppointment.day} · {upcomingAppointment.time}</span>
                </p>
                <p className="text-[11px] text-teal-300 font-medium mt-0.5 truncate">
                  With {upcomingAppointment.doctor}
                </p>
              </div>
            ) : (
              <div>
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-emerald-300 bg-emerald-500/20 px-2 py-0.5 rounded">
                  Telehealth Ready
                </span>
                <p className="text-sm font-bold text-white mt-1.5 leading-tight">
                  Book Provider Video Consultation
                </p>
                <p className="text-xs text-slate-300 mt-1">
                  Connect with your assigned doctor, dietitian, or fitness coach anytime.
                </p>
              </div>
            )}

            <Link
              href={upcomingAppointment ? '/patient/appointments' : '/patient/consultation'}
              className="w-full min-h-[40px] px-4 rounded-xl bg-gradient-to-r from-[#00A884] to-[#0A8F70] hover:from-[#009977] hover:to-[#087F63] text-white font-bold text-xs transition-all flex items-center justify-center gap-2 shadow-md shadow-[#00A884]/25 active:scale-[0.99] cursor-pointer"
            >
              <span>{upcomingAppointment ? 'View Consultation Room' : 'Book a Consultation'}</span>
              <ArrowRight size={13} />
            </Link>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. PROVIDER CONSULTATION QUOTAS HUB (Doctor, Dietitian, Fitness Coach)     */}
      {/* ========================================================================= */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base sm:text-lg font-extrabold text-[#11241A] tracking-tight">
              Your Program Consultation Quotas
            </h2>
            <p className="text-xs text-slate-500">
              Included video meetings with your dedicated clinical specialists as per your {membershipLabel}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          
          {/* Card 1: Doctor Consultations */}
          <div className="bg-white rounded-3xl p-5 sm:p-6 border border-stone-200/90 shadow-2xs hover:shadow-md transition-all flex flex-col justify-between space-y-4">
            <div>
              <div className="flex items-center justify-between pb-3 border-b border-stone-100">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-2xl bg-teal-50 text-[#00A884] flex items-center justify-center shrink-0 border border-teal-100">
                    <Stethoscope size={20} />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-[#11241A]">Physician Care</h3>
                    <p className="text-[11px] text-slate-400">Doctor Consultations</p>
                  </div>
                </div>
                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                  quotas.doctor.remaining > 0 ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-slate-100 text-slate-500'
                }`}>
                  {quotas.doctor.remaining > 0 ? `${quotas.doctor.remaining} Left` : 'Completed'}
                </span>
              </div>

              <div className="mt-4 space-y-1">
                <div className="flex items-baseline justify-between text-xs font-semibold">
                  <span className="text-slate-600">Calls Utilized:</span>
                  <span className="font-bold text-[#11241A]">{quotas.doctor.used} of {quotas.doctor.max} calls</span>
                </div>
                <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden mt-1.5">
                  <div 
                    className="h-full bg-[#00A884] rounded-full"
                    style={{ width: `${Math.min(100, (quotas.doctor.used / Math.max(1, quotas.doctor.max)) * 100)}%` }}
                  />
                </div>
              </div>

              <p className="text-[11px] text-slate-500 mt-3 leading-relaxed">
                Review your metabolic dosage, medical health markers, and e-prescription with your physician.
              </p>
            </div>

            <Link
              href="/patient/consultation?role=doctor"
              className="w-full py-2.5 px-3 rounded-xl bg-slate-900 hover:bg-black text-white text-xs font-bold text-center transition flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
            >
              <Video size={13} />
              <span>{quotas.doctor.remaining > 0 ? 'Book Doctor Call' : 'Review History'}</span>
            </Link>
          </div>

          {/* Card 2: Dietitian Consultations */}
          <div className="bg-white rounded-3xl p-5 sm:p-6 border border-stone-200/90 shadow-2xs hover:shadow-md transition-all flex flex-col justify-between space-y-4">
            <div>
              <div className="flex items-center justify-between pb-3 border-b border-stone-100">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0 border border-emerald-100">
                    <Salad size={20} />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-[#11241A]">Clinical Nutrition</h3>
                    <p className="text-[11px] text-slate-400">Dietitian Consultations</p>
                  </div>
                </div>
                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                  quotas.dietitian.remaining > 0 ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-slate-100 text-slate-500'
                }`}>
                  {quotas.dietitian.remaining > 0 ? `${quotas.dietitian.remaining} Left` : 'Completed'}
                </span>
              </div>

              <div className="mt-4 space-y-1">
                <div className="flex items-baseline justify-between text-xs font-semibold">
                  <span className="text-slate-600">Calls Utilized:</span>
                  <span className="font-bold text-[#11241A]">{quotas.dietitian.used} of {quotas.dietitian.max} calls</span>
                </div>
                <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden mt-1.5">
                  <div 
                    className="h-full bg-emerald-600 rounded-full"
                    style={{ width: `${Math.min(100, (quotas.dietitian.used / Math.max(1, quotas.dietitian.max)) * 100)}%` }}
                  />
                </div>
              </div>

              <p className="text-[11px] text-slate-500 mt-3 leading-relaxed">
                Calibrate daily macros, anti-inflammatory food protocols, and receive customized diet charts.
              </p>
            </div>

            <Link
              href="/patient/consultation?role=dietitian"
              className="w-full py-2.5 px-3 rounded-xl bg-[#0D9488] hover:bg-[#0F766E] text-white text-xs font-bold text-center transition flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
            >
              <Video size={13} />
              <span>{quotas.dietitian.remaining > 0 ? 'Book Dietitian Call' : 'Review Diet Plan'}</span>
            </Link>
          </div>

          {/* Card 3: Fitness Coach Consultations */}
          <div className="bg-white rounded-3xl p-5 sm:p-6 border border-stone-200/90 shadow-2xs hover:shadow-md transition-all flex flex-col justify-between space-y-4">
            <div>
              <div className="flex items-center justify-between pb-3 border-b border-stone-100">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-2xl bg-sky-50 text-sky-700 flex items-center justify-center shrink-0 border border-sky-100">
                    <Dumbbell size={20} />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-[#11241A]">Fitness & Movement</h3>
                    <p className="text-[11px] text-slate-400">Fitness Coach Sessions</p>
                  </div>
                </div>
                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                  quotas.fitness_coach.remaining > 0 ? 'bg-sky-50 text-sky-700 border border-sky-200' : 'bg-slate-100 text-slate-500'
                }`}>
                  {quotas.fitness_coach.remaining > 0 ? `${quotas.fitness_coach.remaining} Left` : 'Completed'}
                </span>
              </div>

              <div className="mt-4 space-y-1">
                <div className="flex items-baseline justify-between text-xs font-semibold">
                  <span className="text-slate-600">Calls Utilized:</span>
                  <span className="font-bold text-[#11241A]">{quotas.fitness_coach.used} of {quotas.fitness_coach.max} calls</span>
                </div>
                <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden mt-1.5">
                  <div 
                    className="h-full bg-sky-600 rounded-full"
                    style={{ width: `${Math.min(100, (quotas.fitness_coach.used / Math.max(1, quotas.fitness_coach.max)) * 100)}%` }}
                  />
                </div>
              </div>

              <p className="text-[11px] text-slate-500 mt-3 leading-relaxed">
                Structured strength training, progressive step goals, and metabolic conditioning guidance.
              </p>
            </div>

            <Link
              href="/patient/consultation?role=trainer"
              className="w-full py-2.5 px-3 rounded-xl bg-[#0369A1] hover:bg-[#075985] text-white text-xs font-bold text-center transition flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
            >
              <Video size={13} />
              <span>{quotas.fitness_coach.remaining > 0 ? 'Book Fitness Call' : 'Review Workouts'}</span>
            </Link>
          </div>

        </div>
      </div>

      {/* ========================================================================= */}
      {/* 3. COMPACT WEIGHT TRACKER STRIP                                           */}
      {/* ========================================================================= */}
      <div className="bg-white rounded-3xl p-5 sm:p-6 border border-stone-200/90 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-11 h-11 rounded-2xl bg-emerald-50 text-[#00A884] border border-emerald-100 flex items-center justify-center shrink-0">
            <Scale size={22} />
          </div>
          <div className="flex flex-wrap items-baseline gap-6">
            <div>
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400">Baseline</span>
              <p className="text-lg font-extrabold text-[#11241A]">{startWeight.toFixed(1)} <span className="text-xs text-slate-400 font-normal">kg</span></p>
            </div>
            <div>
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#00A884]">Current</span>
              <p className="text-lg font-extrabold text-[#00A884]">
                {currentWeight.toFixed(1)} <span className="text-xs text-[#00A884] font-normal">kg</span>
                {startWeight - currentWeight > 0 && (
                  <span className="text-xs font-bold text-emerald-600 ml-1.5">
                    (-{(startWeight - currentWeight).toFixed(1)} kg)
                  </span>
                )}
              </p>
            </div>
            <div>
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400">Target</span>
              <p className="text-lg font-extrabold text-[#11241A]">{goalWeight.toFixed(1)} <span className="text-xs text-slate-400 font-normal">kg</span></p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto">
          <button
            onClick={() => setShowProgressModal(true)}
            className="px-3.5 py-2 rounded-xl border border-stone-200 hover:bg-slate-50 text-slate-700 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
          >
            <BarChart3 size={13} className="text-slate-400" />
            <span>History ({weightLogs.length})</span>
          </button>
          <button
            onClick={() => { setLogError(''); setShowWeightModal(true); }}
            className="px-4 py-2 rounded-xl bg-[#00A884] hover:bg-[#009272] text-white text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-xs active:scale-95"
          >
            <Plus size={13} />
            <span>Log Weight</span>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 4. PROVIDER DELIVERIES: PRESCRIPTIONS & CARE PLANS (View, Download, WhatsApp)*/}
      {/* ========================================================================= */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base sm:text-lg font-extrabold text-[#11241A] tracking-tight">
              Clinical Regimens & Care Plans
            </h2>
            <p className="text-xs text-slate-500">
              Prescriptions, diet charts, and workout protocols published by your healthcare providers
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          
          {/* Card 1: Doctor's E-Prescription */}
          <div className="bg-white rounded-3xl p-5 sm:p-6 border border-stone-200/90 shadow-2xs flex flex-col justify-between space-y-4">
            <div>
              <div className="flex items-center justify-between pb-3.5 border-b border-stone-100">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-emerald-50 text-[#00A884] flex items-center justify-center shrink-0">
                    <Pill size={18} />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-[#11241A]">Physician Prescription</h3>
                    <p className="text-[11px] text-slate-400">Digital E-Prescription</p>
                  </div>
                </div>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-50 text-emerald-800 border border-emerald-200">
                  {activePrescription || consultation?.prescription_text ? 'Active' : 'Pending'}
                </span>
              </div>

              <div className="mt-3.5 space-y-2">
                <p className="text-xs font-extrabold text-[#11241A]">
                  {consultation?.prescription_text || activePrescription?.prescription_items?.[0]?.medicine_name || (consultations?.[0]?.prescription_text) || 'Medical protocol will be issued by your doctor after consultation.'}
                </p>
                <p className="text-xs text-slate-500 leading-relaxed">
                  {activePrescription?.diagnosis ? `Diagnosis: ${activePrescription.diagnosis}` : 'Doctor-supervised metabolic titration therapy.'}
                </p>
                <p className="text-[11px] text-slate-400">
                  Issued by: <span className="font-semibold text-slate-700">{careTeam?.doctor_name || 'Assigned Physician'}</span>
                </p>
              </div>
            </div>

            <div className="pt-3 border-t border-stone-100 flex items-center justify-between gap-1.5 text-xs">
              <Link
                href="/patient/prescriptions"
                className="inline-flex items-center gap-1 px-3 py-2 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-700 font-bold transition"
              >
                <Eye size={13} />
                <span>View</span>
              </Link>
              {activePrescription?.id ? (
                <a
                  href={`/api/patient/prescriptions/${activePrescription.id}/pdf`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 px-3 py-2 rounded-xl border border-stone-200 hover:bg-slate-50 text-slate-700 font-bold transition"
                >
                  <Download size={13} />
                  <span>PDF</span>
                </a>
              ) : null}
              <button
                type="button"
                onClick={() => handleWhatsAppShare(
                  'Doctor E-Prescription',
                  `Medication: ${consultation?.prescription_text || activePrescription?.prescription_items?.[0]?.medicine_name || 'Metformin'}\nDoctor: ${careTeam?.doctor_name || 'Physician'}`,
                  activePrescription?.id ? `${window.location.origin}/api/patient/prescriptions/${activePrescription.id}/pdf` : null
                )}
                className="inline-flex items-center gap-1 px-3 py-2 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-200 font-bold hover:bg-emerald-100 transition cursor-pointer"
                title="Share via WhatsApp"
              >
                <Share2 size={13} />
                <span>WhatsApp</span>
              </button>
            </div>
          </div>

          {/* Card 2: Dietitian's Nutrition Plan */}
          <div className="bg-white rounded-3xl p-5 sm:p-6 border border-stone-200/90 shadow-2xs flex flex-col justify-between space-y-4">
            <div>
              <div className="flex items-center justify-between pb-3.5 border-b border-stone-100">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-teal-50 text-[#0D9488] flex items-center justify-center shrink-0">
                    <Salad size={18} />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-[#11241A]">Clinical Nutrition Plan</h3>
                    <p className="text-[11px] text-slate-400">Dietitian Regimen</p>
                  </div>
                </div>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-teal-50 text-teal-800 border border-teal-200">
                  {dietPlan ? 'Active' : 'Personalized'}
                </span>
              </div>

              <div className="mt-3.5 space-y-2">
                <p className="text-xs font-extrabold text-[#11241A]">
                  {dietPlan?.title || 'Personalized Metabolic Diet Chart'}
                </p>
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <span className="px-2 py-0.5 rounded-md bg-teal-50 text-[#0D9488] font-bold">
                    🔥 {dietPlan?.calories_per_day || 1600} kcal/day
                  </span>
                  <span className="px-2 py-0.5 rounded-md bg-sky-50 text-sky-800 font-bold">
                    💧 {dietPlan?.hydration_goal || '2.5 L water'}
                  </span>
                </div>
                <p className="text-[11px] text-slate-400">
                  By: <span className="font-semibold text-slate-700">{careTeam?.dietitian_name || 'Assigned Dietitian'}</span>
                </p>
              </div>
            </div>

            <div className="pt-3 border-t border-stone-100 flex items-center justify-between gap-1.5 text-xs">
              <Link
                href="/patient/care-plan"
                className="inline-flex items-center gap-1 px-3 py-2 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-700 font-bold transition"
              >
                <Eye size={13} />
                <span>View</span>
              </Link>
              {(dietPlan?.attachment_signed_url || dietPlan?.attachment_url) && (
                <a
                  href={dietPlan.attachment_signed_url || dietPlan.attachment_url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 px-3 py-2 rounded-xl border border-stone-200 hover:bg-slate-50 text-slate-700 font-bold transition"
                >
                  <Download size={13} />
                  <span>File</span>
                </a>
              )}
              <button
                type="button"
                onClick={() => handleWhatsAppShare(
                  'Clinical Nutrition Plan',
                  `Plan: ${dietPlan?.title || 'Personalized Diet Chart'}\nCalories: ${dietPlan?.calories_per_day || 1600} kcal\nHydration: ${dietPlan?.hydration_goal || '2.5 L'}\nDietitian: ${careTeam?.dietitian_name || 'Dietitian'}`,
                  dietPlan?.attachment_signed_url || dietPlan?.attachment_url || null
                )}
                className="inline-flex items-center gap-1 px-3 py-2 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-200 font-bold hover:bg-emerald-100 transition cursor-pointer"
                title="Share via WhatsApp"
              >
                <Share2 size={13} />
                <span>WhatsApp</span>
              </button>
            </div>
          </div>

          {/* Card 3: Fitness Coach's Protocol */}
          <div className="bg-white rounded-3xl p-5 sm:p-6 border border-stone-200/90 shadow-2xs flex flex-col justify-between space-y-4">
            <div>
              <div className="flex items-center justify-between pb-3.5 border-b border-stone-100">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-sky-50 text-sky-700 flex items-center justify-center shrink-0">
                    <Dumbbell size={18} />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-[#11241A]">Movement Protocol</h3>
                    <p className="text-[11px] text-slate-400">Fitness Coach Regimen</p>
                  </div>
                </div>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-sky-50 text-sky-800 border border-sky-200">
                  {fitnessPlan ? 'Active' : 'Prescribed'}
                </span>
              </div>

              <div className="mt-3.5 space-y-2">
                <p className="text-xs font-extrabold text-[#11241A]">
                  {fitnessPlan?.title || 'Metabolic Conditioning & Strength Protocol'}
                </p>
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <span className="px-2 py-0.5 rounded-md bg-sky-50 text-sky-800 font-bold">
                    🏃 {fitnessPlan?.weekly_frequency || 3} sessions / week
                  </span>
                  <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-semibold">
                    👟 {fitnessPlan?.daily_step_goal ? `${fitnessPlan.daily_step_goal.toLocaleString()} steps` : '8,000 steps'}
                  </span>
                </div>
                <p className="text-[11px] text-slate-400">
                  By: <span className="font-semibold text-slate-700">{careTeam?.fitness_coach_name || 'Assigned Fitness Coach'}</span>
                </p>
              </div>
            </div>

            <div className="pt-3 border-t border-stone-100 flex items-center justify-between gap-1.5 text-xs">
              <Link
                href="/patient/care-plan"
                className="inline-flex items-center gap-1 px-3 py-2 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-700 font-bold transition"
              >
                <Eye size={13} />
                <span>View</span>
              </Link>
              {(fitnessPlan?.attachment_signed_url || fitnessPlan?.attachment_url) && (
                <a
                  href={fitnessPlan.attachment_signed_url || fitnessPlan.attachment_url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 px-3 py-2 rounded-xl border border-stone-200 hover:bg-slate-50 text-slate-700 font-bold transition"
                >
                  <Download size={13} />
                  <span>File</span>
                </a>
              )}
              <button
                type="button"
                onClick={() => handleWhatsAppShare(
                  'Fitness & Movement Protocol',
                  `Protocol: ${fitnessPlan?.title || 'Metabolic Conditioning'}\nFrequency: ${fitnessPlan?.weekly_frequency || 3}x/week\nSteps: ${fitnessPlan?.daily_step_goal || 8000} steps/day\nCoach: ${careTeam?.fitness_coach_name || 'Fitness Coach'}`,
                  fitnessPlan?.attachment_signed_url || fitnessPlan?.attachment_url || null
                )}
                className="inline-flex items-center gap-1 px-3 py-2 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-200 font-bold hover:bg-emerald-100 transition cursor-pointer"
                title="Share via WhatsApp"
              >
                <Share2 size={13} />
                <span>WhatsApp</span>
              </button>
            </div>
          </div>

        </div>
      </div>

      {/* ========================================================================= */}
      {/* 5. PATIENT UPLOADED RECORDS (View / Edit anytime)                         */}
      {/* ========================================================================= */}
      <div className="bg-white rounded-3xl p-6 sm:p-7 border border-stone-200/90 shadow-2xs space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-stone-100">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-teal-50 text-[#00A884] flex items-center justify-center shrink-0">
                <UploadCloud size={20} />
              </div>
              <div>
                <h3 className="text-base font-extrabold text-[#11241A]">My Uploaded Health Records</h3>
                <p className="text-xs text-slate-500">Blood tests, lab reports, and previous prescriptions shared with your doctors</p>
              </div>
            </div>
          </div>

          <button
            onClick={() => {
              setUploadFile(null)
              setUploadTitle('')
              setUploadError('')
              setShowUploadModal(true)
            }}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#00A884] hover:bg-[#009272] text-white text-xs font-bold transition cursor-pointer shadow-xs active:scale-95 self-start sm:self-auto"
          >
            <Plus size={14} />
            <span>Upload New Record</span>
          </button>
        </div>

        {records && records.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {records.map((rec) => {
              const isPdf = rec.mime_type?.includes('pdf') || rec.file_name?.endsWith('.pdf')

              return (
                <div key={rec.id} className="p-4 rounded-2xl bg-[#FAF8F5] border border-stone-200/80 flex items-center justify-between gap-3 hover:border-[#00A884]/60 transition-colors">
                  <div className="flex items-center gap-3 truncate">
                    <div className="w-10 h-10 rounded-xl bg-white border border-stone-200 text-teal-700 flex items-center justify-center shrink-0">
                      {isPdf ? <FileText size={20} /> : <ImageIcon size={20} />}
                    </div>
                    <div className="truncate">
                      <p className="text-xs font-bold text-[#11241A] truncate">{rec.file_name}</p>
                      <div className="flex items-center gap-2 mt-0.5 text-[10px] text-slate-400">
                        <span className="capitalize px-1.5 py-0.2 rounded bg-white border border-stone-200 font-semibold text-slate-600">
                          {rec.report_category?.replace('_', ' ') || 'Document'}
                        </span>
                        {rec.test_date && <span>Test Date: {rec.test_date}</span>}
                        {rec.created_at && <span>{new Date(rec.created_at).toLocaleDateString()}</span>}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    {/* View Button */}
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedRecord(rec)
                        setShowPreviewModal(true)
                      }}
                      className="p-1.5 text-slate-600 hover:text-[#00A884] hover:bg-white rounded-lg transition cursor-pointer"
                      title="Preview Document"
                    >
                      <Eye size={16} />
                    </button>

                    {/* Download */}
                    {rec.file_url && (
                      <a
                        href={rec.file_url}
                        target="_blank"
                        rel="noreferrer"
                        download={rec.file_name}
                        className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-white rounded-lg transition"
                        title="Download Document"
                      >
                        <Download size={16} />
                      </a>
                    )}

                    {/* Edit */}
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedRecord(rec)
                        setEditTitle(rec.file_name)
                        setEditCategory(rec.report_category || 'blood_test')
                        setEditTestDate(rec.test_date || '')
                        setEditError('')
                        setShowEditModal(true)
                      }}
                      className="p-1.5 text-slate-600 hover:text-indigo-600 hover:bg-white rounded-lg transition cursor-pointer"
                      title="Edit Title & Category"
                    >
                      <Edit3 size={15} />
                    </button>

                    {/* Delete */}
                    <button
                      type="button"
                      onClick={() => handleDeleteRecord(rec.id)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-white rounded-lg transition cursor-pointer"
                      title="Delete Record"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <div className="p-8 text-center bg-[#FAF8F5] rounded-2xl border border-dashed border-stone-200 space-y-2">
            <UploadCloud className="w-8 h-8 text-slate-300 mx-auto" />
            <p className="text-xs font-bold text-[#11241A]">No uploaded medical reports yet</p>
            <p className="text-[11px] text-slate-400 max-w-sm mx-auto">
              Upload your recent blood tests, lipid panels, or doctor prescriptions so your care team can tailor your regimen.
            </p>
            <button
              onClick={() => setShowUploadModal(true)}
              className="mt-2 inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl border border-stone-200 bg-white hover:bg-slate-50 text-xs font-bold text-slate-700 transition cursor-pointer"
            >
              <Plus size={13} />
              <span>Upload Health Report</span>
            </button>
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* 6. DEDICATED CONCIERGE & SUPPORT CARE CARD                                */}
      {/* ========================================================================= */}
      <div className="rounded-3xl bg-gradient-to-r from-teal-900 via-emerald-900 to-[#0A261C] p-6 sm:p-7 text-white shadow-md flex flex-col md:flex-row md:items-center justify-between gap-6 border border-teal-500/30">
        <div className="space-y-2 max-w-xl">
          <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-400/40 text-teal-300 text-[10px] font-bold uppercase tracking-wider">
            <HeartPulse size={12} />
            <span>Dedicated Patient Concierge</span>
          </div>
          <h3 className="text-xl font-extrabold text-white tracking-tight">
            Need Guidance with Your Care Plan or Prescriptions?
          </h3>
          <p className="text-xs text-slate-300 leading-relaxed">
            Your 8Liv Care Manager and medical support desk are available for clinical questions, medication timing, or booking assistance.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <a
            href="https://wa.me/919944023986?text=Hi%208Liv%20Support%2C%20I%20need%20assistance%20with%20my%20care%20plan."
            target="_blank"
            rel="noreferrer"
            className="px-4 py-2.5 rounded-xl bg-[#25D366] hover:bg-[#20BD5A] text-white text-xs font-bold flex items-center gap-2 shadow-sm transition active:scale-95"
          >
            <MessageSquare size={14} />
            <span>WhatsApp Care Team</span>
          </a>

          <a
            href="tel:+919944023986"
            className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-white text-xs font-bold flex items-center gap-2 transition"
          >
            <PhoneCall size={14} />
            <span>Call Support</span>
          </a>

          <button
            type="button"
            onClick={() => {
              setTicketSubject('')
              setTicketMessage('')
              setTicketError('')
              setTicketSuccess(false)
              setShowTicketModal(true)
            }}
            className="px-4 py-2.5 rounded-xl bg-white text-[#11241A] hover:bg-slate-100 text-xs font-bold flex items-center gap-2 transition cursor-pointer shadow-sm"
          >
            <HelpCircle size={14} />
            <span>Raise Ticket</span>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* MODAL: Upload New Record                                                  */}
      {/* ========================================================================= */}
      {showUploadModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-3xl p-6 sm:p-7 max-w-md w-full shadow-2xl border border-stone-200 relative">
            <button
              onClick={() => setShowUploadModal(false)}
              className="absolute top-5 right-5 p-1.5 text-slate-400 hover:text-slate-700 rounded-full hover:bg-slate-100"
            >
              <X size={18} />
            </button>

            <div className="flex items-center gap-3 mb-4 pb-3 border-b border-stone-100">
              <div className="w-10 h-10 rounded-2xl bg-teal-50 text-[#00A884] flex items-center justify-center shrink-0">
                <UploadCloud size={20} />
              </div>
              <div>
                <h3 className="text-base font-extrabold text-[#11241A]">Upload Health Record</h3>
                <p className="text-xs text-slate-500">Attach blood tests, reports, or previous Rx</p>
              </div>
            </div>

            <form onSubmit={handleUploadSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Document Category
                </label>
                <select
                  value={uploadCategory}
                  onChange={(e) => setUploadCategory(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200 text-xs font-semibold text-slate-800 focus:outline-none focus:border-[#00A884]"
                >
                  <option value="blood_test">Blood & Diagnostic Report</option>
                  <option value="prescription">Previous Doctor Prescription</option>
                  <option value="scan">Diagnostic Scan / Imaging</option>
                  <option value="progress_photo">Body Metric / Progress Photo</option>
                  <option value="other">Other Health Record</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Document Title / Note
                </label>
                <input
                  type="text"
                  placeholder="e.g. Fasting Lipid Profile Oct 2026"
                  value={uploadTitle}
                  onChange={(e) => setUploadTitle(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200 text-xs text-slate-800 focus:outline-none focus:border-[#00A884]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Test / Issue Date (Optional)
                </label>
                <input
                  type="date"
                  value={uploadTestDate}
                  onChange={(e) => setUploadTestDate(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200 text-xs text-slate-800 focus:outline-none focus:border-[#00A884]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Select File (PDF, PNG, JPG, WebP)
                </label>
                <input
                  type="file"
                  accept="application/pdf,image/png,image/jpeg,image/webp"
                  onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
                  required
                  className="w-full text-xs text-slate-600 file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-teal-50 file:text-[#00A884] hover:file:bg-teal-100 cursor-pointer"
                />
              </div>

              {uploadError && (
                <p className="text-xs text-rose-600 bg-rose-50 p-2.5 rounded-xl border border-rose-200">
                  {uploadError}
                </p>
              )}

              <div className="pt-2 flex gap-2.5">
                <button
                  type="button"
                  onClick={() => setShowUploadModal(false)}
                  className="flex-1 py-2.5 rounded-xl border border-stone-200 text-xs font-bold text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isUploading || !uploadFile}
                  className="flex-1 py-2.5 rounded-xl bg-[#00A884] hover:bg-[#009272] text-white text-xs font-bold disabled:opacity-50"
                >
                  {isUploading ? 'Uploading...' : 'Save to Dossier'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: Edit Record Title / Category                                       */}
      {/* ========================================================================= */}
      {showEditModal && selectedRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-3xl p-6 sm:p-7 max-w-md w-full shadow-2xl border border-stone-200 relative">
            <button
              onClick={() => setShowEditModal(false)}
              className="absolute top-5 right-5 p-1.5 text-slate-400 hover:text-slate-700 rounded-full hover:bg-slate-100"
            >
              <X size={18} />
            </button>

            <div className="flex items-center gap-3 mb-4 pb-3 border-b border-stone-100">
              <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-700 flex items-center justify-center shrink-0">
                <Edit3 size={18} />
              </div>
              <div>
                <h3 className="text-base font-extrabold text-[#11241A]">Edit Health Record</h3>
                <p className="text-xs text-slate-500">Update file title or category classification</p>
              </div>
            </div>

            <form onSubmit={handleEditSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Document Title
                </label>
                <input
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  required
                  className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200 text-xs text-slate-800 focus:outline-none focus:border-indigo-600"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Category
                </label>
                <select
                  value={editCategory}
                  onChange={(e) => setEditCategory(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200 text-xs font-semibold text-slate-800 focus:outline-none focus:border-indigo-600"
                >
                  <option value="blood_test">Blood & Diagnostic Report</option>
                  <option value="prescription">Previous Doctor Prescription</option>
                  <option value="scan">Diagnostic Scan / Imaging</option>
                  <option value="progress_photo">Body Metric / Progress Photo</option>
                  <option value="other">Other Health Record</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Test Date
                </label>
                <input
                  type="date"
                  value={editTestDate}
                  onChange={(e) => setEditTestDate(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200 text-xs text-slate-800 focus:outline-none focus:border-indigo-600"
                />
              </div>

              {editError && (
                <p className="text-xs text-rose-600 bg-rose-50 p-2.5 rounded-xl border border-rose-200">
                  {editError}
                </p>
              )}

              <div className="pt-2 flex gap-2.5">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="flex-1 py-2.5 rounded-xl border border-stone-200 text-xs font-bold text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingEdit || !editTitle}
                  className="flex-1 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold disabled:opacity-50"
                >
                  {isSavingEdit ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: Preview Health Record                                              */}
      {/* ========================================================================= */}
      {showPreviewModal && selectedRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-3xl p-5 max-w-3xl w-full max-h-[90vh] shadow-2xl border border-stone-200 relative flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-stone-100">
              <div className="truncate pr-4">
                <h3 className="text-sm font-extrabold text-[#11241A] truncate">{selectedRecord.file_name}</h3>
                <p className="text-[11px] text-slate-400 capitalize">{selectedRecord.report_category?.replace('_', ' ') || 'Document'}</p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {selectedRecord.file_url && (
                  <a
                    href={selectedRecord.file_url}
                    target="_blank"
                    rel="noreferrer"
                    className="p-1.5 text-slate-600 hover:text-slate-900 rounded-lg hover:bg-slate-100"
                    title="Open Fullscreen in New Tab"
                  >
                    <ExternalLink size={16} />
                  </a>
                )}
                <button
                  onClick={() => setShowPreviewModal(false)}
                  className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-auto py-4 flex items-center justify-center min-h-[300px]">
              {selectedRecord.mime_type?.includes('pdf') || selectedRecord.file_name?.endsWith('.pdf') ? (
                <iframe
                  src={selectedRecord.file_url}
                  className="w-full h-[60vh] rounded-2xl border border-stone-200"
                  title={selectedRecord.file_name}
                />
              ) : (
                <img
                  src={selectedRecord.file_url}
                  alt={selectedRecord.file_name}
                  className="max-h-[65vh] max-w-full object-contain rounded-2xl shadow-sm"
                />
              )}
            </div>

            <div className="pt-3 border-t border-stone-100 flex items-center justify-between text-xs">
              <span className="text-slate-400">Uploaded {new Date(selectedRecord.created_at).toLocaleDateString()}</span>
              {selectedRecord.file_url && (
                <a
                  href={selectedRecord.file_url}
                  download={selectedRecord.file_name}
                  target="_blank"
                  rel="noreferrer"
                  className="px-4 py-2 rounded-xl bg-[#00A884] text-white font-bold inline-flex items-center gap-1.5"
                >
                  <Download size={13} />
                  <span>Download File</span>
                </a>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: Submit Support Ticket                                              */}
      {/* ========================================================================= */}
      {showTicketModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-3xl p-6 sm:p-7 max-w-md w-full shadow-2xl border border-stone-200 relative">
            <button
              onClick={() => setShowTicketModal(false)}
              className="absolute top-5 right-5 p-1.5 text-slate-400 hover:text-slate-700 rounded-full hover:bg-slate-100"
            >
              <X size={18} />
            </button>

            <div className="flex items-center gap-3 mb-4 pb-3 border-b border-stone-100">
              <div className="w-10 h-10 rounded-2xl bg-teal-50 text-[#00A884] flex items-center justify-center shrink-0">
                <HelpCircle size={20} />
              </div>
              <div>
                <h3 className="text-base font-extrabold text-[#11241A]">Submit Support Request</h3>
                <p className="text-xs text-slate-500">Direct ticket to your clinical care coordinator</p>
              </div>
            </div>

            {ticketSuccess ? (
              <div className="py-8 text-center space-y-2">
                <CheckCircle2 className="w-12 h-12 text-[#00A884] mx-auto animate-bounce" />
                <h4 className="text-base font-bold text-[#11241A]">Ticket Submitted Successfully!</h4>
                <p className="text-xs text-slate-500">Your care coordinator will respond within 24 hours.</p>
              </div>
            ) : (
              <form onSubmit={handleSupportTicketSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Query Topic
                  </label>
                  <select
                    value={ticketCategory}
                    onChange={(e) => setTicketCategory(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200 text-xs font-semibold text-slate-800 focus:outline-none focus:border-[#00A884]"
                  >
                    <option value="medical">Medical or Medication Question</option>
                    <option value="diet">Diet & Nutrition Guidance</option>
                    <option value="appointments">Consultation Booking / Reschedule</option>
                    <option value="billing">Membership & Invoicing</option>
                    <option value="general">Other Support Inquiries</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Subject
                  </label>
                  <input
                    type="text"
                    placeholder="Brief summary of your inquiry"
                    value={ticketSubject}
                    onChange={(e) => setTicketSubject(e.target.value)}
                    required
                    className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200 text-xs text-slate-800 focus:outline-none focus:border-[#00A884]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    How can we assist you?
                  </label>
                  <textarea
                    rows={4}
                    placeholder="Describe your question or concern in detail..."
                    value={ticketMessage}
                    onChange={(e) => setTicketMessage(e.target.value)}
                    required
                    className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200 text-xs text-slate-800 focus:outline-none focus:border-[#00A884]"
                  />
                </div>

                {ticketError && (
                  <p className="text-xs text-rose-600 bg-rose-50 p-2.5 rounded-xl border border-rose-200">
                    {ticketError}
                  </p>
                )}

                <div className="pt-2 flex gap-2.5">
                  <button
                    type="button"
                    onClick={() => setShowTicketModal(false)}
                    className="flex-1 py-2.5 rounded-xl border border-stone-200 text-xs font-bold text-slate-600 hover:bg-slate-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmittingTicket}
                    className="flex-1 py-2.5 rounded-xl bg-[#00A884] hover:bg-[#009272] text-white text-xs font-bold disabled:opacity-50"
                  >
                    {isSubmittingTicket ? 'Submitting...' : 'Send Message'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: Log Today's Weight                                                 */}
      {/* ========================================================================= */}
      {showWeightModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-3xl p-6 sm:p-7 max-w-md w-full shadow-2xl border border-stone-200 relative">
            <button
              onClick={() => setShowWeightModal(false)}
              className="absolute top-5 right-5 p-1.5 text-slate-400 hover:text-slate-700 rounded-full hover:bg-slate-100"
            >
              <X size={18} />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-[#00A884] flex items-center justify-center shrink-0">
                <Scale size={20} />
              </div>
              <div>
                <h3 className="text-base font-extrabold text-[#11241A]">Record Today&apos;s Weight</h3>
                <p className="text-xs text-slate-500">Track your clinical progress</p>
              </div>
            </div>

            <form onSubmit={handleLogWeightSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Weight (in Kilograms)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.1"
                    min="30"
                    max="300"
                    placeholder="e.g. 74.0"
                    value={newWeight}
                    onChange={(e) => setNewWeight(e.target.value)}
                    required
                    autoFocus
                    className="w-full px-4 py-3 rounded-2xl border border-slate-200 text-xl font-extrabold text-[#11241A] focus:outline-none focus:border-[#00A884]"
                  />
                  <span className="absolute right-4 top-3.5 text-xs font-bold text-slate-400">
                    kg
                  </span>
                </div>
              </div>

              {logError && (
                <p className="text-xs text-rose-600 bg-rose-50 p-2.5 rounded-xl border border-rose-200">
                  {logError}
                </p>
              )}

              <div className="pt-2 flex gap-2.5">
                <button
                  type="button"
                  onClick={() => setShowWeightModal(false)}
                  className="flex-1 py-3 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={logLoading || !newWeight}
                  className="flex-1 py-3 rounded-xl bg-[#00A884] text-white text-xs font-bold disabled:opacity-50"
                >
                  {logLoading ? 'Saving...' : 'Record'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: Weight History                                                     */}
      {/* ========================================================================= */}
      {showProgressModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-3xl p-6 sm:p-7 max-w-lg w-full shadow-2xl border border-stone-200 relative max-h-[85vh] flex flex-col">
            <button
              onClick={() => setShowProgressModal(false)}
              className="absolute top-5 right-5 p-1.5 text-slate-400 hover:text-slate-700 rounded-full hover:bg-slate-100"
            >
              <X size={18} />
            </button>

            <div className="flex items-center gap-3 mb-4 pb-3 border-b border-stone-100">
              <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-[#00A884] flex items-center justify-center shrink-0">
                <BarChart3 size={20} />
              </div>
              <div>
                <h3 className="text-base font-extrabold text-[#11241A]">Weight Log History</h3>
                <p className="text-xs text-slate-500">Verified biometric measurements</p>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
              {weightLogs && weightLogs.length > 0 ? (
                weightLogs.slice().reverse().map((log: any, idx: number) => {
                  const logDate = log.created_at || log.logged_at ? new Date(log.created_at || log.logged_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : `Entry #${weightLogs.length - idx}`
                  const val = parseFloat(log.weight_kg)
                  const diffFromStart = startWeight - val
                  return (
                    <div key={idx} className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-50/80 border border-slate-100">
                      <div>
                        <p className="text-xs font-bold text-slate-800">{logDate}</p>
                        <p className="text-[11px] text-slate-400">Weight Check-in</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-extrabold text-[#11241A]">{val.toFixed(1)} kg</p>
                        {diffFromStart > 0 && (
                          <p className="text-[10px] text-emerald-600 font-bold">-{diffFromStart.toFixed(1)} kg delta</p>
                        )}
                      </div>
                    </div>
                  )
                })
              ) : (
                <div className="text-center py-10 text-slate-400 text-xs">
                  No telemetry entries logged yet. Click &ldquo;Log Weight&rdquo; to add your first check-in!
                </div>
              )}
            </div>

            <div className="pt-4 border-t border-stone-100 flex justify-end">
              <button
                onClick={() => setShowProgressModal(false)}
                className="py-2.5 px-6 rounded-full bg-[#11241A] text-white text-xs font-bold hover:bg-black transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
