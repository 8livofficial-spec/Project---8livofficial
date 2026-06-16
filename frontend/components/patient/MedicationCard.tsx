'use client'

import React, { useState } from 'react'
import { Pill, Package, CheckCircle2 } from 'lucide-react'

interface MedicationCardProps {
  medicationName: string
  dosage: string
  dosesTaken: number
  totalDoses: number
  nextRefillDate: string
  daysToRefill: number
  isApproved: boolean
}

export default function MedicationCard({
  medicationName,
  dosage,
  dosesTaken,
  totalDoses,
  nextRefillDate,
  daysToRefill,
  isApproved
}: MedicationCardProps) {
  const [refillRequested, setRefillRequested] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleRefillRequest = async () => {
    setLoading(true)
    await new Promise(resolve => setTimeout(resolve, 1000))
    setRefillRequested(true)
    setLoading(false)
  }

  const progressPercent = Math.min(100, Math.round((dosesTaken / totalDoses) * 100)) || 0

  return (
    <div className="dash-card p-5 flex flex-col justify-between h-full">
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center gap-2 text-[#C4622D] border-b border-[#1A1F36]/8 pb-3">
          <Pill className="w-5 h-5 shrink-0" />
          <h3 className="font-bold text-[#1A1F36] text-base font-sora">Active Protocol</h3>
        </div>

        {isApproved ? (
          <>
            {/* Drug Info */}
            <div>
              <h4 className="text-[#1A1F36] font-bold text-lg leading-tight font-sora">{medicationName}</h4>
              <p className="text-[#C4622D] text-xs font-bold uppercase tracking-wider mt-1">{dosage} · Weekly Injection</p>
              
              <div className="flex items-center gap-1.5 mt-2">
                <span className="w-2 h-2 rounded-full bg-[#5C7A6B] animate-pulse" />
                <span className="text-[#5C7A6B] text-xs font-bold uppercase tracking-wider">Active Prescribed</span>
              </div>
            </div>

            <hr className="border-[#1A1F36]/8" />

            {/* Doses Progress */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center text-xs">
                <span className="text-[#8896A4] font-medium">Weekly Doses Administered</span>
                <span className="font-bold text-[#1A1F36]">{dosesTaken} of {totalDoses}</span>
              </div>
              <div className="bg-[#F5F0EB] h-2 rounded-full overflow-hidden">
                <div 
                  className="bg-[#C4622D] h-full transition-all duration-500 rounded-full" 
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>

            {/* Refill Section */}
            <div className="flex items-start gap-2.5 p-3.5 bg-[#F5F0EB] rounded-2xl border border-[#1A1F36]/6">
              <Package className="w-5 h-5 text-[#8896A4] shrink-0 mt-0.5" />
              <div className="min-w-0">
                <p className="text-[#1A1F36] text-xs font-bold">Next Refill: {nextRefillDate}</p>
                <p className="text-[10px] text-[#C4622D] font-bold uppercase tracking-wide mt-0.5">{daysToRefill} days remaining</p>
              </div>
            </div>
          </>
        ) : (
          <div className="py-6 text-center space-y-3">
            <p className="text-sm text-[#8896A4] font-medium leading-relaxed">
              Your metabolic protocol is pending clinical review. Once authorized by your physician, details will appear here.
            </p>
          </div>
        )}
      </div>

      {isApproved && (
        <div className="mt-4 pt-2">
          {refillRequested ? (
            <div className="w-full bg-[#5C7A6B]/10 text-[#5C7A6B] border border-[#5C7A6B]/20 rounded-xl py-2.5 text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 shrink-0" /> Refill Requested
            </div>
          ) : (
            <button
              onClick={handleRefillRequest}
              disabled={loading}
              className="w-full border border-[#C4622D] hover:bg-[#C4622D]/8 text-[#C4622D] font-bold uppercase tracking-wider rounded-xl py-2.5 text-xs transition-colors cursor-pointer disabled:opacity-50"
            >
              {loading ? "Processing..." : "Request Automated Refill"}
            </button>
          )}
        </div>
      )}
    </div>
  )
}
