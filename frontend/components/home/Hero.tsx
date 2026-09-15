'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import FoldText from '@/components/ui/FoldText'

export default function Hero() {
  const [textVisible, setTextVisible] = useState(false)

  useEffect(() => {
    const timer = setTimeout(() => setTextVisible(true), 400)
    return () => clearTimeout(timer)
  }, [])

  return (
    <section
      id="hero"
      className="relative isolate w-full h-[100svh] min-h-[100svh] flex flex-col justify-end items-start overflow-hidden pt-20 pb-8 sm:pb-12 lg:pb-16 bg-slate-950"
    >
      {/* ========================================================= */}
      {/* 01. CRISP, NATURAL HERO BACKGROUND IMAGE (ZERO SMOKE)     */}
      {/* ========================================================= */}
      <div className="absolute inset-0 w-full h-full overflow-hidden pointer-events-none z-0">
        {/* High-Resolution Cinematic Hero Image */}
        <img
          src="/images/hero.jpg"
          alt="8LIV Medical Weight Health & Vitality"
          loading="eager"
          fetchPriority="high"
          className="w-full h-full object-cover object-[65%_25%] sm:object-[70%_35%] transform scale-[1.01] brightness-[1.12] contrast-[1.02]"
          onError={(e) => {
            const target = e.currentTarget
            if (!target.src.includes('/assets/hero.jpg')) {
              target.src = '/assets/hero.jpg'
            } else if (!target.src.includes('/images/hero_indian.png')) {
              target.src = '/images/hero_indian.png'
            }
          }}
        />

        {/* Minimal localized corner shade strictly behind bottom-left copy (No full-width smoke) */}
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/50 via-transparent to-transparent sm:bg-gradient-to-tr sm:from-slate-950/60 sm:via-transparent sm:to-transparent" />
      </div>

      {/* ========================================================= */}
      {/* 02. SMOOTH ENTRANCE TRANSITION FOR BOTTOM-LEFT COPY       */}
      {/* ========================================================= */}
      <div
        className={`relative z-10 max-w-7xl mx-auto px-5 sm:px-8 lg:px-12 w-full transition-all duration-1000 ease-out ${
          textVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'
        }`}
      >
        <div className="max-w-sm sm:max-w-md text-left flex flex-col items-start">
          
          {/* 3D FoldText Headline */}
          <h1 className="font-sora text-2xl xs:text-3xl sm:text-4xl md:text-[2.2rem] lg:text-[2.5rem] font-bold text-white leading-[1.1] tracking-tight mb-2.5 drop-shadow-[0_2px_10px_rgba(0,0,0,0.9)]">
            <FoldText
              text="Weight Loss,"
              splitBy="char"
              hinge="top"
              trigger="mount"
              duration={0.65}
              stagger={0.035}
              ease="power3.out"
              perspective={700}
              creaseShading={0.4}
              fontSize="inherit"
              fontWeight={700}
              color="#FFFFFF"
              className="block font-sora"
            />
            <FoldText
              text="Redefined for Life."
              splitBy="char"
              hinge="top"
              trigger="mount"
              duration={0.7}
              stagger={0.035}
              ease="power3.out"
              perspective={700}
              creaseShading={0.4}
              fontSize="inherit"
              fontWeight={700}
              color="#FFFFFF"
              className="block font-sora text-white"
            />
          </h1>

          {/* Compact Pure Light Subtext */}
          <p className="text-[11px] sm:text-xs text-white/90 font-light leading-relaxed mb-3.5 max-w-sm drop-shadow-[0_1px_5px_rgba(0,0,0,0.85)]">
            Doctor-guided GLP-1 therapy combined with home-cooked Indian meals. Quiet constant food noise, boost daily energy, and reset your natural weight floor.
          </p>

          {/* Action Group: Compact pill button */}
          <div className="mb-3.5 sm:mb-4 w-full sm:w-auto">
            <Link
              href="/assessment"
              id="hero-clean-cta"
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 sm:px-6 sm:py-3 rounded-full bg-[#00A884] hover:bg-[#009272] text-white font-sora font-semibold text-xs shadow-md shadow-[#00A884]/30 hover:shadow-lg hover:shadow-[#00A884]/40 transition-all duration-200 active:scale-[0.98] group cursor-pointer"
            >
              <span>CHECK MY ELIGIBILITY</span>
              <ArrowRight className="w-3.5 h-3.5 transition-transform duration-200 group-hover:translate-x-1" />
            </Link>
          </div>

          {/* Left-Aligned Clinical Trust Checkmarks */}
          <div className="flex flex-wrap items-center gap-y-1.5 gap-x-4 text-[10px] sm:text-[11px] text-white/80 font-medium pt-2.5 border-t border-white/15 w-full max-w-sm drop-shadow-[0_1px_4px_rgba(0,0,0,0.85)]">
            <div className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-[#2DD4BF] shrink-0" />
              <span>100% Online Telehealth</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-[#2DD4BF] shrink-0" />
              <span>Licensed MBBS/MD Doctors</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-[#2DD4BF] shrink-0" />
              <span>Cold-Chain Delivery</span>
            </div>
          </div>

        </div>
      </div>
    </section>
  )
}


