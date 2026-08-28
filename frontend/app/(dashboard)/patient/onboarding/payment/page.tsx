'use client'

import React, { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import {
  ShieldCheck, Lock, CreditCard, Smartphone, Building2,
  ChevronRight, CheckCircle2, ArrowLeft, AlertCircle, QrCode
} from 'lucide-react'
import { supabase } from '@/lib/supabaseClient'
import { authedFetch } from '@/lib/apiClient'
import { motion, AnimatePresence } from 'framer-motion'

// ── Types ───────────────────────────────────────────────────────────────────
type PaymentMethod = 'upi' | 'card' | 'netbanking'
type PaymentStep = 'review' | 'method' | 'processing' | 'success' | 'failed'
type UpiApp = { name: string; color: string; abbr: string }

const UPI_APPS: UpiApp[] = [
  { name: 'Google Pay', color: '#4285F4', abbr: 'GPay' },
  { name: 'PhonePe',   color: '#5F259F', abbr: 'PhPe' },
  { name: 'Paytm',     color: '#00B9F1', abbr: 'Paytm' },
  { name: 'BHIM',      color: '#0075C2', abbr: 'BHIM' },
]

const BANKS = ['State Bank of India', 'HDFC Bank', 'ICICI Bank', 'Axis Bank', 'Kotak Mahindra Bank', 'Yes Bank']

// ── Helpers ──────────────────────────────────────────────────────────────────
function generateTxnId() {
  return `TXN8LIV${Date.now()}${Math.floor(Math.random() * 999)}`
}

function formatCard(val: string) {
  return val.replace(/\D/g, '').slice(0, 16).replace(/(.{4})/g, '$1 ').trim()
}

export default function OnboardingPaymentPage() {
  const router = useRouter()
  const [assessment, setAssessment] = useState<any>(null)
  const [profile, setProfile] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [step, setStep] = useState<PaymentStep>('review')
  const [method, setMethod] = useState<PaymentMethod>('upi')

  // UPI
  const [upiSubMethod, setUpiSubMethod] = useState<'qr' | 'id'>('qr')
  const [selectedUpiApp, setSelectedUpiApp] = useState<string>('')
  const [upiId, setUpiId] = useState('')
  const [upiError, setUpiError] = useState('')

  // Card
  const [cardNumber, setCardNumber] = useState('')
  const [cardName, setCardName] = useState('')
  const [cardExpiry, setCardExpiry] = useState('')
  const [cardCvv, setCardCvv] = useState('')
  const [cardError, setCardError] = useState('')

  // Net banking
  const [selectedBank, setSelectedBank] = useState('')
  const [bankError, setBankError] = useState('')

  // Processing
  const [progress, setProgress] = useState(0)
  const [processingMsg, setProcessingMsg] = useState('Initiating payment...')
  const [txnId, setTxnId] = useState('')
  const progressRef = useRef<any>(null)

  useEffect(() => {
    const load = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.push('/login'); return }

      // Fetch the latest assessment safely via backend API (bypassing RLS select policies)
      const res = await authedFetch(`/api/patient/status?patientId=${session.user.id}`)
      if (!res.ok) {
        router.replace('/plans')
        return
      }
      const statusData = await res.json()
      const data = statusData.assessment

      // No assessment row or no plan chosen yet → go back to plan selection
      if (!data || !data.membership_tier) {
        router.replace('/plans')
        return
      }
      // Already paid → go straight to dashboard
      if (statusData.dashboardAccess) { router.replace('/patient'); return }

      setAssessment(data)

      setAssessment(data)
      setProfile(statusData.profile)
      setLoading(false)
    }
    load()
  }, [router])

  // ── Pricing ────────────────────────────────────────────────────────────────
  const planPrice = assessment?.membership_tier === 'Gold Plan' ? 1999 : 999
  const consultFee = 499
  const subtotal = planPrice + consultFee
  const gst = Math.round(subtotal * 0.18)
  const total = subtotal + gst

  // ── Real Razorpay Checkout ────────────────────────────────────────────────
  const loadRazorpayScript = () => {
    return new Promise<boolean>((resolve) => {
      if (typeof window !== 'undefined' && (window as any).Razorpay) {
        return resolve(true)
      }
      const existingScript = document.querySelector('script[src="https://checkout.razorpay.com/v1/checkout.js"]') as HTMLScriptElement | null
      if (existingScript) {
        if ((window as any).Razorpay) return resolve(true)
        existingScript.addEventListener('load', () => resolve(true), { once: true })
        existingScript.addEventListener('error', () => resolve(false), { once: true })
      } else {
        const script = document.createElement('script')
        script.src = 'https://checkout.razorpay.com/v1/checkout.js'
        script.async = true
        script.onload = () => resolve(true)
        script.onerror = () => resolve(false)
        document.body.appendChild(script)
      }
      setTimeout(() => {
        resolve(typeof window !== 'undefined' && Boolean((window as any).Razorpay))
      }, 3000)
    })
  }

  const validateAndPay = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        router.push('/login')
        return
      }

      setStep('processing')
      setProgress(25)
      setProcessingMsg('Initializing Razorpay gateway...')

      const amountInRupees = total
      const orderRes = await authedFetch('/api/razorpay/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: amountInRupees,
          currency: 'INR',
          paymentType: 'combined',
        }),
      })

      const orderData = await orderRes.json()
      if (!orderRes.ok || orderData.error) {
        throw new Error(orderData.error || 'Failed to create payment order')
      }

      setProgress(50)
      setProcessingMsg('Opening Razorpay checkout...')

      // 2. Open Razorpay Modal
      await loadRazorpayScript()
      if (typeof window === 'undefined' || !(window as any).Razorpay) {
        throw new Error('Razorpay checkout could not be loaded. Please disable ad-blockers.')
      }

      const patientName = [profile?.first_name, profile?.last_name].filter(Boolean).join(' ') || assessment?.first_name || 'Member'
      const patientEmail = session.user.email || profile?.email || 'care@8liv.in'
      const rawContact = profile?.phone_number || assessment?.phone_number || ''
      const patientContact = rawContact.replace(/\D/g, '').slice(-10)

      await new Promise<void>((resolve, reject) => {
        const options: any = {
          key: orderData.key,
          amount: orderData.amount,
          currency: orderData.currency || 'INR',
          name: '8Liv',
          description: `${assessment?.membership_tier || 'Membership'} Plan Activation`,
          prefill: {
            name: patientName,
            email: patientEmail,
            ...(patientContact.length === 10 ? { contact: patientContact } : {}),
          },
          theme: {
            color: '#C4622D',
          },
        }
        if (orderData.id && String(orderData.id).startsWith('order_') && !orderData.isMock) {
          options.order_id = orderData.id
        }
        options.handler = async function (response: any) {
          try {
            setProgress(80)
            setProcessingMsg('Verifying payment signature...')

            const verifyRes = await authedFetch('/api/payment/verify', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                patientId: session.user.id,
                paymentType: 'combined',
                membershipTier: assessment?.membership_tier,
                amount: total,
                paymentMethod: method,
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
              }),
            })

            const verifyData = await verifyRes.json()
            if (!verifyRes.ok || verifyData.error) {
              throw new Error(verifyData.error || 'Payment verification failed.')
            }

            setTxnId(response.razorpay_payment_id)
            setProgress(100)
            setStep('success')
            resolve()
          } catch (vErr) {
            reject(vErr)
          }
        }
        options.modal = {
          ondismiss: function () {
            setStep('method')
            reject(new Error('Payment cancelled by user.'))
          },
        }

        try {
          const rzp = new (window as any).Razorpay(options)
          rzp.on('payment.failed', function (resp: any) {
            reject(new Error(resp?.error?.description || 'Payment failed.'))
          })
          rzp.open()
        } catch (openErr: any) {
          reject(new Error(openErr?.message || 'Could not open payment interface.'))
        }
      })
    } catch (err: any) {
      console.error('Onboarding payment error:', err)
      setStep('failed')
    }
  }

  if (loading) return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center">
      <div className="w-10 h-10 border-4 border-[#0D9488] border-t-transparent rounded-full animate-spin" />
    </div>
  )

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col lg:flex-row font-sans">
      {/* ── LEFT: Order summary sidebar ───────────────────────────────────── */}
      <div className="lg:w-[38%] bg-[#0B1120] p-8 lg:p-12 flex flex-col justify-between relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-[#0D9488]/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-[#00A884]/15 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 space-y-8">
          <img src="/brand-logo-light.svg" alt="8liv" className="h-9 w-auto object-contain" />

          <div>
            <span className="text-[#5EEAD4] text-xs font-extrabold uppercase tracking-[0.2em] font-sora">
              Step 2 of 2 — Payment
            </span>
            <h2 className="text-2xl font-bold font-sora text-white mt-2 leading-snug">
              Complete your<br />enrollment
            </h2>
          </div>

          {/* Order lines */}
          <div className="space-y-3">
            <p className="text-white/40 text-[10px] font-black uppercase tracking-wider border-b border-white/10 pb-2 font-sora">Order Summary</p>
            {[
              { label: `${assessment?.membership_tier} — Month 1`, amount: planPrice },
              { label: 'Initial Consultation Fee', amount: consultFee },
              { label: 'GST (18%)', amount: gst },
            ].map(line => (
              <div key={line.label} className="flex justify-between items-center">
                <span className="text-white/70 text-xs font-medium">{line.label}</span>
                <span className="text-white text-xs font-bold font-sora">₹{line.amount.toLocaleString('en-IN')}</span>
              </div>
            ))}
            <div className="flex justify-between items-center border-t border-white/10 pt-3">
              <span className="text-white font-bold text-sm font-sora">Total</span>
              <span className="text-[#5EEAD4] font-extrabold text-xl font-sora">₹{total.toLocaleString('en-IN')}</span>
            </div>
          </div>

          {/* Inclusions */}
          <div className="space-y-2">
            <p className="text-white/40 text-[10px] font-black uppercase tracking-wider font-sora">Included Today</p>
            {[
              'Doctor consultation booking access',
              'Personalised metabolic dashboard',
              assessment?.membership_tier === 'Gold Plan' ? 'Dietitian + fitness coaching' : null,
              'GLP-1 prescription pathway',
              'Encrypted health records',
            ].filter(Boolean).map((item: any) => (
              <div key={item} className="flex items-start gap-2.5">
                <CheckCircle2 size={14} className="text-[#5EEAD4] shrink-0 mt-0.5" />
                <span className="text-white/75 text-xs font-medium">{item}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Trust badges */}
        <div className="relative z-10 flex items-center gap-4 flex-wrap mt-6">
          {[
            { icon: Lock, label: 'SSL Secured' },
            { icon: ShieldCheck, label: 'HIPAA' },
            { icon: CreditCard, label: 'Razorpay' },
          ].map(({ icon: Icon, label }) => (
            <div key={label} className="flex items-center gap-1.5 text-[10px] font-semibold text-white/50 font-sora">
              <Icon size={11} className="text-[#5EEAD4]" /> {label}
            </div>
          ))}
        </div>
      </div>

      {/* ── RIGHT: Payment form / steps ───────────────────────────────────── */}
      <div className="flex-1 flex items-center justify-center p-6 lg:p-12 bg-slate-50">
        <div className="w-full max-w-md">

          <AnimatePresence mode="wait">

            {/* ── STEP: Review → Proceed to Razorpay ─────────────────────── */}
            {step === 'review' && (
              <motion.div key="review" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }}>
                <h3 className="text-xl sm:text-2xl font-extrabold font-sora text-[#0F172A] mb-2">Ready to complete enrollment?</h3>
                <p className="text-sm text-[#475569] mb-6">Review your order details and activate your care plan via Razorpay.</p>

                <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xl mb-6 space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-[#475569]">Plan</span>
                    <span className="font-bold text-[#0F172A] font-sora">{assessment?.membership_tier}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-[#475569]">Doctor Consultation</span>
                    <span className="font-bold text-[#0F172A] font-sora">₹{consultFee.toLocaleString('en-IN')}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-[#475569]">GST (18%)</span>
                    <span className="font-bold text-[#0F172A] font-sora">₹{gst.toLocaleString('en-IN')}</span>
                  </div>
                  <div className="flex justify-between text-sm border-t border-slate-200 pt-3">
                    <span className="text-[#0F172A] font-bold font-sora">Total (incl. GST)</span>
                    <span className="font-extrabold text-xl text-[#0D9488] font-sora">₹{total.toLocaleString('en-IN')}</span>
                  </div>
                </div>

                <div className="rounded-2xl bg-[#0D9488]/10 p-4 border border-[#0D9488]/20 flex items-start gap-3 mb-6">
                  <ShieldCheck className="w-5 h-5 text-[#0D9488] shrink-0 mt-0.5" />
                  <div className="text-xs text-[#0F766E]">
                    <p className="font-bold font-sora">Official Razorpay Gateway</p>
                    <p className="mt-0.5 text-[#475569]">UPI (Google Pay, PhonePe, Paytm, BHIM), NetBanking, and all major Credit/Debit Cards supported.</p>
                  </div>
                </div>

                <button
                  onClick={validateAndPay}
                  className="w-full bg-[#0D9488] hover:bg-[#097A70] text-white font-sora font-bold rounded-2xl py-4 text-sm flex items-center justify-center gap-2 transition-all shadow-lg shadow-[#0D9488]/20 hover:scale-[1.01] active:scale-[0.99] cursor-pointer"
                >
                  <Lock size={15} /> Pay ₹{total.toLocaleString('en-IN')} with Razorpay
                </button>
                <button
                  onClick={() => router.replace('/plans')}
                  className="w-full mt-3 text-xs text-[#475569] hover:text-[#0F172A] flex items-center justify-center gap-1.5 py-2 transition-colors font-semibold font-sora cursor-pointer"
                >
                  <ArrowLeft size={13} /> Change plan
                </button>
              </motion.div>
            )}

            {/* ── STEP: Processing ────────────────────────────────────────── */}
            {step === 'processing' && (
              <motion.div key="processing" initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} className="text-center space-y-8 py-6">
                <div className="relative mx-auto w-20 h-20">
                  <svg className="w-20 h-20 -rotate-90" viewBox="0 0 80 80">
                    <circle cx="40" cy="40" r="34" stroke="#1A1F36" strokeWidth="6" fill="none" opacity="0.08" />
                    <circle
                      cx="40" cy="40" r="34"
                      stroke="#C4622D" strokeWidth="6" fill="none"
                      strokeDasharray={`${2 * Math.PI * 34}`}
                      strokeDashoffset={`${2 * Math.PI * 34 * (1 - progress / 100)}`}
                      strokeLinecap="round"
                      style={{ transition: 'stroke-dashoffset 0.6s ease' }}
                    />
                  </svg>
                  <span className="absolute inset-0 flex items-center justify-center text-sm font-extrabold text-[#C4622D] font-sora">{progress}%</span>
                </div>

                <div>
                  <h3 className="text-lg font-bold font-sora text-[#1A1F36]">Processing Payment</h3>
                  <p className="text-sm text-[#8896A4] mt-1.5 font-medium">{processingMsg}</p>
                </div>

                <div className="bg-white rounded-2xl p-4 border border-[#1A1F36]/6 text-left space-y-2">
                  <div className="flex justify-between text-xs">
                    <span className="text-[#8896A4]">Amount</span>
                    <span className="font-bold text-[#1A1F36]">₹{total.toLocaleString('en-IN')}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-[#8896A4]">Method</span>
                    <span className="font-bold text-[#1A1F36] capitalize">{method === 'upi' ? (upiSubMethod === 'qr' ? 'UPI (QR Code)' : selectedUpiApp || 'UPI') : method === 'card' ? 'Card' : selectedBank || 'Net Banking'}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-[#8896A4]">Txn ID</span>
                    <span className="font-mono text-[#8896A4] text-[10px]">{txnId}</span>
                  </div>
                </div>

                <p className="text-xs text-[#8896A4]">Please do not close or refresh this page.</p>
              </motion.div>
            )}

            {/* ── STEP: Success ───────────────────────────────────────────── */}
            {step === 'success' && (
              <motion.div key="success" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="text-center space-y-6 py-4">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', stiffness: 200, delay: 0.1 }}
                  className="w-20 h-20 bg-[#5C7A6B]/10 rounded-full flex items-center justify-center mx-auto"
                >
                  <CheckCircle2 size={40} className="text-[#5C7A6B]" strokeWidth={1.5} />
                </motion.div>

                <div>
                  <h3 className="text-2xl font-bold font-sora text-[#1A1F36]">Payment Successful!</h3>
                  <p className="text-sm text-[#8896A4] mt-2">
                    Welcome to 8Liv, {profile?.display_id || assessment?.first_name || profile?.first_name || 'Member'}! Your {assessment?.membership_tier} is now active.
                  </p>
                </div>

                <div className="bg-white rounded-2xl p-5 border border-[#1A1F36]/8 text-left space-y-2.5">
                  <p className="text-[10px] font-black uppercase tracking-wider text-[#8896A4]">Transaction Details</p>
                  {[
                    { label: 'Transaction ID', value: txnId, mono: true },
                    { label: 'Amount Paid', value: `₹${total.toLocaleString('en-IN')}` },
                    { label: 'Plan Activated', value: assessment?.membership_tier },
                    { label: 'Payment Method', value: method === 'upi' ? (upiSubMethod === 'qr' ? 'UPI (QR Code)' : selectedUpiApp || 'UPI') : method === 'card' ? `Card •••• ${cardNumber.replace(/\s/g,'').slice(-4)}` : selectedBank },
                    { label: 'Date', value: new Date().toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }) },
                  ].map(row => (
                    <div key={row.label} className="flex justify-between items-center text-xs">
                      <span className="text-[#8896A4]">{row.label}</span>
                      <span className={`font-bold text-[#1A1F36] ${row.mono ? 'font-mono text-[10px]' : ''}`}>{row.value}</span>
                    </div>
                  ))}
                </div>

                <button
                  onClick={() => {
                    document.cookie = 'user_role=patient; path=/; max-age=86400; SameSite=Lax'
                    window.location.href = '/patient'
                  }}
                  className="w-full bg-[#1A1F36] hover:bg-[#C4622D] text-white font-bold rounded-full py-4 text-sm flex items-center justify-center gap-2 transition-all shadow-lg"
                >
                  Enter Your Dashboard →
                </button>
              </motion.div>
            )}

            {/* ── STEP: Failed ─────────────────────────────────────────────── */}
            {step === 'failed' && (
              <motion.div key="failed" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center space-y-6 py-4">
                <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mx-auto">
                  <AlertCircle size={40} className="text-red-400" />
                </div>
                <div>
                  <h3 className="text-xl font-bold font-sora text-[#1A1F36]">Payment Failed</h3>
                  <p className="text-sm text-[#8896A4] mt-2">Something went wrong. Please try again or use a different method.</p>
                </div>
                <button
                  onClick={() => { setStep('method'); setProgress(0) }}
                  className="w-full bg-[#C4622D] text-white font-bold rounded-full py-4 text-sm"
                >
                  Try Again
                </button>
              </motion.div>
            )}

          </AnimatePresence>
        </div>
      </div>
    </div>
  )
}
