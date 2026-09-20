'use client'

import React, { useEffect, useRef, useMemo, type ReactNode, type RefObject } from 'react'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

gsap.registerPlugin(ScrollTrigger)

interface ScrollRevealProps {
  children: ReactNode
  scrollContainerRef?: RefObject<HTMLElement>
  enableBlur?: boolean
  baseOpacity?: number
  baseRotation?: number
  blurStrength?: number
  containerClassName?: string
  textClassName?: string
  rotationEnd?: string
  wordAnimationEnd?: string
  stagger?: number
}

const ScrollReveal: React.FC<ScrollRevealProps> = ({
  children,
  scrollContainerRef,
  enableBlur = true,
  baseOpacity = 0.1,
  baseRotation = 3,
  blurStrength = 4,
  containerClassName = '',
  textClassName = '',
  rotationEnd = 'bottom center',
  wordAnimationEnd = 'bottom center',
  stagger = 0.12,
}) => {
  const containerRef = useRef<HTMLHeadingElement>(null)

  const splitText = useMemo(() => {
    const text = typeof children === 'string' ? children : ''
    return text.split(/(\s+)/).map((word, index) => {
      if (word.match(/^\s+$/)) return word
      return (
        <span className="inline-block word" key={index}>
          {word}
        </span>
      )
    })
  }, [children])

  useEffect(() => {
    const el = containerRef.current
    if (!el) return

    const scroller =
      scrollContainerRef && scrollContainerRef.current
        ? scrollContainerRef.current
        : window

    // Scope to this element so cleanup only kills OUR triggers
    const ctx = gsap.context(() => {
      const isMobile = window.innerWidth < 768

      if (isMobile) {
        // High-performance mobile reveal: 0 GPU blur thrashing, silky-smooth 60/120fps
        gsap.fromTo(
          el,
          { opacity: 0, y: 14 },
          {
            opacity: 1,
            y: 0,
            duration: 0.6,
            ease: 'power2.out',
            scrollTrigger: {
              trigger: el,
              scroller,
              start: 'top 90%',
              toggleActions: 'play none none none',
            },
          }
        )
        return
      }

      gsap.fromTo(
        el,
        { transformOrigin: '0% 50%', rotate: baseRotation },
        {
          ease: 'none',
          rotate: 0,
          scrollTrigger: {
            trigger: el,
            scroller,
            start: 'top bottom',
            end: rotationEnd,
            scrub: true,
          },
        }
      )

      const wordElements = el.querySelectorAll<HTMLElement>('.word')

      gsap.fromTo(
        wordElements,
        { opacity: baseOpacity, y: 8, willChange: 'opacity, transform' },
        {
          ease: 'power2.out',
          opacity: 1,
          y: 0,
          stagger,
          duration: 0.6,
          scrollTrigger: {
            trigger: el,
            scroller,
            start: 'top 88%',
            toggleActions: 'play none none none',
          },
        }
      )
    }, el)

    return () => ctx.revert()
  }, [scrollContainerRef, baseOpacity, stagger])

  return (
    <h2 ref={containerRef} className={`${containerClassName}`}>
      <span className={`inline-block leading-tight font-semibold ${textClassName}`}>
        {splitText}
      </span>
    </h2>
  )
}

export default ScrollReveal
