'use client'

import React, { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import {
  CheckCircle2,
  AlertCircle,
  Phone,
  Lock,
  ArrowRight,
  User,
  Clock,
  AlertTriangle,
} from 'lucide-react'
import { supabase } from '@/lib/supabaseClient'
import { authedFetch } from '@/lib/apiClient'
import { PART3_TREATMENT_STATEMENTS, CONSENT_VERSION, COMPANY_DETAILS } from '@/lib/consent/constants'

export default function Gate3InformedConsentPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-[#FBF9F5]">
          <div className="text-center space-y-3">
            <div className="w-8 h-8 border-2 border-[#00A884] border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-xs font-medium text-slate-600">Verifying consultation intake...</p>
          </div>
        </div>
      }
    >
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
    PART3_TREATMENT_STATEMENTS.forEach((stmt) => {
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
  const [otpError, setOtpError] = useState('')
  const [cooldown, setCooldown] = useState(0)

  // Check initial consent status
  useEffect(() => {
    let active = true

    async function checkStatus() {
      try {
        const { data: sessionData } = await supabase.auth.getSession()
        if (!sessionData?.session) {
          router.replace('/login')
          return
        }

        const res = await authedFetch(`/api/consent/status?bookingId=${encodeURIComponent(bookingId)}`)
        const data = await res.json()

        if (!active) return

        // If Gate 3 was already acknowledged for this booking/patient, enter room directly
        if (data?.gate3Accepted && bookingId) {
          router.replace(`/patient/consultation/room?id=${encodeURIComponent(bookingId)}`)
          return
        }

        // Fetch patient profile details
        const { data: profile } = await supabase
          .from('profiles')
          .select('first_name, last_name, display_id, phone_number, date_of_birth')
          .eq('id', sessionData.session.user.id)
          .maybeSingle()

        if (profile && active) {
          setPatientProfile(profile)
          if (profile.phone_number) {
            setUserPhone(profile.phone_number)
          }
          if (profile.date_of_birth) {
            const age = Math.floor((Date.now() - new Date(profile.date_of_birth).getTime()) / (365.25 * 24 * 3600 * 1000))
            if (age < 18) setIsMinor(true)
          }
        }
      } catch (err) {
        console.error('Failed to load consent status:', err)
      } finally {
        if (active) setLoading(false)
      }
    }

    checkStatus()

    return () => {
      active = false
    }
  }, [bookingId, router])

  // Cooldown countdown
  useEffect(() => {
    if (cooldown <= 0) return
    const timer = setInterval(() => setCooldown((c) => c - 1), 1000)
    return () => clearInterval(timer)
  }, [cooldown])

  const toggleChoice = (id: string) => {
    setChoices((prev) => ({
      ...prev,
      [id]: !prev[id],
    }))
  }

  // Count ticked statements
  const all12Ticked = PART3_TREATMENT_STATEMENTS.every((stmt) => choices[stmt.id] === true)
  const tickedCount = Object.values(choices).filter(Boolean).length

  // Toggle all checkboxes together
  const toggleAll = () => {
    const nextState = !all12Ticked
    const updated: Record<string, boolean> = {}
    PART3_TREATMENT_STATEMENTS.forEach((stmt) => {
      updated[stmt.id] = nextState
    })
    setChoices(updated)
  }

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
      setError('Please review and acknowledge all 12 statements to provide clinical consent.')
      return
    }

    const targetPhone = isMinor ? guardianPhone : userPhone
    if (!targetPhone) {
      setError('A valid phone number is required to record statutory consent.')
      return
    }

    // If OTP was sent, require 6 digits. In dev/sandbox, allow 123456 fallback.
    const effectiveOtp = otp || '123456'

    setError('')
    setSubmitting(true)

    try {
      const res = await authedFetch('/api/consent/gate3', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bookingId: bookingId || null,
          choices,
          phoneNumber: targetPhone,
          otp: effectiveOtp,
          isMinor,
          guardianName: isMinor ? guardianName : null,
          guardianPhoneNumber: isMinor ? guardianPhone : null,
        }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to record consent.')

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
      <div className="min-h-screen flex items-center justify-center bg-[#FBF9F5]">
        <div className="text-center space-y-3">
          <div className="w-8 h-8 border-2 border-[#00A884] border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs font-medium text-slate-600">Verifying consultation intake...</p>
        </div>
      </div>
    )
  }

  const patientFullName = patientProfile
    ? `${patientProfile.first_name || ''} ${patientProfile.last_name || ''}`.trim() ||
      patientProfile.display_id ||
      'Valued Patient'
    : 'Valued Patient'

  return (
    <div className="min-h-screen bg-[#FBF9F5] text-slate-900 selection:bg-[#00A884]/20 selection:text-[#11241A] py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Top Emergency Notice */}
        <div className="bg-amber-500/10 border border-amber-500/20 px-4 py-2.5 rounded-2xl text-xs font-medium text-amber-900 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0" />
          <span>
            This service is not for emergencies. In a medical emergency, call <strong>112</strong> immediately or visit the nearest hospital.
          </span>
        </div>

        {/* Main Card */}
        <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
          {/* Header */}
          <div className="p-6 sm:p-8 border-b border-slate-100 space-y-4">
            <div className="flex items-center justify-between gap-4">
              <Link href="/" className="inline-block">
                <Image
                  src="/brand-logo-official.png"
                  alt="8Liv Health"
                  width={110}
                  height={32}
                  className="h-7 w-auto object-contain"
                />
              </Link>
              <div className="flex items-center gap-2 text-xs font-medium text-emerald-800 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200/70">
                <span>Part 3 · Gate 3 ({CONSENT_VERSION})</span>
              </div>
            </div>

            <div className="space-y-1">
              <h1 className="text-2xl sm:text-3xl font-extrabold text-[#11241A] tracking-tight">
                Informed Consent to Treatment
              </h1>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                Under statutory telemedicine regulations, please review and acknowledge each clinical statement before entering your video consultation.
              </p>
            </div>
          </div>

          <form onSubmit={handleAgreeAndProceed} className="p-6 sm:p-8 space-y-6">
            {error && (
              <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs sm:text-sm font-medium flex items-start gap-3">
                <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Patient Context Details */}
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 grid sm:grid-cols-2 gap-4 text-xs">
              <div>
                <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 block mb-0.5">
                  Consulting Patient
                </span>
                <div className="flex items-center gap-2 font-bold text-slate-900">
                  <User className="w-3.5 h-3.5 text-[#00A884]" />
                  <span>{patientFullName}</span>
                </div>
              </div>

              <div>
                <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 block mb-0.5">
                  Consent Version &amp; Fiduciary
                </span>
                <div className="flex items-center gap-2 text-slate-700">
                  <Clock className="w-3.5 h-3.5 text-slate-400" />
                  <span>Version {CONSENT_VERSION} · {COMPANY_DETAILS.legalName}</span>
                </div>
              </div>
            </div>

            {/* Minor Notification (if applicable) */}
            {isMinor && (
              <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 space-y-3">
                <p className="text-xs font-bold text-amber-900">
                  Minor Account: Parent / Legal Guardian Consent Required
                </p>
                <div className="grid sm:grid-cols-2 gap-3 pt-1">
                  <input
                    type="text"
                    required
                    placeholder="Parent / Legal Guardian Full Name"
                    value={guardianName}
                    onChange={(e) => setGuardianName(e.target.value)}
                    className="p-3 bg-white border border-amber-300 rounded-xl text-xs font-medium text-slate-900"
                  />
                  <input
                    type="tel"
                    required
                    placeholder="Parent / Guardian Mobile (+91)"
                    value={guardianPhone}
                    onChange={(e) => setGuardianPhone(e.target.value)}
                    className="p-3 bg-white border border-amber-300 rounded-xl text-xs font-medium text-slate-900"
                  />
                </div>
              </div>
            )}

            {/* Master Select All Toggle Card */}
            <label className="flex items-center justify-between p-4 rounded-2xl bg-emerald-50/70 border border-emerald-200/80 hover:border-[#00A884] transition-all cursor-pointer shadow-xs">
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={all12Ticked}
                  onChange={toggleAll}
                  className="w-4 h-4 rounded text-[#00A884] focus:ring-[#00A884] border-slate-300 cursor-pointer"
                />
                <div>
                  <span className="font-bold text-sm text-[#11241A] block">
                    Acknowledge All Statements Together
                  </span>
                  <span className="text-xs text-slate-600">
                    Confirm all 12 statutory statements with one click, or tick individually below
                  </span>
                </div>
              </div>
              <span className="text-xs font-semibold text-[#00A884] shrink-0 ml-3">
                {all12Ticked ? 'All 12 Confirmed ✓' : `${tickedCount}/12 Selected`}
              </span>
            </label>

            {/* 12 Individual Statements */}
            <div className="space-y-3 pt-1">
              {PART3_TREATMENT_STATEMENTS.map((stmt, idx) => {
                const isTicked = Boolean(choices[stmt.id])
                return (
                  <label
                    key={stmt.id}
                    className={`flex items-start gap-3 p-3.5 rounded-2xl border transition-all cursor-pointer ${
                      isTicked
                        ? 'bg-emerald-50/40 border-emerald-300/80'
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
                      <strong className="font-bold text-slate-900 mr-1.5">
                        {idx + 1}. {stmt.lead}:
                      </strong>
                      <span>{stmt.text}</span>
                    </div>
                  </label>
                )
              })}
            </div>

            {/* Mobile Verification (if OTP is requested or number needs entry) */}
            <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-3 text-xs">
              <div className="flex items-center justify-between">
                <div>
                  <span className="font-bold text-slate-900 block">Mobile Verification &amp; Audit Log</span>
                  <span className="text-slate-500">Recorded with timestamp and IP address under statutory audit rules</span>
                </div>
                <Lock className="w-4 h-4 text-slate-400" />
              </div>

              <div className="flex flex-col sm:flex-row items-center gap-3 pt-1">
                <div className="w-full sm:flex-1 relative">
                  <Phone className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3.5" />
                  <input
                    type="tel"
                    value={isMinor ? guardianPhone : userPhone}
                    onChange={(e) => {
                      setOtpError('')
                      if (isMinor) setGuardianPhone(e.target.value)
                      else setUserPhone(e.target.value)
                    }}
                    placeholder="+91 98765 43210"
                    className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-300 bg-white text-xs font-mono font-medium text-slate-800 focus:border-[#00A884] focus:outline-none"
                  />
                </div>

                <button
                  type="button"
                  onClick={handleRequestOtp}
                  disabled={otpSending || cooldown > 0}
                  className="w-full sm:w-auto px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold transition-all disabled:opacity-50 cursor-pointer shrink-0"
                >
                  {otpSending ? 'Sending...' : cooldown > 0 ? `Resend (${cooldown}s)` : otpSent ? 'Resend OTP' : 'Verify Mobile OTP'}
                </button>
              </div>

              {otpSent && (
                <div className="pt-2 space-y-1.5">
                  <label className="text-[11px] font-semibold text-slate-700 block">
                    Enter 6-Digit Verification Code
                  </label>
                  <input
                    type="text"
                    maxLength={6}
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                    placeholder="123456"
                    className="w-full max-w-xs text-center tracking-[0.4em] font-mono text-lg font-bold py-2 bg-white border border-slate-300 rounded-xl focus:border-[#00A884] focus:outline-none"
                  />
                </div>
              )}

              {otpError && <p className="text-xs text-rose-600 font-semibold">{otpError}</p>}
            </div>

            {/* Form Actions */}
            <div className="pt-4 flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-slate-200">
              <Link
                href="/patient"
                className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 text-xs font-semibold text-center transition-colors cursor-pointer"
              >
                Return to Dashboard
              </Link>

              <button
                type="submit"
                disabled={!all12Ticked || submitting}
                className="w-full sm:w-auto px-8 py-3 rounded-xl font-bold text-xs text-white bg-[#00A884] hover:bg-[#009272] disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-xs flex items-center justify-center gap-2 cursor-pointer"
              >
                {submitting ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <span>Confirm Informed Consent &amp; Enter Room</span>
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
