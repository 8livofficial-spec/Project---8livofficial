'use client'

import React from 'react'
import ScrollMask from '@/components/ui/scroll-mask'
import { Sparkles, ShieldCheck, Activity } from 'lucide-react'

export function ScrollMaskSection() {
  return (
    <section className="relative bg-white py-16 sm:py-24 overflow-hidden border-b border-[#0D9488]/15">

      {/* Background Subtle Ambient Glow */}
      <div className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[500px] bg-[#0D9488]/5 rounded-full blur-[150px] -z-0" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center">
        {/* Section Header */}
        <div className="max-w-3xl mx-auto mb-10 text-center">
          <div className="inline-flex items-center gap-2.5 px-4 py-1.5 rounded-full bg-white border border-[#0D9488]/20 mb-4 shadow-xs">
            <Sparkles className="w-3.5 h-3.5 text-[#0D9488]" />
            <span className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#0F766E] font-sora">
              CLINICAL DISCOVERY
            </span>
          </div>

          <h2 className="font-sora text-3xl sm:text-4xl md:text-5xl font-bold text-[#0F172A] leading-tight mb-3">
            See your metabolic <span className="teal-gradient-text">transformation unfold.</span>
          </h2>
          <p className="text-sm sm:text-base md:text-lg text-[#475569] font-light leading-relaxed max-w-xl mx-auto">
            Scroll to open the clinical lens — board-certified care, biomarker precision, and long-term compliance.
          </p>
        </div>

        {/* Scroll Mask Interactive Component */}
        <ScrollMask
          image="/images/hero_wellness.png"
          title="Physician-Guided Weight Management"
          subtitle="Combining evidence-based GLP-1 therapy with adaptive Indian nutritional pacing for lasting biological weight loss."
          badge="8LIV CLINICAL PROTOCOL"
          maskShape="aperture"
          minScale={25}
          maxScale={100}
        />

        {/* Highlight Stats Strip */}
        <div className="max-w-4xl mx-auto grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6 mt-8">
          <div className="bg-white rounded-2xl p-5 border border-[#0D9488]/15 shadow-sm text-center">
            <div className="inline-flex items-center justify-center w-9 h-9 rounded-xl bg-[#0D9488]/10 text-[#0D9488] mb-3">
              <ShieldCheck size={18} />
            </div>
            <h4 className="text-sm font-bold text-[#0F172A] font-sora">Board-Certified Doctors</h4>
            <p className="text-xs text-[#475569] font-sora mt-1">1-on-1 monthly video consults</p>
          </div>

          <div className="bg-white rounded-2xl p-5 border border-[#0D9488]/15 shadow-sm text-center">
            <div className="inline-flex items-center justify-center w-9 h-9 rounded-xl bg-[#0D9488]/10 text-[#0D9488] mb-3">
              <Activity size={18} />
            </div>
            <h4 className="text-sm font-bold text-[#0F172A] font-sora">Biomarker Pacing</h4>
            <p className="text-xs text-[#475569] font-sora mt-1">Continuous metabolic monitoring</p>
          </div>

          <div className="bg-white rounded-2xl p-5 border border-[#0D9488]/15 shadow-sm text-center">
            <div className="inline-flex items-center justify-center w-9 h-9 rounded-xl bg-[#0D9488]/10 text-[#0D9488] mb-3">
              <Sparkles size={18} />
            </div>
            <h4 className="text-sm font-bold text-[#0F172A] font-sora">15%+ Average Loss</h4>
            <p className="text-xs text-[#475569] font-sora mt-1">Clinically proven GLP-1 outcomes</p>
          </div>
        </div>
      </div>
    </section>
  )
}

export default ScrollMaskSection
