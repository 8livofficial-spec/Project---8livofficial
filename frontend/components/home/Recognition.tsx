'use client'

import React from 'react'
import { Brain, Flame, Stethoscope } from 'lucide-react'
import ScrollReveal from '@/components/ui/ScrollReveal'

const principles = [
  {
    number: '01',
    icon: <Brain className="w-5 h-5 text-[#00A884]" />,
    title: 'Quiet Food Noise',
    description: 'Calm constant cravings at the biological level so food stops controlling your day.',
  },
  {
    number: '02',
    icon: <Flame className="w-5 h-5 text-[#00A884]" />,
    title: 'Reset Your Set-Point',
    description: 'Shift your body’s natural weight floor to prevent post-diet rebound permanently.',
  },
  {
    number: '03',
    icon: <Stethoscope className="w-5 h-5 text-[#00A884]" />,
    title: 'Physician Oversight',
    description: 'Ongoing 1-on-1 guidance with licensed doctors and Indian nutrition specialists.',
  },
]

export default function Recognition() {
  return (
    <section
      id="brand-manifesto"
      className="relative z-10 py-16 sm:py-20 bg-transparent border-b border-slate-200/50"
    >
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        
        {/* Subtle Category Eyebrow */}
        <p className="text-xs sm:text-sm font-bold uppercase tracking-[0.25em] text-[#00A884] font-sora mb-3">
          THE METABOLIC REALITY
        </p>

        {/* Crisp, Empathetic Headline */}
        <ScrollReveal
          baseOpacity={0}
          enableBlur={true}
          baseRotation={4}
          blurStrength={8}
          containerClassName="max-w-2xl mx-auto mb-4"
          textClassName="font-sora text-3xl sm:text-4xl md:text-5xl font-extrabold text-[#0F172A] leading-tight tracking-tight text-center"
        >
          Weight is biology, not willpower.
        </ScrollReveal>

        {/* Short, Breathable 2-Line Subtext (No Textbook!) */}
        <p className="text-base sm:text-lg text-[#64748B] font-light leading-relaxed max-w-xl mx-auto mb-12 sm:mb-14">
          Crash diets fail because your body’s hormones fight to regain lost weight. We combine clinical medicine with everyday Indian nutrition to reset your metabolism naturally.
        </p>

        {/* 3 Clean, Airy Cards (No Clutter, No Image) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-left">
          {principles.map((item) => (
            <div
              key={item.number}
              className="p-6 sm:p-7 rounded-3xl bg-[#FAF9F6] border border-slate-200/70 hover:border-[#00A884]/40 transition-colors"
            >
              <div className="flex items-center justify-between mb-5">
                <div className="w-10 h-10 rounded-2xl bg-white border border-slate-200/80 flex items-center justify-center shadow-xs">
                  {item.icon}
                </div>
                <span className="font-sora font-bold text-xs text-slate-400">
                  {item.number}
                </span>
              </div>

              <h3 className="font-sora text-lg font-bold text-[#0F172A] mb-2">
                {item.title}
              </h3>

              <p className="text-sm text-[#64748B] font-light leading-relaxed">
                {item.description}
              </p>
            </div>
          ))}
        </div>

      </div>
    </section>
  )
}
