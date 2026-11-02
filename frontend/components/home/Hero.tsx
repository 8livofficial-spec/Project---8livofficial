'use client'

import React from 'react'
import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import KineticText from '@/components/ui/KineticText'
import ScrollRevealBox from '@/components/ui/ScrollRevealBox'

export default function Hero() {
  return (
    <>
      {/* ========================================================= */}
      {/* 01. FULLSCREEN HERO VIDEO VIEWPORT                        */}
      {/* ========================================================= */}
      <section
        id="hero"
        aria-label="Doctor-Led Medical Care for Sustainable Weight Loss"
        className="relative isolate w-full min-h-[100svh] overflow-hidden flex flex-col justify-center items-center px-4 sm:px-6 pt-24 pb-16 sm:pb-20"
      >
        {/* Fullscreen Video Backdrop with light, radiant overlay */}
        <div className="absolute inset-0 pointer-events-none z-0 overflow-hidden">
          <video
            autoPlay
            loop
            muted
            playsInline
            preload="auto"
            poster="/videos/hero-thumb.jpg"
            className="w-full h-full object-cover object-center brightness-[1.08] contrast-[1.03]"
          >
            <source src="/videos/hero-bg.mp4" type="video/mp4" />
          </video>

          {/* Ultra-clear, neutral contrast layer: no milky fog, no murky corner vignettes */}
          <div className="absolute inset-0 bg-gradient-to-b from-black/35 via-black/10 to-black/25" />
        </div>

        {/* Editorial Luxury Headline & Brand Teal CTA */}
        <div className="relative z-10 max-w-5xl mx-auto text-center flex flex-col items-center">
          {/* Kinetic Typography Headline */}
          <div className="mb-5 sm:mb-6 text-center">
            <KineticText
              as="h1"
              className="font-sans text-[32px] xs:text-[38px] sm:text-5xl md:text-6xl lg:text-[4.25rem] font-extrabold text-white tracking-tight leading-[1.14] text-center drop-shadow-[0_4px_30px_rgba(0,0,0,0.7)]"
              delay={0.1}
              stagger={0.06}
            >
              Doctor-Led Medical Care for Sustainable Weight Loss
            </KineticText>
          </div>

          {/* Supporting Clinical Value Subtitle */}
          <ScrollRevealBox variant="fade-up" delay={0.25} duration={0.65}>
            <p className="text-white/95 font-sans text-base sm:text-lg md:text-xl max-w-2xl mx-auto leading-relaxed mb-8 sm:mb-10 font-normal drop-shadow-[0_2px_15px_rgba(0,0,0,0.7)]">
              Physician-prescribed treatments combined with Indian metabolic nutrition and lean-muscle coaching — continuously monitored by your dedicated care team.
            </p>
          </ScrollRevealBox>

          {/* Brand Emerald/Teal CTA Button */}
          <ScrollRevealBox variant="fade-up" delay={0.35} duration={0.65}>
            <div className="flex flex-col items-center">
              <Link
                href="/assessment"
                id="hero-find-treatment"
                className="group relative inline-flex items-center gap-3 px-9 sm:px-11 py-4 sm:py-4.5 rounded-full bg-gradient-to-r from-[#00A884] to-[#0A8F70] hover:from-[#009977] hover:to-[#087F63] text-white font-sans font-bold text-sm sm:text-base shadow-[0_0_35px_rgba(0,168,132,0.5)] hover:shadow-[0_0_55px_rgba(0,168,132,0.8)] hover:scale-[1.02] active:scale-[0.98] transition-all duration-300 cursor-pointer overflow-hidden"
              >
                <span className="relative z-10">Find My Treatment</span>
                <div className="relative z-10 w-6 h-6 rounded-full bg-white/20 flex items-center justify-center transition-transform group-hover:translate-x-1">
                  <ArrowRight className="w-4 h-4 text-white" />
                </div>
              </Link>
            </div>
          </ScrollRevealBox>
        </div>
      </section>

      {/* ========================================================= */}
      {/* 02. REDEFINING WEIGHT LOSS THROUGH COMPREHENSIVE WELL-BEING */}
      {/* ========================================================= */}
      <section
        id="treatments"
        aria-label="Transform Your Life, Not Just Your Weight"
        className="py-20 sm:py-24 lg:py-28 bg-[#FAFBF9] border-b border-slate-200/80 scroll-mt-20"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="text-center max-w-3xl mx-auto mb-14 sm:mb-16">
            <KineticText
              as="h2"
              className="font-sans text-[28px] xs:text-[32px] sm:text-4xl lg:text-5xl font-extrabold text-[#11241A] tracking-tight leading-tight mb-4"
            >
              Transform Your Life, Not Just Your Weight
            </KineticText>
            <ScrollRevealBox variant="fade-up" delay={0.15}>
              <p className="text-slate-600 font-sans text-base sm:text-lg leading-relaxed">
                Professionally designed protocols tailored to your specific needs, providing safe, effective, and sustainable pathways toward your ultimate wellness.
              </p>
            </ScrollRevealBox>
          </div>

          {/* 3 Treatment Products (Doctor GLP-1, Dietitian Care, Movement Coaching) */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-7">
            {/* Card 1: Doctor-Led GLP-1 Protocol */}
            <ScrollRevealBox variant="stagger-scale" delay={0.1} className="rounded-[2.25rem] bg-[#163824] p-6 sm:p-7 text-white shadow-xl flex flex-col justify-between relative overflow-hidden group hover:-translate-y-1 transition-all duration-300">
              {/* Doctor Photographic Visual */}
              <div className="relative aspect-[4/3] rounded-2xl overflow-hidden bg-white/10 mb-6 flex items-center justify-center">
                <img
                  src="/images/burnex/doctor_consultation.jpg"
                  alt="Licensed Indian physician clinical consultation"
                  className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-500"
                />
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

              {/* Action Button */}
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
              {/* Product Photo: Wholesome Indian Meal */}
              <div className="relative aspect-[4/3] rounded-2xl overflow-hidden bg-slate-50 mb-6 flex items-center justify-center">
                <img
                  src="/images/burnex/dietitian_meal.jpg"
                  alt="Wholesome balanced Indian nutrition plate with rice, dal, and fresh vegetables"
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

              {/* Action Button */}
              <Link
                href="/assessment"
                className="w-full py-4 rounded-full bg-slate-900 hover:bg-[#00A884] text-white font-sans font-bold text-sm sm:text-base flex items-center justify-center gap-2 transition-all shadow-sm"
              >
                <span>Explore Nutrition Plan</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </ScrollRevealBox>

            {/* Card 3: Metabolic Movement Coaching */}
            <ScrollRevealBox variant="stagger-scale" delay={0.3} className="rounded-[2.25rem] bg-white p-6 sm:p-7 border border-slate-200/80 shadow-xs hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between group">
              {/* Product Photo: Strength Training */}
              <div className="relative aspect-[4/3] rounded-2xl overflow-hidden bg-slate-50 mb-6 flex items-center justify-center">
                <img
                  src="/images/burnex/movement_coach.jpg"
                  alt="Metabolic movement and core conditioning coaching"
                  className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-500"
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

              {/* Action Button */}
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
    </>
  )
}
