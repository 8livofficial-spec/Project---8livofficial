'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { User, LogOut, ArrowRight, Menu, X } from 'lucide-react'
import { supabase } from '@/lib/supabaseClient'
import type { User as SupabaseUser } from '@supabase/supabase-js'
import PillNav from '@/components/ui/PillNav'

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false)
  const [user, setUser] = useState<SupabaseUser | null>(null)
  const [role, setRole] = useState<string>('patient')
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

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

  const handleSignOut = async () => {
    setMobileMenuOpen(false)
    await supabase.auth.signOut()
    document.cookie = 'user_role=; path=/; expires=Thu, 01 Jan 1970 00:00:00 UTC; SameSite=Lax'
    window.location.href = '/'
  }

  useEffect(() => {
    let lastScrolled = false
    const handleScroll = () => {
      const isScrolled = window.scrollY > 20
      if (isScrolled !== lastScrolled) {
        lastScrolled = isScrolled
        setScrolled(isScrolled)
      }
    }
    window.addEventListener('scroll', handleScroll, { passive: true })

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

  const navItems = [
    { label: 'How It Works', href: '#how-it-works' },
    { label: 'Medical Care', href: '#pillars' },
    { label: 'Treatment Plans', href: '#pricing' },
    { label: 'FAQ', href: '#faq' },
  ]

  return (
    <header className="fixed left-0 right-0 top-0 z-50 flex justify-center px-3 pt-3 sm:px-4 sm:pt-4 pointer-events-none">
      {/* Floating Glassmorphic Capsule */}
      <div
        className={`pointer-events-auto flex w-full max-w-[1140px] items-center justify-between rounded-full transition-all duration-300 px-3.5 sm:px-6 py-2 ${
          scrolled
            ? 'bg-white/80 backdrop-blur-lg border border-white/70 shadow-[0_12px_40px_rgba(15,23,42,0.08),inset_0_1px_1px_rgba(255,255,255,0.6)] transform-gpu will-change-transform'
            : 'bg-white/20 backdrop-blur-lg border border-white/35 shadow-[0_8px_32px_0_rgba(15,23,42,0.12),inset_0_1px_1px_rgba(255,255,255,0.4)] transform-gpu will-change-transform'
        }`}
      >
        {/* LEFT: Authentic Official 8LIV Logo */}
        <Link
          href="/"
          className="flex items-center shrink-0 group transition-transform duration-300 hover:scale-105"
          aria-label="8LIV Home"
        >
          <img
            src="/brand-logo-official.png"
            alt="8LIV Official Logo"
            className="h-7 sm:h-8 md:h-8.5 w-auto object-contain block drop-shadow-xs cursor-pointer"
          />
        </Link>

        {/* CENTER: Desktop Nav Pills powered by React Bits PillNav */}
        <div className="hidden md:flex items-center">
          <PillNav
            items={navItems}
            baseColor="#00A884"
            pillColor={scrolled ? 'rgba(241, 245, 249, 0.85)' : 'rgba(255, 255, 255, 0.35)'}
            hoveredPillTextColor="#FFFFFF"
            pillTextColor="#0F172A"
            ease="power3.easeOut"
            initialLoadAnimation={false}
          />
        </div>

        {/* RIGHT: Log In & Actions */}
        <div className="hidden md:flex items-center shrink-0 gap-2">
          {user ? (
            <>
              <Link
                href={resolveDashboardUrl(role)}
                className="inline-flex items-center gap-1.5 bg-slate-900 hover:bg-slate-800 text-white font-sora font-semibold text-xs px-4 py-2 rounded-full border border-slate-700 shadow-sm transition-all"
              >
                <User size={13} className="text-emerald-400" />
                <span>My Portal</span>
              </Link>
              <button
                onClick={handleSignOut}
                className="bg-white/40 hover:bg-rose-500 text-slate-700 hover:text-white font-semibold text-xs px-3.5 py-2 rounded-full border border-white/50 backdrop-blur-md transition-all flex items-center gap-1.5 cursor-pointer font-sora shadow-xs"
              >
                <LogOut size={13} />
                <span>Sign Out</span>
              </button>
            </>
          ) : (
            <>
              {/* Clean, Simple & Convenient Log In */}
              <Link
                href="/login"
                className="inline-flex items-center gap-1.5 text-slate-700 hover:text-slate-950 hover:bg-white/60 font-sora font-semibold text-xs px-3.5 py-2 rounded-full transition-colors cursor-pointer"
              >
                <User size={13} className="text-slate-600" />
                <span>Log In</span>
              </Link>

              {/* Primary Eligibility CTA */}
              <Link
                href="/assessment"
                className="inline-flex items-center gap-1.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-sora font-semibold text-xs px-4.5 py-2 rounded-full shadow-[0_4px_14px_rgba(0,168,132,0.3)] hover:shadow-[0_6px_20px_rgba(0,168,132,0.45)] hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer"
              >
                <span>Check Eligibility</span>
                <ArrowRight size={13} />
              </Link>
            </>
          )}
        </div>

        {/* Mobile Action + Hamburger Toggle */}
        <div className="flex md:hidden items-center gap-2">
          {!user && (
            <Link
              href="/login"
              className="text-slate-800 bg-white/50 border border-white/60 font-sora font-semibold text-[11px] px-3 py-1.5 rounded-full flex items-center gap-1 shadow-2xs"
            >
              <User size={11} className="text-slate-600" />
              <span>Log In</span>
            </Link>
          )}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 rounded-full border border-white/60 bg-white/60 text-slate-800 backdrop-blur-md cursor-pointer transition-colors hover:bg-white/80"
            aria-label="Toggle Navigation Menu"
          >
            {mobileMenuOpen ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>
      </div>

      {/* Mobile Menu Dropdown (Frosted Glass Overlay) */}
      {mobileMenuOpen && (
        <div className="pointer-events-auto fixed inset-x-3 top-16 sm:top-20 z-40 md:hidden animate-in fade-in slide-in-from-top-4 duration-200">
          <div className="rounded-3xl border border-white/70 bg-white/90 backdrop-blur-2xl p-5 shadow-2xl space-y-3 font-sora">
            {/* Simple Log In Card for Mobile */}
            {!user ? (
              <Link
                href="/login"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center justify-between p-3 rounded-2xl bg-white/80 hover:bg-white border border-white/80 text-slate-900 shadow-xs transition-all"
              >
                <div className="flex items-center gap-2">
                  <User size={15} className="text-emerald-600" />
                  <span className="text-xs font-semibold">Log In to Portal</span>
                </div>
                <span className="text-xs font-bold text-emerald-600">&rarr;</span>
              </Link>
            ) : (
              <Link
                href={resolveDashboardUrl(role)}
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center justify-between p-3 rounded-2xl bg-slate-900 text-white shadow-xs transition-all hover:bg-slate-800"
              >
                <div className="flex items-center gap-2">
                  <User size={15} className="text-emerald-400" />
                  <span className="text-xs font-semibold">My Portal</span>
                </div>
                <span className="text-xs font-bold text-emerald-400">&rarr;</span>
              </Link>
            )}

            {/* Navigation Links */}
            <div className="flex flex-col space-y-1 pt-1">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className="py-2.5 px-3 rounded-xl text-xs font-semibold text-slate-800 hover:bg-white/70 hover:text-emerald-700 transition-colors border-b border-slate-100 last:border-0"
                >
                  {item.label}
                </Link>
              ))}
            </div>

            {/* Bottom Actions */}
            <div className="pt-2 flex flex-col gap-2">
              {!user ? (
                <Link
                  href="/assessment"
                  onClick={() => setMobileMenuOpen(false)}
                  className="w-full text-center bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-bold rounded-2xl py-3 text-xs shadow-md flex items-center justify-center gap-1.5"
                >
                  <span>Check Eligibility</span>
                  <ArrowRight size={14} />
                </Link>
              ) : (
                <button
                  onClick={handleSignOut}
                  className="w-full text-center bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-2xl py-2.5 text-xs shadow-sm flex items-center justify-center gap-1.5"
                >
                  <LogOut size={14} />
                  <span>Sign Out</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </header>
  )
}

