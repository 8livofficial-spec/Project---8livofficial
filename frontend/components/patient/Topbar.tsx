'use client'

import React, { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Bell, Search, User, Settings, LogOut, Menu, X, ChevronRight, ChevronDown } from 'lucide-react'
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
  patientName = 'JK',
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

    // 0. Quick Navigation & Intent Matching
    const quickLinks = [
      { keywords: ['weight', 'progress', 'log', 'scale', 'loss', 'kg', 'trend'], category: 'Progress', title: 'Weight & Progress History', subtitle: 'View weight trend logs and metrics', link: '/patient/progress' },
      { keywords: ['appointment', 'doctor', 'visit', 'schedule', 'booking', 'slot', 'calendar', 'consult'], category: 'Appointments', title: 'Appointments & Schedule', subtitle: 'View or book doctor consultations', link: '/patient/appointments' },
      { keywords: ['prescription', 'medicine', 'medication', 'refill', 'dose', 'drug', 'glp'], category: 'Prescriptions', title: 'Prescriptions & Refills', subtitle: 'View current medications and e-prescriptions', link: '/patient/prescriptions' },
      { keywords: ['delivery', 'deliveries', 'order', 'orders', 'package', 'tracking', 'pharmacy', 'dispatch', 'shipment'], category: 'Deliveries', title: 'Treatment Deliveries', subtitle: 'Track medication dispatch and shipments', link: '/patient/medicine-orders' },
      { keywords: ['consultation', 'consult', 'call', 'video', 'meeting'], category: 'Consultations', title: 'Doctor Consultations', subtitle: 'View past consultation history and notes', link: '/patient/consultation' },
      { keywords: ['bill', 'billing', 'invoice', 'payment', 'receipt', 'charge', 'money'], category: 'Billing', title: 'Billing & Invoices', subtitle: 'Download receipts and invoices', link: '/patient/billing' },
      { keywords: ['profile', 'account', 'phone', 'address', 'email', 'name'], category: 'Profile', title: 'Patient Profile', subtitle: 'Manage personal details and delivery address', link: '/patient/profile' },
      { keywords: ['setting', 'settings', 'password', 'security'], category: 'Settings', title: 'Account Settings', subtitle: 'Security and communication preferences', link: '/patient/settings' },
      { keywords: ['support', 'help', 'care team', 'message', 'chat'], category: 'Support', title: 'Contact Care Team', subtitle: 'Message your assigned health care team', link: '/patient/messages' },
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

    // 1. Search Appointments
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

    // 2. Search Prescriptions
    const rxText = consultation?.prescription_text || ''
    if (rxText && rxText.toLowerCase().includes(q)) {
      results.push({
        category: 'Prescriptions',
        title: rxText,
        subtitle: 'Prescription details, refills & directions',
        link: '/patient/prescriptions'
      })
    }

    // 3. Search Notifications & Messages
    if (notifications && Array.isArray(notifications)) {
      notifications.forEach(n => {
        if ((n.title && n.title.toLowerCase().includes(q)) || (n.message && n.message.toLowerCase().includes(q))) {
          results.push({
            category: n.type === 'message' ? 'Messages' : 'Notifications',
            title: n.title || 'Notification Update',
            subtitle: n.message || '',
            link: n.type === 'message' ? '/patient/messages' : '/patient/notifications'
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
      console.error("Sign out error:", err)
    }
  }

  return (
    <header className="sticky top-0 z-20 bg-white border-b border-slate-200/80 shadow-[0_1px_3px_rgba(0,0,0,0.02)]">
      <div className="flex items-center justify-between h-16 px-6 gap-4">
        
        {/* Left: Mobile hamburger + search bar */}
        <div className="flex items-center gap-3 flex-1 min-w-0 max-w-xl">
          {onMenuToggle && (
            <button 
              onClick={onMenuToggle}
              className="lg:hidden p-1.5 text-slate-700 hover:bg-slate-100 rounded-xl transition-all flex-shrink-0"
              aria-label="Toggle Navigation Menu"
            >
              <Menu className="w-5 h-5" />
            </button>
          )}

          {/* Search Bar matching screenshot */}
          <div className="relative w-full max-w-md" ref={searchRef}>
            <div className="flex items-center gap-2.5 bg-slate-50 hover:bg-white focus-within:bg-white border border-slate-200/80 focus-within:border-teal-500 rounded-full px-4 py-2 transition-all shadow-xs">
              <Search size={16} className="text-slate-400 flex-shrink-0" />
              <input 
                placeholder="Search anything..." 
                value={searchQuery}
                onChange={e => handleSearchChange(e.target.value)}
                onFocus={() => searchQuery.trim() !== '' && setShowResults(true)}
                className="bg-transparent outline-none text-xs sm:text-sm text-slate-800 placeholder:text-slate-400 w-full min-w-0 font-medium"
              />
              {searchQuery && (
                <button 
                  onClick={() => { setSearchQuery(''); setShowResults(false); }}
                  className="p-0.5 hover:bg-slate-200 rounded-full text-slate-400 transition-colors cursor-pointer"
                >
                  <X size={12} />
                </button>
              )}
            </div>

            {/* Universal Search Dropdown Overlay */}
            {showResults && (
              <div className="absolute left-0 mt-2 w-full min-w-[280px] bg-white border border-slate-200 rounded-2xl shadow-xl p-3.5 z-50 max-h-96 overflow-y-auto animate-fade-in-up custom-scrollbar">
                {searchResults.length > 0 ? (
                  <div className="space-y-3">
                    {['Progress', 'Appointments', 'Prescriptions', 'Deliveries', 'Consultations', 'Billing', 'Profile', 'Settings', 'Support', 'Messages', 'Notifications'].map(cat => {
                      const items = searchResults.filter(r => r.category === cat)
                      if (items.length === 0) return null

                      return (
                        <div key={cat} className="space-y-1">
                          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-2">{cat}</p>
                          {items.map((item, idx) => (
                            <button
                              key={idx}
                              onClick={() => {
                                setSearchQuery('')
                                setShowResults(false)
                                router.push(item.link)
                              }}
                              className="w-full text-left px-3 py-2 rounded-xl hover:bg-slate-50 transition-colors flex items-center justify-between group cursor-pointer"
                            >
                              <div className="min-w-0 pr-2">
                                <p className="text-xs font-semibold text-slate-800 truncate group-hover:text-teal-600 transition-colors">{item.title}</p>
                                <p className="text-[10px] text-slate-500 truncate mt-0.5">{item.subtitle}</p>
                              </div>
                              <ChevronRight size={12} className="text-slate-400 opacity-0 group-hover:opacity-100 transition-all shrink-0" />
                            </button>
                          ))}
                        </div>
                      )
                    })}
                  </div>
                ) : (
                  <div className="text-center py-6 space-y-1.5">
                    <p className="text-xs font-semibold text-slate-700">No results found for &ldquo;{searchQuery}&rdquo;</p>
                    <p className="text-[10px] text-slate-400">Search for &lsquo;weight&rsquo;, &lsquo;doctor&rsquo;, &lsquo;refill&rsquo;, &lsquo;orders&rsquo;, or &lsquo;billing&rsquo;.</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Right side: Bell icon + User profile pill */}
        <div className="flex items-center gap-3.5 flex-shrink-0">
          
          {/* Notifications Bell with dot */}
          <button 
            onClick={() => router.push('/patient/notifications')}
            className="relative p-2 rounded-full text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors flex-shrink-0 cursor-pointer"
            aria-label="View notifications"
          >
            <Bell size={19} />
            <span className="absolute top-2 right-2 w-2 h-2 bg-rose-500 rounded-full ring-2 ring-white" />
          </button>

          {/* Avatar Dropdown matching screenshot */}
          <div className="relative" ref={dropdownRef}>
            <button 
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className="flex items-center gap-2.5 p-1 pr-2 rounded-full hover:bg-slate-100 transition-all cursor-pointer group"
            >
              <div className="w-9 h-9 rounded-full bg-[#00A884] text-white font-bold text-xs flex items-center justify-center shrink-0 shadow-sm shadow-[#00A884]/30 select-none">
                {initials || 'JK'}
              </div>
              <div className="hidden sm:flex flex-col text-left">
                <span className="text-xs font-bold text-[#1A1F36] leading-tight">
                  {patientName || 'JK'}
                </span>
                <span className="text-[11px] text-[#8896A4] font-medium flex items-center gap-0.5 leading-tight mt-0.5">
                  Patient <ChevronDown size={11} className="text-[#8896A4] group-hover:text-[#1A1F36] transition-colors" />
                </span>
              </div>
            </button>

            {dropdownOpen && (
              <div className="absolute right-0 mt-2 w-48 bg-white border border-slate-200 rounded-2xl shadow-xl py-2 z-50 animate-fade-in-up">
                <button 
                  onClick={() => { setDropdownOpen(false); router.push('/patient/profile'); }}
                  className="w-full text-left px-4 py-2.5 hover:bg-slate-50 text-slate-700 text-xs font-medium transition-all flex items-center gap-2"
                >
                  <User className="w-3.5 h-3.5" /> My Profile
                </button>
                <button 
                  onClick={() => { setDropdownOpen(false); router.push('/patient/settings'); }}
                  className="w-full text-left px-4 py-2.5 hover:bg-slate-50 text-slate-700 text-xs font-medium transition-all flex items-center gap-2"
                >
                  <Settings className="w-3.5 h-3.5" /> Account Settings
                </button>
                <hr className="border-slate-100 my-1" />
                <button 
                  onClick={handleLogout}
                  className="w-full text-left px-4 py-2.5 hover:bg-rose-50 text-rose-600 text-xs font-medium transition-all flex items-center gap-2"
                >
                  <LogOut className="w-3.5 h-3.5" /> Sign Out
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  )
}
