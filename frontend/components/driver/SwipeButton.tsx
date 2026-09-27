'use client'

import React, { useState, useRef, useEffect } from 'react'
import { ChevronRight, Check, Loader2 } from 'lucide-react'

interface SwipeButtonProps {
  label: string
  successLabel?: string
  onConfirm: () => Promise<void> | void
  disabled?: boolean
  loading?: boolean
  className?: string
}

export default function SwipeButton({
  label,
  successLabel = 'Completed!',
  onConfirm,
  disabled = false,
  loading = false,
  className = '',
}: SwipeButtonProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [dragX, setDragX] = useState(0)
  const [isDragging, setIsDragging] = useState(false)
  const [isConfirmed, setIsConfirmed] = useState(false)
  const [maxDrag, setMaxDrag] = useState(250)

  useEffect(() => {
    if (containerRef.current) {
      const containerWidth = containerRef.current.clientWidth
      const handleWidth = 56 // 3.5rem / 56px handle
      setMaxDrag(Math.max(containerWidth - handleWidth - 8, 100))
    }
  }, [])

  const handleTouchStart = (e: React.TouchEvent | React.MouseEvent) => {
    if (disabled || loading || isConfirmed) return
    setIsDragging(true)
  }

  const handleTouchMove = (e: TouchEvent | MouseEvent) => {
    if (!isDragging || disabled || loading || isConfirmed) return

    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX
    if (!containerRef.current) return

    const rect = containerRef.current.getBoundingClientRect()
    const relativeX = clientX - rect.left - 28 // Center on handle
    const clampedX = Math.max(0, Math.min(relativeX, maxDrag))
    setDragX(clampedX)
  }

  const handleTouchEnd = async () => {
    if (!isDragging) return
    setIsDragging(false)

    // Trigger threshold: 80% of max drag
    if (dragX >= maxDrag * 0.8) {
      setDragX(maxDrag)
      setIsConfirmed(true)
      if (typeof window !== 'undefined' && 'vibrate' in navigator) {
        try {
          navigator.vibrate([40, 60, 80])
        } catch {}
      }
      try {
        await onConfirm()
      } catch {
        // Reset on failure
        setIsConfirmed(false)
        setDragX(0)
      }
    } else {
      // Snap back
      setDragX(0)
    }
  }

  useEffect(() => {
    const onMove = (e: MouseEvent) => handleTouchMove(e)
    const onUp = () => handleTouchEnd()

    if (isDragging) {
      window.addEventListener('mousemove', onMove)
      window.addEventListener('mouseup', onUp)
    }

    return () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
  }, [isDragging, maxDrag, dragX])

  const progressPct = maxDrag > 0 ? (dragX / maxDrag) * 100 : 0

  return (
    <div
      ref={containerRef}
      className={`relative h-14 w-full select-none overflow-hidden rounded-2xl bg-[#1A1F36] p-1 shadow-lg transition-all ${
        disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
      } ${className}`}
      onTouchMove={(e) => {
        const clientX = e.touches[0].clientX
        if (!containerRef.current) return
        const rect = containerRef.current.getBoundingClientRect()
        const clampedX = Math.max(0, Math.min(clientX - rect.left - 28, maxDrag))
        setDragX(clampedX)
      }}
      onTouchEnd={handleTouchEnd}
    >
      {/* Dynamic Progress Fill */}
      <div
        className="absolute inset-y-0 left-0 bg-gradient-to-r from-[#C4622D] to-emerald-500 opacity-90 transition-[width] duration-75"
        style={{ width: `${progressPct}%` }}
      />

      {/* Center Label */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <span className="text-xs font-black uppercase tracking-wider text-white/90">
          {loading ? (
            <span className="flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin text-white" />
              Processing...
            </span>
          ) : isConfirmed ? (
            successLabel
          ) : (
            label
          )}
        </span>
      </div>

      {/* Draggable Swiper Knob */}
      <div
        onMouseDown={handleTouchStart}
        onTouchStart={handleTouchStart}
        className={`relative z-10 flex h-12 w-12 items-center justify-center rounded-xl bg-white text-[#1A1F36] shadow-md transition-transform duration-75 active:scale-95 ${
          isDragging ? 'cursor-grabbing' : 'cursor-grab'
        }`}
        style={{
          transform: `translateX(${dragX}px)`,
          transition: isDragging ? 'none' : 'transform 0.25s cubic-bezier(0.18, 0.89, 0.32, 1.28)',
        }}
      >
        {loading ? (
          <Loader2 className="h-5 w-5 animate-spin text-[#C4622D]" />
        ) : isConfirmed ? (
          <Check className="h-6 w-6 text-emerald-600 stroke-[3]" />
        ) : (
          <ChevronRight className="h-6 w-6 text-[#1A1F36] stroke-[3]" />
        )}
      </div>
    </div>
  )
}
