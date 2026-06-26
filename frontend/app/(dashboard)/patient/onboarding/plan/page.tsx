'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Check, X, ArrowRight, ShieldCheck, Stethoscope,
  HeartPulse, Salad, Dumbbell, MessageSquare, FlaskConical,
  UserCheck, Star, Zap
} from 'lucide-react'
import { supabase } from '@/lib/supabaseClient'
import { authedFetch } from '@/lib/apiClient'
import { motion, AnimatePresence } from 'framer-motion'

// ─────────────────────────────────────────────────────────────────────────────
// Feature data
// ─────────────────────────────────────────────────────────────────────────────
const featureGroups = [
  {
    category: 'Medical',
    icon: Stethoscope,
    items: [
      { name: 'Doctor consultations',       silver: '1×/month',          gold: '2×/month (bi-weekly)' },
      { name: 'GLP-1 prescription',         silver: true,                gold: true },
      { name: 'Pharmacy doorstep delivery', silver: true,                gold: true },
      { name: 'Lab report review',          silver: false,               gold: 'Quarterly blood panel' },
    ],
  },
  {
    category: 'Nutrition & Fitness',
    icon: Salad,
    items: [
      { name: 'Dietitian sessions',         silver: false,               gold: 'Weekly 1:1' },
      { name: 'Personalised meal plan',     silver: false,               gold: true },
      { name: 'Fitness trainer check-ins',  silver: false,               gold: 'Bi-weekly' },
      { name: 'Workout programme',          silver: false,               gold: true },
    ],
  },
  {
    category: 'Support',
    icon: MessageSquare,
    items: [
      { name: 'Chat support',              silver: 'Basic (48h)',         gold: 'Priority (24h)' },
      { name: 'Care coordinator',          silver: false,                 gold: true },
      { name: 'Group wellness meets',      silver: false,                 gold: 'Monthly live session' },
    ],
  },
]

const PLANS = [
  {
    id: 'Silver Plan',
    name: 'Silver',
    icon: Zap,
    price: '₹999',
    period: '/mo',
    tagline: 'Essential medical care',
    color: '#5C7A6B',
    accentBg: 'rgba(92,122,107,0.08)',
    description: 'Doctor-supervised GLP-1 therapy with pharmacy delivery. Everything you need to get started.',
  },
  {
    id: 'Gold Plan',
    name: 'Gold',
    icon: Star,
    price: '₹1,999',
    period: '/mo',
    tagline: 'All-inclusive wellness',
    color: '#C4622D',
    accentBg: 'rgba(196,98,45,0.08)',
    recommended: true,
    description: 'Full medical program plus dedicated dietitian, fitness trainer, and priority support.',
  },
]

function Cell({ val, color }: { val: boolean | string; color: string }) {
  if (val === true)  return <Check  size={17} strokeWidth={2.5} style={{ color }} className="mx-auto" />
  if (val === false) return <X      size={15} strokeWidth={2}   className="mx-auto text-[#CBD5E0]" />
  return <span className="text-[11px] font-semibold leading-snug text-center" style={{ color }}>{val}</span>
}

export default function PlanSelectionPage() {
  const router = useRouter()
  const [selected, setSelected] = useState<string>('Gold Plan')
  const [saving, setSaving] = useState(false)

  const selectedPlan = PLANS.find(p => p.id === selected)!

  const handleContinue = async () => {
    setSaving(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.push('/login'); return }

      const response = await authedFetch('/api/plan', {
        method: 'POST',
        body: JSON.stringify({
          membershipTier: selected
        })
      })

      const resData = await response.json()
      if (!response.ok) {
        throw new Error(resData.error || 'Failed to save plan selection.')
      }

      router.replace('/membership-payment')
    } catch (err: any) {
      alert('Error saving plan: ' + err.message)
      setSaving(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#F5F0EB] flex flex-col lg:flex-row font-sans">

      {/* ═══ LEFT — Dark hero panel ═══════════════════════════════════════════ */}
      <motion.aside
        initial={{ opacity: 0, x: -24 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.55 }}
        className="lg:w-[40%] xl:w-[36%] bg-[#1A1F36] relative overflow-hidden flex flex-col justify-between p-8 lg:p-12"
      >
        {/* Glow blobs */}
        <div className="absolute -top-20 -right-20 w-72 h-72 bg-[#C4622D]/12 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-20 -left-20 w-56 h-56 bg-[#5C7A6B]/12 rounded-full blur-3xl pointer-events-none" />

        {/* Logo */}
        <div className="relative z-10">
          <img src="/images/logo loss.png" alt="8Liv"
            className="h-9 w-auto object-contain brightness-0 invert opacity-90" />
        </div>

        {/* Hero text */}
        <div className="relative z-10 space-y-6 mt-10 lg:mt-0">
          <div>
            <span className="text-[#C4622D] text-[10px] font-black uppercase tracking-[0.25em]">
              Step 1 of 2 — Choose your plan
            </span>
            <h1 className="mt-4 text-4xl xl:text-5xl font-bold font-sora text-white leading-[1.15]">
              Your weight loss<br />
              <span className="text-[#C4622D]">starts today.</span>
            </h1>
            <p className="mt-4 text-white/55 text-sm leading-relaxed max-w-xs">
              Join 10,000+ members on India's first doctor-supervised GLP-1 weight loss program — 100% from home.
            </p>
          </div>

          {/* Stats row */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { val: '10K+',   label: 'Active members' },
              { val: '15–20%', label: 'Avg weight loss' },
              { val: '98%',    label: 'Satisfaction' },
            ].map(s => (
              <div key={s.val} className="bg-white/5 rounded-2xl p-3.5 text-center">
                <p className="text-white font-extrabold text-base font-sora">{s.val}</p>
                <p className="text-white/40 text-[10px] font-medium mt-0.5 leading-snug">{s.label}</p>
              </div>
            ))}
          </div>

          {/* Trust signals */}
          <div className="space-y-3">
            {[
              { icon: ShieldCheck, title: 'HIPAA Compliant',    sub: 'Encrypted & secure data' },
              { icon: Stethoscope, title: 'Licensed Doctors',   sub: 'Board-certified physicians' },
              { icon: HeartPulse,  title: 'Clinically Proven',  sub: 'GLP-1 protocols with results' },
            ].map(({ icon: Icon, title, sub }) => (
              <div key={title} className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-white/8 flex items-center justify-center shrink-0">
                  <Icon size={16} className="text-[#C4622D]" />
                </div>
                <div>
                  <p className="text-white text-xs font-bold">{title}</p>
                  <p className="text-white/45 text-[10px] font-medium">{sub}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Testimonial */}
          <div className="bg-white/6 border border-white/10 rounded-2xl p-4">
            <p className="text-white/75 text-xs italic leading-relaxed">
              "Lost 18 kg in 5 months. My doctor adjusted my medication every step — I never felt alone."
            </p>
            <div className="flex items-center gap-2.5 mt-3">
              <div className="w-7 h-7 rounded-full bg-[#C4622D]/30 flex items-center justify-center text-[10px] font-bold text-[#C4622D]">P</div>
              <div>
                <p className="text-white text-[11px] font-bold">Priya M. · Gold member</p>
                <p className="text-white/35 text-[9px]">Mumbai · GLP-1 program</p>
              </div>
            </div>
          </div>
        </div>

        <p className="text-white/20 text-[10px] relative z-10 mt-6">© 2026 8Liv Health Technologies Pvt. Ltd.</p>
      </motion.aside>

      {/* ═══ RIGHT — Plan chooser ══════════════════════════════════════════════ */}
      <motion.main
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, delay: 0.12 }}
        className="flex-1 overflow-y-auto p-6 sm:p-8 lg:p-10 xl:p-14"
      >
        <div className="max-w-2xl mx-auto">

          <div className="mb-7">
            <h2 className="text-2xl font-bold font-sora text-[#1A1F36]">Choose your membership</h2>
            <p className="text-[#8896A4] text-sm mt-1">Select the plan that matches your health goals.</p>
          </div>

          {/* ── Plan toggle cards ── */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
            {PLANS.map((plan) => {
              const isSelected = selected === plan.id
              const Icon = plan.icon
              return (
                <motion.button
                  key={plan.id}
                  onClick={() => setSelected(plan.id)}
                  whileTap={{ scale: 0.98 }}
                  className="relative text-left w-full rounded-2xl p-5 border-2 transition-all focus:outline-none"
                  style={{
                    borderColor: isSelected ? plan.color : 'rgba(26,31,54,0.1)',
                    background: isSelected ? plan.accentBg : 'white',
                    boxShadow: isSelected ? `0 8px 30px ${plan.color}20` : '0 2px 12px rgba(26,31,54,0.05)',
                  }}
                >
                  {plan.recommended && (
                    <span className="absolute -top-3 left-4 bg-[#C4622D] text-white text-[9px] font-black uppercase tracking-widest px-3 py-1 rounded-full">
                      Most Popular
                    </span>
                  )}

                  {/* Top row */}
                  <div className="flex items-start justify-between mb-3">
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: plan.accentBg }}>
                      <Icon size={18} style={{ color: plan.color }} />
                    </div>
                    {/* Radio dot */}
                    <div className="w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all mt-0.5"
                      style={isSelected
                        ? { borderColor: plan.color, background: plan.color }
                        : { borderColor: '#CBD5E0', background: 'transparent' }}>
                      {isSelected && <Check size={10} className="text-white" strokeWidth={3} />}
                    </div>
                  </div>

                  <p className="font-bold text-lg text-[#1A1F36] font-sora">{plan.name}</p>
                  <p className="text-xs text-[#8896A4] font-medium mb-3">{plan.tagline}</p>

                  <div className="flex items-end gap-0.5">
                    <span className="text-3xl font-extrabold font-sora" style={{ color: plan.color }}>{plan.price}</span>
                    <span className="text-[#8896A4] text-xs mb-1 ml-0.5">{plan.period}</span>
                  </div>

                  <p className="text-[11px] text-[#8896A4] leading-relaxed mt-2 font-medium">{plan.description}</p>
                </motion.button>
              )
            })}
          </div>

          {/* ── Feature comparison table ── */}
          <div className="bg-white rounded-2xl border border-[#1A1F36]/8 shadow-sm overflow-hidden mb-8">

            {/* Header */}
            <div className="grid grid-cols-[1fr_120px_120px] bg-[#1A1F36] text-white">
              <div className="px-5 py-4 text-xs font-black uppercase tracking-wider text-white/50">Features</div>
              {PLANS.map(p => (
                <div key={p.id}
                  className="px-3 py-4 text-center text-xs font-black uppercase tracking-wider"
                  style={{ color: p.id === selected ? p.color : 'rgba(255,255,255,0.45)' }}>
                  {p.name}
                </div>
              ))}
            </div>

            {/* Feature groups */}
            {featureGroups.map((group, gi) => {
              const GIcon = group.icon
              return (
                <div key={gi}>
                  {/* Category row */}
                  <div className="grid grid-cols-[1fr_120px_120px] bg-[#F5F0EB] border-y border-[#1A1F36]/6">
                    <div className="px-5 py-2.5 flex items-center gap-2">
                      <GIcon size={12} className="text-[#C4622D]" />
                      <span className="text-[9px] font-black uppercase tracking-[0.18em] text-[#C4622D]">{group.category}</span>
                    </div>
                    <div /><div />
                  </div>

                  {/* Feature rows */}
                  {group.items.map((feat, fi) => (
                    <div key={fi} className="grid grid-cols-[1fr_120px_120px] border-b border-[#1A1F36]/5 last:border-0 hover:bg-[#F5F0EB]/50 transition-colors">
                      <div className="px-5 py-3.5 text-xs font-medium text-[#1A1F36]">{feat.name}</div>
                      <div className="px-3 py-3.5 flex items-center justify-center">
                        <Cell val={feat.silver} color={PLANS[0].color} />
                      </div>
                      <div className="px-3 py-3.5 flex items-center justify-center">
                        <Cell val={feat.gold} color={PLANS[1].color} />
                      </div>
                    </div>
                  ))}
                </div>
              )
            })}
          </div>

          {/* ── CTA ── */}
          <div className="space-y-3">
            <button
              onClick={handleContinue}
              disabled={saving}
              className="w-full py-4 rounded-full font-bold text-sm text-white flex items-center justify-center gap-2 transition-all shadow-lg disabled:opacity-50"
              style={{
                background: selectedPlan.color,
                boxShadow: `0 8px 24px ${selectedPlan.color}35`,
              }}
            >
              {saving
                ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                : <><span>Continue with {selectedPlan.name} Plan</span><ArrowRight size={16} /></>}
            </button>
            <p className="text-center text-[11px] text-[#8896A4] font-medium">
              No lock-in. Cancel or upgrade anytime from Billing.
            </p>
          </div>

        </div>
      </motion.main>
    </div>
  )
}
