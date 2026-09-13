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
        { opacity: baseOpacity, willChange: 'opacity' },
        {
          ease: 'none',
          opacity: 1,
          stagger,
          scrollTrigger: {
            trigger: el,
            scroller,
            start: 'top bottom',
            end: wordAnimationEnd,
            scrub: 1.5,
          },
        }
      )

      if (enableBlur) {
        gsap.fromTo(
          wordElements,
          { filter: `blur(${blurStrength}px)` },
          {
            ease: 'none',
            filter: 'blur(0px)',
            stagger,
            scrollTrigger: {
              trigger: el,
              scroller,
              start: 'top bottom',
              end: wordAnimationEnd,
              scrub: 1.5,
            },
          }
        )
      }
    }, el)

    return () => ctx.revert()
  }, [scrollContainerRef, enableBlur, baseRotation, baseOpacity, rotationEnd, wordAnimationEnd, blurStrength, stagger])

  return (
    <h2 ref={containerRef} className={`my-5 ${containerClassName}`}>
      <p className={`text-[clamp(1.6rem,4vw,3rem)] leading-[1.5] font-semibold ${textClassName}`}>
        {splitText}
      </p>
    </h2>
  )
}

export default ScrollReveal
