'use client'

import React, { useRef, useLayoutEffect, useEffect } from 'react'
import Image, { ImageProps } from 'next/image'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

gsap.registerPlugin(ScrollTrigger)

const useIsomorphicLayoutEffect = typeof window !== 'undefined' ? useLayoutEffect : useEffect

interface ParallaxImageProps extends Omit<ImageProps, 'className'> {
  containerClassName?: string
  imageClassName?: string
  parallaxSpeed?: number // e.g. 10 means -10% to 10%
}

export default function ParallaxImage({
  containerClassName = '',
  imageClassName = '',
  parallaxSpeed = 8,
  alt,
  ...props
}: ParallaxImageProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const imageWrapperRef = useRef<HTMLDivElement>(null)

  useIsomorphicLayoutEffect(() => {
    const container = containerRef.current
    const imageWrapper = imageWrapperRef.current
    if (!container || !imageWrapper) return

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (prefersReducedMotion) return

    const ctx = gsap.context(() => {
      gsap.fromTo(
        imageWrapper,
        {
          yPercent: -parallaxSpeed,
          scale: 1.08,
        },
        {
          yPercent: parallaxSpeed,
          scale: 1.08,
          ease: 'none',
          scrollTrigger: {
            trigger: container,
            start: 'top bottom',
            end: 'bottom top',
            scrub: true,
          },
        }
      )
    }, containerRef)

    return () => ctx.revert()
  }, [parallaxSpeed])

  return (
    <div
      ref={containerRef}
      className={`relative overflow-hidden ${containerClassName}`}
    >
      <div
        ref={imageWrapperRef}
        className="relative w-full h-full will-change-transform"
      >
        <Image
          {...props}
          alt={alt}
          className={`object-cover ${imageClassName}`}
        />
      </div>
    </div>
  )
}
