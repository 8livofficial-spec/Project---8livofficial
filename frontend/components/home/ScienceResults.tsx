import React from 'react'
import Link from 'next/link'
import { ArrowRight, Zap } from 'lucide-react'
import KineticText from '@/components/ui/KineticText'
import ScrollRevealBox from '@/components/ui/ScrollRevealBox'

export default function ScienceResults() {
  return (
    <section
      id="results-and-science"
      aria-label="Trusted Results Backed by Real Science"
      className="py-20 sm:py-24 lg:py-28 bg-[#FAFBF9] border-b border-slate-200/80"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* ========================================================= */}
        {/* 01. TRUSTED RESULTS BACKED BY REAL SCIENCE                */}
        {/* ========================================================= */}
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 sm:mb-16 gap-6">
          <div className="max-w-xl">
            <KineticText
              as="h2"
              className="font-sans text-[28px] xs:text-[32px] sm:text-4xl lg:text-5xl font-extrabold text-[#11241A] tracking-tight leading-tight"
            >
              Trusted Results Backed by Real Science
            </KineticText>
          </div>
          <ScrollRevealBox variant="fade-up" delay={0.2} className="max-w-md">
            <p className="text-slate-600 font-sans text-base sm:text-lg leading-relaxed">
              Clinically proven treatments, medically supervised guidance, and thousands of real transformations — all in one powerful program.
            </p>
          </ScrollRevealBox>
        </div>

        {/* 3 Science Visual Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-7 mb-24 sm:mb-28 items-stretch">
          
          {/* Card 1: Semi-circular Arc Milestone Progress */}
          <ScrollRevealBox variant="stagger-scale" delay={0.1} className="rounded-[2.25rem] bg-white p-8 border border-slate-200/80 shadow-xs hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between min-h-[320px]">
            <div className="relative w-full aspect-square max-w-[200px] mx-auto flex items-center justify-center">
              <svg viewBox="0 0 100 100" className="w-full h-full -rotate-45">
                <circle
                  cx="50"
                  cy="50"
                  r="40"
                  fill="none"
                  stroke="#E2E8F0"
                  strokeWidth="6"
                  strokeDasharray="180 300"
                />
                <circle
                  cx="50"
                  cy="50"
                  r="40"
                  fill="none"
                  stroke="#00A884"
                  strokeWidth="6"
                  strokeDasharray="120 300"
                  strokeLinecap="round"
                />
              </svg>
              {/* Center Content */}
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-4">
                <div className="w-8 h-8 rounded-full bg-emerald-50 flex items-center justify-center text-[#00A884] mb-1">
                  <Zap className="w-4 h-4 fill-current" />
                </div>
                <span className="font-sans font-bold text-sm text-slate-900 leading-tight">Fast Results</span>
                <span className="text-[11px] text-slate-500 mt-1">Visible changes in 2–3 weeks</span>
              </div>
            </div>
            <div className="text-center pt-4 border-t border-slate-100">
              <span className="text-xs text-slate-500 font-medium">Metabolic Adaptation Speed</span>
            </div>
          </ScrollRevealBox>

          {/* Card 2: Center "Image within Image" with Cinematic Clip-Inset Mask */}
          <ScrollRevealBox variant="clip-inset" delay={0.2} className="relative rounded-[2.25rem] overflow-hidden min-h-[320px] shadow-sm border border-slate-200/80 p-5 sm:p-6 flex items-center justify-center group hover:-translate-y-1 transition-all duration-300">
            {/* Outer Background: Botanical Leaves */}
            <img
              src="/images/burnex/bg_leaves.jpg"
              alt="Lush botanical leaves background"
              className="absolute inset-0 w-full h-full object-cover object-center filter brightness-[0.7] saturate-[1.4] group-hover:scale-105 transition-transform duration-700 ease-out"
            />
            <div className="absolute inset-0 bg-[#0B2416]/40 pointer-events-none" />

            {/* Inner Embedded Square Face Card */}
            <div className="relative z-10 w-full max-w-[240px] aspect-square rounded-2xl overflow-hidden shadow-2xl border-2 border-white/60 group-hover:scale-105 transition-transform duration-500">
              <img
                src="/images/burnex/science_face.jpg"
                alt="Sun-dappled face showing natural skin"
                className="w-full h-full object-cover object-center"
              />
              {/* Floating Top Badge */}
              <div className="absolute top-2.5 left-2.5 bg-black/50 backdrop-blur-md border border-white/30 rounded-full px-2.5 py-1 text-[11px] font-sans font-semibold text-white shadow-md">
                12% Fat Loss
              </div>
              {/* Floating Bottom Badge */}
              <div className="absolute bottom-2.5 right-2.5 bg-black/50 backdrop-blur-md border border-white/30 rounded-full px-3 py-1 text-[11px] font-sans font-semibold text-white shadow-md">
                Medical-Grade Care
              </div>
            </div>
          </ScrollRevealBox>

          {/* Card 3: Speedometer Gauge */}
          <ScrollRevealBox variant="stagger-scale" delay={0.3} className="rounded-[2.25rem] bg-white p-8 border border-slate-200/80 shadow-xs hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between items-center text-center min-h-[320px]">
            <div className="w-full max-w-[200px] relative pt-4">
              <svg viewBox="0 0 100 60" className="w-full overflow-visible">
                <path
                  d="M 10 50 A 40 40 0 0 1 90 50"
                  fill="none"
                  stroke="#E2E8F0"
                  strokeWidth="8"
                  strokeLinecap="round"
                />
                <path
                  d="M 10 50 A 40 40 0 0 1 85 30"
                  fill="none"
                  stroke="#00A884"
                  strokeWidth="8"
                  strokeLinecap="round"
                />
              </svg>
              <div className="text-center mt-2">
                <span className="font-sans text-4xl sm:text-5xl font-extrabold text-[#11241A] block">94%</span>
              </div>
            </div>
            <div>
              <h3 className="font-sans font-bold text-base text-slate-900 mb-1">Better Everyday Energy</h3>
              <p className="text-xs text-slate-500 font-sans">Feel lighter, more active, and mentally clear.</p>
            </div>
          </ScrollRevealBox>

        </div>

        {/* ========================================================= */}
        {/* 02. TRANSFORM YOUR LIFE, NOT JUST YOUR WEIGHT             */}
        {/* ========================================================= */}
        <div id="treatments" className="text-center max-w-3xl mx-auto mb-14 sm:mb-16 scroll-mt-24">
          <KineticText
            as="h2"
            className="font-sans text-[28px] xs:text-[32px] sm:text-4xl lg:text-5xl font-extrabold text-[#11241A] tracking-tight leading-tight mb-4"
          >
            Transform Your Life, Not Just Your Weight
          </KineticText>
          <ScrollRevealBox variant="fade-up" delay={0.15}>
            <p className="text-slate-600 font-sans text-base sm:text-lg leading-relaxed">
              Scientifically formulated solutions to help you achieve real, lasting results — safe, effective, and personalized to your goals.
            </p>
          </ScrollRevealBox>
        </div>

        {/* 3 Treatment Products (Medical GLP-1, Clinical Dietitian, Movement Coach) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-7">
          
          {/* Card 1: Doctor-Led GLP-1 Protocol */}
          <ScrollRevealBox variant="stagger-scale" delay={0.1} className="rounded-[2.25rem] bg-[#163824] p-6 sm:p-7 text-white shadow-xl flex flex-col justify-between relative overflow-hidden group hover:-translate-y-1 transition-all duration-300">
            {/* Real Doctor Photographic Visual */}
            <div className="relative aspect-[4/3] rounded-2xl overflow-hidden bg-white/10 mb-6 flex items-center justify-center">
              <img
                src="/images/burnex/hero_doctor.png"
                alt="Licensed Indian physician clinical consultation"
                className="w-full h-full object-cover object-top group-hover:scale-105 transition-transform duration-500"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#163824]/80 via-transparent to-transparent pointer-events-none" />
            </div>

            {/* Title & E-Prescription Description */}
            <div className="mb-6 flex-1 flex flex-col justify-center">
              <h3 className="font-sans text-xl sm:text-2xl font-bold text-white mb-2">
                Doctor-Led GLP-1 Protocol
              </h3>
              <p className="text-sm sm:text-base text-slate-200 font-sans leading-relaxed">
                Official digital e-prescription issued by licensed physicians after 1-on-1 metabolic assessment. Conveniently fulfilled at your preferred licensed pharmacy.
              </p>
            </div>

            {/* Single Unified Action Button */}
            <Link
              href="/assessment"
              className="w-full py-4 rounded-full bg-[#00A884] hover:bg-[#008f70] text-white font-sans font-bold text-sm sm:text-base flex items-center justify-center gap-2 shadow-lg transition-all"
            >
              <span>Get E-Prescription Plan</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </ScrollRevealBox>

          {/* Card 2: Clinical Dietitian Care */}
          <ScrollRevealBox variant="stagger-scale" delay={0.2} className="rounded-[2.25rem] bg-white p-6 sm:p-7 border border-slate-200/80 shadow-xs hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between group">
            {/* Product Photo: Wholesome Indian Meal (Real Food Photo) */}
            <div className="relative aspect-[4/3] rounded-2xl overflow-hidden bg-slate-50 mb-6 flex items-center justify-center">
              <img
                src="/images/card_nutrition.jpg"
                alt="Wholesome balanced Indian nutrition plate"
                className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-500"
              />
            </div>

            {/* Title & Description */}
            <div className="mb-6 flex-1 flex flex-col justify-center">
              <h3 className="font-sans text-xl sm:text-2xl font-bold text-slate-900 mb-2">
                Clinical Dietitian Care
              </h3>
              <p className="text-sm sm:text-base text-slate-600 font-sans leading-relaxed">
                Personalized Indian nutrition plans (roti, dal, sabzi) with continuous habit coaching, blood-sugar balancing, and zero crash dieting.
              </p>
            </div>

            {/* Single Clean Action Button */}
            <Link
              href="/assessment"
              className="w-full py-4 rounded-full bg-slate-900 hover:bg-[#00A884] text-white font-sans font-bold text-sm sm:text-base flex items-center justify-center gap-2 transition-all shadow-sm"
            >
              <span>Explore Nutrition Plan</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </ScrollRevealBox>

          {/* Card 3: Gym Trainer & Movement Coaching */}
          <ScrollRevealBox variant="stagger-scale" delay={0.3} className="rounded-[2.25rem] bg-white p-6 sm:p-7 border border-slate-200/80 shadow-xs hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between group">
            {/* Product Photo: Real athletic strength training (Real Photo) */}
            <div className="relative aspect-[4/3] rounded-2xl overflow-hidden bg-slate-50 mb-6 flex items-center justify-center">
              <img
                src="/images/burnex/hero_model_center.jpg"
                alt="Strength and metabolic movement coaching"
                className="w-full h-full object-cover object-top group-hover:scale-105 transition-transform duration-500"
              />
            </div>

            {/* Title & Description */}
            <div className="mb-6 flex-1 flex flex-col justify-center">
              <h3 className="font-sans text-xl sm:text-2xl font-bold text-slate-900 mb-2">
                Metabolic Movement Coaching
              </h3>
              <p className="text-sm sm:text-base text-slate-600 font-sans leading-relaxed">
                Targeted muscle-defense routines and progressive home/gym guidance designed to preserve lean muscle and prevent metabolic rebound.
              </p>
            </div>

            {/* Single Clean Action Button */}
            <Link
              href="/assessment"
              className="w-full py-4 rounded-full bg-slate-900 hover:bg-[#00A884] text-white font-sans font-bold text-sm sm:text-base flex items-center justify-center gap-2 transition-all shadow-sm"
            >
              <span>Explore Movement Plan</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </ScrollRevealBox>

        </div>

      </div>
    </section>
  )
}
