'use client'

import React, { useState, useEffect } from 'react'
import { Menu, X, LogOut, User } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase } from '@/lib/supabaseClient'
import type { User as SupabaseUser } from '@supabase/supabase-js'

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [user, setUser] = useState<SupabaseUser | null>(null)
  const [role, setRole] = useState<string>('patient')

  const scrollToSection = (sectionId: string) => {
    document.getElementById(sectionId)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    window.history.replaceState(null, '', window.location.pathname + window.location.search)
  }

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
        className="fixed top-0 left-0 right-0 z-50 flex justify-center px-4 pt-4 sm:pt-6 pointer-events-none"
      >
        {/* Floating Capsule */}
        <div 
          className={`pointer-events-auto flex items-center justify-between w-full max-w-5xl rounded-full transition-all duration-500 border
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
            <button type="button" onClick={() => scrollToSection('how-it-works')} className="px-5 py-2 rounded-full text-sm font-medium text-[#475569] hover:text-[#0F172A] hover:bg-white/60 transition-all cursor-pointer">How It Works</button>
            <button type="button" onClick={() => scrollToSection('program')} className="px-5 py-2 rounded-full text-sm font-medium text-[#475569] hover:text-[#0F172A] hover:bg-white/60 transition-all cursor-pointer">The Program</button>
            <button type="button" onClick={() => scrollToSection('outcomes')} className="px-5 py-2 rounded-full text-sm font-medium text-[#475569] hover:text-[#0F172A] hover:bg-white/60 transition-all cursor-pointer">Outcomes</button>
            <button type="button" onClick={() => scrollToSection('company')} className="px-5 py-2 rounded-full text-sm font-medium text-[#475569] hover:text-[#0F172A] hover:bg-white/60 transition-all cursor-pointer">Company</button>
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
              <a href="/login" className="bg-[#0F172A] text-white font-medium rounded-full px-6 py-2.5 text-sm hover:bg-[#1E293B] hover:shadow-lg transition-all border border-transparent hover:border-white/20">
                Log In
              </a>
            )}
          </div>

          {/* Mobile Menu Toggle */}
          <button 
            className="md:hidden text-[#0F172A] p-2 bg-white/50 rounded-full border border-white/50"
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
            className="fixed inset-x-4 top-20 sm:top-24 z-40 md:hidden"
          >
            <div className="bg-[#F9F6F0] md:bg-[#F9F6F0]/95 md:backdrop-blur-3xl border border-[#D46E53]/20 rounded-3xl p-6 shadow-2xl flex flex-col space-y-4">
              <button type="button" onClick={() => { scrollToSection('how-it-works'); setMobileMenuOpen(false) }} className="text-left text-[#0F172A] text-lg font-medium p-2 border-b border-[#D46E53]/10">How It Works</button>
              <button type="button" onClick={() => { scrollToSection('program'); setMobileMenuOpen(false) }} className="text-left text-[#0F172A] text-lg font-medium p-2 border-b border-[#D46E53]/10">The Program</button>
              <button type="button" onClick={() => { scrollToSection('outcomes'); setMobileMenuOpen(false) }} className="text-left text-[#0F172A] text-lg font-medium p-2 border-b border-[#D46E53]/10">Outcomes</button>
              <button type="button" onClick={() => { scrollToSection('company'); setMobileMenuOpen(false) }} className="text-left text-[#0F172A] text-lg font-medium p-2 border-b border-[#D46E53]/10">Company</button>
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
                <a href="/login" className="w-full text-center bg-[#0F172A] text-white font-semibold rounded-full px-6 py-4 mt-4 shadow-lg block">
                  Log In
                </a>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
