'use client'

import React from 'react'
import Link from 'next/link'
import { Sparkles, CheckCircle2, Crown, ShieldCheck, ArrowRight, Zap } from 'lucide-react'
import ShaderCard from '@/components/ui/shader-card'

export default function PricingShaderCards() {
  return (
    <section className="relative py-20 sm:py-28 bg-white text-[#0F172A] overflow-hidden border-t border-slate-200">
      {/* Background Orbs */}
      <div className="absolute top-0 right-1/3 w-96 h-96 bg-[#0D9488]/10 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute bottom-0 left-1/3 w-96 h-96 bg-amber-500/10 rounded-full blur-[140px] pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-14 sm:mb-18">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white border border-[#0D9488]/20 text-[#0F766E] text-xs font-semibold uppercase tracking-widest mb-4 shadow-xs">
            <Sparkles className="w-4 h-4 text-[#0D9488]" />
            <span>8liv Membership Plans</span>
          </div>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tight text-[#0F172A] font-sora">
            Select Your <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#0D9488] to-[#0F766E]">Care Protocol</span>
          </h2>
          <p className="mt-4 text-[#475569] text-base md:text-lg leading-relaxed font-light">
            Doctor-led medical weight management with dedicated dietitian support. Choose the membership level that fits your goals.
          </p>
        </div>

        {/* 2-Column Pricing Cards Grid (Silver & Gold) */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 max-w-5xl mx-auto">
          {/* SILVER CARE PLAN */}
          <ShaderCard colorTheme="silver" className="flex flex-col justify-between p-8 sm:p-10 bg-white border border-[#0D9488]/20 shadow-xl rounded-3xl">
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#0D9488]/10 text-[#0F766E] border border-[#0D9488]/30 text-xs font-bold font-sora uppercase tracking-wider">
                  <ShieldCheck className="w-3.5 h-3.5 text-[#0D9488]" />
                  <span>Silver Protocol</span>
                </div>
                <span className="text-xs text-[#475569] font-medium">Standard Care</span>
              </div>

              <h3 className="text-2xl sm:text-3xl font-extrabold text-[#0F172A] font-sora mb-2">
                Essential Care
              </h3>
              <p className="text-xs sm:text-sm text-[#475569] font-light mb-6">
                Complete clinical assessment, medical prescription, and foundational dietitian guidance.
              </p>

              <div className="flex items-baseline gap-1.5 mb-8 pb-6 border-b border-slate-200">
                <span className="text-4xl sm:text-5xl font-black text-[#0F172A] font-sora">₹2,999</span>
                <span className="text-sm text-[#475569] font-medium">/ month</span>
              </div>

              {/* Feature List */}
              <div className="space-y-3.5 mb-8">
                <div className="flex items-start gap-3 text-xs sm:text-sm text-[#0F172A]">
                  <CheckCircle2 className="w-4 h-4 text-[#0D9488] shrink-0 mt-0.5" />
                  <span>Licensed Physician Video Consultations</span>
                </div>
                <div className="flex items-start gap-3 text-xs sm:text-sm text-[#0F172A]">
                  <CheckCircle2 className="w-4 h-4 text-[#0D9488] shrink-0 mt-0.5" />
                  <span>Custom High-Protein Indian Meal Blueprint</span>
                </div>
                <div className="flex items-start gap-3 text-xs sm:text-sm text-[#0F172A]">
                  <CheckCircle2 className="w-4 h-4 text-[#0D9488] shrink-0 mt-0.5" />
                  <span>GLP-1 Prescription & Dosing Guidance</span>
                </div>
                <div className="flex items-start gap-3 text-xs sm:text-sm text-[#0F172A]">
                  <CheckCircle2 className="w-4 h-4 text-[#0D9488] shrink-0 mt-0.5" />
                  <span>Bi-Weekly Dietitian Reviews & Check-ins</span>
                </div>
                <div className="flex items-start gap-3 text-xs sm:text-sm text-[#0F172A]">
                  <CheckCircle2 className="w-4 h-4 text-[#0D9488] shrink-0 mt-0.5" />
                  <span>Unified Patient Portal & Biomarker Tracker</span>
                </div>
              </div>
            </div>

            <Link
              href="/assessment"
              className="w-full inline-flex items-center justify-center gap-2 py-4 rounded-2xl bg-[#0D9488] hover:bg-[#097A70] text-white font-sora font-bold text-sm shadow-xl transition-all hover:scale-[1.02] cursor-pointer"
            >
              <span>Get Started with Silver</span>
              <ArrowRight className="w-4 h-4 text-white" />
            </Link>
          </ShaderCard>

          {/* GOLD VIP PLAN */}
          <ShaderCard colorTheme="gold" className="flex flex-col justify-between p-8 sm:p-10 relative bg-white border border-amber-500/30 shadow-2xl rounded-3xl">
            {/* Recommended Ribbon */}
            <div className="absolute -top-3 right-8 px-4 py-1 rounded-full bg-gradient-to-r from-amber-500 to-amber-600 text-white text-[10px] font-black font-sora uppercase tracking-widest shadow-lg flex items-center gap-1">
              <Zap className="w-3 h-3 fill-white" />
              <span>Most Popular</span>
            </div>

            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 text-amber-800 border border-amber-500/30 text-xs font-bold font-sora uppercase tracking-wider">
                  <Crown className="w-3.5 h-3.5 text-amber-600" />
                  <span>Gold VIP Protocol</span>
                </div>
                <span className="text-xs text-amber-700 font-bold">1-on-1 Priority</span>
              </div>

              <h3 className="text-2xl sm:text-3xl font-extrabold text-[#0F172A] font-sora mb-2">
                VIP Concierge Care
              </h3>
              <p className="text-xs sm:text-sm text-[#475569] font-light mb-6">
                Continuous priority doctor messaging, dedicated 1-on-1 dietitian coaching, and custom meal planning.
              </p>

              <div className="flex items-baseline gap-1.5 mb-8 pb-6 border-b border-slate-200">
                <span className="text-4xl sm:text-5xl font-black text-[#0F172A] font-sora">₹4,999</span>
                <span className="text-sm text-[#475569] font-medium">/ month</span>
              </div>

              {/* Feature List */}
              <div className="space-y-3.5 mb-8">
                <div className="flex items-start gap-3 text-xs sm:text-sm text-[#0F172A]">
                  <CheckCircle2 className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <span>Everything in Silver Protocol</span>
                </div>
                <div className="flex items-start gap-3 text-xs sm:text-sm text-[#0F172A]">
                  <CheckCircle2 className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <span>Unlimited 24/7 Priority Doctor Chat</span>
                </div>
                <div className="flex items-start gap-3 text-xs sm:text-sm text-[#0F172A]">
                  <CheckCircle2 className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <span>Weekly Dedicated Dietitian Coaching</span>
                </div>
                <div className="flex items-start gap-3 text-xs sm:text-sm text-[#0F172A]">
                  <CheckCircle2 className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <span>Doorstep GLP-1 Delivery Assistance</span>
                </div>
                <div className="flex items-start gap-3 text-xs sm:text-sm text-[#0F172A]">
                  <CheckCircle2 className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <span>VIP Milestone Weight Maintenance Plan</span>
                </div>
              </div>
            </div>

            <Link
              href="/assessment"
              className="w-full inline-flex items-center justify-center gap-2 py-4 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-sora font-bold text-sm shadow-xl transition-all hover:scale-[1.02] cursor-pointer"
            >
              <span>Get Started with Gold VIP</span>
              <ArrowRight className="w-4 h-4 text-white" />
            </Link>
          </ShaderCard>
        </div>
      </div>
    </section>
  )
}

