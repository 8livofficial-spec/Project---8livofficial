'use client'

import React, { useEffect, useMemo, useRef, type ReactNode, type RefObject } from 'react'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

gsap.registerPlugin(ScrollTrigger)

interface ScrollFloatProps {
  children: ReactNode
  scrollContainerRef?: RefObject<HTMLElement>
  containerClassName?: string
  textClassName?: string
  animationDuration?: number
  ease?: string
  scrollStart?: string
  scrollEnd?: string
  stagger?: number
}

const ScrollFloat: React.FC<ScrollFloatProps> = ({
  children,
  scrollContainerRef,
  containerClassName = '',
  textClassName = '',
  animationDuration = 1,
  ease = 'back.inOut(2)',
  scrollStart = 'center bottom+=50%',
  scrollEnd = 'bottom bottom-=40%',
  stagger = 0.03,
}) => {
  const containerRef = useRef<HTMLHeadingElement>(null)

  const splitWords = useMemo(() => {
    const text = typeof children === 'string' ? children : ''
    const words = text.split(/\s+/).filter(Boolean)
    return words.map((word, wordIndex) => (
      <span key={wordIndex} className="inline-block whitespace-nowrap mr-[0.28em] last:mr-0">
        {word.split('').map((char, charIndex) => (
          <span className="inline-block char-element" key={charIndex}>
            {char}
          </span>
        ))}
      </span>
    ))
  }, [children])

  useEffect(() => {
    const el = containerRef.current
    if (!el) return

    const scroller =
      scrollContainerRef && scrollContainerRef.current
        ? scrollContainerRef.current
        : window

    // Use gsap.context scoped to this element so cleanup only kills OUR triggers
    const ctx = gsap.context(() => {
      const isMobile = window.innerWidth < 768

      if (isMobile) {
        // High-performance mobile reveal: 0 GPU layer thrashing, perfectly smooth 60/120fps
        gsap.fromTo(
          el,
          { opacity: 0, y: 10 },
          {
            opacity: 1,
            y: 0,
            duration: 0.5,
            ease: 'power2.out',
            scrollTrigger: {
              trigger: el,
              scroller,
              start: 'top 92%',
              toggleActions: 'play none none none',
            },
          }
        )
        return
      }

      // Desktop: Rich character-by-character float animation
      const charElements = el.querySelectorAll('.char-element')

      gsap.fromTo(
        charElements,
        {
          willChange: 'opacity, transform',
          opacity: 0,
          yPercent: 120,
          scaleY: 2.3,
          scaleX: 0.7,
          transformOrigin: '50% 0%',
        },
        {
          duration: animationDuration,
          ease,
          opacity: 1,
          yPercent: 0,
          scaleY: 1,
          scaleX: 1,
          stagger,
          scrollTrigger: {
            trigger: el,
            scroller,
            start: scrollStart,
            end: scrollEnd,
            scrub: true,
          },
        }
      )
    }, el) // <-- scope to el, not global

    return () => ctx.revert() // only kills triggers created inside this context
  }, [scrollContainerRef, animationDuration, ease, scrollStart, scrollEnd, stagger])

  return (
    <h3 ref={containerRef} className={`overflow-hidden ${containerClassName}`}>
      <span className={`inline-block leading-snug ${textClassName}`}>
        {splitWords}
      </span>
    </h3>
  )
}

export default ScrollFloat
