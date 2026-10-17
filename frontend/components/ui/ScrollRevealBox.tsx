'use client'

import React, { useRef, useEffect, useState } from 'react'

interface ScrollRevealBoxProps {
  children: React.ReactNode
  className?: string
  variant?: 'fade-up' | 'clip-inset' | 'stagger-scale' | 'zoom-in'
  delay?: number
  duration?: number
  threshold?: number
}

export default function ScrollRevealBox({
  children,
  className = '',
  variant = 'fade-up',
  delay = 0,
  duration = 0.75,
  threshold = 0.15,
}: ScrollRevealBoxProps) {
  const ref = useRef<HTMLDivElement>(null)
  const [isVisible, setIsVisible] = useState(false)
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false)

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
      setPrefersReducedMotion(mediaQuery.matches)
      if (mediaQuery.matches) {
        setIsVisible(true)
        return
      }
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true)
          if (ref.current) {
            observer.unobserve(ref.current)
          }
        }
      },
      { threshold }
    )

    if (ref.current) {
      observer.observe(ref.current)
    }

    return () => observer.disconnect()
  }, [threshold])

  if (prefersReducedMotion) {
    return <div className={className}>{children}</div>
  }

  // Define styles based on animation variant
  let initialStyles: React.CSSProperties = {
    transition: `all ${duration}s cubic-bezier(0.16, 1, 0.3, 1) ${delay}s`,
    willChange: 'transform, opacity, clip-path',
  }

  if (variant === 'fade-up') {
    initialStyles = {
      ...initialStyles,
      opacity: isVisible ? 1 : 0,
      transform: isVisible ? 'translateY(0)' : 'translateY(28px)',
    }
  } else if (variant === 'clip-inset') {
    initialStyles = {
      ...initialStyles,
      opacity: isVisible ? 1 : 0.4,
      clipPath: isVisible ? 'inset(0% 0% 0% 0% round 2rem)' : 'inset(8% 8% 8% 8% round 2rem)',
      transform: isVisible ? 'scale(1)' : 'scale(1.04)',
    }
  } else if (variant === 'stagger-scale') {
    initialStyles = {
      ...initialStyles,
      opacity: isVisible ? 1 : 0,
      transform: isVisible ? 'scale(1) translateY(0)' : 'scale(0.96) translateY(20px)',
    }
  }

  return (
    <div ref={ref} className={className} style={initialStyles}>
      {children}
    </div>
  )
}
