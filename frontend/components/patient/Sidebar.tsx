'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { 
  Home, Calendar, Pill, MessageSquare, CreditCard, Settings, LogOut, User,
  ChevronLeft, ChevronRight, ShieldCheck, ArrowRight, Stethoscope
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
    icon: React.ComponentType<{ size?: number; className?: string; strokeWidth?: number }>
    label: string
    href: string
    badge?: number
  }

  const navLinks: NavLink[] = [
    { icon: Home, label: 'Overview', href: '/patient' },
    { icon: Calendar, label: 'Appointments', href: '/patient/appointments' },
    { icon: ShieldCheck, label: 'Care Protocols', href: '/patient/prescriptions' },
    { icon: MessageSquare, label: 'Consultations', href: '/patient/consultation' },
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
      console.error('Sign out error:', err)
    }
  }

  return (
    <aside
      className={`h-screen flex flex-col shrink-0 overflow-y-auto overflow-x-hidden transition-all duration-300 relative select-none z-30
        bg-[#06150F] text-slate-200 border-r border-[#00A884]/15
        ${isCollapsed ? 'w-20' : 'w-64'}`}
      style={{
        backgroundImage: 'radial-gradient(circle at 10% 15%, rgba(0, 168, 132, 0.08), transparent 70%)',
      }}
    >
      {/* Collapse Toggle Button (Desktop only) */}
      <button 
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="hidden lg:flex absolute right-2.5 top-6 z-50 w-6 h-6 bg-emerald-950/80 border border-[#00A884]/30 rounded-full items-center justify-center text-teal-300 shadow-md hover:bg-[#00A884]/20 hover:text-white transition-all cursor-pointer"
        aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
      >
        {isCollapsed ? <ChevronRight size={13} /> : <ChevronLeft size={13} />}
      </button>

      {/* Top Brand Header */}
      <div className={`mt-6 mb-7 flex items-center ${isCollapsed ? 'justify-center mx-0' : 'px-6'}`}>
        <Link 
          href="/patient"
          onClick={onCloseMobile}
          className={`flex items-center gap-2.5 text-white tracking-tight no-underline group cursor-pointer ${isCollapsed ? 'justify-center' : ''}`}
        >
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#00A884] to-[#0A8F70] flex items-center justify-center shadow-lg shadow-[#00A884]/30 shrink-0 ring-1 ring-emerald-400/30">
            <span className="font-extrabold text-white text-base">8</span>
          </div>
          {!isCollapsed && (
            <div className="flex flex-col">
              <span className="text-[17px] font-extrabold text-white tracking-tight font-sans leading-none">
                8Liv Health
              </span>
              <span className="text-[10px] uppercase font-mono font-bold tracking-widest text-teal-400/80 mt-1">
                Concierge Care
              </span>
            </div>
          )}
        </Link>
      </div>

      {/* Navigation links */}
      <nav className="px-3 flex flex-col gap-1.5 flex-1">
        {navLinks.map((link) => {
          const isActive = pathname === link.href
          const Icon = link.icon

          return (
            <Link
              key={link.href}
              href={link.href}
              onClick={onCloseMobile}
              className={`flex items-center rounded-xl transition-all duration-200 relative group/link
                ${isCollapsed ? 'justify-center p-3' : 'gap-3 px-3.5 py-2.5'}
                ${isActive 
                  ? 'bg-gradient-to-r from-[#00A884]/25 to-[#00A884]/10 text-white font-semibold border-l-[3px] border-[#00A884] shadow-sm' 
                  : 'text-slate-300/80 hover:text-white hover:bg-white/[0.06]'
                }`}
              title={isCollapsed ? link.label : undefined}
            >
              <Icon 
                size={18} 
                strokeWidth={isActive ? 2.4 : 1.8} 
                className={`shrink-0 transition-colors ${isActive ? 'text-[#00A884]' : 'text-slate-400 group-hover/link:text-slate-200'}`} 
              />
              
              {!isCollapsed && (
                <span className="text-[13.5px] tracking-normal font-medium whitespace-nowrap">
                  {link.label}
                </span>
              )}
              
              {!isCollapsed && link.badge !== undefined && link.badge > 0 && (
                <span className="ml-auto bg-[#00A884] text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full flex items-center justify-center shrink-0">
                  {link.badge}
                </span>
              )}
            </Link>
          )
        })}
      </nav>

      {/* Bottom section: Concierge Card & User Capsule */}
      <div className={`mt-auto mb-5 space-y-3 ${isCollapsed ? 'px-2' : 'px-4'}`}>
        {/* Support Concierge Card */}
        {!isCollapsed && (
          <div className="p-3.5 rounded-2xl bg-gradient-to-b from-white/[0.06] to-white/[0.02] border border-[#00A884]/20 text-white backdrop-blur-md">
            <div className="flex items-center gap-2 mb-1">
              <div className="w-6 h-6 rounded-lg bg-[#00A884]/20 text-teal-300 flex items-center justify-center shrink-0">
                <ShieldCheck size={14} />
              </div>
              <p className="text-xs font-bold leading-tight text-white">Physician Supervised</p>
            </div>
            <p className="text-[11px] text-slate-400 leading-snug mt-1 mb-2.5">
              Dedicated Medical Board & Care Team on call.
            </p>
            <button
              onClick={() => {
                onCloseMobile?.()
                router.push('/patient/consultation')
              }}
              className="w-full py-1.5 px-3 rounded-xl bg-[#00A884]/20 hover:bg-[#00A884]/30 text-teal-300 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer border border-[#00A884]/30"
            >
              <Stethoscope size={12} />
              <span>Contact Doctor</span>
              <ArrowRight size={11} />
            </button>
          </div>
        )}

        {/* User Capsule Footer */}
        {!isCollapsed && (
          <div className="pt-2 border-t border-white/[0.08] flex items-center justify-between gap-2 px-1">
            <Link 
              href="/patient/profile" 
              onClick={onCloseMobile}
              className="flex items-center gap-2.5 min-w-0 flex-1 hover:opacity-85 transition-opacity"
            >
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#00A884] to-[#0A8F70] flex items-center justify-center text-white text-xs font-bold shrink-0 shadow-sm ring-1 ring-emerald-400/30">
                {initials || 'P'}
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold text-white truncate leading-tight">
                  {patientName}
                </p>
                <p className="text-[10px] font-mono text-teal-400/80 truncate">
                  {membershipTier ? (isNaN(Number(membershipTier)) ? membershipTier : `${membershipTier} Mo Program`) : 'Active Member'}
                </p>
              </div>
            </Link>

            <button
              onClick={handleLogout}
              className="text-slate-400 hover:text-rose-400 p-1.5 rounded-lg hover:bg-white/[0.06] transition-colors cursor-pointer"
              title="Sign Out"
              aria-label="Sign Out"
            >
              <LogOut size={15} />
            </button>
          </div>
        )}

        {/* Collapsed logout icon */}
        {isCollapsed && (
          <button
            onClick={handleLogout}
            className="flex items-center justify-center text-slate-400 hover:text-rose-400 rounded-xl transition-all hover:bg-white/10 p-3 w-full cursor-pointer"
            title="Sign Out"
            aria-label="Sign Out"
          >
            <LogOut size={16} />
          </button>
        )}
      </div>
    </aside>
  )
}
