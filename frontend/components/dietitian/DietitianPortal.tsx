'use client'

import React, { useState, useEffect, useCallback, useMemo } from 'react'
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
} from 'lucide-react'
import { supabase } from '@/lib/supabaseClient'
import ProviderProfileEditor from '@/components/provider/ProviderProfileEditor'

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
  | 'referrals'
  | 'communications'
  | 'wallet'
  | 'profile'

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
  status: 'DRAFT' | 'PUBLISHED' | 'ACKNOWLEDGED' | 'ARCHIVED'
  patient_id: string
  dietitian_id: string
  start_date: string
  review_date?: string | null
  daily_calorie_target?: number | null
  water_target_liters: number
  meals: Meal[]
  nutrition_goals?: string | null
  general_instructions?: string | null
  pdf_url?: string | null
  pdf_hash?: string | null
  created_at: string
  updated_at: string
  profiles?: {
    full_name?: string
    email?: string
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

type ReferralRecord = {
  id: string
  patient_id: string
  doctor_id: string
  reason: string
  priority: string
  clinical_notes?: string | null
  status: string
  created_at: string
  patient?: {
    full_name?: string
    gender?: string
    age?: number
  }
  doctor?: {
    full_name?: string
  }
}

function formatInr(val: number) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(val || 0)
}

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
  const [workspaceTab, setWorkspaceTab] = useState<'overview' | 'assessment' | 'plans' | 'food-logs' | 'progress' | 'consultations' | 'communication'>('overview')

  // Plans & Templates State
  const [plans, setPlans] = useState<PlanRecord[]>([])
  const [templates, setTemplates] = useState<TemplateRecord[]>([])
  const [planSubTab, setPlanSubTab] = useState<'active' | 'drafts' | 'templates' | 'history'>('active')
  const [editingPlan, setEditingPlan] = useState<Partial<PlanRecord> | null>(null)
  const [isPublishing, setIsPublishing] = useState(false)

  // Referrals & Food Logs State
  const [referrals, setReferrals] = useState<ReferralRecord[]>([])
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
      if (activeSection === 'patients' || activeSection === 'dashboard') {
        const res = await fetch(`/api/dietitian/patients?search=${encodeURIComponent(patientSearch)}`, { headers })
        const json = await res.json()
        if (json.success) {
          setPatients(json.patients || [])
        }
      }

      // Plans & Templates
      if (activeSection === 'plans') {
        const [plansRes, tmplRes] = await Promise.all([
          fetch('/api/dietitian/plans', { headers }),
          fetch('/api/dietitian/templates', { headers }),
        ])
        const plansJson = await plansRes.json()
        const tmplJson = await tmplRes.json()
        if (plansJson.success) setPlans(plansJson.plans || [])
        if (tmplJson.success) setTemplates(tmplJson.templates || [])
      }

      // Referrals
      if (activeSection === 'referrals' || activeSection === 'dashboard') {
        const res = await fetch('/api/dietitian/referrals', { headers })
        const json = await res.json()
        if (json.success) setReferrals(json.referrals || [])
      }

      // Food Logs
      if (activeSection === 'food-logs') {
        const res = await fetch(`/api/dietitian/food-logs?filter=${foodLogFilter}`, { headers })
        const json = await res.json()
        if (json.success) setFoodLogs(json.foodLogs || [])
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
  }, [activeSection, patientSearch, foodLogFilter, providerUser])

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

  // 4. Doctor Referral Accept/Decline
  const handleReferralAction = async (referralId: string, action: 'ACCEPT' | 'DECLINE') => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch(`/api/dietitian/referrals/${referralId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session?.access_token || ''}`,
        },
        body: JSON.stringify({ action }),
      })
      const json = await res.json()
      if (json.success) {
        setSuccess(`Referral ${action === 'ACCEPT' ? 'accepted and patient assigned' : 'declined'} successfully!`)
        loadData()
      } else {
        setError(json.error || 'Failed to update referral')
      }
    } catch (err: any) {
      setError(err.message || 'Error processing referral')
    }
  }

  // 5. Publish Nutrition Plan
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
            onClick={() => { setActiveSection('referrals'); setSelectedPatient(null) }}
            className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all ${
              activeSection === 'referrals' ? 'bg-[#0D9488] text-white shadow-sm' : 'text-slate-300 hover:bg-[#252C48]'
            }`}
          >
            <div className="flex items-center gap-3">
              <UserCheck className="w-4 h-4" />
              <span>Doctor Referrals</span>
            </div>
            {referrals.filter(r => r.status === 'PENDING').length > 0 && (
              <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-[#C4622D] text-white font-black animate-pulse">
                {referrals.filter(r => r.status === 'PENDING').length}
              </span>
            )}
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

        {/* SECTION 1: DASHBOARD */}
        {activeSection === 'dashboard' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <p className="text-xs font-black uppercase tracking-wider text-[#0D9488]">Clinical Care Center</p>
                <h1 className="text-2xl md:text-3xl font-black text-[#1A1F36]">Dietitian Care Dashboard</h1>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => { setActiveSection('plans'); setEditingPlan({ plan_name: 'Custom Clinical Nutrition Plan', meals: [] }) }}
                  className="rounded-full bg-[#0D9488] hover:bg-[#0F766E] text-white px-5 py-2.5 text-xs font-bold transition-all flex items-center gap-2 shadow-sm"
                >
                  <FilePlus className="w-4 h-4" />
                  <span>Create Nutrition Plan</span>
                </button>
              </div>
            </div>

            {/* 8 Real Dashboard Metrics Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="rounded-2xl border border-[#E8DED4] bg-white p-4 shadow-sm">
                <p className="text-[10px] font-black uppercase tracking-wider text-slate-500">My Patients</p>
                <p className="mt-2 text-2xl md:text-3xl font-black text-[#1A1F36]">{dashboardMetrics?.myPatients ?? patients.length}</p>
                <p className="text-[10px] font-semibold text-slate-400 mt-1">Assigned care program</p>
              </div>

              <div className="rounded-2xl border border-[#E8DED4] bg-white p-4 shadow-sm">
                <p className="text-[10px] font-black uppercase tracking-wider text-slate-500">Today's Sessions</p>
                <p className="mt-2 text-2xl md:text-3xl font-black text-[#0D9488]">{dashboardMetrics?.todaySessions ?? 0}</p>
                <p className="text-[10px] font-semibold text-slate-400 mt-1">Scheduled video calls</p>
              </div>

              <div className="rounded-2xl border border-[#E8DED4] bg-white p-4 shadow-sm">
                <p className="text-[10px] font-black uppercase tracking-wider text-slate-500">Upcoming Sessions</p>
                <p className="mt-2 text-2xl md:text-3xl font-black text-[#1A1F36]">{dashboardMetrics?.upcomingSessions ?? 0}</p>
                <p className="text-[10px] font-semibold text-slate-400 mt-1">Next 7 calendar days</p>
              </div>

              <div className="rounded-2xl border border-[#E8DED4] bg-white p-4 shadow-sm">
                <p className="text-[10px] font-black uppercase tracking-wider text-slate-500">Active Plans</p>
                <p className="mt-2 text-2xl md:text-3xl font-black text-[#0D9488]">{dashboardMetrics?.activePlans ?? 0}</p>
                <p className="text-[10px] font-semibold text-slate-400 mt-1">Published & acknowledged</p>
              </div>

              <div className="rounded-2xl border border-[#E8DED4] bg-white p-4 shadow-sm">
                <p className="text-[10px] font-black uppercase tracking-wider text-slate-500">Doctor Referrals</p>
                <p className="mt-2 text-2xl md:text-3xl font-black text-[#C4622D]">{dashboardMetrics?.newReferrals ?? referrals.filter(r => r.status === 'PENDING').length}</p>
                <p className="text-[10px] font-semibold text-slate-400 mt-1">Awaiting acceptance</p>
              </div>

              <div className="rounded-2xl border border-[#E8DED4] bg-white p-4 shadow-sm">
                <p className="text-[10px] font-black uppercase tracking-wider text-slate-500">Plans Due Review</p>
                <p className="mt-2 text-2xl md:text-3xl font-black text-[#B94D4D]">{dashboardMetrics?.plansRequiringReview ?? 0}</p>
                <p className="text-[10px] font-semibold text-slate-400 mt-1">Review date within 7d</p>
              </div>

              <div className="rounded-2xl border border-[#E8DED4] bg-white p-4 shadow-sm">
                <p className="text-[10px] font-black uppercase tracking-wider text-slate-500">Unreviewed Logs</p>
                <p className="mt-2 text-2xl md:text-3xl font-black text-[#1A1F36]">{dashboardMetrics?.unreviewedFoodLogs ?? 0}</p>
                <p className="text-[10px] font-semibold text-slate-400 mt-1">Pending clinical feedback</p>
              </div>

              <div className="rounded-2xl border border-[#E8DED4] bg-white p-4 shadow-sm">
                <p className="text-[10px] font-black uppercase tracking-wider text-slate-500">Wallet Balance</p>
                <p className="mt-2 text-2xl md:text-3xl font-black text-[#0D9488]">{formatInr(dashboardMetrics?.walletBalance ?? walletState.balance ?? 0)}</p>
                <p className="text-[10px] font-semibold text-slate-400 mt-1">Available for withdrawal</p>
              </div>
            </div>

            {/* Today's Actions & Attention */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Today's Actions */}
              <div className="rounded-2xl border border-[#E8DED4] bg-white p-5 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-base font-black text-[#1A1F36] flex items-center gap-2">
                    <Clock className="w-4 h-4 text-[#0D9488]" />
                    Today's Priority Actions
                  </h3>
                  <span className="text-xs font-bold text-slate-400">{todaysActions.length} Actions</span>
                </div>

                {todaysActions.length > 0 ? (
                  <div className="space-y-3">
                    {todaysActions.map((action) => (
                      <div key={action.id} className="p-3.5 rounded-xl bg-[#FAF8F5] border border-[#E8DED4] flex items-center justify-between gap-3">
                        <div>
                          <p className="text-xs font-bold text-[#1A1F36]">{action.title}</p>
                          <p className="text-[10px] text-slate-400 mt-0.5">{new Date(action.timestamp).toLocaleDateString()}</p>
                        </div>
                        <button
                          onClick={() => {
                            if (action.type === 'REFERRAL') setActiveSection('referrals')
                            else if (action.type === 'PLAN_REVIEW') setActiveSection('plans')
                            else router.push(action.actionUrl)
                          }}
                          className="px-3 py-1.5 rounded-lg bg-[#0D9488] text-white text-[11px] font-bold hover:bg-[#0F766E] transition-colors whitespace-nowrap"
                        >
                          {action.actionLabel}
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-8 text-center bg-[#FAF8F5] rounded-xl text-slate-400 text-xs font-bold">
                    No pending clinical actions scheduled for today.
                  </div>
                )}
              </div>

              {/* Patients Needing Attention */}
              <div className="rounded-2xl border border-[#E8DED4] bg-white p-5 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-base font-black text-[#1A1F36] flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-[#C4622D]" />
                    Patients Needing Attention
                  </h3>
                  <span className="text-xs font-bold text-slate-400">{patientsNeedingAttention.length} Alerts</span>
                </div>

                {patientsNeedingAttention.length > 0 ? (
                  <div className="space-y-3">
                    {patientsNeedingAttention.map((attn) => (
                      <div key={attn.id} className="p-3.5 rounded-xl bg-[#FFF7ED] border border-[#FED7AA] flex items-center justify-between gap-3">
                        <div>
                          <p className="text-xs font-bold text-[#9A3412]">{attn.title}</p>
                          <span className="inline-block mt-1 px-2 py-0.5 text-[9px] font-black uppercase rounded bg-[#EA580C]/20 text-[#9A3412]">
                            Action Required
                          </span>
                        </div>
                        <button
                          onClick={() => {
                            if (attn.type === 'FOOD_LOGS') setActiveSection('food-logs')
                            else setActiveSection('plans')
                          }}
                          className="px-3 py-1.5 rounded-lg bg-[#C4622D] text-white text-[11px] font-bold hover:bg-[#B25524] transition-colors whitespace-nowrap"
                        >
                          {attn.actionLabel}
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-8 text-center bg-[#FAF8F5] rounded-xl text-slate-400 text-xs font-bold">
                    All patient food logs and reviews are up to date!
                  </div>
                )}
              </div>
            </div>

            {/* Recent Audit Activity Feed */}
            <div className="rounded-2xl border border-[#E8DED4] bg-white p-5 shadow-sm">
              <h3 className="text-base font-black text-[#1A1F36] mb-4 flex items-center gap-2">
                <Activity className="w-4 h-4 text-[#0D9488]" />
                Recent Clinical Activity
              </h3>
              {recentActivity.length > 0 ? (
                <div className="divide-y divide-slate-100">
                  {recentActivity.map((act) => (
                    <div key={act.id} className="py-2.5 flex items-center justify-between text-xs">
                      <div>
                        <span className="font-bold text-[#1A1F36] capitalize">{act.action?.replace(/_/g, ' ').toLowerCase()}</span>
                        <span className="text-slate-400 ml-2">({act.resourceType})</span>
                      </div>
                      <span className="text-slate-400 text-[10px]">{new Date(act.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-400 py-4 text-center">No recorded activity yet.</p>
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
                            <th className="p-4">Patient Name</th>
                            <th className="p-4">Current Weight / BMI</th>
                            <th className="p-4">Active Plan</th>
                            <th className="p-4">Review Due</th>
                            <th className="p-4 text-right">Action</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {patients.map((p) => (
                            <tr key={p.id} className="hover:bg-slate-50/80 transition-colors">
                              <td className="p-4">
                                <p className="font-bold text-[#1A1F36]">{p.patient_name}</p>
                                <p className="text-[10px] text-slate-400">{p.age ? `${p.age} yrs` : ''} {p.gender ? `• ${p.gender}` : ''}</p>
                              </td>
                              <td className="p-4">
                                <span className="font-bold">{p.current_weight ? `${p.current_weight} kg` : 'Not recorded'}</span>
                                {p.bmi && <span className="text-slate-400 ml-1.5">(BMI {p.bmi})</span>}
                              </td>
                              <td className="p-4">
                                {p.active_plan_name ? (
                                  <div>
                                    <span className="font-bold text-[#0D9488]">{p.active_plan_name}</span>
                                    <span className="text-[10px] text-slate-400 ml-1">v{p.active_plan_version}</span>
                                  </div>
                                ) : (
                                  <span className="text-slate-400 italic">No active plan</span>
                                )}
                              </td>
                              <td className="p-4">
                                {p.review_date ? (
                                  <span className="font-semibold text-slate-600">{new Date(p.review_date).toLocaleDateString()}</span>
                                ) : (
                                  <span className="text-slate-400">-</span>
                                )}
                              </td>
                              <td className="p-4 text-right">
                                <button
                                  onClick={() => openPatientWorkspace(p)}
                                  className="px-3.5 py-1.5 rounded-lg bg-[#1A1F36] text-white text-[11px] font-bold hover:bg-[#2C344E] transition-colors"
                                >
                                  Open Workspace
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ) : (
                  <div className="rounded-2xl border border-dashed border-[#E8DED4] p-12 text-center bg-white">
                    <Users className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                    <h3 className="text-sm font-bold text-[#1A1F36]">No patients assigned yet</h3>
                    <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                      Assigned patients from care programs or accepted doctor referrals will appear here.
                    </p>
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
                  {(['overview', 'assessment', 'plans', 'food-logs', 'progress', 'communication'] as const).map((tab) => (
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

                {/* Tab 6: Communication */}
                {workspaceTab === 'communication' && (
                  <div className="rounded-2xl border border-[#E8DED4] bg-white p-6 shadow-sm space-y-6">
                    <div>
                      <h3 className="text-base font-black text-[#1A1F36]">Structured Doctor Communication</h3>
                      <p className="text-xs text-slate-400 font-semibold">Send clinical updates or Treatment Review Requests to referring doctors</p>
                    </div>

                    <form
                      onSubmit={async (e) => {
                        e.preventDefault()
                        setSendingComm(true)
                        try {
                          const { data: { session } } = await supabase.auth.getSession()
                          const res = await fetch('/api/dietitian/communications', {
                            method: 'POST',
                            headers: {
                              'Content-Type': 'application/json',
                              Authorization: `Bearer ${session?.access_token || ''}`,
                            },
                            body: JSON.stringify({
                              patient_id: selectedPatient.id,
                              doctor_id: workspaceData?.referrals?.[0]?.doctor_id || selectedPatient.id,
                              communication_type: commType,
                              concern_summary: commSummary,
                              message: commMessage,
                            }),
                          })
                          const json = await res.json()
                          if (json.success) {
                            setSuccess('Clinical communication transmitted to doctor!')
                            setCommSummary('')
                            setCommMessage('')
                          }
                        } catch (err: any) {
                          setError(err.message || 'Error transmitting communication')
                        } finally {
                          setSendingComm(false)
                        }
                      }}
                      className="space-y-4 max-w-xl"
                    >
                      <div>
                        <label className="block text-xs font-bold text-slate-600 mb-1">Communication Type</label>
                        <select
                          value={commType}
                          onChange={(e) => setCommType(e.target.value)}
                          className="w-full px-3 py-2 border border-[#E8DED4] rounded-xl text-xs font-semibold"
                        >
                          <option value="CLINICAL_CONCERN">Clinical Concern</option>
                          <option value="PROGRESS_UPDATE">Progress Update</option>
                          <option value="TREATMENT_REVIEW_REQUEST">Treatment Review Request</option>
                          <option value="FOLLOW_UP_REQUEST">Follow-up Request</option>
                          <option value="NUTRITION_SUMMARY">Nutrition Summary</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-600 mb-1">Subject / Summary</label>
                        <input
                          type="text"
                          required
                          value={commSummary}
                          onChange={(e) => setCommSummary(e.target.value)}
                          placeholder="e.g. Hypoglycemia symptoms reported during fasting window"
                          className="w-full px-3 py-2 border border-[#E8DED4] rounded-xl text-xs"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-600 mb-1">Detailed Clinical Message</label>
                        <textarea
                          required
                          rows={4}
                          value={commMessage}
                          onChange={(e) => setCommMessage(e.target.value)}
                          placeholder="Describe your clinical observation for the attending physician..."
                          className="w-full px-3 py-2 border border-[#E8DED4] rounded-xl text-xs"
                        />
                      </div>
                      <button
                        type="submit"
                        disabled={sendingComm}
                        className="px-5 py-2.5 rounded-full bg-[#1A1F36] text-white text-xs font-bold hover:bg-[#2C344E] transition-colors"
                      >
                        {sendingComm ? 'Sending...' : 'Transmit to Doctor'}
                      </button>
                    </form>
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
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {plans.map((p) => (
                      <div key={p.id} className="p-5 rounded-2xl border border-[#E8DED4] bg-white shadow-sm space-y-3">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-bold text-base text-[#1A1F36]">{p.plan_name}</p>
                            <p className="text-xs text-slate-400">{p.profiles?.full_name || 'Patient'} • v{p.version}</p>
                          </div>
                          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase ${
                            p.status === 'PUBLISHED' ? 'bg-[#DCFCE7] text-[#166534]' : 'bg-[#FEF3C7] text-[#92400E]'
                          }`}>
                            {p.status}
                          </span>
                        </div>
                        <div className="text-xs text-slate-600">
                          {p.meals?.length || 0} scheduled meals • {p.daily_calorie_target || 1600} kcal/day
                        </div>
                        <div className="pt-2 flex items-center justify-between border-t border-slate-100">
                          <span className="text-[10px] text-slate-400">Review: {p.review_date || 'In 14 days'}</span>
                          {p.status === 'PUBLISHED' && (
                            <a
                              href={`/api/dietitian/plans/${p.id}/pdf`}
                              target="_blank"
                              rel="noreferrer"
                              className="text-xs font-bold text-[#0D9488] hover:underline flex items-center gap-1"
                            >
                              <Download className="w-3.5 h-3.5" />
                              <span>PDF</span>
                            </a>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
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

        {/* SECTION 5: DOCTOR REFERRALS */}
        {activeSection === 'referrals' && (
          <div className="space-y-6">
            <div>
              <h1 className="text-2xl font-black text-[#1A1F36]">Doctor Referrals</h1>
              <p className="text-xs text-slate-500 font-semibold">Incoming referrals from attending physicians for Medical Nutrition Therapy</p>
            </div>

            {referrals.length > 0 ? (
              <div className="space-y-4">
                {referrals.map((ref) => (
                  <div key={ref.id} className="p-5 rounded-2xl border border-[#E8DED4] bg-white shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-base text-[#1A1F36]">{ref.patient?.full_name || 'Patient'}</span>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                          ref.priority === 'URGENT' ? 'bg-[#FEE2E2] text-[#991B1B]' : 'bg-[#E0F2FE] text-[#0369A1]'
                        }`}>
                          {ref.priority} Priority
                        </span>
                        <span className="text-xs text-slate-400">• Referred by {ref.doctor?.full_name || 'Attending Physician'}</span>
                      </div>
                      <p className="text-xs font-semibold text-slate-700 mt-1">Reason: {ref.reason}</p>
                      {ref.clinical_notes && (
                        <p className="text-xs text-slate-500 mt-1 italic">Notes: "{ref.clinical_notes}"</p>
                      )}
                    </div>
                    {ref.status === 'PENDING' ? (
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleReferralAction(ref.id, 'ACCEPT')}
                          className="px-4 py-2 rounded-xl bg-[#0D9488] text-white text-xs font-bold hover:bg-[#0F766E] transition-colors"
                        >
                          Accept Referral
                        </button>
                        <button
                          onClick={() => handleReferralAction(ref.id, 'DECLINE')}
                          className="px-4 py-2 rounded-xl border border-[#E8DED4] text-[#B94D4D] text-xs font-bold hover:bg-slate-50 transition-colors"
                        >
                          Decline
                        </button>
                      </div>
                    ) : (
                      <span className={`px-3 py-1 rounded-full text-xs font-black uppercase ${
                        ref.status === 'ACCEPTED' ? 'bg-[#DCFCE7] text-[#166534]' : 'bg-slate-100 text-slate-500'
                      }`}>
                        {ref.status}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-[#E8DED4] p-12 text-center bg-white">
                <UserCheck className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                <h3 className="text-sm font-bold text-[#1A1F36]">No doctor referrals pending</h3>
                <p className="text-xs text-slate-400 mt-1">New patient referrals from doctors will appear here.</p>
              </div>
            )}
          </div>
        )}

        {/* SECTION 6: CONSULTATIONS */}
        {activeSection === 'consultations' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-black text-[#1A1F36]">Nutrition Consultations</h1>
                <p className="text-xs text-slate-500 font-semibold">Scheduled and historical telehealth sessions</p>
              </div>
              <Link
                href="/provider/schedule"
                className="px-4 py-2 rounded-full border border-[#E8DED4] text-xs font-bold text-[#1A1F36] hover:bg-white flex items-center gap-2"
              >
                <Calendar className="w-4 h-4 text-[#0D9488]" />
                <span>Manage Availability</span>
              </Link>
            </div>

            <div className="rounded-2xl border border-[#E8DED4] bg-white p-8 text-center shadow-sm">
              <Video className="w-10 h-10 text-[#0D9488] mx-auto mb-3" />
              <h3 className="text-sm font-bold text-[#1A1F36]">Telehealth Consultation Engine</h3>
              <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                Consultations use 8LIV's integrated WebRTC / Stream video infrastructure with zero setup required.
              </p>
              <div className="mt-4">
                <Link
                  href="/provider/consultations"
                  className="px-5 py-2.5 rounded-full bg-[#1A1F36] text-white text-xs font-bold hover:bg-[#2C344E] inline-block"
                >
                  View All Telehealth Sessions
                </Link>
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

