'use client'

import React, { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Bell, Search, User, Settings, LogOut, Menu, X, ChevronRight } from 'lucide-react'
import { supabase } from '@/lib/supabaseClient'

interface TopbarProps {
  pageTitle: string
  breadcrumbs: string[]
  initials: string
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
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleSearchChange = (val: string) => {
    setSearchQuery(val)
    setShowResults(val.trim() !== '')
  }

  // Filter logic across notifications, appointments, and prescriptions
  const getSearchResults = () => {
    if (!searchQuery.trim()) return []
    const q = searchQuery.toLowerCase()
    const results: { category: string; title: string; subtitle: string; link: string }[] = []

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
        title: `Consultation with ${docName || 'Care Specialist'}`,
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
    if (notifications) {
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

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

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
    <header className="sticky top-0 z-20 bg-white border-b border-[rgba(26,31,54,0.07)]">
      <div className="flex items-center justify-between h-16 px-6 gap-4">
        
        {/* Left: breadcrumb + hamburger on mobile */}
        <div className="flex items-center gap-3 min-w-0">
          {onMenuToggle && (
            <button 
              onClick={onMenuToggle}
              className="md:hidden p-1.5 text-[#1A1F36] hover:bg-[#F5F0EB] rounded-xl transition-all flex-shrink-0"
            >
              <Menu className="w-5 h-5" />
            </button>
          )}
          <div className="min-w-0">
            <h1 className="text-[#1A1F36] font-bold text-lg font-[Sora] leading-tight truncate">
              {pageTitle}
            </h1>
            <p className="text-[#8896A4] text-xs mt-0.5 truncate">
              {breadcrumbs.join(' / ')}
            </p>
          </div>
        </div>

        {/* Right: actions — use flex-shrink-0 to prevent overlap */}
        <div className="flex items-center gap-3 flex-shrink-0">
          
          {/* Search — hidden on small screens */}
          <div className="hidden md:block relative" ref={searchRef}>
            <div className="flex items-center gap-2 bg-[#F5F0EB] rounded-xl px-3 py-2 w-48 lg:w-64">
              <Search size={15} className="text-[#8896A4] flex-shrink-0" />
              <input 
                placeholder="Search portal..." 
                value={searchQuery}
                onChange={e => handleSearchChange(e.target.value)}
                onFocus={() => searchQuery.trim() !== '' && setShowResults(true)}
                className="bg-transparent outline-none text-sm text-[#1A1F36] placeholder:text-[#8896A4] w-full min-w-0 font-medium"
              />
              {searchQuery && (
                <button 
                  onClick={() => { setSearchQuery(''); setShowResults(false); }}
                  className="p-0.5 hover:bg-[#1A1F36]/8 rounded-full text-[#8896A4] transition-colors cursor-pointer"
                >
                  <X size={12} />
                </button>
              )}
            </div>

            {/* Universal Search Dropdown Overlay */}
            {showResults && (
              <div className="absolute right-0 mt-2 w-72 lg:w-80 bg-white border border-[#1A1F36]/8 rounded-2xl shadow-xl p-4 z-50 max-h-96 overflow-y-auto animate-fade-in-up custom-scrollbar">
                {searchResults.length > 0 ? (
                  <div className="space-y-4">
                    {['Appointments', 'Prescriptions', 'Messages', 'Notifications'].map(cat => {
                      const items = searchResults.filter(r => r.category === cat)
                      if (items.length === 0) return null

                      return (
                        <div key={cat} className="space-y-1.5">
                          <p className="text-[10px] font-black uppercase tracking-wider text-[#8896A4] px-1">{cat}</p>
                          {items.map((item, idx) => (
                            <button
                              key={idx}
                              onClick={() => {
                                setSearchQuery('')
                                setShowResults(false)
                                router.push(item.link)
                              }}
                              className="w-full text-left px-3 py-2 rounded-xl hover:bg-[#F5F0EB] transition-colors flex items-center justify-between group cursor-pointer"
                            >
                              <div className="min-w-0 pr-2">
                                <p className="text-xs font-bold text-[#1A1F36] truncate group-hover:text-[#C4622D] transition-colors">{item.title}</p>
                                <p className="text-[10px] text-[#8896A4] truncate mt-0.5">{item.subtitle}</p>
                              </div>
                              <ChevronRight size={12} className="text-[#8896A4] opacity-0 group-hover:opacity-100 transition-all shrink-0" />
                            </button>
                          ))}
                        </div>
                      )
                    })}
                  </div>
                ) : (
                  <div className="text-center py-6 space-y-2">
                    <p className="text-xs font-bold text-[#1A1F36]">No matches found</p>
                    <p className="text-[10px] text-[#8896A4]">Try searching for 'weight', 'plan', 'meeting', or medicine names.</p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Notifications */}
          <button 
            onClick={() => router.push('/patient/notifications')}
            className="relative p-2.5 rounded-xl hover:bg-[#F5F0EB] transition-colors flex-shrink-0 cursor-pointer"
          >
            <Bell size={18} className="text-[#1A1F36]" />
            {notificationsCount > 0 && (
              <span className="absolute top-1.5 right-1.5 w-4 h-4 bg-[#C4622D] text-white 
                               text-[9px] font-bold rounded-full flex items-center justify-center animate-pulse">
                {notificationsCount}
              </span>
            )}
          </button>

          {/* Avatar Dropdown */}
          <div className="relative" ref={dropdownRef}>
            <button 
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className="w-9 h-9 rounded-full bg-gradient-to-br from-[#C4622D] to-[#A8522A] 
                          text-white font-bold text-sm flex items-center justify-center 
                          cursor-pointer flex-shrink-0 select-none hover:scale-105 active:scale-95 transition-all"
            >
              {initials}
            </button>

            {dropdownOpen && (
              <div className="absolute right-0 mt-2.5 w-48 bg-white border border-[#1A1F36]/8 rounded-2xl shadow-xl py-2 z-50 animate-fade-in-up">
                <button 
                  onClick={() => { setDropdownOpen(false); router.push('/patient/profile'); }}
                  className="w-full text-left px-4 py-2.5 hover:bg-[#F5F0EB] text-[#1A1F36] text-sm font-medium transition-all flex items-center gap-2"
                >
                  <User className="w-4 h-4" /> My Profile
                </button>
                <button 
                  onClick={() => { setDropdownOpen(false); router.push('/patient/settings'); }}
                  className="w-full text-left px-4 py-2.5 hover:bg-[#F5F0EB] text-[#1A1F36] text-sm font-medium transition-all flex items-center gap-2"
                >
                  <Settings className="w-4 h-4" /> Account Settings
                </button>
                <hr className="border-[#1A1F36]/8 my-1" />
                <button 
                  onClick={handleLogout}
                  className="w-full text-left px-4 py-2.5 hover:bg-rose-50 text-rose-600 text-sm font-medium transition-all flex items-center gap-2"
                >
                  <LogOut className="w-4 h-4" /> Sign Out
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  )
}
