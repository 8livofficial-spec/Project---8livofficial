'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { 
  LayoutDashboard, Calendar, TrendingDown, Package,
  Pill, Video, CreditCard, Settings, LogOut, User,
  ChevronLeft, ChevronRight
} from 'lucide-react'
import { supabase } from '@/lib/supabaseClient'

interface SidebarProps {
  patientName: string
  initials: string
  membershipTier: string
  programWeek: number
  totalWeeks: number
  email?: string
  onCloseMobile?: () => void
}

export default function Sidebar({
  patientName,
  initials,
  membershipTier,
  programWeek,
  totalWeeks,
  email = 'patient@8liv.com',
  onCloseMobile
}: SidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const [isCollapsed, setIsCollapsed] = useState(false)

  type NavLink = {
    icon: any
    label: string
    href: string
    badge?: number
  }

  const navLinks: NavLink[] = [
    { icon: LayoutDashboard, label: 'Overview', href: '/patient' },
    { icon: Calendar, label: 'Appointments', href: '/patient/appointments' },
    { icon: Pill, label: 'Prescriptions', href: '/patient/prescriptions' },
    { icon: Package, label: 'Treatment Deliveries', href: '/patient/medicine-orders' },
    { icon: Video, label: 'Consultations', href: '/patient/consultation' },
    { icon: CreditCard, label: 'Billing', href: '/patient/billing' },
    { icon: User, label: 'Profile', href: '/patient/profile' },
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
    <aside className={`bg-[#0B132B] h-screen flex flex-col shrink-0 overflow-y-auto overflow-x-hidden border-r border-white/10 transition-all duration-300 relative group ${isCollapsed ? 'w-20' : 'w-64'}`}>
      
      {/* Collapse Toggle Button (Desktop only) */}
      <button 
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="hidden lg:flex absolute right-2 top-6 z-50 w-6 h-6 bg-white/10 border border-white/20 rounded-full items-center justify-center text-white shadow-sm hover:bg-white/20 transition-colors"
      >
        {isCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
      </button>

      {/* Top section: Brand name / title */}
      <div className={`mt-6 mb-6 flex items-center ${isCollapsed ? 'justify-center mx-0' : 'mx-6'}`}>
        <Link 
          href="/patient"
          onClick={onCloseMobile}
          className={`text-white font-black font-sora tracking-wider select-none no-underline flex items-center gap-2 cursor-pointer ${isCollapsed ? 'justify-center' : ''}`}
        >
          <span className="bg-[#00A884] w-2 h-6 rounded-full inline-block shadow-sm shadow-[#00A884]/50 shrink-0" />
          {!isCollapsed && <span className="text-[18px]">8Liv Health</span>}
        </Link>
      </div>



      {/* Navigation links */}
      <nav className="px-3 flex flex-col gap-1 flex-1">
        {navLinks.map((link) => {
          const isActive = pathname === link.href
          const Icon = link.icon

          return (
            <Link
              key={link.href}
              href={link.href}
              onClick={onCloseMobile}
              className={`flex items-center rounded-xl transition-all duration-150 relative group/link
                ${isCollapsed ? 'justify-center p-3' : 'gap-3 px-3 py-2.5'}
                ${isActive 
                  ? 'bg-[#00A884] text-white font-bold shadow-md shadow-[#00A884]/30 ring-1 ring-white/20' 
                  : 'text-slate-300 hover:text-white hover:bg-white/10'
                }`}
              title={isCollapsed ? link.label : undefined}
            >
              <Icon size={18} strokeWidth={isActive ? 2.5 : 1.8} className={`shrink-0 ${isActive ? 'text-white' : 'text-slate-400'}`} />
              
              {!isCollapsed && <span className="text-[14px] font-medium whitespace-nowrap">{link.label}</span>}
              
              {!isCollapsed && link.badge !== undefined && link.badge > 0 && (
                <span className="ml-auto bg-[#2DD4BF] text-slate-900 text-[10px] 
                                 font-bold w-5 h-5 rounded-full flex items-center justify-center shrink-0">
                  {link.badge}
                </span>
              )}
              
              {/* Badge dot for collapsed state */}
              {isCollapsed && link.badge !== undefined && link.badge > 0 && (
                <span className="absolute top-2.5 right-2.5 w-2 h-2 bg-[#2DD4BF] rounded-full" />
              )}
            </Link>
          )
        })}
      </nav>

      {/* Bottom section: Progress & logout */}
      <div className={`mt-auto mb-4 space-y-4 ${isCollapsed ? 'mx-2' : 'mx-4'}`}>
        {/* Week progress bar */}
        {!isCollapsed && (
          <div className="p-3 bg-white/5 rounded-2xl border border-white/10">
            <div className="flex justify-between items-center mb-2">
              <span className="text-slate-400 text-[10px] uppercase tracking-wider font-bold">Program</span>
              <span className="text-white text-[11px] font-semibold">Week {programWeek}/{totalWeeks}</span>
            </div>
            <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
              <div 
                className="h-1.5 bg-gradient-to-r from-[#00A884] to-[#2DD4BF] rounded-full transition-all duration-700" 
                style={{ width: `${weekProgressPercent}%` }}
              />
            </div>
            <p className="text-slate-400 text-[10px] mt-2 text-center">{weeksRemaining} weeks remaining</p>
          </div>
        )}

        {/* Logout button */}
        <button
          onClick={handleLogout}
          className={`flex items-center text-slate-400 hover:text-white rounded-xl transition-all hover:bg-red-500/20 text-[14px] font-bold cursor-pointer w-full
            ${isCollapsed ? 'justify-center p-3' : 'gap-2 px-3 py-2.5'}`}
          title={isCollapsed ? 'Sign Out' : undefined}
        >
          <LogOut className="w-4 h-4 shrink-0" />
          {!isCollapsed && <span>Sign Out</span>}
        </button>
      </div>
    </aside>
  )
}
