'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { Menu, X, LogOut, User } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase } from '@/lib/supabaseClient'
import type { User as SupabaseUser } from '@supabase/supabase-js'
import LetterSwap3D from '@/components/ui/letter-swap-3d'

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [user, setUser] = useState<SupabaseUser | null>(null)
  const [role, setRole] = useState<string>('patient')

  const resolveDashboardUrl = (userRole: string) => {
    const r = (userRole || 'patient').toLowerCase().trim()
    if (r === 'admin') return '/admin'
    if (r === 'doctor') return '/doctor/dashboard'
    if (r === 'dietitian') return '/dietitian/dashboard'
    if (r === 'trainer' || r === 'fitness_coach' || r === 'coach') return '/trainer/dashboard'
    if (r === 'provider') return '/provider/dashboard'
    if (r === 'pharmacy') return '/pharmacy'
    return '/patient'
  }

  const fetchUserRole = async (currentUser: SupabaseUser) => {
    try {
      if (currentUser.email === '8livofficial@gmail.com') {
        setRole('admin')
        document.cookie = 'user_role=admin; path=/; max-age=86400; SameSite=Lax'
        return
      }

      const cookieMatch = document.cookie.match(/user_role=([^;]+)/)
      if (cookieMatch && cookieMatch[1]) {
        setRole(cookieMatch[1])
        return
      }

      const [{ data: doc }, { data: prov }, { data: prof }] = await Promise.all([
        supabase.from('doctor_profiles').select('id').eq('id', currentUser.id).maybeSingle(),
        supabase.from('provider_profiles_v2').select('role').or(`id.eq.${currentUser.id},user_id.eq.${currentUser.id}`).maybeSingle(),
        supabase.from('profiles').select('role').eq('id', currentUser.id).maybeSingle(),
      ])

      let resolvedRole = 'patient'
      if (doc) resolvedRole = 'doctor'
      else if (prov?.role) resolvedRole = prov.role
      else if (prof?.role) resolvedRole = prof.role
      else resolvedRole = currentUser.user_metadata?.role || 'patient'

      setRole(resolvedRole)
      document.cookie = `user_role=${resolvedRole}; path=/; max-age=86400; SameSite=Lax`
    } catch (err) {
      console.warn('Failed to resolve user role:', err)
    }
  }

  const handleDashboardClick = async (e: React.MouseEvent) => {
    e.preventDefault()
    setMobileMenuOpen(false)

    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.user) {
        window.location.href = '/login'
        return
      }

      let userRole = role
      if (!userRole || userRole === 'patient') {
        const cookieMatch = document.cookie.match(/user_role=([^;]+)/)
        if (cookieMatch && cookieMatch[1]) {
          userRole = cookieMatch[1]
        } else if (session.user.email === '8livofficial@gmail.com') {
          userRole = 'admin'
        } else {
          const [{ data: doc }, { data: prov }, { data: prof }] = await Promise.all([
            supabase.from('doctor_profiles').select('id').eq('id', session.user.id).maybeSingle(),
            supabase.from('provider_profiles_v2').select('role').or(`id.eq.${session.user.id},user_id.eq.${session.user.id}`).maybeSingle(),
            supabase.from('profiles').select('role').eq('id', session.user.id).maybeSingle(),
          ])
          if (doc) userRole = 'doctor'
          else if (prov?.role) userRole = prov.role
          else if (prof?.role) userRole = prof.role
          else userRole = session.user.user_metadata?.role || 'patient'
        }
      }

      document.cookie = `user_role=${userRole}; path=/; max-age=86400; SameSite=Lax`
      window.location.href = resolveDashboardUrl(userRole)
    } catch (_) {
      window.location.href = '/patient'
    }
  }

  const handleSignOut = async () => {
    setMobileMenuOpen(false)
    await supabase.auth.signOut()
    document.cookie = 'user_role=; path=/; expires=Thu, 01 Jan 1970 00:00:00 UTC; SameSite=Lax'
    window.location.href = '/'
  }

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 30) {
        setScrolled(true)
      } else {
        setScrolled(false)
      }
    }
    window.addEventListener('scroll', handleScroll, { passive: true })

    // Check auth session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user || null)
      if (session?.user) {
        fetchUserRole(session.user)
      }
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user || null)
      if (session?.user) {
        fetchUserRole(session.user)
      }
    })

    return () => {
      window.removeEventListener('scroll', handleScroll)
      subscription.unsubscribe()
    }
  }, [])

  return (
    <>
      <motion.header 
        initial={{ y: -60, opacity: 0 }}
        animate={{ 
          y: 0, 
          opacity: scrolled ? 0.96 : 1,
          scale: scrolled ? 0.98 : 1,
        }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="pointer-events-none fixed left-0 right-0 top-0 z-50 flex justify-center px-3 pt-2 sm:px-4 sm:pt-2.5"
      >
        {/* Floating Capsule */}
        <div 
          className={`pointer-events-auto flex w-full max-w-[1120px] items-center justify-between rounded-full border transition-all duration-300 h-10 sm:h-11
            ${scrolled 
              ? 'bg-[#F9F6F0]/90 backdrop-blur-xl border-[#D46E53]/20 shadow-[0_4px_20px_rgba(15,23,42,0.06)] px-3 sm:px-5' 
              : 'bg-white/80 backdrop-blur-md border-white/60 shadow-xs px-3 sm:px-6'
            }`}
        >
          {/* Logo */}
          <Link href="/" className="flex items-center shrink-0">
            <img 
              src="/brand-logo-official.png" 
              alt="8LIV Official Logo" 
              className="h-6 sm:h-7 md:h-8 w-auto object-contain cursor-pointer transition-transform duration-300 hover:scale-105"
            />
          </Link>

          {/* Desktop Links */}
          <nav className="hidden md:flex items-center gap-1 bg-white/60 rounded-full px-2 py-0.5 border border-white/40 shadow-2xs">
            <Link href="/how-it-works" className="px-3 py-1 rounded-full text-[11px] font-semibold text-[#475569] hover:text-[#0F172A] hover:bg-white/90 transition-all font-sora flex items-center">
              <LetterSwap3D text="How It Works" />
            </Link>
            <Link href="/medical-weight-management" className="px-3 py-1 rounded-full text-[11px] font-semibold text-[#475569] hover:text-[#0F172A] hover:bg-white/90 transition-all font-sora flex items-center">
              <LetterSwap3D text="The Program" />
            </Link>
            <Link href="/membership" className="px-3 py-1 rounded-full text-[11px] font-semibold text-[#475569] hover:text-[#0F172A] hover:bg-white/90 transition-all font-sora flex items-center">
              <LetterSwap3D text="Membership" />
            </Link>
            <Link href="/about" className="px-3 py-1 rounded-full text-[11px] font-semibold text-[#475569] hover:text-[#0F172A] hover:bg-white/90 transition-all font-sora flex items-center">
              <LetterSwap3D text="Company" />
            </Link>
          </nav>

          {/* Right Action */}
          <div className="hidden md:flex items-center shrink-0 gap-3">
            {user ? (
              <>
                <button 
                  onClick={handleDashboardClick}
                  className="px-3 py-1 rounded-full text-[11px] font-bold text-[#0F172A] bg-white border border-[#D46E53]/25 hover:bg-[#F9F6F0] transition-all flex items-center gap-1.5 font-sora shadow-2xs cursor-pointer"
                >
                  <User size={12} /> My Dashboard
                </button>
                <button 
                  onClick={handleSignOut}
                  className="bg-[#0F172A] text-white font-semibold rounded-full px-3 py-1 text-[11px] hover:bg-rose-600 transition-all border border-transparent flex items-center gap-1.5 cursor-pointer font-sora"
                >
                  <LogOut size={12} /> Sign Out
                </button>
              </>
            ) : (
              <Link href="/login" className="bg-[#0F172A] text-white font-semibold rounded-full px-4 py-1.5 text-[11px] hover:bg-[#1E293B] hover:shadow-md transition-all border border-transparent font-sora">
                Log In
              </Link>
            )}
          </div>

          {/* Mobile Menu Toggle Button */}
          <button 
            className="rounded-full border border-white/60 bg-white/70 p-1.5 text-[#0F172A] md:hidden cursor-pointer"
            aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X size={16} /> : <Menu size={16} />}
          </button>
        </div>
      </motion.header>

      {/* Mobile Menu Dropdown Overlay */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div 
            initial={{ opacity: 0, y: -15, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -15, scale: 0.97 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
            className="fixed inset-x-3 top-16 z-40 md:hidden sm:inset-x-4 sm:top-20"
          >
            <div className="flex max-h-[calc(100vh-5.5rem)] flex-col space-y-2 overflow-y-auto rounded-3xl border border-[#D46E53]/20 bg-[#F9F6F0]/95 backdrop-blur-2xl p-5 shadow-2xl">
              <Link href="/how-it-works" onClick={() => setMobileMenuOpen(false)} className="border-b border-[#D46E53]/10 py-3 px-2 text-left text-sm font-semibold text-[#0F172A] font-sora">How It Works</Link>
              <Link href="/medical-weight-management" onClick={() => setMobileMenuOpen(false)} className="border-b border-[#D46E53]/10 py-3 px-2 text-left text-sm font-semibold text-[#0F172A] font-sora">The Program</Link>
              <Link href="/membership" onClick={() => setMobileMenuOpen(false)} className="border-b border-[#D46E53]/10 py-3 px-2 text-left text-sm font-semibold text-[#0F172A] font-sora">Membership</Link>
              <Link href="/about" onClick={() => setMobileMenuOpen(false)} className="border-b border-[#D46E53]/10 py-3 px-2 text-left text-sm font-semibold text-[#0F172A] font-sora">Company</Link>
              {user ? (
                <>
                  <button 
                    onClick={handleDashboardClick}
                    className="w-full text-center bg-white border border-[#D46E53]/20 text-[#0F172A] font-bold rounded-full px-5 py-3 mt-3 block text-sm font-sora cursor-pointer"
                  >
                    My Dashboard
                  </button>
                  <button 
                    onClick={handleSignOut}
                    className="w-full text-center bg-rose-600 text-white font-bold rounded-full px-5 py-3 mt-2 block text-sm font-sora cursor-pointer"
                  >
                    Sign Out
                  </button>
                </>
              ) : (
                <Link href="/login" onClick={() => setMobileMenuOpen(false)} className="mt-3 block w-full rounded-full bg-[#0F172A] px-5 py-3 text-center font-bold text-white text-sm shadow-md font-sora">
                  Log In
                </Link>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
