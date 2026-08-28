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
                <a 
                  href={role === 'admin' ? '/admin' : role === 'doctor' ? '/doctor/dashboard' : '/patient'} 
                  className="px-3 py-1 rounded-full text-[11px] font-bold text-[#0F172A] bg-white border border-[#D46E53]/25 hover:bg-[#F9F6F0] transition-all flex items-center gap-1.5 font-sora shadow-2xs"
                >
                  <User size={12} /> My Dashboard
                </a>
                <button 
                  onClick={async () => {
                    await supabase.auth.signOut()
                    document.cookie = 'user_role=; path=/; expires=Thu, 01 Jan 1970 00:00:00 UTC; SameSite=Lax'
                    window.location.href = '/'
                  }}
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
                  <a 
                    href={role === 'admin' ? '/admin' : role === 'doctor' ? '/doctor/dashboard' : '/patient'} 
                    onClick={() => setMobileMenuOpen(false)}
                    className="w-full text-center bg-white border border-[#D46E53]/20 text-[#0F172A] font-bold rounded-full px-5 py-3 mt-3 block text-sm font-sora"
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
