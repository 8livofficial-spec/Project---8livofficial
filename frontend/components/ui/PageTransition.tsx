'use client'

import { useEffect, useRef } from 'react'
import { usePathname } from 'next/navigation'
import gsap from 'gsap'

export default function PageTransition({ children }: { children: React.ReactNode }) {
  const containerRef = useRef<HTMLDivElement>(null)
  const pathname = usePathname()

  useEffect(() => {
    const el = containerRef.current
    if (!el) return

    gsap.fromTo(
      el,
      { opacity: 0 },
      {
        opacity: 1,
        duration: 0.35,
        ease: 'power2.out',
        clearProps: 'all',
      }
    )
  }, [pathname])

  return (
    <div ref={containerRef}>
      {children}
    </div>
  )
}
