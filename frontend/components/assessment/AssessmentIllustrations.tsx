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
      <rect width="80" height="80" rx="20" fill="#F0FDF4" />
      <circle cx="40" cy="40" r="28" fill="#D1FAE5" />
      <rect x="24" y="20" width="32" height="42" rx="4" fill="#FFFFFF" stroke="#047857" strokeWidth="2" />
      <rect x="34" y="16" width="12" height="6" rx="2" fill="#34D399" stroke="#047857" strokeWidth="2" />
      <path d="M30 32H44" stroke="#94A3B8" strokeWidth="2" strokeLinecap="round" />
      <path d="M30 40H50" stroke="#94A3B8" strokeWidth="2" strokeLinecap="round" />
      <path d="M30 48H40" stroke="#94A3B8" strokeWidth="2" strokeLinecap="round" />
      <path d="M42 52L50 60L66 40" stroke="#059669" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M42 52L50 60L66 40" stroke="#10B981" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

// Biological Gender Header Icon
export function BiologicalGenderHeaderIcon({ className = 'w-12 h-12' }: { className?: string }) {
  return (
    <svg viewBox="0 0 56 56" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} aria-hidden="true">
      <circle cx="28" cy="28" r="24" fill="#F0F8FF" />
      {/* Male Symbol */}
      <circle cx="22" cy="24" r="7" stroke="#2563EB" strokeWidth="3" />
      <path d="M27 19L32 14M32 14H27M32 14V19" stroke="#2563EB" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      {/* Female Symbol */}
      <circle cx="34" cy="32" r="7" stroke="#8B5CF6" strokeWidth="3" />
      <path d="M34 39V46M31 43H37" stroke="#8B5CF6" strokeWidth="3" strokeLinecap="round" />
      {/* Accents */}
      <circle cx="12" cy="24" r="1.5" fill="#10B981" />
      <path d="M14 16L16 18" stroke="#10B981" strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}

// 2. Female Avatar Badge
export function GenderFemaleIllustration({ className = 'w-10 h-10' }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} aria-hidden="true">
      {/* Body / Shirt */}
      <path d="M14 42C14 36 18 32 24 32C30 32 34 36 34 42H14Z" fill="#0066FF" />
      {/* Hair back */}
      <path d="M15 28C14 20 16 12 24 12C32 12 34 20 33 28L31 34H17L15 28Z" fill="#1E293B" />
      {/* Face */}
      <circle cx="24" cy="22" r="7" fill="#FDE68A" />
      {/* Hair front / bangs */}
      <path d="M17 22C17 18 20 14 24 14C28 14 31 18 31 22" fill="#1E293B" />
    </svg>
  )
}

// 3. Male Avatar Badge
export function GenderMaleIllustration({ className = 'w-10 h-10' }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} aria-hidden="true">
      {/* Body / Shirt */}
      <path d="M12 42C12 35 17 30 24 30C31 30 36 35 36 42H12Z" fill="#0066FF" />
      {/* Face */}
      <circle cx="24" cy="22" r="6.5" fill="#FDE68A" />
      {/* Hair short */}
      <path d="M17 22C17 16 20 14 24 14C28 14 31 16 31 22C31 22 29 18 24 18C19 18 17 22 17 22Z" fill="#1E293B" />
      <path d="M17 19C17 14 20 12 24 12C28 12 31 14 31 19" fill="#1E293B" />
    </svg>
  )
}

// 4. Age & Longevity Clock
export function AgeIllustration({ className = 'w-12 h-12' }: { className?: string }) {
  return (
    <svg viewBox="0 0 56 56" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} aria-hidden="true">
      {/* Calendar body */}
      <rect x="14" y="16" width="28" height="24" rx="4" fill="#0066FF" />
      <rect x="14" y="24" width="28" height="16" rx="4" fill="#FFFFFF" stroke="#0066FF" strokeWidth="2" />
      <path d="M14 24H42" stroke="#0066FF" strokeWidth="2" />
      {/* Rings */}
      <rect x="20" y="12" width="3" height="8" rx="1.5" fill="#1E293B" />
      <rect x="33" y="12" width="3" height="8" rx="1.5" fill="#1E293B" />
      {/* Number 32 */}
      <text x="28" y="36" fill="#0066FF" fontSize="14" fontWeight="bold" fontFamily="sans-serif" textAnchor="middle">32</text>
      {/* Green Clock Badge */}
      <circle cx="38" cy="38" r="8" fill="#10B981" stroke="#FFFFFF" strokeWidth="2" />
      <path d="M38 34V38L40 40" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

// 5. Height Stature Illustration
export function HeightIllustration({ className = 'w-12 h-12' }: { className?: string }) {
  return (
    <svg viewBox="0 0 56 56" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} aria-hidden="true">
      <circle cx="24" cy="28" r="20" fill="#F0F8FF" />
      {/* Height lines on background */}
      <path d="M12 20H16M14 28H16M12 36H16" stroke="#BAE6FD" strokeWidth="2" strokeLinecap="round" />
      {/* Person */}
      <circle cx="24" cy="18" r="4" fill="#0066FF" />
      <rect x="20" y="24" width="8" height="12" rx="2" fill="#0066FF" />
      <rect x="20" y="34" width="3" height="10" rx="1.5" fill="#0066FF" />
      <rect x="25" y="34" width="3" height="10" rx="1.5" fill="#0066FF" />
      <rect x="18" y="24" width="2" height="8" rx="1" fill="#0066FF" />
      <rect x="28" y="24" width="2" height="8" rx="1" fill="#0066FF" />
      {/* Green Arrow */}
      <path d="M38 18V42M38 18L35 21M38 18L41 21M38 42L35 39M38 42L41 39" stroke="#10B981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

// 6. Weight Smart Scale Illustration
export function WeightIllustration({ className = 'w-12 h-12' }: { className?: string }) {
  return (
    <svg viewBox="0 0 56 56" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} aria-hidden="true">
      <circle cx="28" cy="28" r="24" fill="#F0F8FF" />
      {/* Scale Body */}
      <path d="M14 20C14 16.6863 16.6863 14 20 14H36C39.3137 14 42 16.6863 42 20V36C42 40.4183 38.4183 44 34 44H22C17.5817 44 14 40.4183 14 36V20Z" fill="#0066FF" />
      {/* Dial Window */}
      <circle cx="28" cy="26" r="10" fill="#FFFFFF" />
      <path d="M22 26C22 22.6863 24.6863 20 28 20C31.3137 20 34 22.6863 34 26" stroke="#E2E8F0" strokeWidth="2" />
      {/* Green Needle */}
      <path d="M28 26L25 21" stroke="#10B981" strokeWidth="2.5" strokeLinecap="round" />
      <circle cx="28" cy="26" r="2" fill="#0066FF" />
    </svg>
  )
}

// 7. Waist Tape Measurement Illustration
export function WaistIllustration({ className = 'w-12 h-12' }: { className?: string }) {
  return (
    <svg viewBox="0 0 56 56" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} aria-hidden="true">
      {/* Torso */}
      <path d="M18 16C18 16 22 24 22 30C22 36 18 44 18 44H38C38 44 34 36 34 30C34 24 38 16 38 16H18Z" fill="#93C5FD" stroke="#0F172A" strokeWidth="2" strokeLinejoin="round" />
      <path d="M24 44V40M32 44V40" stroke="#0F172A" strokeWidth="2" strokeLinecap="round" />
      {/* Green Tape Measure Loop */}
      <ellipse cx="28" cy="30" rx="14" ry="4" fill="none" stroke="#10B981" strokeWidth="3" />
      <ellipse cx="28" cy="30" rx="14" ry="4" fill="none" stroke="#FFFFFF" strokeWidth="3" strokeDasharray="3 3" />
      <path d="M12 30C12 30 14 26 18 24" stroke="#10B981" strokeWidth="2.5" strokeLinecap="round" strokeDasharray="2 2" />
      <path d="M44 30C44 30 42 26 38 24" stroke="#10B981" strokeWidth="2.5" strokeLinecap="round" strokeDasharray="2 2" />
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

// 14. Lab Work / Blood Report Illustration
export function LabWorkIllustration({ className = 'w-14 h-14' }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} aria-hidden="true">
      <rect width="64" height="64" rx="18" fill="#F0F8FF" />
      {/* Background soft circle */}
      <circle cx="32" cy="32" r="22" fill="#DBEAFE" />
      {/* Test Tube / Lab Vial */}
      <rect x="26" y="20" width="12" height="26" rx="6" fill="#FFFFFF" stroke="#0066FF" strokeWidth="2" />
      {/* Liquid inside the vial */}
      <path d="M27 34V40C27 42.209 29.239 44 32 44C34.761 44 37 42.209 37 40V34H27Z" fill="#2563EB" />
      {/* Bubbles */}
      <circle cx="30" cy="38" r="1.5" fill="#FFFFFF" />
      <circle cx="34" cy="41" r="1" fill="#FFFFFF" />
      {/* Medical Cross Accent */}
      <circle cx="48" cy="20" r="8" fill="#10B981" />
      <path d="M48 16V24M44 20H52" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" />
      {/* Checkmarks / Lines indicating report */}
      <path d="M14 46H20" stroke="#93C5FD" strokeWidth="2" strokeLinecap="round" />
      <path d="M16 52H24" stroke="#93C5FD" strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}

// 15. 8Liv Transparent Official Logo (Blends seamlessly with any background)
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


