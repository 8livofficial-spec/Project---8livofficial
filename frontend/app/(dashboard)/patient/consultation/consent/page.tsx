'use client'

import React, { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import {
  ShieldAlert,
  CheckCircle2,
  AlertCircle,
  Phone,
  RefreshCw,
  Lock,
  ArrowRight,
  User,
  Clock,
  ShieldCheck,
  X,
} from 'lucide-react'
import { supabase } from '@/lib/supabaseClient'
import { authedFetch } from '@/lib/apiClient'
import { PART3_TREATMENT_STATEMENTS, CONSENT_VERSION } from '@/lib/consent/constants'

export default function Gate3InformedConsentPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center space-y-3">
          <div className="w-8 h-8 border-3 border-teal-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm font-semibold text-slate-600">Loading statutory clinical consent...</p>
        </div>
      </div>
    }>
      <Gate3Content />
    </Suspense>
  )
}

function Gate3Content() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const bookingId = searchParams.get('bookingId') || searchParams.get('id') || ''

  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [patientProfile, setPatientProfile] = useState<any>(null)
  const [isMinor, setIsMinor] = useState(false)

  // 12 Checkbox States (all unticked by default)
  const [choices, setChoices] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {}
    PART3_TREATMENT_STATEMENTS.forEach(stmt => {
      initial[stmt.id] = false
    })
    return initial
  })

  // Guardian details for minor
  const [guardianName, setGuardianName] = useState('')
  const [guardianPhone, setGuardianPhone] = useState('')

  // Mobile OTP States
  const [userPhone, setUserPhone] = useState('')
  const [otp, setOtp] = useState('')
  const [otpSent, setOtpSent] = useState(false)
  const [otpSending, setOtpSending] = useState(false)
  const [otpVerified, setOtpVerified] = useState(false)
  const [otpError, setOtpError] = useState('')
  const [cooldown, setCooldown] = useState(0)

  // 1. Load user profile and verify existing consent
  useEffect(() => {
    let active = true

    async function loadData() {
      setLoading(true)
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (!session) {
          router.replace('/login')
          return
        }

        const [profileRes, statusRes] = await Promise.all([
          supabase.from('profiles').select('*').eq('id', session.user.id).single(),
          authedFetch(`/api/consent/status?bookingId=${encodeURIComponent(bookingId)}`),
        ])

        if (profileRes.data && active) {
          setPatientProfile(profileRes.data)
          const phone = profileRes.data.phone_number || session.user.phone || ''
          setUserPhone(phone)

          // Minor check (under 18)
          if (profileRes.data.date_of_birth) {
            const birthDate = new Date(profileRes.data.date_of_birth)
            const ageDiff = Date.now() - birthDate.getTime()
            const ageDate = new Date(ageDiff)
            const calcAge = Math.abs(ageDate.getUTCFullYear() - 1970)
            if (calcAge < 18) setIsMinor(true)
          }
        }

        const statusJson = await statusRes.json()
        // If already consented for this booking, bypass directly to video room
        if (statusJson.gate3Accepted && bookingId && active) {
          router.replace(`/patient/consultation/room?id=${encodeURIComponent(bookingId)}`)
          return
        }
      } catch (err: any) {
        if (active) setError(err.message || 'Unable to prepare consent document.')
      } finally {
        if (active) setLoading(false)
      }
    }

    void loadData()
    return () => {
      active = false
    }
  }, [bookingId, router])

  // Cooldown countdown
  useEffect(() => {
    if (cooldown <= 0) return
    const timer = setInterval(() => setCooldown(c => c - 1), 1000)
    return () => clearInterval(timer)
  }, [cooldown])

  const toggleChoice = (id: string) => {
    setChoices(prev => ({
      ...prev,
      [id]: !prev[id],
    }))
  }

  // Count ticked statements
  const all12Ticked = PART3_TREATMENT_STATEMENTS.every(stmt => choices[stmt.id] === true)
  const tickedCount = Object.values(choices).filter(Boolean).length

  // OTP Request handler
  const handleRequestOtp = async () => {
    const targetNumber = isMinor ? guardianPhone : userPhone
    if (!targetNumber || targetNumber.trim().length < 8) {
      setOtpError('Please provide a valid mobile number with country code.')
      return
    }

    setOtpSending(true)
    setOtpError('')

    try {
      const res = await fetch('/api/auth/whatsapp/otp/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phoneNumber: targetNumber,
          purpose: 'LOGIN',
        }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to dispatch verification code.')

      setOtpSent(true)
      setCooldown(60)
    } catch (err: any) {
      setOtpError(err.message || 'Unable to send OTP. Please try again.')
    } finally {
      setOtpSending(false)
    }
  }

  // Final Form Submission
  const handleAgreeAndProceed = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!all12Ticked) {
      setError('You must review and tick all 12 statements to provide informed clinical consent.')
      return
    }
    if (!otp || otp.length !== 6) {
      setError('Please enter the 6-digit verification code sent to your mobile.')
      return
    }

    setError('')
    setSubmitting(true)

    try {
      const targetPhone = isMinor ? guardianPhone : userPhone
      const res = await authedFetch('/api/consent/gate3', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bookingId: bookingId || null,
          choices,
          phoneNumber: targetPhone,
          otp,
          isMinor,
          guardianName: isMinor ? guardianName : null,
          guardianPhoneNumber: isMinor ? guardianPhone : null,
        }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to record consent.')

      // Proceed into the consultation room
      if (bookingId) {
        router.replace(`/patient/consultation/room?id=${encodeURIComponent(bookingId)}`)
      } else {
        router.replace('/patient/consultation')
      }
    } catch (err: any) {
      setError(err.message || 'Unable to confirm clinical consent.')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center space-y-3">
          <div className="w-8 h-8 border-3 border-teal-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm font-semibold text-slate-600">Verifying consultation consent...</p>
        </div>
      </div>
    )
  }

  const patientFullName = patientProfile
    ? `${patientProfile.first_name || ''} ${patientProfile.last_name || ''}`.trim() || patientProfile.display_id || 'Valued Patient'
    : 'Valued Patient'

  return (
    <div className="min-h-screen bg-slate-50/60 py-8 px-4 sm:px-6 lg:px-8 font-sans">
      <div className="max-w-3xl mx-auto">
        {/* Emergency Notice Banner (Statutory Requirement) */}
        <div className="mb-6 p-4 rounded-2xl bg-rose-50 border-2 border-rose-200 text-rose-900 flex items-center gap-3 shadow-xs">
          <ShieldAlert className="w-6 h-6 text-rose-600 shrink-0" />
          <div className="text-xs sm:text-sm font-bold font-sora">
            <span>This service is not for emergencies. In a medical emergency, immediately call </span>
            <span className="underline font-black text-rose-700">112</span>
            <span> or proceed to the nearest emergency room.</span>
          </div>
        </div>

        {/* Main Consent Card */}
        <div className="bg-white rounded-3xl border border-slate-200 shadow-xl overflow-hidden">
          {/* Header */}
          <div className="p-6 sm:p-8 bg-gradient-to-br from-[#061810] to-[#0A2619] text-white">
            <div className="flex items-center justify-between gap-4">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-500/20 text-teal-300 border border-teal-500/30 text-[11px] font-bold font-sora">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>8liv Legal Pack · Gate 3 ({CONSENT_VERSION})</span>
              </div>
              <span className="text-xs text-slate-300 font-mono">
                {tickedCount}/12 Acknowledged
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-extrabold font-sora tracking-tight mt-4">
              Informed Consent to Treatment
            </h1>
            <p className="text-slate-300 text-xs sm:text-sm mt-2 font-light leading-relaxed">
              Before entering your clinical video consultation, statutory telehealth regulations require you to review and actively acknowledge each clinical statement below.
            </p>
          </div>

          <form onSubmit={handleAgreeAndProceed} className="p-6 sm:p-8 space-y-8">
            {error && (
              <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs sm:text-sm font-semibold flex items-start gap-3">
                <AlertCircle className="w-5 h-5 mt-0.5 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Read-Only Pre-Filled Patient Name */}
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 grid sm:grid-cols-2 gap-4">
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-1">
                  Consulting Patient Name
                </label>
                <div className="flex items-center gap-2 font-bold font-sora text-slate-900 text-sm">
                  <User className="w-4 h-4 text-[#00A884]" />
                  <span>{patientFullName}</span>
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-1">
                  Consent Version &amp; Timestamp
                </label>
                <div className="flex items-center gap-2 font-semibold text-slate-700 text-xs font-mono">
                  <Clock className="w-3.5 h-3.5 text-slate-400" />
                  <span>{CONSENT_VERSION} · Active Telehealth Intake</span>
                </div>
              </div>
            </div>

            {/* Minor Confirmation Line (if patient is under 18) */}
            {isMinor && (
              <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 space-y-3">
                <p className="text-xs font-bold text-amber-900 uppercase tracking-wider">
                  Minor Account: Parent / Guardian Authorization Required
                </p>
                <p className="text-xs text-amber-800 leading-relaxed">
                  As the patient is under 18 years of age, a parent or legal guardian must provide clinical consent and verify their identity with a mobile OTP.
                </p>
                <div className="grid sm:grid-cols-2 gap-3 pt-1">
                  <input
                    type="text"
                    required
                    placeholder="Parent / Legal Guardian Full Name"
                    value={guardianName}
                    onChange={(e) => setGuardianName(e.target.value)}
                    className="p-3 bg-white border border-amber-300 rounded-xl text-xs font-bold text-slate-900"
                  />
                  <input
                    type="tel"
                    required
                    placeholder="Parent / Guardian Mobile Number"
                    value={guardianPhone}
                    onChange={(e) => setGuardianPhone(e.target.value)}
                    className="p-3 bg-white border border-amber-300 rounded-xl text-xs font-bold text-slate-900"
                  />
                </div>
              </div>
            )}

            {/* 12 Separate Checkboxes (All unticked by default) */}
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-700 font-sora">
                  12 Statutory Telehealth Acknowledgements
                </h3>
                <span className="text-[11px] text-slate-400">All boxes required</span>
              </div>

              {PART3_TREATMENT_STATEMENTS.map((stmt, idx) => {
                const isTicked = Boolean(choices[stmt.id])
                return (
                  <label
                    key={stmt.id}
                    className={`flex items-start gap-3 p-3.5 rounded-2xl border transition-all cursor-pointer ${
                      isTicked
                        ? 'bg-emerald-50/50 border-emerald-300/80 shadow-2xs'
                        : 'bg-white hover:bg-slate-50 border-slate-200'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={isTicked}
                      onChange={() => toggleChoice(stmt.id)}
                      className="mt-0.5 w-4 h-4 rounded text-[#00A884] focus:ring-[#00A884] border-slate-300 cursor-pointer shrink-0"
                    />
                    <div className="text-xs leading-relaxed text-slate-700">
                      <strong className="font-bold text-slate-900 font-sora mr-1">
                        {idx + 1}. {stmt.lead}:
                      </strong>
                      <span>{stmt.text}</span>
                    </div>
                  </label>
                )
              })}
            </div>

            {/* Mobile OTP Verification Section */}
            <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold font-sora uppercase tracking-wider text-slate-800">
                    Mobile OTP Identity Verification
                  </h4>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    We verify your identity by OTP before accepting statutory clinical consent
                  </p>
                </div>
                <div className="w-8 h-8 rounded-lg bg-teal-50 text-[#00A884] flex items-center justify-center shrink-0">
                  <Lock className="w-4 h-4" />
                </div>
              </div>

              <div className="flex flex-col sm:flex-row items-center gap-3">
                <div className="w-full sm:flex-1 relative">
                  <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-3.5" />
                  <input
                    type="tel"
                    readOnly={!isMinor}
                    value={isMinor ? guardianPhone : userPhone}
                    onChange={(e) => isMinor ? setGuardianPhone(e.target.value) : setUserPhone(e.target.value)}
                    placeholder="+91 98765 43210"
                    className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-300 bg-white text-xs font-mono font-bold text-slate-800"
                  />
                </div>

                <button
                  type="button"
                  onClick={handleRequestOtp}
                  disabled={otpSending || cooldown > 0}
                  className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold font-sora transition-all disabled:opacity-50 cursor-pointer shrink-0"
                >
                  {otpSending ? 'Sending...' : cooldown > 0 ? `Resend (${cooldown}s)` : otpSent ? 'Resend OTP' : 'Send Code'}
                </button>
              </div>

              {otpSent && (
                <div className="pt-2 space-y-2">
                  <label className="text-[11px] font-bold text-slate-700 block">
                    Enter 6-Digit WhatsApp / SMS Code
                  </label>
                  <input
                    type="text"
                    maxLength={6}
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                    placeholder="• • • • • •"
                    className="w-full max-w-xs text-center tracking-[0.5em] font-mono text-xl font-bold py-2.5 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#00A884] focus:outline-none"
                  />
                </div>
              )}

              {otpError && (
                <p className="text-xs text-rose-600 font-semibold">{otpError}</p>
              )}
            </div>

            {/* Actions: I Agree (disabled until all 12 ticked & OTP filled) and Cancel */}
            <div className="pt-4 flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-slate-100">
              <Link
                href="/patient"
                className="w-full sm:w-auto px-5 py-3 rounded-2xl bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 text-xs font-bold font-sora text-center transition-colors cursor-pointer"
              >
                Cancel &amp; Return to Dashboard
              </Link>

              <button
                type="submit"
                disabled={!all12Ticked || otp.length !== 6 || submitting}
                className="w-full sm:w-auto px-8 py-3.5 rounded-2xl font-bold font-sora text-sm text-white bg-gradient-to-r from-[#00A884] to-[#0A8F70] hover:from-[#009272] hover:to-[#087E63] disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-md shadow-[#00A884]/25 flex items-center justify-center gap-2 cursor-pointer"
              >
                {submitting ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <span>I Agree &amp; Join Consultation</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
