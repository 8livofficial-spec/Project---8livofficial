'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { ShieldCheck, CheckCircle2, ArrowLeft, CreditCard } from 'lucide-react'
import { RazorpayCheckoutButton } from '@/components/payments/RazorpayCheckoutButton'

export default function CheckoutPage() {
  const [amount, setAmount] = useState<number>(499)
  const [customerName, setCustomerName] = useState<string>('')
  const [customerEmail, setCustomerEmail] = useState<string>('')
  const [customerContact, setCustomerContact] = useState<string>('')
  const [isTestMode, setIsTestMode] = useState<boolean>(true)
  const [paymentLog, setPaymentLog] = useState<{
    status: 'idle' | 'success' | 'error'
    message: string
    paymentId?: string
    orderId?: string
    signature?: string
  }>({
    status: 'idle',
    message: 'Ready for checkout',
  })

  useEffect(() => {
    const key = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || ''
    setIsTestMode(key.startsWith('rzp_test_') || !key)

    // Pre-fill with authenticated user details if logged in
    import('@/lib/supabaseClient').then(({ supabase }) => {
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (session?.user) {
          setCustomerEmail(session.user.email || '')
          setCustomerName(session.user.user_metadata?.full_name || session.user.user_metadata?.name || '')
          setCustomerContact(session.user.phone || '')
        }
      })
    })
  }, [])

  return (
    <div className="min-h-screen bg-[#F5F0EB] text-[#1A1F36] py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-xl mx-auto">
        {/* Navigation */}
        <div className="mb-6 flex items-center justify-between">
          <Link
            href="/patient/consultation"
            className="inline-flex items-center gap-2 text-sm font-medium text-[#40516A] hover:text-[#1A1F36] transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Consultation Booking
          </Link>
          <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border ${
            isTestMode
              ? 'bg-amber-100 text-amber-800 border-amber-200'
              : 'bg-emerald-100 text-emerald-800 border-emerald-200'
          }`}>
            <span className={`w-2 h-2 rounded-full ${isTestMode ? 'bg-amber-500 animate-pulse' : 'bg-emerald-500'}`} />
            {isTestMode ? 'Razorpay Test Mode' : 'Razorpay Live Secure'}
          </span>
        </div>

        {/* Checkout Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-[#1A1F36]/10 p-6 sm:p-8">
          <div className="flex items-center gap-3 pb-6 border-b border-[#1A1F36]/10 mb-6">
            <div className="w-12 h-12 rounded-xl bg-[#1A1F36] text-white flex items-center justify-center">
              <CreditCard className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-[#1A1F36]">Razorpay Standard Checkout</h1>
              <p className="text-xs text-[#40516A]">Secure payment testing for 8LIV Healthcare</p>
            </div>
          </div>

          <div className="space-y-5">
            {/* Amount Selection */}
            <div>
              <label className="block text-xs font-semibold text-[#40516A] mb-2 uppercase tracking-wider">
                Select Test Amount
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[1, 499, 1999].map((val) => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => setAmount(val)}
                    className={`py-2.5 px-3 rounded-xl text-sm font-semibold border transition-all ${
                      amount === val
                        ? 'bg-[#1A1F36] text-white border-[#1A1F36] shadow-sm'
                        : 'bg-white text-[#1A1F36] border-gray-200 hover:border-gray-400'
                    }`}
                  >
                    ₹{val} {val === 1 && <span className="text-[10px] opacity-75">(Min ₹1)</span>}
                  </button>
                ))}
              </div>
            </div>

            {/* Custom Amount */}
            <div>
              <label className="block text-xs font-semibold text-[#40516A] mb-1">
                Custom Amount (INR)
              </label>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-sm font-bold text-gray-500">₹</span>
                <input
                  type="number"
                  min="1"
                  value={amount}
                  onChange={(e) => setAmount(Math.max(1, Number(e.target.value) || 1))}
                  className="w-full pl-8 pr-4 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#1A1F36]"
                />
              </div>
            </div>

            {/* Customer Details */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-[#40516A] mb-1">Customer Name</label>
                <input
                  type="text"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#1A1F36]"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#40516A] mb-1">Customer Email</label>
                <input
                  type="email"
                  value={customerEmail}
                  onChange={(e) => setCustomerEmail(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#1A1F36]"
                />
              </div>
            </div>

            {/* Order Summary */}
            <div className="bg-[#F5F0EB]/50 rounded-xl p-4 border border-[#1A1F36]/5 space-y-2 text-sm">
              <div className="flex justify-between text-[#40516A]">
                <span>Order Type</span>
                <span className="font-medium text-[#1A1F36]">Standard Checkout (Test)</span>
              </div>
              <div className="flex justify-between text-[#40516A]">
                <span>Amount in Paise</span>
                <span className="font-medium text-[#1A1F36]">{amount * 100} paise</span>
              </div>
              <div className="flex justify-between text-base font-bold text-[#1A1F36] pt-2 border-t border-[#1A1F36]/10">
                <span>Total Payable</span>
                <span>₹{amount}</span>
              </div>
            </div>

            {/* Razorpay Standard Checkout Button */}
            <div className="pt-2">
              <RazorpayCheckoutButton
                amount={amount}
                currency="INR"
                customerName={customerName}
                customerEmail={customerEmail}
                customerContact={customerContact}
                buttonText={`Pay ₹${amount} with Razorpay`}
                className="w-full py-3.5 px-6 rounded-xl font-bold text-white bg-[#1A1F36] hover:bg-[#0D101C] transition-all shadow-md hover:shadow-lg cursor-pointer"
                onSuccess={(res) => {
                  setPaymentLog({
                    status: 'success',
                    message: 'Payment verified and confirmed by backend HMAC-SHA256 signature check!',
                    paymentId: res.paymentId,
                    orderId: res.orderId,
                    signature: res.signature,
                  })
                }}
                onError={(err) => {
                  setPaymentLog({
                    status: 'error',
                    message: typeof err === 'string' ? err : err.message,
                  })
                }}
              />
            </div>

            {/* Live Result Log */}
            {paymentLog.status !== 'idle' && (
              <div
                className={`mt-4 rounded-xl p-4 border text-xs ${
                  paymentLog.status === 'success'
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                    : 'bg-red-50 border-red-200 text-red-900'
                }`}
              >
                <div className="flex items-center gap-2 font-bold mb-1">
                  {paymentLog.status === 'success' ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  ) : (
                    <ShieldCheck className="w-4 h-4 text-red-600" />
                  )}
                  <span>{paymentLog.status === 'success' ? 'Payment Verified' : 'Payment Error'}</span>
                </div>
                <p className="mb-2">{paymentLog.message}</p>
                {paymentLog.paymentId && (
                  <div className="space-y-1 font-mono text-[11px] bg-white/70 p-2.5 rounded-lg border border-emerald-200">
                    <div>Payment ID: <span className="font-semibold">{paymentLog.paymentId}</span></div>
                    <div>Order ID: <span className="font-semibold">{paymentLog.orderId}</span></div>
                    <div className="truncate">Signature: <span className="font-semibold">{paymentLog.signature}</span></div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Security & Architecture Note */}
        <div className="mt-6 text-center text-xs text-[#8896A4] flex items-center justify-center gap-2">
          <ShieldCheck className="w-4 h-4 text-emerald-600" />
          <span>HMAC-SHA256 signature verification active on POST /api/verify-payment</span>
        </div>
      </div>
    </div>
  )
}
