'use client'

import React, { useState, useEffect } from 'react'
import { CheckCircle2, Download, CreditCard, ChevronRight, Zap, RefreshCw, AlertCircle, Calendar } from 'lucide-react'
import { usePatientData } from '@/hooks/usePatientData'
import { supabase } from '@/lib/supabaseClient'
import { authedFetch } from '@/lib/apiClient'

export default function BillingPage() {
  const { assessment, reloadData, loading, profile } = usePatientData()
  const [upgrading, setUpgrading] = useState(false)
  const [activeSub, setActiveSub] = useState<any>(null)
  const [plans, setPlans] = useState<any[]>([])
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  const loadSubscription = async () => {
    try {
      const res = await authedFetch('/api/patient/subscription')
      const data = await res.json()
      if (res.ok && data.subscription) {
        setActiveSub(data.subscription)
      }
    } catch (e) {
      console.warn('[billing] Failed to load subscription:', e)
    }
  }

  useEffect(() => {
    // 1. Load active commercial plans
    fetch('/api/subscriptions/pricing')
      .then(r => r.json())
      .then(d => {
        if (d.plans && d.plans.length > 0) {
          setPlans(d.plans)
        }
      })
      .catch(e => console.warn('Failed to load plans:', e))

    // 2. Load active subscription
    loadSubscription()
  }, [])

  const loadRazorpayScript = () => {
    return new Promise<boolean>((resolve) => {
      if (typeof window === 'undefined') return resolve(false)
      const existingScript = document.getElementById('razorpay-checkout-js')
      if (existingScript) {
        if ((window as any).Razorpay) return resolve(true)
        existingScript.addEventListener('load', () => resolve(true), { once: true })
        existingScript.addEventListener('error', () => resolve(false), { once: true })
      } else {
        const script = document.createElement('script')
        script.id = 'razorpay-checkout-js'
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

  const handlePlanSelect = async (plan: any) => {
    setUpgrading(true)
    setStatusMsg(null)

    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        setStatusMsg({ type: 'error', message: 'Session expired. Please sign in again.' })
        return
      }

      // 1. Authoritative order initialization with Bearer authentication
      const orderRes = await authedFetch('/api/razorpay/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: plan.finalPrice,
          currency: 'INR',
          paymentType: 'membership',
          planId: plan.id,
          durationMonths: plan.durationMonths,
        }),
      })

      const orderData = await orderRes.json()
      if (!orderRes.ok || orderData.error) {
        throw new Error(orderData.error || 'Failed to initialize treatment program order.')
      }

      // 2. Simulated / Sandbox Gateway bypass when mock credentials configured
      if (orderData.isMock || !orderData.key || orderData.key === 'rzp_test_mock') {
        const verifyRes = await authedFetch('/api/payment/verify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            patientId: session.user.id,
            paymentType: 'membership',
            planId: plan.id,
            durationMonths: plan.durationMonths,
            amount: plan.finalPrice,
            shippingState: assessment?.shipping_state || '',
            paymentMethod: 'upi',
            razorpay_order_id: orderData.id || `order_mock_${Math.floor(Math.random() * 100000)}`,
            razorpay_payment_id: `pay_mock_${Date.now()}`,
            razorpay_signature: 'mock_signature',
          }),
        })

        const result = await verifyRes.json()
        if (!verifyRes.ok || result.error) {
          throw new Error(result.error || `Failed to activate ${plan.name}.`)
        }

        setStatusMsg({ type: 'success', message: `Successfully updated treatment program to ${plan.name}! 🎉` })
        await reloadData({ force: true })
        await loadSubscription()
        return
      }

      // 3. Live Razorpay Modal Gateway Integration
      await loadRazorpayScript()
      if (typeof window === 'undefined' || !(window as any).Razorpay) {
        throw new Error('Razorpay checkout could not be loaded. Please disable ad-blockers and retry.')
      }

      const patientName = [profile?.first_name, profile?.last_name].filter(Boolean).join(' ') || assessment?.first_name || 'Member'
      const patientEmail = session.user.email || (profile as any)?.email || 'care@8liv.in'
      const rawContact = profile?.phone_number || assessment?.phone_number || ''
      const patientContact = rawContact.replace(/\D/g, '').slice(-10)

      await new Promise<void>((resolve, reject) => {
        const options: any = {
          key: orderData.key,
          amount: orderData.amount,
          currency: orderData.currency || 'INR',
          name: '8Liv Health',
          description: `${plan.name} (Treatment Program Upgrade)`,
          prefill: {
            name: patientName,
            email: patientEmail,
            ...(patientContact.length === 10 ? { contact: patientContact } : {}),
          },
          theme: {
            color: '#C4622D',
          },
        }

        if (orderData.id && String(orderData.id).startsWith('order_')) {
          options.order_id = orderData.id
        }

        options.handler = async function (response: any) {
          try {
            const verifyRes = await authedFetch('/api/payment/verify', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                patientId: session.user.id,
                paymentType: 'membership',
                planId: plan.id,
                durationMonths: plan.durationMonths,
                amount: plan.finalPrice,
                shippingState: assessment?.shipping_state || '',
                paymentMethod: 'razorpay',
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
              }),
            })

            const verifyData = await verifyRes.json()
            if (!verifyRes.ok || verifyData.error) {
              throw new Error(verifyData.error || 'Payment verification failed.')
            }

            setStatusMsg({ type: 'success', message: `Successfully updated treatment program to ${plan.name}! 🎉` })
            await reloadData({ force: true })
            await loadSubscription()
            resolve()
          } catch (vErr) {
            reject(vErr)
          }
        }

        options.modal = {
          ondismiss: function () {
            setUpgrading(false)
          },
        }

        const rzp = new (window as any).Razorpay(options)
        rzp.open()
      })
    } catch (err: any) {
      console.error('Plan upgrade error:', err)
      setStatusMsg({ type: 'error', message: err.message || 'Program upgrade failed. Please try again.' })
    } finally {
      setUpgrading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center text-[#C4622D]">
        <div className="w-10 h-10 border-4 border-current border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  const rawTier = String(activeSub?.program_name || assessment?.membership_tier || '').trim()
  const activeProgram = rawTier || '1 Month Treatment Program'
  const monthlyRate = activeSub?.base_monthly_price || 1999
  const cycleCount = activeSub?.treatment_cycles?.length || activeSub?.duration_months || 1

  return (
    <div className="space-y-6 text-[#1A1F36]">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold font-sora">Billing &amp; Care Program</h2>
        <p className="text-xs text-[#8896A4] font-medium">Manage active treatment programs, cycle provisioning, and invoices.</p>
      </div>

      {statusMsg && (
        <div
          className={`rounded-2xl p-4 text-xs font-bold flex items-center gap-3 border shadow-sm ${
            statusMsg.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
              : 'bg-rose-50 text-rose-800 border-rose-200'
          }`}
        >
          {statusMsg.type === 'success' ? (
            <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600" />
          ) : (
            <AlertCircle className="h-5 w-5 shrink-0 text-rose-600" />
          )}
          <p>{statusMsg.message}</p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Current Active Program Card */}
        <div className="lg:col-span-2 bg-[#0B1120] rounded-2xl p-6 text-white border border-white/5 relative overflow-hidden select-none">
          <div className="absolute top-0 right-0 w-44 h-44 bg-[#0D9488]/15 rounded-full blur-2xl pointer-events-none" />
          <div className="space-y-6 relative z-10">
            <div className="flex justify-between items-start">
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-white/50">Active Care Program</span>
                <h3 className="text-2xl font-bold font-sora mt-1">{activeProgram}</h3>
                {activeSub?.start_date && (
                  <p className="text-xs text-white/60 mt-1 flex items-center gap-1.5 font-medium">
                    <Calendar className="h-3 w-3 text-[#5EEAD4]" />
                    Cycle Duration: {activeSub.start_date} to {activeSub.end_date} ({cycleCount} Monthly Cycles)
                  </p>
                )}
              </div>
              <span className="bg-[#0D9488]/20 text-[#5EEAD4] text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-wider border border-[#0D9488]/40">
                Active
              </span>
            </div>

            <div className="space-y-1">
              <span className="text-[10px] font-black uppercase tracking-wider text-white/50">Program Fee</span>
              <p className="text-3xl font-extrabold font-sora">
                ₹{Number(monthlyRate).toLocaleString('en-IN')}{' '}
                <span className="text-sm font-normal text-white/60">/ month</span>
              </p>
            </div>

            <div className="border-t border-white/10 pt-4 space-y-2.5">
              <p className="text-xs font-bold text-white/70">All Treatment Programs Include:</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-white/80">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-[#5EEAD4] shrink-0" />
                  <span>Monthly Treatment Cycle Provisioning</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-[#5EEAD4] shrink-0" />
                  <span>Doctor Follow-up Consultations (₹0)</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-[#5EEAD4] shrink-0" />
                  <span>Dedicated Dietitian & Nutrition Guidance</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-[#5EEAD4] shrink-0" />
                  <span>Dedicated Fitness Movement Check-ins</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-[#5EEAD4] shrink-0" />
                  <span>Partner Pharmacy Fulfillment & Tracking</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-[#5EEAD4] shrink-0" />
                  <span>Direct Medication Review Requests</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Invoice Summary Card */}
        <div className="bg-white rounded-2xl p-6 border border-[#1A1F36]/8 shadow-sm flex flex-col justify-between">
          <div className="space-y-4">
            <h4 className="text-sm font-bold font-sora text-[#1A1F36] border-b border-[#1A1F36]/8 pb-2">
              Recent Billing Activity
            </h4>
            <div className="space-y-3">
              {[
                { date: activeSub?.created_at ? new Date(activeSub.created_at).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' }) : 'Recent', desc: `${activeProgram}`, amount: 'Paid' },
                { date: 'Initial', desc: 'Clinical Doctor Consultation (₹499)', amount: 'Paid' },
              ].map((inv, idx) => (
                <div key={idx} className="flex justify-between items-center text-xs">
                  <div>
                    <p className="font-bold text-[#1A1F36]">{inv.desc}</p>
                    <p className="text-[#8896A4] text-[10px]">{inv.date}</p>
                  </div>
                  <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                    {inv.amount}
                  </span>
                </div>
              ))}
            </div>
          </div>
          <div className="mt-6 pt-3 border-t border-[#1A1F36]/8 text-[11px] text-[#8896A4]">
            Official GST tax invoices are automatically dispatched to your registered email.
          </div>
        </div>
      </div>

      {/* Available Program Durations */}
      <div className="space-y-3">
        <h3 className="text-base font-bold font-sora">Extend or Select Treatment Program</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {plans.map((prog) => {
            const discountPct = Number(prog.discountPercentage || 0)
            const discountAmt = Number(prog.discountAmount || 0)
            return (
              <div
                key={prog.id || prog.durationMonths}
                className="bg-white rounded-2xl p-5 border border-[#1A1F36]/8 shadow-sm flex flex-col justify-between relative"
              >
                {discountPct > 0 && (
                  <div className="absolute -top-2.5 right-4 rounded-full bg-[#C4622D] px-2.5 py-0.5 text-[10px] font-black text-white uppercase">
                    {discountPct}% OFF (Save ₹{discountAmt.toLocaleString('en-IN')})
                  </div>
                )}
                <div>
                  <h4 className="font-bold font-sora text-[#1A1F36]">{prog.name}</h4>
                  <p className="text-2xl font-black text-[#1A1F36] mt-2">₹{Number(prog.finalPrice).toLocaleString('en-IN')}</p>
                  <p className="text-xs text-[#8896A4] font-semibold">₹{Number(prog.monthlyEquivalent).toLocaleString('en-IN')} / mo</p>
                  <p className="mt-3 text-xs text-[#40516A] leading-relaxed">{prog.description || `${prog.durationMonths} monthly treatment cycles provisioned.`}</p>
                </div>

                <button
                  type="button"
                  onClick={() => handlePlanSelect(prog)}
                  disabled={upgrading}
                  className="mt-5 w-full rounded-xl bg-[#1A1F36] py-2.5 text-xs font-bold text-white transition hover:bg-[#C4622D] disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2"
                >
                  {upgrading ? (
                    <>
                      <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                      <span>Processing...</span>
                    </>
                  ) : (
                    <span>Select {prog.name}</span>
                  )}
                </button>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
