'use client'

import React, { useState } from 'react'
import { ClipboardCheck, CheckCircle2, Video, ArrowRight } from 'lucide-react'
import PatientCheckInModal from './PatientCheckInModal'
import Link from 'next/link'

export type ContextualState = 'checkin_due' | 'checkin_complete' | 'appointment_approaching'

interface ContextualActionWidgetProps {
  patientName: string
  contextState: ContextualState
  appointmentDate?: string
  appointmentTime?: string
  latestWeight?: number | null
  lastRecordedDays?: number | null
}

export default function ContextualActionWidget({ 
  patientName, 
  contextState: initialState,
  appointmentDate,
  appointmentTime,
  latestWeight,
  lastRecordedDays
}: ContextualActionWidgetProps) {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [contextState, setContextState] = useState<ContextualState>(initialState)

  return (
    <>
      <div className="bg-white rounded-[16px] border border-[#e2e8f0] p-[24px] shadow-[0px_2px_4px_-2px_rgba(15,23,42,0.06),0px_4px_6px_-1px_rgba(15,23,42,0.1)] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 w-full">
        
        {contextState === 'checkin_complete' && (
          <div className="flex items-start gap-4 w-full justify-between">
            <div className="flex items-start gap-4">
              <div className="w-[48px] h-[48px] bg-emerald-50 rounded-[12px] flex items-center justify-center shrink-0">
                <CheckCircle2 className="w-6 h-6 text-emerald-600" />
              </div>
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-[18px] leading-[24px] font-bold text-slate-900 tracking-tight">
                    Check-in Complete
                  </h2>
                </div>
                <p className="text-[14px] leading-[20px] text-slate-500">
                  Your latest update has been shared with your care team.
                </p>
              </div>
            </div>
          </div>
        )}

        {contextState === 'checkin_due' && (
          <div className="flex items-start sm:items-center justify-between gap-4 w-full flex-col sm:flex-row">
            <div className="flex items-start gap-4">
              <div className="w-[48px] h-[48px] bg-[#eff6ff] rounded-[12px] flex items-center justify-center shrink-0">
                <ClipboardCheck className="w-6 h-6 text-[#2563eb]" />
              </div>
              <div className="flex flex-col gap-[4px]">
                <div className="flex items-center gap-[12px] flex-wrap">
                  <h2 className="text-[18px] leading-[24px] font-bold text-slate-900 tracking-tight">Your Weekly Check-in is Ready</h2>
                  <span className="bg-[#fef3c7] text-[#b45309] text-[11px] font-bold px-[8px] py-[2px] rounded-full whitespace-nowrap leading-[16px]">
                    Action Required
                  </span>
                </div>
                <p className="text-[14px] leading-[20px] text-slate-600">
                  Take a quick moment to update us on your symptoms, side effects, and current dosage.
                </p>
                <div className="flex items-center gap-2 mt-1">
                  <div className="flex items-center gap-1.5 text-[12px] text-slate-500 font-medium">
                    <span className="w-3.5 h-3.5 flex items-center justify-center border border-slate-400 rounded-full text-[8px]">⏱</span>
                    Takes ~30 seconds
                  </div>
                  <span className="text-slate-300">•</span>
                  <p className="text-[12px] text-slate-500 font-medium">Due before next consultation</p>
                </div>
              </div>
            </div>
            
            <button
              onClick={() => setIsModalOpen(true)}
              className="w-full sm:w-auto min-h-[40px] px-[24px] bg-[#2563eb] text-white rounded-[9999px] font-semibold text-[14px] hover:bg-blue-700 transition-colors shadow-sm whitespace-nowrap cursor-pointer flex items-center justify-center gap-2 shrink-0"
            >
              Start check-in <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {contextState === 'appointment_approaching' && (
          <div className="flex items-start sm:items-center justify-between gap-4 w-full flex-col sm:flex-row">
            <div className="flex items-start gap-4">
              <div className="w-[48px] h-[48px] bg-purple-50 rounded-[12px] flex items-center justify-center shrink-0">
                <Video className="w-6 h-6 text-purple-600" />
              </div>
              <div className="flex flex-col gap-[4px]">
                <div className="flex items-center gap-[12px] flex-wrap">
                  <h2 className="text-[18px] leading-[24px] font-bold text-slate-900 tracking-tight">Upcoming Appointment</h2>
                  <span className="bg-purple-100 text-purple-700 text-[11px] font-bold px-[8px] py-[2px] rounded-full whitespace-nowrap leading-[16px]">
                    Action Required
                  </span>
                </div>
                <p className="text-[14px] leading-[20px] text-slate-600">
                  Your provider consultation is {appointmentDate ? `on ${appointmentDate}` : 'coming up'}.
                </p>
                {appointmentTime && <p className="text-[12px] text-slate-500 font-medium mt-1">{appointmentTime}</p>}
              </div>
            </div>
            
            <Link
              href="/patient/appointments"
              className="w-full sm:w-auto min-h-[40px] flex items-center justify-center px-[24px] bg-[#2563eb] text-white rounded-[9999px] font-semibold text-[14px] hover:bg-blue-700 transition-colors shadow-sm whitespace-nowrap cursor-pointer gap-2 shrink-0"
            >
              View appointment <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        )}

      </div>

      <PatientCheckInModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        onComplete={() => setContextState('checkin_complete')}
        patientName={patientName}
        latestWeight={latestWeight}
        lastRecordedDays={lastRecordedDays}
      />
    </>
  )
}
