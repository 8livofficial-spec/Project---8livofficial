'use client'

import React from 'react'
import Link from 'next/link'
import { ArrowRight } from 'lucide-react'

export interface CarePlanStep {
  id: string
  stepNumber: number
  dateLabel: string
  title: string
  description: string
  isActive?: boolean
  bottomAction?: React.ReactNode
}

interface CarePlanTimelineProps {
  steps: CarePlanStep[]
}

export default function CarePlanTimeline({ steps }: CarePlanTimelineProps) {
  return (
    <div className="bg-white rounded-[16px] border border-[#e2e8f0] p-[24px] sm:p-[32px] shadow-[0px_2px_4px_-2px_rgba(15,23,42,0.06),0px_4px_6px_-1px_rgba(15,23,42,0.1)] flex flex-col gap-[24px] w-full mt-[16px]">
      
      {/* Header */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <h2 className="text-[20px] leading-[28px] font-bold text-slate-900 tracking-tight">
            What's Next in Your Care Plan
          </h2>
          <Link href="/patient/appointments" className="hidden sm:flex items-center gap-1 text-[13px] font-bold text-[#10b981] hover:text-emerald-600 transition-colors">
            View calendar <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
        <p className="text-[14px] text-slate-500">
          Upcoming steps, check-ins, and milestones scheduled for your treatment.
        </p>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-[16px]">
        {steps.map((step) => (
          <div 
            key={step.id} 
            className={`flex flex-col p-[20px] rounded-[12px] border ${
              step.isActive 
                ? 'bg-[#ecfdf5]/40 border-[#10b981]/40' 
                : 'bg-white border-[#e2e8f0]'
            }`}
          >
            <div className="flex items-center justify-between mb-4">
              {step.isActive ? (
                <span className="bg-[#d1fae5] text-[#047857] text-[10px] font-bold px-[8px] py-[3px] rounded-full uppercase tracking-widest">
                  Step {step.stepNumber} · {step.dateLabel}
                </span>
              ) : (
                <span className="text-[#2563eb] text-[10px] font-bold uppercase tracking-widest">
                  Step {step.stepNumber} · {step.dateLabel}
                </span>
              )}
              {step.isActive && (
                <span className="w-2 h-2 bg-[#10b981] rounded-full"></span>
              )}
            </div>
            
            <div className="flex flex-col gap-2 mb-6 flex-grow">
              <h3 className="text-[15px] leading-[20px] font-bold text-slate-900">
                {step.title}
              </h3>
              <p className="text-[13px] leading-[18px] text-slate-500">
                {step.description}
              </p>
            </div>

            <div className="mt-auto pt-4 border-t border-slate-100 min-h-[44px] flex items-center">
              {step.bottomAction}
            </div>
          </div>
        ))}
      </div>

    </div>
  )
}
