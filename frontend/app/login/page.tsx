'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { ArrowRight, Lock, Mail, AlertCircle, CheckCircle2 } from 'lucide-react'
import { supabase } from '@/lib/supabaseClient'

export default function UnifiedLogin() {
  const router = useRouter()
  const [checkingAuth, setCheckingAuth] = useState(true)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [authError, setAuthError] = useState('')
  const [authSuccess, setAuthSuccess] = useState('')

  useEffect(() => {
    const checkRedirect = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (session?.user) {
        let role = 'patient'
        const match = document.cookie.match(/user_role=([^;]+)/)
        if (match) {
          role = match[1]
        } else {
          if (session.user.email === '8livofficial@gmail.com') {
            role = 'admin'
          } else {
            const { data: docProfile } = await supabase
              .from('doctor_profiles')
              .select('doctor_id')
              .eq('doctor_id', session.user.id)
              .single()

            if (docProfile) {
              role = 'doctor'
            } else {
              const { data: profile } = await supabase
                .from('profiles')
                .select('role')
                .eq('id', session.user.id)
                .single()
              role = profile?.role || session.user.user_metadata?.role || 'patient'
            }
          }
          document.cookie = `user_role=${role}; path=/; max-age=86400; SameSite=Lax`
        }

        if (role === 'admin') {
          window.location.href = '/admin'
        } else if (role === 'doctor') {
          window.location.href = '/doctor/dashboard'
        } else {
          window.location.href = '/dashboard'
        }
      } else {
        setCheckingAuth(false)
      }
    }
    checkRedirect()
  }, [])

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search)
      if (urlParams.get('success') === 'account_created') {
        setAuthSuccess("Account created successfully! Please sign in with your new credentials.")
      } else if (urlParams.get('success') === 'confirm_email') {
        setAuthSuccess("Account created successfully! Please check your email inbox to confirm your account, then sign in here.")
      }
    }
  }, [])

  if (checkingAuth) {
    return (
      <div className="min-h-screen bg-[#F9F6F0] flex items-center justify-center text-[#D46E53]">
        <div className="w-12 h-12 border-4 border-current border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setAuthError('')
    setAuthSuccess('')

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      })
      if (error) throw error
      if (!data.user) throw new Error("Authentication failed: no user returned.")

      // Determine user role with fallbacks
      let role = 'patient'

      if (data.user.email === '8livofficial@gmail.com') {
        role = 'admin'
      } else {
        // Check if user is registered in doctor_profiles
        const { data: docProfile } = await supabase
          .from('doctor_profiles')
          .select('doctor_id')
          .eq('doctor_id', data.user.id)
          .single()

        if (docProfile) {
          role = 'doctor'
        } else {
          // Fetch user role from general profiles table
          const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', data.user.id)
            .single()

          role = profile?.role || data.user.user_metadata?.role || 'patient'
        }
      }

      // Set cookie for Next.js middleware
      document.cookie = `user_role=${role}; path=/; max-age=86400; SameSite=Lax`

      // Redirect to correct dashboard based on role
      if (role === 'admin') {
        window.location.href = '/admin'
      } else if (role === 'doctor') {
        window.location.href = '/doctor/dashboard'
      } else {
        window.location.href = '/dashboard'
      }
    } catch (err: any) {
      setAuthError(err.message || 'Authentication failed.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#F9F6F0] flex">
      {/* Left: Branding & Visual */}
      <div 
        className="hidden lg:flex lg:w-1/2 relative overflow-hidden items-center justify-center p-12 bg-cover bg-center"
        style={{ backgroundImage: 'url("/images/hero_wellness.png")' }}
      >
        <div className="absolute inset-0 bg-gradient-to-t from-[#A84A33]/90 via-[#D46E53]/60 to-black/20"></div>
        
        <div className="relative z-10 w-full max-w-lg text-white flex flex-col h-full justify-between">
          <div>
            <motion.img 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
              src="/images/logo loss.png" 
              alt="8Liv Logo" 
              className="h-16 object-contain filter brightness-0 invert opacity-90"
            />
          </div>

          <div className="mb-12">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8, delay: 0.2 }}
            >
              <h1 className="text-4xl lg:text-5xl font-bold font-sora leading-tight mb-6">
                "Real transformation begins when expert care meets daily consistency."
              </h1>
              <div className="flex items-center gap-4">
                <div className="w-12 h-1 bg-[#F9F6F0] rounded-full opacity-80"></div>
                <p className="text-lg font-medium tracking-wide opacity-90 uppercase">The 8Liv Medical Team</p>
              </div>
            </motion.div>
          </div>
        </div>
      </div>

      {/* Right: Auth Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 sm:p-12 md:p-24 relative overflow-y-auto">
        <div className="absolute top-8 left-8 lg:hidden">
          <img src="/images/logo loss.png" alt="8Liv Logo" className="h-10 object-contain" />
        </div>

        <motion.div 
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="w-full max-w-md py-12"
        >
          <div className="mb-10 text-center lg:text-left">
            <h2 className="text-3xl font-bold font-sora text-[#0F172A] mb-3">
              Sign In
            </h2>
            <p className="text-[#475569]">
              Enter your credentials to access your account.
            </p>
          </div>

          <form onSubmit={handleAuth} className="space-y-6">
            <div className="space-y-2">
              <label className="text-sm font-semibold text-[#0F172A] ml-1">Email Address</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-[#475569]" />
                </div>
                <input 
                  type="email" 
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-white border border-gray-200 text-[#0F172A] rounded-2xl pl-12 pr-4 py-4 focus:outline-none focus:ring-2 focus:ring-[#D46E53]/50 focus:border-[#D46E53] transition-all shadow-sm"
                  placeholder="name@example.com"
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-center ml-1">
                <label className="text-sm font-semibold text-[#0F172A]">Password</label>
                <a href="#" className="text-sm font-medium text-[#D46E53] hover:text-[#A84A33] transition-colors">Forgot password?</a>
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-[#475569]" />
                </div>
                <input 
                  type="password" 
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-white border border-gray-200 text-[#0F172A] rounded-2xl pl-12 pr-4 py-4 focus:outline-none focus:ring-2 focus:ring-[#D46E53]/50 focus:border-[#D46E53] transition-all shadow-sm"
                  placeholder="••••••••"
                />
              </div>
            </div>

            {authError && <div className="p-4 bg-rose-50 border border-rose-100 rounded-2xl flex items-start gap-3 text-rose-600"><AlertCircle className="w-5 h-5 mt-0.5 flex-shrink-0"/><p className="text-sm font-semibold">{authError}</p></div>}
            {authSuccess && <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-2xl flex items-start gap-3 text-emerald-600"><CheckCircle2 className="w-5 h-5 mt-0.5 flex-shrink-0"/><p className="text-sm font-semibold">{authSuccess}</p></div>}

            <button 
              type="submit" 
              disabled={isLoading}
              className="w-full bg-[#0F172A] text-white font-semibold rounded-2xl py-4 flex items-center justify-center gap-2 hover:bg-[#1E293B] hover:shadow-lg transition-all disabled:opacity-70 group mt-4"
            >
              {isLoading ? (
                <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  Sign In
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>
          </form>

          <div className="mt-10 text-center">
            <p className="text-[#475569] text-sm mb-4">
              Don't have an account? {' '}
              <a href="/assessment" className="font-semibold text-[#D46E53] hover:text-[#A84A33] transition-colors">
                Take the Assessment
              </a>
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  )
}
