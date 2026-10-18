'use client'

import React from 'react'
import Link from 'next/link'
import { ArrowRight, Check } from 'lucide-react'

const treatments = [
  {
    id: 'glp1',
    title: 'GLP-1 Injections',
    subtitle: 'Doctor-guided clinical therapy',
    description: 'Scientifically proven medications that calm food cravings, slow gastric emptying, and reset insulin sensitivity.',
    imageSrc: '/images/card_glp1_meds.jpg',
    imageAlt: 'GLP-1 pre-filled pen and clinical medicine vial',
    badge: 'Evidence-Based',
    tags: ['Doctor Supervised', 'Direct Prescription', 'Dosage Calibrated'],
    href: '/assessment',
  },
  {
    id: 'metabolic',
    title: 'Metabolic & Biomarker Care',
    subtitle: 'Endocrine laboratory tracking',
    description: 'Quarterly biomarker panels monitoring fasting insulin, HbA1c, and lipid ratios to safeguard long-term organ health.',
    imageSrc: '/images/card_metabolic.jpg',
    imageAlt: 'Metabolic biomarker test kit and clinical supplement',
    badge: 'Lab-Monitored',
    tags: ['Home Blood Collection', 'Physician Review', 'Zero Guesswork'],
    href: '/assessment',
  },
  {
    id: 'nutrition',
    title: 'Clinical Indian Nutrition',
    subtitle: 'Customized cultural meal plans',
    description: 'Adaptive nutrition calibrated to regional Indian home cooking—roti, dal, sabzi—ensuring muscle preservation and zero starvation.',
    imageSrc: '/images/card_nutrition.jpg',
    imageAlt: 'Vibrant wholesome balanced Indian food bowl',
    badge: 'Registered Dietitian',
    tags: ['Culturally Tailored', 'Protein Optimized', 'WhatsApp Support'],
    href: '/assessment',
  },
]

export default function TreatmentShowcase() {
  return (
    <section
      id="treatments"
      aria-label="Personalized Weight Loss Treatments"
      className="py-20 sm:py-24 lg:py-28 bg-[#FBFBF9] border-b border-slate-200/80"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 sm:mb-16 gap-6">
          <div className="max-w-xl">
            <h2 className="font-editorial text-3xl sm:text-4xl lg:text-5xl font-normal text-[#1A2D36] tracking-tight leading-tight mb-3">
              Personalized Weight Loss Treatments
            </h2>
            <p className="text-slate-600 font-sans text-base sm:text-lg leading-relaxed">
              Every body is biologically distinct. Our physicians combine modern medicine with cultural nutrition for safe, lasting results.
            </p>
          </div>
          <div>
            <Link
              href="/assessment"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-white hover:bg-slate-100 text-slate-800 font-sans font-semibold text-xs sm:text-sm border border-slate-200 shadow-xs hover:shadow-md transition-all cursor-pointer"
            >
              <span>View All Protocols</span>
              <ArrowRight className="w-4 h-4 text-slate-600" />
            </Link>
          </div>
        </div>

        {/* 3 Treatment Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8">
          {treatments.map((item) => (
            <div
              key={item.id}
              className="rounded-3xl bg-white p-5 sm:p-6 border border-slate-200/80 shadow-xs hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between group"
            >
              <div>
                {/* Visual Image */}
                <div className="relative aspect-[4/3] rounded-2xl overflow-hidden bg-slate-50 mb-5">
                  <img
                    src={item.imageSrc}
                    alt={item.imageAlt}
                    loading="lazy"
                    decoding="async"
                    className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-500 ease-out"
                  />
                  <div className="absolute top-3 right-3 bg-white/95 backdrop-blur-md rounded-full px-3 py-1 text-[11px] font-sans font-semibold text-slate-800 border border-slate-100 shadow-2xs">
                    {item.badge}
                  </div>
                </div>

                {/* Content */}
                <h3 className="font-editorial text-2xl font-normal text-slate-900 leading-snug mb-1">
                  {item.title}
                </h3>
                <p className="text-xs font-sans font-medium text-[#0F766E] mb-3">
                  {item.subtitle}
                </p>
                <p className="text-xs text-slate-600 font-sans leading-relaxed mb-5">
                  {item.description}
                </p>

                {/* Tags */}
                <div className="space-y-1.5 mb-6 pt-4 border-t border-slate-100">
                  {item.tags.map((tag, idx) => (
                    <div key={idx} className="flex items-center gap-2 text-[11px] font-sans text-slate-700">
                      <div className="w-4 h-4 rounded-full bg-teal-50 text-[#0F766E] flex items-center justify-center shrink-0">
                        <Check className="w-2.5 h-2.5 stroke-[3]" />
                      </div>
                      <span>{tag}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 pt-2">
                <Link
                  href="/assessment"
                  className="flex-1 text-center py-3 rounded-full bg-[#1A2D36] hover:bg-[#122027] text-white font-sans font-semibold text-xs transition-colors cursor-pointer"
                >
                  Start Assessment
                </Link>
                <Link
                  href="/assessment"
                  className="px-4 py-3 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-sans font-semibold text-xs transition-colors cursor-pointer"
                >
                  Details
                </Link>
              </div>
            </div>
          ))}
        </div>

      </div>
    </section>
  )
}
