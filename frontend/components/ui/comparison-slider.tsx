'use client'

import React, { useState, useRef, useCallback, useEffect } from 'react'
import { ChevronsLeftRight, Sparkles } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface ComparisonSliderProps {
  beforeImage: string
  afterImage: string
  beforeLabel?: string
  afterLabel?: string
  beforeTagline?: string
  afterTagline?: string
  initialPosition?: number
  hoverMode?: boolean
  className?: string
}

export function ComparisonSlider({
  beforeImage,
  afterImage,
  beforeLabel = 'Before 8liv Protocol',
  afterLabel = 'Clinical Protocol Outcome',
  beforeTagline = 'Initial Baseline',
  afterTagline = 'Metabolic Transformation',
  initialPosition = 50,
  hoverMode = false,
  className
}: ComparisonSliderProps) {
  const [sliderPosition, setSliderPosition] = useState(initialPosition)
  const [isDragging, setIsDragging] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  const handleMove = useCallback(
    (clientX: number) => {
      if (!containerRef.current) return
      const rect = containerRef.current.getBoundingClientRect()
      const x = clientX - rect.left
      let percentage = (x / rect.width) * 100
      if (percentage < 0) percentage = 0
      if (percentage > 100) percentage = 100
      setSliderPosition(percentage)
    },
    []
  )

  const handleTouchMove = useCallback(
    (e: TouchEvent) => {
      if (!isDragging && !hoverMode) return
      if (e.touches[0]) {
        handleMove(e.touches[0].clientX)
      }
    },
    [handleMove, isDragging, hoverMode]
  )

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!isDragging && !hoverMode) return
      handleMove(e.clientX)
    },
    [handleMove, isDragging, hoverMode]
  )

  const handleMouseUp = useCallback(() => {
    setIsDragging(false)
  }, [])

  useEffect(() => {
    if (isDragging || hoverMode) {
      window.addEventListener('mousemove', handleMouseMove)
      window.addEventListener('mouseup', handleMouseUp)
      window.addEventListener('touchmove', handleTouchMove)
      window.addEventListener('touchend', handleMouseUp)
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
      window.removeEventListener('touchmove', handleTouchMove)
      window.removeEventListener('touchend', handleMouseUp)
    }
  }, [isDragging, hoverMode, handleMouseMove, handleMouseUp, handleTouchMove])

  return (
    <div
      ref={containerRef}
      className={cn(
        'relative w-full overflow-hidden rounded-2xl sm:rounded-3xl border border-white/20 shadow-2xl select-none group cursor-ew-resize touch-none',
        className
      )}
      onMouseDown={(e) => {
        setIsDragging(true)
        handleMove(e.clientX)
      }}
      onTouchStart={(e) => {
        setIsDragging(true)
        if (e.touches[0]) handleMove(e.touches[0].clientX)
      }}
      onMouseMove={(e) => {
        if (hoverMode) handleMove(e.clientX)
      }}
    >
      {/* Background Area: AFTER (Full container with Alt Text placeholder) */}
      <div className="relative w-full h-[280px] xs:h-[340px] sm:h-[480px] bg-slate-100 border-2 border-dashed border-slate-300 overflow-hidden flex items-center justify-center">
        <div className="flex flex-col items-center justify-center p-6 text-center max-w-sm">
          <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-[#00A884] flex items-center justify-center mb-3">
            <Sparkles className="w-6 h-6" />
          </div>
          <p className="text-xs sm:text-sm font-bold text-slate-800 font-sora uppercase tracking-wider mb-1">
            [Image: {afterLabel}]
          </p>
          <p className="text-[11px] sm:text-xs text-slate-500 font-light">
            alt=&quot;{afterTagline || afterLabel}&quot;
          </p>
        </div>

        {/* After Label Badge */}
        <div className="absolute top-3 right-3 sm:top-4 sm:right-4 z-10 flex flex-col items-end">
          <div className="inline-flex items-center gap-1 sm:gap-1.5 px-2.5 py-0.5 sm:px-3 sm:py-1 rounded-full bg-[#00A884] text-white text-[10px] sm:text-xs font-bold font-sora shadow-sm">
            <Sparkles className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
            <span>{afterLabel}</span>
          </div>
          {afterTagline && (
            <span className="text-[9px] sm:text-[10px] text-slate-600 mt-0.5 sm:mt-1 font-medium bg-white/90 px-2 py-0.5 rounded shadow-xs border border-slate-200 max-w-[160px] sm:max-w-none truncate">
              {afterTagline}
            </span>
          )}
        </div>
      </div>

      {/* Foreground Area: BEFORE (Clipped overlay with Alt Text placeholder) */}
      <div
        className="absolute inset-y-0 left-0 overflow-hidden bg-slate-200 border-r-2 border-dashed border-slate-400 z-10 transition-none flex items-center justify-center"
        style={{ width: `${sliderPosition}%` }}
      >
        <div
          className="flex flex-col items-center justify-center p-6 text-center min-w-[320px]"
          style={{
            width: containerRef.current ? `${containerRef.current.clientWidth}px` : '100%'
          }}
        >
          <div className="w-12 h-12 rounded-2xl bg-slate-300 text-slate-700 flex items-center justify-center mb-3 font-sora font-bold text-sm">
            W0
          </div>
          <p className="text-xs sm:text-sm font-bold text-slate-800 font-sora uppercase tracking-wider mb-1">
            [Image: {beforeLabel}]
          </p>
          <p className="text-[11px] sm:text-xs text-slate-600 font-light">
            alt=&quot;{beforeTagline || beforeLabel}&quot;
          </p>
        </div>

        {/* Before Label Badge */}
        <div className="absolute top-3 left-3 sm:top-4 sm:left-4 z-10 flex flex-col items-start">
          <div className="inline-flex items-center gap-1 sm:gap-1.5 px-2.5 py-0.5 sm:px-3 sm:py-1 rounded-full bg-slate-800 text-white text-[10px] sm:text-xs font-bold font-sora shadow-sm">
            <span>{beforeLabel}</span>
          </div>
          {beforeTagline && (
            <span className="text-[9px] sm:text-[10px] text-slate-600 mt-0.5 sm:mt-1 font-medium bg-white/90 px-2 py-0.5 rounded shadow-xs border border-slate-200 max-w-[160px] sm:max-w-none truncate">
              {beforeTagline}
            </span>
          )}
        </div>
      </div>

      {/* Draggable Divider Line & Handle */}
      <div
        className="absolute inset-y-0 z-20 pointer-events-none flex items-center justify-center transition-none"
        style={{ left: `${sliderPosition}%` }}
      >
        {/* Vertical Divider Bar */}
        <div className="w-0.5 h-full bg-white shadow-[0_0_12px_rgba(0,82,255,0.8)]" />

        {/* Center Grab Handle Button */}
        <div className="absolute w-9 h-9 -ml-4.5 sm:w-10 sm:h-10 sm:-ml-5 rounded-full bg-blue-600 border-2 border-white text-white flex items-center justify-center shadow-xl shadow-blue-600/40 group-hover:scale-110 transition-transform">
          <ChevronsLeftRight className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
        </div>
      </div>
    </div>
  )
}

export default ComparisonSlider
