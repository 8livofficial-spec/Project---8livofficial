'use client'

import React from 'react'
import { Stethoscope, Utensils, ShieldCheck, Truck, Lock, HeartPulse, Activity } from 'lucide-react'
import LogoLoop, { LogoItem } from '@/components/ui/LogoLoop'

const trustPillars = [
  {
    icon: <Stethoscope className="w-4 h-4 text-[#00A884]" />,
    label: 'Doctor-Led Consultations',
    detail: 'Board-Certified Indian Physicians',
  },
  {
    icon: <Truck className="w-4 h-4 text-[#00A884]" />,
    label: 'Doorstep Cold Delivery',
    detail: 'Discreet & Temperature-Controlled',
  },
  {
    icon: <Utensils className="w-4 h-4 text-[#00A884]" />,
    label: 'Indian Diet Adaptation',
    detail: 'No Extreme Starvation Diets',
  },
  {
    icon: <Lock className="w-4 h-4 text-[#00A884]" />,
    label: '100% Confidential',
    detail: 'Encrypted Telehealth Records',
  },
  {
    icon: <HeartPulse className="w-4 h-4 text-[#00A884]" />,
    label: 'Dedicated Care Team',
    detail: 'Continuous WhatsApp & App Support',
  },
  {
    icon: <ShieldCheck className="w-4 h-4 text-[#00A884]" />,
    label: 'CDSCO Aligned Medicine',
    detail: 'Evidence-Based GLP-1 Care',
  },
  {
    icon: <Activity className="w-4 h-4 text-[#00A884]" />,
    label: 'Zero Starvation Philosophy',
    detail: 'Metabolic Balance & Vitality',
  },
]

export default function TrustStrip() {
  const trustLogos: LogoItem[] = trustPillars.map((item, idx) => ({
    title: item.label,
    node: (
      <div
        key={idx}
        className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-slate-50/90 border border-slate-100 hover:border-[#00A884]/30 hover:bg-white hover:shadow-md transition-all duration-200 cursor-default select-none min-w-[260px] sm:min-w-[280px]"
      >
        <div className="w-9 h-9 rounded-xl bg-[#00A884]/10 flex items-center justify-center shrink-0">
          {item.icon}
        </div>
        <div className="flex flex-col min-w-0 text-left">
          <span className="text-xs sm:text-sm font-bold font-sora text-slate-900 leading-tight whitespace-nowrap">
            {item.label}
          </span>
          <span className="text-[10px] sm:text-[11px] text-slate-500 font-medium mt-0.5 whitespace-nowrap">
            {item.detail}
          </span>
        </div>
      </div>
    ),
  }))

  return (
    <section aria-label="Clinical Trust Pillars" className="w-full bg-white border-y border-slate-200/80 py-4 sm:py-6 overflow-hidden">
      <div className="w-full">
        <LogoLoop
          logos={trustLogos}
          speed={45}
          direction="left"
          logoHeight={64}
          gap={20}
          hoverSpeed={10}
          fadeOut={true}
          fadeOutColor="#ffffff"
          ariaLabel="Clinical Care Trust Pillars"
          className="w-full"
        />
      </div>
    </section>
  )
}

