'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { ArrowRight, Lock, Mail, AlertCircle, CheckCircle2, Eye, EyeOff } from 'lucide-react'
import { supabase } from '@/lib/supabaseClient'
import { getPatientJourneyTarget } from '@/lib/patientJourney'
import { logJourneyDebug } from '@/lib/logger'

export default function UnifiedLogin() {
  const router = useRouter()
  const [checkingAuth, setCheckingAuth] = useState(true)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [authError, setAuthError] = useState('')
  const [authSuccess, setAuthSuccess] = useState(() => {
    if (typeof window === 'undefined') return ''
    const urlParams = new URLSearchParams(window.location.search)
    if (urlParams.get('success') === 'account_created') {
      return 'Account created successfully! Please sign in with your new credentials.'
    }
    if (urlParams.get('success') === 'confirm_email') {
      return 'Account created successfully! Please check your email inbox, Spam, Junk, or Promotions folder to confirm your account, then sign in here.'
    }
    return ''
  })

  useEffect(() => {
    const checkRedirect = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession()
        if (error) {
          console.error("Auth check error:", error)
        }
        
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
                .select('id')
                .eq('id', session.user.id)
                .maybeSingle()

              if (docProfile) {
                role = 'doctor'
              } else {
                const { data: profile } = await supabase
                  .from('profiles')
                  .select('role')
                  .eq('id', session.user.id)
                  .maybeSingle()
                if (profile?.role) {
                  role = profile.role
                } else {
                  role = session.user.user_metadata?.role || 'patient'
                }
              }
            }
            document.cookie = `user_role=${role}; path=/; max-age=86400; SameSite=Lax`
          }

          if (role === 'admin') {
            router.push('/admin')
          } else if (role === 'doctor') {
            router.push('/doctor/dashboard')
          } else if (role === 'dietitian' || role === 'trainer' || role === 'fitness_coach' || role === 'nutritionist') {
            router.push('/provider/dashboard')
          } else if (['PHARMACY_ADMIN', 'PHARMACY_STAFF', 'DELIVERY_PARTNER', 'PHARMACIST'].includes(String(role).toUpperCase())) {
            setAuthError('Pharmacy portal access has been retired. Contact 8liv admin support if this account needs a new role.')
            setCheckingAuth(false)
          } else {
            const statusRes = await fetch(`/api/patient/status?patientId=${session.user.id}`, {
              headers: { Authorization: `Bearer ${session.access_token}` },
            })
            if (statusRes.ok) {
              const statusData = await statusRes.json()
              const target = getPatientJourneyTarget(statusData)
              logJourneyDebug('[patient-login-redirect]', {
                patientId: session.user.id,
                assessmentFound: Boolean(statusData.assessment),
                assessmentStatus: statusData.assessmentStatus,
                eligibilityStatus: statusData.eligibilityStatus,
                currentJourneyStep: statusData.currentJourneyStep,
                redirectTarget: target,
                reason: 'existing session',
              })
              router.push(target)
            } else {
              router.push('/patient')
            }
          }
        } else {
          setCheckingAuth(false)
        }
      } catch (err) {
        console.error("Auth session check threw an exception:", err)
        setCheckingAuth(false)
      }
    }
    checkRedirect()
  }, [router])

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
      const loginResponse = await fetch('/api/auth/login', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
        email,
        password
        })
      })
      const loginData = await loginResponse.json()
      if (!loginResponse.ok) {
        if (loginData.code === 'EMAIL_NOT_VERIFIED') {
          window.location.href = `/verification-pending?email=${encodeURIComponent(email)}`
          return
        }
        if (loginData.code === 'RESET_PASSWORD_REQUIRED') {
          setAuthError('Please set your password using the invitation link, or use Forgot password to create a new password.')
          return
        }
        throw new Error(loginData.error || 'Authentication failed.')
      }

      await supabase.auth.setSession({
        access_token: loginData.session.access_token,
        refresh_token: loginData.session.refresh_token,
      })

      const role = loginData.role || 'patient'
      // Set cookie for Next.js middleware
      document.cookie = `user_role=${role}; path=/; max-age=86400; SameSite=Lax`

      // Redirect to correct dashboard based on role
      if (role === 'admin') {
        window.location.href = '/admin'
      } else if (role === 'doctor') {
        window.location.href = '/doctor/dashboard'
      } else if (role === 'dietitian' || role === 'trainer' || role === 'fitness_coach' || role === 'nutritionist') {
        window.location.href = '/provider/dashboard'
      } else if (['PHARMACY_ADMIN', 'PHARMACY_STAFF', 'DELIVERY_PARTNER', 'PHARMACIST'].includes(String(role).toUpperCase())) {
        document.cookie = 'user_role=; path=/; max-age=0; SameSite=Lax'
        setAuthError('Pharmacy portal access has been retired. Contact 8liv admin support if this account needs a new role.')
      } else {
        const statusRes = await fetch(`/api/patient/status?patientId=${loginData.user.id}`, {
          headers: { Authorization: `Bearer ${loginData.session.access_token}` },
        })
        if (statusRes.ok) {
          const statusData = await statusRes.json()
          const target = getPatientJourneyTarget(statusData)
          logJourneyDebug('[patient-login-redirect]', {
            patientId: loginData.user.id,
            assessmentFound: Boolean(statusData.assessment),
            assessmentStatus: statusData.assessmentStatus,
            eligibilityStatus: statusData.eligibilityStatus,
            currentJourneyStep: statusData.currentJourneyStep,
            redirectTarget: target,
            reason: 'password login',
          })
          window.location.href = target
        } else {
          window.location.href = '/patient'
        }
      }
    } catch (err: unknown) {
      setAuthError(err instanceof Error ? err.message : 'Authentication failed.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-white flex">
      {/* Left: Branding & Visual */}
      <div 
        className="hidden lg:flex lg:w-1/2 relative overflow-hidden items-center justify-center p-12 bg-cover bg-center bg-[#0B1120]"
        style={{ backgroundImage: 'url("/images/hero_indian.png")' }}
      >
        <div className="absolute inset-0 bg-gradient-to-t from-[#0B1120]/95 via-[#0F172A]/75 to-[#0D9488]/20"></div>
        <div className="absolute top-0 left-0 w-96 h-96 bg-[#0D9488]/15 rounded-full blur-[140px] pointer-events-none" />
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-[#00A884]/15 rounded-full blur-[140px] pointer-events-none" />
        
        <div className="relative z-10 w-full max-w-lg text-white flex flex-col h-full justify-between">
          <div>
            <motion.img 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
              src="/brand-logo-light.svg" 
              alt="8liv Logo" 
              className="h-12 w-auto object-contain"
            />
          </div>

          <div className="mb-12">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8, delay: 0.2 }}
            >
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#0D9488]/20 border border-[#0D9488]/40 mb-6 backdrop-blur-md">
                <span className="w-2 h-2 rounded-full bg-[#5EEAD4] animate-pulse" />
                <span className="text-[10px] font-bold uppercase tracking-widest text-[#5EEAD4] font-sora">
                  Doctor-Led &amp; Coach-Supervised
                </span>
              </div>
              <h1 className="text-3xl lg:text-4xl xl:text-5xl font-bold font-sora leading-tight mb-6">
                &ldquo;Real transformation begins when <span className="bg-gradient-to-r from-[#00A884] via-[#0D9488] to-[#5EEAD4] bg-clip-text text-transparent">clinical care</span> meets daily consistency.&rdquo;
              </h1>
              <div className="flex items-center gap-4">
                <div className="w-12 h-1 bg-[#0D9488] rounded-full"></div>
                <p className="text-xs font-bold tracking-widest text-[#5EEAD4] uppercase font-sora">The 8liv Care Team</p>
              </div>
            </motion.div>
          </div>
        </div>
      </div>

      {/* Right: Auth Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 sm:p-12 md:p-24 relative overflow-y-auto bg-white">
        <div className="absolute top-8 left-8 lg:hidden">
          <img src="/brand-logo-official.png" alt="8LIV Official Logo" className="h-10 w-auto object-contain" />
        </div>

        <motion.div 
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="w-full max-w-md py-12"
        >
          <div className="mb-10 text-center lg:text-left">
            <h2 className="text-3xl sm:text-4xl font-extrabold font-sora text-[#0F172A] mb-3 tracking-tight">
              Sign In
            </h2>
            <p className="text-[#475569] text-sm sm:text-base">
              Enter your credentials to access your 8liv account.
            </p>
          </div>

          <form onSubmit={handleAuth} className="space-y-6">
            <div className="space-y-2">
              <label className="text-sm font-bold text-[#0F172A] font-sora ml-1">Email Address</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-[#94A3B8]" />
                </div>
                <input 
                  type="email" 
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-[#F8FAFC] border border-slate-200 text-[#0F172A] rounded-2xl pl-12 pr-4 py-4 focus:outline-none focus:ring-2 focus:ring-[#0D9488]/30 focus:border-[#0D9488] focus:bg-white transition-all shadow-xs"
                  placeholder="name@example.com"
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-center ml-1">
                <label className="text-sm font-bold text-[#0F172A] font-sora">Password</label>
                <Link href="/forgot-password" className="text-xs sm:text-sm font-semibold text-[#0D9488] hover:text-[#0F766E] transition-colors font-sora">Forgot password?</Link>
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-[#94A3B8]" />
                </div>
                <input 
                  type={showPassword ? "text" : "password"} 
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-[#F8FAFC] border border-slate-200 text-[#0F172A] rounded-2xl pl-12 pr-12 py-4 focus:outline-none focus:ring-2 focus:ring-[#0D9488]/30 focus:border-[#0D9488] focus:bg-white transition-all shadow-xs"
                  placeholder="Password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-4 flex items-center text-[#94A3B8] hover:text-[#0F172A] transition-colors focus:outline-none"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? (
                    <EyeOff className="h-5 w-5" />
                  ) : (
                    <Eye className="h-5 w-5" />
                  )}
                </button>
              </div>
            </div>

            {authError && <div className="p-4 bg-rose-50 border border-rose-100 rounded-2xl flex items-start gap-3 text-rose-600"><AlertCircle className="w-5 h-5 mt-0.5 flex-shrink-0"/><p className="text-sm font-semibold">{authError}</p></div>}
            {authSuccess && <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-2xl flex items-start gap-3 text-emerald-600"><CheckCircle2 className="w-5 h-5 mt-0.5 flex-shrink-0"/><p className="text-sm font-semibold">{authSuccess}</p></div>}

            <button 
              type="submit" 
              disabled={isLoading}
              className="w-full bg-[#0D9488] hover:bg-[#097A70] text-white font-sora font-bold text-sm sm:text-base rounded-2xl py-4 flex items-center justify-center gap-2 shadow-lg shadow-[#0D9488]/20 transition-all hover:scale-[1.01] active:scale-[0.99] disabled:opacity-70 cursor-pointer mt-4"
            >
              {isLoading ? (
                <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <span>Sign In</span>
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>
          </form>

          <div className="mt-10 text-center">
            <p className="text-[#475569] text-sm">
              Don&apos;t have an account? {' '}
              <Link href="/assessment" className="font-bold text-[#0D9488] hover:text-[#0F766E] transition-colors font-sora">
                Take the Assessment
              </Link>
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  )
}
