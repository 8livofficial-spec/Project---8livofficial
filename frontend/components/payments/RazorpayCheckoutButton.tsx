'use client'

import React, { useState } from 'react'

export interface RazorpayCheckoutButtonProps {
  amount?: number // Amount in INR (e.g. 499) or in paise if isPaise is true
  isPaise?: boolean
  currency?: string
  receipt?: string
  name?: string
  description?: string
  customerName?: string
  customerEmail?: string
  customerContact?: string
  buttonText?: string
  className?: string
  style?: React.CSSProperties
  disabled?: boolean
  onSuccess?: (data: { paymentId: string; orderId: string; signature: string }) => void
  onError?: (error: Error | string) => void
  onDismiss?: () => void
}

function loadScript(src: string): Promise<boolean> {
  return new Promise((resolve) => {
    if (typeof window === 'undefined') return resolve(false)
    if ((window as any).Razorpay) return resolve(true)

    const existing = document.querySelector(`script[src="${src}"]`) as HTMLScriptElement | null
    if (existing) {
      if ((window as any).Razorpay) return resolve(true)
      existing.addEventListener('load', () => resolve(true), { once: true })
      existing.addEventListener('error', () => resolve(false), { once: true })
      return
    }

    const script = document.createElement('script')
    script.src = src
    script.async = true
    script.onload = () => resolve(true)
    script.onerror = () => resolve(false)
    document.body.appendChild(script)
  })
}

export function RazorpayCheckoutButton({
  amount = 499,
  isPaise = false,
  currency = 'INR',
  receipt,
  name = '8Liv Healthcare',
  description = 'Healthcare Consultation & Membership',
  customerName = '',
  customerEmail = '',
  customerContact = '',
  buttonText,
  className = '',
  style,
  disabled = false,
  onSuccess,
  onError,
  onDismiss,
}: RazorpayCheckoutButtonProps) {
  const [loading, setLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  const amountInPaise = isPaise ? Math.round(amount) : Math.round(amount * 100)
  const displayAmount = isPaise ? Math.round(amount / 100) : amount

  const handlePayment = async () => {
    setLoading(true)
    setErrorMessage(null)
    setSuccessMessage(null)

    try {
      // 1. Ensure Razorpay checkout.js script is loaded
      const scriptLoaded = await loadScript('https://checkout.razorpay.com/v1/checkout.js')
      if (!scriptLoaded || !(window as any).Razorpay) {
        throw new Error('Unable to load Razorpay Checkout SDK. Please check your internet connection or ad-blocker.')
      }

      // 2. Call backend order creation endpoint
      const createOrderRes = await fetch('/api/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: amountInPaise,
          currency,
          receipt: receipt || `rcpt_${Date.now().toString().slice(-8)}`,
        }),
      })

      const orderData = await createOrderRes.json().catch(() => ({}))
      if (!createOrderRes.ok || orderData.error) {
        throw new Error(orderData.error || 'Failed to initialize payment order.')
      }

      const orderId = orderData.order_id || orderData.id
      const razorpayKey = orderData.key || process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID

      if (!orderId) {
        throw new Error('Server returned an invalid order ID.')
      }

      // 3. Open Razorpay Checkout modal
      await new Promise<void>((resolve, reject) => {
        const options: any = {
          key: razorpayKey,
          amount: orderData.amount || amountInPaise,
          currency: orderData.currency || currency,
          name,
          description,
          order_id: orderId,
          prefill: {
            name: customerName,
            email: customerEmail,
            contact: customerContact,
          },
          theme: {
            color: '#1A1F36',
          },
          handler: async (response: {
            razorpay_payment_id: string
            razorpay_order_id: string
            razorpay_signature: string
          }) => {
            try {
              // 4. Send signature to verification endpoint
              const verifyRes = await fetch('/api/verify-payment', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  order_id: response.razorpay_order_id,
                  payment_id: response.razorpay_payment_id,
                  signature: response.razorpay_signature,
                  razorpay_order_id: response.razorpay_order_id,
                  razorpay_payment_id: response.razorpay_payment_id,
                  razorpay_signature: response.razorpay_signature,
                }),
              })

              const verifyData = await verifyRes.json().catch(() => ({}))
              if (!verifyRes.ok || !verifyData.success) {
                throw new Error(verifyData.error || 'Payment signature verification failed.')
              }

              const successResult = {
                paymentId: response.razorpay_payment_id,
                orderId: response.razorpay_order_id,
                signature: response.razorpay_signature,
              }

              setSuccessMessage(`Payment successful! Reference: ${response.razorpay_payment_id}`)
              onSuccess?.(successResult)
              resolve()
            } catch (vErr: any) {
              const msg = vErr?.message || 'Payment verification failed.'
              setErrorMessage(msg)
              onError?.(msg)
              reject(vErr)
            }
          },
          modal: {
            ondismiss: () => {
              setLoading(false)
              onDismiss?.()
              reject(new Error('Payment cancelled by user.'))
            },
          },
        }

        try {
          const rzp = new (window as any).Razorpay(options)
          rzp.on('payment.failed', (failResp: any) => {
            const failMsg = failResp?.error?.description || 'Payment failed. Please try again.'
            setErrorMessage(failMsg)
            onError?.(failMsg)
            reject(new Error(failMsg))
          })
          rzp.open()
        } catch (initErr: any) {
          reject(new Error(initErr?.message || 'Failed to initialize Razorpay modal.'))
        }
      })
    } catch (err: any) {
      if (err?.message !== 'Payment cancelled by user.') {
        const msg = err?.message || 'Payment could not be processed.'
        setErrorMessage(msg)
        onError?.(msg)
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        onClick={handlePayment}
        disabled={disabled || loading}
        className={className || 'px-6 py-3 rounded-xl font-semibold text-white bg-[#1A1F36] hover:bg-[#0D101C] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer shadow-sm hover:shadow-md'}
        style={style}
      >
        {loading ? 'Processing Payment...' : buttonText || `Pay ₹${displayAmount}`}
      </button>

      {errorMessage && (
        <p className="text-xs text-red-600 font-medium">
          {errorMessage}
        </p>
      )}

      {successMessage && (
        <p className="text-xs text-green-600 font-medium">
          {successMessage}
        </p>
      )}
    </div>
  )
}
