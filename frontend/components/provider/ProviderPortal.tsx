'use client'

import React, { useCallback, useEffect, useMemo, useState, createContext, useContext } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { Activity, Apple, CalendarDays, Dumbbell, FileText, LayoutDashboard, LogOut, MessageCircle, Search, Settings, Users, Video, Wallet } from 'lucide-react'
import { supabase } from '@/lib/supabaseClient'
import StaffChat from '@/components/StaffChat'
import ProviderAvailabilityScheduler, { AvailabilitySubmission } from '@/components/scheduling/ProviderAvailabilityScheduler'

type ProviderRole = 'doctor' | 'dietitian' | 'fitness_coach' | 'nutritionist'

type Provider = {
  id: string
  email?: string
  role: ProviderRole
  name: string
  specialization?: string | null
  qualification?: string | null
  status?: string | null
  photoUrl?: string | null
}

export interface ProviderDataContextValue {
  provider: Provider | null
  providerLoading: boolean
  error: string
  setError: React.Dispatch<React.SetStateAction<string>>
  authedFetch: (url: string, options?: RequestInit) => Promise<Response>
  signOut: () => Promise<void>
}

const ProviderDataContext = createContext<ProviderDataContextValue | null>(null)

export function ProviderDataProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const [provider, setProvider] = useState<Provider | null>(null)
  const [providerLoading, setProviderLoading] = useState(true)
  const [error, setError] = useState('')

  const authedFetch = useCallback(async (url: string, options: RequestInit = {}) => {
    const { data } = await supabase.auth.getSession()
    const token = data.session?.access_token
    if (!token) throw new Error('Please sign in again.')
    return fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
        ...(options.headers || {}),
      },
    })
  }, [])

  const loadProvider = useCallback(async () => {
    setProviderLoading(true)
    setError('')
    try {
      const me = await readCachedProviderJson('provider:me', () => authedFetch('/api/provider/me'))

      if (me.provider.role === 'doctor') {
        router.replace('/doctor/dashboard')
        return
      }

      setProvider(me.provider)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load provider portal.')
    } finally {
      setProviderLoading(false)
    }
  }, [authedFetch, router])

  useEffect(() => {
    loadProvider()
  }, [loadProvider])

  const signOut = async () => {
    clearProviderCache()
    await supabase.auth.signOut()
    document.cookie = 'user_role=; path=/; max-age=0'
    router.replace('/login')
  }

  return (
    <ProviderDataContext.Provider value={{ provider, providerLoading, error, setError, authedFetch, signOut }}>
      {children}
    </ProviderDataContext.Provider>
  )
}

export function useProviderData() {
  const context = useContext(ProviderDataContext)
  if (!context) {
    throw new Error('useProviderData must be used within a ProviderDataProvider')
  }
  return context
}

type Patient = {
  id: string
  name: string
  phone: string
  currentWeight: number | null
  goalWeight: number | null
  bmi: number | null
  membershipTier: string
  planStatus: string
  lastCheckIn: string | null
  nextAction: string
  foodPreferences?: unknown
  medicalRestrictions?: unknown
  fitnessPreference?: unknown
  limitations?: unknown
  doctorNotes?: unknown
}

type Summary = {
  assignedPatients: number
  activePlans: number
  pendingFollowUps: number
  avgCurrentWeight: number | null
  avgGoalWeight: number | null
}

type Plan = Record<string, any>
type ProviderConsultation = {
  id: string
  patientName: string
  staff_role: string
  roleLabel: string
  booking_date?: string
  booking_time?: string
  status?: string
  meetingUrl?: string
  canJoin?: boolean
  appointmentType?: string
}
type AvailabilitySlot = {
  id: string
  available_date: string
  start_time: string
  end_time: string
  is_available?: boolean
  source?: 'MANUAL' | 'GENERATED'
  status?: 'AVAILABLE' | 'BOOKED' | 'CANCELLED' | 'EXPIRED'
}
type WalletState = {
  provider_id?: string
  balance: number
  pending_payout: number
  completed_payout: number
  lifetime_earnings: number
}
type WalletTransaction = Record<string, any>

const emptySummary: Summary = {
  assignedPatients: 0,
  activePlans: 0,
  pendingFollowUps: 0,
  avgCurrentWeight: null,
  avgGoalWeight: null,
}

const nav = [
  { href: '/provider/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/provider/patients', label: 'Patients', icon: Users },
  { href: '/provider/schedule', label: 'Schedule', icon: CalendarDays },
  { href: '/provider/consultations', label: 'Consultations', icon: Video },
  { href: '/provider/plans', label: 'Plans', icon: FileText },
  { href: '/provider/messages', label: 'Messages', icon: MessageCircle },
  { href: '/provider/wallet', label: 'Wallet', icon: Wallet },
  { href: '/provider/profile', label: 'Profile', icon: Settings },
]

const formatWeight = (value: number | null) => value ? `${value} kg` : '-'
const formatDate = (value: string | null) => value ? new Date(value).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }) : '-'
const formatInr = (value: number | string | null | undefined) => `₹${Number(value || 0).toLocaleString('en-IN')}`
const formatPatientDetail = (value: unknown): string => {
  if (value === null || value === undefined || value === '') return 'No restrictions recorded'
  if (typeof value === 'string' || typeof value === 'number') return String(value)
  if (typeof value === 'boolean') return value ? 'Yes' : 'No'
  if (Array.isArray(value)) {
    const items = value.map(formatPatientDetail).filter(Boolean)
    return items.length ? items.join(', ') : 'No restrictions recorded'
  }
  if (typeof value === 'object') {
    const details = Object.entries(value as Record<string, unknown>)
      .filter(([, detail]) => detail !== null && detail !== undefined && detail !== '' && (!Array.isArray(detail) || detail.length > 0))
      .map(([key, detail]) => `${key.replaceAll('_', ' ')}: ${formatPatientDetail(detail)}`)
    return details.length ? details.join(' | ') : 'No restrictions recorded'
  }
  return String(value)
}
const formatTime = (time?: string | null) => {
  if (!time) return '-'
  const [hourText, minuteText] = String(time).split(':')
  const date = new Date()
  date.setHours(Number(hourText), Number(minuteText), 0, 0)
  return date.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
}

function roleCopy(role: ProviderRole) {
  if (role === 'doctor') {
    return {
      title: 'Doctor Portal',
      label: 'Doctor',
      icon: Activity,
      accent: '#1A1F36',
      soft: '#F5F0EB',
      module: 'Medical consultations',
      activeLabel: 'Completed Medical Reviews',
      pendingLabel: 'Pending Medical Reviews',
      planTitle: 'Create Medical Review',
      emptyPlans: 'Medical reviews will appear here after consultations are completed.',
    }
  }
  if (role === 'dietitian') {
    return {
      title: 'Dietitian Portal',
      label: 'Dietitian',
      icon: Apple,
      accent: '#C4622D',
      soft: '#FFF4EC',
      module: 'Diet planning',
      activeLabel: 'Active Diet Plans',
      pendingLabel: 'Pending Follow-ups',
      planTitle: 'Create Diet Plan',
      emptyPlans: 'Diet plans will appear here after you create them for assigned Gold plan patients.',
    }
  }
  if (role === 'fitness_coach') {
    return {
      title: 'Fitness Coach Portal',
      label: 'Fitness Coach',
      icon: Dumbbell,
      accent: '#5C7A6B',
      soft: '#EEF7F1',
      module: 'Fitness coaching',
      activeLabel: 'Active Workout Plans',
      pendingLabel: 'Pending Check-ins',
      planTitle: 'Create Workout Plan',
      emptyPlans: 'Workout plans will appear here after you create them for assigned Gold plan patients.',
    }
  }
  return {
    title: 'Nutritionist Portal',
    label: 'Nutritionist',
    icon: Activity,
    accent: '#C4622D',
    soft: '#FFF4EC',
    module: 'Nutrition support',
    activeLabel: 'Active Guidance',
    pendingLabel: 'Pending Follow-ups',
    planTitle: 'Create Nutrition Guidance',
    emptyPlans: 'Nutrition guidance will appear here after you create it for assigned Gold plan patients.',
  }
}

function classNames(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(' ')
}

const PROVIDER_CACHE_TTL_MS = 30_000
const providerApiCache = new Map<string, { data: any; fetchedAt: number }>()
const providerApiRequests = new Map<string, Promise<any>>()

async function readCachedProviderJson(key: string, fetcher: () => Promise<Response>, force = false) {
  const cached = providerApiCache.get(key)
  const cacheIsFresh = key === 'provider:me' || (cached && Date.now() - cached.fetchedAt < PROVIDER_CACHE_TTL_MS)
  if (!force && cached && cacheIsFresh) {
    return cached.data
  }

  const pendingRequest = providerApiRequests.get(key)
  if (!force && pendingRequest) {
    return pendingRequest
  }

  const request = fetcher()
    .then(async (response) => {
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Unable to load provider data.')
      providerApiCache.set(key, { data, fetchedAt: Date.now() })
      return data
    })
    .finally(() => {
      providerApiRequests.delete(key)
    })

  providerApiRequests.set(key, request)
  return request
}

function clearProviderCache(match?: string) {
  if (!match) {
    providerApiCache.clear()
    providerApiRequests.clear()
    return
  }

  for (const key of providerApiCache.keys()) {
    if (key.includes(match)) providerApiCache.delete(key)
  }
  for (const key of providerApiRequests.keys()) {
    if (key.includes(match)) providerApiRequests.delete(key)
  }
}

export default function ProviderPortal({ section }: { section: 'dashboard' | 'patients' | 'schedule' | 'consultations' | 'plans' | 'messages' | 'wallet' | 'profile' }) {
  const router = useRouter()
  const pathname = usePathname()
  const { provider, providerLoading, error, setError, authedFetch, signOut } = useProviderData()

  const [patients, setPatients] = useState<Patient[]>([])
  const [summary, setSummary] = useState<Summary>(emptySummary)
  const [plans, setPlans] = useState<Plan[]>([])
  const [consultations, setConsultations] = useState<ProviderConsultation[]>([])
  const [consultationStats, setConsultationStats] = useState<any>({})
  const [availability, setAvailability] = useState<AvailabilitySlot[]>([])
  const [walletState, setWalletState] = useState<WalletState>({ balance: 0, pending_payout: 0, completed_payout: 0, lifetime_earnings: 0 })
  const [walletTransactions, setWalletTransactions] = useState<WalletTransaction[]>([])
  const [walletPayouts, setWalletPayouts] = useState<any[]>([])
  const [selectedPatientId, setSelectedPatientId] = useState('')
  const [search, setSearch] = useState('')
  const [sectionLoading, setSectionLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState('')

  // Pagination & Search States for Patients and Consultations
  const [patientsPage, setPatientsPage] = useState(1)
  const [patientsTotalPages, setPatientsTotalPages] = useState(1)
  const [consultationsPage, setConsultationsPage] = useState(1)
  const [consultationsTotalPages, setConsultationsTotalPages] = useState(1)
  const [consultationsSearch, setConsultationsSearch] = useState('')
  const [consultationsStatus, setConsultationsStatus] = useState('')

  const handleSearchPatientsChange = (val: string) => {
    setSearch(val)
    setPatientsPage(1)
  }

  const copy = useMemo(() => roleCopy(provider?.role || 'dietitian'), [provider?.role])
  const RoleIcon = copy.icon

  const loadSectionData = useCallback(async (activeSection = section, force = false) => {
    if (!provider || activeSection === 'profile') return

    let endpoint = ''
    if (activeSection === 'dashboard') {
      endpoint = '/api/provider/dashboard'
    } else if (activeSection === 'patients') {
      endpoint = `/api/provider/patients?page=${patientsPage}&limit=25&search=${encodeURIComponent(search)}`
    } else if (activeSection === 'schedule') {
      endpoint = '/api/provider/availability'
    } else if (activeSection === 'consultations') {
      endpoint = `/api/provider/consultations?page=${consultationsPage}&limit=25&search=${encodeURIComponent(consultationsSearch)}&status=${consultationsStatus}`
    } else if (activeSection === 'plans') {
      endpoint = '/api/provider/plans'
    } else if (activeSection === 'messages') {
      endpoint = '/api/provider/messages'
    } else if (activeSection === 'wallet') {
      endpoint = '/api/provider/wallet'
    }

    if (!endpoint) return

    setSectionLoading(true)
    setError('')
    try {
      const data = await readCachedProviderJson(`${provider.id}:${endpoint}`, () => authedFetch(endpoint), force)

      if (activeSection === 'dashboard') {
        setSummary(data.summary || emptySummary)
        setPatients(data.patients || [])
        setConsultations(data.consultations || [])
        setConsultationStats(data.stats || {})
        setWalletState(data.wallet || { balance: 0, pending_payout: 0, completed_payout: 0, lifetime_earnings: 0 })
      }

      if (activeSection === 'patients') {
        setPatients(data.patients || [])
        setSummary(data.summary || emptySummary)
        setSelectedPatientId((data.patients || [])[0]?.id || '')
        if (data.totalPages !== undefined) setPatientsTotalPages(data.totalPages)
      }

      if (activeSection === 'schedule') {
        setAvailability(data.availability || [])
        setConsultations(data.consultations || [])
      }

      if (activeSection === 'consultations') {
        setConsultations(data.consultations || [])
        setConsultationStats(data.stats || {})
        if (data.totalPages !== undefined) setConsultationsTotalPages(data.totalPages)
      }

      if (activeSection === 'plans') {
        setPlans(data.plans || [])
        setPatients(data.patients || [])
        setSelectedPatientId((data.patients || [])[0]?.id || '')
      }

      if (activeSection === 'messages') {
        setPatients(data.patients || [])
      }

      if (activeSection === 'wallet') {
        setWalletState(data.wallet || { balance: 0, pending_payout: 0, completed_payout: 0, lifetime_earnings: 0 })
        setWalletTransactions(data.transactions || [])
        setWalletPayouts(data.payouts || [])
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : `Unable to load ${sectionLabel(activeSection).toLowerCase()}.`)
    } finally {
      setSectionLoading(false)
    }
  }, [authedFetch, provider, section, patientsPage, search, consultationsPage, consultationsSearch, consultationsStatus])

  useEffect(() => {
    if (!provider) return
    loadSectionData(section)
  }, [loadSectionData, provider, section])

  const filteredPatients = patients.filter((patient) => {
    const term = search.trim().toLowerCase()
    if (!term) return true
    return `${patient.name} ${patient.phone} ${patient.membershipTier}`.toLowerCase().includes(term)
  })



  const submitPlan = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setSaving(true)
    setError('')
    setSuccess('')

    const form = new FormData(event.currentTarget)
    const payload: Record<string, unknown> = { patientId: selectedPatientId }
    for (const [key, value] of form.entries()) payload[key] = value

    try {
      const res = await authedFetch('/api/provider/plans', {
        method: 'POST',
        body: JSON.stringify(payload),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Unable to save plan.')
      setSuccess(provider?.role === 'dietitian' ? 'Diet plan saved.' : provider?.role === 'nutritionist' ? 'Nutrition guidance saved.' : 'Workout plan saved.')
      event.currentTarget.reset()
      clearProviderCache('/api/provider/plans')
      clearProviderCache('/api/provider/dashboard')
      await loadSectionData('plans', true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to save plan.')
    } finally {
      setSaving(false)
    }
  }

  const updateConsultation = async (consultationId: string, action: 'complete' | 'missed' | 'cancel') => {
    setError('')
    setSuccess('')
    try {
      const res = await authedFetch('/api/provider/consultations', {
        method: 'PATCH',
        body: JSON.stringify({ consultationId, action }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Unable to update consultation.')
      setSuccess(action === 'complete' ? 'Session marked completed.' : action === 'missed' ? 'Session marked missed.' : 'Session cancelled.')
      clearProviderCache('/api/provider/consultations')
      clearProviderCache('/api/provider/wallet')
      clearProviderCache('/api/provider/dashboard')
      clearProviderCache('/api/provider/availability')
      await loadSectionData(section, true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to update consultation.')
    }
  }

  const generateAvailability = async (submission: AvailabilitySubmission) => {
    setSaving(true)
    setError('')
    setSuccess('')
    try {
      const res = await authedFetch('/api/provider/availability', {
        method: 'POST',
        body: JSON.stringify(submission),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Unable to generate availability.')
      setSuccess(data.message || 'Availability generated.')
      clearProviderCache('/api/provider/availability')
      await loadSectionData('schedule', true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to generate availability.')
      throw err
    } finally {
      setSaving(false)
    }
  }

  const deleteAvailability = async (slotId: string) => {
    setError('')
    setSuccess('')
    try {
      const res = await authedFetch(`/api/provider/availability?id=${slotId}`, { method: 'DELETE' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Unable to cancel slot.')
      setSuccess('Availability slot cancelled.')
      clearProviderCache('/api/provider/availability')
      await loadSectionData('schedule', true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to cancel slot.')
    }
  }

  if (providerLoading) {
    return (
      <main className="min-h-screen bg-[#F9F6F0] flex items-center justify-center">
        <div className="rounded-[24px] bg-white px-8 py-6 shadow-xl border border-[#E8DED4] text-[#1A1F36] font-bold">Loading provider portal...</div>
      </main>
    )
  }

  if (error && !provider) {
    return (
      <main className="min-h-screen bg-[#F9F6F0] flex items-center justify-center p-6">
        <div className="max-w-md rounded-[24px] bg-white p-8 shadow-xl border border-[#F2C8BE]">
          <p className="text-sm font-black uppercase tracking-[0.24em] text-[#C4622D]">Access unavailable</p>
          <h1 className="mt-3 text-2xl font-black text-[#1A1F36]">Provider portal could not load</h1>
          <p className="mt-3 text-[#6B7A90]">{error}</p>
          <Link href="/login" className="mt-6 inline-flex rounded-full bg-[#1A1F36] px-5 py-3 text-sm font-bold text-white">Back to login</Link>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-[#F9F6F0] text-[#1A1F36]">
      <div className="flex min-h-screen">
        <aside className="hidden w-[280px] shrink-0 border-r border-[#E8DED4] bg-[#1A1F36] text-white lg:sticky lg:top-0 lg:flex lg:h-screen lg:flex-col lg:overflow-hidden">
          <div className="shrink-0 p-5 pb-3">
            <div className="rounded-[22px] bg-white/10 p-5">
              <p className="text-[11px] font-black uppercase tracking-[0.28em] text-[#D46E53]">8liv</p>
              <h1 className="mt-2 text-xl font-black">Provider Care</h1>
              <p className="mt-1 text-sm text-white/60">{copy.module}</p>
            </div>
          </div>

          <nav className="min-h-0 flex-1 space-y-2 overflow-y-auto px-5 py-3 [scrollbar-width:thin] [scrollbar-color:rgba(255,255,255,0.25)_transparent]">
            {nav.map((item) => {
              const Icon = item.icon
              const active = pathname === item.href
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={classNames(
                    'flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-bold transition',
                    active ? 'bg-[#F9F6F0] text-[#1A1F36] shadow-lg' : 'text-white/72 hover:bg-white/10 hover:text-white'
                  )}
                >
                  <Icon className={classNames('h-5 w-5', active && 'text-[#C4622D]')} />
                  {item.label}
                </Link>
              )
            })}
          </nav>

          <div className="shrink-0 border-t border-white/10 bg-[#1A1F36] p-5">
            <div className="rounded-[22px] bg-[#F9F6F0] p-4 text-[#1A1F36] shadow-2xl shadow-black/20">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl text-white" style={{ background: `linear-gradient(135deg, ${copy.accent}, #1A1F36)` }}>
                  <RoleIcon className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-black">{provider?.name}</p>
                  <p className="text-xs font-bold text-[#6B7A90]">{copy.label}</p>
                </div>
              </div>
              <button onClick={signOut} className="mt-4 flex w-full items-center justify-center gap-2 rounded-full border border-[#1A1F36]/15 bg-white px-4 py-2 text-sm font-bold text-[#1A1F36]">
                <LogOut className="h-4 w-4" /> Logout
              </button>
            </div>
          </div>
        </aside>

        <section className="flex-1 overflow-hidden">
          <header className="sticky top-0 z-20 border-b border-[#E8DED4] bg-[#F9F6F0]/90 px-5 py-4 backdrop-blur md:px-8">
            <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
              <div>
                <p className="text-[11px] font-black uppercase tracking-[0.28em] text-[#C4622D]">{copy.title}</p>
                <h2 className="mt-1 text-2xl font-black tracking-tight md:text-3xl">{sectionLabel(section)}</h2>
              </div>
              <div className="hidden items-center gap-3 md:flex">
                <span className="rounded-full bg-white px-4 py-2 text-sm font-bold text-[#5C7A6B] shadow-sm border border-[#E8DED4]">{provider?.status || 'active'}</span>
              </div>
            </div>
            <nav className="mx-auto mt-4 flex max-w-7xl gap-2 overflow-x-auto pb-1 lg:hidden">
              {nav.map((item) => {
                const Icon = item.icon
                const active = pathname === item.href
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={classNames(
                      'flex shrink-0 items-center gap-2 rounded-full border px-4 py-2 text-xs font-black',
                      active ? 'border-[#C4622D] bg-[#FFF4EC] text-[#C4622D]' : 'border-[#E8DED4] bg-white text-[#1A1F36]'
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    {item.label}
                  </Link>
                )
              })}
            </nav>
          </header>

          <div className="mx-auto max-w-7xl px-5 py-6 md:px-8">
            {error && <div className="mb-5 rounded-2xl border border-[#F2C8BE] bg-[#FFF4EC] p-4 text-sm font-bold text-[#A84A33]">{error}</div>}
            {success && <div className="mb-5 rounded-2xl border border-[#BFE4CA] bg-[#EEF7F1] p-4 text-sm font-bold text-[#3F6B50]">{success}</div>}
            {sectionLoading && (
              <div className="min-h-[40vh] flex flex-col items-center justify-center text-[#C4622D] gap-3">
                <div className="w-10 h-10 border-4 border-current border-t-transparent rounded-full animate-spin" />
                <span className="text-xs font-bold text-[#6B7A90] uppercase tracking-wider">
                  Loading {sectionLabel(section).toLowerCase()}...
                </span>
              </div>
            )}

            {section === 'dashboard' && !sectionLoading && <Dashboard summary={summary} patients={patients} consultations={consultations} stats={consultationStats} wallet={walletState} copy={copy} onComplete={(id) => updateConsultation(id, 'complete')} />}
            {section === 'patients' && !sectionLoading && (
              <Patients
                patients={patients}
                search={search}
                setSearch={handleSearchPatientsChange}
                patientsPage={patientsPage}
                patientsTotalPages={patientsTotalPages}
                setPatientsPage={setPatientsPage}
                copy={copy}
              />
            )}
            {section === 'schedule' && !sectionLoading && <Schedule availability={availability} consultations={consultations} providerLabel={copy.label} saving={saving} onGenerate={generateAvailability} onDelete={deleteAvailability} />}
            {section === 'consultations' && !sectionLoading && (
              <Consultations
                consultations={consultations}
                stats={consultationStats}
                onAction={updateConsultation}
                search={consultationsSearch}
                setSearch={setConsultationsSearch}
                status={consultationsStatus}
                setStatus={setConsultationsStatus}
                page={consultationsPage}
                totalPages={consultationsTotalPages}
                setPage={setConsultationsPage}
              />
            )}
            {section === 'plans' && !sectionLoading && (
              <Plans
                provider={provider}
                patients={patients}
                plans={plans}
                selectedPatientId={selectedPatientId}
                setSelectedPatientId={setSelectedPatientId}
                submitPlan={submitPlan}
                saving={saving}
                copy={copy}
              />
            )}
            {section === 'messages' && provider && !sectionLoading && (
              patients.length ? (
                <div className="rounded-[28px] bg-white p-5 shadow-sm border border-[#E8DED4]">
                  <StaffChat
                    staffId={provider.id}
                    staffName={provider.name}
                    patients={patients.map((patient) => ({ id: patient.id, first_name: patient.name, last_name: '' }))}
                    accentColor={copy.accent}
                  />
                </div>
              ) : <EmptyState />
            )}
            {section === 'wallet' && !sectionLoading && (
              <WalletModule
                wallet={walletState}
                transactions={walletTransactions}
                payouts={walletPayouts}
                onRefresh={() => loadSectionData('wallet', true)}
                authedFetch={authedFetch}
              />
            )}
            {section === 'profile' && <Profile provider={provider} copy={copy} />}
          </div>
        </section>
      </div>
    </main>
  )
}

function sectionLabel(section: string) {
  if (section === 'dashboard') return 'Care Dashboard'
  if (section === 'patients') return 'Assigned Patients'
  if (section === 'schedule') return 'Provider Schedule'
  if (section === 'consultations') return 'Video Consultations'
  if (section === 'plans') return 'Care Plans'
  if (section === 'messages') return 'Patient Messages'
  if (section === 'wallet') return 'Provider Wallet'
  return 'Provider Profile'
}

function Dashboard({ summary, patients, consultations, stats, wallet, copy, onComplete }: {
  summary: Summary
  patients: Patient[]
  consultations: ProviderConsultation[]
  stats: any
  wallet: WalletState
  copy: any
  onComplete: (consultationId: string) => void
}) {
  const cards = [
    { label: 'Assigned Patients', value: summary.assignedPatients, sub: 'Gold plan members' },
    { label: "Today's Sessions", value: stats.today || 0, sub: 'Scheduled today' },
    { label: 'Upcoming Sessions', value: stats.upcoming || 0, sub: 'Ready to attend' },
    { label: 'Completed Sessions', value: stats.completed || 0, sub: 'Finished sessions' },
    { label: copy.pendingLabel, value: summary.pendingFollowUps, sub: 'Needs next action' },
    { label: 'Wallet Balance', value: formatInr(wallet.balance), sub: 'Credited earnings' },
  ]

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {cards.map((card) => (
          <div key={card.label} className="rounded-[24px] border border-[#E8DED4] bg-white p-5 shadow-sm">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-[#6B7A90]">{card.label}</p>
            <p className="mt-4 text-3xl font-black text-[#1A1F36]">{card.value}</p>
            <p className="mt-1 text-sm font-semibold text-[#6B7A90]">{card.sub}</p>
          </div>
        ))}
      </div>

      <div className="rounded-[28px] border border-[#E8DED4] bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.22em] text-[#C4622D]">Today</p>
            <h3 className="mt-1 text-xl font-black">Next Actions</h3>
          </div>
          <Link href="/provider/patients" className="rounded-full bg-[#1A1F36] px-4 py-2 text-sm font-bold text-white">View patients</Link>
        </div>
        {patients.length ? (
          <div className="mt-5 grid gap-3">
            {patients.slice(0, 4).map((patient) => (
              <div key={patient.id} className="flex flex-col gap-3 rounded-2xl bg-[#F9F6F0] p-4 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="font-black">{patient.name}</p>
                  <p className="text-sm font-semibold text-[#6B7A90]">{patient.nextAction}</p>
                </div>
                <span className="w-fit rounded-full px-3 py-1 text-xs font-black uppercase tracking-wide" style={{ background: copy.soft, color: copy.accent }}>
                  {patient.planStatus.replace('_', ' ')}
                </span>
              </div>
            ))}
          </div>
        ) : <EmptyState />}
      </div>

      <div className="rounded-[28px] border border-[#E8DED4] bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.22em] text-[#C4622D]">Jitsi video</p>
            <h3 className="mt-1 text-xl font-black">Assigned Consultations</h3>
          </div>
          <Link href="/provider/plans" className="rounded-full border border-[#1A1F36]/15 bg-white px-4 py-2 text-sm font-bold text-[#1A1F36]">Care plans</Link>
        </div>
        {consultations.length ? (
          <div className="mt-5 grid gap-3">
            {consultations.slice(0, 6).map((session) => {
              const terminal = ['completed', 'cancelled', 'cancelled_by_doctor', 'cancelled_by_patient', 'missed', 'missed_by_patient'].includes(String(session.status || '').toLowerCase())
              return (
                <div key={session.id} className="rounded-2xl bg-[#F9F6F0] p-4">
                  <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <div>
                      <p className="font-black">{session.patientName}</p>
                      <p className="text-sm font-semibold text-[#6B7A90]">{session.roleLabel} | {session.booking_date || '-'} at {session.booking_time || '-'}</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <a
                        href={session.canJoin && session.meetingUrl ? session.meetingUrl : undefined}
                        target="_blank"
                        className={classNames(
                          'rounded-full px-4 py-2 text-xs font-black',
                          session.canJoin && session.meetingUrl ? 'bg-[#1A1F36] text-white' : 'pointer-events-none bg-[#E8DED4] text-[#6B7A90]'
                        )}
                      >
                        {terminal ? 'Join Disabled' : session.canJoin ? 'Join Jitsi' : 'Opens 15 min before'}
                      </a>
                      {!terminal && (
                        <button onClick={() => onComplete(session.id)} className="rounded-full border border-[#1A1F36]/15 bg-white px-4 py-2 text-xs font-black text-[#1A1F36]">
                          Complete
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        ) : <p className="mt-5 rounded-2xl bg-[#F9F6F0] p-5 text-sm font-semibold text-[#6B7A90]">Assigned video consultations will appear here.</p>}
      </div>
    </div>
  )
}

function Schedule({ availability, consultations, providerLabel, saving, onGenerate, onDelete }: {
  availability: AvailabilitySlot[]
  consultations: ProviderConsultation[]
  providerLabel: string
  saving: boolean
  onGenerate: (submission: AvailabilitySubmission) => Promise<void>
  onDelete: (slotId: string) => void
}) {
  const now = Date.now()
  const futureSlots = availability.filter((slot) => new Date(`${slot.available_date}T${slot.start_time}`).getTime() > now)
  const bookedKeys = new Set(
    consultations
      .filter((consultation) => ['scheduled', 'calling', 'attended'].includes(String(consultation.status || '').toLowerCase()))
      .map((consultation) => `${consultation.booking_date}-${formatTimeKey(consultation.booking_time)}`)
  )

  return (
    <div className="space-y-6">
      <ProviderAvailabilityScheduler providerLabel={providerLabel.toLowerCase()} onGenerate={onGenerate} isSaving={saving} />
      <div className="grid gap-6 xl:grid-cols-2">
        <SlotList
          title="Available Slots"
          slots={futureSlots.filter((slot) => !bookedKeys.has(`${slot.available_date}-${formatTimeKey(slot.start_time)}`))}
          empty="No future availability slots."
          onDelete={onDelete}
        />
        <div className="rounded-[28px] border border-[#E8DED4] bg-white p-6 shadow-sm">
          <h3 className="text-xl font-black">Booked Slots</h3>
          {consultations.filter((item) => ['scheduled', 'calling', 'attended'].includes(String(item.status || '').toLowerCase())).length ? (
            <div className="mt-5 space-y-3">
              {consultations
                .filter((item) => ['scheduled', 'calling', 'attended'].includes(String(item.status || '').toLowerCase()))
                .map((item) => (
                  <div key={item.id} className="rounded-2xl bg-[#F9F6F0] p-4">
                    <p className="font-black">{item.patientName}</p>
                    <p className="mt-1 text-sm font-semibold text-[#6B7A90]">{item.booking_date || '-'} at {formatTime(item.booking_time)}</p>
                  </div>
                ))}
            </div>
          ) : <p className="mt-5 rounded-2xl bg-[#F9F6F0] p-5 text-sm font-semibold text-[#6B7A90]">Booked slots will appear here.</p>}
        </div>
      </div>
    </div>
  )
}

function SlotList({ title, slots, empty, onDelete }: { title: string; slots: AvailabilitySlot[]; empty: string; onDelete: (slotId: string) => void }) {
  return (
    <div className="rounded-[28px] border border-[#E8DED4] bg-white p-6 shadow-sm">
      <h3 className="text-xl font-black">{title}</h3>
      {slots.length ? (
        <div className="mt-5 space-y-3">
          {slots.slice(0, 40).map((slot) => (
            <div key={slot.id} className="flex items-center justify-between gap-3 rounded-2xl bg-[#F9F6F0] p-4">
              <div>
                <p className="font-black">{formatDate(slot.available_date)}</p>
                <p className="mt-1 text-sm font-semibold text-[#6B7A90]">{formatTime(slot.start_time)} - {formatTime(slot.end_time)} | {slot.source || 'GENERATED'} | {slot.status || 'AVAILABLE'}</p>
              </div>
              <button onClick={() => onDelete(slot.id)} className="rounded-full border border-[#F2C8BE] bg-[#FFF4EC] px-4 py-2 text-xs font-black text-[#A84A33]">Cancel</button>
            </div>
          ))}
        </div>
      ) : <p className="mt-5 rounded-2xl bg-[#F9F6F0] p-5 text-sm font-semibold text-[#6B7A90]">{empty}</p>}
    </div>
  )
}

function Consultations({
  consultations,
  stats,
  onAction,
  search,
  setSearch,
  status,
  setStatus,
  page,
  totalPages,
  setPage
}: {
  consultations: ProviderConsultation[]
  stats: any
  onAction: (consultationId: string, action: 'complete' | 'missed' | 'cancel') => void
  search: string
  setSearch: (value: string) => void
  status: string
  setStatus: (value: string) => void
  page: number
  totalPages: number
  setPage: React.Dispatch<React.SetStateAction<number>>
}) {
  const statCards = [
    { label: 'Today', value: stats.today || 0 },
    { label: 'Upcoming', value: stats.upcoming || 0 },
    { label: 'Completed', value: stats.completed || 0 },
    { label: 'Missed', value: stats.missed || 0 },
    { label: 'Cancelled', value: stats.cancelled || 0 },
  ]

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {statCards.map((card) => (
          <div key={card.label} className="rounded-[24px] border border-[#E8DED4] bg-white p-5 shadow-sm">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-[#6B7A90]">{card.label}</p>
            <p className="mt-4 text-3xl font-black text-[#1A1F36]">{card.value}</p>
          </div>
        ))}
      </div>
      <div className="rounded-[28px] border border-[#E8DED4] bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between mb-5">
          <h3 className="text-xl font-black">Assigned Video Sessions</h3>
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#6B7A90]" />
              <input
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value)
                  setPage(1)
                }}
                placeholder="Search sessions..."
                className="rounded-full border border-[#E8DED4] bg-[#F9F6F0] py-2.5 pl-11 pr-4 text-xs font-semibold outline-none focus:border-[#C4622D] w-full sm:w-60"
              />
            </div>
            <select
              value={status}
              onChange={(e) => {
                setStatus(e.target.value)
                setPage(1)
              }}
              className="rounded-full border border-[#E8DED4] bg-[#F9F6F0] px-4 py-2.5 text-xs font-semibold outline-none focus:border-[#C4622D]"
            >
              <option value="">All Statuses</option>
              <option value="scheduled">Scheduled</option>
              <option value="completed">Completed</option>
              <option value="missed_by_patient">Missed by Patient</option>
              <option value="cancelled_by_doctor">Cancelled by Doctor</option>
              <option value="cancelled_by_patient">Cancelled by Patient</option>
            </select>
          </div>
        </div>
        {consultations.length ? (
          <div className="mt-5 overflow-x-auto">
            <table className="w-full min-w-[900px] text-left">
              <thead>
                <tr className="border-b border-[#E8DED4] text-xs font-black uppercase tracking-[0.16em] text-[#6B7A90]">
                  <th className="py-4">Patient</th><th>Date</th><th>Time</th><th>Type</th><th>Status</th><th>Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E8DED4]">
                {consultations.map((session) => {
                  const status = String(session.status || '').toLowerCase()
                  const terminal = ['completed', 'cancelled', 'cancelled_by_doctor', 'cancelled_by_patient', 'missed', 'missed_by_patient'].includes(status)
                  return (
                    <tr key={session.id}>
                      <td className="py-4 font-black">{session.patientName}</td>
                      <td className="py-4 text-sm font-semibold text-[#6B7A90]">{session.booking_date || '-'}</td>
                      <td className="py-4 text-sm font-semibold text-[#6B7A90]">{formatTime(session.booking_time)}</td>
                      <td className="py-4 text-sm font-bold">{session.appointmentType || session.roleLabel}</td>
                      <td className="py-4"><span className="rounded-full bg-[#F9F6F0] px-3 py-1 text-xs font-black uppercase">{session.status || 'scheduled'}</span></td>
                      <td className="py-4">
                        <div className="flex flex-wrap gap-2">
                          <a href={session.canJoin && session.meetingUrl ? session.meetingUrl : undefined} target="_blank" className={classNames('rounded-full px-3 py-2 text-xs font-black', session.canJoin && session.meetingUrl ? 'bg-[#1A1F36] text-white' : 'pointer-events-none bg-[#E8DED4] text-[#6B7A90]')}>Join</a>
                          {!terminal && <button onClick={() => onAction(session.id, 'complete')} className="rounded-full border border-[#1A1F36]/15 bg-white px-3 py-2 text-xs font-black">Complete</button>}
                          {!terminal && <button onClick={() => onAction(session.id, 'missed')} className="rounded-full border border-[#D89A3D]/25 bg-[#FFF8EC] px-3 py-2 text-xs font-black text-[#A86812]">Missed</button>}
                          {!terminal && <button onClick={() => onAction(session.id, 'cancel')} className="rounded-full border border-[#F2C8BE] bg-[#FFF4EC] px-3 py-2 text-xs font-black text-[#A84A33]">Cancel</button>}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        ) : <p className="mt-5 rounded-2xl bg-[#F9F6F0] p-5 text-sm font-semibold text-[#6B7A90]">Assigned video consultations will appear here.</p>}

        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-[#E8DED4] pt-4 mt-6">
            <button
              disabled={page === 1}
              onClick={() => setPage((prev) => Math.max(prev - 1, 1))}
              className="rounded-full border border-[#1A1F36]/15 bg-white px-4 py-2 text-xs font-black text-[#1A1F36] disabled:opacity-50 transition cursor-pointer"
            >
              Previous
            </button>
            <span className="text-xs font-bold text-[#6B7A90]">
              Page {page} of {totalPages}
            </span>
            <button
              disabled={page === totalPages}
              onClick={() => setPage((prev) => Math.min(prev + 1, totalPages))}
              className="rounded-full border border-[#1A1F36]/15 bg-white px-4 py-2 text-xs font-black text-[#1A1F36] disabled:opacity-50 transition cursor-pointer"
            >
              Next
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

function WalletModule({
  wallet,
  transactions,
  payouts,
  onRefresh,
  authedFetch,
}: {
  wallet: WalletState
  transactions: WalletTransaction[]
  payouts: any[]
  onRefresh: () => void
  authedFetch: (url: string, options?: RequestInit) => Promise<Response>
}) {
  const [showPayoutModal, setShowPayoutModal] = useState(false)
  const [payoutAmount, setPayoutAmount] = useState('')
  const [requesting, setRequesting] = useState(false)
  const [modalError, setModalError] = useState('')

  const availableBalance = wallet.balance - wallet.pending_payout

  const handleRequestPayout = async (e: React.FormEvent) => {
    e.preventDefault()
    setModalError('')
    const amountVal = parseFloat(payoutAmount)
    
    if (isNaN(amountVal) || amountVal <= 0) {
      setModalError('Please enter a valid payout amount.')
      return
    }
    if (amountVal > availableBalance) {
      setModalError('Requested amount exceeds your available balance.')
      return
    }

    setRequesting(true)
    try {
      const idempotencyKey = `payout:${wallet.provider_id || 'provider'}:${Date.now()}:${Math.random().toString(36).substring(2, 11)}`
      const res = await authedFetch('/api/provider/payout/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: amountVal, idempotencyKey }),
      })
      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || 'Failed to submit payout request.')
      }
      alert('Payout request submitted successfully! ✅')
      setShowPayoutModal(false)
      setPayoutAmount('')
      onRefresh()
    } catch (err: any) {
      setModalError(err.message || 'Something went wrong.')
    } finally {
      setRequesting(false)
    }
  }

  const cards = [
    { label: 'Wallet Balance', value: formatInr(wallet.balance) },
    { label: 'Pending Payout', value: formatInr(wallet.pending_payout) },
    { label: 'Completed Payout', value: formatInr(wallet.completed_payout) },
    { label: 'Lifetime Earnings', value: formatInr(wallet.lifetime_earnings) },
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.18em] text-[#C4622D]">Financial Settlements</p>
          <h2 className="text-3xl font-black text-[#1A1F36]">Provider Earnings Wallet</h2>
        </div>
        <button
          onClick={() => {
            setModalError('')
            setPayoutAmount('')
            setShowPayoutModal(true)
          }}
          className="rounded-full bg-[#1A1F36] hover:bg-[#1A1F36]/90 text-white px-6 py-3 text-sm font-black transition-colors"
        >
          Request Payout
        </button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => (
          <div key={card.label} className="rounded-[24px] border border-[#E8DED4] bg-white p-5 shadow-sm">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-[#6B7A90]">{card.label}</p>
            <p className="mt-4 text-3xl font-black text-[#1A1F36]">{card.value}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        {/* Transaction History */}
        <div className="rounded-[28px] border border-[#E8DED4] bg-white p-6 shadow-sm">
          <h3 className="text-xl font-black">Transaction History</h3>
          {transactions.length ? (
            <div className="mt-5 space-y-3">
              {transactions.map((tx) => (
                <div key={tx.id} className="flex flex-col gap-2 rounded-2xl bg-[#F9F6F0] p-4 md:flex-row md:items-center md:justify-between">
                  <div>
                    <p className="font-black">{tx.description || tx.transaction_type}</p>
                    <p className="text-sm font-semibold text-[#6B7A90]">
                      {tx.metadata?.appointmentType || 'Consultation'} | {formatDate(tx.created_at)}
                    </p>
                  </div>
                  <div className="text-left md:text-right">
                    <p className={`font-black ${tx.amount < 0 ? 'text-[#B94D4D]' : 'text-[#5C7A6B]'}`}>
                      {tx.amount < 0 ? '-' : '+'}{formatInr(Math.abs(tx.amount))}
                    </p>
                    <span className={`inline-block rounded-full px-2.5 py-0.5 text-[10px] font-black uppercase ${
                      tx.status === 'SUCCESS' ? 'bg-[#5C7A6B]/12 text-[#5C7A6B]' : 'bg-[#D96A6A]/12 text-[#B94D4D]'
                    }`}>
                      {tx.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-5 rounded-2xl bg-[#F9F6F0] p-5 text-sm font-semibold text-[#6B7A90]">
              Earnings appear only after completed attended sessions.
            </p>
          )}
        </div>

        {/* Payout History */}
        <div className="rounded-[28px] border border-[#E8DED4] bg-white p-6 shadow-sm">
          <h3 className="text-xl font-black">Payout History</h3>
          {payouts.length ? (
            <div className="mt-5 space-y-3">
              {payouts.map((p) => {
                const status = String(p.payout_status || 'PENDING').toUpperCase()
                const statusColors: Record<string, string> = {
                  PENDING: 'bg-[#D89A3D]/12 text-[#B7792F]',
                  PROCESSING: 'bg-[#1A1F36]/8 text-[#1A1F36] animate-pulse',
                  COMPLETED: 'bg-[#5C7A6B]/12 text-[#5C7A6B]',
                  FAILED: 'bg-[#D96A6A]/12 text-[#B94D4D]'
                }
                return (
                  <div key={p.id} className="flex flex-col gap-2 rounded-2xl bg-[#F9F6F0] p-4 md:flex-row md:items-center md:justify-between">
                    <div>
                      <p className="font-black">Payout Withdrawal</p>
                      <p className="text-sm font-semibold text-[#6B7A90]">
                        Requested: {formatDate(p.initiated_at)}
                      </p>
                      {status === 'FAILED' && p.failure_reason && (
                        <p className="mt-1 text-xs text-[#B94D4D] font-medium max-w-xs">{p.failure_reason}</p>
                      )}
                    </div>
                    <div className="text-left md:text-right">
                      <p className="font-black text-[#1A1F36]">{formatInr(p.payout_amount)}</p>
                      <span className={`inline-block rounded-full px-2.5 py-0.5 text-[10px] font-black uppercase ${statusColors[status] || statusColors.PENDING}`}>
                        {status}
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <p className="mt-5 rounded-2xl bg-[#F9F6F0] p-5 text-sm font-semibold text-[#6B7A90]">
              No payout withdrawal history found.
            </p>
          )}
        </div>
      </div>

      {showPayoutModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            onClick={() => setShowPayoutModal(false)}
            className="absolute inset-0 bg-[#1A1F36]/60 backdrop-blur-sm"
          />
          <div className="relative w-full max-w-md overflow-hidden rounded-[28px] border border-[#E8DED4] bg-white p-6 shadow-xl">
            <h3 className="text-xl font-black text-[#1A1F36] mb-2">Request Payout</h3>
            <p className="text-sm font-semibold text-[#6B7A90] mb-6">
              Transfer funds from your wallet balance to your configured bank account/UPI.
            </p>

            <form onSubmit={handleRequestPayout} className="space-y-4">
              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-[#6B7A90] mb-2">
                  Available Balance
                </label>
                <div className="rounded-xl bg-[#F9F6F0] px-4 py-3 text-lg font-black text-[#1A1F36]">
                  {formatInr(availableBalance)}
                </div>
              </div>

              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-[#6B7A90] mb-2">
                  Payout Amount (Rs)
                </label>
                <input
                  type="number"
                  value={payoutAmount}
                  onChange={(e) => setPayoutAmount(e.target.value)}
                  placeholder="Enter amount to withdraw"
                  required
                  className="w-full rounded-xl border border-[#E8DED4] bg-[#F9F6F0] px-4 py-3 text-sm font-semibold outline-none focus:border-[#C4622D]"
                />
              </div>

              {modalError && (
                <p className="text-sm font-bold text-[#B94D4D] bg-[#D96A6A]/10 p-3 rounded-xl">
                  {modalError}
                </p>
              )}

              <div className="mt-6 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowPayoutModal(false)}
                  className="rounded-full border border-[#E8DED4] px-5 py-2.5 text-xs font-black uppercase tracking-wider hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={requesting}
                  className="rounded-full bg-[#1A1F36] px-6 py-2.5 text-xs font-black uppercase tracking-wider text-white hover:bg-[#1A1F36]/90 transition-colors disabled:opacity-50"
                >
                  {requesting ? 'Requesting...' : 'Request Payout'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

function formatTimeKey(time?: string | null) {
  if (!time) return ''
  const [hour, minute] = String(time).split(':')
  return `${String(Number(hour)).padStart(2, '0')}:${minute}`
}

function Patients({
  patients,
  search,
  setSearch,
  patientsPage,
  patientsTotalPages,
  setPatientsPage,
  copy
}: {
  patients: Patient[]
  search: string
  setSearch: (value: string) => void
  patientsPage: number
  patientsTotalPages: number
  setPatientsPage: React.Dispatch<React.SetStateAction<number>>
  copy: any
}) {
  return (
    <div className="rounded-[28px] border border-[#E8DED4] bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.22em] text-[#C4622D]">Gold plan only</p>
          <h3 className="mt-1 text-xl font-black">Assigned Patient Roster</h3>
        </div>
        <div className="relative">
          <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#6B7A90]" />
          <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search patients" className="w-full rounded-full border border-[#E8DED4] bg-[#F9F6F0] py-3 pl-11 pr-4 text-sm font-semibold outline-none focus:border-[#C4622D] md:w-72" />
        </div>
      </div>

      {patients.length ? (
        <div className="mt-5 overflow-x-auto">
          <table className="w-full min-w-[900px] text-left">
            <thead>
              <tr className="border-b border-[#E8DED4] text-xs font-black uppercase tracking-[0.16em] text-[#6B7A90]">
                <th className="py-4">Name</th>
                <th>Phone</th>
                <th>Current</th>
                <th>Goal</th>
                <th>Membership</th>
                <th>Plan</th>
                <th>Last Check-in</th>
                <th>Next Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E8DED4]">
              {patients.map((patient) => (
                <tr key={patient.id} className="align-top">
                  <td className="py-4 font-black">{patient.name}</td>
                  <td className="py-4 text-sm font-semibold text-[#6B7A90]">{patient.phone}</td>
                  <td className="py-4 font-bold">{formatWeight(patient.currentWeight)}</td>
                  <td className="py-4 font-bold">{formatWeight(patient.goalWeight)}</td>
                  <td className="py-4"><span className="rounded-full bg-[#FFF4EC] px-3 py-1 text-xs font-black text-[#C4622D]">{patient.membershipTier}</span></td>
                  <td className="py-4"><span className="rounded-full px-3 py-1 text-xs font-black" style={{ background: copy.soft, color: copy.accent }}>{patient.planStatus.replace('_', ' ')}</span></td>
                  <td className="py-4 text-sm font-semibold text-[#6B7A90]">{formatDate(patient.lastCheckIn)}</td>
                  <td className="py-4 text-sm font-black text-[#1A1F36]">{patient.nextAction}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : <EmptyState />}

      {/* Pagination Controls */}
      {patientsTotalPages > 1 && (
        <div className="flex items-center justify-between border-t border-[#E8DED4] pt-4 mt-6">
          <button
            disabled={patientsPage === 1}
            onClick={() => setPatientsPage((prev) => Math.max(prev - 1, 1))}
            className="rounded-full border border-[#1A1F36]/15 bg-white px-4 py-2 text-xs font-black text-[#1A1F36] disabled:opacity-50 transition cursor-pointer"
          >
            Previous
          </button>
          <span className="text-xs font-bold text-[#6B7A90]">
            Page {patientsPage} of {patientsTotalPages}
          </span>
          <button
            disabled={patientsPage === patientsTotalPages}
            onClick={() => setPatientsPage((prev) => Math.min(prev + 1, patientsTotalPages))}
            className="rounded-full border border-[#1A1F36]/15 bg-white px-4 py-2 text-xs font-black text-[#1A1F36] disabled:opacity-50 transition cursor-pointer"
          >
            Next
          </button>
        </div>
      )}
    </div>
  )
}

function Plans(props: {
  provider: Provider | null
  patients: Patient[]
  plans: Plan[]
  selectedPatientId: string
  setSelectedPatientId: (id: string) => void
  submitPlan: (event: React.FormEvent<HTMLFormElement>) => void
  saving: boolean
  copy: any
}) {
  const selectedPatient = props.patients.find((patient) => patient.id === props.selectedPatientId)
  const isDietitian = props.provider?.role === 'dietitian'
  const isNutritionist = props.provider?.role === 'nutritionist'

  return (
    <div className="grid gap-6 xl:grid-cols-[1fr_420px]">
      <div className="rounded-[28px] border border-[#E8DED4] bg-white p-6 shadow-sm">
        <p className="text-[11px] font-black uppercase tracking-[0.22em] text-[#C4622D]">{props.copy.planTitle}</p>
        <h3 className="mt-1 text-2xl font-black">Assigned care plan</h3>
        {!props.patients.length ? (
          <EmptyState />
        ) : (
          <form onSubmit={props.submitPlan} className="mt-6 space-y-5">
            <Field label="Patient">
              <select value={props.selectedPatientId} onChange={(event) => props.setSelectedPatientId(event.target.value)} className="input">
                {props.patients.map((patient) => <option key={patient.id} value={patient.id}>{patient.name}</option>)}
              </select>
            </Field>

            {selectedPatient && (
              <div className="rounded-2xl bg-[#F9F6F0] p-4">
                <p className="text-sm font-black">{selectedPatient.name}</p>
                <p className="mt-1 text-sm font-semibold text-[#6B7A90]">
                  BMI {selectedPatient.bmi || '-'} | Current {formatWeight(selectedPatient.currentWeight)} | Goal {formatWeight(selectedPatient.goalWeight)}
                </p>
                <p className="mt-2 text-xs font-semibold text-[#6B7A90]">
                  {formatPatientDetail(isDietitian || isNutritionist ? selectedPatient.medicalRestrictions : selectedPatient.limitations)}
                </p>
              </div>
            )}

            {isDietitian ? <DietForm /> : isNutritionist ? <NutritionGuidanceForm /> : <FitnessForm />}

            <button disabled={props.saving} className="rounded-full bg-[#1A1F36] px-6 py-3 text-sm font-black text-white disabled:opacity-60">
              {props.saving ? 'Saving...' : isDietitian ? 'Save Diet Plan' : isNutritionist ? 'Save Nutrition Guidance' : 'Save Workout Plan'}
            </button>
          </form>
        )}
      </div>

      <div className="rounded-[28px] border border-[#E8DED4] bg-white p-6 shadow-sm">
        <h3 className="text-xl font-black">Recent Plans</h3>
        {props.plans.length ? (
          <div className="mt-5 space-y-3">
            {props.plans.slice(0, 8).map((plan) => {
              const patient = props.patients.find((p) => p.id === plan.patient_id)
              return (
                <div key={plan.id} className="rounded-2xl bg-[#F9F6F0] p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-black">{patient?.name || 'Patient'}</p>
                      <p className="mt-1 text-sm font-semibold text-[#6B7A90]">
                        {isDietitian
                          ? `${plan.calories_per_day} kcal/day`
                          : isNutritionist
                            ? plan.guidance_focus
                            : `${plan.workout_type} | ${plan.weekly_frequency}x/week`}
                      </p>
                    </div>
                    <span className="rounded-full px-3 py-1 text-xs font-black" style={{ background: props.copy.soft, color: props.copy.accent }}>{plan.status}</span>
                  </div>
                </div>
              )
            })}
          </div>
        ) : <p className="mt-5 rounded-2xl bg-[#F9F6F0] p-5 text-sm font-semibold text-[#6B7A90]">{props.copy.emptyPlans}</p>}
      </div>
    </div>
  )
}

function Field({ label, children }: { label: string, children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-xs font-black uppercase tracking-[0.18em] text-[#6B7A90]">{label} <span className="text-[#C4622D]">*</span></span>
      <div className="mt-2">{children}</div>
    </label>
  )
}

function DietForm() {
  return (
    <>
      <Field label="Calories per day"><input name="caloriesPerDay" type="number" min="800" max="6000" required className="input" /></Field>
      <Field label="Meal schedule"><textarea name="mealSchedule" required className="input min-h-28" placeholder="Breakfast, lunch, snacks, dinner structure" /></Field>
      <Field label="Food restrictions"><textarea name="foodRestrictions" className="input min-h-24" placeholder="Allergies, restrictions, foods to avoid" /></Field>
      <Field label="Hydration goal"><input name="hydrationGoal" className="input" placeholder="Example: 2.5L water per day" /></Field>
      <Field label="Notes"><textarea name="notes" className="input min-h-28" placeholder="Diet follow-up notes and adherence guidance" /></Field>
    </>
  )
}

function NutritionGuidanceForm() {
  return (
    <>
      <Field label="Guidance focus"><input name="guidanceFocus" required className="input" placeholder="Metabolic nutrition, meal timing, protein target" /></Field>
      <Field label="Calorie strategy"><textarea name="calorieStrategy" className="input min-h-24" placeholder="Deficit, maintenance, macro balance, protein/fiber focus" /></Field>
      <Field label="Meal timing"><textarea name="mealTiming" className="input min-h-24" placeholder="Timing guidance for meals, snacks, workouts, and medication support" /></Field>
      <Field label="Supplement notes"><textarea name="supplementNotes" className="input min-h-24" placeholder="Only clinically appropriate supplement guidance, if applicable" /></Field>
      <Field label="Notes"><textarea name="notes" className="input min-h-28" placeholder="Nutrition follow-up notes and adherence guidance" /></Field>
    </>
  )
}

function FitnessForm() {
  return (
    <>
      <Field label="Workout type"><input name="workoutType" required className="input" placeholder="Walking, strength, mobility, cardio" /></Field>
      <Field label="Weekly frequency"><input name="weeklyFrequency" type="number" min="1" max="14" required className="input" /></Field>
      <Field label="Daily step goal"><input name="dailyStepGoal" type="number" min="0" max="100000" className="input" /></Field>
      <Field label="Exercise restrictions"><textarea name="exerciseRestrictions" className="input min-h-24" placeholder="Pain, injury, mobility, safety limits" /></Field>
      <Field label="Notes"><textarea name="notes" className="input min-h-28" placeholder="Progress notes, check-in target, coaching guidance" /></Field>
    </>
  )
}

function Profile({ provider, copy }: { provider: Provider | null, copy: any }) {
  const Icon = copy.icon
  return (
    <div className="rounded-[28px] border border-[#E8DED4] bg-white p-6 shadow-sm">
      <div className="flex flex-col gap-5 md:flex-row md:items-center">
        <div className="flex h-20 w-20 items-center justify-center rounded-[24px] text-white" style={{ background: `linear-gradient(135deg, ${copy.accent}, #1A1F36)` }}>
          <Icon className="h-8 w-8" />
        </div>
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.22em] text-[#C4622D]">{copy.label}</p>
          <h3 className="mt-1 text-3xl font-black">{provider?.name}</h3>
          <p className="mt-1 text-sm font-semibold text-[#6B7A90]">{provider?.email}</p>
        </div>
      </div>
      <div className="mt-8 grid gap-4 md:grid-cols-3">
        <Info label="Specialization" value={provider?.specialization || 'Not configured'} />
        <Info label="Qualification" value={provider?.qualification || 'Not configured'} />
        <Info label="Status" value={provider?.status || 'active'} />
      </div>
    </div>
  )
}

function Info({ label, value }: { label: string, value: string }) {
  return (
    <div className="rounded-2xl bg-[#F9F6F0] p-5">
      <p className="text-xs font-black uppercase tracking-[0.18em] text-[#6B7A90]">{label}</p>
      <p className="mt-2 font-black">{value}</p>
    </div>
  )
}

function EmptyState() {
  return (
    <div className="mt-5 rounded-[24px] border border-dashed border-[#D8C9BD] bg-[#F9F6F0] p-8 text-center">
      <p className="text-lg font-black text-[#1A1F36]">No assigned patients yet</p>
      <p className="mx-auto mt-2 max-w-md text-sm font-semibold text-[#6B7A90]">Patients will appear here once they are assigned to your care team.</p>
    </div>
  )
}
