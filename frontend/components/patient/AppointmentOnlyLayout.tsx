'use client'

import React from 'react'

export default function AppointmentOnlyLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#F5F0EB] text-[#1A1F36] font-sans">
      <header className="border-b border-[#1A1F36]/8 bg-white/85 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.2em] text-[#C4622D]">8Liv Consultation</p>
            <h1 className="mt-1 text-lg font-bold">Appointment Details</h1>
          </div>
          <span className="rounded-full bg-[#1A1F36]/5 px-3 py-1 text-xs font-bold uppercase tracking-wider text-[#8896A4]">
            Dashboard Locked
          </span>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
        {children}
      </main>
    </div>
  )
}
