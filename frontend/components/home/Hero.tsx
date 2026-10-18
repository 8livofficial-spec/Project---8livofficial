'use client'

import React from 'react'
import Link from 'next/link'
import { ArrowRight, ShieldCheck, Salad, CheckCircle2 } from 'lucide-react'
import KineticText from '@/components/ui/KineticText'
import ScrollRevealBox from '@/components/ui/ScrollRevealBox'

export default function Hero() {
  return (
    <section
      id="hero"
      aria-label="Doctor-Led GLP-1 Care for Sustainable Weight Loss"
      className="relative isolate w-full min-h-[100svh] overflow-hidden pt-24 sm:pt-28 md:pt-32 lg:pt-36 pb-20 sm:pb-24 lg:pb-28 flex flex-col justify-between"
    >
      {/* ========================================================= */}
      {/* 01. VIBRANT LUSH GREEN BOTANICAL BACKDROP & AMBIENT AURA  */}
      {/* ========================================================= */}
      <div className="absolute inset-0 pointer-events-none z-0 overflow-hidden">
        <img
          src="/images/burnex/bg_leaves.jpg"
          alt="Lush green botanical leaves backdrop"
          className="w-full h-full object-cover object-center filter brightness-[0.52] saturate-[1.65] contrast-[1.14] scale-105"
        />
        {/* Multi-layered forest emerald atmospheric gradient */}
        <div className="absolute inset-0 bg-gradient-to-b from-[#081C10]/85 via-[#0B2616]/55 to-[#06150C]/92" />
        
        {/* Soft atmospheric radial light shafts */}
        <div className="absolute top-0 inset-x-0 h-[500px] bg-[radial-gradient(ellipse_60%_50%_at_50%_0%,rgba(0,168,132,0.22),transparent_75%)]" />
        <div className="absolute bottom-0 inset-x-0 h-[600px] bg-[radial-gradient(ellipse_80%_40%_at_50%_100%,rgba(0,168,132,0.14),transparent_70%)]" />
      </div>

      {/* ========================================================= */}
      {/* 02. EDITORIAL LUXURY HEADLINE & BRAND TEAL CTA            */}
      {/* ========================================================= */}
      <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 text-center flex flex-col items-center mb-10 sm:mb-12 lg:mb-14">
        
        {/* Kinetic Typography Headline */}
        <div className="mb-5 sm:mb-6 text-center">
          <KineticText
            as="h1"
            className="font-sans text-[32px] xs:text-[38px] sm:text-5xl md:text-6xl lg:text-[4.25rem] font-extrabold text-white tracking-tight leading-[1.14] text-center drop-shadow-[0_4px_30px_rgba(0,0,0,0.5)]"
            delay={0.1}
            stagger={0.06}
          >
            Doctor-Led GLP-1 Care for Sustainable Weight Loss
          </KineticText>
        </div>

        {/* Supporting Clinical Value Subtitle */}
        <ScrollRevealBox variant="fade-up" delay={0.25} duration={0.65}>
          <p className="text-slate-100 font-sans text-base sm:text-lg md:text-xl max-w-2xl mx-auto leading-relaxed mb-7 sm:mb-8 font-normal">
            Prescription GLP-1 medication combined with Indian metabolic nutrition and lean-muscle coaching — continuously monitored by your dedicated care team.
          </p>
        </ScrollRevealBox>

        {/* Brand Emerald/Teal CTA Button */}
        <ScrollRevealBox variant="fade-up" delay={0.35} duration={0.65}>
          <div className="flex flex-col items-center">
            <Link
              href="/assessment"
              id="hero-find-treatment"
              className="group relative inline-flex items-center gap-3 px-9 sm:px-11 py-4 sm:py-4.5 rounded-full bg-gradient-to-r from-[#00A884] to-[#0A8F70] hover:from-[#009977] hover:to-[#087F63] text-white font-sans font-bold text-sm sm:text-base shadow-[0_0_35px_rgba(0,168,132,0.45)] hover:shadow-[0_0_50px_rgba(0,168,132,0.7)] hover:scale-[1.02] active:scale-[0.98] transition-all duration-300 cursor-pointer overflow-hidden"
            >
              <span className="relative z-10">Find My Treatment</span>
              <div className="relative z-10 w-6 h-6 rounded-full bg-white/20 flex items-center justify-center transition-transform group-hover:translate-x-1">
                <ArrowRight className="w-4 h-4 text-white" />
              </div>
            </Link>
          </div>
        </ScrollRevealBox>

      </div>

      {/* ========================================================= */}
      {/* 03. OUT OF BOUNDS (OOB) 3D POP-OUT CARDS (3 PILLARS)      */}
      {/* ========================================================= */}
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-10 lg:gap-8 items-end pt-16 sm:pt-20 lg:pt-24">
          
          {/* ── CARD 1 (LEFT): CLINICAL DIETITIAN ── */}
          <ScrollRevealBox variant="stagger-scale" delay={0.15} duration={0.8} className="order-2 md:order-1 relative group flex flex-col justify-end pt-24 sm:pt-28">
            
            {/* The Glassmorphic Card Frame */}
            <div className="relative w-full h-[380px] sm:h-[400px] rounded-[2.5rem] shadow-[0_25px_60px_-15px_rgba(0,0,0,0.7)] border border-white/20 border-t-white/40 bg-gradient-to-b from-[#0a2315]/85 via-[#06180e]/90 to-[#020b06]/95 backdrop-blur-2xl overflow-hidden flex flex-col justify-end p-5">
              
              {/* Inner atmospheric garden glow */}
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(0,168,132,0.18),transparent_70%)] pointer-events-none" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/30 pointer-events-none" />
            </div>

            {/* 3D POP-OUT SUBJECT */}
            <div className="absolute inset-x-0 bottom-6 top-0 pointer-events-none z-20 flex justify-center items-end overflow-visible">
              <img
                src="/images/burnex/hero_diet_cutout.png"
                alt="Personalized metabolic nutrition adapted for Indian home meals"
                className="h-[118%] max-h-[500px] w-auto object-contain object-bottom drop-shadow-[0_20px_40px_rgba(0,0,0,0.7)] group-hover:scale-104 transition-transform duration-500 ease-out"
              />
            </div>

            {/* Bottom Glassmorphism Dietitian Widget */}
            <div className="absolute bottom-4 inset-x-3 sm:inset-x-4 z-30 pointer-events-auto">
              <div className="bg-[#040f08]/92 backdrop-blur-2xl border border-white/25 rounded-2xl p-4 sm:p-4.5 text-white shadow-2xl">
                <div className="mb-2.5">
                  <span className="font-sans font-bold text-sm sm:text-base tracking-tight text-white">Clinical Dietitian</span>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between items-center text-xs sm:text-sm">
                    <span className="font-sans text-[11px] sm:text-xs font-medium text-slate-300 uppercase tracking-wide">Blood Sugar Stability</span>
                    <span className="font-mono text-xs sm:text-sm font-bold text-teal-300">96.4%</span>
                  </div>
                  <div className="h-2 rounded-full bg-slate-800/80 overflow-hidden">
                    <div className="h-full rounded-full bg-gradient-to-r from-[#00A884] to-teal-300 w-[96%] shadow-[0_0_8px_rgba(0,168,132,0.6)]" />
                  </div>
                  <div className="flex justify-between items-center text-xs sm:text-sm">
                    <span className="font-sans text-[11px] sm:text-xs font-medium text-slate-300 uppercase tracking-wide">Diet Strategy</span>
                    <span className="font-sans text-xs sm:text-sm font-semibold text-slate-100">Zero Starvation · Indian Meals</span>
                  </div>
                </div>
              </div>
            </div>

          </ScrollRevealBox>

          {/* ── CARD 2 (CENTER - FEATURED): BOARD-CERTIFIED DOCTOR ── */}
          <ScrollRevealBox variant="stagger-scale" delay={0.25} duration={0.85} className="order-1 md:order-2 relative group z-30 flex flex-col justify-end pt-24 sm:pt-28">
            
            {/* Glowing Ambient Halo */}
            <div className="absolute -inset-2 bg-gradient-to-b from-[#00A884]/35 to-teal-500/10 rounded-[3rem] blur-2xl opacity-80 pointer-events-none" />

            {/* Card Frame */}
            <div className="relative w-full h-[400px] sm:h-[430px] rounded-[2.5rem] shadow-[0_30px_70px_rgba(0,0,0,0.7)] border border-white/30 border-t-white/60 bg-gradient-to-b from-[#0B2616]/85 via-[#06180e]/90 to-[#020b06]/95 backdrop-blur-2xl overflow-hidden flex flex-col justify-end p-5">
              
              {/* Medical Clinic Backdrop Layer */}
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(0,168,132,0.25),transparent_70%)] pointer-events-none" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-transparent to-black/30 pointer-events-none" />
            </div>

            {/* OOB POP-OUT SUBJECT */}
            <div className="absolute inset-x-0 bottom-6 top-0 pointer-events-none z-20 flex justify-center items-end overflow-visible">
              <img
                src="/images/burnex/hero_doctor_cutout.png"
                alt="Doctor out of bounds 3D pop out cutout"
                className="h-[124%] max-h-[550px] w-auto object-contain object-bottom drop-shadow-[0_25px_45px_rgba(0,0,0,0.75)] group-hover:scale-104 transition-transform duration-500 ease-out"
              />
            </div>

            {/* Bottom Glassmorphism Doctor Widget */}
            <div className="absolute bottom-4 inset-x-3 sm:inset-x-4 z-30 pointer-events-auto">
              <div className="bg-[#040f08]/92 backdrop-blur-2xl border border-white/30 border-t-white/50 rounded-2xl p-4 sm:p-4.5 text-white shadow-2xl">
                <div className="mb-1.5">
                  <span className="font-sans font-bold text-sm sm:text-base tracking-tight text-white">Dedicated Doctor</span>
                </div>
                <p className="font-sans text-xs sm:text-sm text-slate-200 leading-snug">
                  1-on-1 metabolic supervision & clinically calibrated GLP-1 prescription care.
                </p>
              </div>
            </div>

          </ScrollRevealBox>

          {/* ── CARD 3 (RIGHT): FITNESS COACH ── */}
          <ScrollRevealBox variant="stagger-scale" delay={0.35} duration={0.8} className="order-3 relative group flex flex-col justify-end pt-24 sm:pt-28">
            
            {/* The Glassmorphic Card Frame */}
            <div className="relative w-full h-[380px] sm:h-[400px] rounded-[2.5rem] shadow-[0_25px_60px_-15px_rgba(0,0,0,0.7)] border border-white/20 border-t-white/40 bg-gradient-to-b from-[#0a2315]/85 via-[#06180e]/90 to-[#020b06]/95 backdrop-blur-2xl overflow-hidden flex flex-col justify-end p-5">
              
              {/* Inner ambient gym glow */}
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(0,168,132,0.18),transparent_70%)] pointer-events-none" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/30 pointer-events-none" />
            </div>

            {/* OOB Pop-Out Subject */}
            <div className="absolute inset-x-0 bottom-6 top-0 pointer-events-none z-20 flex justify-center items-end overflow-visible">
              <img
                src="/images/burnex/hero_coach_cutout.png"
                alt="Fitness coach guided workout pop out cutout"
                className="h-[116%] max-h-[490px] w-auto object-contain object-bottom drop-shadow-[0_20px_40px_rgba(0,0,0,0.7)] group-hover:scale-104 transition-transform duration-500 ease-out"
              />
            </div>

            {/* Bottom Glassmorphism Fitness Widget */}
            <div className="absolute bottom-4 inset-x-3 sm:inset-x-4 z-30 pointer-events-auto">
              <div className="bg-[#040f08]/92 backdrop-blur-2xl border border-white/25 rounded-2xl p-4 sm:p-4.5 text-white shadow-2xl">
                <div className="mb-1.5">
                  <span className="font-sans font-bold text-sm sm:text-base tracking-tight text-white">Fitness Coach</span>
                </div>
                <p className="font-sans text-xs sm:text-sm text-slate-200 leading-snug">
                  Lean muscle retention & guided resistance routines tailored to your pace.
                </p>
              </div>
            </div>

          </ScrollRevealBox>

        </div>
      </div>
    </section>
  )
}

