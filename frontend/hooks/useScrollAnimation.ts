'use client'

import { useLayoutEffect, useEffect, useRef } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

gsap.registerPlugin(ScrollTrigger)

const useIsomorphicLayoutEffect = typeof window !== 'undefined' ? useLayoutEffect : useEffect

export function useScrollAnimation<T extends HTMLElement = HTMLDivElement>(
  animationCallback: (element: T) => void,
  deps: React.DependencyList = []
) {
  const containerRef = useRef<T>(null)

  useIsomorphicLayoutEffect(() => {
    if (!containerRef.current) return

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (prefersReducedMotion) return

    const element = containerRef.current
    const ctx = gsap.context(() => {
      animationCallback(element)
    }, containerRef)

    return () => {
      ctx.revert()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)

  return containerRef
}
