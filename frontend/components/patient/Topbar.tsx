'use client'

import React, { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Bell, Search, User, Settings, LogOut, Menu, X, ChevronRight, ChevronDown, ShieldCheck, Stethoscope } from 'lucide-react'
import { supabase } from '@/lib/supabaseClient'

interface TopbarProps {
  pageTitle: string
  breadcrumbs: string[]
  initials: string
  patientName?: string
  notificationsCount?: number
  onMenuToggle?: () => void
  notifications?: any[]
  assessment?: any
  consultation?: any
}

export default function Topbar({
  pageTitle,
  breadcrumbs,
  initials,
  patientName = 'Patient Member',
  notificationsCount = 0,
  onMenuToggle,
  notifications = [],
  assessment,
  consultation
}: TopbarProps) {
  const router = useRouter()
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Search State Hooks
  const [searchQuery, setSearchQuery] = useState('')
  const [showResults, setShowResults] = useState(false)
  const searchRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowResults(false)
      }
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleSearchChange = (val: string) => {
    setSearchQuery(val)
    setShowResults(val.trim() !== '')
  }

  // Filter logic across quick modules, appointments, prescriptions, and notifications
  const getSearchResults = () => {
    if (!searchQuery.trim()) return []
    const q = searchQuery.toLowerCase().trim()
    const results: { category: string; title: string; subtitle: string; link: string }[] = []

    const quickLinks = [
      { keywords: ['weight', 'progress', 'log', 'scale', 'loss', 'kg', 'trend'], category: 'Progress', title: 'Weight & Progress History', subtitle: 'View weight trend logs and metrics', link: '/patient/progress' },
      { keywords: ['appointment', 'doctor', 'visit', 'schedule', 'booking', 'slot', 'calendar', 'consult'], category: 'Appointments', title: 'Appointments & Schedule', subtitle: 'View or book doctor consultations', link: '/patient/appointments' },
      { keywords: ['prescription', 'medicine', 'medication', 'refill', 'dose', 'drug', 'glp'], category: 'Prescriptions', title: 'Prescriptions & Protocol', subtitle: 'View current medications and e-prescriptions', link: '/patient/prescriptions' },
      { keywords: ['consultation', 'consult', 'call', 'video', 'meeting'], category: 'Consultations', title: 'Doctor Consultations', subtitle: 'View past consultation history and notes', link: '/patient/consultation' },
      { keywords: ['bill', 'billing', 'invoice', 'payment', 'receipt', 'charge', 'money'], category: 'Billing', title: 'Billing & Invoices', subtitle: 'Download receipts and invoices', link: '/patient/billing' },
      { keywords: ['profile', 'account', 'phone', 'address', 'email', 'name', 'biometrics'], category: 'Profile', title: 'Clinical Profile & Biometrics', subtitle: 'Manage personal details and biometrics', link: '/patient/profile' },
      { keywords: ['setting', 'settings', 'password', 'security'], category: 'Settings', title: 'Account Settings', subtitle: 'Security and communication preferences', link: '/patient/settings' },
    ]

    quickLinks.forEach(item => {
      if (item.keywords.some(k => q.includes(k)) || item.title.toLowerCase().includes(q)) {
        results.push({
          category: item.category,
          title: item.title,
          subtitle: item.subtitle,
          link: item.link
        })
      }
    })

    // Search Appointments
    const docName = consultation?.doctor_profiles?.full_name || ''
    const bookingDate = assessment?.booking_date || ''
    const bookingTime = assessment?.booking_time || ''
    if (
      (docName && docName.toLowerCase().includes(q)) ||
      (bookingDate && bookingDate.toLowerCase().includes(q)) ||
      (bookingTime && bookingTime.toLowerCase().includes(q))
    ) {
      results.push({
        category: 'Appointments',
        title: `Consultation with ${docName || 'Doctor'}`,
        subtitle: `Scheduled: ${bookingDate} at ${bookingTime}`,
        link: '/patient/appointments'
      })
    }

    // Search Prescriptions
    const rxText = consultation?.prescription_text || ''
    if (rxText && rxText.toLowerCase().includes(q)) {
      results.push({
        category: 'Prescriptions',
        title: rxText,
        subtitle: 'Prescription details, refills & directions',
        link: '/patient/prescriptions'
      })
    }

    // Search Notifications
    if (notifications && Array.isArray(notifications)) {
      notifications.forEach(n => {
        if ((n.title && n.title.toLowerCase().includes(q)) || (n.message && n.message.toLowerCase().includes(q))) {
          results.push({
            category: 'Notifications',
            title: n.title || 'Notification Update',
            subtitle: n.message || '',
            link: '/patient/notifications'
          })
        }
      })
    }

    return results
  }

  const searchResults = getSearchResults()

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut()
      document.cookie = 'user_role=; path=/; expires=Thu, 01 Jan 1970 00:00:00 UTC; SameSite=Lax'
      router.push('/')
    } catch (err) {
      console.error('Sign out error:', err)
    }
  }

  // Format clean human name if email prefix looks robot-like
  const formattedDisplayName = React.useMemo(() => {
    if (!patientName || patientName === 'JK' || patientName === 'Patient') return 'Patient Member'
    return patientName
  }, [patientName])

  return (
    <header className="sticky top-0 z-20 bg-white/95 backdrop-blur-md border-b border-stone-200/80 shadow-2xs">
      <div className="flex items-center justify-between h-16 px-5 sm:px-8 gap-4">
        
        {/* Left: Mobile menu toggle + Clinical Search Bar */}
        <div className="flex items-center gap-3 flex-1 min-w-0 max-w-xl">
          {onMenuToggle && (
            <button 
              onClick={onMenuToggle}
              className="lg:hidden p-2 text-slate-700 hover:bg-slate-100 rounded-xl transition-all shrink-0 cursor-pointer"
              aria-label="Toggle Navigation Menu"
            >
              <Menu className="w-5 h-5" />
            </button>
          )}

          {/* Clinical Search Command Bar */}
          <div className="relative w-full max-w-md" ref={searchRef}>
            <div className="flex items-center gap-2.5 bg-slate-50/80 hover:bg-white focus-within:bg-white border border-slate-200/80 focus-within:border-[#00A884] focus-within:ring-4 focus-within:ring-[#00A884]/10 rounded-2xl px-3.5 py-2 transition-all shadow-2xs">
              <Search size={15} className="text-slate-400 shrink-0" />
              <input 
                placeholder="Search clinical records, appointments, prescriptions..." 
                value={searchQuery}
                onChange={e => handleSearchChange(e.target.value)}
                onFocus={() => searchQuery.trim() !== '' && setShowResults(true)}
                className="bg-transparent outline-none text-xs text-slate-800 placeholder:text-slate-400 w-full min-w-0 font-medium"
              />
              {searchQuery ? (
                <button 
                  onClick={() => { setSearchQuery(''); setShowResults(false); }}
                  className="p-0.5 hover:bg-slate-200 rounded-full text-slate-400 transition-colors cursor-pointer"
                >
                  <X size={12} />
                </button>
              ) : (
                <span className="hidden sm:inline text-[10px] font-mono font-semibold text-slate-400 bg-slate-200/60 px-1.5 py-0.5 rounded border border-slate-200">
                  ⌘K
                </span>
              )}
            </div>

            {/* Universal Search Dropdown Overlay */}
            {showResults && (
              <div className="absolute left-0 mt-2 w-full min-w-[300px] bg-white border border-stone-200/90 rounded-2xl shadow-xl p-3 z-50 max-h-96 overflow-y-auto animate-fade-in-up">
                {searchResults.length > 0 ? (
                  <div className="space-y-3">
                    {['Progress', 'Appointments', 'Prescriptions', 'Consultations', 'Billing', 'Profile', 'Settings', 'Notifications'].map(cat => {
                      const items = searchResults.filter(r => r.category === cat)
                      if (items.length === 0) return null

                      return (
                        <div key={cat} className="space-y-1">
                          <p className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400 px-2">{cat}</p>
                          {items.map((item, idx) => (
                            <button
                              key={idx}
                              onClick={() => {
                                setSearchQuery('')
                                setShowResults(false)
                                router.push(item.link)
                              }}
                              className="w-full text-left px-3 py-2 rounded-xl hover:bg-emerald-50/60 transition-colors flex items-center justify-between group cursor-pointer"
                            >
                              <div className="min-w-0 pr-2">
                                <p className="text-xs font-semibold text-slate-800 truncate group-hover:text-[#00A884] transition-colors">{item.title}</p>
                                <p className="text-[10px] text-slate-400 truncate mt-0.5">{item.subtitle}</p>
                              </div>
                              <ChevronRight size={12} className="text-slate-400 opacity-0 group-hover:opacity-100 transition-all shrink-0" />
                            </button>
                          ))}
                        </div>
                      )
                    })}
                  </div>
                ) : (
                  <div className="text-center py-6 space-y-1">
                    <p className="text-xs font-semibold text-slate-700">No clinical records found for &ldquo;{searchQuery}&rdquo;</p>
                    <p className="text-[10px] text-slate-400">Try searching for &lsquo;weight&rsquo;, &lsquo;doctor&rsquo;, &lsquo;prescription&rsquo;, or &lsquo;appointments&rsquo;.</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Right side: Clinical Status Pill + Bell + User Profile */}
        <div className="flex items-center gap-3 sm:gap-4 shrink-0">
          

          {/* Notifications Bell */}
          <button 
            onClick={() => router.push('/patient/notifications')}
            className="relative p-2 rounded-xl text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors shrink-0 cursor-pointer"
            aria-label="View notifications"
          >
            <Bell size={18} />
            {notificationsCount > 0 && (
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-[#00A884] rounded-full ring-2 ring-white" />
            )}
          </button>

          {/* Avatar Dropdown */}
          <div className="relative" ref={dropdownRef}>
            <button 
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className="flex items-center gap-2.5 p-1 sm:pr-3 rounded-full hover:bg-slate-100/80 transition-all cursor-pointer group"
            >
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#00A884] to-[#0A8F70] text-white font-bold text-xs flex items-center justify-center shrink-0 shadow-sm ring-2 ring-emerald-50 select-none">
                {initials || 'P'}
              </div>
              <div className="hidden sm:flex flex-col text-left">
                <span className="text-xs font-bold text-[#11241A] leading-tight truncate max-w-[130px]">
                  {formattedDisplayName}
                </span>
                <span className="text-[10px] font-mono text-slate-400 font-medium flex items-center gap-0.5 leading-tight mt-0.5">
                  Patient <ChevronDown size={10} className="text-slate-400 group-hover:text-slate-700 transition-colors" />
                </span>
              </div>
            </button>

            {dropdownOpen && (
              <div className="absolute right-0 mt-2 w-52 bg-white border border-stone-200/90 rounded-2xl shadow-xl py-2 z-50 animate-fade-in-up font-sans">
                <div className="px-4 py-2 border-b border-slate-100">
                  <p className="text-xs font-bold text-[#11241A] truncate">{formattedDisplayName}</p>
                  <p className="text-[10px] text-slate-400 truncate mt-0.5">Clinical Patient Portal</p>
                </div>
                <button 
                  onClick={() => { setDropdownOpen(false); router.push('/patient/profile'); }}
                  className="w-full text-left px-4 py-2.5 hover:bg-slate-50 text-slate-700 text-xs font-medium transition-all flex items-center gap-2.5 cursor-pointer"
                >
                  <User size={14} className="text-slate-400" />
                  <span>Clinical Profile & Biometrics</span>
                </button>
                <button 
                  onClick={() => { setDropdownOpen(false); router.push('/patient/settings'); }}
                  className="w-full text-left px-4 py-2.5 hover:bg-slate-50 text-slate-700 text-xs font-medium transition-all flex items-center gap-2.5 cursor-pointer"
                >
                  <Settings size={14} className="text-slate-400" />
                  <span>Account & Privacy</span>
                </button>
                <hr className="border-slate-100 my-1" />
                <button 
                  onClick={handleLogout}
                  className="w-full text-left px-4 py-2.5 hover:bg-rose-50 text-rose-600 text-xs font-medium transition-all flex items-center gap-2.5 cursor-pointer"
                >
                  <LogOut size={14} className="text-rose-500" />
                  <span>Sign Out</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  )
}
