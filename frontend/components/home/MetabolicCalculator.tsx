'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { ArrowDown, ArrowRight, Sparkles } from 'lucide-react'

export default function MetabolicCalculator() {
  const [startingWeight, setStartingWeight] = useState(88) // kg

  // Projections
  const dietLossPercentage = 0.05 // 5% typical diet loss
  const glp1LossPercentage = 0.22 // 22% 8Liv medical weight loss
  const projectedWeight = Math.round(startingWeight * (1 - glp1LossPercentage) * 10) / 10
  const totalLoss = Math.round((startingWeight - projectedWeight) * 10) / 10
  const dietWeight = Math.round(startingWeight * (1 - dietLossPercentage) * 10) / 10

  return (
    <section
      id="metabolic-calculator"
      aria-label="Interactive Weight Health Projection"
      className="py-20 sm:py-24 lg:py-28 bg-white border-b border-slate-200/80"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Deep Mineral Slate-Teal Luxury Card */}
        <div className="rounded-[2.5rem] bg-gradient-to-br from-[#2D4552] via-[#243B47] to-[#1A2D36] p-8 sm:p-12 lg:p-16 text-white shadow-2xl relative overflow-hidden">
          
          {/* Subtle Ambient Glow */}
          <div className="absolute top-0 right-0 w-96 h-96 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14 items-center relative z-10">
            
            {/* Left Column: Big Stat Callout */}
            <div className="lg:col-span-5 flex flex-col items-start text-left">
              <span className="text-xs sm:text-sm font-sans font-semibold tracking-wider uppercase text-teal-300 mb-3">
                Clinical Evidence Projection
              </span>

              <h2 className="font-editorial text-3xl sm:text-4xl lg:text-5xl font-normal leading-tight mb-6">
                Discover How Much Healthier You Can Be
              </h2>

              {/* Big 25% Callout */}
              <div className="flex items-baseline gap-3 mb-2">
                <span className="font-editorial text-6xl sm:text-7xl lg:text-8xl font-normal tracking-tight text-white">
                  22%
                </span>
                <div className="w-8 h-8 rounded-full bg-teal-400 text-slate-950 flex items-center justify-center shrink-0">
                  <ArrowDown className="w-5 h-5 stroke-[2.5]" />
                </div>
              </div>

              <p className="font-editorial text-xl sm:text-2xl text-teal-200/90 italic mb-6">
                Average body weight reduction
              </p>

              <p className="font-sans text-xs sm:text-sm text-slate-300/90 leading-relaxed max-w-md">
                Supported by peer-reviewed metabolic trials and board-certified physician supervision. Lose sustainable weight without starvation or post-diet rebound.
              </p>
            </div>

            {/* Right Column: Interactive Sliders & Projection */}
            <div className="lg:col-span-7 bg-white/10 backdrop-blur-xl rounded-3xl p-6 sm:p-8 border border-white/15 shadow-inner">
              
              {/* Weight Slider Control */}
              <div className="mb-8">
                <div className="flex justify-between items-center mb-3">
                  <label htmlFor="weight-slider" className="text-xs sm:text-sm font-sans font-medium text-slate-200">
                    Select Your Starting Weight:
                  </label>
                  <span className="text-lg sm:text-xl font-sans font-bold text-teal-300 bg-white/10 px-3 py-1 rounded-xl border border-white/20">
                    {startingWeight} kg
                  </span>
                </div>
                <input
                  id="weight-slider"
                  type="range"
                  min="60"
                  max="140"
                  value={startingWeight}
                  onChange={(e) => setStartingWeight(Number(e.target.value))}
                  className="w-full h-2.5 bg-slate-950/40 rounded-lg appearance-none cursor-pointer accent-teal-400"
                />
                <div className="flex justify-between text-[11px] text-slate-400 mt-2 font-mono">
                  <span>60 kg</span>
                  <span>100 kg</span>
                  <span>140 kg</span>
                </div>
              </div>

              {/* Comparison Bars */}
              <div className="space-y-5 mb-8">
                
                {/* Traditional Diet Alone */}
                <div>
                  <div className="flex justify-between text-xs font-sans text-slate-300 mb-1.5">
                    <span>Traditional Calorie Restriction Alone</span>
                    <span className="font-mono text-slate-400">-5% (~{dietWeight} kg)</span>
                  </div>
                  <div className="w-full h-3.5 bg-slate-950/40 rounded-full overflow-hidden p-0.5">
                    <div className="h-full bg-slate-400/50 rounded-full w-[20%]" />
                  </div>
                </div>

                {/* 8Liv Medical Weight Care */}
                <div>
                  <div className="flex justify-between text-xs font-sans font-semibold text-teal-200 mb-1.5">
                    <span className="flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-teal-400" />
                      <span>8Liv Physician-Led Protocol</span>
                    </span>
                    <span className="font-mono text-teal-300 font-bold">-22% ({projectedWeight} kg)</span>
                  </div>
                  <div className="w-full h-4 bg-slate-950/50 rounded-full overflow-hidden p-0.5 border border-teal-400/30">
                    <div className="h-full bg-gradient-to-r from-teal-400 to-emerald-300 rounded-full w-[88%] shadow-[0_0_12px_rgba(45,212,191,0.5)] transition-all duration-300" />
                  </div>
                </div>

              </div>

              {/* Summary Stats Row */}
              <div className="grid grid-cols-2 gap-4 pt-6 border-t border-white/10 mb-6 text-center">
                <div className="bg-white/5 rounded-2xl p-4 border border-white/10">
                  <span className="text-[11px] font-sans text-slate-300 block mb-1">Projected Weight Floor</span>
                  <span className="font-editorial text-2xl sm:text-3xl font-normal text-white">{projectedWeight} kg</span>
                </div>
                <div className="bg-white/5 rounded-2xl p-4 border border-white/10">
                  <span className="text-[11px] font-sans text-slate-300 block mb-1">Target Reduction</span>
                  <span className="font-editorial text-2xl sm:text-3xl font-normal text-teal-300">-{totalLoss} kg</span>
                </div>
              </div>

              {/* Action Button */}
              <Link
                href="/assessment"
                className="w-full py-4 rounded-full bg-teal-400 hover:bg-teal-300 text-slate-950 font-sans font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg shadow-teal-500/20 transition-all cursor-pointer"
              >
                <span>Get Your Personalized Treatment Plan</span>
                <ArrowRight className="w-4 h-4" />
              </Link>

            </div>

          </div>

        </div>

      </div>
    </section>
  )
}
