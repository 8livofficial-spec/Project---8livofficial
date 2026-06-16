'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowLeft, ArrowRight, Mail, Lock, AlertCircle, CheckCircle2, KeyRound } from 'lucide-react'

export default function ForgotPassword() {
  const router = useRouter()
  const [step, setStep] = useState<1 | 2 | 3>(1)
  
  const [email, setEmail] = useState('')
  const [otpCode, setOtpCode] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  // STEP 1: Request OTP
  const handleRequestOtp = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError('')
    setSuccess('')

    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      })
      const data = await res.json()
      
      if (!res.ok) throw new Error(data.error || 'Failed to send verification code.')
      
      setSuccess('Verification code sent! Please check your inbox.')
      setTimeout(() => {
        setSuccess('')
        setStep(2)
      }, 1500)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setIsLoading(false)
    }
  }

  // STEP 2: Verify OTP & STEP 3: Reset Password
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError('')
    setSuccess('')

    if (password !== confirmPassword) {
      setError('Passwords do not match.')
      setIsLoading(false)
      return
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters.')
      setIsLoading(false)
      return
    }

    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, otpCode, newPassword: password })
      })
      const data = await res.json()
      
      if (!res.ok) throw new Error(data.error || 'Failed to reset password.')
      
      setSuccess('Password updated successfully! Redirecting to login...')
      setTimeout(() => {
        router.push('/login')
      }, 2000)
    } catch (err: any) {
      setError(err.message)
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

      {/* Right: Forgot Password Forms */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 sm:p-12 md:p-24 relative overflow-y-auto">
        <div className="absolute top-8 left-8 lg:hidden">
          <img src="/images/logo loss.png" alt="8Liv Logo" className="h-10 object-contain" />
        </div>

        <div className="w-full max-w-md py-12 relative overflow-hidden min-h-[400px]">
          <AnimatePresence mode="wait">
            
            {/* STEP 1: EMAIL */}
            {step === 1 && (
              <motion.div 
                key="step1"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
              >
                <div className="mb-10 text-center lg:text-left">
                  <h2 className="text-3xl font-bold font-sora text-[#0F172A] mb-3">
                    Reset Password
                  </h2>
                  <p className="text-[#475569]">
                    Enter the email address associated with your account to receive a 6-digit verification code.
                  </p>
                </div>

                <form onSubmit={handleRequestOtp} className="space-y-6">
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

                  {error && <div className="p-4 bg-rose-50 border border-rose-100 rounded-2xl flex items-start gap-3 text-rose-600"><AlertCircle className="w-5 h-5 mt-0.5 flex-shrink-0"/><p className="text-sm font-semibold">{error}</p></div>}
                  {success && <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-2xl flex items-start gap-3 text-emerald-600"><CheckCircle2 className="w-5 h-5 mt-0.5 flex-shrink-0"/><p className="text-sm font-semibold">{success}</p></div>}

                  <button 
                    type="submit" 
                    disabled={isLoading}
                    className="w-full bg-[#0F172A] text-white font-semibold rounded-2xl py-4 flex items-center justify-center gap-2 hover:bg-[#1E293B] hover:shadow-lg transition-all disabled:opacity-70 group mt-4"
                  >
                    {isLoading ? (
                      <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <>
                        Send Verification Code
                        <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                      </>
                    )}
                  </button>
                </form>

                <div className="mt-10 text-center">
                  <a href="/login" className="inline-flex items-center gap-2 text-[#475569] text-sm font-medium hover:text-[#0F172A] transition-colors group">
                    <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                    Back to Login
                  </a>
                </div>
              </motion.div>
            )}

            {/* STEP 2: OTP */}
            {step === 2 && (
              <motion.div 
                key="step2"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
              >
                <div className="mb-10 text-center lg:text-left">
                  <h2 className="text-3xl font-bold font-sora text-[#0F172A] mb-3">
                    Verification Code
                  </h2>
                  <p className="text-[#475569]">
                    We've sent a 6-digit code to <span className="font-semibold">{email}</span>.
                  </p>
                </div>

                <form onSubmit={(e) => { e.preventDefault(); setStep(3); }} className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-[#0F172A] ml-1">6-Digit Code</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                        <KeyRound className="h-5 w-5 text-[#475569]" />
                      </div>
                      <input 
                        type="text" 
                        required
                        maxLength={6}
                        value={otpCode}
                        onChange={(e) => setOtpCode(e.target.value)}
                        className="w-full bg-white border border-gray-200 text-[#0F172A] rounded-2xl pl-12 pr-4 py-4 focus:outline-none focus:ring-2 focus:ring-[#D46E53]/50 focus:border-[#D46E53] transition-all shadow-sm tracking-widest text-lg"
                        placeholder="000000"
                      />
                    </div>
                  </div>

                  <button 
                    type="submit" 
                    disabled={otpCode.length !== 6}
                    className="w-full bg-[#0F172A] text-white font-semibold rounded-2xl py-4 flex items-center justify-center gap-2 hover:bg-[#1E293B] hover:shadow-lg transition-all disabled:opacity-70 group mt-4"
                  >
                    Continue
                    <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                  </button>
                </form>

                <div className="mt-10 text-center">
                  <button onClick={() => setStep(1)} className="inline-flex items-center gap-2 text-[#475569] text-sm font-medium hover:text-[#0F172A] transition-colors group">
                    <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                    Change Email
                  </button>
                </div>
              </motion.div>
            )}

            {/* STEP 3: NEW PASSWORD */}
            {step === 3 && (
              <motion.div 
                key="step3"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
              >
                <div className="mb-10 text-center lg:text-left">
                  <h2 className="text-3xl font-bold font-sora text-[#0F172A] mb-3">
                    New Password
                  </h2>
                  <p className="text-[#475569]">
                    Create a new, secure password for your account.
                  </p>
                </div>

                <form onSubmit={handleResetPassword} className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-[#0F172A] ml-1">New Password</label>
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

                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-[#0F172A] ml-1">Confirm New Password</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                        <Lock className="h-5 w-5 text-[#475569]" />
                      </div>
                      <input 
                        type="password" 
                        required
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className="w-full bg-white border border-gray-200 text-[#0F172A] rounded-2xl pl-12 pr-4 py-4 focus:outline-none focus:ring-2 focus:ring-[#D46E53]/50 focus:border-[#D46E53] transition-all shadow-sm"
                        placeholder="••••••••"
                      />
                    </div>
                  </div>

                  {error && <div className="p-4 bg-rose-50 border border-rose-100 rounded-2xl flex items-start gap-3 text-rose-600"><AlertCircle className="w-5 h-5 mt-0.5 flex-shrink-0"/><p className="text-sm font-semibold">{error}</p></div>}
                  {success && <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-2xl flex items-start gap-3 text-emerald-600"><CheckCircle2 className="w-5 h-5 mt-0.5 flex-shrink-0"/><p className="text-sm font-semibold">{success}</p></div>}

                  <button 
                    type="submit" 
                    disabled={isLoading}
                    className="w-full bg-[#0F172A] text-white font-semibold rounded-2xl py-4 flex items-center justify-center gap-2 hover:bg-[#1E293B] hover:shadow-lg transition-all disabled:opacity-70 group mt-4"
                  >
                    {isLoading ? (
                      <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <>
                        Update Password
                        <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                      </>
                    )}
                  </button>
                </form>
              </motion.div>
            )}

          </AnimatePresence>
        </div>
      </div>
    </div>
  )
}
