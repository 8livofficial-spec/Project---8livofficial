'use client'

import React from 'react'
import { Pill, ArrowRight } from 'lucide-react'
import Link from 'next/link'

interface TreatmentCardProps {
  medicationName: string
  dosage: string
  isActive: boolean
  nextDoseDate: string
  nextDoseDays: string
  providerName: string
  refillsRemaining: number
  nextConsultationDate: string
}

export default function TreatmentCard({
  medicationName,
  dosage,
  isActive,
  nextDoseDate,
  nextDoseDays,
  providerName,
  refillsRemaining,
  nextConsultationDate
}: TreatmentCardProps) {
  return (
    <div className="bg-white rounded-[16px] border border-[#e2e8f0] p-[24px] shadow-[0px_2px_4px_-2px_rgba(15,23,42,0.06),0px_4px_6px_-1px_rgba(15,23,42,0.1)] flex flex-col gap-[24px] w-full">
      
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-[28px] h-[28px] bg-indigo-50 rounded-lg flex items-center justify-center">
            <Pill className="w-[14px] h-[14px] text-indigo-500" />
          </div>
          <span className="text-[12px] font-bold text-slate-500 uppercase tracking-widest">Current Treatment</span>
        </div>
        {isActive && (
          <span className="flex items-center gap-1.5 bg-[#ecfdf5] text-[#10b981] px-[10px] py-[4px] rounded-full text-[12px] font-bold border border-[#d1fae5]">
            <span className="w-1.5 h-1.5 bg-[#10b981] rounded-full"></span> Active
          </span>
        )}
      </div>

      {/* Medication */}
      <div>
        <div className="flex items-center gap-3 mb-2 flex-wrap">
          <h3 className="text-[28px] leading-[36px] font-bold text-slate-900 tracking-tight">{medicationName}</h3>
          <span className="bg-slate-100 text-slate-700 px-[10px] py-[4px] rounded-md text-[13px] font-bold">
            {dosage}
          </span>
        </div>
        <p className="text-[13px] text-slate-500">
          Subcutaneous injection · Weekly administration
        </p>
      </div>

      {/* Next Dose Box */}
      <div className="bg-slate-50 border border-slate-100 rounded-[12px] p-[16px] flex flex-col gap-2">
        <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Next Scheduled Dose</span>
        <div className="flex items-center justify-between">
          <span className="text-[15px] font-bold text-slate-900">{nextDoseDate}</span>
          <span className="text-[13px] font-medium text-[#2563eb]">{nextDoseDays}</span>
        </div>
        <p className="text-[12px] text-slate-500 mt-1 leading-relaxed">
          Inject {dosage} into abdomen or thigh after evening meal.
        </p>
      </div>

      {/* Meta Info */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between text-[13px]">
          <span className="text-slate-400">Supervising Provider</span>
          <span className="text-slate-700 font-medium">{providerName}</span>
        </div>
        <div className="flex items-center justify-between text-[13px]">
          <span className="text-slate-400">Available Refills</span>
          <span className="text-slate-700 font-medium">{refillsRemaining} refills remaining</span>
        </div>
        <div className="flex items-center justify-between text-[13px]">
          <span className="text-slate-400">Next Consultation</span>
          <span className="text-[#2563eb] font-bold">{nextConsultationDate}</span>
        </div>
      </div>

      {/* Bottom Action */}
      <div className="pt-2">
        <Link href="/patient/prescriptions" className="flex items-center gap-1 text-[13px] font-bold text-[#10b981] hover:text-emerald-600 transition-colors">
          View full prescription & refill history <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>

    </div>
  )
}
