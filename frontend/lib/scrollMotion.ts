/**
 * 8Liv V4 Global Scroll Experience / Motion Director Engine
 *
 * Cinematic Camera System, Spatial Card Decks, Depth Stacks,
 * Section Transitions, and Full-Bleed Story Transformations.
 *
 * All functions operate strictly within `gsap.context()` for React/Next.js cleanup,
 * support 100% reversible scrubbed scrolling, and respect `prefers-reduced-motion`.
 */

import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

if (typeof window !== 'undefined') {
  gsap.registerPlugin(ScrollTrigger)
}

export const prefersReducedMotion = () =>
  typeof window !== 'undefined' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches

// ==================================================================
// 01. VIRTUAL SCROLL CAMERA SYSTEM
// ==================================================================
export interface CameraLayers {
  background?: HTMLElement | null
  midground?: HTMLElement | null
  card?: HTMLElement | null
  foreground?: HTMLElement | null
  typography?: HTMLElement | null
}

export function setupCameraLayers(
  tl: gsap.core.Timeline,
  layers: CameraLayers,
  options: {
    duration?: number
    panX?: number // Camera pan: -2% to +2%
    pushScale?: number // Camera push: 1.0 to 1.05
  } = {}
) {
  if (prefersReducedMotion()) return

  const { duration = 1, pushScale = 1.04 } = options

  if (layers.background) {
    tl.fromTo(layers.background, { y: '-6%', scale: 1.0 }, { y: '6%', scale: pushScale, ease: 'none', duration }, 0)
  }
  if (layers.midground) {
    tl.fromTo(layers.midground, { y: '10px' }, { y: '-15px', ease: 'none', duration }, 0)
  }
  if (layers.card) {
    tl.fromTo(layers.card, { y: '20px' }, { y: '-30px', ease: 'none', duration }, 0)
  }
  if (layers.foreground) {
    tl.fromTo(layers.foreground, { y: '30px' }, { y: '-45px', ease: 'none', duration }, 0)
  }
  if (layers.typography) {
    tl.fromTo(layers.typography, { y: '40px' }, { y: '-60px', ease: 'none', duration }, 0)
  }
}

// ==================================================================
// 02. SECTION TO SECTION CAMERA TRANSITION
// ==================================================================
export function animateSectionTransition(
  outgoingSection: HTMLElement,
  incomingSection: HTMLElement,
  options: {
    scaleOut?: number
    yOut?: number | string
    yInFrom?: number | string
    opacityInFrom?: number
    scrub?: number | boolean
  } = {}
) {
  if (prefersReducedMotion()) return

  const {
    scaleOut = 0.96,
    yOut = '-60px',
    yInFrom = '120px',
    opacityInFrom = 0.5,
    scrub = 1.2,
  } = options

  const tl = gsap.timeline({
    scrollTrigger: {
      trigger: outgoingSection,
      start: 'bottom 90%',
      end: 'bottom 10%',
      scrub: scrub,
    },
  })

  tl.to(outgoingSection, {
    scale: scaleOut,
    y: yOut,
    opacity: 0.85,
    ease: 'power2.inOut',
  }, 0)

  tl.fromTo(incomingSection, 
    { y: yInFrom, opacity: opacityInFrom },
    { y: '0px', opacity: 1, ease: 'power2.out' },
    0
  )
}

// ==================================================================
// 03. CARD ENTERS FROM DEPTH & MOVES TOWARD USER
// ==================================================================
export function createCardDepthTransition(
  tl: gsap.core.Timeline,
  card: HTMLElement,
  options: {
    fromZ?: number
    toZ?: number
    fromScale?: number
    toScale?: number
    fromOpacity?: number
    toOpacity?: number
    position?: number | string
    duration?: number
  } = {}
) {
  if (prefersReducedMotion()) return

  const {
    fromZ = -250,
    toZ = 30,
    fromScale = 0.8,
    toScale = 1.02,
    fromOpacity = 0.25,
    toOpacity = 1,
    position = 0,
    duration = 1,
  } = options

  tl.fromTo(
    card,
    {
      z: fromZ,
      scale: fromScale,
      opacity: fromOpacity,
      filter: 'blur(3px)',
      transformPerspective: 1200,
    },
    {
      z: toZ,
      scale: toScale,
      opacity: toOpacity,
      filter: 'blur(0px)',
      duration,
      ease: 'power2.out',
    },
    position
  )
}

// ==================================================================
// 04. CARD PEEL & ROTATION TRANSITION
// ==================================================================
export function createCardPeel(
  tl: gsap.core.Timeline,
  oldCard: HTMLElement,
  newCard: HTMLElement,
  options: {
    position?: number | string
    duration?: number
    oldRotY?: number
    newRotY?: number
  } = {}
) {
  if (prefersReducedMotion()) return

  const { position = 0, duration = 1, oldRotY = -9, newRotY = 9 } = options

  // Old card peels away into background depth
  tl.to(
    oldCard,
    {
      rotationY: oldRotY,
      x: -60,
      z: -120,
      scale: 0.91,
      opacity: 0.35,
      filter: 'blur(2.5px)',
      duration,
      ease: 'power2.inOut',
    },
    position
  )

  // New card sweeps forward from right depth
  tl.fromTo(
    newCard,
    {
      rotationY: newRotY,
      x: 75,
      z: -150,
      scale: 0.90,
      opacity: 0.2,
      filter: 'blur(3px)',
      transformPerspective: 1200,
    },
    {
      rotationY: 0,
      x: 0,
      z: 30,
      scale: 1.02,
      opacity: 1,
      filter: 'blur(0px)',
      duration,
      ease: 'power3.out',
    },
    position
  )
}

// ==================================================================
// 05. IMAGE ZOOM THROUGH & DIRECTIONAL DRIFT
// ==================================================================
export function createImageZoomThrough(
  tl: gsap.core.Timeline,
  imageEl: HTMLElement,
  options: {
    direction?: 'up' | 'down' | 'left' | 'right'
    amount?: number
    scaleFrom?: number
    scaleTo?: number
    position?: number | string
    duration?: number
  } = {}
) {
  if (prefersReducedMotion()) return

  const {
    direction = 'up',
    amount = 8,
    scaleFrom = 1.02,
    scaleTo = 1.15,
    position = 0,
    duration = 1,
  } = options

  const fromProps: Record<string, string | number> = { scale: scaleFrom }
  const toProps: Record<string, string | number> = { scale: scaleTo, ease: 'none', duration }

  if (direction === 'up') {
    fromProps.y = `${amount}%`
    toProps.y = `-${amount}%`
  } else if (direction === 'down') {
    fromProps.y = `-${amount}%`
    toProps.y = `${amount}%`
  } else if (direction === 'left') {
    fromProps.x = `${amount}%`
    toProps.x = `-${amount}%`
  } else if (direction === 'right') {
    fromProps.x = `-${amount}%`
    toProps.x = `${amount}%`
  }

  tl.fromTo(imageEl, fromProps, toProps, position)
}

// ==================================================================
// 06. FULL-BLEED / FULLSCREEN CARD EXPANSION
// ==================================================================
export function createFullscreenTakeover(
  tl: gsap.core.Timeline,
  card: HTMLElement,
  options: {
    scaleTo?: number
    position?: number | string
    duration?: number
  } = {}
) {
  if (prefersReducedMotion()) return

  const { scaleTo = 1.03, position = 0, duration = 1 } = options

  tl.to(
    card,
    {
      scale: scaleTo,
      duration,
      ease: 'power2.out',
    },
    position
  )
}

// ==================================================================
// 07. LARGE STATEMENT WATERMARK MOVEMENT
// ==================================================================
export function animateLargeTypography(
  textEl: Element,
  trigger: Element,
  options: {
    xStart?: string
    xEnd?: string
    start?: string
    end?: string
  } = {}
) {
  if (prefersReducedMotion()) return

  const {
    xStart = '12%',
    xEnd = '-25%',
    start = 'top bottom',
    end = 'bottom top',
  } = options

  gsap.fromTo(
    textEl,
    { x: xStart, opacity: 0.15 },
    {
      x: xEnd,
      opacity: 0.35,
      ease: 'none',
      scrollTrigger: {
        trigger,
        start,
        end,
        scrub: 1.8,
      },
    }
  )
}

// ==================================================================
// 08. SECTION BACKGROUND COLOR INTERPOLATION
// ==================================================================
export function animateSectionColorTransform(
  target: Element,
  colors: [string, string],
  trigger: Element,
  options: { start?: string; end?: string } = {}
) {
  if (prefersReducedMotion()) return

  const { start = 'top center', end = 'bottom center' } = options

  gsap.fromTo(
    target,
    { backgroundColor: colors[0] },
    {
      backgroundColor: colors[1],
      ease: 'none',
      scrollTrigger: {
        trigger,
        start,
        end,
        scrub: 2,
      },
    }
  )
}

// ==================================================================
// 09. CARD ORBIT ENTRANCE (Curved Trajectory)
// ==================================================================
export function animateCardOrbit(
  target: Element,
  trigger: Element,
  options: {
    direction?: 'left' | 'right'
    start?: string
    delay?: number
  } = {}
) {
  if (prefersReducedMotion()) return

  const { direction = 'right', start = 'top 84%', delay = 0 } = options
  const xOffset = direction === 'right' ? 120 : -120
  const rotZ = direction === 'right' ? 3.5 : -3.5

  gsap.fromTo(
    target,
    {
      x: xOffset,
      y: 65,
      rotationZ: rotZ,
      scale: 0.90,
      opacity: 0,
      transformPerspective: 1200,
    },
    {
      x: 0,
      y: 0,
      rotationZ: 0,
      scale: 1,
      opacity: 1,
      duration: 1.0,
      delay,
      ease: 'power3.out',
      scrollTrigger: {
        trigger,
        start,
        once: true,
      },
    }
  )
}

// ==================================================================
// 10. DIRECTIONAL IMAGE PARALLAX HELPER
// ==================================================================
export function animateImageDepthWindow(
  imageEl: Element,
  trigger: Element,
  options: {
    direction?: 'up' | 'down' | 'left' | 'right'
    amount?: number
    scaleFrom?: number
    scaleTo?: number
    start?: string
    end?: string
  } = {}
) {
  if (prefersReducedMotion()) return

  const {
    direction = 'up',
    amount = 8,
    scaleFrom = 1.02,
    scaleTo = 1.14,
    start = 'top bottom',
    end = 'bottom top',
  } = options

  const fromProp: Record<string, string | number> = { scale: scaleFrom }
  const toProp: Record<string, string | number> = { scale: scaleTo, ease: 'none' }

  if (direction === 'up') {
    fromProp.y = `${amount}%`
    toProp.y = `-${amount}%`
  } else if (direction === 'down') {
    fromProp.y = `-${amount}%`
    toProp.y = `${amount}%`
  } else if (direction === 'left') {
    fromProp.x = `${amount}%`
    toProp.x = `-${amount}%`
  } else if (direction === 'right') {
    fromProp.x = `-${amount}%`
    toProp.x = `${amount}%`
  }

  gsap.fromTo(imageEl, fromProp, {
    ...toProp,
    scrollTrigger: {
      trigger,
      start,
      end,
      scrub: 1.5,
    },
  })
}

// ==================================================================
// 11. CARD PHYSICS ENTRANCE HELPER
// ==================================================================
export function animateCardPhysics(
  targets: gsap.TweenTarget,
  trigger: Element,
  options: {
    x?: number
    y?: number
    rotationY?: number
    rotationX?: number
    scale?: number
    stagger?: number
    start?: string
    delay?: number
  } = {}
) {
  if (prefersReducedMotion()) return

  const {
    x = 90,
    y = 50,
    rotationY = 8,
    rotationX = 3,
    scale = 0.9,
    stagger = 0.12,
    start = 'top 82%',
    delay = 0,
  } = options

  gsap.fromTo(
    targets,
    {
      x,
      y,
      rotationY,
      rotationX,
      scale,
      opacity: 0,
      transformPerspective: 1200,
      transformOrigin: 'center bottom',
    },
    {
      x: 0,
      y: 0,
      rotationY: 0,
      rotationX: 0,
      scale: 1,
      opacity: 1,
      duration: 0.95,
      delay,
      stagger,
      ease: 'power3.out',
      scrollTrigger: {
        trigger,
        start,
        once: true,
      },
    }
  )
}

