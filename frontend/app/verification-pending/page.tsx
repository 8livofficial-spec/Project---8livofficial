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
    <main className="min-h-screen bg-[#F9F6F0] flex items-center justify-center p-6">
      <section className="w-full max-w-md rounded-3xl bg-white p-8 shadow-xl border border-[#E8DED4] text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#C4622D]/10 text-[#C4622D]">
          <Mail className="h-7 w-7" />
        </div>
        <h1 className="mt-6 text-2xl font-bold text-[#1A1F36]">Verify your email</h1>
        <p className="mt-3 text-sm leading-6 text-[#475569]">
          We sent a verification link to {email ? <strong>{email}</strong> : 'your email address'}. Verify your email before signing in.
        </p>
        {message && <p className="mt-5 rounded-xl bg-emerald-50 p-3 text-sm font-semibold text-emerald-700"><CheckCircle2 className="mr-2 inline h-4 w-4" />{message}</p>}
        {error && <p className="mt-5 rounded-xl bg-rose-50 p-3 text-sm font-semibold text-rose-700"><AlertCircle className="mr-2 inline h-4 w-4" />{error}</p>}
        <button
          type="button"
          onClick={resend}
          disabled={loading || !email}
          className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-[#1A1F36] px-4 py-4 text-sm font-bold text-white disabled:opacity-60"
        >
          {loading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          Resend verification email
        </button>
        <Link href="/login" className="mt-5 inline-block text-sm font-bold text-[#C4622D]">Back to login</Link>
      </section>
    </main>
  )
}

export default function VerificationPendingPage() {
  return (
    <Suspense fallback={<main className="min-h-screen bg-[#F9F6F0]" />}>
      <VerificationPendingContent />
    </Suspense>
  )
}
