'use client'

import React, { useState } from 'react'
import { CheckCircle2, Download, CreditCard, ChevronRight } from 'lucide-react'
import { usePatientData } from '@/hooks/usePatientData'
import { supabase } from '@/lib/supabaseClient'

export default function BillingPage() {
  const { assessment, reloadData } = usePatientData()
  const [upgrading, setUpgrading] = useState(false)

  const activePlan = assessment?.membership_tier || 'Silver Plan'

  const handleUpgradePlan = async (planName: string) => {
    setUpgrading(true)
    // Simulate Razorpay transaction checkout sequence
    await new Promise(resolve => setTimeout(resolve, 1500))

    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return

      const { error } = await supabase
        .from('health_assessments')
        .update({
          membership_tier: planName
        })
        .eq('patient_id', session.user.id)

      if (error) throw error

      alert(`Successfully upgraded to ${planName}! 🎉`)
      reloadData()
    } catch (err: any) {
      alert("Upgrade failed: " + err.message)
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
        <h2 className="text-xl font-bold font-sora">Billing & Membership</h2>
        <p className="text-xs text-[#8896A4] font-medium">Manage active subscriptions, invoices, and billing configurations.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Current Active Plan (col-span-2) */}
        <div className="lg:col-span-2 bg-[#1A1F36] rounded-2xl p-6 text-white border border-white/5 relative overflow-hidden select-none">
          <div className="absolute top-0 right-0 w-44 h-44 bg-[#C4622D]/10 rounded-full blur-2xl pointer-events-none" />
          <div className="space-y-6 relative z-10">
            <div className="flex justify-between items-start">
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-white/50">Current Membership</span>
                <h3 className="text-2xl font-bold font-sora mt-1">{activePlan}</h3>
              </div>
              <span className="bg-[#C4622D]/20 text-[#C4622D] text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-wider border border-[#C4622D]/30">
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
                  <CheckCircle2 className="w-4 h-4 text-[#C4622D] shrink-0" />
                  <span>1:1 Doctor Consultations</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-[#C4622D] shrink-0" />
                  <span>Clinical Pharmacy Prescriptions</span>
                </div>
                {activePlan === 'Gold Plan' && (
                  <>
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-[#C4622D] shrink-0" />
                      <span>Dedicated Dietitian Coaching</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-[#C4622D] shrink-0" />
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
        <div className="lg:col-span-1 bg-white rounded-2xl p-5 border border-[#1A1F36]/6 shadow-[0_2px_12px_rgba(26,31,54,0.08)] flex flex-col justify-between">
          <div className="space-y-4">
            <h3 className="font-bold text-base font-sora border-b border-[#1A1F36]/8 pb-3">Invoice History</h3>
            
            <div className="divide-y divide-[#1A1F36]/5">
              {invoices.map((inv, idx) => (
                <div key={idx} className="flex justify-between items-center py-3">
                  <div>
                    <h4 className="text-xs font-bold leading-snug">{inv.desc}</h4>
                    <p className="text-[9px] text-[#8896A4] font-semibold mt-0.5">{inv.date}</p>
                  </div>
                  
                  <div className="flex items-center gap-3 shrink-0">
                    <span className="text-xs font-black">{inv.amount}</span>
                    <button 
                      onClick={() => alert("Downloading PDF Invoice...")}
                      className="p-1.5 hover:bg-[#F5F0EB] text-[#C4622D] rounded-lg border border-[#1A1F36]/12 transition-all cursor-pointer"
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
            className="w-full text-center border border-[#1A1F36]/12 text-[#1A1F36] hover:bg-[#1A1F36]/4 text-xs font-bold uppercase tracking-wider py-3 rounded-xl transition-colors cursor-pointer mt-4"
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
            return (
              <div 
                key={p.name}
                className={`bg-white rounded-[2rem] p-6 border flex flex-col justify-between space-y-6 shadow-sm hover:shadow-md transition-all relative ${
                  isCurrent 
                    ? 'ring-2 ring-[#C4622D] border-transparent' 
                    : 'border-[#1A1F36]/6'
                }`}
              >
                {isCurrent && (
                  <span className="absolute -top-3 left-6 bg-[#C4622D] text-white text-[9px] font-black uppercase tracking-wider px-3 py-1 rounded-full shadow-sm">
                    Current Choice
                  </span>
                )}
                
                <div className="space-y-4">
                  <div>
                    <h4 className="text-base font-bold font-sora leading-tight">{p.name}</h4>
                    <p className="text-[#C4622D] text-lg font-black font-sora mt-1.5">{p.price}</p>
                    <p className="text-[11px] text-[#8896A4] leading-relaxed mt-2 font-medium">{p.desc}</p>
                  </div>

                  <hr className="border-[#1A1F36]/8" />

                  <ul className="space-y-2 text-xs font-semibold text-[#8896A4]">
                    {p.features.map(f => (
                      <li key={f} className="flex items-start gap-2">
                        <CheckCircle2 className="w-4 h-4 text-[#C4622D] shrink-0 mt-0.5" />
                        <span className="text-[#1A1F36]">{f}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="pt-2">
                  {isCurrent ? (
                    <div className="w-full bg-[#1A1F36] text-white text-center rounded-xl py-3 text-xs font-bold uppercase tracking-wider select-none">
                      Active Subscription
                    </div>
                  ) : (
                    <button
                      onClick={() => handleUpgradePlan(p.name)}
                      disabled={upgrading}
                      className="w-full border border-[#C4622D] hover:bg-[#C4622D] hover:text-white text-[#C4622D] text-center rounded-xl py-3 text-xs font-bold uppercase tracking-wider transition-all cursor-pointer disabled:opacity-50"
                    >
                      {upgrading ? "Contacting Sandbox..." : "Upgrade Plan"}
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
