'use client'

import React, { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import {
  Search,
  User,
  Phone,
  Mail,
  Calendar,
  FileText,
  CreditCard,
  Upload,
  Clock,
  CheckCircle2,
  AlertCircle,
  MessageSquare,
  Lock,
  RefreshCw,
  Send,
  ArrowRight,
  ShieldAlert,
  SlidersHorizontal,
  ChevronRight,
  Activity,
  HeartPulse,
  Tag,
  Stethoscope,
  Utensils,
  Dumbbell
} from 'lucide-react'
import { authedFetch } from '@/lib/apiClient'
import { supabase } from '@/lib/supabaseClient'

interface PatientSummary {
  id: string
  fullName: string
  email: string
  phone: string
  registeredAt: string
  bmi: string | null
  primaryGoal: string | null
  activePlan: string
  planStatus: string
  planExpiresAt: string | null
  hasLabReport: boolean
  nextAppointment: {
    date: string
    time: string
    status: string
    type: string
  } | null
}

interface TicketItem {
  id: string
  ticket_number: number
  patient_id: string
  category: string
  priority: string
  status: string
  subject: string
  description: string
  created_at: string
  patient?: {
    fullName: string
    email: string
    phone: string
  }
}

interface MessageItem {
  id: string
  senderId: string
  senderRole: string
  senderName: string
  message: string
  isInternalNote: boolean
  createdAt: string
}

const REPORT_CATEGORIES = [
  { id: 'hba1c_diabetes', label: 'HbA1c & Blood Sugar' },
  { id: 'lipid_profile', label: 'Lipid Profile (Cholesterol)' },
  { id: 'thyroid_panel', label: 'Thyroid Panel (TSH, T3, T4)' },
  { id: 'cbc', label: 'Complete Blood Count (CBC)' },
  { id: 'lft_kft', label: 'Liver & Kidney Panel (LFT/KFT)' },
  { id: 'general_blood', label: 'General Metabolic Blood Work' },
]

export default function SupportWorkspacePage() {
  const [activeTab, setActiveTab] = useState<'tickets' | 'search'>('tickets')
  const [searchQuery, setSearchQuery] = useState('')
  const [searching, setSearching] = useState(false)
  const [searchResults, setSearchResults] = useState<PatientSummary[]>([])
  
  // Selected patient 360° state
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null)
  const [patient360, setPatient360] = useState<any | null>(null)
  const [loading360, setLoading360] = useState(false)

  // Tickets state
  const [tickets, setTickets] = useState<TicketItem[]>([])
  const [loadingTickets, setLoadingTickets] = useState(false)
  const [ticketFilter, setTicketFilter] = useState('all')
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null)
  const [ticketDetails, setTicketDetails] = useState<any | null>(null)
  const [ticketMessages, setTicketMessages] = useState<MessageItem[]>([])
  const [replyText, setReplyText] = useState('')
  const [isInternalNote, setIsInternalNote] = useState(false)
  const [sendingReply, setSendingReply] = useState(false)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [currentUserEmail, setCurrentUserEmail] = useState<string | null>(null)
  const [currentUserRole, setCurrentUserRole] = useState<string | null>(null)
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null)
  const [searchErrorMessage, setSearchErrorMessage] = useState<string | null>(null)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setIsAuthenticated(true)
        setCurrentUserId(session.user.id)
        setCurrentUserEmail(session.user.email || null)
        supabase
          .from('profiles')
          .select('role')
          .eq('id', session.user.id)
          .single()
          .then(({ data }) => {
            if (data?.role) setCurrentUserRole(data.role)
          })
      } else {
        setIsAuthenticated(false)
      }
    })
  }, [])

  // Blood report upload modal
  const [uploadModalOpen, setUploadModalOpen] = useState(false)
  const [uploadFile, setUploadFile] = useState<File | null>(null)
  const [uploadCategory, setUploadCategory] = useState('general_blood')
  const [uploadDate, setUploadDate] = useState(new Date().toISOString().split('T')[0])
  const [uploadingReport, setUploadingReport] = useState(false)
  const [uploadMessage, setUploadMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  // Reschedule modal
  const [rescheduleModalOpen, setRescheduleModalOpen] = useState(false)
  const [selectedApptId, setSelectedApptId] = useState<string | null>(null)
  const [newApptDate, setNewApptDate] = useState('')
  const [newApptTime, setNewApptTime] = useState('10:00 AM')
  const [rescheduleReason, setRescheduleReason] = useState('')
  const [rescheduling, setRescheduling] = useState(false)

  // 1. Load tickets
  const fetchTickets = useCallback(async () => {
    setLoadingTickets(true)
    try {
      const res = await authedFetch(`/api/support/tickets?status=${ticketFilter}`)
      if (res.ok) {
        const data = await res.json()
        setTickets(data.tickets || [])
        if (!selectedTicketId && data.tickets?.[0]) {
          setSelectedTicketId(data.tickets[0].id)
        }
      }
    } catch (err) {
      console.warn('Failed to load tickets:', err)
    } finally {
      setLoadingTickets(false)
    }
  }, [ticketFilter, selectedTicketId])

  useEffect(() => {
    fetchTickets()
  }, [fetchTickets])

  // 2. Load ticket details & thread
  useEffect(() => {
    if (!selectedTicketId) return
    const fetchThread = async () => {
      try {
        const res = await authedFetch(`/api/support/tickets/${selectedTicketId}`)
        if (res.ok) {
          const data = await res.json()
          setTicketDetails(data.ticket)
          setTicketMessages(data.messages || [])
          // Also set patientId to load 360 view if needed
          if (data.ticket?.patient_id) {
            setSelectedPatientId(data.ticket.patient_id)
          }
        }
      } catch (err) {
        console.warn('Error fetching ticket thread:', err)
      }
    }
    fetchThread()
  }, [selectedTicketId])

  // 3. Load Patient 360° Data
  const fetchPatient360 = useCallback(async (id: string) => {
    setLoading360(true)
    try {
      const res = await authedFetch(`/api/support/patients/${id}/360`)
      if (res.ok) {
        const data = await res.json()
        setPatient360(data)
      }
    } catch (err) {
      console.warn('Error fetching patient 360:', err)
    } finally {
      setLoading360(false)
    }
  }, [])

  useEffect(() => {
    if (selectedPatientId) {
      fetchPatient360(selectedPatientId)
    }
  }, [selectedPatientId, fetchPatient360])

  // 4. Handle Search
  const handleSearch = useCallback(async (e?: React.FormEvent, customQuery?: string) => {
    if (e) e.preventDefault()
    const query = (customQuery !== undefined ? customQuery : searchQuery).trim()
    if (!query || query.length < 2) return
    setActiveTab('search')
    setSearching(true)
    setSearchErrorMessage(null)
    try {
      const res = await authedFetch(`/api/support/patients/search?q=${encodeURIComponent(query)}`)
      if (res.ok) {
        const data = await res.json()
        const patients = data.patients || []
        setSearchResults(patients)
        if (patients.length > 0) {
          setSelectedPatientId(patients[0].id)
        }
      } else {
        const errJson = await res.json().catch(() => ({}))
        if (res.status === 401 || errJson.error === 'Unauthorized') {
          setSearchErrorMessage('Authentication required: Please sign in with an Admin or Support Agent account.')
        } else if (res.status === 403 || errJson.error === 'Forbidden') {
          setSearchErrorMessage('Access Denied: You must be logged in as an Admin or Support Agent to access patient records.')
        } else {
          setSearchErrorMessage(errJson.error || 'Failed to search patients.')
        }
      }
    } catch (err: any) {
      console.warn('Search error:', err)
      if (err.message?.includes('sign in')) {
        setSearchErrorMessage('Please sign in with an Admin or Support Agent account to search patient records.')
      } else {
        setSearchErrorMessage(err.message || 'Error connecting to search service.')
      }
    } finally {
      setSearching(false)
    }
  }, [searchQuery])

  // Debounced auto-search when query is entered
  useEffect(() => {
    const trimmed = searchQuery.trim()
    if (trimmed.length < 3) return
    const timer = setTimeout(() => {
      handleSearch(undefined, trimmed)
    }, 400)
    return () => clearTimeout(timer)
  }, [searchQuery, handleSearch])

  // 5. Send reply or internal note
  const handleSendReply = async () => {
    if (!selectedTicketId || !replyText.trim() || sendingReply) return
    setSendingReply(true)
    try {
      const res = await authedFetch(`/api/support/tickets/${selectedTicketId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: replyText.trim(),
          isInternalNote,
        }),
      })

      if (res.ok) {
        setReplyText('')
        // Refresh ticket thread
        const refreshRes = await authedFetch(`/api/support/tickets/${selectedTicketId}`)
        if (refreshRes.ok) {
          const data = await refreshRes.json()
          setTicketMessages(data.messages || [])
        }
        fetchTickets()
      }
    } catch (err) {
      console.warn('Error sending reply:', err)
    } finally {
      setSendingReply(false)
    }
  }

  // 6. Update ticket status
  const handleUpdateStatus = async (newStatus: string) => {
    if (!selectedTicketId) return
    try {
      const res = await authedFetch(`/api/support/tickets/${selectedTicketId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })
      if (res.ok) {
        setTicketDetails((prev: any) => ({ ...prev, status: newStatus }))
        fetchTickets()
      }
    } catch (err) {
      console.warn('Error updating status:', err)
    }
  }

  // 6b. Assign ticket to agent
  const handleAssignAgent = async (agentId: string | null) => {
    if (!selectedTicketId) return
    try {
      const res = await authedFetch(`/api/support/tickets/${selectedTicketId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          assignedAgentId: agentId,
          ...(agentId && ticketDetails?.status === 'open' ? { status: 'in_progress' } : {})
        }),
      })
      if (res.ok) {
        setTicketDetails((prev: any) => ({
          ...prev,
          assigned_agent_id: agentId,
          ...(agentId && prev?.status === 'open' ? { status: 'in_progress' } : {})
        }))
        fetchTickets()
      }
    } catch (err) {
      console.warn('Error assigning agent:', err)
    }
  }

  // 7. Handle Blood Report Upload
  const handleUploadReport = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedPatientId || !uploadFile || uploadingReport) return
    setUploadingReport(true)
    setUploadMessage(null)

    try {
      const formData = new FormData()
      formData.append('file', uploadFile)
      formData.append('reportCategory', uploadCategory)
      formData.append('testDate', uploadDate)

      const res = await authedFetch(`/api/support/patients/${selectedPatientId}/lab-report`, {
        method: 'POST',
        body: formData,
      })

      const data = await res.json()
      if (res.ok && data.success) {
        setUploadMessage({ type: 'success', text: `Blood report (${uploadFile.name}) successfully attached to patient's clinical file!` })
        setUploadFile(null)
        // Refresh 360 data
        fetchPatient360(selectedPatientId)
        setTimeout(() => {
          setUploadModalOpen(false)
          setUploadMessage(null)
        }, 1500)
      } else {
        setUploadMessage({ type: 'error', text: data.error || 'Upload failed.' })
      }
    } catch (err: any) {
      setUploadMessage({ type: 'error', text: err.message || 'Network error uploading file.' })
    } finally {
      setUploadingReport(false)
    }
  }

  // 8. Handle Reschedule
  const handleReschedule = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedPatientId || !selectedApptId || !newApptDate || rescheduling) return
    setRescheduling(true)

    try {
      const res = await authedFetch(`/api/support/patients/${selectedPatientId}/reschedule`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          appointmentId: selectedApptId,
          newDate: newApptDate,
          newTime: newApptTime,
          reason: rescheduleReason,
        }),
      })

      const data = await res.json()
      if (res.ok && data.success) {
        alert(data.message)
        setRescheduleModalOpen(false)
        fetchPatient360(selectedPatientId)
      } else {
        alert(data.error || 'Failed to reschedule.')
      }
    } catch (err: any) {
      alert(err.message || 'Error executing reschedule.')
    } finally {
      setRescheduling(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#F8FAF8] text-slate-900 font-sans flex flex-col">
      {/* Top Support Navigation Bar */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30 px-4 sm:px-6 py-3.5 flex items-center justify-between shadow-xs">
        <div className="flex items-center gap-4">
          <Link href="/" className="flex items-center gap-2">
            <img src="/brand-logo-official.png" alt="8Liv" className="h-6 sm:h-7 w-auto object-contain" />
          </Link>
          <div className="h-4 w-px bg-slate-200 hidden sm:block" />
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-200">
              Customer Care Hub
            </span>
          </div>
        </div>

        {/* Global Search Bar in Header */}
        <form onSubmit={handleSearch} className="flex-1 max-w-md mx-4 hidden md:flex items-center relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search patient by mobile (+91), email, name, or order ID..."
            className="w-full pl-10 pr-20 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#00A884]/20 focus:border-[#00A884] transition-all"
          />
          <button
            type="submit"
            className="absolute right-1.5 px-3 py-1 bg-[#163824] hover:bg-[#11241A] text-white rounded-lg text-xs font-bold transition-all cursor-pointer"
          >
            Search
          </button>
        </form>

        <div className="flex items-center gap-3">
          <button
            onClick={() => { setActiveTab('search'); handleSearch() }}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'search'
                ? 'bg-[#163824] text-white shadow-xs'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            Patient 360° Search
          </button>
          <button
            onClick={() => setActiveTab('tickets')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'tickets'
                ? 'bg-[#163824] text-white shadow-xs'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            Ticket Queues ({tickets.length})
          </button>

          {/* User profile / Auth status */}
          <div className="hidden sm:flex items-center pl-2 border-l border-slate-200">
            {isAuthenticated ? (
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center font-black text-xs">
                  {currentUserRole ? currentUserRole.charAt(0).toUpperCase() : 'U'}
                </div>
                <div className="text-left text-xs">
                  <div className="font-bold text-slate-800 leading-tight">
                    {currentUserRole === 'admin' ? 'Admin' : currentUserRole === 'support_agent' ? 'Support Agent' : currentUserRole || 'Staff'}
                  </div>
                  <div className="text-[10px] text-slate-500 leading-tight truncate max-w-[120px]">
                    {currentUserEmail || 'Online'}
                  </div>
                </div>
              </div>
            ) : isAuthenticated === false ? (
              <Link
                href="/login?redirect=/support"
                className="px-3 py-1.5 bg-[#163824] hover:bg-[#11241A] text-white text-xs font-bold rounded-lg transition-all"
              >
                Sign In
              </Link>
            ) : null}
          </div>
        </div>
      </header>

      {/* Auth Banner if not authenticated */}
      {isAuthenticated === false && (
        <div className="bg-amber-500 text-white px-4 py-2 text-xs font-semibold flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>You are viewing Customer Care Hub in signed-out mode. Sign in with an Admin or Support Agent account to access live patient records and tickets.</span>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/login?redirect=/support" className="px-2.5 py-1 bg-white text-slate-900 rounded-md font-bold hover:bg-amber-50 transition-all text-xs">
              Log In
            </Link>
            <Link href="/admin/login" className="px-2.5 py-1 bg-slate-900 text-white rounded-md font-bold hover:bg-black transition-all text-xs">
              Admin Portal
            </Link>
          </div>
        </div>
      )}

      {/* Main Content Workspace */}
      <main className="flex-1 max-w-[1600px] w-full mx-auto p-4 sm:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* ========================================================================= */}
        {/* LEFT COLUMN: TICKETS QUEUE OR PATIENT SEARCH RESULTS                      */}
        {/* ========================================================================= */}
        <div className="lg:col-span-5 flex flex-col gap-4">
          
          {activeTab === 'tickets' ? (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden flex flex-col h-[calc(100vh-140px)]">
              {/* Queue Header & Filters */}
              <div className="p-4 border-b border-slate-100 bg-slate-50/70 flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-bold text-slate-900">Support Ticket Inquiries</h2>
                  <p className="text-xs text-slate-500">Inbound issues from patients</p>
                </div>
                <div className="flex items-center gap-1.5">
                  <select
                    value={ticketFilter}
                    onChange={(e) => setTicketFilter(e.target.value)}
                    className="text-xs bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 font-medium text-slate-700 focus:outline-none focus:ring-1 focus:ring-[#00A884]"
                  >
                    <option value="all">All Statuses</option>
                    <option value="open">Open</option>
                    <option value="in_progress">In Progress</option>
                    <option value="waiting_on_patient">Waiting on Patient</option>
                    <option value="resolved">Resolved</option>
                  </select>
                  <button
                    onClick={fetchTickets}
                    className="p-1.5 rounded-lg bg-white border border-slate-200 text-slate-600 hover:text-slate-900 transition-colors"
                    title="Refresh tickets"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${loadingTickets ? 'animate-spin' : ''}`} />
                  </button>
                </div>
              </div>

              {/* Tickets List */}
              <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
                {loadingTickets ? (
                  <div className="p-8 text-center text-xs text-slate-400">Loading tickets...</div>
                ) : tickets.length === 0 ? (
                  <div className="p-8 text-center text-xs text-slate-400">No support tickets found for this filter.</div>
                ) : (
                  tickets.map((t) => {
                    const isSelected = selectedTicketId === t.id
                    return (
                      <div
                        key={t.id}
                        onClick={() => setSelectedTicketId(t.id)}
                        className={`p-4 cursor-pointer transition-colors text-left ${
                          isSelected ? 'bg-emerald-50/60 border-l-4 border-l-[#00A884]' : 'hover:bg-slate-50'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2 mb-1.5">
                          <span className="text-[11px] font-mono font-bold text-slate-500">
                            #{t.ticket_number}
                          </span>
                          <span
                            className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                              t.status === 'open'
                                ? 'bg-amber-100 text-amber-800'
                                : t.status === 'in_progress'
                                ? 'bg-blue-100 text-blue-800'
                                : t.status === 'resolved'
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-slate-100 text-slate-600'
                            }`}
                          >
                            {t.status.replace('_', ' ')}
                          </span>
                        </div>
                        <h3 className="text-xs sm:text-sm font-bold text-slate-900 truncate mb-1">
                          {t.subject}
                        </h3>
                        <p className="text-xs text-slate-500 line-clamp-1 mb-2">{t.description}</p>
                        <div className="flex items-center justify-between text-[11px] text-slate-400">
                          <span className="font-medium text-slate-600 truncate max-w-[150px]">
                            {t.patient?.fullName || 'Patient'}
                          </span>
                          <span>{new Date(t.created_at).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })}</span>
                        </div>
                      </div>
                    )
                  })
                )}
              </div>
            </div>
          ) : (
            /* Patient Search Results */
            <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden flex flex-col h-[calc(100vh-140px)]">
              <div className="p-4 border-b border-slate-100 bg-slate-50/70">
                <form onSubmit={handleSearch} className="flex gap-2">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search by phone, email, or order ID..."
                    className="flex-1 px-3 py-2 rounded-xl bg-white border border-slate-200 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#00A884]/20"
                  />
                  <button
                    type="submit"
                    className="px-4 py-2 bg-[#163824] hover:bg-[#11241A] text-white rounded-xl text-xs font-bold transition-all"
                  >
                    Search
                  </button>
                </form>
              </div>

              <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
                {searchErrorMessage && (
                  <div className="p-4 m-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 flex items-start gap-2.5">
                    <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <p className="font-bold">{searchErrorMessage}</p>
                      <div className="mt-2 flex gap-2">
                        <Link href="/login?redirect=/support" className="px-3 py-1 bg-[#163824] text-white rounded-lg font-bold hover:bg-[#11241A] transition-all">
                          Sign In
                        </Link>
                        <Link href="/admin/login" className="px-3 py-1 bg-slate-200 text-slate-800 rounded-lg font-bold hover:bg-slate-300 transition-all">
                          Admin Login
                        </Link>
                      </div>
                    </div>
                  </div>
                )}

                {searching ? (
                  <div className="p-8 text-center text-xs text-slate-400">Searching records...</div>
                ) : searchResults.length === 0 ? (
                  <div className="p-8 text-center text-xs text-slate-500">
                    {searchQuery.trim().length >= 2 ? (
                      <div>
                        <p className="font-bold text-slate-700 mb-1">No matching patients found</p>
                        <p className="text-slate-400">No records match &ldquo;{searchQuery}&rdquo;. Check the phone number or email.</p>
                      </div>
                    ) : (
                      "Type a patient's phone number (+91), email, or name to inspect their profile."
                    )}
                  </div>
                ) : (
                  searchResults.map((p) => {
                    const isSelected = selectedPatientId === p.id
                    return (
                      <div
                        key={p.id}
                        onClick={() => setSelectedPatientId(p.id)}
                        className={`p-4 cursor-pointer transition-colors text-left ${
                          isSelected ? 'bg-emerald-50/60 border-l-4 border-l-[#00A884]' : 'hover:bg-slate-50'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <h4 className="text-xs sm:text-sm font-bold text-slate-900">{p.fullName}</h4>
                          <span className="text-[10px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                            {p.activePlan}
                          </span>
                        </div>
                        <div className="text-xs text-slate-500 space-y-0.5">
                          <div className="flex items-center justify-between">
                            <p className="flex items-center gap-1.5"><Phone className="w-3 h-3" /> {p.phone || 'No phone'}</p>
                            {p.phone && (
                              <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                                <a
                                  href={`tel:${p.phone}`}
                                  className="px-1.5 py-0.5 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 text-[10px] font-bold flex items-center gap-1"
                                  title="Call"
                                >
                                  <Phone className="w-2.5 h-2.5" /> Call
                                </a>
                                <a
                                  href={`https://wa.me/${p.phone.replace(/\D/g, '')}?text=Hello%20${encodeURIComponent(p.fullName)}%2C%20this%20is%208Liv%20Customer%20Care.`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="px-1.5 py-0.5 rounded bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-[10px] font-bold flex items-center gap-1"
                                  title="WhatsApp"
                                >
                                  <MessageSquare className="w-2.5 h-2.5" /> WA
                                </a>
                              </div>
                            )}
                          </div>
                          <p className="flex items-center gap-1.5"><Mail className="w-3 h-3" /> {p.email}</p>
                        </div>
                        {p.bmi && (
                          <div className="mt-2 text-[11px] text-slate-600 flex items-center gap-3">
                            <span>BMI: <strong>{p.bmi}</strong></span>
                            {p.hasLabReport && (
                              <span className="text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded text-[10px] font-semibold">
                                ✓ Lab Report Attached
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    )
                  })
                )}
              </div>
            </div>
          )}

          {/* Quick Operations Strip under Left Column */}
          {selectedPatientId && (
            <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between gap-3">
              <span className="text-xs font-bold text-slate-800">Common Operations:</span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setUploadModalOpen(true)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold transition-all shadow-xs"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>Upload Blood Report</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* ========================================================================= */}
        {/* RIGHT COLUMN: TICKET THREAD OR PATIENT 360° OMNIVIEW                      */}
        {/* ========================================================================= */}
        <div className="lg:col-span-7 flex flex-col gap-6">

          {/* If viewing a ticket, show threaded discussion & quick status change */}
          {activeTab === 'tickets' && ticketDetails && (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden flex flex-col">
              {/* Ticket Banner */}
              <div className="p-4 sm:p-5 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3 bg-slate-50/60">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-mono font-bold text-slate-400">
                      Ticket #{ticketDetails.ticket_number}
                    </span>
                    <span className="text-xs font-bold text-slate-600 uppercase tracking-wider bg-slate-100 px-2 py-0.5 rounded">
                      {ticketDetails.category}
                    </span>
                  </div>
                  <h2 className="text-base sm:text-lg font-extrabold text-slate-900">
                    {ticketDetails.subject}
                  </h2>
                  <div className="flex items-center gap-2.5 mt-1 text-xs text-slate-500">
                    <span className="font-semibold text-slate-700">{ticketDetails.patient?.fullName || 'Patient'}</span>
                    {ticketDetails.patient?.phone && (
                      <>
                        <span>•</span>
                        <a
                          href={`tel:${ticketDetails.patient.phone}`}
                          className="inline-flex items-center gap-1 font-bold text-emerald-700 hover:text-emerald-900"
                          title="Call patient"
                        >
                          <Phone className="w-3 h-3 text-emerald-600" />
                          <span>{ticketDetails.patient.phone}</span>
                        </a>
                        <a
                          href={`https://wa.me/${ticketDetails.patient.phone.replace(/\D/g, '')}?text=Hello%20${encodeURIComponent(ticketDetails.patient.fullName || 'Patient')}%2C%20this%20is%208Liv%20Customer%20Care%20regarding%20ticket%20%23${ticketDetails.ticket_number}.`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 font-bold text-[#25D366] hover:text-[#20ba59]"
                          title="Chat on WhatsApp"
                        >
                          <MessageSquare className="w-3 h-3" />
                          <span>WhatsApp</span>
                        </a>
                      </>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  {ticketDetails.assigned_agent_id === currentUserId ? (
                    <div className="flex items-center gap-1.5 bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-bold px-2.5 py-1.5 rounded-xl">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Assigned to You</span>
                      <button
                        type="button"
                        onClick={() => handleAssignAgent(null)}
                        className="text-[10px] text-slate-400 hover:text-rose-600 ml-1 underline cursor-pointer"
                        title="Unassign yourself"
                      >
                        Release
                      </button>
                    </div>
                  ) : ticketDetails.assigned_agent_id ? (
                    <span className="text-xs font-bold bg-slate-100 text-slate-600 border border-slate-200 px-2.5 py-1.5 rounded-xl">
                      Assigned to Agent
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleAssignAgent(currentUserId)}
                      className="inline-flex items-center gap-1.5 text-xs font-bold bg-[#00A884] hover:bg-[#0A8F70] text-white px-3 py-1.5 rounded-xl shadow-xs transition-all cursor-pointer"
                    >
                      <User className="w-3.5 h-3.5" />
                      <span>Claim Ticket</span>
                    </button>
                  )}

                  <select
                    value={ticketDetails.status}
                    onChange={(e) => handleUpdateStatus(e.target.value)}
                    className="text-xs font-bold bg-white border border-slate-300 rounded-xl px-3 py-2 shadow-xs focus:ring-2 focus:ring-[#00A884]/20 focus:outline-none cursor-pointer"
                  >
                    <option value="open">Open</option>
                    <option value="in_progress">In Progress</option>
                    <option value="waiting_on_patient">Waiting on Patient</option>
                    <option value="resolved">Resolved</option>
                    <option value="closed">Closed</option>
                  </select>
                </div>
              </div>

              {/* Thread Messages */}
              <div className="p-5 max-h-[380px] overflow-y-auto space-y-4 bg-slate-50/40">
                {ticketMessages.map((msg) => {
                  const isStaffMsg = ['support_agent', 'care_coordinator', 'admin'].includes(msg.senderRole)
                  return (
                    <div
                      key={msg.id}
                      className={`flex flex-col ${isStaffMsg ? 'items-end' : 'items-start'}`}
                    >
                      <div className="flex items-center gap-1.5 text-[11px] text-slate-400 mb-1">
                        <span className="font-semibold text-slate-700">{msg.senderName}</span>
                        {msg.isInternalNote && (
                          <span className="bg-amber-100 text-amber-800 px-1.5 py-0.2 rounded font-bold text-[9px] uppercase tracking-wider flex items-center gap-1">
                            <Lock className="w-2.5 h-2.5" /> Staff Internal Note
                          </span>
                        )}
                        <span>· {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                      <div
                        className={`p-3.5 rounded-2xl max-w-lg text-xs sm:text-sm leading-relaxed shadow-xs ${
                          msg.isInternalNote
                            ? 'bg-amber-50 text-amber-950 border border-amber-200'
                            : isStaffMsg
                            ? 'bg-[#163824] text-white'
                            : 'bg-white text-slate-800 border border-slate-200'
                        }`}
                      >
                        {msg.message}
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* Reply Input Box */}
              <div className="p-4 border-t border-slate-100 bg-white">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={isInternalNote}
                        onChange={(e) => setIsInternalNote(e.target.checked)}
                        className="rounded text-amber-600 focus:ring-amber-500"
                      />
                      <span>Post as Internal Note (hidden from patient)</span>
                    </label>
                  </div>
                </div>
                <div className="flex gap-2">
                  <textarea
                    rows={2}
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    placeholder={isInternalNote ? 'Write private internal staff note...' : 'Type reply to patient...'}
                    className={`flex-1 p-3 rounded-xl border text-xs sm:text-sm focus:outline-none transition-all ${
                      isInternalNote
                        ? 'bg-amber-50/50 border-amber-300 focus:ring-2 focus:ring-amber-500/20'
                        : 'bg-slate-50 border-slate-200 focus:bg-white focus:ring-2 focus:ring-[#00A884]/20'
                    }`}
                  />
                  <button
                    onClick={handleSendReply}
                    disabled={sendingReply || !replyText.trim()}
                    className={`px-5 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 text-white shadow-xs transition-all ${
                      isInternalNote
                        ? 'bg-amber-700 hover:bg-amber-800'
                        : 'bg-[#00A884] hover:bg-[#009272]'
                    } disabled:opacity-50`}
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>{sendingReply ? 'Sending...' : isInternalNote ? 'Add Note' : 'Send'}</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* PATIENT 360° OMNIVIEW CARD                                                */}
          {/* ========================================================================= */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 sm:p-6 text-left">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-5">
              <div>
                <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                  <User className="w-4 h-4 text-[#00A884]" />
                  <span>Patient 360° Omniview</span>
                </h3>
                <p className="text-xs text-slate-500">Live clinical &amp; operational profile</p>
              </div>
              {selectedPatientId && (
                <button
                  onClick={() => fetchPatient360(selectedPatientId)}
                  className="text-xs font-semibold text-slate-500 hover:text-slate-900 flex items-center gap-1"
                >
                  <RefreshCw className={`w-3 h-3 ${loading360 ? 'animate-spin' : ''}`} />
                  <span>Refresh</span>
                </button>
              )}
            </div>

            {loading360 ? (
              <div className="py-12 text-center text-xs text-slate-400">Loading patient 360 context...</div>
            ) : !patient360 ? (
              <div className="py-12 text-center text-xs text-slate-400">
                Select a patient or ticket on the left to inspect full medical, appointment, and invoice records.
              </div>
            ) : (
              <div className="space-y-6">
                {/* 1. Header Metrics Card */}
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200/80">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-0.5">Patient</span>
                    <strong className="text-xs sm:text-sm text-slate-900 font-bold block truncate">{patient360.patient.fullName}</strong>
                    <div className="flex items-center gap-2 mt-1">
                      {patient360.patient.phone ? (
                        <a
                          href={`tel:${patient360.patient.phone}`}
                          className="text-xs font-bold text-emerald-700 hover:text-emerald-900 flex items-center gap-1"
                          title="Call patient phone"
                        >
                          <Phone className="w-3 h-3" />
                          <span>{patient360.patient.phone}</span>
                        </a>
                      ) : (
                        <span className="text-[11px] text-slate-400">No phone</span>
                      )}
                    </div>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-0.5">Active Plan</span>
                    <span className="inline-block text-[11px] font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded">
                      {patient360.membership.planName}
                    </span>
                    <span className="text-[10px] text-slate-500 block mt-0.5">
                      {patient360.membership.active ? 'Active Subscription' : 'No Active Plan'}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-0.5">BMI / Metrics</span>
                    <strong className="text-xs sm:text-sm text-slate-900 block font-bold">{patient360.health.bmi || 'N/A'} kg/m²</strong>
                    <span className="text-[10px] text-slate-500 block">{patient360.health.weightKg || '--'} kg · {patient360.health.heightCm || '--'} cm</span>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">Contact & Actions</span>
                    <div className="flex items-center gap-1.5">
                      {patient360.patient.phone && (
                        <>
                          <a
                            href={`tel:${patient360.patient.phone}`}
                            className="flex-1 py-1 px-2 bg-[#163824] hover:bg-[#11241A] text-white rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1 shadow-xs"
                            title="Direct Phone Call"
                          >
                            <Phone className="w-3 h-3" />
                            <span>Call</span>
                          </a>
                          <a
                            href={`https://wa.me/${patient360.patient.phone.replace(/\D/g, '')}?text=Hello%20${encodeURIComponent(patient360.patient.fullName)}%2C%20this%20is%208Liv%20Customer%20Care%20team.`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex-1 py-1 px-2 bg-[#25D366] hover:bg-[#20ba59] text-white rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1 shadow-xs"
                            title="Chat on WhatsApp"
                          >
                            <MessageSquare className="w-3 h-3" />
                            <span>WhatsApp</span>
                          </a>
                        </>
                      )}
                      <button
                        onClick={() => setUploadModalOpen(true)}
                        className="py-1 px-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-bold shadow-xs transition-all flex items-center justify-center gap-1"
                        title="Upload Blood Report"
                      >
                        <Upload className="w-3 h-3" />
                        <span className="hidden sm:inline">Report</span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* 2. Diagnostic Blood & Lab Reports */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                      <Activity className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Blood &amp; Diagnostic Reports ({patient360.labReports?.length || 0})</span>
                    </h4>
                    <button
                      onClick={() => setUploadModalOpen(true)}
                      className="text-xs font-bold text-[#00A884] hover:underline flex items-center gap-1"
                    >
                      <Upload className="w-3 h-3" />
                      <span>Upload New</span>
                    </button>
                  </div>

                  {!patient360.labReports || patient360.labReports.length === 0 ? (
                    <div className="p-4 rounded-xl border border-dashed border-slate-200 text-center text-xs text-slate-400 bg-slate-50/50">
                      No blood reports uploaded yet. Click &ldquo;Upload New&rdquo; to attach a test for physician review.
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {patient360.labReports.map((r: any, idx: number) => (
                        <div
                          key={r.id || idx}
                          className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between gap-3 text-xs"
                        >
                          <div className="flex items-center gap-2.5 truncate">
                            <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center shrink-0">
                              <FileText className="w-3.5 h-3.5" />
                            </div>
                            <div className="truncate">
                              <strong className="text-slate-900 block truncate">{r.file_name}</strong>
                              <span className="text-[10px] text-slate-500 font-medium capitalize">
                                {String(r.report_category || 'General Blood Work').replace('_', ' ')} · {r.test_date || 'No Date'}
                              </span>
                            </div>
                          </div>
                          <a
                            href={r.file_url}
                            target="_blank"
                            rel="noreferrer"
                            className="px-3 py-1 rounded-lg bg-white border border-slate-300 hover:bg-slate-100 text-slate-800 text-[11px] font-bold transition-all shrink-0 shadow-xs"
                          >
                            View / Download
                          </a>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* 3. Consultations & Appointment Schedule */}
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-3 flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-blue-600" />
                    <span>Consultation History &amp; Rescheduling</span>
                  </h4>
                  {patient360.appointments.length === 0 ? (
                    <div className="p-4 rounded-xl border border-dashed border-slate-200 text-center text-xs text-slate-400">
                      No doctor appointments booked.
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {patient360.appointments.map((app: any) => (
                        <div
                          key={app.id}
                          className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between gap-3 text-xs"
                        >
                          <div>
                            <div className="flex items-center gap-2">
                              <strong className="text-slate-900">{app.date} at {app.time}</strong>
                              <span className="text-[10px] font-bold uppercase px-1.5 py-0.2 rounded bg-slate-200 text-slate-700">
                                {app.status}
                              </span>
                            </div>
                            <span className="text-[10px] text-slate-500">{app.type}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => {
                                setSelectedApptId(app.id)
                                setNewApptDate(app.date)
                                setNewApptTime(app.time)
                                setRescheduleModalOpen(true)
                              }}
                              className="px-2.5 py-1 rounded-lg bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 text-[11px] font-semibold"
                            >
                              Reschedule
                            </button>
                            {app.meetingUrl && (
                              <button
                                onClick={() => {
                                  navigator.clipboard.writeText(app.meetingUrl)
                                  alert('Meeting join URL copied to clipboard!')
                                }}
                                className="px-2.5 py-1 rounded-lg bg-emerald-600 text-white text-[11px] font-bold"
                              >
                                Copy Link
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* 4. Signed E-Prescriptions */}
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-3 flex items-center gap-1.5">
                    <Stethoscope className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Signed Digital E-Prescriptions ({patient360.prescriptions?.length || 0})</span>
                  </h4>
                  {patient360.prescriptions.length === 0 ? (
                    <div className="p-4 rounded-xl border border-dashed border-slate-200 text-center text-xs text-slate-400">
                      No prescriptions issued yet. Prescriptions are authored by physicians following video evaluation.
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {patient360.prescriptions.map((rx: any) => (
                        <div
                          key={rx.id}
                          className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between text-xs"
                        >
                          <div>
                            <strong className="text-slate-900 block">{rx.diagnosis}</strong>
                            <span className="text-[10px] text-slate-500">
                              Issued: {new Date(rx.createdAt).toLocaleDateString()} · Fulfill at any licensed pharmacy
                            </span>
                          </div>
                          {rx.pdfUrl && (
                            <a
                              href={rx.pdfUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="px-3 py-1 rounded-lg bg-white border border-slate-300 hover:bg-slate-100 text-slate-800 text-[11px] font-bold"
                            >
                              View PDF
                            </a>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* 5. Transactions & Invoices */}
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-3 flex items-center gap-1.5">
                    <CreditCard className="w-3.5 h-3.5 text-slate-700" />
                    <span>Razorpay Payments &amp; 18% GST Receipts</span>
                  </h4>
                  {patient360.transactions.length === 0 ? (
                    <div className="p-4 rounded-xl border border-dashed border-slate-200 text-center text-xs text-slate-400">
                      No payment transactions recorded.
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {patient360.transactions.map((tx: any) => (
                        <div
                          key={tx.id}
                          className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between text-xs"
                        >
                          <div>
                            <strong className="text-slate-900 block">₹{tx.amount.toLocaleString('en-IN')} ({tx.currency})</strong>
                            <span className="text-[10px] font-mono text-slate-500">{tx.transactionId} · {tx.paymentType}</span>
                          </div>
                          <span
                            className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${
                              tx.status === 'success' || tx.status === 'paid'
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-amber-100 text-amber-800'
                            }`}
                          >
                            {tx.status}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

              </div>
            )}
          </div>

        </div>
      </main>

      {/* ========================================================================= */}
      {/* MODAL: UPLOAD CATEGORIZED BLOOD / LAB REPORT                              */}
      {/* ========================================================================= */}
      {uploadModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 text-left shadow-2xl animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
              <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                <Activity className="w-5 h-5 text-[#00A884]" />
                <span>Upload Patient Blood Report</span>
              </h3>
              <button
                onClick={() => setUploadModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleUploadReport} className="space-y-4 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Diagnostic Test Category</label>
                <select
                  value={uploadCategory}
                  onChange={(e) => setUploadCategory(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-300 font-medium text-slate-800 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#00A884]/20"
                >
                  {REPORT_CATEGORIES.map((c) => (
                    <option key={c.id} value={c.id}>{c.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Test Date</label>
                <input
                  type="date"
                  value={uploadDate}
                  onChange={(e) => setUploadDate(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-300 font-medium text-slate-800 bg-slate-50 focus:bg-white focus:outline-none"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Report File (PDF, JPG, PNG up to 10MB)</label>
                <input
                  type="file"
                  accept=".pdf,image/jpeg,image/png"
                  onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
                  required
                  className="w-full p-2 rounded-xl border border-dashed border-slate-300 bg-slate-50 text-slate-600 file:mr-3 file:py-1 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-[#163824] file:text-white cursor-pointer"
                />
              </div>

              {uploadMessage && (
                <div
                  className={`p-3 rounded-xl text-xs font-semibold ${
                    uploadMessage.type === 'success'
                      ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                      : 'bg-red-50 text-red-800 border border-red-200'
                  }`}
                >
                  {uploadMessage.text}
                </div>
              )}

              <div className="pt-3 flex gap-2">
                <button
                  type="button"
                  onClick={() => setUploadModalOpen(false)}
                  className="flex-1 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 font-bold text-slate-700 transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={uploadingReport || !uploadFile}
                  className="flex-1 py-2.5 rounded-xl bg-[#00A884] hover:bg-[#009272] text-white font-bold transition-all disabled:opacity-50"
                >
                  {uploadingReport ? 'Uploading...' : 'Attach to File'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: RESCHEDULE APPOINTMENT                                             */}
      {/* ========================================================================= */}
      {rescheduleModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 text-left shadow-2xl animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
              <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                <Calendar className="w-5 h-5 text-blue-600" />
                <span>Reschedule Appointment</span>
              </h3>
              <button
                onClick={() => setRescheduleModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleReschedule} className="space-y-4 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">New Consultation Date</label>
                <input
                  type="date"
                  value={newApptDate}
                  onChange={(e) => setNewApptDate(e.target.value)}
                  required
                  min={new Date().toISOString().split('T')[0]}
                  className="w-full p-2.5 rounded-xl border border-slate-300 font-medium text-slate-800 bg-slate-50 focus:bg-white focus:outline-none"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">New Time Slot</label>
                <select
                  value={newApptTime}
                  onChange={(e) => setNewApptTime(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-300 font-medium text-slate-800 bg-slate-50 focus:bg-white focus:outline-none"
                >
                  <option value="10:00 AM">10:00 AM</option>
                  <option value="11:30 AM">11:30 AM</option>
                  <option value="02:00 PM">02:00 PM</option>
                  <option value="04:00 PM">04:00 PM</option>
                  <option value="06:00 PM">06:00 PM</option>
                  <option value="07:30 PM">07:30 PM</option>
                </select>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Reason for Rescheduling</label>
                <input
                  type="text"
                  value={rescheduleReason}
                  onChange={(e) => setRescheduleReason(e.target.value)}
                  placeholder="e.g. Patient requested time change"
                  className="w-full p-2.5 rounded-xl border border-slate-300 font-medium text-slate-800 bg-slate-50 focus:bg-white focus:outline-none"
                />
              </div>

              <div className="pt-3 flex gap-2">
                <button
                  type="button"
                  onClick={() => setRescheduleModalOpen(false)}
                  className="flex-1 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 font-bold text-slate-700 transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={rescheduling || !newApptDate}
                  className="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold transition-all disabled:opacity-50"
                >
                  {rescheduling ? 'Rescheduling...' : 'Confirm Reschedule'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  )
}

