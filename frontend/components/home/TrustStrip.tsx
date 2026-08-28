'use client'

import React, { useRef, useEffect } from 'react'
import { Stethoscope, Utensils, Dumbbell, ShieldCheck } from 'lucide-react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { prefersReducedMotion } from '@/lib/scrollMotion'

gsap.registerPlugin(ScrollTrigger)

const trustPillars = [
  {
    icon: <Stethoscope className="w-4 h-4 text-[#0D9488]" />,
    label: 'Doctor-Led Care',
    detail: 'Board-Certified Physicians',
  },
  {
    icon: <Utensils className="w-4 h-4 text-[#0D9488]" />,
    label: 'Clinical Nutrition',
    detail: 'Registered Dietitians',
  },
  {
    icon: <Dumbbell className="w-4 h-4 text-[#0D9488]" />,
    label: 'Fitness Coaching',
    detail: '1-on-1 Certified Trainers',
  },
  {
    icon: <ShieldCheck className="w-4 h-4 text-[#0D9488]" />,
    label: 'Clinical Security',
    detail: 'Protected Health Records',
  },
]

export default function TrustStrip() {
  const containerRef = useRef<HTMLDivElement>(null)
  const ctx = useRef<gsap.Context | null>(null)

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    ctx.current = gsap.context(() => {
      if (prefersReducedMotion()) return

      gsap.fromTo(
        container.children,
        { opacity: 0, y: 15 },
        {
          opacity: 1,
          y: 0,
          stagger: 0.1,
          duration: 0.7,
          ease: 'power3.out',
          scrollTrigger: {
            trigger: container,
            start: 'top 92%',
            once: true,
          },
        }
      )
    })

    return () => ctx.current?.revert()
  }, [])

  return (
    <div className="w-full bg-[#EDF4F2]/50 border-y border-[#D46E53]/10 py-6 sm:py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div
          ref={containerRef}
          className="grid grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-8 items-center justify-items-center"
        >
          {trustPillars.map((item, idx) => (
            <div
              key={idx}
              className="flex items-center gap-3 w-full max-w-[240px] px-2"
            >
              <div className="w-8 h-8 rounded-lg bg-[#5D7068]/8 border border-[#5D7068]/15 flex items-center justify-center shrink-0">
                {item.icon}
              </div>
              <div className="flex flex-col">
                <span className="text-xs font-bold font-sora text-[#0F172A] leading-tight">
                  {item.label}
                </span>
                <span className="text-[10px] text-[#5D7068] font-medium mt-0.5 uppercase tracking-wider">
                  {item.detail}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
