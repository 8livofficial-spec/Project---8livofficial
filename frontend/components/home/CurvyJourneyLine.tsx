'use client'

import React, { useEffect, useState, useRef, useCallback } from 'react'
import { motion, useScroll, useSpring, useTransform } from 'framer-motion'

const SECTION_IDS = [
  'hero',
  'brand-manifesto',
  'how-it-works',
  'pillars',
  'results',
  'pricing',
]

// Alternating wave coordinates calibrated to weave around content without crossing text blocks
const X_RATIOS = [0.82, 0.18, 0.80, 0.20, 0.78, 0.50]

/**
 * Calculates a smooth continuous cubic Bezier path through an array of points
 */
function createSmoothSplinePath(points: { x: number; y: number }[]): string {
  if (points.length < 2) return ''
  if (points.length === 2) {
    return `M ${points[0].x.toFixed(1)} ${points[0].y.toFixed(1)} L ${points[1].x.toFixed(1)} ${points[1].y.toFixed(1)}`
  }

  let d = `M ${points[0].x.toFixed(1)} ${points[0].y.toFixed(1)}`

  for (let i = 0; i < points.length - 1; i++) {
    const current = points[i]
    const next = points[i + 1]

    // Determine curvature tangents based on neighboring points
    const prev = points[Math.max(0, i - 1)]
    const nextNext = points[Math.min(points.length - 1, i + 2)]

    const tension = 0.28 // Smooth organic elasticity
    const cp1x = current.x + (next.x - prev.x) * tension
    const cp1y = current.y + (next.y - prev.y) * tension
    const cp2x = next.x - (nextNext.x - current.x) * tension
    const cp2y = next.y - (nextNext.y - current.y) * tension

    d += ` C ${cp1x.toFixed(1)} ${cp1y.toFixed(1)}, ${cp2x.toFixed(1)} ${cp2y.toFixed(1)}, ${next.x.toFixed(1)} ${next.y.toFixed(1)}`
  }

  return d
}

export default function CurvyJourneyLine() {
  const containerRef = useRef<HTMLDivElement>(null)
  const [pathData, setPathData] = useState<string>('')
  const [points, setPoints] = useState<{ x: number; y: number }[]>([])
  const [dimensions, setDimensions] = useState({ width: 1400, height: 6000 })
  const [pricingOffset, setPricingOffset] = useState<number>(4500)
  const [isReady, setIsReady] = useState<boolean>(false)
  const [isMobile, setIsMobile] = useState<boolean>(false)

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768)
    checkMobile()
    window.addEventListener('resize', checkMobile, { passive: true })
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  const updatePath = useCallback(() => {
    if (typeof window === 'undefined') return

    const container = containerRef.current?.parentElement
    if (!container) return

    const width = container.clientWidth || window.innerWidth

    // Do not calculate or display journey curve on mobile screens (< 768px)
    if (width < 768) {
      setIsReady(false)
      return
    }

    const height = Math.max(
      container.scrollHeight || 0,
      document.documentElement.scrollHeight || 0,
      4000
    )

    setDimensions({ width, height })

    const pts: { x: number; y: number }[] = []
    const isTablet = width >= 768 && width < 1024

    SECTION_IDS.forEach((id, index) => {
      const el = document.getElementById(id)
      let y = 0

      if (el) {
        const rect = el.getBoundingClientRect()
        const scrollTop = window.scrollY || window.pageYOffset

        if (id === 'hero') {
          y = rect.top + scrollTop + rect.height * 0.88
        } else if (id === 'pricing') {
          y = rect.top + scrollTop + 160
          setPricingOffset(rect.top + scrollTop - window.innerHeight * 0.5)
        } else {
          y = rect.top + scrollTop + rect.height * 0.45
        }
      } else {
        y = (height / (SECTION_IDS.length + 1)) * (index + 1)
      }

      // Constrain horizontal sweep to prevent crossing readable areas
      const ratio = X_RATIOS[index % X_RATIOS.length]
      const minX = isTablet ? width * 0.22 : width * 0.14
      const maxX = isTablet ? width * 0.78 : width * 0.86
      const x = id === 'pricing' ? width * 0.5 : minX + (maxX - minX) * ratio

      pts.push({ x, y })
    })

    setPoints(pts)
    const spline = createSmoothSplinePath(pts)
    setPathData(spline)
    setIsReady(true)
  }, [])

  // Production-grade listener: ResizeObserver + window resize + asset load
  useEffect(() => {
    let rafId: number | null = null

    const handleUpdate = () => {
      if (rafId) cancelAnimationFrame(rafId)
      rafId = requestAnimationFrame(() => {
        updatePath()
      })
    }

    // Initial setup with double RAF for layout settlement
    requestAnimationFrame(() => {
      updatePath()
      setTimeout(updatePath, 350)
      setTimeout(updatePath, 1200)
    })

    window.addEventListener('resize', handleUpdate, { passive: true })
    window.addEventListener('load', handleUpdate, { passive: true })

    // Observe document container changes
    let observer: ResizeObserver | null = null
    const target = containerRef.current?.parentElement || document.body

    if (typeof ResizeObserver !== 'undefined' && target) {
      observer = new ResizeObserver(() => {
        handleUpdate()
      })
      observer.observe(target)
    }

    return () => {
      if (rafId) cancelAnimationFrame(rafId)
      window.removeEventListener('resize', handleUpdate)
      window.removeEventListener('load', handleUpdate)
      observer?.disconnect()
    }
  }, [updatePath])

  // Framer Motion spring scroll driver
  const { scrollY } = useScroll()
  const rawProgress = useTransform(
    scrollY,
    [0, Math.max(1000, pricingOffset)],
    [0, 1]
  )

  const smoothProgress = useSpring(rawProgress, {
    stiffness: 90,
    damping: 26,
    restDelta: 0.001,
  })

  // Completely unmount on mobile devices for maximum performance and 0 scroll overhead
  if (isMobile) return null

  return (
    <div
      ref={containerRef}
      aria-hidden="true"
      className={`hidden md:block absolute inset-0 pointer-events-none overflow-hidden z-0 transition-opacity duration-700 ${
        isReady ? 'opacity-100' : 'opacity-0'
      }`}
      style={{ height: '100%', width: '100%' }}
    >
      <svg
        className="w-full h-full"
        viewBox={`0 0 ${dimensions.width} ${dimensions.height}`}
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        preserveAspectRatio="none"
      >
        <defs>
          {/* Subtle brand metabolic gradient */}
          <linearGradient id="blendedJourneyGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#00A884" stopOpacity="0.08" />
            <stop offset="25%" stopColor="#0D9488" stopOpacity="0.14" />
            <stop offset="60%" stopColor="#00A884" stopOpacity="0.16" />
            <stop offset="85%" stopColor="#0F766E" stopOpacity="0.12" />
            <stop offset="100%" stopColor="#00A884" stopOpacity="0.08" />
          </linearGradient>

          {/* Active progress beam gradient */}
          <linearGradient id="activeBeamGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#00A884" stopOpacity="0.30" />
            <stop offset="40%" stopColor="#0D9488" stopOpacity="0.40" />
            <stop offset="70%" stopColor="#00A884" stopOpacity="0.35" />
            <stop offset="100%" stopColor="#0F766E" stopOpacity="0.25" />
          </linearGradient>
        </defs>

        {/* 1. Ambient Background Halo (Pure vector stacking without GPU filter penalty) */}
        <path
          d={pathData}
          stroke="url(#blendedJourneyGradient)"
          strokeWidth="10"
          strokeLinecap="round"
          fill="none"
          opacity="0.2"
        />

        {/* 2. Permanent Soft Guide Path */}
        <path
          d={pathData}
          stroke="#00A884"
          strokeOpacity="0.08"
          strokeWidth="2"
          strokeLinecap="round"
          fill="none"
        />

        {/* 3. Active Scroll-Driven Radiant Beam */}
        <motion.path
          d={pathData}
          stroke="url(#activeBeamGradient)"
          strokeWidth="2.5"
          strokeLinecap="round"
          fill="none"
          style={{
            pathLength: smoothProgress,
          }}
        />

        {/* 4. Ambient Energy Pulse Stream */}
        <path
          d={pathData}
          stroke="#00A884"
          strokeWidth="2"
          strokeLinecap="round"
          strokeDasharray="80 320"
          fill="none"
          opacity="0.25"
          className="journey-stream-beam"
        />

        {/* 5. Minimal Ambient Waypoint Beacons */}
        {points.slice(1, -1).map((pt, i) => (
          <g key={i} transform={`translate(${pt.x}, ${pt.y})`}>
            {/* Ambient outer halo */}
            <circle
              r="12"
              fill="#00A884"
              fillOpacity="0.03"
            />
            {/* Subtle glass node ring */}
            <circle
              r="5"
              stroke="#00A884"
              strokeWidth="1"
              strokeOpacity="0.25"
              fill="rgba(255, 255, 255, 0.6)"
            />
            {/* Center Core dot */}
            <circle
              r="2"
              fill="#00A884"
              fillOpacity="0.6"
            />
          </g>
        ))}
      </svg>
    </div>
  )
}
