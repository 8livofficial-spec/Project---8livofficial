'use client'

import React, { useState, useEffect } from 'react'
import { Menu, X, LogOut, User } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase } from '@/lib/supabaseClient'

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [user, setUser] = useState<any>(null)
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
        className="fixed top-0 left-0 right-0 z-50 flex justify-center px-4 pt-6 pointer-events-none"
      >
        {/* Floating Capsule */}
        <div 
          className={`pointer-events-auto flex items-center justify-between w-full max-w-5xl rounded-full transition-all duration-500 border
            ${scrolled 
              ? 'bg-[#F9F6F0]/80 backdrop-blur-2xl border-[#D46E53]/20 shadow-[0_8px_30px_rgb(0,0,0,0.08)] py-3 px-6' 
              : 'bg-white/40 backdrop-blur-md border-white/50 shadow-sm py-4 px-8'
            }`}
        >
          {/* Logo */}
          <div className="flex items-center shrink-0">
            <img 
              src="/images/logo loss.png" 
              alt="8Liv Logo" 
              className="h-24 object-contain cursor-pointer -my-4"
            />
          </div>

          {/* Desktop Links */}
          <nav className="hidden md:flex items-center gap-1 bg-white/40 rounded-full p-1 border border-white/30 shadow-inner">
            <a href="#how-it-works" className="px-5 py-2 rounded-full text-sm font-medium text-[#475569] hover:text-[#0F172A] hover:bg-white/60 transition-all">How It Works</a>
            <a href="#program" className="px-5 py-2 rounded-full text-sm font-medium text-[#475569] hover:text-[#0F172A] hover:bg-white/60 transition-all">The Program</a>
            <a href="#outcomes" className="px-5 py-2 rounded-full text-sm font-medium text-[#475569] hover:text-[#0F172A] hover:bg-white/60 transition-all">Outcomes</a>
            <a href="#portal" className="px-5 py-2 rounded-full text-sm font-medium text-[#475569] hover:text-[#0F172A] hover:bg-white/60 transition-all">Dashboard</a>
          </nav>

          {/* Right Action */}
          <div className="hidden md:flex items-center shrink-0 gap-4">
            {user ? (
              <>
                <a 
                  href={role === 'admin' ? '/admin' : role === 'doctor' ? '/doctor/dashboard' : '/dashboard'} 
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
            className="fixed inset-x-4 top-24 z-40 md:hidden"
          >
            <div className="bg-[#F9F6F0]/95 backdrop-blur-3xl border border-[#D46E53]/20 rounded-3xl p-6 shadow-2xl flex flex-col space-y-4">
              <a href="#how-it-works" onClick={() => setMobileMenuOpen(false)} className="text-[#0F172A] text-lg font-medium p-2 border-b border-[#D46E53]/10">How It Works</a>
              <a href="#program" onClick={() => setMobileMenuOpen(false)} className="text-[#0F172A] text-lg font-medium p-2 border-b border-[#D46E53]/10">The Program</a>
              <a href="#outcomes" onClick={() => setMobileMenuOpen(false)} className="text-[#0F172A] text-lg font-medium p-2 border-b border-[#D46E53]/10">Outcomes</a>
              <a href="#portal" onClick={() => setMobileMenuOpen(false)} className="text-[#0F172A] text-lg font-medium p-2 border-b border-[#D46E53]/10">Dashboard</a>
              {user ? (
                <>
                  <a 
                    href={role === 'admin' ? '/admin' : role === 'doctor' ? '/doctor/dashboard' : '/dashboard'} 
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
