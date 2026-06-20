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
    <div className="min-h-screen bg-[#F9F6F0] flex items-center justify-center p-8">
      <div className="w-full max-w-md rounded-3xl bg-white p-8 shadow-xl border border-[#E8DED4]">
        <h1 className="text-3xl font-bold text-[#0F172A]">Reset Password</h1>
        <p className="mt-3 text-[#475569]">Enter your account email. If an account exists, we will send a secure reset link.</p>

        <form onSubmit={handleRequestReset} className="mt-8 space-y-5">
          <div>
            <label className="text-sm font-semibold text-[#0F172A]">Email Address</label>
            <div className="relative mt-2">
              <Mail className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[#475569]" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-2xl border border-gray-200 bg-white py-4 pl-12 pr-4 text-[#0F172A] focus:border-[#D46E53] focus:outline-none focus:ring-2 focus:ring-[#D46E53]/50"
                placeholder="name@example.com"
              />
            </div>
          </div>

          {error && <div className="rounded-2xl border border-rose-100 bg-rose-50 p-4 text-sm font-semibold text-rose-600"><AlertCircle className="mr-2 inline h-5 w-5" />{error}</div>}
          {success && <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-4 text-sm font-semibold text-emerald-600"><CheckCircle2 className="mr-2 inline h-5 w-5" />{success}</div>}

          <button
            type="submit"
            disabled={isLoading}
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[#0F172A] py-4 font-semibold text-white disabled:opacity-70"
          >
            {isLoading ? <div className="h-6 w-6 animate-spin rounded-full border-2 border-white/30 border-t-white" /> : <>Send reset link <ArrowRight className="h-5 w-5" /></>}
          </button>
        </form>

        <Link href="/login" className="mt-8 inline-flex items-center gap-2 text-sm font-medium text-[#475569] hover:text-[#0F172A]">
          <ArrowLeft className="h-4 w-4" /> Back to Login
        </Link>
      </div>
    </div>
  )
}
