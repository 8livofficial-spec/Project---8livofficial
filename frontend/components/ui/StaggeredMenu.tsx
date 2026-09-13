'use client'

import React, { useRef, useEffect, useState } from 'react'
import gsap from 'gsap'
import Link from 'next/link'

interface MenuItem {
  label: string
  ariaLabel?: string
  link: string
  onClick?: () => void
}

interface SocialItem {
  label: string
  link: string
}

interface StaggeredMenuProps {
  isOpen: boolean
  onClose: () => void
  menuItems: MenuItem[]
  socialItems?: SocialItem[]
  position?: 'left' | 'right'
  accentColor?: string
}

export default function StaggeredMenu({
  isOpen,
  onClose,
  menuItems,
  socialItems = [],
  position = 'right',
  accentColor = '#00A884',
}: StaggeredMenuProps) {
  const overlayRef = useRef<HTMLDivElement>(null)
  const itemsRef = useRef<(HTMLElement | null)[]>([])
  const socialRef = useRef<(HTMLElement | null)[]>([])
  const bgRef = useRef<HTMLDivElement>(null)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!mounted) return

    const overlay = overlayRef.current
    const bg = bgRef.current
    const items = itemsRef.current.filter(Boolean)
    const socials = socialRef.current.filter(Boolean)

    if (!overlay || !bg) return

    if (isOpen) {
      document.body.style.overflow = 'hidden'

      gsap.set(overlay, { display: 'flex' })
      
      gsap.fromTo(bg,
        { scaleY: 0, transformOrigin: 'top' },
        { scaleY: 1, duration: 0.45, ease: 'power3.out' }
      )

      gsap.fromTo(items,
        { y: 60, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: 0.5,
          stagger: 0.07,
          ease: 'power3.out',
          delay: 0.15,
        }
      )

      if (socials.length > 0) {
        gsap.fromTo(socials,
          { y: 20, opacity: 0 },
          {
            y: 0,
            opacity: 1,
            duration: 0.4,
            stagger: 0.05,
            ease: 'power2.out',
            delay: 0.35,
          }
        )
      }
    } else {
      document.body.style.overflow = ''

      const tl = gsap.timeline({
        onComplete: () => {
          gsap.set(overlay, { display: 'none' })
        }
      })

      tl.to([...items, ...socials].filter(Boolean), {
        y: -30,
        opacity: 0,
        duration: 0.25,
        stagger: 0.04,
        ease: 'power2.in',
      })
      .to(bg, {
        scaleY: 0,
        transformOrigin: 'top',
        duration: 0.35,
        ease: 'power3.in',
      }, '-=0.1')
    }

    return () => {
      document.body.style.overflow = ''
    }
  }, [isOpen, mounted])

  if (!mounted) return null

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-[9999]"
      style={{ display: 'none' }}
    >
      <div
        className="absolute inset-0 bg-black/20"
        onClick={onClose}
      />

      <div
        ref={bgRef}
        className={`absolute top-0 ${position === 'left' ? 'left-0' : 'right-0'} h-full w-[min(380px,90vw)] bg-[#0a0a0a] flex flex-col px-8 py-10 shadow-2xl overflow-y-auto`}
        style={{ transformOrigin: 'top' }}
      >
        <button
          onClick={onClose}
          aria-label="Close menu"
          className="self-end mb-10 w-10 h-10 flex items-center justify-center rounded-full border border-white/20 text-white/70 hover:text-white hover:border-white/40 transition-colors cursor-pointer"
        >
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M1 1L17 17M17 1L1 17" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
          </svg>
        </button>

        <nav className="flex flex-col gap-2 flex-1">
          {menuItems.map((item, i) => (
            <div
              key={item.label}
              ref={(el) => { itemsRef.current[i] = el }}
            >
              <Link
                href={item.link}
                aria-label={item.ariaLabel}
                onClick={() => {
                  item.onClick?.()
                  onClose()
                }}
                className="group flex items-center justify-between py-4 border-b border-white/10 text-white text-2xl font-light tracking-tight hover:pl-2 transition-all duration-200"
              >
                <span className="group-hover:text-white/80 transition-colors">{item.label}</span>
                <svg
                  className="opacity-0 group-hover:opacity-100 transition-opacity"
                  width="20"
                  height="20"
                  viewBox="0 0 20 20"
                  fill="none"
                >
                  <path d="M4 10H16M16 10L10 4M16 10L10 16" stroke={accentColor} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </Link>
            </div>
          ))}
        </nav>

        {socialItems.length > 0 && (
          <div className="mt-10 pt-6 border-t border-white/10">
            <p className="text-[11px] uppercase tracking-widest text-white/30 mb-4">Follow Us</p>
            <div className="flex flex-wrap gap-4">
              {socialItems.map((item, i) => (
                <a
                  key={item.label}
                  href={item.link}
                  ref={(el) => { socialRef.current[i] = el }}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-white/50 hover:text-white transition-colors"
                >
                  {item.label}
                </a>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
