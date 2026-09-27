'use client'

import React, { useState, useRef, useEffect } from 'react'
import { ShieldCheck, X, RefreshCw, AlertCircle, CheckCircle2, Loader2, Mail } from 'lucide-react'
import { authedFetch } from '@/lib/apiClient'
import SwipeButton from './SwipeButton'

interface OtpInputModalProps {
  orderId: string
  orderReference: string
  patientName: string
  isOpen: boolean
  onClose: () => void
  onSuccess: (deliveredAt: string) => void
}

export default function OtpInputModal({
  orderId,
  orderReference,
  patientName,
  isOpen,
  onClose,
  onSuccess,
}: OtpInputModalProps) {
  const [digits, setDigits] = useState<string[]>(['', '', '', '', '', ''])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [resending, setResending] = useState(false)
  const [resendCooldown, setResendCooldown] = useState(0)
  const [resendSuccess, setResendSuccess] = useState('')
  const inputsRef = useRef<(HTMLInputElement | null)[]>([])

  useEffect(() => {
    if (isOpen) {
      setDigits(['', '', '', '', '', ''])
      setError('')
      setResendSuccess('')
      setTimeout(() => {
        inputsRef.current[0]?.focus()
      }, 150)
    }
  }, [isOpen])

  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => setResendCooldown((c) => c - 1), 1000)
      return () => clearTimeout(timer)
    }
  }, [resendCooldown])

  if (!isOpen) return null

  const handleDigitChange = (index: number, value: string) => {
    // If pasted multi-character string
    if (value.length > 1) {
      const sanitized = value.replace(/\D/g, '').slice(0, 6)
      if (sanitized.length > 0) {
        const newDigits = [...digits]
        for (let i = 0; i < 6; i++) {
          newDigits[i] = sanitized[i] || ''
        }
        setDigits(newDigits)
        const nextIndex = Math.min(sanitized.length, 5)
        inputsRef.current[nextIndex]?.focus()
      }
      return
    }

    const cleanChar = value.replace(/\D/g, '')
    const newDigits = [...digits]
    newDigits[index] = cleanChar
    setDigits(newDigits)

    if (cleanChar && index < 5) {
      inputsRef.current[index + 1]?.focus()
    }
  }

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !digits[index] && index > 0) {
      inputsRef.current[index - 1]?.focus()
    }
  }

  const otpCode = digits.join('')
  const isComplete = otpCode.length === 6

  const handleSubmit = async () => {
    if (!isComplete) {
      setError('Please enter all 6 digits of the OTP.')
      return
    }

    setLoading(true)
    setError('')
    try {
      const res = await authedFetch(`/api/driver/orders/${orderId}/verify-otp`, {
        method: 'POST',
        body: JSON.stringify({ otp: otpCode }),
      })
      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || 'OTP verification failed.')
      }

      onSuccess(data.data?.deliveredAt || new Date().toISOString())
    } catch (err: any) {
      setError(err.message || 'Incorrect OTP code. Please verify with the patient.')
    } finally {
      setLoading(false)
    }
  }

  const handleResend = async () => {
    if (resendCooldown > 0 || resending) return
    setResending(true)
    setError('')
    setResendSuccess('')
    try {
      const res = await authedFetch(`/api/driver/orders/${orderId}/resend-otp`, {
        method: 'POST',
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to resend OTP.')
      setResendSuccess('New OTP sent to patient email!')
      setResendCooldown(30)
    } catch (err: any) {
      setError(err.message || 'Unable to resend OTP.')
    } finally {
      setResending(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-0 sm:p-4">
      <div className="w-full max-w-md rounded-t-3xl sm:rounded-3xl bg-white p-6 shadow-2xl space-y-5 animate-in fade-in slide-in-from-bottom-6 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#1A1F36]/10 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#C4622D]/10 text-[#C4622D]">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-[#1A1F36]">Verify Delivery OTP</h3>
              <p className="text-xs text-[#8896A4] font-semibold">{orderReference}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-[#1A1F36]/5 text-[#8896A4] hover:bg-[#1A1F36]/10"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Instructions */}
        <div className="rounded-2xl bg-[#F5F0EB]/60 p-4 text-xs">
          <p className="font-bold text-[#1A1F36]">
            Ask patient <span className="text-[#C4622D]">{patientName}</span> for the 6-digit confirmation code.
          </p>
          <p className="mt-1 text-[#8896A4] flex items-center gap-1.5">
            <Mail className="h-3.5 w-3.5 text-[#C4622D]" />
            Delivered via SMTP email & visible on their 8LIV patient dashboard.
          </p>
        </div>

        {/* 6 Digit Inputs */}
        <div>
          <div className="flex justify-between gap-2">
            {digits.map((digit, idx) => (
              <input
                key={idx}
                ref={(el) => {
                  inputsRef.current[idx] = el
                }}
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={1}
                value={digit}
                onChange={(e) => handleDigitChange(idx, e.target.value)}
                onKeyDown={(e) => handleKeyDown(idx, e)}
                className={`h-14 w-12 text-center text-2xl font-black rounded-xl border-2 transition-all outline-none ${
                  digit
                    ? 'border-[#C4622D] bg-[#C4622D]/5 text-[#1A1F36]'
                    : 'border-[#1A1F36]/15 bg-[#FAF7F5] focus:border-[#1A1F36]'
                }`}
              />
            ))}
          </div>

          {error && (
            <div className="mt-3 flex items-center gap-2 rounded-xl bg-red-50 p-2.5 text-xs font-bold text-red-700">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {resendSuccess && (
            <div className="mt-3 flex items-center gap-2 rounded-xl bg-emerald-50 p-2.5 text-xs font-bold text-emerald-700">
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              <span>{resendSuccess}</span>
            </div>
          )}
        </div>

        {/* Resend Action */}
        <div className="flex items-center justify-between text-xs pt-1">
          <span className="text-[#8896A4] font-semibold">Patient didn't receive code?</span>
          <button
            type="button"
            onClick={handleResend}
            disabled={resendCooldown > 0 || resending}
            className="inline-flex items-center gap-1 font-bold text-[#C4622D] disabled:opacity-40 hover:underline"
          >
            <RefreshCw className={`h-3 w-3 ${resending ? 'animate-spin' : ''}`} />
            {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 'Resend Email OTP'}
          </button>
        </div>

        {/* Swipe or Confirm Button */}
        <div className="pt-2">
          <SwipeButton
            label="Swipe to Confirm Delivery"
            successLabel="Verifying OTP..."
            onConfirm={handleSubmit}
            disabled={!isComplete || loading}
            loading={loading}
          />
        </div>
      </div>
    </div>
  )
}
