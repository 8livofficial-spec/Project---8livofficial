'use client'

import React, { useRef, useEffect, useState } from 'react'

interface KineticTextProps {
  children: string
  className?: string
  as?: 'h1' | 'h2' | 'h3' | 'h4' | 'p' | 'span'
  delay?: number
  stagger?: number
  threshold?: number
}

export default function KineticText({
  children,
  className = '',
  as = 'h2',
  delay = 0,
  stagger = 0.04,
  threshold = 0.15,
}: KineticTextProps) {
  const containerRef = useRef<HTMLElement>(null)
  const [isVisible, setIsVisible] = useState(false)
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false)

  useEffect(() => {
    // Check reduced motion preference
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
          if (containerRef.current) {
            observer.unobserve(containerRef.current)
          }
        }
      },
      { threshold }
    )

    if (containerRef.current) {
      observer.observe(containerRef.current)
    }

    return () => observer.disconnect()
  }, [threshold])

  // Split words while preserving punctuation and spacing
  const words = children.split(' ')
  const Tag = as as any

  if (prefersReducedMotion) {
    return <Tag className={className}>{children}</Tag>
  }

  return (
    <Tag
      ref={containerRef}
      className={`${className} inline-block`}
      aria-label={children}
    >
      {words.map((word, wordIndex) => (
        <span
          key={wordIndex}
          className="inline-block overflow-hidden mr-[0.28em] align-top leading-[1.2]"
          aria-hidden="true"
        >
          <span
            className="inline-block transition-all duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] transform-gpu will-change-transform"
            style={{
              transform: isVisible ? 'translateY(0%)' : 'translateY(115%)',
              opacity: isVisible ? 1 : 0,
              transitionDelay: `${delay + wordIndex * stagger}s`,
            }}
          >
            {word}
          </span>
        </span>
      ))}
    </Tag>
  )
}
