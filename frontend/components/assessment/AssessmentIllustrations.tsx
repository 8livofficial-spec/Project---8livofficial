'use client'

import React from 'react'

/**
 * Custom SVG Illustrations for the 8Liv Metabolic Assessment Funnel
 * Clean, lightweight, modern clinical-wellness vectors
 */

// 1. Screener Welcome / Metabolic Banner
export function ScreenerWelcomeIllustration({ className = 'w-16 h-16' }: { className?: string }) {
  return (
    <svg viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} aria-hidden="true">
      <rect width="80" height="80" rx="20" fill="#ECFDF5" />
      <circle cx="40" cy="40" r="26" fill="#D1FAE5" />
      {/* Metabolic pulse & scale icon */}
      <path
        d="M26 42H32L36 30L44 50L48 38L52 42H56"
        stroke="#00A884"
        strokeWidth="3.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="40" cy="22" r="4" fill="#00A884" />
      <circle cx="58" cy="28" r="2.5" fill="#34D399" />
      <circle cx="22" cy="54" r="3" fill="#6EE7B7" />
    </svg>
  )
}

// 2. Female Avatar Badge
export function GenderFemaleIllustration({ className = 'w-10 h-10' }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} aria-hidden="true">
      <circle cx="24" cy="24" r="22" fill="#F0FDF4" stroke="#D1FAE5" strokeWidth="1.5" />
      <circle cx="24" cy="18" r="7" fill="#00A884" />
      <path
        d="M13 36C13 30.4772 17.9249 26 24 26C30.0751 26 35 30.4772 35 36"
        stroke="#00A884"
        strokeWidth="3"
        strokeLinecap="round"
      />
      {/* Small subtle bow/sparkle */}
      <circle cx="31" cy="14" r="2" fill="#34D399" />
    </svg>
  )
}

// 3. Male Avatar Badge
export function GenderMaleIllustration({ className = 'w-10 h-10' }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} aria-hidden="true">
      <circle cx="24" cy="24" r="22" fill="#F0FDF4" stroke="#D1FAE5" strokeWidth="1.5" />
      <circle cx="24" cy="18" r="7" fill="#0F766E" />
      <path
        d="M13 36C13 30.4772 17.9249 26 24 26C30.0751 26 35 30.4772 35 36"
        stroke="#0F766E"
        strokeWidth="3"
        strokeLinecap="round"
      />
    </svg>
  )
}

// 4. Age & Longevity Clock
export function AgeIllustration({ className = 'w-12 h-12' }: { className?: string }) {
  return (
    <svg viewBox="0 0 56 56" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} aria-hidden="true">
      <rect width="56" height="56" rx="16" fill="#F8FAFC" />
      <circle cx="28" cy="28" r="18" fill="#F1F5F9" stroke="#CBD5E1" strokeWidth="2" />
      <circle cx="28" cy="28" r="2.5" fill="#0F172A" />
      <path d="M28 17V28L35 32" stroke="#00A884" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M20 12L15 17" stroke="#94A3B8" strokeWidth="2" strokeLinecap="round" />
      <path d="M36 12L41 17" stroke="#94A3B8" strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}

// 5. Height Stature Illustration
export function HeightIllustration({ className = 'w-12 h-12' }: { className?: string }) {
  return (
    <svg viewBox="0 0 56 56" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} aria-hidden="true">
      <rect width="56" height="56" rx="16" fill="#F8FAFC" />
      {/* Ruler bar on left */}
      <rect x="14" y="12" width="6" height="32" rx="3" fill="#E2E8F0" />
      <path d="M16 18H20M16 24H18M16 30H20M16 36H18" stroke="#94A3B8" strokeWidth="1.5" strokeLinecap="round" />
      {/* Human silhouette */}
      <circle cx="34" cy="18" r="4.5" fill="#00A884" />
      <path d="M28 42V31C28 27.5 30.5 25 34 25C37.5 25 40 27.5 40 31V42" stroke="#00A884" strokeWidth="2.5" strokeLinecap="round" />
      {/* Vertical measure arrow */}
      <path d="M44 14V42M44 14L41 17M44 14L47 17M44 42L41 39M44 42L47 39" stroke="#0F766E" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

// 6. Weight Smart Scale Illustration
export function WeightIllustration({ className = 'w-12 h-12' }: { className?: string }) {
  return (
    <svg viewBox="0 0 56 56" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} aria-hidden="true">
      <rect width="56" height="56" rx="16" fill="#F8FAFC" />
      {/* Scale platform */}
      <rect x="12" y="14" width="32" height="30" rx="8" fill="#F1F5F9" stroke="#CBD5E1" strokeWidth="2" />
      {/* Digital display */}
      <rect x="20" y="18" width="16" height="8" rx="3" fill="#0F172A" />
      <circle cx="28" cy="22" r="1.5" fill="#34D399" />
      {/* Foot standing markers */}
      <rect x="16" y="29" width="7" height="11" rx="3.5" fill="#CBD5E1" />
      <rect x="33" y="29" width="7" height="11" rx="3.5" fill="#CBD5E1" />
    </svg>
  )
}

// 7. Waist Tape Measurement Illustration
export function WaistIllustration({ className = 'w-12 h-12' }: { className?: string }) {
  return (
    <svg viewBox="0 0 56 56" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} aria-hidden="true">
      <rect width="56" height="56" rx="16" fill="#F8FAFC" />
      {/* Torso outline */}
      <path
        d="M18 14C23 19 23 37 18 42M38 14C33 19 33 37 38 42"
        stroke="#CBD5E1"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      {/* Belly button */}
      <circle cx="28" cy="28" r="1.5" fill="#94A3B8" />
      {/* Tape measure loop */}
      <ellipse cx="28" cy="28" rx="14" ry="4" fill="#FEF3C7" stroke="#F59E0B" strokeWidth="2" />
      <path d="M22 26V30M28 26V30M34 26V30" stroke="#D97706" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}

// 8. Doctor Consultation Scene (Transition / Results)
export function DoctorConsultationIllustration({ className = 'w-16 h-16' }: { className?: string }) {
  return (
    <svg viewBox="0 0 88 88" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} aria-hidden="true">
      <circle cx="44" cy="44" r="40" fill="#ECFDF5" />
      <circle cx="44" cy="44" r="32" fill="#D1FAE5" />
      {/* Doctor Coat & Stethoscope */}
      <circle cx="44" cy="30" r="9" fill="#00A884" />
      <path
        d="M27 60C27 49 33 44 44 44C55 44 61 49 61 60"
        fill="#FFFFFF"
        stroke="#00A884"
        strokeWidth="3"
      />
      {/* Stethoscope around neck */}
      <path
        d="M38 44V51C38 54.3 40.7 57 44 57C47.3 57 50 54.3 50 51V44"
        stroke="#0F766E"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      <circle cx="44" cy="60" r="3" fill="#0F766E" />
      {/* Medical Cross Badge */}
      <circle cx="62" cy="26" r="8" fill="#00A884" />
      <path d="M62 22V30M58 26H66" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}

// 9. Prescription Delivery / Address Illustration
export function PrescriptionDeliveryIllustration({ className = 'w-14 h-14' }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} aria-hidden="true">
      <rect width="64" height="64" rx="18" fill="#F0FDF4" />
      {/* Delivery box */}
      <rect x="16" y="24" width="32" height="24" rx="5" fill="#E2E8F0" stroke="#CBD5E1" strokeWidth="2" />
      <path d="M16 32H48" stroke="#94A3B8" strokeWidth="1.5" />
      {/* Pharmacy cross on parcel */}
      <rect x="27" y="35" width="10" height="10" rx="2" fill="#00A884" />
      <path d="M32 37V43M29 40H35" stroke="#FFFFFF" strokeWidth="1.5" strokeLinecap="round" />
      {/* Map pin location marker */}
      <path
        d="M32 10C27.5 10 24 13.5 24 18C24 23.5 32 29 32 29C32 29 40 23.5 40 18C40 13.5 36.5 10 32 10Z"
        fill="#00A884"
      />
      <circle cx="32" cy="18" r="2.5" fill="#FFFFFF" />
    </svg>
  )
}

// 10. Medical Vitals Pulse Telemetry Illustration
export function VitalsTelemetryIllustration({ className = 'w-14 h-14' }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} aria-hidden="true">
      <rect width="64" height="64" rx="18" fill="#EFF6FF" />
      {/* Heart */}
      <path
        d="M32 44C32 44 18 34 18 24C18 19 22 15 27 15C29.5 15 31.5 16.5 32 18C32.5 16.5 34.5 15 37 15C42 15 46 19 46 24C46 34 32 44 32 44Z"
        fill="#3B82F6"
        fillOpacity="0.15"
        stroke="#2563EB"
        strokeWidth="2"
      />
      {/* ECG Pulse */}
      <path
        d="M20 28H26L29 20L35 36L38 28H44"
        stroke="#2563EB"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

// 11. Safety Check Shield Illustration
export function SafetyShieldIllustration({ className = 'w-14 h-14' }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} aria-hidden="true">
      <rect width="64" height="64" rx="18" fill="#FEF3C7" />
      {/* Shield */}
      <path
        d="M32 12L46 17V29C46 38.5 40 47 32 50C24 47 18 38.5 18 29V17L32 12Z"
        fill="#FDE68A"
        stroke="#D97706"
        strokeWidth="2.5"
        strokeLinejoin="round"
      />
      {/* Checkmark */}
      <path d="M26 31L30 35L38 27" stroke="#92400E" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

// 12. Health History Dossier Illustration
export function HealthHistoryIllustration({ className = 'w-14 h-14' }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} aria-hidden="true">
      <rect width="64" height="64" rx="18" fill="#F8FAFC" />
      {/* Clipboard */}
      <rect x="18" y="16" width="28" height="36" rx="5" fill="#FFFFFF" stroke="#94A3B8" strokeWidth="2" />
      <rect x="25" y="12" width="14" height="6" rx="2" fill="#E2E8F0" stroke="#94A3B8" strokeWidth="1.5" />
      {/* Checklist items */}
      <circle cx="24" cy="27" r="2" fill="#00A884" />
      <path d="M29 27H39" stroke="#64748B" strokeWidth="2" strokeLinecap="round" />
      <circle cx="24" cy="34" r="2" fill="#00A884" />
      <path d="M29 34H39" stroke="#64748B" strokeWidth="2" strokeLinecap="round" />
      <circle cx="24" cy="41" r="2" fill="#00A884" />
      <path d="M29 41H36" stroke="#64748B" strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}

// 13. Treatment Medication & Lock Account Illustration
export function AccountSecurityIllustration({ className = 'w-14 h-14' }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} aria-hidden="true">
      <rect width="64" height="64" rx="18" fill="#F0FDF4" />
      {/* Lock body */}
      <rect x="20" y="27" width="24" height="21" rx="5" fill="#00A884" />
      {/* Shackle */}
      <path
        d="M25 27V21C25 17.134 28.134 14 32 14C35.866 14 39 17.134 39 21V27"
        stroke="#0F766E"
        strokeWidth="3.5"
        strokeLinecap="round"
      />
      {/* Keyhole */}
      <circle cx="32" cy="36" r="2.5" fill="#FFFFFF" />
      <path d="M32 38.5V42" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}

// 14. 8Liv Transparent Official Logo (Blends seamlessly with any background)
export function EightLivTransparentLogo({ className = 'h-7 sm:h-8 w-auto' }: { className?: string }) {
  return (
    <img
      src="/brand-logo-official.png"
      alt="8LIV Official Logo"
      className={`object-contain bg-transparent ${className}`}
    />
  )
}

// 15. 8Liv Brand Trust Header with Transparent Blended Logo & Verified Badge
export function AssessmentBrandHeader({ className = '' }: { className?: string }) {
  return (
    <div className={`flex items-center justify-between pb-3.5 mb-6 border-b border-slate-100/90 bg-transparent ${className}`}>
      <div className="flex items-center gap-2.5">
        <EightLivTransparentLogo className="h-7 sm:h-8 w-auto" />
        <span className="text-[11px] font-medium text-slate-400 border-l border-slate-200 pl-2.5 hidden sm:inline tracking-tight">
          Clinical Weight Care
        </span>
      </div>
      <div className="flex items-center gap-1.5 text-[11px] font-medium text-emerald-700 bg-emerald-50/70 px-2.5 py-1 rounded-full border border-emerald-200/50">
        <svg viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5 text-[#00A884]" aria-hidden="true">
          <path d="M8 1.5L13.5 3.5V7.5C13.5 11 10.5 13.8 8 14.5C5.5 13.8 2.5 11 2.5 7.5V3.5L8 1.5Z" stroke="#00A884" strokeWidth="1.5" strokeLinejoin="round" />
          <path d="M5.5 7.5L7.2 9.2L10.5 5.8" stroke="#00A884" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <span>Doctor Supervised</span>
      </div>
    </div>
  )
}


