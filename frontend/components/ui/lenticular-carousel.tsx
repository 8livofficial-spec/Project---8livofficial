'use client'

import React, { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence, useMotionValue, useSpring, useTransform } from 'framer-motion'
import { ChevronLeft, ChevronRight, CheckCircle2, Sparkles, ArrowRight } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface LenticularItem {
  id: string | number
  stage: string
  title: string
  subtitle: string
  description: string
  image: string
  tag: string
  badge: string
  badgeColor?: string
  feature: string
}

export interface LenticularCarouselProps {
  items: LenticularItem[]
  className?: string
  autoPlay?: boolean
  interval?: number
}

export function LenticularCarousel({
  items,
  className = '',
  autoPlay = false,
  interval = 5000
}: LenticularCarouselProps) {
  const [activeIndex, setActiveIndex] = useState(0)
  const [isHovered, setIsHovered] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  // Mouse tilt motion values for 3D lenticular effect
  const mouseX = useMotionValue(0.5)
  const mouseY = useMotionValue(0.5)

  // Spring physics for buttery smooth tilt
  const springConfig = { mass: 0.15, stiffness: 140, damping: 15 }
  const rotateX = useSpring(useTransform(mouseY, [0, 1], [14, -14]), springConfig)
  const rotateY = useSpring(useTransform(mouseX, [0, 1], [-18, 18]), springConfig)
  
  // Lenticular sheen position
  const sheenX = useSpring(useTransform(mouseX, [0, 1], [-120, 120]), springConfig)
  const lensOpacity = useSpring(useTransform(mouseX, [0, 0.5, 1], [0.35, 0.75, 0.35]), springConfig)

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current) return
    const rect = containerRef.current.getBoundingClientRect()
    const x = (e.clientX - rect.left) / rect.width
    const y = (e.clientY - rect.top) / rect.height
    mouseX.set(x)
    mouseY.set(y)
  }

  const handleMouseLeave = () => {
    setIsHovered(false)
    mouseX.set(0.5)
    mouseY.set(0.5)
  }

  const handleNext = () => {
    setActiveIndex(prev => (prev + 1) % items.length)
  }

  const handlePrev = () => {
    setActiveIndex(prev => (prev - 1 + items.length) % items.length)
  }

  useEffect(() => {
    if (!autoPlay || isHovered) return
    const timer = setInterval(() => {
      handleNext()
    }, interval)
    return () => clearInterval(timer)
  }, [autoPlay, isHovered, interval, items.length])

  const currentItem = items[activeIndex]

  return (
    <div className={cn('relative w-full max-w-5xl mx-auto py-4 px-2 sm:px-4 select-none', className)}>
      {/* 3D Lenticular Card Container */}
      <div
        ref={containerRef}
        onMouseMove={handleMouseMove}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={handleMouseLeave}
        className="relative w-full min-h-[460px] sm:min-h-[500px] flex flex-col md:flex-row items-center justify-between gap-6 lg:gap-10 rounded-[2.5rem] bg-[#0F172A] p-6 sm:p-10 lg:p-12 border border-[#D46E53]/25 shadow-2xl overflow-hidden"
        style={{ perspective: 1200 }}
      >
        {/* Background Ambient Glow */}
        <div className="pointer-events-none absolute -top-24 -left-24 w-96 h-96 bg-[#0052FF]/20 rounded-full blur-[120px]" />
        <div className="pointer-events-none absolute -bottom-24 -right-24 w-96 h-96 bg-[#D46E53]/20 rounded-full blur-[120px]" />

        {/* Dynamic Lenticular Card Visual (Left / Top) */}
        <div className="w-full md:w-1/2 flex items-center justify-center relative">
          <motion.div
            style={{
              rotateX,
              rotateY,
              transformStyle: 'preserve-3d'
            }}
            className="relative w-full max-w-[340px] sm:max-w-[380px] aspect-[4/5] rounded-[2rem] overflow-hidden shadow-2xl border border-white/20 bg-[#1E293B] cursor-grab active:cursor-grabbing"
          >
            <AnimatePresence mode="wait">
              <motion.div
                key={currentItem.id}
                initial={{ opacity: 0, scale: 0.94, rotateY: -20 }}
                animate={{ opacity: 1, scale: 1, rotateY: 0 }}
                exit={{ opacity: 0, scale: 0.94, rotateY: 20 }}
                transition={{ duration: 0.45, ease: 'easeOut' }}
                className="absolute inset-0 w-full h-full"
              >
                {/* Stage Image */}
                <img
                  src={currentItem.image}
                  alt={currentItem.title}
                  className="w-full h-full object-cover"
                />

                {/* Lenticular Interlaced Line Overlay */}
                <motion.div
                  style={{ opacity: lensOpacity }}
                  className="pointer-events-none absolute inset-0 bg-[repeating-linear-gradient(90deg,transparent_0px,transparent_3px,rgba(255,255,255,0.08)_4px,transparent_5px)] mix-blend-overlay"
                />

                {/* 3D Specular Lens Reflection Sheen */}
                <motion.div
                  style={{ x: sheenX }}
                  className="pointer-events-none absolute -inset-y-20 w-32 bg-gradient-to-r from-transparent via-white/35 to-transparent transform -skew-x-12 mix-blend-soft-light blur-sm"
                />

                {/* Gradient Shading Overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-[#0F172A] via-[#0F172A]/30 to-transparent" />

                {/* Top Badges */}
                <div className="absolute top-4 left-4 right-4 flex items-center justify-between z-10">
                  <span className="px-3 py-1 rounded-full bg-white/90 backdrop-blur-md text-[#0F172A] text-[10px] font-bold tracking-wider font-sora shadow-md">
                    {currentItem.stage}
                  </span>
                  <span className="px-3 py-1 rounded-full bg-[#0052FF]/90 backdrop-blur-md text-white text-[10px] font-bold font-sora shadow-md">
                    {currentItem.badge}
                  </span>
                </div>

                {/* Bottom Card Label */}
                <div className="absolute bottom-5 left-5 right-5 z-10">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-[#D46E53] font-sora mb-1">
                    {currentItem.tag}
                  </p>
                  <h4 className="text-xl sm:text-2xl font-bold text-white font-sora leading-snug">
                    {currentItem.title}
                  </h4>
                </div>
              </motion.div>
            </AnimatePresence>
          </motion.div>
        </div>

        {/* Card Content & Interactive Controls (Right / Bottom) */}
        <div className="w-full md:w-1/2 flex flex-col justify-between text-left space-y-6 z-10">
          <div>
            {/* Step Counter */}
            <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-white/10 border border-white/15 text-[#E2E8F0] text-xs font-semibold font-sora mb-4">
              <Sparkles className="w-3.5 h-3.5 text-[#D46E53]" />
              <span>Step {activeIndex + 1} of {items.length}</span>
            </div>

            {/* Stage Title & Subtitle */}
            <h3 className="text-2xl sm:text-3xl font-bold text-white font-sora leading-tight">
              {currentItem.title}
            </h3>
            <p className="text-sm font-semibold text-[#D46E53] font-sora mt-1">
              {currentItem.subtitle}
            </p>

            {/* Detailed Description */}
            <p className="text-sm sm:text-base text-[#94A3B8] font-light leading-relaxed mt-4 font-sora">
              {currentItem.description}
            </p>

            {/* Key Feature Highlight */}
            <div className="mt-6 flex items-center gap-2.5 text-xs sm:text-sm font-semibold text-white font-sora bg-white/5 p-3 sm:p-4 rounded-2xl border border-white/10">
              <CheckCircle2 className="w-4 h-4 text-[#0052FF] shrink-0" />
              <span>{currentItem.feature}</span>
            </div>
          </div>

          {/* Navigation Controls & Indicators */}
          <div className="flex items-center justify-between pt-4 border-t border-white/10">
            {/* Dots Indicator */}
            <div className="flex items-center gap-2">
              {items.map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => setActiveIndex(idx)}
                  className={cn(
                    'h-2.5 rounded-full transition-all duration-300 cursor-pointer',
                    idx === activeIndex
                      ? 'w-8 bg-[#0052FF]'
                      : 'w-2.5 bg-white/20 hover:bg-white/40'
                  )}
                  aria-label={`Go to slide ${idx + 1}`}
                />
              ))}
            </div>

            {/* Next / Prev Buttons */}
            <div className="flex items-center gap-3">
              <button
                onClick={handlePrev}
                className="w-10 h-10 rounded-full bg-white/10 border border-white/15 text-white flex items-center justify-center hover:bg-white/20 transition-all cursor-pointer shadow-md"
                aria-label="Previous step"
              >
                <ChevronLeft size={18} />
              </button>
              <button
                onClick={handleNext}
                className="w-10 h-10 rounded-full bg-[#0052FF] text-white flex items-center justify-center hover:bg-[#0042D0] transition-all cursor-pointer shadow-md shadow-[#0052FF]/30"
                aria-label="Next step"
              >
                <ChevronRight size={18} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default LenticularCarousel
