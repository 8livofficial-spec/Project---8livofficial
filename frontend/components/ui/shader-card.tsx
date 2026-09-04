'use client'

import React, { useRef, useEffect, useState } from 'react'
import { cn } from '@/lib/utils'

export interface ShaderCardProps {
  children?: React.ReactNode
  className?: string
  colorTheme?: 'emerald' | 'amber' | 'slate' | 'silver' | 'gold' | 'custom'
  customColors?: [string, string, string]
  speed?: number
}

export function ShaderCard({
  children,
  className,
  colorTheme = 'slate',
  customColors,
  speed = 0.005
}: ShaderCardProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const mousePosRef = useRef({ x: 0.5, y: 0.5 })
  const isVisibleRef = useRef(false)

  useEffect(() => {
    const canvas = canvasRef.current
    const container = containerRef.current
    if (!canvas || !container) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let animationFrameId: number
    let time = 0

    // Theme color presets
    let colors = ['#0F172A', '#1E293B', '#334155']
    if (colorTheme === 'emerald') {
      colors = ['#064E3B', '#065F46', '#059669']
    } else if (colorTheme === 'amber' || colorTheme === 'gold') {
      colors = ['#451A03', '#92400E', '#F59E0B']
    } else if (colorTheme === 'slate' || colorTheme === 'silver') {
      colors = ['#0F172A', '#1E293B', '#334155']
    }
    if (customColors) colors = customColors

    const resizeCanvas = () => {
      if (!canvas || !container) return
      const rect = container.getBoundingClientRect()
      if (rect.width > 0 && rect.height > 0) {
        canvas.width = Math.min(rect.width, 800)
        canvas.height = Math.min(rect.height, 800)
      }
    }

    resizeCanvas()
    window.addEventListener('resize', resizeCanvas)

    // IntersectionObserver to pause loop when offscreen
    const observer = new IntersectionObserver(
      ([entry]) => {
        isVisibleRef.current = entry.isIntersecting
        if (entry.isIntersecting && !animationFrameId) {
          render()
        }
      },
      { threshold: 0.05 }
    )
    observer.observe(container)

    const render = () => {
      if (!isVisibleRef.current) {
        animationFrameId = 0
        return
      }

      time += speed
      const w = canvas.width
      const h = canvas.height

      if (w > 0 && h > 0) {
        const mouse = mousePosRef.current
        const centerX = w * (0.3 + 0.4 * mouse.x + 0.1 * Math.sin(time * 1.5))
        const centerY = h * (0.3 + 0.4 * mouse.y + 0.1 * Math.cos(time * 1.2))

        const grad = ctx.createRadialGradient(
          centerX,
          centerY,
          10,
          centerX,
          centerY,
          Math.max(w, h) * 0.95
        )

        grad.addColorStop(0, colors[2])
        grad.addColorStop(0.5, colors[1])
        grad.addColorStop(1, colors[0])

        ctx.fillStyle = grad
        ctx.fillRect(0, 0, w, h)

        ctx.save()
        ctx.globalCompositeOperation = 'screen'
        ctx.strokeStyle = (colorTheme === 'amber' || colorTheme === 'gold')
          ? 'rgba(245, 158, 11, 0.18)'
          : colorTheme === 'emerald'
            ? 'rgba(16, 185, 129, 0.20)'
            : 'rgba(148, 163, 184, 0.15)'
        ctx.lineWidth = 2.5

        ctx.beginPath()
        for (let x = 0; x <= w; x += 24) {
          const y = h / 2 + Math.sin(x * 0.01 + time * 3) * 35 + Math.cos(x * 0.02 + time * 2) * 20
          if (x === 0) ctx.moveTo(x, y)
          else ctx.lineTo(x, y)
        }
        ctx.stroke()
        ctx.restore()
      }

      animationFrameId = requestAnimationFrame(render)
    }

    render()

    return () => {
      window.removeEventListener('resize', resizeCanvas)
      observer.disconnect()
      if (animationFrameId) cancelAnimationFrame(animationFrameId)
    }
  }, [colorTheme, customColors, speed])

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current) return
    const rect = containerRef.current.getBoundingClientRect()
    mousePosRef.current = {
      x: (e.clientX - rect.left) / rect.width,
      y: (e.clientY - rect.top) / rect.height
    }
  }

  return (
    <div
      ref={containerRef}
      onMouseMove={handleMouseMove}
      className={cn(
        'relative overflow-hidden rounded-[2.5rem] border shadow-2xl transition-all duration-500 group',
        colorTheme === 'emerald'
          ? 'border-emerald-500/30 hover:border-emerald-400/70 shadow-emerald-950/20'
          : (colorTheme === 'amber' || colorTheme === 'gold')
            ? 'border-amber-500/40 hover:border-amber-400/80 shadow-amber-950/30'
            : 'border-slate-700/50 hover:border-blue-400/60 shadow-slate-950/40',
        className
      )}
    >
      {/* Animated Canvas Shader */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full pointer-events-none -z-10 transition-opacity duration-700 opacity-90 group-hover:opacity-100"
      />

      {/* Ambient Lighting Orbs */}
      <div
        className={cn(
          'absolute -top-24 -right-24 w-64 h-64 rounded-full blur-3xl pointer-events-none -z-10 transition-transform duration-700 group-hover:scale-125',
          colorTheme === 'emerald'
            ? 'bg-emerald-500/20'
            : (colorTheme === 'amber' || colorTheme === 'gold')
              ? 'bg-amber-500/20'
              : 'bg-blue-500/20'
        )}
      />

      {/* Card Content Overlay */}
      <div className="relative z-10 h-full">{children}</div>
    </div>
  )
}

export default ShaderCard
