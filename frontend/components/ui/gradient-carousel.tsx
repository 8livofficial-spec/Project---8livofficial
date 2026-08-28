'use client'

import React, { useState, useEffect, useRef, useCallback } from 'react'
import { motion } from 'framer-motion'
import { ChevronLeft, ChevronRight, Sparkles } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface CarouselItem {
  id: string | number
  title: string
  subtitle?: string
  description?: string
  tag?: string
  image: string
  badge?: string
  accentColor?: string
}

export interface GradientCarouselProps {
  items: CarouselItem[]
  autoPlay?: boolean
  autoPlayInterval?: number
  className?: string
  cardWidth?: number
  cardHeight?: number
  rotateAngle?: number
  depth?: number
  gap?: number
  onCardChange?: (index: number, item: CarouselItem) => void
}

/**
 * Extracts dominant RGB color from an HTMLImageElement using offscreen Canvas API
 */
function extractDominantColor(img: HTMLImageElement): { r: number; g: number; b: number } {
  try {
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    if (!ctx) return { r: 0, g: 82, b: 255 }

    canvas.width = 40
    canvas.height = 40
    ctx.drawImage(img, 0, 0, 40, 40)

    const imageData = ctx.getImageData(0, 0, 40, 40)
    const data = imageData.data
    let r = 0, g = 0, b = 0, count = 0

    for (let i = 0; i < data.length; i += 16) {
      const pr = data[i]
      const pg = data[i + 1]
      const pb = data[i + 2]
      const brightness = (pr + pg + pb) / 3
      if (brightness > 20 && brightness < 240) {
        r += pr
        g += pg
        b += pb
        count++
      }
    }

    if (count === 0) return { r: 0, g: 82, b: 255 }
    return {
      r: Math.round(r / count),
      g: Math.round(g / count),
      b: Math.round(b / count)
    }
  } catch (e) {
    return { r: 0, g: 82, b: 255 }
  }
}

export function GradientCarousel({
  items,
  autoPlay = true,
  autoPlayInterval = 5000,
  className,
  cardWidth = 320,
  cardHeight = 440,
  rotateAngle = 0,
  depth = 0,
  gap = 320,
  onCardChange
}: GradientCarouselProps) {

  const [activeIndex, setActiveIndex] = useState(0)
  const [isPaused, setIsPaused] = useState(false)
  const [extractedColors, setExtractedColors] = useState<{ [key: string]: { r: number; g: number; b: number } }>({})
  const [touchStartX, setTouchStartX] = useState<number | null>(null)
  const [viewportWidth, setViewportWidth] = useState(1200)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleResize = () => setViewportWidth(window.innerWidth)
    handleResize()
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  const currentItem = items[activeIndex] || items[0]

  // Responsive dimensions
  const isMobile = viewportWidth < 640
  const effectiveCardWidth = isMobile ? Math.min(270, viewportWidth - 64) : cardWidth
  const effectiveCardHeight = isMobile ? 380 : cardHeight
  const effectiveGap = isMobile ? 150 : gap
  const effectiveRotate = isMobile ? 14 : rotateAngle

  // Extract color for current image
  useEffect(() => {
    if (!currentItem?.image) return

    const img = new Image()
    img.crossOrigin = 'Anonymous'
    img.src = currentItem.image

    img.onload = () => {
      const rgb = extractDominantColor(img)
      setExtractedColors(prev => ({
        ...prev,
        [currentItem.id]: rgb
      }))
    }
  }, [activeIndex, currentItem])

  const handleNext = useCallback(() => {
    setActiveIndex(prev => (prev + 1) % items.length)
  }, [items.length])

  const handlePrev = useCallback(() => {
    setActiveIndex(prev => (prev - 1 + items.length) % items.length)
  }, [items.length])

  // Touch Swipe handlers
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches[0]) setTouchStartX(e.touches[0].clientX)
  }

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX === null || !e.changedTouches[0]) return
    const diff = touchStartX - e.changedTouches[0].clientX
    if (Math.abs(diff) > 40) {
      if (diff > 0) handleNext()
      else handlePrev()
    }
    setTouchStartX(null)
  }

  useEffect(() => {
    if (onCardChange && items[activeIndex]) {
      onCardChange(activeIndex, items[activeIndex])
    }
  }, [activeIndex, items, onCardChange])

  // Continuous Autoplay handler
  useEffect(() => {
    if (!autoPlay || items.length <= 1) return
    const timer = setInterval(handleNext, autoPlayInterval)
    return () => clearInterval(timer)
  }, [autoPlay, autoPlayInterval, handleNext, items.length])


  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') handlePrev()
      if (e.key === 'ArrowRight') handleNext()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleNext, handlePrev])

  // Dynamic extracted background colors
  const activeColor = extractedColors[currentItem?.id] || { r: 0, g: 82, b: 255 }
  const primaryBg = `rgba(${activeColor.r}, ${activeColor.g}, ${activeColor.b}, 0.28)`
  const secondaryBg = `rgba(${Math.max(0, activeColor.r - 40)}, ${Math.max(0, activeColor.g - 40)}, ${Math.min(255, activeColor.b + 60)}, 0.18)`
  const glowBg = `rgba(${activeColor.r}, ${activeColor.g}, ${activeColor.b}, 0.45)`

  return (
    <div
      ref={containerRef}
      className={cn(
        'relative w-full overflow-hidden rounded-2xl sm:rounded-3xl p-4 sm:p-8 md:p-12 transition-colors duration-1000 touch-pan-y',
        className
      )}
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* Dynamic Animated Gradient Background */}
      <motion.div
        className="absolute inset-0 pointer-events-none -z-10 transition-all duration-1000 ease-out"
        animate={{
          background: `radial-gradient(circle at 50% 40%, ${primaryBg} 0%, ${secondaryBg} 60%, rgba(15, 23, 42, 0.95) 100%)`
        }}
        transition={{ duration: 0.8 }}
      />

      {/* Decorative Glow Orbs */}
      <motion.div
        className="absolute top-1/4 left-1/2 -translate-x-1/2 w-72 sm:w-96 h-72 sm:h-96 rounded-full blur-[80px] sm:blur-[100px] pointer-events-none -z-10 opacity-70"
        animate={{
          backgroundColor: glowBg,
          scale: [0.9, 1.1, 0.9]
        }}
        transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
      />

      {/* 2D Flat Scroll Rail Stage */}
      <div className="relative w-full flex items-center justify-center py-2 sm:py-4">
        <div
          className="relative flex items-center justify-center"
          style={{ width: `${effectiveCardWidth}px`, height: `${effectiveCardHeight}px` }}
        >

          {items.map((item, index) => {
            let offset = index - activeIndex
            const count = items.length

            if (offset > count / 2) offset -= count
            if (offset < -count / 2) offset += count

            const isActive = offset === 0
            const absOffset = Math.abs(offset)

            if (absOffset > 2) return null

            const rotateY = offset * -effectiveRotate
            const translateX = offset * effectiveGap
            const translateZ = -absOffset * depth
            const scale = 1 - absOffset * 0.14
            const opacity = 1 - absOffset * 0.4
            const zIndex = 30 - absOffset * 10

            return (
              <motion.div
                key={item.id}
                onClick={() => setActiveIndex(index)}
                className="absolute inset-0 cursor-pointer rounded-2xl overflow-hidden shadow-xl transition-all border border-slate-200 bg-white"
                style={{
                  width: `${effectiveCardWidth}px`,
                  height: `${effectiveCardHeight}px`,
                  zIndex
                }}
                animate={{
                  transform: `translateX(${translateX}px) translateZ(${translateZ}px) rotateY(${rotateY}deg) scale(${scale})`,
                  opacity
                }}
                transition={{
                  type: 'spring',
                  stiffness: 260,
                  damping: 26
                }}
              >
                {/* Card Background Image */}
                <div className="relative w-full h-full bg-white overflow-hidden group">
                  <img
                    src={item.image}
                    alt={item.title}
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                  />

                  {/* Glassmorphic Overlay Gradient */}
                  <div className="absolute inset-0 bg-gradient-to-t from-[#0F172A]/90 via-[#0F172A]/40 to-transparent" />

                  {/* Card Content */}
                  <div className="absolute inset-x-0 bottom-0 p-4 sm:p-6 flex flex-col justify-end text-white">
                    {item.tag && (
                      <span className="self-start text-[9px] sm:text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-md bg-[#0D9488] backdrop-blur-sm mb-1.5 text-white">
                        {item.tag}
                      </span>
                    )}
                    <h3 className="text-base sm:text-xl font-bold leading-snug drop-shadow-sm text-white">
                      {item.title}
                    </h3>
                    {item.description && (
                      <p className="text-[11px] sm:text-xs text-slate-200 mt-1 line-clamp-2 font-light leading-relaxed">
                        {item.description}
                      </p>
                    )}
                  </div>

                  {/* Active Indicator Ring */}
                  {isActive && (
                    <div className="absolute inset-0 border-2 border-[#0D9488] rounded-2xl pointer-events-none" />
                  )}
                </div>
              </motion.div>
            )
          })}
        </div>
      </div>

      {/* Navigation Controls & Pagination */}
      <div className="relative z-10 flex items-center justify-between max-w-xs sm:max-w-md mx-auto mt-4 sm:mt-6">
        <button
          onClick={handlePrev}
          aria-label="Previous Slide"
          className="p-2.5 sm:p-3 rounded-full bg-white hover:bg-slate-100 border border-slate-200 text-[#0F172A] shadow-md transition-all active:scale-95 cursor-pointer"
        >
          <ChevronLeft className="w-4 h-4 sm:w-5 sm:h-5" />
        </button>

        {/* Pagination Dots */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {items.map((_, index) => (
            <button
              key={index}
              onClick={() => setActiveIndex(index)}
              aria-label={`Go to slide ${index + 1}`}
              className={cn(
                'h-2 sm:h-2.5 rounded-full transition-all duration-300 cursor-pointer',
                index === activeIndex
                  ? 'w-6 sm:w-8 bg-[#0D9488]'
                  : 'w-2 sm:w-2.5 bg-slate-300 hover:bg-slate-400'
              )}
            />
          ))}
        </div>

        <button
          onClick={handleNext}
          aria-label="Next Slide"
          className="p-2.5 sm:p-3 rounded-full bg-white hover:bg-slate-100 border border-slate-200 text-[#0F172A] shadow-md transition-all active:scale-95 cursor-pointer"
        >
          <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5" />
        </button>
      </div>
    </div>
  )
}

export default GradientCarousel
