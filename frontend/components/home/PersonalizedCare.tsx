import React from 'react'
import Link from 'next/link'
import { ArrowRight, Globe, Mic, PhoneOff, Video, Volume2 } from 'lucide-react'
import KineticText from '@/components/ui/KineticText'
import ScrollRevealBox from '@/components/ui/ScrollRevealBox'

export default function PersonalizedCare() {
  return (
    <section
      id="telehealth-care"
      aria-label="Personalized Care Anytime You Need"
      className="relative isolate w-full py-20 sm:py-24 lg:py-28 overflow-hidden"
    >
      {/* Background with Lush Green Botanical Leaf Texture */}
      <div className="absolute inset-0 pointer-events-none z-0">
        <img
          src="/images/burnex/bg_leaves.jpg"
          alt="Lush green botanical backdrop"
          className="w-full h-full object-cover object-center filter brightness-[0.55] saturate-[1.6] contrast-[1.1]"
        />
        <div className="absolute inset-0 bg-[#0B2416]/75 backdrop-blur-xs" />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-end justify-between mb-12 sm:mb-16 gap-6">
          <div className="max-w-xl">
            <KineticText
              as="h2"
              className="font-sans text-[28px] xs:text-[34px] sm:text-4xl lg:text-5xl font-extrabold text-white tracking-tight leading-tight mb-6"
            >
              Personalized Care, Anytime You Need
            </KineticText>
            <ScrollRevealBox variant="fade-up" delay={0.2}>
              <Link
                href="/assessment"
                className="inline-flex items-center gap-2.5 px-8 sm:px-10 py-4 rounded-full bg-[#00A884] hover:bg-[#008f70] text-white font-sans font-bold text-sm sm:text-base shadow-[0_0_25px_rgba(0,168,132,0.45)] transition-all cursor-pointer hover:scale-[1.02] active:scale-[0.98]"
              >
                <span>Talk to an Expert</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </ScrollRevealBox>
          </div>
          <ScrollRevealBox variant="fade-up" delay={0.25} className="max-w-md">
            <p className="text-slate-100 font-sans text-base sm:text-lg leading-relaxed">
              Build trust with continuous, customized medical & coaching support, expert physician guidance, real progress tracking, and ongoing 1-on-1 care.
            </p>
          </ScrollRevealBox>
        </div>

        {/* 3 Telehealth Dashboard Cards with Staggered Entrance */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
          
          {/* ── CARD 1 (LEFT - COL 4): BODY WEIGHT (KG) GRAPH ── */}
          <ScrollRevealBox variant="stagger-scale" delay={0.1} className="lg:col-span-4 rounded-3xl bg-white/15 backdrop-blur-xl border border-white/25 p-6 sm:p-7 text-white flex flex-col justify-between shadow-2xl hover:-translate-y-1 transition-all duration-300">
            <div>
              <h3 className="font-sans font-bold text-base sm:text-lg text-white mb-1">Body Weight (kg)</h3>
              <p className="text-sm text-slate-200 font-sans mb-6">Last 6 month</p>

              {/* Exact Graph from Reference Image 3 (Bracket Axis + Two Interwoven Waves + Reference Numbers) */}
              <div className="w-full h-44 relative pl-2 pr-1">
                <svg viewBox="0 0 300 140" className="w-full h-full overflow-visible">
                  {/* Left and Bottom Bracket Axis Line with Rounded Corner (Matching Image 3) */}
                  <path
                    d="M 25 15 L 25 105 Q 25 118, 38 118 L 285 118"
                    fill="none"
                    stroke="rgba(255,255,255,0.7)"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                  />

                  {/* Horizontal Fine Grid Guidelines */}
                  <line x1="38" y1="35" x2="285" y2="35" stroke="rgba(255,255,255,0.12)" strokeWidth="1" strokeDasharray="3 3" />
                  <line x1="38" y1="75" x2="285" y2="75" stroke="rgba(255,255,255,0.12)" strokeWidth="1" strokeDasharray="3 3" />

                  {/* Interwoven Wave 1 (Soft White / Subtle) */}
                  <path
                    d="M 35 85 Q 85 105, 140 70 T 240 65 T 280 85"
                    fill="none"
                    stroke="rgba(255,255,255,0.6)"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                  />

                  {/* Interwoven Wave 2 (Brand Teal #00A884 with Glowing Indicator) */}
                  <path
                    d="M 35 75 Q 90 65, 145 90 T 245 60 T 280 50"
                    fill="none"
                    stroke="#00A884"
                    strokeWidth="3.5"
                    strokeLinecap="round"
                    className="drop-shadow-[0_0_10px_rgba(0,168,132,0.8)]"
                  />
                  <circle cx="280" cy="50" r="4.5" fill="#00A884" />
                </svg>

                {/* Exact Reference Numbers along Bottom: 250 100 220 30 90 10 0 */}
                <div className="flex justify-between text-xs text-slate-200 font-mono mt-2 pl-6 pr-1">
                  <span>250</span>
                  <span>100</span>
                  <span>220</span>
                  <span>30</span>
                  <span>90</span>
                  <span>10</span>
                  <span>0</span>
                </div>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-white/15 flex justify-between items-center text-sm text-slate-200">
              <span>Target Achieved</span>
              <span className="font-bold text-base text-[#00A884]">-16.5 kg</span>
            </div>
          </ScrollRevealBox>

          {/* ── CARD 2 (CENTER - COL 5): OUTLINED DOCTOR VIDEO CALL SCREEN ── */}
          <ScrollRevealBox variant="stagger-scale" delay={0.2} className="lg:col-span-5 rounded-3xl overflow-hidden shadow-2xl border border-white/30 relative aspect-[4/3] lg:aspect-auto min-h-[360px] bg-slate-950 flex flex-col justify-between group hover:-translate-y-1 transition-all duration-300">
            {/* Main Video Stream: Friendly Doctor */}
            <img
              src="/images/burnex/doctor_video.jpg"
              alt="Licensed doctor telehealth consultation"
              className="absolute inset-0 w-full h-full object-cover object-top filter brightness-[0.95]"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-slate-950/40 pointer-events-none" />

            {/* Top Bar: Call Timer & PIP Patient Avatar */}
            <div className="relative z-10 p-4 flex justify-between items-start">
              <span className="px-3.5 py-1 rounded-full bg-black/60 backdrop-blur-md border border-white/20 text-white font-mono text-xs sm:text-sm font-semibold">
                04:12
              </span>

              {/* Patient Picture-in-Picture */}
              <div className="w-16 h-20 rounded-2xl overflow-hidden border-2 border-white/70 shadow-2xl bg-slate-800">
                <img
                  src="/images/burnex/patient_video.jpg"
                  alt="Patient"
                  className="w-full h-full object-cover"
                />
              </div>
            </div>

            {/* Bottom Floating Frosted Glass Call Controls */}
            <div className="relative z-10 p-4">
              <div className="bg-black/50 backdrop-blur-xl border border-white/25 rounded-full px-5 py-2.5 flex items-center justify-between max-w-sm mx-auto shadow-2xl">
                <button className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center text-white transition-colors" aria-label="Mute mic">
                  <Mic className="w-4 h-4" />
                </button>
                <button className="w-10 h-10 rounded-full bg-[#00A884] hover:bg-[#008f70] flex items-center justify-center text-white transition-colors shadow-lg" aria-label="End call">
                  <PhoneOff className="w-4 h-4" />
                </button>
                <button className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center text-white transition-colors" aria-label="Camera toggle">
                  <Video className="w-4 h-4" />
                </button>
                <button className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center text-white transition-colors" aria-label="Volume">
                  <Volume2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          </ScrollRevealBox>

          {/* ── CARD 3 (RIGHT - COL 3): GLOBAL ACCESS & THREE COACH AVAILABILITIES ── */}
          <ScrollRevealBox variant="stagger-scale" delay={0.3} className="lg:col-span-3 rounded-3xl bg-white/15 backdrop-blur-xl border border-white/25 p-6 sm:p-7 text-white flex flex-col justify-between shadow-2xl hover:-translate-y-1 transition-all duration-300">
            <div>
              <div className="flex items-center justify-between mb-5">
                <h3 className="font-sans font-bold text-base sm:text-lg text-white">Global Access</h3>
                <Globe className="w-5 h-5 text-[#00A884]" />
              </div>

              {/* Stacked Glass Info Tiles */}
              <div className="space-y-3 mb-5">
                <div className="rounded-2xl p-3.5 bg-white/10 border border-white/15 text-xs sm:text-sm">
                  <span className="text-slate-200 block mb-0.5">5 Languages Available</span>
                  <span className="font-semibold text-white">Hindi, Tamil, Telugu, English</span>
                </div>
              </div>

              {/* Coach Availability Status (Doctor, Dietitian, Gym Trainer) */}
              <div>
                <span className="text-xs sm:text-sm text-slate-200 font-medium block mb-2.5">Care Team Availability</span>
                <div className="space-y-2 text-xs sm:text-sm">
                  <div className="flex justify-between items-center p-2.5 rounded-xl bg-white/10 border border-white/15">
                    <span className="font-medium text-slate-100">Lead Physician</span>
                    <span className="inline-flex items-center gap-1.5 text-[#00A884] font-semibold text-xs">
                      <span className="w-2 h-2 rounded-full bg-[#00A884] animate-pulse" />
                      <span>Online</span>
                    </span>
                  </div>
                  <div className="flex justify-between items-center p-2.5 rounded-xl bg-white/10 border border-white/15">
                    <span className="font-medium text-slate-100">Dietitian</span>
                    <span className="inline-flex items-center gap-1.5 text-[#00A884] font-semibold text-xs">
                      <span className="w-2 h-2 rounded-full bg-[#00A884] animate-pulse" />
                      <span>Online</span>
                    </span>
                  </div>
                  <div className="flex justify-between items-center p-2.5 rounded-xl bg-white/10 border border-white/15">
                    <span className="font-medium text-slate-100">Gym Coach</span>
                    <span className="inline-flex items-center gap-1.5 text-[#00A884] font-semibold text-xs">
                      <span className="w-2 h-2 rounded-full bg-[#00A884] animate-pulse" />
                      <span>Online</span>
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-white/15">
              <span className="text-xs text-slate-200">Board-Certified Telehealth Platform</span>
            </div>
          </ScrollRevealBox>

        </div>

      </div>
    </section>
  )
}
