'use client'

import React, { useState, useEffect } from 'react'

interface ProgressRingProps {
  progressPercent: number // e.g. 66
  startWeight: number
  currentWeight: number
  goalWeight: number
}

export default function ProgressRing({
  progressPercent,
  startWeight,
  currentWeight,
  goalWeight
}: ProgressRingProps) {
  const [animatedPercent, setAnimatedPercent] = useState(0)

  useEffect(() => {
    let animationId: number
    const duration = 1200 // 1.2s animation
    const startTime = performance.now()

    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime
      const progress = Math.min(1, elapsed / duration)
      // Ease out cubic
      const ease = 1 - Math.pow(1 - progress, 3)
      setAnimatedPercent(Math.round(ease * progressPercent))

      if (progress < 1) {
        animationId = requestAnimationFrame(animate)
      }
    }

    animationId = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(animationId)
  }, [progressPercent])

  const circumference = 2 * Math.PI * 40 // ~251.2
  const strokeDashoffset = circumference - (animatedPercent / 100) * circumference

  return (
    <div className="dash-card p-5 text-center flex flex-col justify-between h-full">
      <div className="space-y-4 flex flex-col items-center">
        {/* Ring */}
        <div className="relative w-32 h-32 flex items-center justify-center">
          <svg viewBox="0 0 120 120" className="w-full h-full transform -rotate-90">
            {/* Background Track */}
            <circle
              cx="60"
              cy="60"
              r="40"
              stroke="#F5F0EB"
              strokeWidth="8"
              fill="none"
            />
            {/* Animated Progress Indicator */}
            <circle
              cx="60"
              cy="60"
              r="40"
              stroke="#C4622D"
              strokeWidth="8"
              fill="none"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
              className="transition-all duration-75"
            />
          </svg>
          {/* Inner Text overlay */}
          <div className="absolute inset-0 flex flex-col items-center justify-center select-none mt-1">
            <span className="text-xl font-bold font-sora text-[#1A1F36]">{animatedPercent}%</span>
            <span className="text-[10px] text-[#8896A4] font-bold uppercase tracking-wider">Goal</span>
          </div>
        </div>

        <h3 className="font-bold text-[#1A1F36] text-sm font-sora">Weight Loss Goal</h3>
      </div>

      {/* Mini Stats row */}
      <div className="grid grid-cols-3 mt-4 pt-4 border-t border-[#1A1F36]/6">
        <div className="text-center">
          <p className="text-xs font-bold text-[#1D2939]">{startWeight} kg</p>
          <span className="text-[9px] text-[#8896A4] font-bold uppercase tracking-wider">Start</span>
        </div>
        <div className="text-center border-x border-[#1A1F36]/6">
          <p className="text-xs font-bold text-[#C4622D]">{currentWeight} kg</p>
          <span className="text-[9px] text-[#8896A4] font-bold uppercase tracking-wider">Now</span>
        </div>
        <div className="text-center">
          <p className="text-xs font-bold text-[#5C7A6B]">{goalWeight} kg</p>
          <span className="text-[9px] text-[#8896A4] font-bold uppercase tracking-wider">Goal</span>
        </div>
      </div>
    </div>
  )
}
