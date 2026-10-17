'use client'

import React from 'react'
import Link from 'next/link'
import { Check, ArrowRight, HeartPulse, Sparkles } from 'lucide-react'

export default function ScienceStory() {
  return (
    <section
      id="science-philosophy"
      aria-label="A Healthier Future, Guided by Science"
      className="py-20 sm:py-24 lg:py-28 bg-white border-b border-slate-200/80 overflow-hidden"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-center">
          
          {/* Left Column: Editorial Narrative & Mission Cards */}
          <div className="lg:col-span-6 flex flex-col items-start text-left">
            
            <h2 className="font-editorial text-3xl sm:text-4xl lg:text-5xl font-normal text-[#1A2D36] tracking-tight leading-tight mb-6">
              A Healthier Future,<br />
              <span className="italic">Guided by Science</span>
            </h2>

            {/* Bullet Highlights */}
            <div className="space-y-3 mb-8 w-full">
              <div className="flex items-center gap-3">
                <div className="w-5 h-5 rounded-full bg-teal-50 border border-teal-200 flex items-center justify-center text-[#0F766E] shrink-0">
                  <Check className="w-3 h-3 stroke-[3]" />
                </div>
                <span className="font-sans text-sm sm:text-base font-medium text-slate-800">
                  Your Health, Our Priority
                </span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-5 h-5 rounded-full bg-teal-50 border border-teal-200 flex items-center justify-center text-[#0F766E] shrink-0">
                  <Check className="w-3 h-3 stroke-[3]" />
                </div>
                <span className="font-sans text-sm sm:text-base font-medium text-slate-800">
                  Transforming Lives, Safely
                </span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-5 h-5 rounded-full bg-teal-50 border border-teal-200 flex items-center justify-center text-[#0F766E] shrink-0">
                  <Check className="w-3 h-3 stroke-[3]" />
                </div>
                <span className="font-sans text-sm sm:text-base font-medium text-slate-800">
                  Science-Backed Weight Loss
                </span>
              </div>
            </div>

            {/* Two Mini Mission Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full mb-8">
              <div className="rounded-2xl p-5 bg-[#FAFBF9] border border-slate-200/80">
                <div className="w-8 h-8 rounded-xl bg-teal-100/60 text-[#0F766E] flex items-center justify-center mb-3">
                  <HeartPulse className="w-4 h-4" />
                </div>
                <h3 className="font-sans font-bold text-xs sm:text-sm text-slate-900 mb-1">
                  Our Mission: Building Healthier Lives
                </h3>
                <p className="font-sans text-xs text-slate-500 leading-relaxed">
                  To provide safe, science-led weight management that restores long-term vitality.
                </p>
              </div>

              <div className="rounded-2xl p-5 bg-[#FAFBF9] border border-slate-200/80">
                <div className="w-8 h-8 rounded-xl bg-indigo-100/60 text-indigo-700 flex items-center justify-center mb-3">
                  <Sparkles className="w-4 h-4" />
                </div>
                <h3 className="font-sans font-bold text-xs sm:text-sm text-slate-900 mb-1">
                  Purpose Meets Science: Clinical Vision
                </h3>
                <p className="font-sans text-xs text-slate-500 leading-relaxed">
                  Physician-led protocols calibrated with regional Indian nutrition and biomarker reviews.
                </p>
              </div>
            </div>

            {/* Read More Action */}
            <Link
              href="/assessment"
              className="inline-flex items-center gap-2 px-6 py-3.5 rounded-full bg-[#1A2D36] hover:bg-[#122027] text-white font-sans font-semibold text-xs sm:text-sm shadow-md transition-all cursor-pointer"
            >
              <span>Read More</span>
              <ArrowRight className="w-4 h-4 text-emerald-400" />
            </Link>

          </div>

          {/* Right Column: 3-Photo Editorial Collage */}
          <div className="lg:col-span-6 grid grid-cols-12 gap-4 sm:gap-5 items-stretch">
            
            {/* Main Tall Photo */}
            <div className="col-span-7 rounded-3xl overflow-hidden shadow-lg border border-slate-200/80 aspect-[3/4] relative group">
              <img
                src="/images/reality_woman_wellness.jpg"
                alt="Patient smiling with energy and vitality"
                className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-700 ease-out"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950/30 via-transparent to-transparent pointer-events-none" />
              <div className="absolute bottom-4 left-4 right-4 bg-white/90 backdrop-blur-md rounded-xl p-3 border border-white/80 shadow-xs">
                <p className="text-[11px] font-sans font-semibold text-slate-800 leading-tight">
                  Sustainable metabolic baseline
                </p>
                <p className="text-[10px] text-slate-500 mt-0.5">Zero crash diets</p>
              </div>
            </div>

            {/* Two Stacked Photos on the Right */}
            <div className="col-span-5 flex flex-col gap-4 sm:gap-5">
              
              {/* Photo 1: Yoga/Movement */}
              <div className="rounded-3xl overflow-hidden shadow-md border border-slate-200/80 aspect-square relative group">
                <img
                  src="/images/transformation_2.png"
                  alt="Yoga wellness mobility"
                  className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-700 ease-out"
                />
              </div>

              {/* Photo 2: Running/Hydration */}
              <div className="rounded-3xl overflow-hidden shadow-md border border-slate-200/80 aspect-square relative group">
                <img
                  src="/images/outcome_1.png"
                  alt="Hydration and outdoor running"
                  className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-700 ease-out"
                />
              </div>

            </div>

          </div>

        </div>

      </div>
    </section>
  )
}
