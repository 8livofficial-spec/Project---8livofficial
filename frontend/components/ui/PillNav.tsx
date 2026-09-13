'use client'

import React, { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { gsap } from 'gsap'

export type PillNavItem = {
  label: string
  href: string
  ariaLabel?: string
}

export interface PillNavProps {
  logo?: string
  logoAlt?: string
  items: PillNavItem[]
  activeHref?: string
  className?: string
  ease?: string
  baseColor?: string
  pillColor?: string
  hoveredPillTextColor?: string
  pillTextColor?: string
  onMobileMenuClick?: () => void
  initialLoadAnimation?: boolean
}

const PillNav: React.FC<PillNavProps> = ({
  logo,
  logoAlt = 'Logo',
  items,
  activeHref,
  className = '',
  ease = 'power3.easeOut',
  baseColor = '#00A884',
  pillColor = 'rgba(255, 255, 255, 0.45)',
  hoveredPillTextColor = '#FFFFFF',
  pillTextColor,
  onMobileMenuClick,
  initialLoadAnimation = false,
}) => {
  const resolvedPillTextColor = pillTextColor ?? '#0F172A'
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const circleRefs = useRef<Array<HTMLSpanElement | null>>([])
  const tlRefs = useRef<Array<gsap.core.Timeline | null>>([])
  const activeTweenRefs = useRef<Array<gsap.core.Tween | null>>([])
  const logoImgRef = useRef<HTMLImageElement | null>(null)
  const hamburgerRef = useRef<HTMLButtonElement | null>(null)
  const mobileMenuRef = useRef<HTMLDivElement | null>(null)
  const navItemsRef = useRef<HTMLDivElement | null>(null)
  const logoRef = useRef<HTMLAnchorElement | null>(null)

  useEffect(() => {
    const layout = () => {
      circleRefs.current.forEach((circle) => {
        if (!circle?.parentElement) return

        const pill = circle.parentElement as HTMLElement
        const rect = pill.getBoundingClientRect()
        const { width: w, height: h } = rect
        if (w === 0 || h === 0) return

        const R = ((w * w) / 4 + h * h) / (2 * h)
        const D = Math.ceil(2 * R) + 2
        const delta = Math.ceil(R - Math.sqrt(Math.max(0, R * R - (w * w) / 4))) + 1
        const originY = D - delta

        circle.style.width = `${D}px`
        circle.style.height = `${D}px`
        circle.style.bottom = `-${delta}px`

        gsap.set(circle, {
          xPercent: -50,
          scale: 0,
          transformOrigin: `50% ${originY}px`,
        })

        const label = pill.querySelector<HTMLElement>('.pill-label')
        const white = pill.querySelector<HTMLElement>('.pill-label-hover')

        if (label) gsap.set(label, { y: 0 })
        if (white) gsap.set(white, { y: h + 12, opacity: 0 })

        const index = circleRefs.current.indexOf(circle)
        if (index === -1) return

        tlRefs.current[index]?.kill()
        const tl = gsap.timeline({ paused: true })

        tl.to(circle, { scale: 1.2, xPercent: -50, duration: 2, ease, overwrite: 'auto' }, 0)

        if (label) {
          tl.to(label, { y: -(h + 8), duration: 2, ease, overwrite: 'auto' }, 0)
        }

        if (white) {
          gsap.set(white, { y: Math.ceil(h + 100), opacity: 0 })
          tl.to(white, { y: 0, opacity: 1, duration: 2, ease, overwrite: 'auto' }, 0)
        }

        tlRefs.current[index] = tl
      })
    }

    layout()

    const onResize = () => layout()
    window.addEventListener('resize', onResize)

    if (typeof document !== 'undefined' && document.fonts) {
      document.fonts.ready.then(layout).catch(() => {})
    }

    const menu = mobileMenuRef.current
    if (menu) {
      gsap.set(menu, { visibility: 'hidden', opacity: 0, scaleY: 1, y: 0 })
    }

    return () => window.removeEventListener('resize', onResize)
  }, [items, ease])

  const handleEnter = (i: number) => {
    const tl = tlRefs.current[i]
    if (!tl) return
    activeTweenRefs.current[i]?.kill()
    activeTweenRefs.current[i] = tl.tweenTo(tl.duration(), {
      duration: 0.3,
      ease,
      overwrite: 'auto',
    })
  }

  const handleLeave = (i: number) => {
    const tl = tlRefs.current[i]
    if (!tl) return
    activeTweenRefs.current[i]?.kill()
    activeTweenRefs.current[i] = tl.tweenTo(0, {
      duration: 0.2,
      ease,
      overwrite: 'auto',
    })
  }

  const toggleMobileMenu = () => {
    const newState = !isMobileMenuOpen
    setIsMobileMenuOpen(newState)

    const hamburger = hamburgerRef.current
    const menu = mobileMenuRef.current

    if (hamburger) {
      const lines = hamburger.querySelectorAll('.hamburger-line')
      if (newState) {
        gsap.to(lines[0], { rotation: 45, y: 3, duration: 0.3, ease })
        gsap.to(lines[1], { rotation: -45, y: -3, duration: 0.3, ease })
      } else {
        gsap.to(lines[0], { rotation: 0, y: 0, duration: 0.3, ease })
        gsap.to(lines[1], { rotation: 0, y: 0, duration: 0.3, ease })
      }
    }

    if (menu) {
      if (newState) {
        gsap.set(menu, { visibility: 'visible' })
        gsap.fromTo(
          menu,
          { opacity: 0, y: 10, scaleY: 1 },
          {
            opacity: 1,
            y: 0,
            scaleY: 1,
            duration: 0.3,
            ease,
            transformOrigin: 'top center',
          }
        )
      } else {
        gsap.to(menu, {
          opacity: 0,
          y: 10,
          scaleY: 1,
          duration: 0.2,
          ease,
          transformOrigin: 'top center',
          onComplete: () => {
            gsap.set(menu, { visibility: 'hidden' })
          },
        })
      }
    }

    onMobileMenuClick?.()
  }

  const isExternalLink = (href: string) =>
    href.startsWith('http://') ||
    href.startsWith('https://') ||
    href.startsWith('//') ||
    href.startsWith('mailto:') ||
    href.startsWith('tel:')

  const cssVars = {
    ['--base']: baseColor,
    ['--pill-bg']: pillColor,
    ['--hover-text']: hoveredPillTextColor,
    ['--pill-text']: resolvedPillTextColor,
    ['--nav-h']: '42px',
    ['--pill-pad-x']: '18px',
    ['--pill-gap']: '4px',
  } as React.CSSProperties

  return (
    <div className="relative z-[1000] w-full md:w-auto">
      <nav
        className={`w-full md:w-max flex items-center justify-between md:justify-start box-border ${className}`}
        aria-label="Primary"
        style={cssVars}
      >
        {/* Optional Brand Logo if provided */}
        {logo && (
          <Link
            href="/"
            aria-label="Home"
            ref={logoRef}
            className="flex items-center justify-center transition-all duration-300 hover:scale-105 active:scale-95 shrink-0 mr-3"
          >
            <img
              src={logo}
              alt={logoAlt}
              ref={logoImgRef}
              className="h-7 sm:h-8 w-auto object-contain block"
            />
          </Link>
        )}

        {/* Desktop Nav Items Pills */}
        <div
          ref={navItemsRef}
          className="relative items-center rounded-full hidden md:flex shadow-xs border border-white/40 backdrop-blur-xl bg-white/20 p-[3px]"
          style={{
            height: 'var(--nav-h)',
          }}
        >
          <ul
            role="menubar"
            className="list-none flex items-stretch m-0 p-0 h-full"
            style={{ gap: 'var(--pill-gap)' }}
          >
            {items.map((item, i) => {
              const isActive = activeHref === item.href

              const pillStyle: React.CSSProperties = {
                background: 'var(--pill-bg)',
                color: 'var(--pill-text, #0F172A)',
                paddingLeft: 'var(--pill-pad-x)',
                paddingRight: 'var(--pill-pad-x)',
              }

              const PillContent = (
                <>
                  <span
                    className="hover-circle absolute left-1/2 bottom-0 rounded-full z-[1] block pointer-events-none"
                    style={{
                      background: 'var(--base, #00A884)',
                      willChange: 'transform',
                    }}
                    aria-hidden="true"
                    ref={(el) => {
                      circleRefs.current[i] = el
                    }}
                  />
                  <span className="label-stack relative inline-block leading-[1] z-[2]">
                    <span
                      className="pill-label relative z-[2] inline-block leading-[1]"
                      style={{ willChange: 'transform' }}
                    >
                      {item.label}
                    </span>
                    <span
                      className="pill-label-hover absolute left-0 top-0 z-[3] inline-block"
                      style={{
                        color: 'var(--hover-text, #fff)',
                        willChange: 'transform, opacity',
                      }}
                      aria-hidden="true"
                    >
                      {item.label}
                    </span>
                  </span>
                  {isActive && (
                    <span
                      className="absolute left-1/2 -bottom-[5px] -translate-x-1/2 w-1.5 h-1.5 rounded-full z-[4]"
                      style={{ background: 'var(--base, #00A884)' }}
                      aria-hidden="true"
                    />
                  )}
                </>
              )

              const basePillClasses =
                'relative overflow-hidden inline-flex items-center justify-center h-full no-underline rounded-full box-border font-semibold text-xs uppercase tracking-[0.3px] whitespace-nowrap cursor-pointer px-0 font-sora shadow-2xs border border-white/40 backdrop-blur-md transition-all duration-200 hover:shadow-sm'

              return (
                <li key={item.href} role="none" className="flex h-full">
                  {isExternalLink(item.href) ? (
                    <a
                      role="menuitem"
                      href={item.href}
                      className={basePillClasses}
                      style={pillStyle}
                      aria-label={item.ariaLabel || item.label}
                      onMouseEnter={() => handleEnter(i)}
                      onMouseLeave={() => handleLeave(i)}
                    >
                      {PillContent}
                    </a>
                  ) : (
                    <Link
                      role="menuitem"
                      href={item.href}
                      className={basePillClasses}
                      style={pillStyle}
                      aria-label={item.ariaLabel || item.label}
                      onMouseEnter={() => handleEnter(i)}
                      onMouseLeave={() => handleLeave(i)}
                    >
                      {PillContent}
                    </Link>
                  )}
                </li>
              )
            })}
          </ul>
        </div>

        {/* Mobile Hamburger Button */}
        <button
          ref={hamburgerRef}
          onClick={toggleMobileMenu}
          aria-label="Toggle menu"
          aria-expanded={isMobileMenuOpen}
          className="md:hidden rounded-full border border-white/60 flex flex-col items-center justify-center gap-1 cursor-pointer p-0 relative shadow-sm bg-white/70 backdrop-blur-md"
          style={{
            width: 'var(--nav-h)',
            height: 'var(--nav-h)',
          }}
        >
          <span
            className="hamburger-line w-4 h-0.5 rounded origin-center transition-all duration-100 ease-[cubic-bezier(0.25,0.1,0.25,1)]"
            style={{ background: '#0F172A' }}
          />
          <span
            className="hamburger-line w-4 h-0.5 rounded origin-center transition-all duration-100 ease-[cubic-bezier(0.25,0.1,0.25,1)]"
            style={{ background: '#0F172A' }}
          />
        </button>
      </nav>

      {/* Mobile Menu Dropdown (Frosted Glass) */}
      <div
        ref={mobileMenuRef}
        className="md:hidden absolute top-[3.4em] left-0 right-0 rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.12)] z-[998] origin-top border border-white/70 backdrop-blur-2xl bg-white/85 p-2"
      >
        <ul className="list-none m-0 p-1 flex flex-col gap-1.5 font-sora">
          {items.map((item) => {
            const defaultStyle: React.CSSProperties = {
              background: 'rgba(255, 255, 255, 0.75)',
              color: '#0F172A',
            }
            const hoverIn = (e: React.MouseEvent<HTMLAnchorElement>) => {
              e.currentTarget.style.background = 'var(--base, #00A884)'
              e.currentTarget.style.color = '#FFFFFF'
            }
            const hoverOut = (e: React.MouseEvent<HTMLAnchorElement>) => {
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.75)'
              e.currentTarget.style.color = '#0F172A'
            }

            const linkClasses =
              'block py-3 px-4 text-xs font-semibold rounded-2xl transition-all duration-200 ease-out border border-white/50 backdrop-blur-md'

            return (
              <li key={item.href}>
                {isExternalLink(item.href) ? (
                  <a
                    href={item.href}
                    className={linkClasses}
                    style={defaultStyle}
                    onMouseEnter={hoverIn}
                    onMouseLeave={hoverOut}
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    {item.label}
                  </a>
                ) : (
                  <Link
                    href={item.href}
                    className={linkClasses}
                    style={defaultStyle}
                    onMouseEnter={hoverIn}
                    onMouseLeave={hoverOut}
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    {item.label}
                  </Link>
                )}
              </li>
            )
          })}
        </ul>
      </div>
    </div>
  )
}

export default PillNav
