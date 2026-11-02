'use client'

import React, { useState, useEffect, useRef } from 'react'
import { 
  LifeBuoy, Plus, MessageSquare, Send, Paperclip, FileText, CheckCircle2,
  Clock, AlertCircle, Calendar, RefreshCw, Upload, ShieldCheck, ChevronRight,
  Pill, ArrowRight, X, ExternalLink, HelpCircle, Check, Sparkles
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

const CATEGORY_MAP: Record<string, { label: string; color: string; icon: string }> = {
  booking: { label: 'Appointment / Reschedule', color: 'bg-blue-50 text-blue-700 border-blue-200', icon: '📅' },
  lab_report: { label: 'Blood Test / Lab Report', color: 'bg-emerald-50 text-emerald-700 border-emerald-200', icon: '🧪' },
  billing: { label: 'Billing & GST Invoices', color: 'bg-amber-50 text-amber-700 border-amber-200', icon: '💳' },
  prescription: { label: 'Prescription & Pharmacy', color: 'bg-purple-50 text-purple-700 border-purple-200', icon: '💊' },
  diet_fitness: { label: 'Nutrition & Fitness', color: 'bg-teal-50 text-teal-700 border-teal-200', icon: '🥗' },
  general: { label: 'General / Account Support', color: 'bg-slate-100 text-slate-700 border-slate-200', icon: '⚙️' },
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

  const fileInputRef = useRef<HTMLInputElement>(null)
  const chatBottomRef = useRef<HTMLDivElement>(null)

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
      console.error('Failed to load ticket thread:', err)
    } finally {
      setLoadingThread(false)
    }
  }

  // Send message in thread
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!replyText.trim() || !selectedTicketId || sendingReply) return

    setSendingReply(true)
    try {
      const res = await authedFetch(`/api/support/tickets/${selectedTicketId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: replyText.trim() }),
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
      alert(err.message || 'Error communicating with server.')
    } finally {
      setSendingReply(false)
    }
  }

  // Create new ticket
  const handleCreateTicket = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newSubject.trim() || !newDescription.trim()) {
      alert('Please enter a subject and details for your request.')
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
        // Automatically open the created ticket
        selectTicket(data.ticket.id)
      } else {
        alert(data.error || 'Failed to submit support ticket.')
      }
    } catch (err: any) {
      alert(err.message || 'Network error while creating ticket.')
    } finally {
      setSubmittingTicket(false)
    }
  }

  // Upload blood report
  const handleUploadReport = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedFile) {
      alert('Please choose a report file (PDF, JPG, PNG).')
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
        setUploadSuccessMsg('Report attached successfully! Your treating physician and care team have been alerted.')
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

  const filteredTickets = tickets.filter(t => {
    if (filterStatus === 'all') return true
    if (filterStatus === 'open') return ['open', 'in_progress', 'waiting_on_patient'].includes(t.status)
    if (filterStatus === 'resolved') return ['resolved', 'closed'].includes(t.status)
    return true
  })

  return (
    <div className="min-h-screen bg-slate-50/60 pb-16">
      {/* Top Banner & Header */}
      <div className="bg-white border-b border-slate-200/80 px-4 sm:px-8 py-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[#00A884] to-[#0A8F70] flex items-center justify-center text-white shadow-md shadow-emerald-500/15">
                  <LifeBuoy size={20} className="animate-spin-slow" />
                </div>
                <div>
                  <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                    Patient Care & Concierge Support
                  </h1>
                  <p className="text-xs sm:text-sm text-slate-500 font-medium mt-0.5">
                    Direct channel to your 8Liv Care Coordinator, medical board, and administrative assistance.
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2.5 flex-wrap">
              <button
                onClick={() => setIsUploadReportOpen(true)}
                className="px-4 py-2.5 bg-emerald-50 hover:bg-emerald-100 text-[#00A884] border border-emerald-200/80 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 transition-all cursor-pointer shadow-sm"
              >
                <Upload size={15} />
                <span>Upload Blood Report</span>
              </button>

              <button
                onClick={() => setIsNewTicketOpen(true)}
                className="px-4 py-2.5 bg-[#00A884] hover:bg-[#0A8F70] text-white rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 transition-all cursor-pointer shadow-md shadow-emerald-500/20"
              >
                <Plus size={16} />
                <span>Raise New Request</span>
              </button>
            </div>
          </div>

          {/* Quick SLA Badge */}
          <div className="mt-4 flex flex-wrap items-center gap-3 text-xs text-slate-600 bg-slate-50 p-2.5 rounded-xl border border-slate-200/60">
            <div className="flex items-center gap-1.5 font-bold text-emerald-700">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>Care Hours: 8:00 AM – 10:00 PM IST</span>
            </div>
            <span className="text-slate-300">•</span>
            <span>Average response time: &lt; 2 hours</span>
            <span className="text-slate-300">•</span>
            <span className="text-slate-500">Non-emergency clinical & administrative desk</span>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-8 mt-6">
        {/* Quick Common Action Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div 
            onClick={() => setIsUploadReportOpen(true)}
            className="p-4 bg-white rounded-2xl border border-slate-200/80 shadow-xs hover:border-[#00A884] hover:shadow-md transition-all cursor-pointer group"
          >
            <div className="flex items-center justify-between mb-2">
              <div className="w-9 h-9 rounded-xl bg-emerald-50 text-[#00A884] flex items-center justify-center font-bold">
                🧪
              </div>
              <span className="text-xs font-bold text-[#00A884] group-hover:translate-x-0.5 transition-transform flex items-center gap-0.5">
                Upload <ChevronRight size={13} />
              </span>
            </div>
            <h3 className="text-sm font-bold text-slate-900">Submit Blood Test</h3>
            <p className="text-xs text-slate-500 mt-1 leading-relaxed">
              Upload recent HbA1c, lipid profile, or thyroid tests for physician dosage review.
            </p>
          </div>

          <div 
            onClick={() => {
              setNewCategory('booking')
              setNewSubject('Request to Reschedule Consultation')
              setNewDescription('Hello, I would like to reschedule my upcoming consultation to a different time slot.')
              setIsNewTicketOpen(true)
            }}
            className="p-4 bg-white rounded-2xl border border-slate-200/80 shadow-xs hover:border-blue-400 hover:shadow-md transition-all cursor-pointer group"
          >
            <div className="flex items-center justify-between mb-2">
              <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                📅
              </div>
              <span className="text-xs font-bold text-blue-600 group-hover:translate-x-0.5 transition-transform flex items-center gap-0.5">
                Reschedule <ChevronRight size={13} />
              </span>
            </div>
            <h3 className="text-sm font-bold text-slate-900">Reschedule Visit</h3>
            <p className="text-xs text-slate-500 mt-1 leading-relaxed">
              Need to change your doctor or dietitian slot? Our care coordinators will adjust it.
            </p>
          </div>

          <div 
            onClick={() => {
              setNewCategory('prescription')
              setNewSubject('Prescription / Pharmacy Inquiry')
              setNewDescription('Hello, I have a question regarding my signed digital e-prescription or pharmacy dispensing.')
              setIsNewTicketOpen(true)
            }}
            className="p-4 bg-white rounded-2xl border border-slate-200/80 shadow-xs hover:border-purple-400 hover:shadow-md transition-all cursor-pointer group"
          >
            <div className="flex items-center justify-between mb-2">
              <div className="w-9 h-9 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold">
                💊
              </div>
              <span className="text-xs font-bold text-purple-600 group-hover:translate-x-0.5 transition-transform flex items-center gap-0.5">
                Inquire <ChevronRight size={13} />
              </span>
            </div>
            <h3 className="text-sm font-bold text-slate-900">Pharmacy & Rx</h3>
            <p className="text-xs text-slate-500 mt-1 leading-relaxed">
              Official CDSCO e-prescriptions are valid at any licensed Indian pharmacy of your choice.
            </p>
          </div>

          <div 
            onClick={() => {
              setNewCategory('billing')
              setNewSubject('GST Invoice & Receipt Request')
              setNewDescription('Hello, please provide my statutory GST tax invoice for the recent payment transaction.')
              setIsNewTicketOpen(true)
            }}
            className="p-4 bg-white rounded-2xl border border-slate-200/80 shadow-xs hover:border-amber-400 hover:shadow-md transition-all cursor-pointer group"
          >
            <div className="flex items-center justify-between mb-2">
              <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
                💳
              </div>
              <span className="text-xs font-bold text-amber-600 group-hover:translate-x-0.5 transition-transform flex items-center gap-0.5">
                Request <ChevronRight size={13} />
              </span>
            </div>
            <h3 className="text-sm font-bold text-slate-900">GST Tax Invoices</h3>
            <p className="text-xs text-slate-500 mt-1 leading-relaxed">
              Download statutory tax receipts with 18% GST breakdown for medical insurance claim.
            </p>
          </div>
        </div>

        {/* Main Split Layout: Tickets & Conversation Thread */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Tickets List */}
          <div className="lg:col-span-5 flex flex-col gap-4">
            <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-xs">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-extrabold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                  <MessageSquare size={16} className="text-[#00A884]" />
                  <span>My Support Requests</span>
                </h2>

                <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl text-xs font-bold text-slate-600">
                  <button
                    onClick={() => setFilterStatus('all')}
                    className={`px-2.5 py-1 rounded-lg transition-all ${filterStatus === 'all' ? 'bg-white shadow-xs text-slate-900' : 'hover:text-slate-900'}`}
                  >
                    All ({tickets.length})
                  </button>
                  <button
                    onClick={() => setFilterStatus('open')}
                    className={`px-2.5 py-1 rounded-lg transition-all ${filterStatus === 'open' ? 'bg-white shadow-xs text-slate-900' : 'hover:text-slate-900'}`}
                  >
                    Active
                  </button>
                  <button
                    onClick={() => setFilterStatus('resolved')}
                    className={`px-2.5 py-1 rounded-lg transition-all ${filterStatus === 'resolved' ? 'bg-white shadow-xs text-slate-900' : 'hover:text-slate-900'}`}
                  >
                    Resolved
                  </button>
                </div>
              </div>

              {loading ? (
                <div className="py-12 flex flex-col items-center justify-center text-slate-400">
                  <RefreshCw size={24} className="animate-spin text-[#00A884] mb-2" />
                  <p className="text-xs">Loading support requests...</p>
                </div>
              ) : filteredTickets.length === 0 ? (
                <div className="py-10 px-4 text-center border-2 border-dashed border-slate-200 rounded-xl">
                  <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-3">
                    <LifeBuoy size={22} />
                  </div>
                  <h4 className="text-sm font-bold text-slate-800">No support requests found</h4>
                  <p className="text-xs text-slate-500 mt-1 max-w-xs mx-auto">
                    {filterStatus !== 'all' 
                      ? 'No tickets match the selected filter.'
                      : 'Have questions or need assistance? Raise a new support request anytime.'}
                  </p>
                  <button
                    onClick={() => setIsNewTicketOpen(true)}
                    className="mt-3.5 inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-[#00A884] text-white text-xs font-bold rounded-lg hover:bg-[#0A8F70] transition-colors"
                  >
                    <Plus size={14} />
                    <span>Raise Request</span>
                  </button>
                </div>
              ) : (
                <div className="space-y-2.5 max-h-[580px] overflow-y-auto pr-1">
                  {filteredTickets.map((t) => {
                    const isSelected = selectedTicketId === t.id
                    const catInfo = CATEGORY_MAP[t.category] || CATEGORY_MAP.general
                    const isResolved = ['resolved', 'closed'].includes(t.status)

                    return (
                      <div
                        key={t.id}
                        onClick={() => selectTicket(t.id)}
                        className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer relative ${
                          isSelected
                            ? 'bg-emerald-50/50 border-[#00A884] shadow-xs ring-1 ring-[#00A884]/30'
                            : 'bg-white border-slate-200/80 hover:border-slate-300 hover:bg-slate-50/50'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2 mb-1.5">
                          <span className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-md border ${catInfo.color}`}>
                            {catInfo.icon} {catInfo.label}
                          </span>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            isResolved 
                              ? 'bg-slate-100 text-slate-600'
                              : t.status === 'in_progress'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-emerald-100 text-emerald-800'
                          }`}>
                            {t.status.replace('_', ' ').toUpperCase()}
                          </span>
                        </div>

                        <h4 className="text-xs sm:text-sm font-bold text-slate-900 line-clamp-1">
                          {t.subject}
                        </h4>
                        <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">
                          {t.description}
                        </p>

                        <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-100 text-[11px] text-slate-400">
                          <span className="font-mono">#TICK-{t.ticket_number || t.id.slice(0, 6)}</span>
                          <span>{new Date(t.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Uploaded Blood Reports Card */}
            <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-xs">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                  <span>🧪</span>
                  <span>My Uploaded Diagnostic Reports</span>
                </h3>
                <button
                  onClick={() => setIsUploadReportOpen(true)}
                  className="text-xs font-bold text-[#00A884] hover:underline"
                >
                  + Upload New
                </button>
              </div>

              {labReports.length === 0 ? (
                <p className="text-xs text-slate-500 py-3 text-center">
                  No blood reports uploaded yet. Upload recent test results to assist your doctor.
                </p>
              ) : (
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {labReports.map((report) => (
                    <div 
                      key={report.id}
                      className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-200/60 text-xs"
                    >
                      <div className="min-w-0 flex-1 pr-2">
                        <p className="font-bold text-slate-800 truncate">{report.file_name}</p>
                        <p className="text-[11px] text-slate-500 mt-0.5">
                          {report.report_category.replace(/_/g, ' ').toUpperCase()} • {report.test_date ? new Date(report.test_date).toLocaleDateString() : 'Recent'}
                        </p>
                      </div>
                      <a
                        href={report.file_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-2.5 py-1 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-lg text-[11px] font-bold shrink-0 flex items-center gap-1 transition-colors"
                      >
                        <ExternalLink size={12} />
                        <span>View</span>
                      </a>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Ticket Conversation Thread */}
          <div className="lg:col-span-7">
            {selectedTicketId && ticketDetails ? (
              <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs flex flex-col h-[700px] overflow-hidden">
                {/* Thread Header */}
                <div className="p-4 border-b border-slate-200/80 bg-slate-50/50 flex items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono text-xs font-extrabold text-[#00A884]">
                        #TICK-{ticketDetails.ticket_number || ticketDetails.id.slice(0, 6)}
                      </span>
                      <span className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-md border ${
                        CATEGORY_MAP[ticketDetails.category]?.color || CATEGORY_MAP.general.color
                      }`}>
                        {CATEGORY_MAP[ticketDetails.category]?.label || ticketDetails.category}
                      </span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                        {ticketDetails.status.toUpperCase()}
                      </span>
                    </div>
                    <h3 className="text-base font-extrabold text-slate-900 mt-1">
                      {ticketDetails.subject}
                    </h3>
                  </div>

                  <button
                    onClick={() => setSelectedTicketId(null)}
                    className="lg:hidden p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100"
                  >
                    <X size={18} />
                  </button>
                </div>

                {/* Messages Timeline */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/30">
                  {/* Original ticket request card */}
                  <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-xs">
                    <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
                      <span className="font-bold text-slate-700">Initial Request</span>
                      <span>{new Date(ticketDetails.created_at).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}</span>
                    </div>
                    <p className="text-xs sm:text-sm text-slate-800 whitespace-pre-wrap leading-relaxed">
                      {ticketDetails.description}
                    </p>
                  </div>

                  {/* Threaded replies */}
                  {loadingThread ? (
                    <div className="py-8 flex justify-center">
                      <RefreshCw size={20} className="animate-spin text-[#00A884]" />
                    </div>
                  ) : messages.length === 0 ? (
                    <div className="py-6 text-center text-xs text-slate-500 bg-emerald-50/50 rounded-xl border border-emerald-100 p-4">
                      <Sparkles size={18} className="mx-auto text-[#00A884] mb-1.5" />
                      <p className="font-bold text-slate-800">Care Coordinator Assigned</p>
                      <p className="mt-0.5">An 8Liv support specialist will review your request and reply shortly.</p>
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
                            <span className="text-[11px] font-bold text-slate-700">
                              {isPatient ? 'You' : (m.sender_name || '8Liv Care Team')}
                            </span>
                            {isSupport && (
                              <span className="text-[9px] font-extrabold uppercase bg-emerald-100 text-emerald-800 px-1.5 py-0.2 rounded-md">
                                Official Care Team
                              </span>
                            )}
                            <span className="text-[10px] text-slate-400">
                              {new Date(m.created_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>

                          <div
                            className={`p-3.5 rounded-2xl max-w-lg text-xs sm:text-sm leading-relaxed shadow-xs ${
                              isPatient
                                ? 'bg-gradient-to-r from-[#00A884] to-[#0A8F70] text-white rounded-tr-xs'
                                : 'bg-white border border-slate-200 text-slate-800 rounded-tl-xs'
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
                <form onSubmit={handleSendMessage} className="p-3.5 bg-white border-t border-slate-200/80">
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={replyText}
                      onChange={(e) => setReplyText(e.target.value)}
                      placeholder="Type your response to the care team..."
                      disabled={sendingReply}
                      className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs sm:text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#00A884] focus:bg-white transition-all"
                    />
                    <button
                      type="submit"
                      disabled={sendingReply || !replyText.trim()}
                      className="px-4 py-2.5 bg-[#00A884] hover:bg-[#0A8F70] disabled:opacity-50 text-white rounded-xl text-xs sm:text-sm font-bold flex items-center gap-1.5 transition-all cursor-pointer shrink-0"
                    >
                      {sendingReply ? <RefreshCw size={14} className="animate-spin" /> : <Send size={14} />}
                      <span>Send</span>
                    </button>
                  </div>
                </form>
              </div>
            ) : (
              <div className="bg-white rounded-2xl border border-slate-200/80 p-12 text-center h-[500px] flex flex-col items-center justify-center shadow-xs">
                <div className="w-16 h-16 rounded-3xl bg-emerald-50 text-[#00A884] flex items-center justify-center mx-auto mb-4">
                  <MessageSquare size={28} />
                </div>
                <h3 className="text-base font-bold text-slate-900">Select a support ticket to view conversation</h3>
                <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                  Click any ticket from the left column to read replies from your care coordinator or send updates.
                </p>
                <button
                  onClick={() => setIsNewTicketOpen(true)}
                  className="mt-4 px-4 py-2 bg-[#00A884] hover:bg-[#0A8F70] text-white text-xs font-bold rounded-xl transition-all shadow-sm"
                >
                  Create New Request
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modal: Raise New Ticket */}
      {isNewTicketOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 relative animate-in fade-in zoom-in-95 duration-200">
            <button
              onClick={() => setIsNewTicketOpen(false)}
              className="absolute top-5 right-5 p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
            >
              <X size={18} />
            </button>

            <div className="flex items-center gap-2.5 mb-5">
              <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-[#00A884] flex items-center justify-center font-bold">
                <LifeBuoy size={20} />
              </div>
              <div>
                <h3 className="text-base sm:text-lg font-black text-slate-900">
                  Raise Care Support Request
                </h3>
                <p className="text-xs text-slate-500">
                  Our care coordination team responds within 2 hours.
                </p>
              </div>
            </div>

            <form onSubmit={handleCreateTicket} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-700 mb-1.5 block">
                  Category *
                </label>
                <select
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-3 text-xs sm:text-sm font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#00A884]"
                >
                  <option value="booking">📅 Appointment / Rescheduling</option>
                  <option value="lab_report">🧪 Blood Test / Diagnostic Report</option>
                  <option value="billing">💳 Billing, Payments & GST Receipt</option>
                  <option value="prescription">💊 Prescription & Pharmacy Question</option>
                  <option value="diet_fitness">🥗 Diet & Workout Question</option>
                  <option value="general">⚙️ Account / General Support</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 mb-1.5 block">
                  Subject *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Brief summary of your request"
                  value={newSubject}
                  onChange={(e) => setNewSubject(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-3 text-xs sm:text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#00A884]"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 mb-1.5 block">
                  Details *
                </label>
                <textarea
                  required
                  rows={4}
                  placeholder="Provide any relevant details, preferred dates/times, or questions..."
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-3 text-xs sm:text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#00A884] resize-none"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsNewTicketOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs sm:text-sm font-bold text-slate-600 hover:bg-slate-100 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingTicket}
                  className="px-5 py-2.5 bg-[#00A884] hover:bg-[#0A8F70] disabled:opacity-50 text-white rounded-xl text-xs sm:text-sm font-bold flex items-center gap-1.5 transition-all shadow-md shadow-emerald-500/20"
                >
                  {submittingTicket ? <RefreshCw size={14} className="animate-spin" /> : <Send size={14} />}
                  <span>Submit Request</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Categorized Blood Report Upload */}
      {isUploadReportOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 relative animate-in fade-in zoom-in-95 duration-200">
            <button
              onClick={() => setIsUploadReportOpen(false)}
              className="absolute top-5 right-5 p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
            >
              <X size={18} />
            </button>

            <div className="flex items-center gap-2.5 mb-5">
              <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-[#00A884] flex items-center justify-center font-bold">
                🧪
              </div>
              <div>
                <h3 className="text-base sm:text-lg font-black text-slate-900">
                  Upload Diagnostic Blood Report
                </h3>
                <p className="text-xs text-slate-500">
                  Directly attaches to your clinical chart and notifies treating physician.
                </p>
              </div>
            </div>

            {uploadSuccessMsg ? (
              <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-center py-6">
                <CheckCircle2 size={32} className="text-[#00A884] mx-auto mb-2" />
                <h4 className="text-sm font-extrabold text-emerald-950">Upload Successful</h4>
                <p className="text-xs text-emerald-700 mt-1">{uploadSuccessMsg}</p>
              </div>
            ) : (
              <form onSubmit={handleUploadReport} className="space-y-4">
                <div>
                  <label className="text-xs font-bold text-slate-700 mb-1.5 block">
                    Report Category *
                  </label>
                  <select
                    value={uploadCategory}
                    onChange={(e) => setUploadCategory(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-3 text-xs sm:text-sm font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#00A884]"
                  >
                    {LAB_CATEGORIES.map(c => (
                      <option key={c.value} value={c.value}>{c.label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 mb-1.5 block">
                    Sample / Test Date
                  </label>
                  <input
                    type="date"
                    value={uploadTestDate}
                    onChange={(e) => setUploadTestDate(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-3 text-xs sm:text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#00A884]"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 mb-1.5 block">
                    Select File (PDF, JPG, PNG - Max 10MB) *
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
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-xs text-slate-700 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-[#00A884] file:text-white cursor-pointer"
                  />
                </div>

                <div className="pt-2 flex items-center justify-end gap-2.5">
                  <button
                    type="button"
                    onClick={() => setIsUploadReportOpen(false)}
                    className="px-4 py-2 rounded-xl text-xs sm:text-sm font-bold text-slate-600 hover:bg-slate-100 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={uploadingReport || !selectedFile}
                    className="px-5 py-2.5 bg-[#00A884] hover:bg-[#0A8F70] disabled:opacity-50 text-white rounded-xl text-xs sm:text-sm font-bold flex items-center gap-1.5 transition-all shadow-md shadow-emerald-500/20"
                  >
                    {uploadingReport ? <RefreshCw size={14} className="animate-spin" /> : <Upload size={14} />}
                    <span>Upload & Notify Doctor</span>
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

