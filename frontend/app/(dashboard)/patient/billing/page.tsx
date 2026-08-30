'use client'

import React, { useState } from 'react'
import { CheckCircle2, Download, CreditCard, ChevronRight } from 'lucide-react'
import { usePatientData } from '@/hooks/usePatientData'
import { supabase } from '@/lib/supabaseClient'

export default function BillingPage() {
  const { assessment, reloadData, loading } = usePatientData()
  const [upgrading, setUpgrading] = useState(false)

  if (loading) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center text-[#C4622D]">
        <div className="w-10 h-10 border-4 border-current border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  const rawTier = String(assessment?.membership_tier || '').toLowerCase()
  const isGold = rawTier.includes('gold')
  const activePlan = isGold ? 'Gold Plan' : 'Silver Plan'

  const handlePlanChange = async (planName: string) => {
    setUpgrading(true)
    // Simulate Razorpay transaction checkout sequence
    await new Promise(resolve => setTimeout(resolve, 1500))

    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return

      const res = await fetch('/api/payment/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          patientId: session.user.id,
          paymentType: 'membership',
          membershipTier: planName,
          amount: planName === 'Silver Plan' ? 999 : 1999,
          paymentMethod: 'upi',
          razorpay_order_id: 'order_mock_' + Math.floor(Math.random() * 100000),
          razorpay_payment_id: 'pay_mock_' + Date.now(),
          razorpay_signature: 'mock_signature'
        })
      })

      const result = await res.json()
      if (!res.ok || result.error) {
        throw new Error(result.error || `Failed to switch to ${planName}.`)
      }

      alert(`Successfully updated membership to ${planName}! 🎉`)
      reloadData()
    } catch (err: any) {
      alert("Plan update failed: " + err.message)
    } finally {
      setUpgrading(false)
    }
  }

  const invoices = [
    { date: 'June 01, 2026', desc: `${activePlan} Subscription`, amount: activePlan === 'Silver Plan' ? '₹999' : '₹1,999', status: 'Paid' },
    { date: 'May 15, 2026', desc: 'Medical Consultation Fee', amount: '₹499', status: 'Paid' }
  ]

  const plans = [
    {
      name: 'Silver Plan',
      tier: 'silver',
      price: '₹999/mo',
      desc: 'Essential medical weight loss supervision & pharmacy prescriptions.',
      features: [
        '1:1 doctor consultations',
        'Clinical pharmacy prescriptions',
        'Basic chat support'
      ]
    },
    {
      name: 'Gold Plan',
      tier: 'gold',
      price: '₹1,999/mo',
      desc: 'All-inclusive medical, nutrition, and fitness coaching with regular check-ins.',
      features: [
        '1:1 doctor consultations',
        'Clinical pharmacy prescriptions',
        'Dedicated dietitian coaching',
        'Dedicated fitness trainer check-ins',
        'Regular meets & scheduling slots'
      ]
    }
  ]

  return (
    <div className="space-y-6 text-[#1A1F36]">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold font-sora">Billing &amp; Membership</h2>
        <p className="text-xs text-[#8896A4] font-medium">Manage active subscriptions, invoices, and billing configurations.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Current Active Plan (col-span-2) */}
        <div className="lg:col-span-2 bg-[#0B1120] rounded-2xl p-6 text-white border border-white/5 relative overflow-hidden select-none">
          <div className="absolute top-0 right-0 w-44 h-44 bg-[#0D9488]/15 rounded-full blur-2xl pointer-events-none" />
          <div className="space-y-6 relative z-10">
            <div className="flex justify-between items-start">
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-white/50">Current Membership</span>
                <h3 className="text-2xl font-bold font-sora mt-1">{activePlan}</h3>
              </div>
              <span className="bg-[#0D9488]/20 text-[#5EEAD4] text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-wider border border-[#0D9488]/40">
                Active
              </span>
            </div>

            <div className="space-y-1">
              <span className="text-[10px] font-black uppercase tracking-wider text-white/50">Price</span>
              <p className="text-3xl font-extrabold font-sora">
                {activePlan === 'Silver Plan' ? '₹999' : '₹1,999'}{' '}
                <span className="text-sm font-normal text-white/60">/ month</span>
              </p>
            </div>

            <div className="border-t border-white/10 pt-4 space-y-2.5">
              <p className="text-xs font-bold text-white/70">Plan Inclusions:</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-white/80">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-[#5EEAD4] shrink-0" />
                  <span>1:1 Doctor Consultations</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-[#5EEAD4] shrink-0" />
                  <span>Clinical Pharmacy Prescriptions</span>
                </div>
                {activePlan === 'Gold Plan' && (
                  <>
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-[#5EEAD4] shrink-0" />
                      <span>Dedicated Dietitian Coaching</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-[#5EEAD4] shrink-0" />
                      <span>Dedicated Fitness Check-ins</span>
                    </div>
                  </>
                )}
              </div>
            </div>

            <div className="flex items-center justify-between text-xs text-white/50 border-t border-white/10 pt-4">
              <span>Next Invoice: <strong>July 01, 2026</strong></span>
            </div>
          </div>
        </div>

        {/* Right: Payment History */}
        <div className="lg:col-span-1 bg-white rounded-2xl p-5 border border-slate-200 shadow-xs flex flex-col justify-between">
          <div className="space-y-4">
            <h3 className="font-bold text-base font-sora border-b border-slate-100 pb-3">Invoice History</h3>
            
            <div className="divide-y divide-slate-100">
              {invoices.map((inv, idx) => (
                <div key={idx} className="flex justify-between items-center py-3">
                  <div>
                    <h4 className="text-xs font-bold leading-snug">{inv.desc}</h4>
                    <p className="text-[9px] text-slate-400 font-semibold mt-0.5">{inv.date}</p>
                  </div>
                  
                  <div className="flex items-center gap-3 shrink-0">
                    <span className="text-xs font-black">{inv.amount}</span>
                    <button 
                      onClick={() => alert("Downloading PDF Invoice...")}
                      className="p-1.5 hover:bg-slate-100 text-[#0D9488] rounded-lg border border-slate-200 transition-all cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
          
          <button 
            onClick={() => alert("All historic invoices downloaded.")}
            className="w-full text-center border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-bold uppercase tracking-wider py-3 rounded-xl transition-colors cursor-pointer mt-4"
          >
            Download All Receipts
          </button>
        </div>
      </div>

      {/* Plan comparison and upgrades */}
      <div className="space-y-4 pt-4">
        <h3 className="font-bold text-base font-sora">Available Memberships</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl">
          {plans.map((p) => {
            const isCurrent = activePlan === p.name
            const isUpgrade = !isCurrent && p.name === 'Gold Plan'
            return (
              <div 
                key={p.name}
                className={`bg-white rounded-[2rem] p-6 border flex flex-col justify-between space-y-6 shadow-sm hover:shadow-md transition-all relative ${
                  isCurrent 
                    ? 'ring-2 ring-[#0D9488] border-transparent' 
                    : 'border-slate-200'
                }`}
              >
                {isCurrent && (
                  <span className="absolute -top-3 left-6 bg-[#0D9488] text-white text-[9px] font-black uppercase tracking-wider px-3 py-1 rounded-full shadow-sm font-sora">
                    Current Plan
                  </span>
                )}
                
                <div className="space-y-4">
                  <div>
                    <h4 className="text-base font-bold font-sora leading-tight">{p.name}</h4>
                    <p className="text-[#0D9488] text-lg font-black font-sora mt-1.5">{p.price}</p>
                    <p className="text-[11px] text-slate-500 leading-relaxed mt-2 font-medium">{p.desc}</p>
                  </div>

                  <hr className="border-slate-100" />

                  <ul className="space-y-2 text-xs font-semibold text-slate-500">
                    {p.features.map(f => (
                      <li key={f} className="flex items-start gap-2">
                        <CheckCircle2 className="w-4 h-4 text-[#0D9488] shrink-0 mt-0.5" />
                        <span className="text-slate-800">{f}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="pt-2">
                  {isCurrent ? (
                    <div className="w-full bg-[#0B1120] text-white text-center rounded-xl py-3 text-xs font-bold uppercase tracking-wider select-none font-sora">
                      Active Subscription
                    </div>
                  ) : (
                    <button
                      onClick={() => handlePlanChange(p.name)}
                      disabled={upgrading}
                      className={`w-full text-center rounded-xl py-3 text-xs font-bold uppercase tracking-wider transition-all cursor-pointer disabled:opacity-50 font-sora ${
                        isUpgrade
                          ? 'bg-[#0D9488] hover:bg-[#097A70] text-white shadow-md shadow-[#0D9488]/20'
                          : 'border border-slate-300 hover:bg-slate-100 text-slate-700'
                      }`}
                    >
                      {upgrading ? "Processing..." : isUpgrade ? "Upgrade to Gold Plan" : "Switch to Silver Plan"}
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
