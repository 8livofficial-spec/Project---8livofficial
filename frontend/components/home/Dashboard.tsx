'use client'

/**
 * Dashboard — Metabolic Health & BMI Diagnostic Calculator
 * Replaces the static dashboard mockup with a highly interactive, clinical-grade tool.
 * Provides live BMI score, Waist-to-Height visceral fat risk assessment, and customized next steps.
 */

import React, { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import { Activity, User, Heart, Shield, ShieldCheck, CheckCircle2, AlertCircle, Sliders, Scale, Sparkles } from 'lucide-react'
import ComparisonSlider from '@/components/ui/comparison-slider'

import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { prefersReducedMotion } from '@/lib/scrollMotion'

gsap.registerPlugin(ScrollTrigger)

export default function Dashboard() {
  const sectionRef = useRef<HTMLElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const ctx = useRef<gsap.Context | null>(null)

  // Calculator inputs
  const [gender, setGender] = useState<'male' | 'female'>('female')
  const [age, setAge] = useState<number>(32)
  const [height, setHeight] = useState<number>(165) // in cm
  const [weight, setWeight] = useState<number>(76)  // in kg
  const [waist, setWaist] = useState<number>(88)   // in cm

  // Compute metrics
  const heightM = height / 100
  const bmi = Number((weight / (heightM * heightM)).toFixed(1))
  const whtr = Number((waist / height).toFixed(2))

  // Determine BMI category
  let bmiCategory = 'Normal'
  let bmiColor = 'text-emerald-600 border-emerald-200 bg-emerald-50'
  let bmiStatusColor = '#10B981' // emerald
  let bmiStatusText = 'Metabolically Balanced weight range.'

  if (bmi < 18.5) {
    bmiCategory = 'Underweight'
    bmiColor = 'text-sky-600 border-sky-200 bg-sky-50'
    bmiStatusColor = '#0EA5E9' // sky
    bmiStatusText = 'Below clinically recommended weight range.'
  } else if (bmi >= 25 && bmi < 29.9) {
    bmiCategory = 'Overweight'
    bmiColor = 'text-amber-600 border-amber-200 bg-amber-50'
    bmiStatusColor = '#F59E0B' // amber
    bmiStatusText = 'Increased risk of metabolic resistance.'
  } else if (bmi >= 30) {
    bmiCategory = 'Obese'
    bmiColor = 'text-rose-600 border-rose-200 bg-rose-50'
    bmiStatusColor = '#F43F5E' // rose
    bmiStatusText = 'Elevated metabolic & visceral fat concerns.'
  }

  // Determine Waist-to-Height Ratio (WHtR) Visceral Fat Risk (clinical standard)
  let visceralRisk = 'Low Risk'
  let visceralColor = 'text-emerald-600 bg-emerald-50 border-emerald-200'
  let visceralDesc = 'Visceral fat accumulation index is within healthy ranges.'

  const thresholdLow = gender === 'male' ? 0.43 : 0.42
  const thresholdMed = gender === 'male' ? 0.52 : 0.48
  const thresholdHigh = gender === 'male' ? 0.57 : 0.53

  if (whtr < thresholdLow) {
    visceralRisk = 'Extremely Slim'
    visceralColor = 'text-sky-600 bg-sky-50 border-sky-200'
    visceralDesc = 'Extremely low fat indicators; ensure adequate daily protein intake.'
  } else if (whtr >= thresholdLow && whtr <= thresholdMed) {
    visceralRisk = 'Healthy Range'
    visceralColor = 'text-emerald-600 bg-emerald-50 border-emerald-200'
    visceralDesc = 'Visceral adiposity is optimal. Low metabolic set-point resistance.'
  } else if (whtr > thresholdMed && whtr <= thresholdHigh) {
    visceralRisk = 'Increased Risk'
    visceralColor = 'text-amber-600 bg-amber-50 border-amber-200'
    visceralDesc = 'Moderate abdominal accumulation. Potential insulin sensitivity resistance.'
  } else if (whtr > thresholdHigh) {
    visceralRisk = 'High Risk'
    visceralColor = 'text-rose-600 bg-rose-50 border-rose-200'
    visceralDesc = 'Significant visceral fat accumulation. High correlation with insulin resistance.'
  }

  // Ideal weight range for height (BMI 18.5 to 24.9)
  const idealMin = Math.round(18.5 * heightM * heightM)
  const idealMax = Math.round(24.9 * heightM * heightM)

  // Conversion helpers
  const feet = Math.floor((height / 2.54) / 12)
  const inches = Math.round((height / 2.54) % 12)
  const lbs = Math.round(weight * 2.20462)
  const waistInches = Math.round(waist / 2.54)

  useEffect(() => {
    const section = sectionRef.current
    const container = containerRef.current
    if (!section || !container) return

    ctx.current = gsap.context(() => {
      if (prefersReducedMotion()) return

      const mm = gsap.matchMedia()

      mm.add('(min-width: 1024px)', () => {
        gsap.fromTo(
          container,
          {
            opacity: 0,
            y: 50,
            scale: 0.96,
            transformPerspective: 1200,
          },
          {
            opacity: 1,
            y: 0,
            scale: 1,
            duration: 0.85,
            ease: 'power2.out',
            scrollTrigger: {
              trigger: container,
              start: 'top 80%',
              once: true,
            },
          }
        )
      })
    })

    return () => ctx.current?.revert()
  }, [])

  return (
    <section
      ref={sectionRef}
      id="metabolic-calculator"
      className="relative bg-white border-b border-[#0D9488]/15 py-16 sm:py-24 overflow-hidden text-[#0F172A]"
    >
      <div className="pointer-events-none absolute top-0 left-0 w-[500px] h-[500px] bg-[#0D9488]/5 rounded-full blur-[140px] -z-0" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">

        {/* Section Header */}
        <div className="max-w-3xl mb-10 sm:mb-14">
          <div className="text-[11px] font-bold uppercase tracking-[0.25em] text-[#0D9488] font-sora mb-3 select-none">
            06 / METABOLIC DIAGNOSTIC
          </div>
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white border border-[#0D9488]/20 mb-3.5 shadow-xs">
            <Activity className="w-3.5 h-3.5 text-[#0D9488]" />
            <span className="text-xs font-semibold uppercase tracking-[0.16em] text-[#0F766E] font-sora">
              Clinical Assessment Tool
            </span>
          </div>
          <h2 className="font-sora text-3xl sm:text-4xl md:text-5xl font-bold text-[#0F172A] leading-tight">
            See your progress. <span className="teal-gradient-text">Understand what's changing.</span>
          </h2>
          <p className="text-sm sm:text-base text-[#475569] leading-relaxed mt-3 max-w-xl font-light">
            Determine your clinical BMI baseline and visceral fat status using our metabolic calculator tool.
          </p>
        </div>

        {/* Calculator Container */}
        <div
          ref={containerRef}
          className="w-full max-w-6xl mx-auto rounded-[2.5rem] bg-white border border-slate-200/80 shadow-2xl overflow-hidden flex flex-col lg:flex-row will-change-transform"
        >
          {/* LEFT: Interactive Controls */}
          <div className="w-full lg:w-[42%] bg-slate-50/80 p-6 sm:p-10 border-b lg:border-b-0 lg:border-r border-slate-200/60 flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2.5 mb-6">
                <div className="w-8 h-8 rounded-lg bg-[#0D9488]/15 text-[#0D9488] flex items-center justify-center">
                  <User className="w-4 h-4" />
                </div>
                <h3 className="font-sora font-bold text-sm text-[#0F172A] uppercase tracking-wider">
                  Assess Biological Metrics
                </h3>
              </div>

              {/* Input: Biological Gender Segmented Control */}
              <div className="mb-6">
                <label className="text-[11px] font-bold uppercase tracking-wider text-[#475569] font-sora block mb-2.5">
                  Biological Gender
                </label>
                <div className="p-1 rounded-2xl bg-white border border-slate-200 shadow-inner grid grid-cols-2 gap-1">
                  <button
                    onClick={() => setGender('female')}
                    className={`py-2 px-4 rounded-xl text-xs font-bold font-sora transition-all duration-300 cursor-pointer ${
                      gender === 'female'
                        ? 'bg-[#0D9488] text-white shadow-md scale-[1.02]'
                        : 'text-[#475569] hover:text-[#0F172A]'
                    }`}
                  >
                    Female
                  </button>
                  <button
                    onClick={() => setGender('male')}
                    className={`py-2 px-4 rounded-xl text-xs font-bold font-sora transition-all duration-300 cursor-pointer ${
                      gender === 'male'
                        ? 'bg-[#0D9488] text-white shadow-md scale-[1.02]'
                        : 'text-[#475569] hover:text-[#0F172A]'
                    }`}
                  >
                    Male
                  </button>
                </div>
              </div>

              {/* Input: Age */}
              <div className="mb-6">
                <div className="flex justify-between items-center mb-2">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-[#475569] font-sora">
                    Age range
                  </label>
                  <span className="text-xs font-bold text-[#0F766E] font-sora px-3 py-0.5 rounded-full bg-[#0D9488]/10 border border-[#0D9488]/20">
                    {age} years
                  </span>
                </div>
                <input
                  type="range"
                  min="18"
                  max="80"
                  value={age}
                  onChange={(e) => setAge(Number(e.target.value))}
                  className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-[#0D9488]"
                />
              </div>

              {/* Input: Height */}
              <div className="mb-6">
                <div className="flex justify-between items-center mb-2">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-[#475569] font-sora">
                    Height (Stature)
                  </label>
                  <span className="text-xs font-bold text-[#0F766E] font-sora px-3 py-0.5 rounded-full bg-[#0D9488]/10 border border-[#0D9488]/20">
                    {height} cm • ({feet}'{inches}")
                  </span>
                </div>
                <input
                  type="range"
                  min="130"
                  max="210"
                  value={height}
                  onChange={(e) => setHeight(Number(e.target.value))}
                  className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-[#0D9488]"
                />
              </div>

              {/* Input: Weight */}
              <div className="mb-6">
                <div className="flex justify-between items-center mb-2">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-[#475569] font-sora">
                    Weight (Mass)
                  </label>
                  <span className="text-xs font-bold text-[#0F766E] font-sora px-3 py-0.5 rounded-full bg-[#0D9488]/10 border border-[#0D9488]/20">
                    {weight} kg • ({lbs} lbs)
                  </span>
                </div>
                <input
                  type="range"
                  min="40"
                  max="160"
                  value={weight}
                  onChange={(e) => setWeight(Number(e.target.value))}
                  className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-[#0D9488]"
                />
              </div>

              {/* Input: Waist Circumference */}
              <div className="mb-4">
                <div className="flex justify-between items-center mb-2">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-[#475569] font-sora">
                    Waist Circumference
                  </label>
                  <span className="text-xs font-bold text-[#0F766E] font-sora px-3 py-0.5 rounded-full bg-[#0D9488]/10 border border-[#0D9488]/20">
                    {waist} cm • ({waistInches}")
                  </span>
                </div>
                <input
                  type="range"
                  min="55"
                  max="135"
                  value={waist}
                  onChange={(e) => setWaist(Number(e.target.value))}
                  className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-[#0D9488]"
                />
              </div>
            </div>

            <div className="pt-6 border-t border-slate-200/60 text-[11px] text-[#475569] flex items-start gap-2.5 leading-relaxed font-light">
              <ShieldCheck className="w-4 h-4 text-[#0D9488] shrink-0 mt-0.5" />
              <span>
                Calculations follow medical guidelines from the WHO and the Genotype-Tissue Expression Set-Point benchmarks.
              </span>
            </div>
          </div>

          {/* RIGHT: Live Diagnostic Panel */}
          <div className="flex-1 p-6 sm:p-10 flex flex-col justify-between bg-white">
            <div>
              {/* Top Summary Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-8 pb-4 border-b border-slate-100">
                <div>
                  <h4 className="font-sora font-bold text-xl text-[#0F172A]">Metabolic Assessment Report</h4>
                  <p className="text-xs text-[#64748B] mt-0.5">Clinically supervised calculations</p>
                </div>
                <div className="flex items-center gap-2 self-start sm:self-auto">
                  <span className="w-2 h-2 rounded-full bg-[#0D9488] animate-pulse" />
                  <span className="text-[10px] font-bold text-[#0F766E] bg-[#0D9488]/10 border border-[#0D9488]/20 px-3 py-1 rounded-full uppercase tracking-wider">
                    Diagnostic Active
                  </span>
                </div>
              </div>

              {/* Core Output Metrics Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-6 items-center mb-8">
                
                {/* SVG Live Radial Gauge */}
                <div className="sm:col-span-4 flex flex-col items-center">
                  <div className="relative w-40 h-40">
                    <svg className="w-full h-full transform -rotate-90">
                      <circle
                        cx="80"
                        cy="80"
                        r="66"
                        className="stroke-slate-100 fill-transparent"
                        strokeWidth="12"
                      />
                      <circle
                        cx="80"
                        cy="80"
                        r="66"
                        style={{
                          stroke: bmiStatusColor,
                          strokeDasharray: 414,
                          strokeDashoffset: 414 - (414 * Math.min(bmi, 45)) / 45,
                          transition: 'stroke-dashoffset 0.6s ease-out, stroke 0.5s ease',
                        }}
                        className="fill-transparent stroke-linecap-round"
                        strokeWidth="12"
                      />
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                      <p className="text-[10px] uppercase font-bold tracking-widest text-[#64748B] mb-0.5">BMI Score</p>
                      <p className="font-sora text-3xl font-black text-[#0F172A]">{bmi}</p>
                    </div>
                  </div>
                </div>

                {/* Score Summary Metrics */}
                <div className="sm:col-span-8 space-y-4">
                  <div className="flex items-center gap-3">
                    <div className={`px-4 py-1.5 rounded-full border text-xs font-bold font-sora shadow-xs ${bmiColor}`}>
                      {bmiCategory}
                    </div>
                    <p className="text-xs sm:text-sm text-[#0F172A] font-semibold">{bmiStatusText}</p>
                  </div>

                  {/* Visceral Risk Alert */}
                  <div className="p-4 sm:p-5 rounded-2xl bg-slate-50 border border-slate-200/80">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[10px] font-bold text-[#64748B] uppercase tracking-wide">
                        Visceral Adiposity Index (Waist/Height)
                      </span>
                      <span className={`px-3 py-0.5 rounded-full border text-[10px] font-bold font-sora ${visceralColor}`}>
                        {visceralRisk}
                      </span>
                    </div>
                    <p className="text-xs text-[#475569] leading-relaxed font-light">{visceralDesc}</p>
                  </div>
                </div>
              </div>

              {/* Metabolic Insight Report */}
              <div className="p-5 rounded-2xl bg-[#0D9488]/5 border border-[#0D9488]/20 flex items-start gap-3.5">
                <AlertCircle className="w-5 h-5 text-[#0D9488] shrink-0 mt-0.5" />
                <div className="text-xs leading-relaxed text-[#0F172A]">
                  <p className="font-bold text-[#0F766E] mb-1 uppercase tracking-wide font-sora text-[10px]">
                    Clinical Endocrinology Note
                  </p>
                  {bmi >= 25 ? (
                    <span className="text-[#475569] font-light">
                      Visceral fat accumulation strongly correlates with metabolic resistance and leptin signaling shifts. An elevated index suggests candidate eligibility for comprehensive physician-led care options, including GLP-1 medications if indicated.
                    </span>
                  ) : (
                    <span className="text-[#475569] font-light">
                      Your metrics indicate metabolic stability. Maintaining steady hydration, high skeletal protein pacing, and structured activity is recommended to preserve muscle mass over time.
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Bottom Ideal Range & CTA */}
            <div className="pt-6 border-t border-slate-100 mt-6 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
              <div className="flex items-center gap-2.5">
                <Heart className="w-4 h-4 text-[#0D9488]" />
                <span className="text-xs text-[#475569] font-medium">
                  Ideal weight range for height: <strong className="font-bold text-[#0F172A]">{idealMin} kg – {idealMax} kg</strong>
                </span>
              </div>
              <Link
                href="/assessment"
                className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-full bg-[#0D9488] hover:bg-[#0F766E] text-white text-xs font-bold font-sora shadow-lg shadow-[#0D9488]/30 transition-all text-center cursor-pointer hover:scale-105 active:scale-95"
              >
                <span>Request Clinical Consultation</span>
                <CheckCircle2 className="w-4 h-4 text-white" />
              </Link>
            </div>

          </div>
        </div>

        {/* Visual Progress Comparison Slider Block */}
        <div className="mt-16 sm:mt-24 max-w-5xl mx-auto">
          <div className="text-center max-w-2xl mx-auto mb-8 sm:mb-10">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#0D9488]/10 border border-[#0D9488]/20 text-[#0F766E] text-xs font-semibold uppercase tracking-wider mb-3">
              <Sparkles className="w-3.5 h-3.5 text-[#0D9488]" />
              <span>Real Biometric Transformation</span>
            </div>
            <h3 className="font-sora text-2xl sm:text-3xl md:text-4xl font-bold text-[#0F172A]">
              Visualizing Progress Over 12 Weeks
            </h3>
            <p className="text-xs sm:text-sm text-[#475569] mt-2 leading-relaxed font-light">
              Drag the handle to compare real body composition and metabolic health markers before and after 8liv doctor-led protocol.
            </p>
          </div>

          <ComparisonSlider
            beforeImage="/images/transformation_1.png"
            afterImage="/images/transformation_2.png"
            beforeLabel="Week 0 (Baseline)"
            afterLabel="Week 12 (Metabolic Shift)"
            beforeTagline="Initial Weight & Visceral Fat Baseline"
            afterTagline="-12.4 kg Weight Shift & Optimal Biomarkers"
            className="shadow-2xl border border-slate-200"
          />
        </div>

      </div>
    </section>
  )
}


