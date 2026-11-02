'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { X } from 'lucide-react'

export default function LegalNavbar() {
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <header className="w-full bg-white border-b border-slate-100 sticky top-0 z-50">
      <div className="max-w-6xl mx-auto px-4.5 sm:px-6 md:px-8 py-3.5 sm:py-5 flex items-center justify-between">
        {/* Left: Brand Logo */}
        <Link href="/" className="flex items-center gap-2 group" aria-label="8Liv Home">
          <img
            src="/brand-logo-official.png"
            alt="8Liv"
            className="h-7 sm:h-8 w-auto object-contain block transition-transform group-hover:scale-105"
          />
        </Link>

        {/* Right: GET STARTED button + Hamburger */}
        <div className="flex items-center gap-2.5 sm:gap-4">
          <Link
            href="/assessment"
            className="px-4.5 sm:px-6 py-2.5 rounded-full bg-[#18181B] hover:bg-black text-white text-xs sm:text-xs font-bold tracking-wider uppercase transition-all shadow-xs"
          >
            Get Started
          </Link>

          <button
            type="button"
            onClick={() => setMenuOpen(!menuOpen)}
            className="p-2 text-slate-900 hover:text-slate-600 focus:outline-none transition-colors"
            aria-label={menuOpen ? 'Close menu' : 'Open menu'}
          >
            {menuOpen ? (
              <X className="w-5 h-5" />
            ) : (
              <div className="w-5 flex flex-col gap-1 items-end">
                <span className="h-[2px] w-5 bg-slate-900 rounded-full" />
                <span className="h-[2px] w-4 bg-slate-900 rounded-full" />
              </div>
            )}
          </button>
        </div>
      </div>

      {/* Mobile / Dropdown Menu */}
      {menuOpen && (
        <div className="bg-white border-b border-slate-200 px-6 py-6 shadow-lg animate-in fade-in slide-in-from-top-2 duration-150">
          <div className="max-w-6xl mx-auto flex flex-col space-y-4">
            <Link
              href="/"
              onClick={() => setMenuOpen(false)}
              className="text-base font-semibold text-slate-800 hover:text-[#00A884] transition-colors"
            >
              Home
            </Link>
            <Link
              href="/#pricing"
              onClick={() => setMenuOpen(false)}
              className="text-base font-semibold text-slate-800 hover:text-[#00A884] transition-colors"
            >
              Doctor Care Plans
            </Link>
            <Link
              href="/assessment"
              onClick={() => setMenuOpen(false)}
              className="text-base font-semibold text-slate-800 hover:text-[#00A884] transition-colors"
            >
              Clinical Assessment
            </Link>
            <Link
              href="/login"
              onClick={() => setMenuOpen(false)}
              className="text-base font-semibold text-slate-800 hover:text-[#00A884] transition-colors"
            >
              Log In
            </Link>
            <div className="pt-3 border-t border-slate-100 flex flex-wrap gap-4 text-sm text-slate-500">
              <Link href="/terms" onClick={() => setMenuOpen(false)} className="hover:text-slate-900">
                Terms and Conditions
              </Link>
              <Link href="/privacy" onClick={() => setMenuOpen(false)} className="hover:text-slate-900">
                Privacy Policy
              </Link>
              <Link href="/prescription-policy" onClick={() => setMenuOpen(false)} className="hover:text-slate-900">
                Prescription Policy
              </Link>
            </div>
          </div>
        </div>
      )}
    </header>
  )
}

