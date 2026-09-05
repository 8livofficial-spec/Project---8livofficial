'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { Building2, ShieldCheck, CheckCircle2, Clock, ArrowRight, LogOut, FileText } from 'lucide-react'
import { supabase } from '@/lib/supabaseClient'

function AcceptInvitationForm() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const token = searchParams.get('token') || ''

  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [contactName, setContactName] = useState('')
  const [phone, setPhone] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [pharmacyEmail, setPharmacyEmail] = useState('')

  // Clean out any existing stale sessions (e.g. admin session in the same browser)
  useEffect(() => {
    supabase.auth.signOut().catch(() => {})
    document.cookie = 'user_role=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT'
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!token) return setError('Invalid or missing invitation token.')
    if (password !== confirmPassword) return setError('Passwords do not match.')

    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/pharmacy/accept-invitation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          password,
          contact_name: contactName,
          phone,
        }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to accept invitation.')

      const email = data.email || ''
      setPharmacyEmail(email)

      // Sign out any prior session and sign in as the newly activated pharmacy user
      try {
        await supabase.auth.signOut()
        const { data: authData, error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password,
        })
        if (!signInError && authData?.session) {
          document.cookie = 'user_role=pharmacy; path=/; max-age=86400; SameSite=Lax'
        }
      } catch (authErr) {
        console.warn('Auto sign-in notice:', authErr)
      }

      setSuccess(true)
    } catch (err: any) {
      setError(err.message || 'Something went wrong.')
    } finally {
      setLoading(false)
    }
  }

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    document.cookie = 'user_role=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT'
    router.push('/login?role=pharmacy')
  }

  if (!token) {
    return (
      <div className="rounded-2xl bg-white p-8 shadow-sm text-center">
        <p className="text-xs font-black uppercase tracking-widest text-[#C4622D]">Invalid Link</p>
        <h2 className="mt-2 text-2xl font-black text-[#1A1F36]">Missing Invitation Token</h2>
        <p className="mt-2 text-sm text-[#8896A4]">Please use the exact link sent to your pharmacy email address.</p>
        <Link href="/login?role=pharmacy" className="mt-6 inline-block rounded-xl bg-[#1A1F36] px-5 py-3 text-xs font-black text-white">
          Go to Partner Login
        </Link>
      </div>
    )
  }

  if (success) {
    return (
      <div className="rounded-2xl bg-white p-8 shadow-sm space-y-6">
        <div className="text-center space-y-2">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
            <CheckCircle2 className="h-8 w-8" />
          </div>
          <h2 className="text-2xl font-black text-[#1A1F36]">Invitation Accepted</h2>
          <p className="text-xs font-bold text-[#8896A4] uppercase tracking-wider">
            Account Provisioned for {pharmacyEmail}
          </p>
        </div>

        <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-4 space-y-2">
          <div className="flex items-center gap-2 text-amber-900 font-black text-sm">
            <Clock className="h-4 w-4 shrink-0 text-amber-700" />
            Next Step: Regulatory Onboarding & Admin Approval
          </div>
          <p className="text-xs text-amber-800 leading-relaxed">
            Your partner pharmacy account has been created. Before your pharmacy can receive or fulfill prescription orders, <strong>an 8LIV Administrator must review and approve your account</strong>.
          </p>
          <p className="text-xs text-amber-800 leading-relaxed font-semibold">
            Please submit your Drug License (Form 20B/21B) and Registered Pharmacist details so our compliance team can verify and activate your portal.
          </p>
        </div>

        <div className="space-y-3 pt-2">
          <Link
            href="/pharmacy/onboarding"
            className="w-full flex items-center justify-center gap-2 rounded-xl bg-[#1A1F36] py-3.5 text-sm font-black text-white hover:bg-[#2A314E] transition-all shadow-sm"
          >
            <FileText className="h-4 w-4" />
            Complete Regulatory Onboarding (Form 20B/21B) <ArrowRight className="h-4 w-4" />
          </Link>

          <Link
            href="/pharmacy"
            className="w-full flex items-center justify-center gap-2 rounded-xl border border-[#1A1F36]/15 bg-[#F5F0EB]/50 py-3 text-xs font-black text-[#1A1F36] hover:bg-[#F5F0EB] transition-all"
          >
            View Partner Portal Status
          </Link>

          <div className="text-center pt-2">
            <button
              onClick={handleSignOut}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-[#8896A4] hover:text-[#1A1F36] transition-colors"
            >
              <LogOut className="h-3.5 w-3.5" /> Sign Out
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="rounded-2xl bg-white p-8 shadow-sm">
      <div className="text-center mb-6">
        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-[#1A1F36] text-white">
          <Building2 className="h-6 w-6 text-[#C4622D]" />
        </div>
        <p className="text-xs font-black uppercase tracking-widest text-[#C4622D]">8LIV Partner Pharmacy Network</p>
        <h1 className="mt-1 text-2xl font-black text-[#1A1F36]">Activate Pharmacy Account</h1>
        <p className="mt-1 text-xs font-semibold text-[#8896A4]">Set your credentials to join the fulfillment network</p>
      </div>

      {error && <p className="mb-4 rounded-xl bg-red-50 p-3 text-xs font-bold text-red-700">{error}</p>}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="text-[10px] font-black uppercase tracking-wider text-[#8896A4]">Primary Pharmacist / Contact Name</label>
          <input
            required
            placeholder="e.g. Ramesh Kumar (Pharmacist)"
            value={contactName}
            onChange={(e) => setContactName(e.target.value)}
            className="mt-1 w-full rounded-xl border border-[#1A1F36]/10 p-3 text-sm font-semibold outline-none focus:border-[#1A1F36]"
          />
        </div>

        <div>
          <label className="text-[10px] font-black uppercase tracking-wider text-[#8896A4]">Contact Phone Number</label>
          <input
            required
            placeholder="10-digit mobile number"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="mt-1 w-full rounded-xl border border-[#1A1F36]/10 p-3 text-sm font-semibold outline-none focus:border-[#1A1F36]"
          />
        </div>

        <div>
          <label className="text-[10px] font-black uppercase tracking-wider text-[#8896A4]">Account Password</label>
          <input
            required
            type="password"
            placeholder="Minimum 8 characters (Uppercase, lowercase, number, symbol)"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mt-1 w-full rounded-xl border border-[#1A1F36]/10 p-3 text-sm font-semibold outline-none focus:border-[#1A1F36]"
          />
        </div>

        <div>
          <label className="text-[10px] font-black uppercase tracking-wider text-[#8896A4]">Confirm Password</label>
          <input
            required
            type="password"
            placeholder="Re-enter your password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="mt-1 w-full rounded-xl border border-[#1A1F36]/10 p-3 text-sm font-semibold outline-none focus:border-[#1A1F36]"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-xl bg-[#1A1F36] py-3.5 text-sm font-black text-white hover:bg-[#2A314E] transition-all disabled:opacity-50 mt-2"
        >
          {loading ? 'Activating Account...' : 'Accept Invitation & Create Account'}
        </button>
      </form>
    </div>
  )
}

export default function PharmacyAcceptInvitationPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#F5F0EB] p-6 text-[#1A1F36]">
      <div className="w-full max-w-lg">
        <Suspense fallback={<div className="text-center p-8 font-bold">Loading invitation...</div>}>
          <AcceptInvitationForm />
        </Suspense>
      </div>
    </main>
  )
}
