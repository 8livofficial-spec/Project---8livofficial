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

  // ── Payment process simulation ─────────────────────────────────────────────
  const simulatePayment = async () => {
    setStep('processing')
    setProgress(0)
    setProcessingMsg('Initiating payment...')

    const newTxn = generateTxnId()
    setTxnId(newTxn)

    const phases = [
      { pct: 30, msg: 'Connecting to payment gateway...' },
      { pct: 55, msg: 'Contacting your bank...' },
      { pct: 75, msg: 'Awaiting authorisation...' },
      { pct: 90, msg: 'Verifying transaction...' },
      { pct: 100, msg: 'Confirming payment...' },
    ]

    let idx = 0
    progressRef.current = setInterval(() => {
      if (idx < phases.length) {
        setProgress(phases[idx].pct)
        setProcessingMsg(phases[idx].msg)
        idx++
      } else {
        clearInterval(progressRef.current)
        finalisePayment(newTxn)
      }
    }, 700)
  }

  const finalisePayment = async (txn: string) => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) throw new Error('No session')

      const metadata: Record<string, string> = {}
      if (method === 'upi') {
        metadata.upi_sub_method = upiSubMethod
        if (upiSubMethod === 'qr') {
          metadata.upi_app = 'QR Scanner'
          metadata.upi_id = 'scanned_qr_code'
        } else {
          metadata.upi_app = selectedUpiApp
          metadata.upi_id = upiId
        }
      } else if (method === 'card') {
        metadata.card_last4 = cardNumber.replace(/\s/g, '').slice(-4)
        metadata.card_name = cardName
      } else {
        metadata.bank = selectedBank
      }

      const res = await authedFetch('/api/payment', {
        method: 'POST',
        body: JSON.stringify({
          patientId: session.user.id,
          paymentType: 'combined',
          membershipTier: assessment.membership_tier,
          amount: total,
          paymentMethod: method,
          metadata,
        })
      })

      const result = await res.json()
      if (!res.ok) throw new Error(result.error || 'Payment failed')

      setStep('success')
    } catch (err: any) {
      setStep('failed')
      console.error('Payment error:', err)
    }
  }

  const validateAndPay = () => {
    if (method === 'upi') {
      if (upiSubMethod === 'id') {
        if (!upiId || !upiId.includes('@')) {
          setUpiError('Please enter a valid UPI ID (e.g. name@upi)')
          return
        }
        setUpiError('')
      }
    } else if (method === 'card') {
      if (cardNumber.replace(/\s/g, '').length < 16) { setCardError('Enter a valid 16-digit card number'); return }
      if (!cardName.trim()) { setCardError('Enter the name on card'); return }
      if (cardExpiry.length < 5) { setCardError('Enter a valid expiry (MM/YY)'); return }
      if (cardCvv.length < 3) { setCardError('Enter a valid CVV'); return }
      setCardError('')
    } else {
      if (!selectedBank) { setBankError('Please select your bank'); return }
      setBankError('')
    }
    simulatePayment()
  }

  if (loading) return (
    <div className="min-h-screen bg-[#F5F0EB] flex items-center justify-center">
      <div className="w-10 h-10 border-4 border-[#C4622D] border-t-transparent rounded-full animate-spin" />
    </div>
  )

  return (
    <div className="min-h-screen bg-[#F5F0EB] flex flex-col lg:flex-row font-sans">

      {/* ── LEFT: Order summary sidebar ───────────────────────────────────── */}
      <div className="lg:w-[38%] bg-[#1A1F36] p-8 lg:p-12 flex flex-col justify-between relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-[#C4622D]/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 space-y-8">
          <img src="/images/logo loss.png" alt="8Liv" className="h-9 object-contain filter brightness-0 invert opacity-90" />

          <div>
            <span className="text-[#C4622D] text-xs font-black uppercase tracking-[0.2em]">
              Step 2 of 2 — Payment
            </span>
            <h2 className="text-2xl font-bold font-sora text-white mt-2 leading-snug">
              Complete your<br />enrollment
            </h2>
          </div>

          {/* Order lines */}
          <div className="space-y-3">
            <p className="text-white/40 text-[10px] font-black uppercase tracking-wider border-b border-white/10 pb-2">Order Summary</p>
            {[
              { label: `${assessment?.membership_tier} — Month 1`, amount: planPrice },
              { label: 'Initial Consultation Fee', amount: consultFee },
              { label: 'GST (18%)', amount: gst },
            ].map(line => (
              <div key={line.label} className="flex justify-between items-center">
                <span className="text-white/60 text-xs font-medium">{line.label}</span>
                <span className="text-white text-xs font-bold">₹{line.amount.toLocaleString('en-IN')}</span>
              </div>
            ))}
            <div className="flex justify-between items-center border-t border-white/10 pt-3">
              <span className="text-white font-bold text-sm">Total</span>
              <span className="text-[#C4622D] font-extrabold text-xl font-sora">₹{total.toLocaleString('en-IN')}</span>
            </div>
          </div>

          {/* Inclusions */}
          <div className="space-y-2">
            <p className="text-white/40 text-[10px] font-black uppercase tracking-wider">Included Today</p>
            {[
              'Doctor consultation booking access',
              'Personalised health dashboard',
              assessment?.membership_tier === 'Gold Plan' ? 'Dietitian + fitness coaching' : null,
              'GLP-1 prescription pathway',
              'Encrypted health records',
            ].filter(Boolean).map((item: any) => (
              <div key={item} className="flex items-start gap-2.5">
                <CheckCircle2 size={13} className="text-[#5C7A6B] shrink-0 mt-0.5" />
                <span className="text-white/65 text-xs font-medium">{item}</span>
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
            <div key={label} className="flex items-center gap-1.5 text-[10px] font-semibold text-white/40">
              <Icon size={11} /> {label}
            </div>
          ))}
        </div>
      </div>

      {/* ── RIGHT: Payment form / steps ───────────────────────────────────── */}
      <div className="flex-1 flex items-center justify-center p-6 lg:p-12">
        <div className="w-full max-w-md">

          <AnimatePresence mode="wait">

            {/* ── STEP: Review → pick method ─────────────────────────────── */}
            {step === 'review' && (
              <motion.div key="review" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }}>
                <h3 className="text-xl font-bold font-sora text-[#1A1F36] mb-2">Ready to pay?</h3>
                <p className="text-sm text-[#8896A4] mb-6">Review your order, then select a payment method.</p>

                <div className="bg-white rounded-2xl p-5 border border-[#1A1F36]/8 shadow-sm mb-6 space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-[#8896A4]">Plan</span>
                    <span className="font-bold text-[#1A1F36]">{assessment?.membership_tier}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-[#8896A4]">Total (incl. GST)</span>
                    <span className="font-extrabold text-[#C4622D]">₹{total.toLocaleString('en-IN')}</span>
                  </div>
                </div>

                <button
                  onClick={() => setStep('method')}
                  className="w-full bg-[#1A1F36] hover:bg-[#C4622D] text-white font-bold rounded-full py-4 text-sm flex items-center justify-center gap-2 transition-all"
                >
                  Proceed to Payment <ChevronRight size={16} />
                </button>
                <button
                  onClick={() => router.replace('/plans')}
                  className="w-full mt-3 text-xs text-[#8896A4] hover:text-[#1A1F36] flex items-center justify-center gap-1.5 transition-colors"
                >
                  <ArrowLeft size={12} /> Change plan
                </button>
              </motion.div>
            )}

            {/* ── STEP: Method selection + form ───────────────────────────── */}
            {step === 'method' && (
              <motion.div key="method" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-5">
                <div>
                  <h3 className="text-xl font-bold font-sora text-[#1A1F36]">Payment Method</h3>
                  <p className="text-xs text-[#8896A4] mt-1">Choose how you'd like to pay</p>
                </div>

                {/* Method tabs */}
                <div className="flex gap-2 bg-[#1A1F36]/5 p-1 rounded-xl">
                  {[
                    { key: 'upi' as PaymentMethod, icon: Smartphone, label: 'UPI' },
                    { key: 'card' as PaymentMethod, icon: CreditCard, label: 'Card' },
                    { key: 'netbanking' as PaymentMethod, icon: Building2, label: 'Net Banking' },
                  ].map(tab => {
                    const Icon = tab.icon
                    return (
                      <button
                        key={tab.key}
                        onClick={() => setMethod(tab.key)}
                        className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-xs font-bold transition-all ${
                          method === tab.key
                            ? 'bg-white text-[#1A1F36] shadow-sm'
                            : 'text-[#8896A4] hover:text-[#1A1F36]'
                        }`}
                      >
                        <Icon size={13} /> {tab.label}
                      </button>
                    )
                  })}
                </div>

                {/* ── UPI form ── */}
                {method === 'upi' && (
                  <div className="space-y-4">
                    {/* Sub-method toggle */}
                    <div className="flex gap-1 bg-[#1A1F36]/5 p-1 rounded-xl max-w-[280px] mx-auto">
                      <button
                        type="button"
                        onClick={() => setUpiSubMethod('qr')}
                        className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all ${
                          upiSubMethod === 'qr'
                            ? 'bg-white text-[#1A1F36] shadow-sm'
                            : 'text-[#8896A4] hover:text-[#1A1F36]'
                        }`}
                      >
                        Scan QR Code
                      </button>
                      <button
                        type="button"
                        onClick={() => setUpiSubMethod('id')}
                        className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all ${
                          upiSubMethod === 'id'
                            ? 'bg-white text-[#1A1F36] shadow-sm'
                            : 'text-[#8896A4] hover:text-[#1A1F36]'
                        }`}
                      >
                        Enter UPI ID
                      </button>
                    </div>

                    {upiSubMethod === 'qr' ? (
                      <div className="flex flex-col items-center justify-center p-4 bg-white rounded-2xl border border-[#1A1F36]/8 shadow-sm space-y-4">
                        <div className="text-center">
                          <p className="text-[11px] font-bold text-[#5C7A6B] bg-[#5C7A6B]/8 px-3 py-1 rounded-full inline-block uppercase tracking-wider">
                            Instant Activation
                          </p>
                          <p className="text-[11px] text-[#8896A4] mt-1.5 max-w-[280px]">
                            Scan using Google Pay, PhonePe, Paytm, BHIM, or any banking app
                          </p>
                        </div>

                        {/* Interactive QR Card Wrapper */}
                        <div className="relative p-3 bg-[#1A1F36]/2 rounded-2xl border border-[#1A1F36]/5 flex items-center justify-center overflow-hidden w-[200px] h-[200px] group">
                          {/* Animated scanline */}
                          <motion.div
                            className="absolute left-0 right-0 h-[3px] bg-gradient-to-r from-transparent via-[#C4622D] to-transparent shadow-[0_0_10px_#C4622D] z-10 pointer-events-none"
                            animate={{ top: ['0%', '100%', '0%'] }}
                            transition={{ repeat: Infinity, duration: 3, ease: 'easeInOut' }}
                          />
                          {/* QR Image */}
                          <img
                            src="/images/upi_qr_mock.png"
                            alt="UPI QR Code"
                            className="w-[180px] h-[180px] object-contain rounded-lg transition-transform group-hover:scale-[1.02]"
                          />
                        </div>

                        <div className="text-center space-y-1">
                          <p className="text-xs text-[#8896A4]">Amount to Pay</p>
                          <p className="text-lg font-black font-sora text-[#1A1F36]">₹{total.toLocaleString('en-IN')}</p>
                          <div className="flex items-center justify-center gap-1.5 text-[10px] font-bold text-[#8896A4] bg-[#1A1F36]/4 px-3 py-1 rounded-full mt-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-ping" />
                            Awaiting scanner confirmation...
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <div className="grid grid-cols-4 gap-2">
                          {UPI_APPS.map(app => (
                            <button
                              key={app.name}
                              onClick={() => {
                                setSelectedUpiApp(app.name)
                                setUpiError('')
                              }}
                              className={`py-3 rounded-xl border-2 text-[10px] font-black transition-all ${
                                selectedUpiApp === app.name
                                  ? 'border-[#C4622D] text-[#C4622D] bg-[#C4622D]/5'
                                  : 'border-[#1A1F36]/10 text-[#8896A4] hover:border-[#1A1F36]/25'
                              }`}
                            >
                              {app.abbr}
                            </button>
                          ))}
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-[#8896A4] mb-1.5 uppercase tracking-wider">UPI ID</label>
                          <input
                            type="text"
                            placeholder="yourname@upi"
                            value={upiId}
                            onChange={e => setUpiId(e.target.value)}
                            className="w-full bg-white border border-[#1A1F36]/12 rounded-xl px-4 py-3.5 text-sm text-[#1A1F36] focus:outline-none focus:border-[#C4622D] focus:ring-2 focus:ring-[#C4622D]/15 font-medium"
                          />
                          {upiError && <p className="text-red-500 text-xs mt-1.5 flex items-center gap-1"><AlertCircle size={11}/> {upiError}</p>}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* ── Card form ── */}
                {method === 'card' && (
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs font-bold text-[#8896A4] mb-1.5 uppercase tracking-wider">Card Number</label>
                      <input
                        type="text"
                        placeholder="0000 0000 0000 0000"
                        value={cardNumber}
                        onChange={e => setCardNumber(formatCard(e.target.value))}
                        className="w-full bg-white border border-[#1A1F36]/12 rounded-xl px-4 py-3.5 text-sm font-mono text-[#1A1F36] focus:outline-none focus:border-[#C4622D] focus:ring-2 focus:ring-[#C4622D]/15 tracking-widest"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-[#8896A4] mb-1.5 uppercase tracking-wider">Name on Card</label>
                      <input
                        type="text"
                        placeholder="RAHUL SHARMA"
                        value={cardName}
                        onChange={e => setCardName(e.target.value.toUpperCase())}
                        className="w-full bg-white border border-[#1A1F36]/12 rounded-xl px-4 py-3.5 text-sm font-medium text-[#1A1F36] focus:outline-none focus:border-[#C4622D] focus:ring-2 focus:ring-[#C4622D]/15"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-bold text-[#8896A4] mb-1.5 uppercase tracking-wider">Expiry</label>
                        <input
                          type="text"
                          placeholder="MM/YY"
                          maxLength={5}
                          value={cardExpiry}
                          onChange={e => {
                            let v = e.target.value.replace(/\D/g, '')
                            if (v.length >= 3) v = v.slice(0,2) + '/' + v.slice(2,4)
                            setCardExpiry(v)
                          }}
                          className="w-full bg-white border border-[#1A1F36]/12 rounded-xl px-4 py-3.5 text-sm font-mono text-[#1A1F36] focus:outline-none focus:border-[#C4622D] focus:ring-2 focus:ring-[#C4622D]/15"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-[#8896A4] mb-1.5 uppercase tracking-wider">CVV</label>
                        <input
                          type="password"
                          placeholder="•••"
                          maxLength={4}
                          value={cardCvv}
                          onChange={e => setCardCvv(e.target.value.replace(/\D/g, '').slice(0,4))}
                          className="w-full bg-white border border-[#1A1F36]/12 rounded-xl px-4 py-3.5 text-sm font-mono text-[#1A1F36] focus:outline-none focus:border-[#C4622D] focus:ring-2 focus:ring-[#C4622D]/15"
                        />
                      </div>
                    </div>
                    {cardError && <p className="text-red-500 text-xs flex items-center gap-1"><AlertCircle size={11}/> {cardError}</p>}
                  </div>
                )}

                {/* ── Net banking ── */}
                {method === 'netbanking' && (
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-2">
                      {BANKS.map(bank => (
                        <button
                          key={bank}
                          onClick={() => setSelectedBank(bank)}
                          className={`text-left px-4 py-3 rounded-xl border-2 text-xs font-semibold transition-all ${
                            selectedBank === bank
                              ? 'border-[#C4622D] text-[#C4622D] bg-[#C4622D]/5'
                              : 'border-[#1A1F36]/10 text-[#1A1F36] hover:border-[#1A1F36]/25'
                          }`}
                        >
                          {bank}
                        </button>
                      ))}
                    </div>
                    {bankError && <p className="text-red-500 text-xs flex items-center gap-1"><AlertCircle size={11}/> {bankError}</p>}
                  </div>
                )}

                <button
                  onClick={validateAndPay}
                  className="w-full bg-[#C4622D] hover:bg-[#A8522A] text-white font-bold rounded-full py-4 text-sm flex items-center justify-center gap-2 transition-all shadow-md shadow-[#C4622D]/20 animate-pulse-glow"
                >
                  <Lock size={14} />{' '}
                  {method === 'upi' && upiSubMethod === 'qr'
                    ? `I have Paid ₹${total.toLocaleString('en-IN')}`
                    : `Pay ₹${total.toLocaleString('en-IN')} Securely`}
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
