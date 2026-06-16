'use client'

import React from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { 
  LayoutDashboard, Calendar, TrendingDown, MessageCircle, 
  Pill, Video, CreditCard, Settings, LogOut 
} from 'lucide-react'
import { supabase } from '@/lib/supabaseClient'

interface SidebarProps {
  patientName: string
  initials: string
  membershipTier: string
  programWeek: number
  totalWeeks: number
  unreadMessagesCount?: number
  email?: string
  onCloseMobile?: () => void
}

export default function Sidebar({
  patientName,
  initials,
  membershipTier,
  programWeek,
  totalWeeks,
  unreadMessagesCount = 0,
  email = 'patient@8liv.com',
  onCloseMobile
}: SidebarProps) {
  const pathname = usePathname()
  const router = useRouter()

  const navLinks = [
    { icon: LayoutDashboard, label: 'Overview', href: '/patient' },
    { icon: Calendar, label: 'Appointments', href: '/patient/appointments' },
    { icon: TrendingDown, label: 'My Progress', href: '/patient/progress' },
    { icon: MessageCircle, label: 'Messages', href: '/patient/messages', badge: unreadMessagesCount },
    { icon: Pill, label: 'Prescriptions', href: '/patient/prescriptions' },
    { icon: Video, label: 'Consultations', href: '/patient/consultation' },
    { icon: CreditCard, label: 'Billing', href: '/patient/billing' },
    { icon: Settings, label: 'Settings', href: '/patient/settings' },
  ]

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut()
      document.cookie = 'user_role=; path=/; expires=Thu, 01 Jan 1970 00:00:00 UTC; SameSite=Lax'
      router.push('/')
    } catch (err) {
      console.error("Sign out error:", err)
    }
  }

  const weekProgressPercent = Math.min(100, Math.round((programWeek / totalWeeks) * 100)) || 0
  const weeksRemaining = Math.max(0, totalWeeks - programWeek)

  return (
    <aside className="bg-[#1A1F36] h-screen w-64 flex flex-col shrink-0 overflow-y-auto">
      {/* Top section: Brand name / title */}
      <div className="mx-6 mt-6 mb-6">
        <Link 
          href="/patient"
          onClick={onCloseMobile}
          className="text-white font-black font-sora text-xl tracking-wider select-none no-underline flex items-center gap-2 cursor-pointer"
        >
          <span className="bg-[#C4622D] w-2 h-6 rounded-full inline-block" />
          8Liv Portal
        </Link>
      </div>

      {/* Patient info card */}
      <Link 
        href="/patient/profile"
        onClick={onCloseMobile}
        className="mx-4 mb-6 bg-[rgba(255,255,255,0.07)] hover:bg-[rgba(255,255,255,0.12)] transition-all rounded-2xl p-4 block text-left no-underline cursor-pointer"
      >
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-full bg-gradient-to-br from-[#C4622D] to-[#A8522A] 
                          flex items-center justify-center text-white font-bold text-sm flex-shrink-0 select-none">
            {initials}
          </div>
          <div className="min-w-0">
            <p className="text-white font-semibold text-sm truncate">{patientName}</p>
            <p className="text-[rgba(255,255,255,0.5)] text-xs truncate">{email}</p>
          </div>
        </div>
        <div className="mt-3 inline-flex items-center gap-1.5 bg-[rgba(196,98,45,0.2)] 
                        text-[#C4622D] text-[11px] font-semibold px-3 py-1 rounded-full">
          <span className="w-1.5 h-1.5 rounded-full bg-[#C4622D]" />
          {membershipTier || 'Silver Plan'}
        </div>
      </Link>

      {/* Navigation links */}
      <nav className="px-4 flex flex-col gap-1 flex-1">
        {navLinks.map((link) => {
          const isActive = pathname === link.href
          const Icon = link.icon

          return (
            <Link
              key={link.href}
              href={link.href}
              onClick={onCloseMobile}
              className={`flex items-center gap-3 px-4 py-3 transition-all duration-150 border-l-4
                ${isActive 
                  ? 'border-[#C4622D] bg-[#C4622D]/10 text-white font-medium shadow-[inset_4px_0_0_0_#C4622D]' 
                  : 'border-transparent text-[rgba(255,255,255,0.55)] hover:text-white hover:bg-[rgba(255,255,255,0.05)] hover:border-[rgba(255,255,255,0.1)]'
                }`}
            >
              <Icon size={18} strokeWidth={isActive ? 2.5 : 1.8} className={`shrink-0 ${isActive ? 'text-[#C4622D]' : ''}`} />
              <span className="text-sm font-medium">{link.label}</span>
              {link.badge !== undefined && link.badge > 0 && (
                <span className="ml-auto bg-[#C4622D] text-white text-[10px] 
                                 font-bold w-5 h-5 rounded-full flex items-center justify-center shrink-0">
                  {link.badge}
                </span>
              )}
            </Link>
          )
        })}
      </nav>

      {/* Bottom section: Progress & logout */}
      <div className="mt-auto mx-4 mb-4 space-y-4">
        {/* Week progress bar */}
        <div className="p-4 bg-[rgba(255,255,255,0.05)] rounded-2xl">
          <div className="flex justify-between items-center mb-2">
            <span className="text-[rgba(255,255,255,0.5)] text-xs">Program Progress</span>
            <span className="text-white text-xs font-semibold">Week {programWeek} of {totalWeeks}</span>
          </div>
          <div className="h-1.5 bg-[rgba(255,255,255,0.1)] rounded-full">
            <div 
              className="h-1.5 bg-[#C4622D] rounded-full transition-all duration-700" 
              style={{ width: `${weekProgressPercent}%` }}
            />
          </div>
          <p className="text-[rgba(255,255,255,0.35)] text-[11px] mt-2">{weeksRemaining} weeks remaining</p>
        </div>

        {/* Logout button */}
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-2 text-white/40 hover:text-white px-4 py-3 rounded-xl transition-all hover:bg-white/5 text-sm font-medium cursor-pointer"
        >
          <LogOut className="w-4 h-4 shrink-0" />
          <span>Sign Out</span>
        </button>
      </div>
    </aside>
  )
}
