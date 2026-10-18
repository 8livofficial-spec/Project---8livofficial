'use client'

import React from 'react'
import Link from 'next/link'
import { ArrowRight, ClipboardCheck, Stethoscope, PackageCheck, Sparkles } from 'lucide-react'

export default function ProcessBento() {
  return (
    <section
      id="how-it-works"
      aria-label="The Process That Works"
      className="py-20 sm:py-24 lg:py-28 bg-[#FBFBF9] border-b border-slate-200/80"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 sm:mb-16 gap-6">
          <div className="max-w-xl">
            <h2 className="font-editorial text-3xl sm:text-4xl lg:text-5xl font-normal text-[#1A2D36] tracking-tight leading-tight mb-4">
              The Process That Works
            </h2>
            <p className="text-slate-600 font-sans text-base sm:text-lg leading-relaxed">
              Start with a simple quiz, receive expert physician guidance, and begin a personalized treatment designed for real, permanent results.
            </p>
          </div>
          <div>
            <Link
              href="/assessment"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-white hover:bg-slate-100 text-slate-800 font-sans font-semibold text-xs sm:text-sm border border-slate-200 shadow-xs hover:shadow-md transition-all cursor-pointer"
            >
              <span>Explore More</span>
              <ArrowRight className="w-4 h-4 text-slate-600" />
            </Link>
          </div>
        </div>

        {/* 6-Tile Bento Grid (Matching User Reference Image) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-7">
          
          {/* Tile 1: Photo of Real Licensed Clinician */}
          <div className="relative rounded-3xl overflow-hidden aspect-[4/3] md:aspect-auto md:min-h-[290px] shadow-sm border border-slate-200/80 group">
            <img
              src="/images/card_doctor.png"
              alt="Licensed physician consultation"
              className="w-full h-full object-cover object-top group-hover:scale-105 transition-transform duration-700 ease-out"
              onError={(e) => {
                e.currentTarget.src = '/images/hero_indian.png'
              }}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950/40 via-transparent to-transparent pointer-events-none" />
            <div className="absolute bottom-4 left-4 right-4 text-white text-xs font-sans font-medium drop-shadow-sm">
              Board-Certified Telehealth Care
            </div>
          </div>

          {/* Tile 2: Card - Quick Health Quiz */}
          <div className="rounded-3xl bg-white p-7 sm:p-8 border border-slate-200/80 shadow-xs hover:shadow-md transition-shadow flex flex-col justify-between">
            <div>
              <div className="w-10 h-10 rounded-2xl bg-teal-50 border border-teal-100 flex items-center justify-center text-[#0F766E] mb-5">
                <ClipboardCheck className="w-5 h-5" />
              </div>
              <h3 className="font-editorial text-2xl font-normal text-slate-900 leading-snug mb-3">
                Quick health quiz share your lifestyle & goals.
              </h3>
              <p className="text-xs text-slate-500 font-sans leading-relaxed">
                A 3-minute clinical intake assessing metabolic history, lifestyle patterns, and treatment eligibility.
              </p>
            </div>
            <div className="flex flex-wrap gap-2 pt-6 border-t border-slate-100 mt-6">
              <span className="px-3 py-1 rounded-full bg-slate-100 text-slate-700 text-[11px] font-medium">Fast & Simple</span>
              <span className="px-3 py-1 rounded-full bg-slate-100 text-slate-700 text-[11px] font-medium">Goal-Based</span>
              <span className="px-3 py-1 rounded-full bg-slate-100 text-slate-700 text-[11px] font-medium">Lifestyle Check</span>
            </div>
          </div>

          {/* Tile 3: Photo of Real Active Person */}
          <div className="relative rounded-3xl overflow-hidden aspect-[4/3] md:aspect-auto md:min-h-[290px] shadow-sm border border-slate-200/80 group">
            <img
              src="/images/outcome_1.png"
              alt="Active healthy runner on morning trail"
              className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-700 ease-out"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950/40 via-transparent to-transparent pointer-events-none" />
            <div className="absolute bottom-4 left-4 right-4 text-white text-xs font-sans font-medium drop-shadow-sm">
              Vitality & Muscle Preservation
            </div>
          </div>

          {/* Tile 4: Card - Expert Review */}
          <div className="rounded-3xl bg-white p-7 sm:p-8 border border-slate-200/80 shadow-xs hover:shadow-md transition-shadow flex flex-col justify-between">
            <div>
              <div className="w-10 h-10 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-700 mb-5">
                <Stethoscope className="w-5 h-5" />
              </div>
              <h3 className="font-editorial text-2xl font-normal text-slate-900 leading-snug mb-3">
                Expert Review: Doctors build your treatment plan.
              </h3>
              <p className="text-xs text-slate-500 font-sans leading-relaxed">
                Licensed physicians calibrate precise medication dosing and integrate clinical dietetics for your biochemistry.
              </p>
            </div>
            <div className="flex flex-wrap gap-2 pt-6 border-t border-slate-100 mt-6">
              <span className="px-3 py-1 rounded-full bg-slate-100 text-slate-700 text-[11px] font-medium">Doctor-Approved</span>
              <span className="px-3 py-1 rounded-full bg-slate-100 text-slate-700 text-[11px] font-medium">Personalized Plan</span>
              <span className="px-3 py-1 rounded-full bg-slate-100 text-slate-700 text-[11px] font-medium">Medical Insight</span>
            </div>
          </div>

          {/* Tile 5: Photo of Real Woman Laughing Post-Workout */}
          <div className="relative rounded-3xl overflow-hidden aspect-[4/3] md:aspect-auto md:min-h-[290px] shadow-sm border border-slate-200/80 group">
            <img
              src="/images/transformation_1.png"
              alt="Smiling patient post-workout vitality"
              className="w-full h-full object-cover object-top group-hover:scale-105 transition-transform duration-700 ease-out"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950/40 via-transparent to-transparent pointer-events-none" />
            <div className="absolute bottom-4 left-4 right-4 text-white text-xs font-sans font-medium drop-shadow-sm">
              Sustainable Metabolic Transformation
            </div>
          </div>

          {/* Tile 6: Card - Start Treatment & Safe Medication */}
          <div className="rounded-3xl bg-white p-7 sm:p-8 border border-slate-200/80 shadow-xs hover:shadow-md transition-shadow flex flex-col justify-between">
            <div>
              <div className="w-10 h-10 rounded-2xl bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-700 mb-5">
                <PackageCheck className="w-5 h-5" />
              </div>
              <h3 className="font-editorial text-2xl font-normal text-slate-900 leading-snug mb-3">
                Start Treatment: Receive safe, effective medication.
              </h3>
              <p className="text-xs text-slate-500 font-sans leading-relaxed">
                Official digital e-prescription issued by your licensed physician with continuous medical monitoring & doctor check-ins.
              </p>
            </div>
            <div className="flex flex-wrap gap-2 pt-6 border-t border-slate-100 mt-6">
              <span className="px-3 py-1 rounded-full bg-slate-100 text-slate-700 text-[11px] font-medium">Safe Medication</span>
              <span className="px-3 py-1 rounded-full bg-slate-100 text-slate-700 text-[11px] font-medium">Real Results</span>
              <span className="px-3 py-1 rounded-full bg-slate-100 text-slate-700 text-[11px] font-medium">Easy Routine</span>
            </div>
          </div>

        </div>

      </div>
    </section>
  )
}
