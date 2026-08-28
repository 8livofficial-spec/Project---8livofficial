'use client'

import React, { Suspense, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { Mail, RefreshCw, CheckCircle2, AlertCircle } from 'lucide-react'

function VerificationPendingContent() {
  const searchParams = useSearchParams()
  const email = searchParams.get('email') || ''
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  const resend = async () => {
    setLoading(true)
    setMessage('')
    setError('')
    try {
      const res = await fetch('/api/auth/resend-verification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Unable to resend verification email.')
      setMessage(data.message || 'Verification email sent.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to resend verification email.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen bg-slate-50 relative overflow-hidden flex items-center justify-center p-6">
      <div className="absolute top-1/4 left-1/3 w-96 h-96 bg-[#0D9488]/10 rounded-full blur-[140px] pointer-events-none" />
      <section className="w-full max-w-md rounded-3xl bg-white p-8 sm:p-10 shadow-2xl border border-[#0D9488]/20 text-center relative z-10">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#0D9488]/10 text-[#0D9488]">
          <Mail className="h-7 w-7" />
        </div>
        <h1 className="mt-6 text-2xl font-extrabold font-sora text-[#0F172A]">Verify Your Email</h1>
        <p className="mt-3 text-sm leading-6 text-[#475569]">
          We sent a verification link to {email ? <strong className="text-[#0F172A]">{email}</strong> : 'your email address'}. Verify your email before signing in.
        </p>
        <p className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-xs sm:text-sm font-semibold leading-relaxed text-amber-900">
          If you do not see the confirmation email, please check your Spam, Junk, or Promotions folder.
        </p>
        {message && <p className="mt-5 rounded-xl bg-emerald-50 p-3 text-sm font-semibold text-emerald-700"><CheckCircle2 className="mr-2 inline h-4 w-4" />{message}</p>}
        {error && <p className="mt-5 rounded-xl bg-rose-50 p-3 text-sm font-semibold text-rose-700"><AlertCircle className="mr-2 inline h-4 w-4" />{error}</p>}
        <button
          type="button"
          onClick={resend}
          disabled={loading || !email}
          className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-[#0D9488] hover:bg-[#097A70] px-4 py-4 text-sm font-bold font-sora text-white shadow-lg shadow-[#0D9488]/20 transition-all hover:scale-[1.01] active:scale-[0.99] disabled:opacity-60 cursor-pointer"
        >
          {loading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          Resend verification email
        </button>
        <Link href="/login" className="mt-5 inline-block text-sm font-bold text-[#0D9488] hover:text-[#0F766E] font-sora transition-colors">Back to login</Link>
      </section>
    </main>
  )
}

export default function VerificationPendingPage() {
  return (
    <Suspense fallback={<main className="min-h-screen bg-slate-50" />}>
      <VerificationPendingContent />
    </Suspense>
  )
}
