'use client'

import React, { Suspense, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { AlertCircle, CheckCircle2 } from 'lucide-react'

function VerifyEmailContent() {
  const searchParams = useSearchParams()
  const token = searchParams.get('token')
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading')
  const [message, setMessage] = useState('Verifying your email...')
  const [nextPath, setNextPath] = useState('/login')
  const verificationStarted = useRef(false)

  useEffect(() => {
    if (verificationStarted.current) return
    verificationStarted.current = true

    const verify = async () => {
      if (!token) {
        setStatus('error')
        setMessage('Verification token is missing.')
        return
      }
      try {
        const email = searchParams.get('email')
        const res = await fetch('/api/auth/verify-email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token, email }),
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || 'Unable to verify email.')
        setStatus('success')
        setNextPath(data.nextPath || '/login')
        setMessage(data.nextPath?.startsWith('/reset-password')
          ? 'Your email is verified. Set your password to activate your provider account.'
          : 'Your email is verified. You can now sign in.')
      } catch (err) {
        setStatus('error')
        setMessage(err instanceof Error ? err.message : 'Unable to verify email.')
      }
    }
    verify()
  }, [token])

  return (
    <main className="min-h-screen bg-slate-50 relative overflow-hidden flex items-center justify-center p-6">
      <div className="absolute top-1/4 left-1/3 w-96 h-96 bg-[#0D9488]/10 rounded-full blur-[140px] pointer-events-none" />
      <section className="w-full max-w-md rounded-3xl bg-white p-8 sm:p-10 shadow-2xl border border-[#0D9488]/20 text-center relative z-10">
        <div className={`mx-auto flex h-14 w-14 items-center justify-center rounded-2xl ${status === 'error' ? 'bg-rose-50 text-rose-600' : 'bg-[#0D9488]/10 text-[#0D9488]'}`}>
          {status === 'error' ? <AlertCircle className="h-7 w-7" /> : <CheckCircle2 className="h-7 w-7" />}
        </div>
        <h1 className="mt-6 text-2xl font-extrabold font-sora text-[#0F172A]">Email Verification</h1>
        <p className="mt-3 text-sm leading-6 text-[#475569]">{message}</p>
        {status !== 'loading' && (
          <Link href={nextPath} className="mt-6 inline-flex w-full justify-center rounded-2xl bg-[#0D9488] hover:bg-[#097A70] px-4 py-4 text-sm font-bold font-sora text-white shadow-lg shadow-[#0D9488]/20 transition-all hover:scale-[1.01] active:scale-[0.99]">
            {nextPath.startsWith('/reset-password') ? 'Set password' : 'Go to login'}
          </Link>
        )}
      </section>
    </main>
  )
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={<main className="min-h-screen bg-slate-50" />}>
      <VerifyEmailContent />
    </Suspense>
  )
}
