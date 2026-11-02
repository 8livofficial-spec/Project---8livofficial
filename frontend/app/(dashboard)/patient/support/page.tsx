'use client'

import React, { useState, useEffect, useRef } from 'react'
import { 
  Plus, MessageSquare, Send, FileText, CheckCircle2,
  Clock, AlertCircle, Calendar, RefreshCw, Upload,
  Pill, ArrowRight, X, ExternalLink, HelpCircle,
  Phone, PhoneCall, PhoneForwarded, MessageCircle,
  ReceiptText, Utensils, ChevronRight, User
} from 'lucide-react'
import { authedFetch } from '@/lib/apiClient'
import { usePatientData } from '@/hooks/usePatientData'

interface SupportTicket {
  id: string
  ticket_number: number
  patient_id: string
  category: string
  priority: string
  status: string
  subject: string
  description: string
  created_at: string
  updated_at: string
}

interface TicketMessage {
  id: string
  ticket_id: string
  sender_id: string
  sender_role: string
  sender_name?: string
  message_body: string
  is_internal_note: boolean
  attachments?: any[]
  created_at: string
}

interface LabReport {
  id: string
  report_category: string
  test_date: string | null
  file_name: string
  file_url: string
  created_at: string
  doctor_reviewed?: boolean
}

const CATEGORY_MAP: Record<string, { label: string; color: string; icon: any }> = {
  booking: { label: 'Appointment & Reschedule', color: 'bg-sky-50 text-sky-800 border-sky-200', icon: Calendar },
  lab_report: { label: 'Diagnostic Blood Test', color: 'bg-emerald-50 text-emerald-800 border-emerald-200', icon: FileText },
  billing: { label: 'Billing & GST Invoices', color: 'bg-amber-50 text-amber-800 border-amber-200', icon: ReceiptText },
  prescription: { label: 'Prescription & Pharmacy', color: 'bg-purple-50 text-purple-800 border-purple-200', icon: Pill },
  diet_fitness: { label: 'Nutrition & Fitness', color: 'bg-teal-50 text-teal-800 border-teal-200', icon: Utensils },
  general: { label: 'General Health Desk', color: 'bg-slate-100 text-slate-700 border-slate-200', icon: HelpCircle },
}

const LAB_CATEGORIES = [
  { value: 'hba1c_diabetes', label: 'HbA1c / Blood Glucose Panel' },
  { value: 'lipid_profile', label: 'Lipid Profile (Cholesterol / Triglycerides)' },
  { value: 'thyroid_panel', label: 'Thyroid Function (TSH, FT3, FT4)' },
  { value: 'cbc', label: 'Complete Blood Count (CBC)' },
  { value: 'lft_kft', label: 'Liver & Kidney Panel (LFT / KFT)' },
  { value: 'general_blood', label: 'Comprehensive / General Blood Work' },
]

export default function PatientSupportPage() {
  const { user, profile } = usePatientData()
  const [tickets, setTickets] = useState<SupportTicket[]>([])
  const [labReports, setLabReports] = useState<LabReport[]>([])
  const [loading, setLoading] = useState(true)
  const [filterStatus, setFilterStatus] = useState<'all' | 'open' | 'resolved'>('all')

  // Selected ticket for conversation view
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null)
  const [ticketDetails, setTicketDetails] = useState<SupportTicket | null>(null)
  const [messages, setMessages] = useState<TicketMessage[]>([])
  const [loadingThread, setLoadingThread] = useState(false)
  const [replyText, setReplyText] = useState('')
  const [sendingReply, setSendingReply] = useState(false)

  // New ticket modal
  const [isNewTicketOpen, setIsNewTicketOpen] = useState(false)
  const [newCategory, setNewCategory] = useState('booking')
  const [newPriority, setNewPriority] = useState('medium')
  const [newSubject, setNewSubject] = useState('')
  const [newDescription, setNewDescription] = useState('')
  const [submittingTicket, setSubmittingTicket] = useState(false)

  // Blood report upload modal
  const [isUploadReportOpen, setIsUploadReportOpen] = useState(false)
  const [uploadCategory, setUploadCategory] = useState('general_blood')
  const [uploadTestDate, setUploadTestDate] = useState('')
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [uploadingReport, setUploadingReport] = useState(false)
  const [uploadSuccessMsg, setUploadSuccessMsg] = useState('')

  // Phone callback modal
  const [isCallbackModalOpen, setIsCallbackModalOpen] = useState(false)
  const [callbackPhone, setCallbackPhone] = useState('')
  const [callbackTopic, setCallbackTopic] = useState('Doctor Consultation / Reschedule')
  const [callbackWindow, setCallbackWindow] = useState('Immediate (within 15–30 mins)')
  const [callbackNotes, setCallbackNotes] = useState('')
  const [requestingCallback, setRequestingCallback] = useState(false)
  const [callbackSuccessMsg, setCallbackSuccessMsg] = useState('')

  const fileInputRef = useRef<HTMLInputElement>(null)
  const chatBottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (profile?.phone_number && !callbackPhone) {
      setCallbackPhone(profile.phone_number)
    }
  }, [profile?.phone_number, callbackPhone])

  // Fetch tickets
  const fetchTickets = async () => {
    try {
      const res = await authedFetch('/api/support/tickets')
      const data = await res.json()
      if (res.ok && data.tickets) {
        setTickets(data.tickets)
      }
    } catch (err) {
      console.warn('Failed to fetch tickets:', err)
    } finally {
      setLoading(false)
    }
  }

  // Fetch patient lab reports
  const fetchLabReports = async () => {
    if (!user?.id) return
    try {
      const res = await authedFetch(`/api/support/patients/${user.id}/lab-report`)
      const data = await res.json()
      if (res.ok && data.reports) {
        setLabReports(data.reports)
      }
    } catch (err) {
      console.warn('Failed to load lab reports:', err)
    }
  }

  useEffect(() => {
    fetchTickets()
    if (user?.id) {
      fetchLabReports()
    }
  }, [user?.id])

  // Fetch single ticket thread
  const selectTicket = async (ticketId: string) => {
    setSelectedTicketId(ticketId)
    setLoadingThread(true)
    try {
      const res = await authedFetch(`/api/support/tickets/${ticketId}`)
      const data = await res.json()
      if (res.ok) {
        setTicketDetails(data.ticket)
        setMessages(data.messages || [])
        setTimeout(() => {
          chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' })
        }, 100)
      }
    } catch (err) {
      console.warn('Failed to load ticket thread:', err)
    } finally {
      setLoadingThread(false)
    }
  }

  // Send reply in ticket thread
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedTicketId || !replyText.trim() || sendingReply) return

    setSendingReply(true)
    try {
      const res = await authedFetch(`/api/support/tickets/${selectedTicketId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: replyText.trim(),
          isInternalNote: false,
        }),
      })

      const data = await res.json()
      if (res.ok && data.message) {
        setMessages(prev => [...prev, data.message])
        setReplyText('')
        setTimeout(() => {
          chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' })
        }, 100)
      } else {
        alert(data.error || 'Failed to send message.')
      }
    } catch (err: any) {
      alert(err.message || 'Error sending reply.')
    } finally {
      setSendingReply(false)
    }
  }

  // Create new ticket
  const handleCreateTicket = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newSubject.trim() || !newDescription.trim()) {
      alert('Please fill in the subject and description.')
      return
    }

    setSubmittingTicket(true)
    try {
      const res = await authedFetch('/api/support/tickets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          category: newCategory,
          priority: newPriority,
          subject: newSubject.trim(),
          description: newDescription.trim(),
        }),
      })

      const data = await res.json()
      if (res.ok && data.ticket) {
        setTickets(prev => [data.ticket, ...prev])
        setIsNewTicketOpen(false)
        setNewSubject('')
        setNewDescription('')
        selectTicket(data.ticket.id)
      } else {
        alert(data.error || 'Failed to submit request.')
      }
    } catch (err: any) {
      alert(err.message || 'Error submitting ticket.')
    } finally {
      setSubmittingTicket(false)
    }
  }

  // Upload blood report
  const handleUploadReport = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedFile) {
      alert('Please select a PDF or image report file.')
      return
    }
    if (!user?.id) {
      alert('Please sign in to upload reports.')
      return
    }

    setUploadingReport(true)
    setUploadSuccessMsg('')

    try {
      const formData = new FormData()
      formData.append('file', selectedFile)
      formData.append('reportCategory', uploadCategory)
      if (uploadTestDate) formData.append('testDate', uploadTestDate)

      const res = await authedFetch(`/api/support/patients/${user.id}/lab-report`, {
        method: 'POST',
        body: formData,
      })

      const data = await res.json()
      if (res.ok && data.success) {
        setUploadSuccessMsg('Report attached to your medical chart. Your treating physician has been alerted.')
        setSelectedFile(null)
        if (fileInputRef.current) fileInputRef.current.value = ''
        fetchLabReports()
        setTimeout(() => {
          setIsUploadReportOpen(false)
          setUploadSuccessMsg('')
        }, 2200)
      } else {
        alert(data.error || 'Failed to upload report.')
      }
    } catch (err: any) {
      alert(err.message || 'Upload connection failed.')
    } finally {
      setUploadingReport(false)
    }
  }

  // Request phone callback
  const handleRequestCallback = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!callbackPhone.trim()) {
      alert('Please enter your mobile phone number.')
      return
    }
    setRequestingCallback(true)
    setCallbackSuccessMsg('')
    try {
      const res = await authedFetch('/api/support/tickets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          category: 'booking',
          priority: 'urgent',
          subject: `[Phone Callback Request] ${callbackTopic}`,
          description: `Patient requested direct phone call from 8Liv Care Team.\n\nPhone: ${callbackPhone}\nTopic: ${callbackTopic}\nPreferred Time Window: ${callbackWindow}\nNotes: ${callbackNotes.trim() || 'None'}`
        })
      })
      const data = await res.json()
      if (res.ok && data.ticket) {
        setCallbackSuccessMsg(`Callback scheduled! Our care coordinator will call you at ${callbackPhone} shortly.`)
        fetchTickets()
        setTimeout(() => {
          setIsCallbackModalOpen(false)
          setCallbackSuccessMsg('')
          setCallbackNotes('')
        }, 2600)
      } else {
        alert(data.error || 'Failed to place callback request.')
      }
    } catch (err: any) {
      alert(err.message || 'Connection failed.')
    } finally {
      setRequestingCallback(false)
    }
  }

  const filteredTickets = tickets.filter(t => {
    if (filterStatus === 'all') return true
    if (filterStatus === 'open') return ['open', 'in_progress', 'waiting_on_patient'].includes(t.status)
    if (filterStatus === 'resolved') return ['resolved', 'closed'].includes(t.status)
    return true
  })

  return (
    <div className="min-h-screen bg-[#F8FAFC] pb-16">
      {/* Top Header */}
      <header className="bg-white border-b border-slate-200 px-4 sm:px-8 py-5">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
              Help &amp; Support
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
              Direct access to care coordinators, appointments, diagnostic lab reports, and billing.
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={() => setIsUploadReportOpen(true)}
              className="px-3.5 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 rounded-xl text-xs sm:text-sm font-semibold flex items-center gap-2 transition-all cursor-pointer shadow-xs"
            >
              <Upload size={15} className="text-slate-500" />
              <span>Upload Lab Report</span>
            </button>

            <button
              onClick={() => setIsNewTicketOpen(true)}
              className="px-4 py-2 bg-[#0F766E] hover:bg-[#0D625C] text-white rounded-xl text-xs sm:text-sm font-semibold flex items-center gap-2 transition-all cursor-pointer shadow-xs"
            >
              <Plus size={16} />
              <span>New Request</span>
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-8 mt-6 space-y-6">
        {/* Direct Care Helpline Strip */}
        <section className="bg-white rounded-2xl border border-slate-200/90 p-4 sm:p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start sm:items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-teal-50 text-[#0F766E] flex items-center justify-center shrink-0 border border-teal-100">
              <PhoneCall className="w-5 h-5 text-[#0F766E]" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold text-slate-900 leading-tight">
                Speak with Your Care Coordinator
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Daily 8:00 AM – 10:00 PM IST · Non-emergency clinical &amp; administrative assistance
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap shrink-0">
            <a
              href="tel:+919944023986"
              className="inline-flex items-center justify-center gap-2 px-3.5 py-2 bg-[#163824] hover:bg-[#11241A] text-white rounded-xl text-xs font-semibold shadow-xs transition-all"
            >
              <Phone size={14} />
              <span>Call +91 99440 23986</span>
            </a>

            <a
              href="https://wa.me/919944023986?text=Hi%208Liv%20Support%2C%20I%20need%20assistance%20with%20my%20care%20plan."
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 px-3.5 py-2 bg-[#00A884] hover:bg-[#009272] text-white rounded-xl text-xs font-semibold shadow-xs transition-all"
            >
              <MessageCircle size={14} />
              <span>WhatsApp</span>
            </a>

            <button
              onClick={() => {
                if (profile?.phone_number && !callbackPhone) setCallbackPhone(profile.phone_number)
                setIsCallbackModalOpen(true)
              }}
              className="inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition-all cursor-pointer"
            >
              <PhoneForwarded size={13} />
              <span>Request Callback</span>
            </button>
          </div>
        </section>

        {/* Main Work Area: Left Tickets List | Right Conversation or Quick Desk */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Column: Tickets List */}
          <div className="lg:col-span-5 flex flex-col gap-4">
            <div className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-xs">
              <div className="flex items-center justify-between mb-3 pb-3 border-b border-slate-100">
                <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                  <MessageSquare size={14} className="text-[#0F766E]" />
                  <span>My Requests ({tickets.length})</span>
                </h2>

                <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg text-[11px] font-semibold text-slate-600">
                  <button
                    onClick={() => setFilterStatus('all')}
                    className={`px-2 py-0.5 rounded-md transition-all ${filterStatus === 'all' ? 'bg-white shadow-xs text-slate-900 font-bold' : 'hover:text-slate-900'}`}
                  >
                    All
                  </button>
                  <button
                    onClick={() => setFilterStatus('open')}
                    className={`px-2 py-0.5 rounded-md transition-all ${filterStatus === 'open' ? 'bg-white shadow-xs text-slate-900 font-bold' : 'hover:text-slate-900'}`}
                  >
                    Active
                  </button>
                  <button
                    onClick={() => setFilterStatus('resolved')}
                    className={`px-2 py-0.5 rounded-md transition-all ${filterStatus === 'resolved' ? 'bg-white shadow-xs text-slate-900 font-bold' : 'hover:text-slate-900'}`}
                  >
                    Resolved
                  </button>
                </div>
              </div>

              {loading ? (
                <div className="py-12 flex flex-col items-center justify-center text-slate-400">
                  <RefreshCw size={20} className="animate-spin text-[#0F766E] mb-2" />
                  <p className="text-xs">Loading requests...</p>
                </div>
              ) : filteredTickets.length === 0 ? (
                <div className="py-8 px-4 text-center border border-dashed border-slate-200 rounded-xl bg-slate-50/50">
                  <p className="text-xs font-semibold text-slate-700">No support requests</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    {filterStatus !== 'all' ? 'No requests match this filter.' : 'Have a question? Create a request anytime.'}
                  </p>
                  <button
                    onClick={() => setIsNewTicketOpen(true)}
                    className="mt-3 inline-flex items-center gap-1 px-3 py-1.5 bg-[#0F766E] text-white text-xs font-semibold rounded-lg hover:bg-[#0D625C] transition-colors"
                  >
                    <Plus size={13} />
                    <span>Create Request</span>
                  </button>
                </div>
              ) : (
                <div className="space-y-2 max-h-[580px] overflow-y-auto pr-0.5">
                  {filteredTickets.map((t) => {
                    const isSelected = selectedTicketId === t.id
                    const catInfo = CATEGORY_MAP[t.category] || CATEGORY_MAP.general
                    const isResolved = ['resolved', 'closed'].includes(t.status)

                    return (
                      <div
                        key={t.id}
                        onClick={() => selectTicket(t.id)}
                        className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-teal-50/40 border-[#0F766E] shadow-xs ring-1 ring-[#0F766E]/20'
                            : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/60'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded border ${catInfo.color}`}>
                            {catInfo.label}
                          </span>
                          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                            isResolved 
                              ? 'bg-slate-100 text-slate-600'
                              : t.status === 'in_progress'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-emerald-100 text-emerald-800'
                          }`}>
                            {t.status.replace('_', ' ')}
                          </span>
                        </div>

                        <h3 className="text-xs sm:text-sm font-semibold text-slate-900 line-clamp-1">
                          {t.subject}
                        </h3>
                        <p className="text-[11px] text-slate-500 mt-0.5 line-clamp-1">
                          {t.description}
                        </p>

                        <div className="flex items-center justify-between mt-2 pt-1.5 border-t border-slate-100 text-[10px] text-slate-400">
                          <span className="font-mono">#TICK-{t.ticket_number || t.id.slice(0, 6)}</span>
                          <span>{new Date(t.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Diagnostic Blood Reports List */}
            <div className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-xs">
              <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-100">
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                  <FileText size={14} className="text-[#0F766E]" />
                  <span>Diagnostic Lab Reports ({labReports.length})</span>
                </h3>
                <button
                  onClick={() => setIsUploadReportOpen(true)}
                  className="text-xs font-semibold text-[#0F766E] hover:underline"
                >
                  + Upload
                </button>
              </div>

              {labReports.length === 0 ? (
                <p className="text-xs text-slate-400 py-3 text-center">
                  No diagnostic reports uploaded yet.
                </p>
              ) : (
                <div className="space-y-2 max-h-48 overflow-y-auto pr-0.5">
                  {labReports.map((report) => (
                    <div 
                      key={report.id}
                      className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-200/70 text-xs"
                    >
                      <div className="min-w-0 flex-1 pr-2">
                        <p className="font-semibold text-slate-800 truncate">{report.file_name}</p>
                        <p className="text-[10px] text-slate-500 mt-0.5 capitalize">
                          {report.report_category.replace(/_/g, ' ')} · {report.test_date ? new Date(report.test_date).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' }) : 'Recent'}
                        </p>
                      </div>
                      <a
                        href={report.file_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-2.5 py-1 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-lg text-[11px] font-semibold shrink-0 flex items-center gap-1 transition-colors"
                      >
                        <ExternalLink size={11} />
                        <span>View</span>
                      </a>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Active Conversation or Concierge Quick Desk */}
          <div className="lg:col-span-7">
            {selectedTicketId && ticketDetails ? (
              /* ACTIVE TICKET CONVERSATION */
              <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs flex flex-col h-[650px] overflow-hidden">
                {/* Header */}
                <div className="p-4 border-b border-slate-200 bg-slate-50/70 flex items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="font-mono text-xs font-bold text-[#0F766E]">
                        #TICK-{ticketDetails.ticket_number || ticketDetails.id.slice(0, 6)}
                      </span>
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded border ${
                        CATEGORY_MAP[ticketDetails.category]?.color || CATEGORY_MAP.general.color
                      }`}>
                        {CATEGORY_MAP[ticketDetails.category]?.label || ticketDetails.category}
                      </span>
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                        {ticketDetails.status.replace('_', ' ')}
                      </span>
                    </div>
                    <h3 className="text-sm sm:text-base font-bold text-slate-900 leading-snug">
                      {ticketDetails.subject}
                    </h3>
                  </div>

                  <button
                    onClick={() => setSelectedTicketId(null)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors text-xs font-semibold flex items-center gap-1"
                  >
                    <X size={16} />
                    <span className="hidden sm:inline">Close</span>
                  </button>
                </div>

                {/* Messages Timeline */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/30">
                  {/* Original inquiry card */}
                  <div className="p-3.5 rounded-xl bg-white border border-slate-200 shadow-xs">
                    <div className="flex items-center justify-between text-[11px] text-slate-400 mb-1.5">
                      <span className="font-semibold text-slate-700">Initial Request</span>
                      <span>{new Date(ticketDetails.created_at).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}</span>
                    </div>
                    <p className="text-xs sm:text-sm text-slate-800 whitespace-pre-wrap leading-relaxed">
                      {ticketDetails.description}
                    </p>
                  </div>

                  {/* Threaded replies */}
                  {loadingThread ? (
                    <div className="py-8 flex justify-center">
                      <RefreshCw size={18} className="animate-spin text-[#0F766E]" />
                    </div>
                  ) : messages.length === 0 ? (
                    <div className="py-6 text-center text-xs text-slate-500 bg-white rounded-xl border border-slate-200 p-4">
                      <p className="font-semibold text-slate-800">Assigned to Care Coordinator</p>
                      <p className="text-slate-500 mt-0.5">An 8Liv support specialist will review your request and reply shortly.</p>
                    </div>
                  ) : (
                    messages.map((m) => {
                      const isPatient = m.sender_role === 'patient' || m.sender_id === user?.id
                      const isSupport = ['support_agent', 'care_coordinator', 'admin', 'doctor'].includes(m.sender_role)

                      return (
                        <div
                          key={m.id}
                          className={`flex flex-col ${isPatient ? 'items-end' : 'items-start'}`}
                        >
                          <div className="flex items-center gap-1.5 mb-1 px-1">
                            <span className="text-[11px] font-semibold text-slate-700">
                              {isPatient ? 'You' : (m.sender_name || '8Liv Care Team')}
                            </span>
                            {isSupport && (
                              <span className="text-[9px] font-semibold uppercase bg-teal-50 text-teal-800 border border-teal-200 px-1.5 py-0.2 rounded">
                                Care Coordinator
                              </span>
                            )}
                            <span className="text-[10px] text-slate-400">
                              {new Date(m.created_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>

                          <div
                            className={`p-3 rounded-xl max-w-lg text-xs sm:text-sm leading-relaxed ${
                              isPatient
                                ? 'bg-[#0F766E] text-white'
                                : 'bg-white border border-slate-200 text-slate-800 shadow-xs'
                            }`}
                          >
                            <p className="whitespace-pre-wrap">{m.message_body}</p>
                          </div>
                        </div>
                      )
                    })
                  )}
                  <div ref={chatBottomRef} />
                </div>

                {/* Reply Composer */}
                <form onSubmit={handleSendMessage} className="p-3 bg-white border-t border-slate-200">
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={replyText}
                      onChange={(e) => setReplyText(e.target.value)}
                      placeholder="Type reply to care coordinator..."
                      disabled={sendingReply}
                      className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs sm:text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#0F766E] focus:bg-white transition-all"
                    />
                    <button
                      type="submit"
                      disabled={sendingReply || !replyText.trim()}
                      className="px-4 py-2 bg-[#0F766E] hover:bg-[#0D625C] disabled:opacity-50 text-white rounded-xl text-xs sm:text-sm font-semibold flex items-center gap-1.5 transition-all cursor-pointer shrink-0"
                    >
                      {sendingReply ? <RefreshCw size={14} className="animate-spin" /> : <Send size={14} />}
                      <span>Send</span>
                    </button>
                  </div>
                </form>
              </div>
            ) : (
              /* CONCIERGE QUICK ACTIONS OVERVIEW (When no ticket is selected) */
              <div className="space-y-6">
                <div className="bg-white rounded-2xl border border-slate-200/90 p-5 sm:p-6 shadow-xs">
                  <div className="mb-4">
                    <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                      Quick Support Actions
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Select a category below to raise a request or attach medical documentation.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    {/* Action 1: Lab Report */}
                    <div
                      onClick={() => setIsUploadReportOpen(true)}
                      className="p-4 rounded-xl border border-slate-200 hover:border-[#0F766E] hover:bg-teal-50/20 transition-all cursor-pointer group flex flex-col justify-between"
                    >
                      <div>
                        <div className="w-8 h-8 rounded-lg bg-teal-50 text-[#0F766E] flex items-center justify-center mb-2.5">
                          <FileText size={16} />
                        </div>
                        <h4 className="text-xs sm:text-sm font-bold text-slate-900 group-hover:text-[#0F766E] transition-colors">
                          Submit Blood &amp; Lab Report
                        </h4>
                        <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                          Attach recent HbA1c, thyroid panel, or lipid profiles directly to your medical chart.
                        </p>
                      </div>
                      <span className="text-[11px] font-semibold text-[#0F766E] mt-3 flex items-center gap-1">
                        Upload Report <ChevronRight size={12} />
                      </span>
                    </div>

                    {/* Action 2: Reschedule */}
                    <div
                      onClick={() => {
                        setNewCategory('booking')
                        setNewSubject('Request to Reschedule Consultation')
                        setNewDescription('Hello, I would like to reschedule my upcoming consultation to a different time slot.')
                        setIsNewTicketOpen(true)
                      }}
                      className="p-4 rounded-xl border border-slate-200 hover:border-[#0F766E] hover:bg-teal-50/20 transition-all cursor-pointer group flex flex-col justify-between"
                    >
                      <div>
                        <div className="w-8 h-8 rounded-lg bg-sky-50 text-sky-700 flex items-center justify-center mb-2.5">
                          <Calendar size={16} />
                        </div>
                        <h4 className="text-xs sm:text-sm font-bold text-slate-900 group-hover:text-[#0F766E] transition-colors">
                          Reschedule Consultation
                        </h4>
                        <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                          Need to adjust a doctor or dietitian appointment slot? We will coordinate the change.
                        </p>
                      </div>
                      <span className="text-[11px] font-semibold text-[#0F766E] mt-3 flex items-center gap-1">
                        Request Reschedule <ChevronRight size={12} />
                      </span>
                    </div>

                    {/* Action 3: Pharmacy */}
                    <div
                      onClick={() => {
                        setNewCategory('prescription')
                        setNewSubject('Prescription & Pharmacy Inquiry')
                        setNewDescription('Hello, I have a question regarding my signed digital e-prescription or pharmacy dispensing.')
                        setIsNewTicketOpen(true)
                      }}
                      className="p-4 rounded-xl border border-slate-200 hover:border-[#0F766E] hover:bg-teal-50/20 transition-all cursor-pointer group flex flex-col justify-between"
                    >
                      <div>
                        <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-700 flex items-center justify-center mb-2.5">
                          <Pill size={16} />
                        </div>
                        <h4 className="text-xs sm:text-sm font-bold text-slate-900 group-hover:text-[#0F766E] transition-colors">
                          Pharmacy &amp; Prescription
                        </h4>
                        <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                          Questions about official CDSCO e-prescriptions, medication dosing, or doorstep delivery.
                        </p>
                      </div>
                      <span className="text-[11px] font-semibold text-[#0F766E] mt-3 flex items-center gap-1">
                        Inquire Pharmacy <ChevronRight size={12} />
                      </span>
                    </div>

                    {/* Action 4: Billing */}
                    <div
                      onClick={() => {
                        setNewCategory('billing')
                        setNewSubject('GST Invoice & Receipt Request')
                        setNewDescription('Hello, please provide my statutory GST tax invoice for the recent payment transaction.')
                        setIsNewTicketOpen(true)
                      }}
                      className="p-4 rounded-xl border border-slate-200 hover:border-[#0F766E] hover:bg-teal-50/20 transition-all cursor-pointer group flex flex-col justify-between"
                    >
                      <div>
                        <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center mb-2.5">
                          <ReceiptText size={16} />
                        </div>
                        <h4 className="text-xs sm:text-sm font-bold text-slate-900 group-hover:text-[#0F766E] transition-colors">
                          GST Invoices &amp; Receipts
                        </h4>
                        <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                          Request statutory tax invoices with GST breakdown for insurance reimbursement claims.
                        </p>
                      </div>
                      <span className="text-[11px] font-semibold text-[#0F766E] mt-3 flex items-center gap-1">
                        Request Receipt <ChevronRight size={12} />
                      </span>
                    </div>
                  </div>
                </div>

                {/* Emergency Disclosure */}
                <div className="p-4 rounded-xl bg-slate-100/70 border border-slate-200 text-xs text-slate-600 flex items-start gap-2.5">
                  <AlertCircle size={15} className="text-slate-500 shrink-0 mt-0.5" />
                  <p className="leading-relaxed">
                    <strong>Medical Emergency Notice:</strong> 8Liv Support is a non-emergency concierge service. In case of acute medical emergencies, sudden chest pain, or trauma, please dial <strong>112 / 108</strong> or proceed to the nearest emergency department immediately.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modal: Raise New Ticket */}
      {isNewTicketOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl border border-slate-200 relative animate-in fade-in zoom-in-95 duration-150">
            <button
              onClick={() => setIsNewTicketOpen(false)}
              className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
            >
              <X size={16} />
            </button>

            <div className="mb-5">
              <h3 className="text-base font-bold text-slate-900">
                Raise Care Support Request
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Our care coordinators review and resolve inquiries within 2 hours.
              </p>
            </div>

            <form onSubmit={handleCreateTicket} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-700 mb-1.5 block">
                  Category *
                </label>
                <select
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-xs sm:text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#0F766E] focus:bg-white"
                >
                  <option value="booking">Appointment &amp; Rescheduling</option>
                  <option value="lab_report">Diagnostic Blood Test / Lab Report</option>
                  <option value="prescription">Prescription &amp; Pharmacy Question</option>
                  <option value="billing">Billing, Payments &amp; GST Receipt</option>
                  <option value="diet_fitness">Nutrition &amp; Workout Plan</option>
                  <option value="general">General Clinical Desk Question</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 mb-1.5 block">
                  Subject *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Summary of your inquiry"
                  value={newSubject}
                  onChange={(e) => setNewSubject(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-xs sm:text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#0F766E] focus:bg-white"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 mb-1.5 block">
                  Details *
                </label>
                <textarea
                  required
                  rows={4}
                  placeholder="Provide context, dates, or specific questions for the care team..."
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-xs sm:text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#0F766E] focus:bg-white resize-none"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsNewTicketOpen(false)}
                  className="px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingTicket}
                  className="px-4 py-2 bg-[#0F766E] hover:bg-[#0D625C] disabled:opacity-50 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all shadow-xs"
                >
                  {submittingTicket ? <RefreshCw size={13} className="animate-spin" /> : <Send size={13} />}
                  <span>Submit Request</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Categorized Blood Report Upload */}
      {isUploadReportOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl border border-slate-200 relative animate-in fade-in zoom-in-95 duration-150">
            <button
              onClick={() => setIsUploadReportOpen(false)}
              className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
            >
              <X size={16} />
            </button>

            <div className="mb-5">
              <h3 className="text-base font-bold text-slate-900">
                Upload Diagnostic Lab Report
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Attached securely to your clinical file for treating physician review.
              </p>
            </div>

            {uploadSuccessMsg ? (
              <div className="p-4 rounded-xl bg-teal-50 border border-teal-200 text-center py-6">
                <CheckCircle2 size={28} className="text-[#0F766E] mx-auto mb-2" />
                <h4 className="text-sm font-bold text-teal-950">Upload Successful</h4>
                <p className="text-xs text-teal-700 mt-0.5">{uploadSuccessMsg}</p>
              </div>
            ) : (
              <form onSubmit={handleUploadReport} className="space-y-4">
                <div>
                  <label className="text-xs font-semibold text-slate-700 mb-1.5 block">
                    Report Category *
                  </label>
                  <select
                    value={uploadCategory}
                    onChange={(e) => setUploadCategory(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-xs sm:text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#0F766E] focus:bg-white"
                  >
                    {LAB_CATEGORIES.map(c => (
                      <option key={c.value} value={c.value}>{c.label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 mb-1.5 block">
                    Test Date
                  </label>
                  <input
                    type="date"
                    value={uploadTestDate}
                    onChange={(e) => setUploadTestDate(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-xs sm:text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#0F766E] focus:bg-white"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 mb-1.5 block">
                    Select File (PDF, JPG, PNG — Max 10MB) *
                  </label>
                  <input
                    ref={fileInputRef}
                    type="file"
                    required
                    accept=".pdf,.jpg,.jpeg,.png,.webp"
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        setSelectedFile(e.target.files[0])
                      }
                    }}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-xs text-slate-700 file:mr-3 file:py-1 file:px-2.5 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-[#0F766E] file:text-white cursor-pointer"
                  />
                </div>

                <div className="pt-2 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setIsUploadReportOpen(false)}
                    className="px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={uploadingReport || !selectedFile}
                    className="px-4 py-2 bg-[#0F766E] hover:bg-[#0D625C] disabled:opacity-50 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all shadow-xs"
                  >
                    {uploadingReport ? <RefreshCw size={13} className="animate-spin" /> : <Upload size={13} />}
                    <span>Upload &amp; Notify Doctor</span>
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Modal: Request Urgent Phone Callback */}
      {isCallbackModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200 relative animate-in fade-in zoom-in-95 duration-150">
            <button
              onClick={() => setIsCallbackModalOpen(false)}
              className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
            >
              <X size={16} />
            </button>

            <div className="mb-5">
              <h3 className="text-base font-bold text-slate-900">
                Request a Phone Callback
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                An 8Liv Care Coordinator will call your mobile number directly.
              </p>
            </div>

            {callbackSuccessMsg ? (
              <div className="p-4 rounded-xl bg-teal-50 border border-teal-200 text-center py-6">
                <CheckCircle2 size={28} className="text-[#0F766E] mx-auto mb-2" />
                <h4 className="text-sm font-bold text-teal-950">Callback Scheduled</h4>
                <p className="text-xs text-teal-700 mt-0.5">{callbackSuccessMsg}</p>
              </div>
            ) : (
              <form onSubmit={handleRequestCallback} className="space-y-4">
                <div>
                  <label className="text-xs font-semibold text-slate-700 mb-1.5 block">
                    Mobile Number *
                  </label>
                  <input
                    type="tel"
                    required
                    placeholder="+91 9876543210"
                    value={callbackPhone}
                    onChange={(e) => setCallbackPhone(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-xs sm:text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#0F766E] focus:bg-white"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 mb-1.5 block">
                    Topic *
                  </label>
                  <select
                    value={callbackTopic}
                    onChange={(e) => setCallbackTopic(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-xs sm:text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#0F766E] focus:bg-white"
                  >
                    <option value="Doctor Consultation / Reschedule">Doctor Consultation / Reschedule</option>
                    <option value="Dietitian & Fitness Guidance">Dietitian &amp; Fitness Guidance</option>
                    <option value="Blood Report Question">Blood Report &amp; Diagnostic Question</option>
                    <option value="Prescription & Medicine Delivery">Prescription &amp; Delivery</option>
                    <option value="Billing & Invoicing">Billing &amp; Tax Invoices</option>
                    <option value="General Health Desk Inquiry">General Inquiry</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 mb-1.5 block">
                    Preferred Window
                  </label>
                  <select
                    value={callbackWindow}
                    onChange={(e) => setCallbackWindow(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-xs sm:text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#0F766E] focus:bg-white"
                  >
                    <option value="Immediate (within 15–30 mins)">Immediate (within 15–30 mins)</option>
                    <option value="Today Afternoon (1:00 PM – 4:00 PM)">Today Afternoon (1:00 PM – 4:00 PM)</option>
                    <option value="Today Evening (5:00 PM – 8:00 PM)">Today Evening (5:00 PM – 8:00 PM)</option>
                    <option value="Tomorrow Morning (9:00 AM – 12:00 PM)">Tomorrow Morning (9:00 AM – 12:00 PM)</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 mb-1.5 block">
                    Note (Optional)
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Specific questions or details..."
                    value={callbackNotes}
                    onChange={(e) => setCallbackNotes(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#0F766E] focus:bg-white resize-none"
                  />
                </div>

                <div className="pt-2 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setIsCallbackModalOpen(false)}
                    className="px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={requestingCallback}
                    className="px-4 py-2 bg-[#0F766E] hover:bg-[#0D625C] disabled:opacity-50 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all shadow-xs"
                  >
                    {requestingCallback ? <RefreshCw size={13} className="animate-spin" /> : <PhoneCall size={13} />}
                    <span>Schedule Call</span>
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
