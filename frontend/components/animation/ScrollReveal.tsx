'use client'

import React, { useRef, useLayoutEffect, useEffect } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

gsap.registerPlugin(ScrollTrigger)

const useIsomorphicLayoutEffect = typeof window !== 'undefined' ? useLayoutEffect : useEffect

interface ScrollRevealProps {
  children: React.ReactNode
  className?: string
  yOffset?: number
  duration?: number
  delay?: number
  stagger?: number
  start?: string
  scale?: number
}

export default function ScrollReveal({
  children,
  className = '',
  yOffset = 36,
  duration = 0.85,
  delay = 0,
  stagger = 0,
  start = 'top 88%',
  scale = 1,
}: ScrollRevealProps) {
  const elRef = useRef<HTMLDivElement>(null)

  useIsomorphicLayoutEffect(() => {
    const el = elRef.current
    if (!el) return

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (prefersReducedMotion) return

    const targets = stagger > 0 && el.children.length > 0 ? Array.from(el.children) : el

    const ctx = gsap.context(() => {
      gsap.fromTo(
        targets,
        {
          opacity: 0,
          y: yOffset,
          scale: scale !== 1 ? scale : undefined,
        },
        {
          opacity: 1,
          y: 0,
          scale: 1,
          duration,
          delay,
          stagger: stagger > 0 ? stagger : undefined,
          ease: 'power3.out',
          scrollTrigger: {
            trigger: el,
            start,
            toggleActions: 'play none none none',
            once: true,
          },
        }
      )
    }, elRef)

    return () => ctx.revert()
  }, [yOffset, duration, delay, stagger, start, scale])

  return (
    <div ref={elRef} className={className}>
      {children}
    </div>
  )
}
