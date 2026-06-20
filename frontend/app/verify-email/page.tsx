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
        const res = await fetch('/api/auth/verify-email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token }),
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
    <main className="min-h-screen bg-[#F9F6F0] flex items-center justify-center p-6">
      <section className="w-full max-w-md rounded-3xl bg-white p-8 shadow-xl border border-[#E8DED4] text-center">
        <div className={`mx-auto flex h-14 w-14 items-center justify-center rounded-2xl ${status === 'error' ? 'bg-rose-50 text-rose-600' : 'bg-emerald-50 text-emerald-600'}`}>
          {status === 'error' ? <AlertCircle className="h-7 w-7" /> : <CheckCircle2 className="h-7 w-7" />}
        </div>
        <h1 className="mt-6 text-2xl font-bold text-[#1A1F36]">Email verification</h1>
        <p className="mt-3 text-sm leading-6 text-[#475569]">{message}</p>
        {status !== 'loading' && (
          <Link href={nextPath} className="mt-6 inline-flex w-full justify-center rounded-2xl bg-[#1A1F36] px-4 py-4 text-sm font-bold text-white">
            {nextPath.startsWith('/reset-password') ? 'Set password' : 'Go to login'}
          </Link>
        )}
      </section>
    </main>
  )
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={<main className="min-h-screen bg-[#F9F6F0]" />}>
      <VerifyEmailContent />
    </Suspense>
  )
}
