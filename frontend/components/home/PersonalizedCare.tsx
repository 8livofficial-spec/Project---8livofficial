'use client'

import React from 'react'
import Link from 'next/link'
import {
  ArrowRight,
  Video,
  FileCheck2,
  UtensilsCrossed,
  CalendarCheck,
} from 'lucide-react'
import KineticText from '@/components/ui/KineticText'
import ScrollRevealBox from '@/components/ui/ScrollRevealBox'

interface WorkflowStep {
  step: string
  title: string
  description: string
  icon: React.ReactNode
}

const WORKFLOW_STEPS: WorkflowStep[] = [
  {
    step: '01',
    title: 'Doctor Video Consultation',
    description:
      'Direct 1-on-1 video session with a licensed Indian physician to analyze your metabolic history, lifestyle, and clinical candidacy.',
    icon: <Video className="w-5 h-5 text-[#00A884]" />,
  },
  {
    step: '02',
    title: 'Prescription in Your Orders',
    description:
      'Official digitally signed e-prescription issued directly to your patient portal. Download and fulfill conveniently at your preferred licensed pharmacy.',
    icon: <FileCheck2 className="w-5 h-5 text-[#00A884]" />,
  },
  {
    step: '03',
    title: 'Dietitian, Gym & Food Logs',
    description:
      'Dedicated clinical dietitian calibrating Indian meals (roti, dal, sabzi) paired with muscle-defense workouts and real-time food logging.',
    icon: <UtensilsCrossed className="w-5 h-5 text-[#00A884]" />,
  },
  {
    step: '04',
    title: 'Continuous Follow-ups',
    description:
      'Regular clinical review check-ins, dosage adjustments, blood-sugar monitoring, and sustainable maintenance without weight rebound.',
    icon: <CalendarCheck className="w-5 h-5 text-[#00A884]" />,
  },
]

export default function PersonalizedCare() {
  return (
    <section
      id="telehealth-care"
      aria-label="Personalized Care Anytime You Need"
      className="py-16 sm:py-20 lg:py-28 bg-[#FAFBF9] border-b border-slate-200/80 scroll-mt-20"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Responsive 2-Column Layout: Left Sticky Header + Right Vertical Timeline */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14 items-start">
          
          {/* ========================================================= */}
          {/* LEFT COLUMN: STICKY SECTION HEADER & CTA                  */}
          {/* ========================================================= */}
          <div className="lg:col-span-5 lg:sticky lg:top-28 lg:self-start">
            <KineticText
              as="h2"
              className="font-sans text-[28px] xs:text-[32px] sm:text-4xl lg:text-5xl font-extrabold text-[#11241A] tracking-tight leading-tight mb-4 sm:mb-6"
            >
              Personalized Care, Anytime You Need
            </KineticText>
            
            <ScrollRevealBox variant="fade-up" delay={0.15}>
              <p className="text-slate-600 font-sans text-base sm:text-lg leading-relaxed mb-8">
                Build trust with continuous, customized medical & coaching support, expert physician guidance, real progress tracking, and ongoing 1-on-1 care.
              </p>
            </ScrollRevealBox>

            <ScrollRevealBox variant="fade-up" delay={0.25}>
              <Link
                href="/assessment"
                className="inline-flex items-center gap-2.5 px-8 sm:px-10 py-3.5 sm:py-4 rounded-full bg-[#00A884] hover:bg-[#008f70] text-white font-sans font-bold text-sm sm:text-base shadow-lg hover:shadow-[0_0_30px_rgba(0,168,132,0.5)] transition-all cursor-pointer hover:scale-[1.02] active:scale-[0.98]"
              >
                <span>Talk to an Expert</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </ScrollRevealBox>
          </div>

          {/* ========================================================= */}
          {/* RIGHT COLUMN: VERTICAL CONNECTED WORKFLOW TIMELINE        */}
          {/* ========================================================= */}
          <div className="lg:col-span-7">
            <div className="relative">
              {/* Vertical Spine Progress Rail */}
              <div className="absolute left-5 sm:left-6 top-6 bottom-6 w-[2px] bg-emerald-200 pointer-events-none" />

              {/* Vertical Step Cards */}
              <div className="space-y-6 sm:space-y-7">
                {WORKFLOW_STEPS.map((step, idx) => (
                  <ScrollRevealBox
                    key={step.step}
                    variant="fade-up"
                    delay={0.1 + idx * 0.1}
                    className="relative flex items-start gap-4 sm:gap-6 group"
                  >
                    {/* Step Number Circle on the Spine */}
                    <div className="relative z-10 w-10 sm:w-12 h-10 sm:h-12 rounded-2xl bg-white border-2 border-[#00A884] flex items-center justify-center font-mono font-extrabold text-sm sm:text-base text-[#00A884] shadow-md group-hover:scale-105 group-hover:bg-[#00A884] group-hover:text-white transition-all shrink-0">
                      {step.step}
                    </div>

                    {/* Step Content Card */}
                    <div className="flex-1 bg-white rounded-2xl sm:rounded-3xl border border-slate-200/80 p-5 sm:p-7 shadow-xs hover:shadow-xl hover:border-emerald-500/40 transition-all duration-300">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center text-[#00A884] shrink-0">
                          {step.icon}
                        </div>
                        <h3 className="font-sans font-bold text-base sm:text-lg text-slate-900 group-hover:text-[#00A884] transition-colors">
                          {step.title}
                        </h3>
                      </div>

                      <p className="font-sans text-xs sm:text-sm text-slate-600 leading-relaxed">
                        {step.description}
                      </p>
                    </div>
                  </ScrollRevealBox>
                ))}
              </div>
            </div>
          </div>

        </div>

      </div>
    </section>
  )
}
