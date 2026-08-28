'use client'

import React, { useState, useRef, useEffect } from 'react'
import { motion, useMotionValue, useSpring, PanInfo } from 'framer-motion'
import Image from 'next/image'
import { ArrowLeft, ArrowRight, Sparkles, CheckCircle2 } from 'lucide-react'

export interface CylinderItem {
  id: string | number
  step: string
  title: string
  badge: string
  description: string
  image: string
  highlights?: string[]
  cardTag?: string
}

interface CylinderCarouselProps {
  items: CylinderItem[]
  autoPlay?: boolean
  autoPlaySpeed?: number
  radius?: number
  cardWidth?: number
  cardHeight?: number
}

export default function CylinderCarousel({
  items,
  autoPlay = false,
  autoPlaySpeed = 4000,
  radius = 450,
  cardWidth = 340,
  cardHeight = 420
}: CylinderCarouselProps) {
  const [activeIndex, setActiveIndex] = useState(0)
  const isHovered = useRef(false)

  const rotationY = useMotionValue(0)
  const smoothRotation = useSpring(rotationY, { stiffness: 70, damping: 20 })

  const total = items.length
  const stepAngle = 360 / total

  // Sync rotationY with activeIndex
  useEffect(() => {
    rotationY.set(-activeIndex * stepAngle)
  }, [activeIndex, stepAngle, rotationY])

  // Auto-play interval
  useEffect(() => {
    if (!autoPlay) return
    const interval = setInterval(() => {
      if (!isHovered.current) {
        setActiveIndex((prev) => (prev + 1) % total)
      }
    }, autoPlaySpeed)
    return () => clearInterval(interval)
  }, [autoPlay, autoPlaySpeed, total])

  const handleDrag = (_: any, info: PanInfo) => {
    const delta = info.delta.x * 0.35
    rotationY.set(rotationY.get() + delta)
  }

  const handleDragEnd = () => {
    const currentRot = rotationY.get()
    const index = Math.round(-currentRot / stepAngle)
    const normalizedIndex = ((index % total) + total) % total
    setActiveIndex(normalizedIndex)
    rotationY.set(-index * stepAngle)
  }

  const handleNext = () => setActiveIndex((prev) => (prev + 1) % total)
  const handlePrev = () => setActiveIndex((prev) => (prev - 1 + total) % total)

  return (
    <div
      className="relative w-full max-w-6xl mx-auto py-6 px-2 flex flex-col items-center justify-center select-none"
      onMouseEnter={() => (isHovered.current = true)}
      onMouseLeave={() => (isHovered.current = false)}
    >
      {/* Active Stage Indicator Header */}
      <div className="mb-6 flex items-center gap-3">
        <span className="text-xs font-bold font-sora tracking-widest text-[#0D9488] uppercase bg-[#0D9488]/10 px-3.5 py-1.5 rounded-full border border-[#0D9488]/20">
          Stage {activeIndex + 1} of {total}
        </span>
        <h4 className="text-sm font-bold text-[#0F172A] font-sora">
          {items[activeIndex]?.title}
        </h4>
      </div>

      {/* 3D Perspective Carousel Stage */}
      <div
        className="relative w-full h-[480px] flex items-center justify-center cursor-grab active:cursor-grabbing overflow-hidden"
        style={{ perspective: '1400px' }}
      >
        <motion.div
          className="relative w-full h-full flex items-center justify-center"
          style={{
            transformStyle: 'preserve-3d',
            rotateY: smoothRotation,
          }}
          drag="x"
          dragConstraints={{ left: 0, right: 0 }}
          dragElastic={0.08}
          onDrag={handleDrag}
          onDragEnd={handleDragEnd}
        >
          {items.map((item, index) => {
            const angle = index * stepAngle
            const isActive = index === activeIndex

            return (
              <motion.div
                key={item.id}
                className={`absolute top-1/2 left-1/2 rounded-3xl bg-white p-6 sm:p-7 flex flex-col justify-between overflow-hidden transition-all duration-500 cursor-pointer ${
                  isActive
                    ? 'border-2 border-[#0D9488] shadow-[0_20px_50px_rgba(13,148,136,0.25)] ring-4 ring-[#0D9488]/10 z-30'
                    : 'border border-slate-200 shadow-md opacity-60 hover:opacity-90 hover:border-[#0D9488]/40 z-10'
                }`}
                style={{
                  width: `${cardWidth}px`,
                  height: `${cardHeight}px`,
                  marginTop: `-${cardHeight / 2}px`,
                  marginLeft: `-${cardWidth / 2}px`,
                  transformStyle: 'preserve-3d',
                  transform: `rotateY(${angle}deg) translateZ(${radius}px) scale(${isActive ? 1.04 : 0.88})`,
                  backfaceVisibility: 'hidden',
                }}
                onClick={() => setActiveIndex(index)}
              >
                {/* Header */}
                <div>
                  <div className="flex items-center justify-between mb-3.5">
                    <span className="text-xs font-black font-sora tracking-widest text-[#0D9488] uppercase bg-[#0D9488]/10 px-3 py-1 rounded-full border border-[#0D9488]/20">
                      Stage {item.step}
                    </span>
                    {item.cardTag && (
                      <span className="text-[11px] font-semibold text-[#0F766E] bg-[#0D9488]/10 px-2.5 py-0.5 rounded-md">
                        {item.cardTag}
                      </span>
                    )}
                  </div>

                  {/* Card Image */}
                  <div className="relative w-full h-36 rounded-2xl overflow-hidden mb-4 border border-slate-100 shadow-xs">
                    <Image
                      src={item.image}
                      alt={item.title}
                      fill
                      className="object-cover"
                    />
                  </div>

                  <h3 className="font-sora text-lg font-bold text-[#0F172A] leading-snug mb-2">
                    {item.title}
                  </h3>
                  <p className="text-xs text-[#475569] font-light leading-relaxed">
                    {item.description}
                  </p>
                </div>

                {/* Highlights List */}
                {item.highlights && item.highlights.length > 0 && (
                  <div className="pt-3 border-t border-slate-100 space-y-1.5">
                    {item.highlights.slice(0, 2).map((h, hIdx) => (
                      <div key={hIdx} className="flex items-center gap-2 text-[11px] text-[#0F172A] font-medium font-sora">
                        <CheckCircle2 className="w-3.5 h-3.5 text-[#0D9488] shrink-0" />
                        <span className="truncate">{h}</span>
                      </div>
                    ))}
                  </div>
                )}
              </motion.div>
            )
          })}
        </motion.div>
      </div>

      {/* Control Bar */}
      <div className="mt-6 flex items-center justify-center gap-6 z-20">
        <button
          onClick={handlePrev}
          className="w-11 h-11 rounded-full bg-white border border-[#0D9488]/30 shadow-md text-[#0F172A] hover:bg-[#0D9488] hover:text-white transition-all flex items-center justify-center cursor-pointer active:scale-95"
          aria-label="Previous Stage"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>

        {/* Step Pills */}
        <div className="flex items-center gap-2">
          {items.map((item, idx) => (
            <button
              key={idx}
              onClick={() => setActiveIndex(idx)}
              className={`h-2.5 rounded-full transition-all duration-300 cursor-pointer ${
                idx === activeIndex
                  ? 'w-8 bg-[#0D9488]'
                  : 'w-2.5 bg-slate-300 hover:bg-slate-400'
              }`}
              aria-label={`Go to stage ${idx + 1}`}
            />
          ))}
        </div>

        <button
          onClick={handleNext}
          className="w-11 h-11 rounded-full bg-white border border-[#0D9488]/30 shadow-md text-[#0F172A] hover:bg-[#0D9488] hover:text-white transition-all flex items-center justify-center cursor-pointer active:scale-95"
          aria-label="Next Stage"
        >
          <ArrowRight className="w-5 h-5" />
        </button>
      </div>
    </div>
  )
}
