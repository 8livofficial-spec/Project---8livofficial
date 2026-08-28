'use client'

import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Sparkles, CheckCircle2 } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface CardSpreadItem {
  id: string | number
  step?: string
  tag?: string
  title: string
  subtitle?: string
  desc: string
  image: string
  stat?: string
}

export interface CardSpreadProps {
  items: CardSpreadItem[]
  className?: string
  spreadAngle?: number
  spreadOffset?: number
}

export function CardSpread({
  items,
  className,
  spreadAngle = 10,
  spreadOffset = 180
}: CardSpreadProps) {
  const [isHovered, setIsHovered] = useState(false)
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null)
  const [isMobile, setIsMobile] = useState(false)
  const [activeMobileIdx, setActiveMobileIdx] = useState(0)

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768)
    }
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  const centerIndex = (items.length - 1) / 2
  const effectiveSpreadOffset = isMobile ? Math.min(65, window.innerWidth * 0.14) : spreadOffset

  return (
    <div className={cn('w-full flex flex-col items-center justify-center py-4 md:py-8 overflow-hidden', className)}>
      {/* Interactive Deck Area */}
      <div
        className="relative w-full max-w-5xl h-[420px] sm:h-[500px] flex items-center justify-center cursor-pointer select-none touch-none"
        onMouseEnter={() => !isMobile && setIsHovered(true)}
        onMouseLeave={() => {
          if (!isMobile) {
            setIsHovered(false)
            setHoveredIdx(null)
          }
        }}
        onClick={() => {
          if (isMobile) setIsHovered(prev => !prev)
        }}
      >
        {items.map((item, idx) => {
          const offset = idx - centerIndex

          // Unhovered (Stacked Deck) vs Hovered (Fanned Spread)
          const rotate = isHovered
            ? offset * (isMobile ? spreadAngle * 0.6 : spreadAngle)
            : offset * 3.5

          const translateX = isHovered
            ? offset * effectiveSpreadOffset
            : offset * (isMobile ? 6 : 12)

          const translateY = isHovered
            ? Math.abs(offset) * (isMobile ? 8 : 16)
            : idx * 4

          const isCardHovered = hoveredIdx === idx
          const zIndex = isCardHovered ? 40 : 10 + idx

          return (
            <motion.div
              key={item.id}
              onMouseEnter={() => !isMobile && setHoveredIdx(idx)}
              onClick={(e) => {
                if (isMobile) {
                  e.stopPropagation()
                  setActiveMobileIdx(idx)
                  setHoveredIdx(idx)
                }
              }}
              className="absolute w-[240px] sm:w-[320px] h-[370px] sm:h-[440px] rounded-[1.75rem] sm:rounded-[2rem] bg-white border border-[#D46E53]/20 shadow-xl overflow-hidden flex flex-col justify-between"
              style={{ zIndex }}
              animate={{
                x: translateX,
                y: isCardHovered ? translateY - 14 : translateY,
                rotate: isCardHovered ? 0 : rotate,
                scale: isCardHovered ? 1.04 : isHovered ? 0.96 : 1
              }}
              transition={{
                type: 'spring',
                stiffness: 240,
                damping: 24
              }}
            >
              {/* Image Window */}
              <div className="relative h-[160px] sm:h-[220px] w-full bg-[#0F172A] overflow-hidden shrink-0">
                <img
                  src={item.image}
                  alt={item.title}
                  className="w-full h-full object-cover object-center transition-transform duration-700 hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent" />

                {item.step && (
                  <div className="absolute top-3 left-3 px-2.5 py-0.5 sm:px-3 sm:py-1 rounded-full bg-white/90 backdrop-blur-md text-[#A84A33] text-[10px] sm:text-xs font-bold font-sora shadow-sm">
                    Stage {item.step}
                  </div>
                )}
                {item.tag && (
                  <div className="absolute top-3 right-3 px-2 py-0.5 sm:px-2.5 sm:py-0.5 rounded-full bg-blue-600/90 text-white text-[9px] sm:text-[10px] font-bold font-sora shadow-sm">
                    {item.tag}
                  </div>
                )}
              </div>

              {/* Card Body */}
              <div className="p-4 sm:p-6 flex-1 flex flex-col justify-between bg-white text-[#0F172A]">
                <div>
                  <h3 className="font-sora text-sm sm:text-lg font-bold leading-tight mb-1">
                    {item.title}
                  </h3>
                  {item.subtitle && (
                    <p className="text-[10px] sm:text-xs font-semibold text-[#A84A33] font-sora mb-1.5">
                      {item.subtitle}
                    </p>
                  )}
                  <p className="text-[11px] sm:text-xs text-[#5D7068] leading-relaxed font-light line-clamp-2 sm:line-clamp-3">
                    {item.desc}
                  </p>
                </div>

                {item.stat && (
                  <div className="pt-2 sm:pt-3 border-t border-[#D46E53]/15 flex items-center justify-between text-[10px] sm:text-[11px] font-semibold text-[#0F172A] font-sora">
                    <span className="truncate">{item.stat}</span>
                    <CheckCircle2 className="w-3.5 h-3.5 text-[#D46E53] shrink-0 ml-1" />
                  </div>
                )}
              </div>
            </motion.div>
          )
        })}
      </div>

      {/* Hint Badge */}
      <div className="mt-3 sm:mt-4 inline-flex items-center gap-2 px-3.5 py-1 sm:px-4 sm:py-1.5 rounded-full bg-white border border-[#D46E53]/20 shadow-xs text-[11px] sm:text-xs font-semibold text-[#A84A33] font-sora">
        <Sparkles className="w-3.5 h-3.5 text-[#D46E53]" />
        <span>{isMobile ? 'Tap deck to toggle step cards' : 'Hover deck to expand interactive stage view'}</span>
      </div>
    </div>
  )
}

export default CardSpread
