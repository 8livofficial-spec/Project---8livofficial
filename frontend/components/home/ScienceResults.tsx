'use client'

import React, { useState, useMemo } from 'react'
import Link from 'next/link'
import { ArrowRight, Info } from 'lucide-react'
import KineticText from '@/components/ui/KineticText'
import ScrollRevealBox from '@/components/ui/ScrollRevealBox'

type UnitSystem = 'metric' | 'imperial'
type BiologicalSex = 'male' | 'female'

interface BmiCategory {
  label: string
  sublabel: string
  color: string
  bgLight: string
  borderClass: string
  textClass: string
  rangeText: string
  recommendation: string
  isGlp1Candidate: boolean
}

export default function ScienceResults() {
  // State
  const [unit, setUnit] = useState<UnitSystem>('metric')
  const [sex, setSex] = useState<BiologicalSex>('female')
  const [ageGroup, setAgeGroup] = useState<string>('30-44')

  // Metric state (cm, kg)
  const [heightCm, setHeightCm] = useState<number>(165)
  const [weightKg, setWeightKg] = useState<number>(76)

  // Imperial state (ft, in, lbs)
  const [heightFt, setHeightFt] = useState<number>(5)
  const [heightIn, setHeightIn] = useState<number>(5)
  const [weightLbs, setWeightLbs] = useState<number>(167)

  // Handle Unit Switch with automatic bidirectional conversion
  const handleUnitSwitch = (newUnit: UnitSystem) => {
    if (newUnit === unit) return

    if (newUnit === 'imperial') {
      // Metric -> Imperial
      const totalInches = heightCm / 2.54
      const ft = Math.floor(totalInches / 12)
      const inches = Math.round(totalInches % 12)
      const lbs = Math.round(weightKg * 2.20462)

      setHeightFt(Math.max(4, Math.min(7, ft)))
      setHeightIn(Math.max(0, Math.min(11, inches)))
      setWeightLbs(Math.max(70, Math.min(450, lbs)))
    } else {
      // Imperial -> Metric
      const totalInches = heightFt * 12 + heightIn
      const cm = Math.round(totalInches * 2.54)
      const kg = Math.round(weightLbs / 2.20462)

      setHeightCm(Math.max(120, Math.min(220, cm)))
      setWeightKg(Math.max(35, Math.min(200, kg)))
    }
    setUnit(newUnit)
  }

  // Active Height in meters and Weight in kg
  const activeMetrics = useMemo(() => {
    if (unit === 'metric') {
      return {
        heightM: heightCm / 100,
        heightCm: heightCm,
        weightKg: weightKg,
      }
    } else {
      const totalInches = heightFt * 12 + heightIn
      const cm = Math.round(totalInches * 2.54)
      const kg = Math.round(weightLbs / 2.20462)
      return {
        heightM: cm / 100,
        heightCm: cm,
        weightKg: kg,
      }
    }
  }, [unit, heightCm, weightKg, heightFt, heightIn, weightLbs])

  // BMI Calculation
  const bmi = useMemo(() => {
    if (activeMetrics.heightM <= 0) return 0
    const val = activeMetrics.weightKg / (activeMetrics.heightM * activeMetrics.heightM)
    return Math.round(val * 10) / 10
  }, [activeMetrics])

  // Healthy Weight Range for Asian Indian Consensus (BMI 18.5 - 22.9)
  const healthyWeightRange = useMemo(() => {
    const h2 = activeMetrics.heightM * activeMetrics.heightM
    const minKg = Math.round(18.5 * h2 * 10) / 10
    const maxKg = Math.round(22.9 * h2 * 10) / 10

    if (unit === 'metric') {
      return {
        min: `${minKg} kg`,
        max: `${maxKg} kg`,
        differenceKg: Math.round((activeMetrics.weightKg - maxKg) * 10) / 10,
      }
    } else {
      const minLbs = Math.round(minKg * 2.20462)
      const maxLbs = Math.round(maxKg * 2.20462)
      const diffLbs = Math.round((weightLbs - maxLbs) * 10) / 10
      return {
        min: `${minLbs} lbs`,
        max: `${maxLbs} lbs`,
        differenceKg: diffLbs,
      }
    }
  }, [activeMetrics, unit, weightLbs])

  // ICMR / WHO South Asian Guidelines Categorization
  const category: BmiCategory = useMemo(() => {
    if (bmi < 18.5) {
      return {
        label: 'Underweight',
        sublabel: 'Below clinical metabolic baseline',
        color: '#3B82F6',
        bgLight: 'bg-blue-50',
        borderClass: 'border-blue-200',
        textClass: 'text-blue-700',
        rangeText: '< 18.5 kg/m²',
        recommendation:
          'A clinical evaluation with our dietitian is advised to calibrate healthy lean muscle mass and nutrient absorption.',
        isGlp1Candidate: false,
      }
    } else if (bmi <= 22.9) {
      return {
        label: 'Healthy Weight',
        sublabel: 'Optimal Asian Indian metabolic zone',
        color: '#00A884',
        bgLight: 'bg-emerald-50',
        borderClass: 'border-emerald-200',
        textClass: 'text-emerald-700',
        rangeText: '18.5 – 22.9 kg/m²',
        recommendation:
          'Your BMI sits within the optimal metabolic range for South Asian adults. Focus on muscle retention and balanced nutrition.',
        isGlp1Candidate: false,
      }
    } else if (bmi <= 27.4) {
      return {
        label: 'Overweight',
        sublabel: 'Elevated visceral & metabolic risk (ICMR/WHO)',
        color: '#D97706',
        bgLight: 'bg-amber-50',
        borderClass: 'border-amber-200',
        textClass: 'text-amber-800',
        rangeText: '23.0 – 27.4 kg/m²',
        recommendation:
          'Under Indian consensus criteria, this range carries higher insulin resistance risk. You may be eligible for doctor-guided lifestyle intervention or medical support.',
        isGlp1Candidate: true,
      }
    } else {
      return {
        label: 'Obese (High Risk)',
        sublabel: 'Candidate for physician-supervised GLP-1 care',
        color: '#DC2626',
        bgLight: 'bg-rose-50',
        borderClass: 'border-rose-200',
        textClass: 'text-rose-700',
        rangeText: '≥ 27.5 kg/m²',
        recommendation:
          'Your BMI indicates high metabolic risk under South Asian clinical guidelines. You are strongly indicated for clinical GLP-1 therapy paired with dietitian coaching.',
        isGlp1Candidate: true,
      }
    }
  }, [bmi])

  // Progress Bar Position (calibrated from BMI 15 to 35 for smooth needle placement)
  const needlePercent = useMemo(() => {
    const minBmi = 15
    const maxBmi = 35
    const clamped = Math.max(minBmi, Math.min(maxBmi, bmi))
    return ((clamped - minBmi) / (maxBmi - minBmi)) * 100
  }, [bmi])

  return (
    <section
      id="results-and-science"
      aria-label="Clinical Body Mass Index Assessment"
      className="py-20 sm:py-24 lg:py-28 bg-[#FAFBF9] border-b border-slate-200/80 scroll-mt-20"
    >
      <div id="bmi-assessment" className="scroll-mt-20" />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-12 sm:mb-16">
          <KineticText
            as="h2"
            className="font-sans text-[28px] xs:text-[32px] sm:text-4xl lg:text-5xl font-extrabold text-[#11241A] tracking-tight leading-tight mb-4"
          >
            Body Mass Index (BMI) Assessment
          </KineticText>
          <ScrollRevealBox variant="fade-up" delay={0.15}>
            <p className="text-slate-600 font-sans text-base sm:text-lg leading-relaxed">
              Calibrated to ICMR & WHO South Asian guidelines to assess metabolic health, visceral adiposity risk, and medical weight management eligibility.
            </p>
          </ScrollRevealBox>
        </div>

        {/* Main Production-Grade Calculator Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
          
          {/* ========================================================= */}
          {/* LEFT COLUMN: INTERACTIVE BIOMETRIC INPUTS                 */}
          {/* ========================================================= */}
          <div className="lg:col-span-7 bg-white rounded-[2rem] border border-slate-200/80 shadow-xs p-6 sm:p-8 flex flex-col justify-between">
            <div>
              {/* Unit Switcher & Demographics Header */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pb-5 border-b border-slate-100 mb-5">
                <div>
                  <span className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                    Measurement System
                  </span>
                  <div className="inline-flex w-full p-1 bg-slate-100 rounded-xl">
                    <button
                      type="button"
                      onClick={() => handleUnitSwitch('metric')}
                      className={`flex-1 py-1.5 px-2 text-xs sm:text-sm font-semibold rounded-lg text-center transition-all ${
                        unit === 'metric'
                          ? 'bg-white text-slate-900 shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      Metric (cm, kg)
                    </button>
                    <button
                      type="button"
                      onClick={() => handleUnitSwitch('imperial')}
                      className={`flex-1 py-1.5 px-2 text-xs sm:text-sm font-semibold rounded-lg text-center transition-all ${
                        unit === 'imperial'
                          ? 'bg-white text-slate-900 shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      Imperial (ft/in, lbs)
                    </button>
                  </div>
                </div>

                {/* Biological Sex Toggle */}
                <div>
                  <span className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                    Biological Sex
                  </span>
                  <div className="inline-flex w-full p-1 bg-slate-100 rounded-xl">
                    <button
                      type="button"
                      onClick={() => setSex('female')}
                      className={`flex-1 py-1.5 px-2 text-xs sm:text-sm font-semibold rounded-lg text-center transition-all ${
                        sex === 'female'
                          ? 'bg-white text-slate-900 shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      Female
                    </button>
                    <button
                      type="button"
                      onClick={() => setSex('male')}
                      className={`flex-1 py-1.5 px-2 text-xs sm:text-sm font-semibold rounded-lg text-center transition-all ${
                        sex === 'male'
                          ? 'bg-white text-slate-900 shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      Male
                    </button>
                  </div>
                </div>
              </div>

              {/* Age Range Selector */}
              <div className="mb-7">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                  Age Bracket
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {['18–29', '30–44', '45–59', '60+'].map((range) => (
                    <button
                      key={range}
                      type="button"
                      onClick={() => setAgeGroup(range)}
                      className={`py-2 px-2 text-xs sm:text-sm font-medium rounded-xl border text-center transition-all ${
                        ageGroup === range
                          ? 'bg-[#163824] text-white border-[#163824] shadow-xs'
                          : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      {range}
                    </button>
                  ))}
                </div>
              </div>

              {/* Height Input Section */}
              <div className="mb-8">
                {unit === 'metric' ? (
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label htmlFor="height-cm" className="text-sm font-bold text-slate-800">
                        Height
                      </label>
                      <div className="flex items-center gap-1.5">
                        <input
                          id="height-cm"
                          type="number"
                          min={120}
                          max={220}
                          value={heightCm}
                          onChange={(e) => setHeightCm(Math.max(100, Math.min(230, Number(e.target.value) || 0)))}
                          className="w-20 px-2.5 py-1 text-right text-base font-extrabold text-slate-900 border border-slate-200 rounded-lg focus:outline-none focus:border-[#00A884]"
                        />
                        <span className="text-xs font-semibold text-slate-500">cm</span>
                      </div>
                    </div>
                    <input
                      type="range"
                      min={120}
                      max={220}
                      step={1}
                      value={heightCm}
                      onChange={(e) => setHeightCm(Number(e.target.value))}
                      className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-[#00A884]"
                    />
                    <div className="flex justify-between text-[11px] text-slate-500 mt-1.5 font-medium">
                      <span>120 cm (3&apos;11&quot;)</span>
                      <span>170 cm</span>
                      <span>220 cm (7&apos;3&quot;)</span>
                    </div>
                  </div>
                ) : (
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-bold text-slate-800">Height</span>
                      <span className="text-base font-extrabold text-slate-900">
                        {heightFt}&apos; {heightIn}&quot;
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <div className="flex justify-between text-xs text-slate-500 mb-1">
                          <span>Feet ({heightFt} ft)</span>
                        </div>
                        <input
                          type="range"
                          min={4}
                          max={7}
                          step={1}
                          value={heightFt}
                          onChange={(e) => setHeightFt(Number(e.target.value))}
                          className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-[#00A884]"
                        />
                      </div>
                      <div>
                        <div className="flex justify-between text-xs text-slate-500 mb-1">
                          <span>Inches ({heightIn} in)</span>
                        </div>
                        <input
                          type="range"
                          min={0}
                          max={11}
                          step={1}
                          value={heightIn}
                          onChange={(e) => setHeightIn(Number(e.target.value))}
                          className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-[#00A884]"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Weight Input Section */}
              <div className="mb-4">
                {unit === 'metric' ? (
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label htmlFor="weight-kg" className="text-sm font-bold text-slate-800">
                        Weight
                      </label>
                      <div className="flex items-center gap-1.5">
                        <input
                          id="weight-kg"
                          type="number"
                          min={35}
                          max={200}
                          value={weightKg}
                          onChange={(e) => setWeightKg(Math.max(30, Math.min(250, Number(e.target.value) || 0)))}
                          className="w-20 px-2.5 py-1 text-right text-base font-extrabold text-slate-900 border border-slate-200 rounded-lg focus:outline-none focus:border-[#00A884]"
                        />
                        <span className="text-xs font-semibold text-slate-500">kg</span>
                      </div>
                    </div>
                    <input
                      type="range"
                      min={35}
                      max={200}
                      step={0.5}
                      value={weightKg}
                      onChange={(e) => setWeightKg(Number(e.target.value))}
                      className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-[#00A884]"
                    />
                    <div className="flex justify-between text-[11px] text-slate-500 mt-1.5 font-medium">
                      <span>35 kg (77 lbs)</span>
                      <span>115 kg</span>
                      <span>200 kg (440 lbs)</span>
                    </div>
                  </div>
                ) : (
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label htmlFor="weight-lbs" className="text-sm font-bold text-slate-800">
                        Weight
                      </label>
                      <div className="flex items-center gap-1.5">
                        <input
                          id="weight-lbs"
                          type="number"
                          min={77}
                          max={450}
                          value={weightLbs}
                          onChange={(e) => setWeightLbs(Math.max(60, Math.min(500, Number(e.target.value) || 0)))}
                          className="w-24 px-2.5 py-1 text-right text-base font-extrabold text-slate-900 border border-slate-200 rounded-lg focus:outline-none focus:border-[#00A884]"
                        />
                        <span className="text-xs font-semibold text-slate-500">lbs</span>
                      </div>
                    </div>
                    <input
                      type="range"
                      min={77}
                      max={450}
                      step={1}
                      value={weightLbs}
                      onChange={(e) => setWeightLbs(Number(e.target.value))}
                      className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-[#00A884]"
                    />
                    <div className="flex justify-between text-[11px] text-slate-500 mt-1.5 font-medium">
                      <span>77 lbs (35 kg)</span>
                      <span>250 lbs</span>
                      <span>450 lbs (204 kg)</span>
                    </div>
                  </div>
                )}
              </div>

              {/* ========================================================= */}
              {/* MOBILE LIVE RESULT HUD (Visible strictly on mobile screens) */}
              {/* Gives instant, zero-scroll visual feedback as sliders move! */}
              {/* ========================================================= */}
              <div className="lg:hidden mt-6 p-4 sm:p-5 rounded-2xl bg-[#163824] text-white shadow-lg border border-emerald-900/40">
                <div className="flex items-center justify-between gap-3 mb-3">
                  <div>
                    <span className="text-[11px] font-mono tracking-wider uppercase text-emerald-400 font-bold block">
                      Live BMI Result
                    </span>
                    <div className="flex items-baseline gap-2">
                      <span className="text-3xl sm:text-4xl font-extrabold font-sans text-white tabular-nums tracking-tight">
                        {bmi.toFixed(1)}
                      </span>
                      <span className="text-xs font-semibold text-slate-300">kg/m²</span>
                    </div>
                  </div>

                  <div className="text-right">
                    <span
                      className="inline-block px-2.5 py-1 rounded-full text-xs font-bold"
                      style={{ backgroundColor: `${category.color}25`, color: category.color === '#00A884' ? '#34D399' : category.color }}
                    >
                      {category.label}
                    </span>
                    <span className="block text-[11px] text-slate-300 mt-1 font-medium">
                      {healthyWeightRange.differenceKg > 0
                        ? `+${healthyWeightRange.differenceKg} ${unit === 'metric' ? 'kg' : 'lbs'} to normal`
                        : healthyWeightRange.differenceKg < 0
                        ? `${healthyWeightRange.differenceKg} ${unit === 'metric' ? 'kg' : 'lbs'} below normal`
                        : 'Optimal Range'}
                    </span>
                  </div>
                </div>

                {/* Mini Spectrum Needle Bar for instant tactile feedback on mobile */}
                <div className="mb-4">
                  <div className="relative w-full h-2 rounded-full overflow-hidden flex bg-white/10 p-0.5">
                    <div className="h-full bg-blue-400 rounded-l-full" style={{ width: '17.5%' }} />
                    <div className="h-full bg-[#00A884]" style={{ width: '22%' }} />
                    <div className="h-full bg-amber-400" style={{ width: '22.5%' }} />
                    <div className="h-full bg-rose-500 rounded-r-full" style={{ width: '38%' }} />
                  </div>
                  <div className="relative w-full h-3 mt-0.5">
                    <div
                      className="absolute -top-0.5 transition-all duration-200 -translate-x-1/2"
                      style={{ left: `${Math.max(4, Math.min(96, needlePercent))}%` }}
                    >
                      <div className="w-0 h-0 border-l-[4px] border-l-transparent border-r-[4px] border-r-transparent border-b-[5px] border-b-white" />
                    </div>
                  </div>
                </div>

                {/* Mobile Recommendation Narrative & Full-Width Primary CTA */}
                <div className="pt-2">
                  <p className="text-xs text-slate-200 leading-relaxed mb-4 font-normal">
                    {category.recommendation}
                  </p>
                  <Link
                    href={`/assessment?height=${activeMetrics.heightCm}&weight=${activeMetrics.weightKg}&bmi=${bmi}`}
                    className="w-full py-3.5 px-5 rounded-full bg-[#00A884] hover:bg-[#009272] text-white text-sm font-bold flex items-center justify-center gap-2 shadow-md transition-all text-center"
                  >
                    <span>Check My Doctor Eligibility</span>
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>
              </div>
            </div>

            {/* Indian Consensus Guideline Note */}
            <div className="pt-6 border-t border-slate-100 flex items-start gap-2.5 text-xs text-slate-600 leading-relaxed">
              <Info className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <span>
                <strong>Indian Consensus Calibration:</strong> In accordance with ICMR & WHO South Asian guidelines, the overweight threshold begins at <strong>23.0 kg/m²</strong> (compared to 25.0 kg/m² in Western guidelines) due to higher cardiovascular and visceral fat risks in Indian phenotypes.
              </span>
            </div>
          </div>

          {/* ========================================================= */}
          {/* RIGHT COLUMN: CLINICAL RESULTS & METABOLIC TELEMETRY      */}
          {/* Strictly visible on desktop (lg:flex) - hidden on mobile! */}
          {/* ========================================================= */}
          <div
            id="clinical-results-panel"
            className="hidden lg:flex lg:col-span-5 bg-[#163824] rounded-[2rem] text-white p-6 sm:p-8 flex-col justify-between shadow-xl relative overflow-hidden"
          >
            <div>
              {/* Card Header */}
              <div className="pb-4 border-b border-white/10 mb-6">
                <h3 className="font-sans text-xl font-bold text-white">Your Metabolic Index</h3>
              </div>

              {/* Large Score Display */}
              <div className="flex items-baseline gap-3 mb-6">
                <span className="font-sans text-5xl sm:text-6xl font-extrabold text-white tracking-tight tabular-nums">
                  {bmi.toFixed(1)}
                </span>
                <div className="flex flex-col">
                  <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">kg/m²</span>
                  <span className="text-[11px] text-emerald-400 font-medium">
                    {category.rangeText}
                  </span>
                </div>
              </div>

              {/* Segmented Spectrum Gauge */}
              <div className="mb-6">
                <div className="flex justify-between text-[11px] font-semibold text-slate-300 mb-1.5">
                  <span>Underweight</span>
                  <span>Normal</span>
                  <span>Overweight</span>
                  <span>Obese</span>
                </div>

                {/* Bar with 4 zones */}
                <div className="relative w-full h-3 rounded-full overflow-hidden flex bg-white/10 p-0.5">
                  {/* Zone 1: Underweight (<18.5) -> ~17.5% */}
                  <div className="h-full bg-blue-400 rounded-l-full" style={{ width: '17.5%' }} title="Underweight (<18.5)" />
                  {/* Zone 2: Normal (18.5 - 22.9) -> ~22% */}
                  <div className="h-full bg-[#00A884]" style={{ width: '22%' }} title="Healthy (18.5 - 22.9)" />
                  {/* Zone 3: Overweight (23.0 - 27.4) -> ~22.5% */}
                  <div className="h-full bg-amber-400" style={{ width: '22.5%' }} title="Overweight (23.0 - 27.4)" />
                  {/* Zone 4: Obese (>=27.5) -> ~38% */}
                  <div className="h-full bg-rose-500 rounded-r-full" style={{ width: '38%' }} title="Obese (>=27.5)" />
                </div>

                {/* Needle Indicator */}
                <div className="relative w-full h-4 mt-1">
                  <div
                    className="absolute -top-1 transition-all duration-300 -translate-x-1/2 flex flex-col items-center"
                    style={{ left: `${Math.max(4, Math.min(96, needlePercent))}%` }}
                  >
                    <div className="w-0 h-0 border-l-[5px] border-l-transparent border-r-[5px] border-r-transparent border-b-[6px] border-b-white" />
                    <span className="text-[10px] font-mono font-bold text-white bg-black/60 px-1 rounded mt-0.5">
                      {bmi.toFixed(1)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Telemetry Breakdown Details */}
              <div className="space-y-3 bg-white/5 rounded-2xl p-4 border border-white/10 mb-6">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-300">Healthy Weight Range (for your height):</span>
                  <span className="font-bold text-white tabular-nums">
                    {healthyWeightRange.min} – {healthyWeightRange.max}
                  </span>
                </div>

                {healthyWeightRange.differenceKg > 0 ? (
                  <div className="flex items-center justify-between text-xs pt-2 border-t border-white/10">
                    <span className="text-slate-300">Weight to Optimal Threshold:</span>
                    <span className="font-bold text-amber-300 tabular-nums">
                      +{healthyWeightRange.differenceKg} {unit === 'metric' ? 'kg' : 'lbs'}
                    </span>
                  </div>
                ) : healthyWeightRange.differenceKg < 0 ? (
                  <div className="flex items-center justify-between text-xs pt-2 border-t border-white/10">
                    <span className="text-slate-300">Weight Difference:</span>
                    <span className="font-bold text-blue-300 tabular-nums">
                      {healthyWeightRange.differenceKg} {unit === 'metric' ? 'kg' : 'lbs'}
                    </span>
                  </div>
                ) : (
                  <div className="flex items-center justify-between text-xs pt-2 border-t border-white/10">
                    <span className="text-slate-300">Target Alignment:</span>
                    <span className="font-bold text-emerald-400">Within Optimal Zone</span>
                  </div>
                )}
              </div>

              {/* Clinical Narrative Guidance */}
              <p className="text-xs sm:text-sm text-slate-200 leading-relaxed mb-6 font-normal">
                {category.recommendation}
              </p>
            </div>

            {/* Direct High-Conversion Clinical CTA */}
            <div>
              <Link
                href={`/assessment?height=${activeMetrics.heightCm}&weight=${activeMetrics.weightKg}&bmi=${bmi}`}
                className="w-full py-4 px-6 rounded-full bg-[#00A884] hover:bg-[#009272] text-white font-sans font-bold text-sm sm:text-base flex items-center justify-center gap-2 shadow-lg transition-all hover:scale-[1.01] active:scale-[0.99]"
              >
                <span>Check My Doctor Eligibility</span>
                <ArrowRight className="w-4 h-4" />
              </Link>

              <div className="text-center mt-3">
                <span className="text-[11px] text-slate-300 font-sans">
                  Official clinical intake under 8Liv licensed physicians. Fulfillable at licensed pharmacies.
                </span>
              </div>
            </div>
          </div>

        </div>

      </div>
    </section>
  )
}
