'use client'

import React, { useState } from 'react'
import { Pill, Package, ArrowRight, CheckCircle2 } from 'lucide-react'
import { usePatientData } from '@/hooks/usePatientData'

export default function PrescriptionsPage() {
  const { consultation, assessment } = usePatientData()
  const [refillRequested, setRefillRequested] = useState(false)
  const [refillLoading, setRefillLoading] = useState(false)

  const handleRefillRequest = async () => {
    setRefillLoading(true)
    await new Promise(resolve => setTimeout(resolve, 1000))
    setRefillRequested(true)
    setRefillLoading(false)
  }

  const isApproved = consultation?.status === 'approved'

  // Dynamic calculations
  const prescriptionText = consultation?.prescription_text || ''
  
  let medicationName = "Semaglutide (GLP-1)"
  let dosage = "1.5 mg"
  
  if (prescriptionText) {
    const match = prescriptionText.match(/^([a-zA-Z\s\(\)-]+)\s+([0-9\.]+\s*m?g)/i)
    if (match) {
      medicationName = match[1].trim()
      dosage = match[2].trim()
    } else {
      medicationName = prescriptionText
      dosage = "Standard Dosage"
    }
  }

  const getDosesTaken = (approvedAtString?: string) => {
    if (!approvedAtString) return 6
    const start = new Date(approvedAtString)
    const now = new Date()
    const diffTime = Math.abs(now.getTime() - start.getTime())
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    const weeks = Math.ceil(diffDays / 7)
    return Math.min(12, Math.max(1, weeks))
  }

  const dosesTaken = consultation?.created_at ? getDosesTaken(consultation.created_at) : 6
  const totalDoses = 12
  const compliancePercent = Math.round((dosesTaken / totalDoses) * 100)

  const getNextRefillDetails = (approvedAtString?: string) => {
    if (!approvedAtString) return { date: 'Apr 18', days: 12 }
    const start = new Date(approvedAtString)
    const now = new Date()
    
    const nextRefill = new Date(start.getTime() + 28 * 24 * 60 * 60 * 1000)
    while (nextRefill.getTime() < now.getTime()) {
      nextRefill.setTime(nextRefill.getTime() + 28 * 24 * 60 * 60 * 1000)
    }
    
    const diffTime = nextRefill.getTime() - now.getTime()
    const days = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    
    const options: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' }
    return { date: nextRefill.toLocaleDateString('en-US', options), days: Math.max(0, days) }
  }

  const refillDetails = consultation?.created_at 
    ? getNextRefillDetails(consultation.created_at) 
    : { date: 'Apr 18', days: 12 }

  const physicianName = consultation?.doctor_profiles?.full_name || '8Liv Clinician'

  const history = isApproved ? [
    { medication: medicationName, dose: dosage, date: consultation?.created_at ? new Date(consultation.created_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : 'June 01, 2026', duration: '12 Weeks', status: 'Active' }
  ] : []

  return (
    <div className="space-y-6 text-[#1A1F36]">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold font-sora">My Protocols & Prescriptions</h2>
        <p className="text-xs text-[#8896A4] font-medium">Track your active dosages, refills, and shipping statuses.</p>
      </div>

      {/* Active Prescription Card */}
      <div className="bg-white rounded-2xl p-6 shadow-[0_2px_12px_rgba(26,31,54,0.08)] border border-[#1A1F36]/6">
        {isApproved ? (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left: Drug Metadata */}
            <div className="lg:col-span-1 space-y-4">
              <div className="flex items-center gap-2 text-[#C4622D]">
                <Pill className="w-5 h-5 shrink-0" />
                <span className="font-bold text-sm uppercase tracking-wider font-sora">Active Protocol</span>
              </div>
              <div className="space-y-1">
                <h3 className="text-2xl font-bold font-sora">{medicationName}</h3>
                <span className="inline-block bg-[#5C7A6B]/10 text-[#5C7A6B] text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full mt-1">
                  Physician Approved
                </span>
              </div>
              
              <div className="grid grid-cols-2 gap-4 pt-3 border-t border-[#1A1F36]/6">
                <div>
                  <span className="text-[10px] font-bold text-[#8896A4] uppercase tracking-wider">Dosage</span>
                  <p className="text-sm font-semibold mt-0.5">{dosage}</p>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-[#8896A4] uppercase tracking-wider">Frequency</span>
                  <p className="text-sm font-semibold mt-0.5">Weekly</p>
                </div>
                <div className="col-span-2">
                  <span className="text-[10px] font-bold text-[#8896A4] uppercase tracking-wider">Prescribed By</span>
                  <p className="text-sm font-semibold mt-0.5">{physicianName}</p>
                </div>
              </div>
            </div>

            {/* Middle: Progress compliance */}
            <div className="lg:col-span-1 border-y lg:border-y-0 lg:border-x border-[#1A1F36]/8 py-6 lg:py-0 lg:px-6 space-y-4">
              <div>
                <span className="text-[10px] font-bold text-[#8896A4] uppercase tracking-wider">Treatment Compliance</span>
                <div className="flex justify-between items-center text-xs mt-2 font-bold">
                  <span>Doses Administered</span>
                  <span>{dosesTaken} of {totalDoses} ({compliancePercent}%)</span>
                </div>
                <div className="bg-[#F5F0EB] h-2.5 rounded-full overflow-hidden mt-2 border border-[#1A1F36]/6">
                  <div className="bg-[#C4622D] h-full rounded-full transition-all" style={{ width: `${compliancePercent}%` }} />
                </div>
              </div>

              <div className="p-4 bg-[#F5F0EB] rounded-2xl border border-[#1A1F36]/6 flex items-start gap-3">
                <Package className="w-5 h-5 text-[#8896A4] shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-bold">Next Refill Dispatch: {refillDetails.date}</p>
                  <p className="text-[10px] text-[#C4622D] font-bold uppercase mt-0.5">{refillDetails.days} days remaining</p>
                </div>
              </div>
            </div>

            {/* Right: Actions & Refill Request */}
            <div className="lg:col-span-1 flex flex-col justify-center space-y-4">
              <div className="space-y-1.5">
                <span className="text-[10px] font-bold text-[#8896A4] uppercase tracking-wider">Dispatch Status</span>
                <p className="text-sm font-bold text-[#5C7A6B] flex items-center gap-1.5 mt-1">
                  <span className="w-2 h-2 rounded-full bg-[#5C7A6B] animate-pulse" /> 
                  Shipped • Arrives in {refillDetails.days > 2 ? 2 : refillDetails.days} days
                </p>
              </div>

              <div className="pt-2">
                {refillRequested ? (
                  <div className="w-full bg-[#5C7A6B]/10 text-[#5C7A6B] border border-[#5C7A6B]/20 rounded-xl py-3 text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 shrink-0" /> Refill Requested
                  </div>
                ) : (
                  <button
                    onClick={handleRefillRequest}
                    disabled={refillLoading}
                    className="w-full bg-[#1A1F36] hover:bg-[#C4622D] text-white font-bold uppercase tracking-wider text-xs rounded-xl py-3.5 transition-colors cursor-pointer disabled:opacity-50"
                  >
                    {refillLoading ? "Processing Refill..." : "Request Refill Dispatch"}
                  </button>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="py-8 text-center space-y-3">
            <Pill className="w-12 h-12 text-[#8896A4] mx-auto opacity-40" />
            <h3 className="font-bold text-base font-sora">Awaiting Clinical Decision</h3>
            <p className="text-xs text-[#8896A4] max-w-sm mx-auto leading-relaxed">
              Your metabolic evaluation files are pending clinician authorization. Once approved, your custom prescription details will appear here.
            </p>
          </div>
        )}
      </div>

      {/* History table */}
      <div className="space-y-4">
        <h3 className="font-bold text-base font-sora">Prescription History</h3>
        
        <div className="bg-white rounded-2xl border border-[#1A1F36]/6 overflow-hidden shadow-[0_2px_12px_rgba(26,31,54,0.04)]">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#F5F0EB] text-[#8896A4] text-[10px] font-black uppercase tracking-wider border-b border-[#1A1F36]/8">
                  <th className="px-6 py-4">Medication</th>
                  <th className="px-6 py-4">Dose</th>
                  <th className="px-6 py-4">Prescribed Date</th>
                  <th className="px-6 py-4">Duration</th>
                  <th className="px-6 py-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1A1F36]/6 text-xs font-semibold">
                {history.map((row, idx) => (
                  <tr key={idx} className="hover:bg-[#F5F0EB]/30 transition-colors">
                    <td className="px-6 py-4 text-[#1A1F36]">{row.medication}</td>
                    <td className="px-6 py-4 text-[#C4622D]">{row.dose}</td>
                    <td className="px-6 py-4 text-[#8896A4]">{row.date}</td>
                    <td className="px-6 py-4 text-[#1A1F36]">{row.duration}</td>
                    <td className="px-6 py-4">
                      <span className={`inline-block px-2.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider ${
                        row.status === 'Active' 
                          ? 'bg-[#C4622D]/10 text-[#C4622D]' 
                          : row.status === 'Completed'
                            ? 'bg-[#5C7A6B]/10 text-[#5C7A6B]'
                            : 'bg-slate-100 text-slate-400'
                      }`}>
                        {row.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}
