'use client'

import React, { Suspense, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { AlertCircle, ArrowRight, CheckCircle2, Lock } from 'lucide-react'

function passwordError(password: string) {
  if (password.length < 8) return 'Password must be at least 8 characters.'
  if (!/[A-Z]/.test(password)) return 'Password must include at least one uppercase letter.'
  if (!/[a-z]/.test(password)) return 'Password must include at least one lowercase letter.'
  if (!/\d/.test(password)) return 'Password must include at least one number.'
  if (!/[^A-Za-z0-9]/.test(password)) return 'Password must include at least one special character.'
  return ''
}

function ResetPasswordContent() {
  const token = useSearchParams().get('token') || ''
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess('')

    if (!token) return setError('Reset token is missing.')
    if (password !== confirmPassword) return setError('Passwords do not match.')
    const strengthError = passwordError(password)
    if (strengthError) return setError(strengthError)

    setLoading(true)
    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, newPassword: password }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Unable to reset password.')
      setSuccess('Password updated successfully. You can now sign in.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to reset password.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen bg-[#F9F6F0] flex items-center justify-center p-8">
      <section className="w-full max-w-md rounded-3xl bg-white p-8 shadow-xl border border-[#E8DED4]">
        <h1 className="text-3xl font-bold text-[#0F172A]">Create New Password</h1>
        <p className="mt-3 text-[#475569]">Use a strong password to secure your 8liv account.</p>

        <form onSubmit={submit} className="mt-8 space-y-5">
          {[{ label: 'New Password', value: password, set: setPassword }, { label: 'Confirm Password', value: confirmPassword, set: setConfirmPassword }].map((field) => (
            <div key={field.label}>
              <label className="text-sm font-semibold text-[#0F172A]">{field.label}</label>
              <div className="relative mt-2">
                <Lock className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[#475569]" />
                <input
                  type="password"
                  required
                  value={field.value}
                  onChange={(e) => field.set(e.target.value)}
                  className="w-full rounded-2xl border border-gray-200 bg-white py-4 pl-12 pr-4 text-[#0F172A] focus:border-[#D46E53] focus:outline-none focus:ring-2 focus:ring-[#D46E53]/50"
                />
              </div>
            </div>
          ))}

          {error && <div className="rounded-2xl border border-rose-100 bg-rose-50 p-4 text-sm font-semibold text-rose-600"><AlertCircle className="mr-2 inline h-5 w-5" />{error}</div>}
          {success && <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-4 text-sm font-semibold text-emerald-600"><CheckCircle2 className="mr-2 inline h-5 w-5" />{success}</div>}

          {success ? (
            <Link href="/login" className="flex w-full justify-center rounded-2xl bg-[#0F172A] py-4 font-semibold text-white">Go to login</Link>
          ) : (
            <button type="submit" disabled={loading} className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[#0F172A] py-4 font-semibold text-white disabled:opacity-70">
              {loading ? <div className="h-6 w-6 animate-spin rounded-full border-2 border-white/30 border-t-white" /> : <>Update password <ArrowRight className="h-5 w-5" /></>}
            </button>
          )}
        </form>
      </section>
    </main>
  )
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<main className="min-h-screen bg-[#F9F6F0]" />}>
      <ResetPasswordContent />
    </Suspense>
  )
}
