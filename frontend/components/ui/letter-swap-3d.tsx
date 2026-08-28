'use client'

import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'

export interface LetterSwap3DProps {
  text: string
  className?: string
  staggerDelay?: number
  hoverState?: boolean
}

export function LetterSwap3D({
  text,
  className,
  staggerDelay = 0.025,
  hoverState
}: LetterSwap3DProps) {
  const [internalHover, setInternalHover] = useState(false)
  const isHovered = hoverState !== undefined ? hoverState : internalHover

  const characters = Array.from(text)

  return (
    <span
      className={cn(
        'relative inline-flex items-center overflow-hidden cursor-pointer py-0.5 select-none font-sora',
        className
      )}
      onMouseEnter={() => setInternalHover(true)}
      onMouseLeave={() => setInternalHover(false)}
      aria-label={text}
    >
      <span className="inline-flex items-center" style={{ perspective: '400px' }}>
        {characters.map((char, index) => {
          if (char === ' ') {
            return (
              <span key={index} className="inline-block w-[0.25em]">
                &nbsp;
              </span>
            )
          }

          return (
            <span
              key={index}
              className="relative inline-block h-[1.2em] overflow-hidden leading-none"
              style={{ transformStyle: 'preserve-3d' }}
            >
              {/* Primary Character (Slides up & rotates out) */}
              <motion.span
                className="inline-block"
                animate={{
                  rotateX: isHovered ? 90 : 0,
                  y: isHovered ? '-100%' : '0%',
                  opacity: isHovered ? 0 : 1
                }}
                transition={{
                  duration: 0.35,
                  delay: index * staggerDelay,
                  ease: [0.22, 1, 0.36, 1]
                }}
              >
                {char}
              </motion.span>

              {/* Secondary Character (Flips in from bottom) */}
              <motion.span
                className="absolute left-0 top-0 inline-block text-blue-600 font-bold"
                initial={{ rotateX: -90, y: '100%', opacity: 0 }}
                animate={{
                  rotateX: isHovered ? 0 : -90,
                  y: isHovered ? '0%' : '100%',
                  opacity: isHovered ? 1 : 0
                }}
                transition={{
                  duration: 0.35,
                  delay: index * staggerDelay,
                  ease: [0.22, 1, 0.36, 1]
                }}
              >
                {char}
              </motion.span>
            </span>
          )
        })}
      </span>
    </span>
  )
}

export default LetterSwap3D
