'use client'

import React from 'react'
import ComparisonSlider from '@/components/ui/comparison-slider'
import CountUp from '@/components/ui/CountUp'

export default function Dashboard() {
  return (
    <section
      id="results"
      className="relative z-10 bg-transparent py-16 sm:py-24 overflow-hidden text-slate-900 border-b border-slate-200/80"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">

        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-12 sm:mb-16">
          <h2 className="font-sora text-3xl sm:text-4xl md:text-5xl font-bold text-slate-900 leading-tight mb-4">
            Visible progress with{' '}
            <span className="bg-gradient-to-r from-[#00A884] via-[#0D9488] to-[#0F766E] bg-clip-text text-transparent">
              physician-guided metabolic care.
            </span>
          </h2>

          <p className="text-sm sm:text-base md:text-lg text-slate-600 font-light max-w-2xl mx-auto leading-relaxed">
            Drag the handle to compare real body composition and metabolic health markers before and after doctor-supervised treatment.
          </p>
        </div>

        {/* Biometric Transformation Comparison Area with Alt Text Placeholders */}
        <div className="max-w-4xl mx-auto mb-12">
          <ComparisonSlider
            beforeImage=""
            afterImage=""
            beforeLabel="Initial Baseline"
            afterLabel="Clinical Protocol Outcome"
            beforeTagline="Initial Weight & Visceral Fat Baseline"
            afterTagline="-12.4 kg Weight Shift & Optimal Biomarkers"
            className="border border-slate-200 rounded-3xl overflow-hidden shadow-sm"
          />
        </div>

        {/* 3 Evidence-Based Metric Cards */}
        <div className="max-w-4xl mx-auto grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
          <div className="bg-[#FDFBF7] rounded-2xl p-6 border border-slate-200/80 text-center">
            <div className="font-sora text-3xl sm:text-4xl font-black text-[#00A884] mb-1">
              <CountUp to={15} duration={1.5} />%+
            </div>
            <h4 className="text-sm font-bold text-slate-900 font-sora">Average Weight Loss</h4>
            <p className="text-xs text-slate-600 mt-1 font-light">
              Clinically supported outcomes when paired with lifestyle guidance
            </p>
          </div>

          <div className="bg-[#FDFBF7] rounded-2xl p-6 border border-slate-200/80 text-center">
            <div className="font-sora text-3xl sm:text-4xl font-black text-[#00A884] mb-1">
              <CountUp to={85} duration={1.8} />%
            </div>
            <h4 className="text-sm font-bold text-slate-900 font-sora">Metabolic Health Marker Shift</h4>
            <p className="text-xs text-slate-600 mt-1 font-light">
              Significant improvements in fasting insulin and blood glucose
            </p>
          </div>

          <div className="bg-[#FDFBF7] rounded-2xl p-6 border border-slate-200/80 text-center">
            <div className="font-sora text-3xl sm:text-4xl font-black text-[#00A884] mb-1">
              <CountUp to={92} duration={2} />%
            </div>
            <h4 className="text-sm font-bold text-slate-900 font-sora">Care Adherence Rate</h4>
            <p className="text-xs text-slate-600 mt-1 font-light">
              Supported by continuous dietitian and fitness coach check-ins
            </p>
          </div>
        </div>

      </div>
    </section>
  )
}
