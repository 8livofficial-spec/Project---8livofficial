'use client'

import React, { type ReactNode, type ButtonHTMLAttributes } from 'react'

interface TextureButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode
  variant?: 'primary' | 'secondary'
}

export function TextureButton({ children, variant = 'primary', className = '', ...props }: TextureButtonProps) {
  const base =
    'inline-flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold transition-all duration-150 w-full justify-center cursor-pointer'
  const styles = {
    primary:
      'bg-white/15 text-white hover:bg-white/25 shadow-[0px_1px_1px_rgba(0,0,0,0.2),inset_0px_1px_0px_rgba(255,255,255,0.15)]',
    secondary:
      'bg-black/10 text-slate-700 hover:bg-black/15 shadow-[0px_1px_1px_rgba(0,0,0,0.08),inset_0px_1px_0px_rgba(255,255,255,0.5)]',
  }

  return (
    <button className={`${base} ${styles[variant]} ${className}`} {...props}>
      {children}
    </button>
  )
}
