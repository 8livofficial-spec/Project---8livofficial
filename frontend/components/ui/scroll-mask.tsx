'use client'

import React, { useRef } from 'react'
import { motion, useScroll, useTransform, useSpring, MotionValue } from 'framer-motion'
import { cn } from '@/lib/utils'

export type MaskShape = 'circle' | 'rect' | 'diamond' | 'aperture' | 'horizontal' | 'vertical'

export interface ScrollMaskProps {
  image: string
  title?: string
  subtitle?: string
  badge?: string
  maskShape?: MaskShape
  minScale?: number
  maxScale?: number
  className?: string
  overlayOpacity?: number
}

export function ScrollMask({
  image,
  title = 'Clinical Science Revealed',
  subtitle = 'Continuous physician governance, biomarker tracking, and GLP-1 therapy tailored to your biology.',
  badge = '8LIV METABOLIC INTELLIGENCE',
  maskShape = 'aperture',
  minScale = 20,
  maxScale = 100,
  className = '',
  overlayOpacity = 0.4
}: ScrollMaskProps) {
  const containerRef = useRef<HTMLDivElement>(null)

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ['start end', 'end start']
  })

  const smoothProgress = useSpring(scrollYProgress, {
    mass: 0.1,
    stiffness: 120,
    damping: 18
  })

  // 6 Mask Shape Clip-Path Calculations
  const maskScale = useTransform(smoothProgress, [0.15, 0.65], [minScale, maxScale])
  const imageScale = useTransform(smoothProgress, [0.15, 0.65], [1.2, 1.0])
  const textOpacity = useTransform(smoothProgress, [0.35, 0.65], [0, 1])
  const textY = useTransform(smoothProgress, [0.35, 0.65], [30, 0])

  return (
    <div
      ref={containerRef}
      className={cn('relative w-full min-h-[80vh] sm:min-h-[90vh] flex items-center justify-center overflow-hidden py-16 sm:py-24', className)}
    >
      {/* Outer Container with Mask Overlay */}
      <div className="relative w-full max-w-6xl mx-auto px-4 sm:px-6">
        {/* Animated Mask Wrapper */}
        <motion.div
          className="relative w-full aspect-[16/10] sm:aspect-[16/9] md:aspect-[21/9] rounded-[2.5rem] overflow-hidden border border-[#0D9488]/30 shadow-2xl bg-[#0F172A]"
          style={{
            clipPath: useTransform(maskScale, (val) => getMaskClipPath(maskShape, val))
          }}
        >
          {/* Revealed Background Image */}
          <motion.img
            src={image}
            alt="Scroll Mask Reveal"
            className="w-full h-full object-cover"
            style={{ scale: imageScale }}
          />

          {/* Dark Glass Overlay */}
          <div
            className="absolute inset-0 bg-gradient-to-t from-[#0F172A] via-[#0F172A]/50 to-transparent"
            style={{ opacity: overlayOpacity }}
          />

          {/* Content Overlay */}
          <div className="absolute inset-0 flex flex-col justify-end p-6 sm:p-12 md:p-16 z-10">
            <motion.div style={{ opacity: textOpacity, y: textY }} className="max-w-2xl text-left space-y-3 sm:space-y-4">
              {badge && (
                <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-white/90 backdrop-blur-md text-[#0F766E] text-[10px] sm:text-xs font-bold font-sora shadow-md">
                  <span className="w-2 h-2 rounded-full bg-[#0D9488] animate-pulse" />
                  <span>{badge}</span>
                </div>
              )}
              {title && (
                <h3 className="text-2xl sm:text-4xl md:text-5xl font-bold text-white font-sora leading-tight tracking-tight">
                  {title}
                </h3>
              )}
              {subtitle && (
                <p className="text-xs sm:text-base text-[#E2E8F0] font-light font-sora leading-relaxed max-w-xl">
                  {subtitle}
                </p>
              )}
            </motion.div>
          </div>
        </motion.div>
      </div>
    </div>
  )
}

function getMaskClipPath(shape: MaskShape, percent: number): string {
  const p = Math.min(Math.max(percent, 0), 100)

  switch (shape) {
    case 'circle':
      return `circle(${p}% at 50% 50%)`
    case 'rect':
      const inset = (100 - p) / 2
      return `inset(${inset}% ${inset}% ${inset}% ${inset}% round 2rem)`
    case 'diamond':
      const d = p / 2
      return `polygon(50% ${50 - d}%, ${50 + d}% 50%, 50% ${50 + d}%, ${50 - d}% 50%)`
    case 'horizontal':
      const h = (100 - p) / 2
      return `inset(${h}% 0% ${h}% 0%)`
    case 'vertical':
      const v = (100 - p) / 2
      return `inset(0% ${v}% 0% ${v}%)`
    case 'aperture':
    default:
      // Smooth 8-point aperture polygon expansion
      const r = p * 0.7
      return `polygon(
        ${50 - r * 0.5}% ${50 - r}%, 
        ${50 + r * 0.5}% ${50 - r}%, 
        ${50 + r}% ${50 - r * 0.5}%, 
        ${50 + r}% ${50 + r * 0.5}%, 
        ${50 + r * 0.5}% ${50 + r}%, 
        ${50 - r * 0.5}% ${50 + r}%, 
        ${50 - r}% ${50 + r * 0.5}%, 
        ${50 - r}% ${50 - r * 0.5}%
      )`
  }
}

export default ScrollMask
