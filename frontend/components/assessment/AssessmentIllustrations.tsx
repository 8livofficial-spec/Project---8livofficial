'use client'

import React from 'react'

/**
 * Ultra-Premium Clinical Iconography & Visual Assets for 8Liv Assessment Funnel
 * Designed to replace childish cartoon drawings with elegant, high-craft medical UI.
 */

// 1. Screener Welcome / Clinical Intake Seal
export function ScreenerWelcomeIllustration({ className = 'w-14 h-14' }: { className?: string }) {
  return (
    <div className={`relative flex items-center justify-center rounded-2xl bg-emerald-50/80 border border-emerald-200/60 shadow-xs ${className}`}>
      <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-8 h-8 text-[#00A884]" aria-hidden="true">
        <rect x="10" y="8" width="28" height="34" rx="6" stroke="currentColor" strokeWidth="2.5" />
        <path d="M16 18H32" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        <path d="M16 25H28" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        <path d="M16 32H24" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        <circle cx="34" cy="34" r="8" fill="#00A884" />
        <path d="M31 34L33.5 36.5L37.5 31.5" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </div>
  )
}

// Biological Gender Header Icon
export function BiologicalGenderHeaderIcon({ className = 'w-12 h-12' }: { className?: string }) {
  return (
    <div className={`relative flex items-center justify-center rounded-2xl bg-emerald-50/80 border border-emerald-200/60 shadow-xs ${className}`}>
      <svg viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-6 h-6 text-[#00A884]" aria-hidden="true">
        {/* Male Symbol */}
        <circle cx="12" cy="18" r="5" stroke="currentColor" strokeWidth="2" />
        <path d="M16 14L22 8M22 8H17M22 8V13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        {/* Female Symbol */}
        <circle cx="20" cy="16" r="5" stroke="#0F766E" strokeWidth="2" />
        <path d="M20 21V27M17 24H23" stroke="#0F766E" strokeWidth="2" strokeLinecap="round" />
      </svg>
    </div>
  )
}

// 2. High-Craft Biological Female Icon
export function GenderFemaleIllustration({ className = 'w-14 h-14' }: { className?: string }) {
  return (
    <div className={`flex items-center justify-center rounded-2xl bg-emerald-50/70 border border-emerald-200/50 text-[#00A884] transition-all group-hover:scale-105 group-hover:bg-[#00A884] group-hover:text-white group-hover:shadow-md group-hover:shadow-[#00A884]/20 ${className}`}>
      <svg viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-8 h-8" aria-hidden="true">
        <circle cx="18" cy="13" r="7.5" stroke="currentColor" strokeWidth="2.4" />
        <path d="M18 20.5V30" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
        <path d="M13.5 25H22.5" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
      </svg>
    </div>
  )
}

// 3. High-Craft Biological Male Icon
export function GenderMaleIllustration({ className = 'w-14 h-14' }: { className?: string }) {
  return (
    <div className={`flex items-center justify-center rounded-2xl bg-emerald-50/70 border border-emerald-200/50 text-[#00A884] transition-all group-hover:scale-105 group-hover:bg-[#00A884] group-hover:text-white group-hover:shadow-md group-hover:shadow-[#00A884]/20 ${className}`}>
      <svg viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-8 h-8" aria-hidden="true">
        <circle cx="15" cy="20" r="7.5" stroke="currentColor" strokeWidth="2.4" />
        <path d="M20.5 14.5L27 8M27 8H21M27 8V14" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </div>
  )
}

// 4. Age Biometric Verification Icon
export function AgeIllustration({ className = 'w-12 h-12' }: { className?: string }) {
  return (
    <div className={`flex items-center justify-center rounded-2xl bg-emerald-50/80 border border-emerald-200/60 text-[#00A884] ${className}`}>
      <svg viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" aria-hidden="true">
        <rect x="6" y="8" width="20" height="18" rx="4" stroke="currentColor" strokeWidth="2" />
        <path d="M6 14H26" stroke="currentColor" strokeWidth="2" />
        <path d="M11 6V10M21 6V10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        <circle cx="16" cy="20" r="2" fill="currentColor" />
      </svg>
    </div>
  )
}

// 5. Height Stature Icon
export function HeightIllustration({ className = 'w-12 h-12' }: { className?: string }) {
  return (
    <div className={`flex items-center justify-center rounded-2xl bg-emerald-50/80 border border-emerald-200/60 text-[#00A884] ${className}`}>
      <svg viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" aria-hidden="true">
        <path d="M16 6V26M16 6L12 10M16 6L20 10M16 26L12 22M16 26L20 22" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </div>
  )
}

// 6. Weight Smart Scale Icon
export function WeightIllustration({ className = 'w-12 h-12' }: { className?: string }) {
  return (
    <div className={`flex items-center justify-center rounded-2xl bg-emerald-50/80 border border-emerald-200/60 text-[#00A884] ${className}`}>
      <svg viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" aria-hidden="true">
        <rect x="6" y="6" width="20" height="20" rx="5" stroke="currentColor" strokeWidth="2" />
        <circle cx="16" cy="13" r="3.5" stroke="currentColor" strokeWidth="1.5" />
        <path d="M16 13L17.5 11.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    </div>
  )
}

// 7. Waist Tape Measurement Icon
export function WaistIllustration({ className = 'w-12 h-12' }: { className?: string }) {
  return (
    <div className={`flex items-center justify-center rounded-2xl bg-emerald-50/80 border border-emerald-200/60 text-[#00A884] ${className}`}>
      <svg viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" aria-hidden="true">
        <path d="M8 10C8 10 12 16 12 21C12 26 8 30 8 30H24C24 30 20 26 20 21C20 16 24 10 24 10H8Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
        <ellipse cx="16" cy="21" rx="8" ry="3" stroke="#0F766E" strokeWidth="1.5" strokeDasharray="2 2" />
      </svg>
    </div>
  )
}

// 8. Doctor Clinical Dossier Widget
export function DoctorConsultationIllustration({ className = 'w-12 h-12' }: { className?: string }) {
  return (
    <div className={`flex items-center justify-center rounded-2xl bg-emerald-50 border border-emerald-200/60 text-[#00A884] shadow-xs ${className}`}>
      <svg viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" aria-hidden="true">
        <path d="M11 7C11 10.3137 13.6863 13 17 13H18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        <path d="M11 7V13C11 16.3137 13.6863 19 17 19H19C22.3137 19 25 16.3137 25 13V7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        <circle cx="11" cy="7" r="1.5" fill="currentColor" />
        <circle cx="25" cy="7" r="1.5" fill="currentColor" />
        <circle cx="20" cy="24" r="3" fill="#00A884" stroke="currentColor" strokeWidth="2" />
        <path d="M19 19V21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      </svg>
    </div>
  )
}

// 9. Patient Profile Identity Icon
export function PatientProfileIllustration({ className = 'w-12 h-12' }: { className?: string }) {
  return (
    <div className={`flex items-center justify-center rounded-2xl bg-emerald-50 border border-emerald-200/60 text-[#00A884] shadow-xs ${className}`}>
      <svg viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" aria-hidden="true">
        <circle cx="16" cy="11" r="5" stroke="currentColor" strokeWidth="2" />
        <path d="M6 26C6 21.5817 10.4772 18 16 18C21.5228 18 26 21.5817 26 26" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      </svg>
    </div>
  )
}
export const PrescriptionDeliveryIllustration = PatientProfileIllustration

// 10. Medical Vitals Telemetry Icon
export function VitalsTelemetryIllustration({ className = 'w-12 h-12' }: { className?: string }) {
  return (
    <div className={`flex items-center justify-center rounded-2xl bg-emerald-50 border border-emerald-200/60 text-[#00A884] shadow-xs ${className}`}>
      <svg viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" aria-hidden="true">
        <path d="M5 16H10L13 9L18 23L21 16H27" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </div>
  )
}

// 11. Clinical Safety Protocol Shield
export function SafetyShieldIllustration({ className = 'w-12 h-12' }: { className?: string }) {
  return (
    <div className={`flex items-center justify-center rounded-2xl bg-emerald-50 border border-emerald-200/60 text-[#00A884] shadow-xs ${className}`}>
      <svg viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" aria-hidden="true">
        <path d="M16 5L25 8.5V15C25 21 21 25.5 16 27C11 25.5 7 21 7 15V8.5L16 5Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
        <path d="M12 15.5L15 18.5L20 13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </div>
  )
}

// 12. Health History Dossier Icon
export function HealthHistoryIllustration({ className = 'w-12 h-12' }: { className?: string }) {
  return (
    <div className={`flex items-center justify-center rounded-2xl bg-emerald-50 border border-emerald-200/60 text-[#00A884] shadow-xs ${className}`}>
      <svg viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" aria-hidden="true">
        <rect x="8" y="7" width="16" height="20" rx="3" stroke="currentColor" strokeWidth="2" />
        <path d="M12 5H20" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        <path d="M12 13H20M12 17H18M12 21H16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    </div>
  )
}

// 13. Account Security Icon
export function AccountSecurityIllustration({ className = 'w-12 h-12' }: { className?: string }) {
  return (
    <div className={`flex items-center justify-center rounded-2xl bg-emerald-50 border border-emerald-200/60 text-[#00A884] shadow-xs ${className}`}>
      <svg viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" aria-hidden="true">
        <rect x="8" y="13" width="16" height="13" rx="3" stroke="currentColor" strokeWidth="2" />
        <path d="M12 13V10C12 7.79086 13.7909 6 16 6C18.2091 6 20 7.79086 20 10V13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        <circle cx="16" cy="19" r="1.5" fill="currentColor" />
        <path d="M16 20.5V22.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    </div>
  )
}

// 14. Lab Work / Biomarkers Icon
export function LabWorkIllustration({ className = 'w-12 h-12' }: { className?: string }) {
  return (
    <div className={`flex items-center justify-center rounded-2xl bg-emerald-50 border border-emerald-200/60 text-[#00A884] shadow-xs ${className}`}>
      <svg viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" aria-hidden="true">
        <path d="M13 7H19M14 7V13L8 23C7 24.5 8 26 10 26H22C24 26 25 24.5 24 23L18 13V7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M10 20H22" stroke="currentColor" strokeWidth="1.5" />
      </svg>
    </div>
  )
}

// 15. 8Liv Transparent Official Logo
export function EightLivTransparentLogo({ className = 'h-7 sm:h-8 w-auto' }: { className?: string }) {
  return (
    <img
      src="/brand-logo-official.png"
      alt="8LIV Official Logo"
      className={`object-contain bg-transparent ${className}`}
    />
  )
}

// 16. 8Liv Clean Clinical Brand Header
export function AssessmentBrandHeader({ className = '' }: { className?: string }) {
  return (
    <div className={`flex items-center justify-between pb-3.5 mb-6 border-b border-slate-100 bg-transparent ${className}`}>
      <div className="flex items-center gap-2.5">
        <EightLivTransparentLogo className="h-7 sm:h-8 w-auto" />
        <span className="text-xs font-medium text-slate-400 border-l border-slate-200 pl-2.5 hidden sm:inline tracking-tight">
          Clinical Weight Care
        </span>
      </div>
    </div>
  )
}
