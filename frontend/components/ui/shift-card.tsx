'use client'

import React, { useState, type ReactNode } from 'react'
import { motion, AnimatePresence } from 'motion/react'

interface ShiftCardProps {
  topContent: ReactNode
  topAnimateContent: ReactNode
  middleContent: ReactNode
  bottomContent: ReactNode
  className?: string
  style?: React.CSSProperties
}

export function ShiftCard({
  topContent,
  topAnimateContent,
  middleContent,
  bottomContent,
  className = '',
  style,
}: ShiftCardProps) {
  const [hovered, setHovered] = useState(false)

  return (
    <div
      className={`relative flex flex-col rounded-3xl overflow-hidden select-none cursor-default ${className}`}
      style={style}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* TOP section */}
      <div className="relative overflow-hidden">
        {/* Default top content */}
        <motion.div
          animate={{ opacity: hovered ? 0 : 1, y: hovered ? -8 : 0 }}
          transition={{ duration: 0.25, ease: 'easeInOut' }}
        >
          {topContent}
        </motion.div>

        {/* Animated content that slides into top on hover */}
        <AnimatePresence>
          {hovered && (
            <motion.div
              className="absolute inset-0"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.25, ease: 'easeInOut' }}
            >
              {topAnimateContent}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* MIDDLE section — content shifts up on hover */}
      <motion.div
        className="flex items-center justify-center"
        animate={{ y: hovered ? -12 : 0 }}
        transition={{ duration: 0.35, ease: [0.32, 0.72, 0, 1] }}
      >
        {middleContent}
      </motion.div>

      {/* BOTTOM section — slides up from below on hover */}
      <motion.div
        className="overflow-hidden"
        animate={{ height: hovered ? 'auto' : 0, opacity: hovered ? 1 : 0 }}
        initial={{ height: 0, opacity: 0 }}
        transition={{ duration: 0.35, ease: [0.32, 0.72, 0, 1] }}
      >
        {bottomContent}
      </motion.div>
    </div>
  )
}
