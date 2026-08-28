'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, ArrowRight, CheckCircle2, Mail, AlertCircle } from 'lucide-react'

export default function ForgotPassword() {
  const [email, setEmail] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const handleRequestReset = async (e: React.FormEvent) => {
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
      if (!res.ok) throw new Error(data.error || 'Unable to send password reset link.')
      setSuccess(data.message || 'If an account exists, a password reset link has been sent.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to send password reset link.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 relative overflow-hidden flex items-center justify-center p-6 sm:p-8">
      <div className="absolute top-1/4 left-1/3 w-96 h-96 bg-[#0D9488]/10 rounded-full blur-[140px] pointer-events-none" />
      <div className="w-full max-w-md rounded-3xl bg-white p-8 sm:p-10 shadow-2xl border border-[#0D9488]/20 relative z-10">
        <h1 className="text-3xl font-extrabold font-sora text-[#0F172A]">Reset Password</h1>
        <p className="mt-3 text-sm text-[#475569]">Enter your account email. If an account exists, we will send a secure reset link.</p>

        <form onSubmit={handleRequestReset} className="mt-8 space-y-5">
          <div>
            <label className="text-sm font-bold font-sora text-[#0F172A]">Email Address</label>
            <div className="relative mt-2">
              <Mail className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[#94A3B8]" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-2xl border border-slate-200 bg-[#F8FAFC] py-4 pl-12 pr-4 text-[#0F172A] focus:border-[#0D9488] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0D9488]/30 shadow-xs transition-all"
                placeholder="name@example.com"
              />
            </div>
          </div>

          {error && <div className="rounded-2xl border border-rose-100 bg-rose-50 p-4 text-sm font-semibold text-rose-600"><AlertCircle className="mr-2 inline h-5 w-5" />{error}</div>}
          {success && <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-4 text-sm font-semibold text-emerald-600"><CheckCircle2 className="mr-2 inline h-5 w-5" />{success}</div>}

          <button
            type="submit"
            disabled={isLoading}
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[#0D9488] hover:bg-[#097A70] py-4 font-sora font-bold text-white shadow-lg shadow-[#0D9488]/20 transition-all hover:scale-[1.01] active:scale-[0.99] disabled:opacity-70 cursor-pointer"
          >
            {isLoading ? <div className="h-6 w-6 animate-spin rounded-full border-2 border-white/30 border-t-white" /> : <><span>Send reset link</span> <ArrowRight className="h-5 w-5" /></>}
          </button>
        </form>

        <Link href="/login" className="mt-8 inline-flex items-center gap-2 text-sm font-bold text-[#0D9488] hover:text-[#0F766E] font-sora transition-colors">
          <ArrowLeft className="h-4 w-4" /> Back to Login
        </Link>
      </div>
    </div>
  )
}
