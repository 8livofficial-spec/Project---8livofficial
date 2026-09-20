'use client'

import React from 'react'
import Link from 'next/link'
import {
  TrendingUp,
  Flame,
  Sprout,
  Check,
  ArrowRight,
  UtensilsCrossed,
  Droplets,
  Stethoscope,
} from 'lucide-react'

const featureCards = [
  {
    number: '01',
    badgeText: '01',
    icon: <UtensilsCrossed className="w-4 h-4 text-[#00A884]" />,
    iconBg: 'bg-[#E8F8F5]',
    gradientBg: 'from-white via-white to-[#E8F8F5]/30',
    hoverBorder: 'hover:border-[#00A884]/40',
    title: 'Quiet Food Noise',
    description:
      'Calm constant cravings at the biological level so food stops controlling your day.',
    imageSrc: '/images/reality_food_bowl.jpg',
    imageAlt: 'Nutritious balanced meal bowl',
    link: '/how-it-works',
  },
  {
    number: '02',
    badgeText: '02',
    icon: <Droplets className="w-4 h-4 text-[#0284C7]" />,
    iconBg: 'bg-[#E0F7FA]',
    gradientBg: 'from-white via-white to-[#E0F7FA]/30',
    hoverBorder: 'hover:border-[#0284C7]/40',
    title: 'Reset Your Set-Point',
    description:
      'Shift your body’s natural weight floor to prevent post-diet rebound permanently.',
    imageSrc: '/images/reality_setpoint_glow.jpg',
    imageAlt: 'Metabolic set-point equilibrium visualization',
    link: '/how-it-works',
  },
  {
    number: '03',
    badgeText: '03',
    icon: <Stethoscope className="w-4 h-4 text-[#7C3AED]" />,
    iconBg: 'bg-[#F3E8FF]',
    gradientBg: 'from-white via-white to-[#F3E8FF]/30',
    hoverBorder: 'hover:border-[#7C3AED]/40',
    title: 'Physician Oversight',
    description:
      'Ongoing 1-on-1 guidance with licensed doctors and Indian nutrition specialists.',
    imageSrc: '/images/reality_physician_tablet.svg',
    imageAlt: 'Licensed physician clinical guidance',
    link: '/how-it-works',
  },
]

export default function Recognition() {
  return (
    <section
      id="brand-manifesto"
      className="relative z-10 py-16 sm:py-20 lg:py-28 bg-transparent border-b border-slate-200/50 overflow-hidden"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* ========================================================= */}
        {/* 01. DYNAMIC TWO-COLUMN HERO COMPOSITION                   */}
        {/* ========================================================= */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-8 items-center">
          
          {/* LEFT COLUMN: HERO COPY & PRIMARY CTA */}
          <div className="lg:col-span-6 flex flex-col items-start text-left">
            {/* Elegant Category Eyebrow with Line Accent */}
            <div className="inline-flex items-center gap-2.5 mb-4 sm:mb-5">
              <span className="w-7 sm:w-9 h-[2px] bg-[#00A884] rounded-full" />
              <p className="text-xs sm:text-[13px] font-bold uppercase tracking-[0.22em] text-[#00A884] font-sora">
                THE METABOLIC REALITY
              </p>
            </div>

            {/* High-Impact Brand Headline */}
            <h2 className="font-sora text-3xl xs:text-4xl sm:text-5xl lg:text-[3.25rem] font-extrabold text-[#0F172A] leading-[1.12] tracking-tight mb-4 sm:mb-6">
              Weight is biology,<br />
              <span className="text-[#00A884]">not willpower.</span>
            </h2>

            {/* Breathable, Empathetic Subtext */}
            <p className="text-sm sm:text-base lg:text-lg text-[#64748B] font-light leading-relaxed max-w-lg mb-7 sm:mb-9">
              Crash diets fail because your body’s hormones fight to regain lost weight. We combine clinical medicine with everyday Indian nutrition to reset your metabolism naturally.
            </p>

            {/* Premium Pill CTA Button */}
            <div>
              <Link
                href="/assessment"
                id="metabolic-reality-cta"
                className="inline-flex items-center justify-center gap-2.5 px-6 sm:px-7 py-3.5 rounded-full bg-[#00A884] hover:bg-[#009272] text-white font-sora font-semibold text-xs sm:text-sm shadow-lg shadow-[#00A884]/25 hover:shadow-xl hover:shadow-[#00A884]/35 transition-all duration-200 active:scale-[0.98] group cursor-pointer"
              >
                <span>Start Your Journey</span>
                <ArrowRight className="w-4 h-4 transition-transform duration-200 group-hover:translate-x-1" />
              </Link>
            </div>
          </div>

          {/* RIGHT COLUMN: HEALTHCARE & WELLNESS VISUAL WITH FLOATING BADGES */}
          <div className="lg:col-span-6 relative flex items-center justify-center pt-4 sm:pt-6 lg:pt-0">
            <div className="relative w-full max-w-[400px] sm:max-w-[460px] lg:max-w-[500px] aspect-square flex items-center justify-center">
              
              {/* Soft Organic Ambient Mint Glow Behind Circle */}
              <div className="absolute inset-4 sm:inset-6 bg-[#00A884]/15 rounded-full blur-3xl pointer-events-none -z-10" />

              {/* Decorative Subtle Botanical Accents */}
              <svg
                viewBox="0 0 200 200"
                className="absolute -top-4 -left-4 w-28 h-28 sm:w-36 sm:h-36 text-[#00A884]/20 pointer-events-none -z-10"
                fill="currentColor"
              >
                <path d="M40,120 C20,70 60,30 110,30 C90,60 90,90 40,120 Z" />
              </svg>
              <svg
                viewBox="0 0 200 200"
                className="absolute -bottom-6 -right-6 w-32 h-32 sm:w-44 sm:h-44 text-[#00A884]/15 pointer-events-none -z-10"
                fill="currentColor"
              >
                <path d="M160,80 C180,130 140,170 90,170 C110,140 110,110 160,80 Z" />
              </svg>

              {/* Mint Circular Backdrop Housing the Hero Portrait */}
              <div className="relative w-[270px] h-[270px] xs:w-[300px] xs:h-[300px] sm:w-[370px] sm:h-[370px] lg:w-[410px] lg:h-[410px] rounded-full p-2.5 sm:p-3.5 bg-gradient-to-b from-[#E7F8F3] via-[#D5F3EB] to-[#BFECE0] shadow-2xl shadow-[#00A884]/15 border border-[#00A884]/25 flex items-center justify-center">
                <div className="w-full h-full rounded-full overflow-hidden relative shadow-inner">
                  <img
                    src="/images/reality_woman_wellness.jpg"
                    alt="8LIV Confident Patient Metabolic Wellness"
                    loading="lazy"
                    decoding="async"
                    className="w-full h-full object-cover object-top transition-transform duration-700 hover:scale-105"
                  />
                  {/* Gentle gradient wash on portrait edge */}
                  <div className="absolute inset-0 rounded-full bg-gradient-to-t from-[#00A884]/15 via-transparent to-transparent pointer-events-none" />
                </div>
              </div>

              {/* ── FLOATING INFORMATION BADGE 1: Hormone Balance (Top Left) ── */}
              <div className="absolute top-1 sm:top-5 -left-2 sm:-left-6 lg:-left-10 z-20 bg-white/95 backdrop-blur-md border border-slate-200/80 rounded-2xl p-2.5 sm:p-3.5 shadow-xl shadow-slate-900/5 hover:-translate-y-1 transition-all duration-300 pointer-events-auto transform scale-[0.82] xs:scale-[0.9] sm:scale-100 origin-top-left">
                <div className="flex items-center gap-2 mb-1.5">
                  <div className="w-6 h-6 rounded-lg bg-[#E8F8F5] flex items-center justify-center text-[#00A884] shrink-0">
                    <TrendingUp className="w-3.5 h-3.5" />
                  </div>
                  <span className="font-sora font-bold text-[11px] sm:text-xs text-[#0F172A] leading-tight">
                    Better Hormone<br />Balance
                  </span>
                </div>
                {/* Mini Metric Sparkline Chart */}
                <div className="w-28 sm:w-32 h-6 pl-1">
                  <svg viewBox="0 0 100 24" className="w-full h-full overflow-visible">
                    <path
                      d="M 0,18 Q 18,20 30,13 T 58,10 T 80,4 T 100,2"
                      fill="none"
                      stroke="#00A884"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                    />
                    <circle cx="100" cy="2" r="2.5" fill="#00A884" />
                  </svg>
                </div>
              </div>

              {/* ── FLOATING INFORMATION BADGE 2: Sustainable Weight Loss (Top Right) ── */}
              <div className="absolute top-3 sm:top-8 -right-2 sm:-right-6 lg:-right-8 z-20 bg-white/95 backdrop-blur-md border border-slate-200/80 rounded-2xl px-3 sm:px-4 py-2 sm:py-2.5 shadow-xl shadow-slate-900/5 hover:-translate-y-1 transition-all duration-300 flex items-center gap-2.5 pointer-events-auto transform scale-[0.82] xs:scale-[0.9] sm:scale-100 origin-top-right">
                <div className="w-6 h-6 rounded-lg bg-[#E8F8F5] flex items-center justify-center text-[#00A884] shrink-0">
                  <Flame className="w-3.5 h-3.5" />
                </div>
                <span className="font-sora font-semibold text-[11px] sm:text-xs text-[#0F172A] whitespace-nowrap">
                  Sustainable Weight Loss
                </span>
                <div className="w-4 h-4 rounded-full bg-[#00A884] flex items-center justify-center text-white shrink-0">
                  <Check className="w-2.5 h-2.5 stroke-[3]" />
                </div>
              </div>

              {/* ── FLOATING INFORMATION BADGE 3: Improved Metabolic Health (Mid/Bottom Right) ── */}
              <div className="absolute bottom-8 sm:bottom-12 -right-2 sm:-right-4 lg:-right-6 z-20 bg-white/95 backdrop-blur-md border border-slate-200/80 rounded-2xl px-3 sm:px-4 py-2 sm:py-2.5 shadow-xl shadow-slate-900/5 hover:-translate-y-1 transition-all duration-300 flex items-center gap-2.5 pointer-events-auto transform scale-[0.82] xs:scale-[0.9] sm:scale-100 origin-bottom-right">
                <div className="w-6 h-6 rounded-lg bg-[#E8F8F5] flex items-center justify-center text-[#00A884] shrink-0">
                  <Sprout className="w-3.5 h-3.5" />
                </div>
                <span className="font-sora font-semibold text-[11px] sm:text-xs text-[#0F172A] whitespace-nowrap">
                  Improved Metabolic Health
                </span>
                <div className="w-4 h-4 rounded-full bg-[#00A884] flex items-center justify-center text-white shrink-0">
                  <Check className="w-2.5 h-2.5 stroke-[3]" />
                </div>
              </div>

            </div>
          </div>

        </div>

        {/* ========================================================= */}
        {/* 02. THREE REFINED FEATURE CARDS WITH CONTEXTUAL VISUALS   */}
        {/* ========================================================= */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8 mt-14 sm:mt-16 lg:mt-20 text-left">
          {featureCards.map((item) => (
            <div
              key={item.number}
              className={`relative overflow-hidden rounded-[2rem] bg-gradient-to-br ${item.gradientBg} border border-slate-200/80 ${item.hoverBorder} hover:shadow-xl hover:shadow-slate-900/5 transition-all duration-300 p-6 sm:p-7 flex flex-col justify-between min-h-[250px] sm:min-h-[270px] group`}
            >
              {/* Card Header: Icon & Number Badge */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div
                    className={`w-10 h-10 rounded-2xl ${item.iconBg} flex items-center justify-center shadow-xs`}
                  >
                    {item.icon}
                  </div>
                  <span className="font-sora font-bold text-xs text-slate-400 tracking-wider">
                    {item.badgeText}
                  </span>
                </div>

                {/* Card Title & Description */}
                <h3 className="font-sora text-lg sm:text-xl font-bold text-[#0F172A] mb-2 tracking-tight">
                  {item.title}
                </h3>

                <p className="text-xs sm:text-sm text-[#64748B] font-light leading-relaxed max-w-[210px] sm:max-w-[230px]">
                  {item.description}
                </p>
              </div>

              {/* Card Footer: Interactive Learn More Link */}
              <div className="pt-5 mt-auto z-10">
                <Link
                  href={item.link}
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-[#0F172A] group-hover:text-[#00A884] transition-colors"
                >
                  <span>Learn More</span>
                  <ArrowRight className="w-3.5 h-3.5 transition-transform duration-200 group-hover:translate-x-1 text-[#00A884]" />
                </Link>
              </div>

              {/* Contextual Visual Element in Bottom Right */}
              <div className="absolute -right-3 -bottom-3 w-28 h-28 sm:w-32 sm:h-32 rounded-full overflow-hidden shadow-md border-2 border-white pointer-events-none group-hover:scale-105 transition-transform duration-500 bg-white">
                <img
                  src={item.imageSrc}
                  alt={item.imageAlt}
                  loading="lazy"
                  decoding="async"
                  className="w-full h-full object-cover object-center"
                />
                {/* Subtle soft gradient fade into card body */}
                <div className="absolute inset-0 bg-gradient-to-t from-transparent via-transparent to-white/10" />
              </div>
            </div>
          ))}
        </div>

      </div>
    </section>
  )
}
