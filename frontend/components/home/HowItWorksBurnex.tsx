'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import {
  ArrowRight,
  FileText,
  CheckCircle2,
  Lock,
  Stethoscope,
  Salad,
  Dumbbell,
  Sparkles
} from 'lucide-react'
import KineticText from '@/components/ui/KineticText'
import ScrollRevealBox from '@/components/ui/ScrollRevealBox'

interface StepData {
  number: string
  stage: string
  title: string
  summary: string
  details: string[]
  badge: string
}

const steps: StepData[] = [
  {
    number: '01',
    stage: 'Clinical Intake',
    title: 'Complete Your 3-Minute Health Assessment',
    summary:
      'Answer a confidential medical questionnaire covering your health history, previous weight loss attempts, and metabolic goals.',
    details: [
      'Comprehensive BMI & lifestyle evaluation',
      'Confidential and encrypted data protection',
      'Instant eligibility feedback for doctor consultation'
    ],
    badge: 'Confidential & Secure'
  },
  {
    number: '02',
    stage: 'Physician Consult',
    title: '1-on-1 Video Visit With a Licensed Indian Doctor',
    summary:
      'Connect over secure video with a board-certified physician who evaluates your endocrine biomarkers and medical suitability.',
    details: [
      'Comprehensive review of medical history and blood panels',
      'Evaluation for clinically approved GLP-1 therapy',
      'Opportunity to discuss goals, side-effect prevention, and expectations'
    ],
    badge: 'Board-Certified Doctors'
  },
  {
    number: '03',
    stage: 'Medical Protocol',
    title: 'Receive Your Certified Digital Prescription',
    summary:
      'When clinically eligible, your doctor issues an official, compliant digital prescription alongside your personalized titration schedule.',
    details: [
      'Clinically calibrated dosage ramp (0.25mg titration protocol)',
      'Official e-prescription valid at authorized licensed pharmacies',
      'Clear injection guidance and clinical safety instructions'
    ],
    badge: 'Official Digital Rx'
  },
  {
    number: '04',
    stage: 'Ongoing Support',
    title: 'Continuous 3-Pillar Care & Metabolic Titration',
    summary:
      'Your doctor, clinical dietitian, and metabolic coach actively coordinate to ensure steady fat loss, muscle defense, and long-term maintenance.',
    details: [
      'Daily WhatsApp meal logs adapted to Indian home cooking',
      'Guided low-impact resistance workouts to protect lean muscle',
      'Monthly physician check-ins to monitor labs and adjust dosage'
    ],
    badge: 'Doctor · Dietitian · Coach'
  }
]

export default function HowItWorksBurnex() {
  const [activeStep, setActiveStep] = useState(0)

  return (
    <section
      id="how-it-works"
      aria-label="How 8Liv Works"
      className="py-20 sm:py-24 lg:py-28 bg-[#F8FAF9] border-b border-slate-200/80 overflow-hidden"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Header */}
        <div className="text-center max-w-2xl mx-auto mb-14 sm:mb-16">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-100/80 border border-emerald-200/90 text-[#0E4A31] text-xs sm:text-sm font-bold uppercase tracking-wider mb-4 shadow-sm">
            <Sparkles className="w-4 h-4 text-[#00A884]" />
            <span>The 8Liv Clinical Pathway</span>
          </div>

          <div className="mb-4">
            <KineticText
              as="h2"
              className="font-sans text-[28px] xs:text-[34px] sm:text-4xl lg:text-5xl font-extrabold text-[#11241A] tracking-tight leading-tight"
            >
              How 8Liv Works
            </KineticText>
          </div>
          <ScrollRevealBox variant="fade-up" delay={0.2}>
            <p className="text-slate-600 font-sans text-base sm:text-lg leading-relaxed">
              A doctor-supervised medical program from initial health screening to continuous 3-pillar metabolic care — handled completely online.
            </p>
          </ScrollRevealBox>
        </div>

        {/* Interactive 2-Column Showcase */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-center">
          
          {/* Left Column: Interactive Step Selector */}
          <div className="lg:col-span-6 space-y-3.5">
            {steps.map((item, index) => {
              const isActive = activeStep === index

              return (
                <div
                  key={item.number}
                  onClick={() => setActiveStep(index)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault()
                      setActiveStep(index)
                    }
                  }}
                  tabIndex={0}
                  role="button"
                  aria-pressed={isActive}
                  className={`relative p-5 sm:p-6 rounded-2xl transition-all duration-300 cursor-pointer text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00A884] ${
                    isActive
                      ? 'bg-white shadow-[0_10px_35px_-8px_rgba(0,168,132,0.18)] border-2 border-[#00A884]'
                      : 'bg-white/60 hover:bg-white border border-slate-200/70 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-start gap-4">
                    {/* Number Badge */}
                    <div
                      className={`w-11 h-11 rounded-xl flex items-center justify-center font-mono font-bold text-base shrink-0 transition-colors ${
                        isActive
                          ? 'bg-[#00A884] text-white shadow-md shadow-[#00A884]/30'
                          : 'bg-slate-100 text-slate-500'
                      }`}
                    >
                      {item.number}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2 mb-1.5">
                        <span className={`text-xs sm:text-sm font-sans font-bold uppercase tracking-wider ${
                          isActive ? 'text-[#00A884]' : 'text-slate-400'
                        }`}>
                          {item.stage}
                        </span>
                        <span className="text-xs font-semibold text-slate-600 bg-slate-100 px-2.5 py-0.5 rounded-full">
                          {item.badge}
                        </span>
                      </div>

                      <h3 className="font-sans font-bold text-lg sm:text-xl text-[#11241A] mb-1.5 leading-snug">
                        {item.title}
                      </h3>

                      <p className="text-sm sm:text-base text-slate-600 font-sans leading-relaxed line-clamp-2">
                        {item.summary}
                      </p>

                      {/* Expandable highlights when active */}
                      {isActive && (
                        <div className="mt-4 pt-3.5 border-t border-slate-100 space-y-2 animate-fadeIn">
                          {item.details.map((detail, dIdx) => (
                            <div key={dIdx} className="flex items-center gap-2.5 text-xs sm:text-sm text-slate-700 font-medium">
                              <CheckCircle2 className="w-4 h-4 text-[#00A884] shrink-0" />
                              <span>{detail}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}

            {/* Assessment CTA Trigger */}
            <div className="pt-2">
              <Link
                href="/assessment"
                className="inline-flex items-center gap-2.5 px-8 sm:px-10 py-4 rounded-full bg-[#0E351F] hover:bg-[#15462A] text-white font-sans font-bold text-sm sm:text-base shadow-md shadow-[#0E351F]/20 hover:scale-[1.01] active:scale-[0.99] transition-all cursor-pointer"
              >
                <span>Check Your Treatment Eligibility</span>
                <ArrowRight className="w-4 h-4 text-[#00A884]" />
              </Link>
            </div>
          </div>

          {/* Right Column: Dynamic Live Preview Widget for Selected Step */}
          <div className="lg:col-span-6 flex justify-center">
            <div className="w-full max-w-[500px] min-h-[440px] rounded-[2.5rem] bg-gradient-to-b from-[#082214] via-[#051A0F] to-[#020B06] border border-white/15 p-6 sm:p-8 text-white shadow-2xl relative overflow-hidden flex flex-col justify-between">
              
              {/* Atmospheric Glow */}
              <div className="absolute top-0 right-0 w-64 h-64 bg-[radial-gradient(circle_at_100%_0%,rgba(0,168,132,0.25),transparent_70%)] pointer-events-none" />
              <div className="absolute bottom-0 left-0 w-64 h-64 bg-[radial-gradient(circle_at_0%_100%,rgba(0,168,132,0.15),transparent_70%)] pointer-events-none" />

              {/* Top Card Navigation Status */}
              <div className="relative z-10 flex items-center justify-between pb-4 border-b border-white/10">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-[#00A884] animate-pulse" />
                  <span className="text-xs font-mono font-bold uppercase tracking-wider text-emerald-400">
                    Step {steps[activeStep].number} · {steps[activeStep].stage}
                  </span>
                </div>
                <span className="text-[10px] font-sans text-slate-400">
                  8Liv Clinical Portal
                </span>
              </div>

              {/* Dynamic Center Preview Panels */}
              <div className="relative z-10 my-auto py-6">
                
                {/* STEP 1 PREVIEW: Health Assessment Questionnaire */}
                {activeStep === 0 && (
                  <div className="space-y-4 animate-fadeIn">
                    <div className="flex items-center gap-2.5 text-xs text-emerald-300 font-sans">
                      <Lock className="w-4 h-4 text-[#00A884]" />
                      <span>256-bit Encrypted Health Intake</span>
                    </div>

                    <div className="bg-white/5 border border-white/10 rounded-2xl p-4 space-y-3">
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-slate-300 font-medium">Question 3 of 8</span>
                        <span className="text-[#00A884] font-mono font-bold">38% Complete</span>
                      </div>
                      <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
                        <div className="h-full rounded-full bg-[#00A884] w-[38%]" />
                      </div>
                      <p className="text-sm font-semibold text-white pt-1">
                        What is your primary metabolic health objective?
                      </p>
                      <div className="grid grid-cols-1 gap-2 pt-1 text-xs">
                        <div className="p-2.5 rounded-xl bg-white/10 border border-[#00A884] text-white flex items-center justify-between">
                          <span>Sustained Fat Loss & Quiet Food Noise</span>
                          <CheckCircle2 className="w-4 h-4 text-[#00A884]" />
                        </div>
                        <div className="p-2.5 rounded-xl bg-white/5 border border-white/10 text-slate-300">
                          Blood Sugar Stability & Energy Consistency
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1">
                      <span>No commitment required</span>
                      <span className="text-emerald-300 font-medium">Takes under 3 minutes</span>
                    </div>
                  </div>
                )}

                {/* STEP 2 PREVIEW: Doctor Video Consultation */}
                {activeStep === 1 && (
                  <div className="space-y-4 animate-fadeIn">
                    <div className="relative rounded-2xl overflow-hidden border border-white/15 aspect-[16/10] bg-slate-900 flex items-center justify-center">
                      <img
                        src="/images/burnex/doctor_video.jpg"
                        alt="Doctor video consultation interface preview"
                        className="w-full h-full object-cover object-center"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/30" />
                      
                      {/* Top Bar of Call */}
                      <div className="absolute top-3 inset-x-3 flex items-center justify-between text-[10px]">
                        <span className="px-2.5 py-1 rounded-full bg-black/60 backdrop-blur-md border border-white/20 text-white font-mono flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                          Encrypted Video Consultation
                        </span>
                        <span className="px-2 py-0.5 rounded-md bg-black/50 text-slate-300 font-mono">
                          14:28
                        </span>
                      </div>

                      {/* Doctor Profile Overlay */}
                      <div className="absolute bottom-3 inset-x-3 flex items-center justify-between">
                        <div>
                          <p className="text-xs font-bold text-white">Dr. Ananya Sharma, MD</p>
                          <p className="text-[10px] text-emerald-300 font-sans">Endocrinology & Metabolic Health</p>
                        </div>
                        <div className="w-8 h-8 rounded-full bg-[#00A884] flex items-center justify-center text-white shadow-lg">
                          <Stethoscope className="w-4 h-4" />
                        </div>
                      </div>
                    </div>

                    <div className="p-3 rounded-xl bg-white/5 border border-white/10 flex items-center justify-between text-xs">
                      <span className="text-slate-300">Clinical Safety Review:</span>
                      <span className="text-emerald-300 font-bold flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5 text-[#00A884]" />
                        Lab Panels Verified
                      </span>
                    </div>
                  </div>
                )}

                {/* STEP 3 PREVIEW: Official Certified Digital Prescription */}
                {activeStep === 2 && (
                  <div className="space-y-4 animate-fadeIn">
                    <div className="bg-white/5 border border-white/15 rounded-2xl p-5 space-y-3.5">
                      <div className="flex items-center justify-between border-b border-white/10 pb-3">
                        <div>
                          <span className="text-[10px] font-mono text-emerald-400 uppercase tracking-wider block">Official e-Prescription</span>
                          <span className="text-sm font-bold text-white">GLP-1 Metabolic Protocol</span>
                        </div>
                        <div className="p-2 rounded-xl bg-[#00A884]/20 border border-[#00A884]/40 text-[#00A884]">
                          <FileText className="w-4 h-4" />
                        </div>
                      </div>

                      {/* Dosage schedule visual */}
                      <div className="space-y-2">
                        <div className="flex justify-between text-xs">
                          <span className="text-slate-300">Phase 1 Titration Ramp:</span>
                          <span className="text-emerald-300 font-mono font-bold">0.25 mg / Weekly</span>
                        </div>
                        <div className="flex gap-1.5 items-center">
                          <div className="flex-1 h-2 rounded-full bg-[#00A884] shadow-[0_0_8px_rgba(0,168,132,0.8)]" />
                          <div className="flex-1 h-2 rounded-full bg-white/20" />
                          <div className="flex-1 h-2 rounded-full bg-white/20" />
                          <div className="flex-1 h-2 rounded-full bg-white/20" />
                        </div>
                        <p className="text-[10px] text-slate-400">
                          Gradual titration to minimize GI sensitivity and promote smooth metabolic adaptation.
                        </p>
                      </div>

                      <div className="pt-2 border-t border-white/10 flex items-center justify-between text-[11px] text-slate-300">
                        <span>Digital Signature Verified</span>
                        <span className="font-mono text-emerald-300">Reg. No. MCI-48192</span>
                      </div>
                    </div>

                    <div className="p-3 rounded-xl bg-[#00A884]/15 border border-[#00A884]/30 flex items-center justify-between text-xs text-white">
                      <span>Prescription Accessibility</span>
                      <span className="font-semibold text-emerald-200">Fulfill at Any Licensed Pharmacy</span>
                    </div>
                  </div>
                )}

                {/* STEP 4 PREVIEW: Ongoing 3-Pillar Care & WhatsApp Check-Ins */}
                {activeStep === 3 && (
                  <div className="space-y-4 animate-fadeIn">
                    <div className="grid grid-cols-3 gap-2 text-center text-xs">
                      <div className="p-2.5 rounded-xl bg-white/5 border border-white/10">
                        <Stethoscope className="w-4 h-4 text-[#00A884] mx-auto mb-1" />
                        <span className="text-[10px] text-slate-300 block font-medium">Doctor</span>
                        <span className="text-[9px] text-emerald-400 font-mono">Monthly Titration</span>
                      </div>
                      <div className="p-2.5 rounded-xl bg-white/5 border border-[#00A884]/50 bg-[#00A884]/10">
                        <Salad className="w-4 h-4 text-[#00A884] mx-auto mb-1" />
                        <span className="text-[10px] text-white block font-medium">Dietitian</span>
                        <span className="text-[9px] text-emerald-300 font-mono">Daily WhatsApp</span>
                      </div>
                      <div className="p-2.5 rounded-xl bg-white/5 border border-white/10">
                        <Dumbbell className="w-4 h-4 text-[#00A884] mx-auto mb-1" />
                        <span className="text-[10px] text-slate-300 block font-medium">Coach</span>
                        <span className="text-[9px] text-emerald-400 font-mono">Muscle Defense</span>
                      </div>
                    </div>

                    {/* WhatsApp Nutrition Calibration Preview */}
                    <div className="p-4 rounded-2xl bg-[#0b2416] border border-emerald-500/30 space-y-2">
                      <div className="flex items-center justify-between text-[11px] text-emerald-300 font-sans">
                        <span>WhatsApp Meal Check-In</span>
                        <span className="text-slate-400 font-mono text-[10px]">Today, 1:42 PM</span>
                      </div>
                      <div className="p-2.5 rounded-xl bg-black/40 text-xs text-slate-200 font-sans leading-relaxed">
                        &quot;Great job on lunch! 2 rotis with dal and paneer bhurji fits your protein target perfectly while your GLP-1 maintains satiety.&quot;
                      </div>
                      <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1">
                        <span>Dietitian Swati R.</span>
                        <span className="text-emerald-400 font-semibold">Goal: Preserve Muscle Rate</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-slate-300 px-1">
                      <span>No Rebound Guarantee</span>
                      <span className="text-emerald-300 font-medium">Root-Cause Metabolic Reset</span>
                    </div>
                  </div>
                )}

              </div>

              {/* Bottom Card Footer Action Indicator */}
              <div className="relative z-10 pt-4 border-t border-white/10 flex items-center justify-between text-xs text-slate-400">
                <span>Select any step to view clinical protocol</span>
                <span className="font-mono text-emerald-400 font-bold">
                  {activeStep + 1} of 4
                </span>
              </div>

            </div>
          </div>

        </div>

      </div>
    </section>
  )
}
