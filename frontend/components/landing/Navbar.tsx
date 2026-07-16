'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { Menu, X, LogOut, User } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase } from '@/lib/supabaseClient'
import type { User as SupabaseUser } from '@supabase/supabase-js'

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [user, setUser] = useState<SupabaseUser | null>(null)
  const [role, setRole] = useState<string>('patient')

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 40) {
        setScrolled(true)
      } else {
        setScrolled(false)
      }
    }
    window.addEventListener('scroll', handleScroll)

    // Check auth session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user || null)
      if (session?.user) {
        const match = document.cookie.match(/user_role=([^;]+)/)
        setRole(match ? match[1] : 'patient')
      }
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user || null)
      if (session?.user) {
        const match = document.cookie.match(/user_role=([^;]+)/)
        setRole(match ? match[1] : 'patient')
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
        initial={{ y: -100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="pointer-events-none fixed left-0 right-0 top-0 z-50 flex justify-center px-3 pt-3 sm:px-4 sm:pt-6"
      >
        {/* Floating Capsule */}
        <div 
          className={`pointer-events-auto flex w-full max-w-5xl items-center justify-between rounded-full border transition-all duration-500
            ${scrolled 
              ? 'bg-[#F9F6F0]/95 md:bg-[#F9F6F0]/80 md:backdrop-blur-2xl border-[#D46E53]/20 shadow-[0_8px_30px_rgb(0,0,0,0.08)] py-2.5 px-4 sm:py-3 sm:px-6' 
              : 'bg-white/90 md:bg-white/40 md:backdrop-blur-md border-white/50 shadow-sm py-3 px-4 sm:py-4 sm:px-8'
            }`}
        >
          {/* Logo */}
          <div className="flex items-center shrink-0">
            <img 
              src="/brand-logo.svg" 
              alt="8Liv Logo" 
              className="h-10 sm:h-11 md:h-12 w-auto object-contain cursor-pointer"
            />
          </div>

          {/* Desktop Links */}
          <nav className="hidden md:flex items-center gap-1 bg-white/40 rounded-full p-1 border border-white/30 shadow-inner">
            <Link href="/how-it-works" className="px-5 py-2 rounded-full text-sm font-medium text-[#475569] hover:text-[#0F172A] hover:bg-white/60 transition-all">How It Works</Link>
            <Link href="/medical-weight-management" className="px-5 py-2 rounded-full text-sm font-medium text-[#475569] hover:text-[#0F172A] hover:bg-white/60 transition-all">The Program</Link>
            <Link href="/membership" className="px-5 py-2 rounded-full text-sm font-medium text-[#475569] hover:text-[#0F172A] hover:bg-white/60 transition-all">Membership</Link>
            <Link href="/about" className="px-5 py-2 rounded-full text-sm font-medium text-[#475569] hover:text-[#0F172A] hover:bg-white/60 transition-all">Company</Link>
          </nav>

          {/* Right Action */}
          <div className="hidden md:flex items-center shrink-0 gap-4">
            {user ? (
              <>
                <a 
                  href={role === 'admin' ? '/admin' : role === 'doctor' ? '/doctor/dashboard' : '/patient'} 
                  className="px-5 py-2.5 rounded-full text-sm font-semibold text-[#0F172A] bg-white border border-[#D46E53]/20 hover:bg-[#F9F6F0] transition-all flex items-center gap-1.5"
                >
                  <User size={16} /> My Dashboard
                </a>
                <button 
                  onClick={async () => {
                    await supabase.auth.signOut()
                    document.cookie = 'user_role=; path=/; expires=Thu, 01 Jan 1970 00:00:00 UTC; SameSite=Lax'
                    window.location.href = '/'
                  }}
                  className="bg-[#0F172A] text-white font-medium rounded-full px-6 py-2.5 text-sm hover:bg-rose-600 transition-all border border-transparent flex items-center gap-1.5 cursor-pointer"
                >
                  <LogOut size={16} /> Sign Out
                </button>
              </>
            ) : (
              <Link href="/login" className="bg-[#0F172A] text-white font-medium rounded-full px-6 py-2.5 text-sm hover:bg-[#1E293B] hover:shadow-lg transition-all border border-transparent hover:border-white/20">
                Log In
              </Link>
            )}
          </div>

          {/* Mobile Menu Toggle */}
          <button 
            className="rounded-full border border-white/50 bg-white/50 p-2 text-[#0F172A] md:hidden"
            aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </motion.header>

      {/* Mobile Menu Overlay */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed inset-x-3 top-20 z-40 md:hidden sm:inset-x-4 sm:top-24"
          >
            <div className="flex max-h-[calc(100vh-6rem)] flex-col space-y-3 overflow-y-auto rounded-3xl border border-[#D46E53]/20 bg-[#F9F6F0] p-5 shadow-2xl md:bg-[#F9F6F0]/95 md:backdrop-blur-3xl sm:p-6">
              <Link href="/how-it-works" onClick={() => setMobileMenuOpen(false)} className="border-b border-[#D46E53]/10 p-2 text-left text-base font-medium text-[#0F172A] sm:text-lg">How It Works</Link>
              <Link href="/medical-weight-management" onClick={() => setMobileMenuOpen(false)} className="border-b border-[#D46E53]/10 p-2 text-left text-base font-medium text-[#0F172A] sm:text-lg">The Program</Link>
              <Link href="/membership" onClick={() => setMobileMenuOpen(false)} className="border-b border-[#D46E53]/10 p-2 text-left text-base font-medium text-[#0F172A] sm:text-lg">Membership</Link>
              <Link href="/about" onClick={() => setMobileMenuOpen(false)} className="border-b border-[#D46E53]/10 p-2 text-left text-base font-medium text-[#0F172A] sm:text-lg">Company</Link>
              {user ? (
                <>
                  <a 
                    href={role === 'admin' ? '/admin' : role === 'doctor' ? '/doctor/dashboard' : '/patient'} 
                    onClick={() => setMobileMenuOpen(false)}
                    className="w-full text-center bg-white border border-[#D46E53]/20 text-[#0F172A] font-semibold rounded-full px-6 py-4 mt-4 block"
                  >
                    My Dashboard
                  </a>
                  <button 
                    onClick={async () => {
                      setMobileMenuOpen(false)
                      await supabase.auth.signOut()
                      document.cookie = 'user_role=; path=/; expires=Thu, 01 Jan 1970 00:00:00 UTC; SameSite=Lax'
                      window.location.href = '/'
                    }}
                    className="w-full text-center bg-rose-600 text-white font-semibold rounded-full px-6 py-4 mt-2 block cursor-pointer"
                  >
                    Sign Out
                  </button>
                </>
              ) : (
                <Link href="/login" onClick={() => setMobileMenuOpen(false)} className="mt-4 block w-full rounded-full bg-[#0F172A] px-6 py-4 text-center font-semibold text-white shadow-lg">
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
