'use client'

import React from 'react'
import Link from 'next/link'

interface UpcomingAppointmentsProps {
  bookingDate?: string
  bookingTime?: string
  physicianName: string
  dietitianName: string
  trainerName: string
  consultations: any[]
  staffConsultations: any[]
  onBookClick: (type: 'dietitian' | 'trainer') => void
}

export default function UpcomingAppointments({
  bookingDate,
  bookingTime,
  physicianName,
  dietitianName,
  trainerName,
  consultations,
  staffConsultations,
  onBookClick
}: UpcomingAppointmentsProps) {
  
  const dietitianConsult = staffConsultations.find(c => c.staff_role === 'dietitian' && c.status === 'scheduled')
  const trainerConsult = staffConsultations.find(c => c.staff_role === 'trainer' && c.status === 'scheduled')

  const appointments = [
    {
      name: physicianName || 'Not Assigned',
      role: 'Physician Specialist',
      initials: (physicianName || '').split(' ').filter(Boolean).map(n => n[0]).join('').substring(0, 2).toUpperCase() || '-',
      scheduled: !!(bookingDate && bookingTime),
      date: bookingDate || '',
      time: bookingTime || '',
      linkUrl: `/patient/consultation/room`
    },
    {
      name: dietitianName || 'Not Assigned',
      role: 'Dietitian Coach',
      type: 'dietitian' as const,
      initials: (dietitianName || '').split(' ').filter(Boolean).map(n => n[0]).join('').substring(0, 2).toUpperCase() || '-',
      scheduled: !!dietitianConsult,
      date: dietitianConsult?.booking_date || '',
      time: dietitianConsult?.booking_time || '',
      linkUrl: dietitianConsult?.room_url || '/patient/consultation/room'
    },
    {
      name: trainerName || 'Not Assigned',
      role: 'Fitness Trainer',
      type: 'trainer' as const,
      initials: (trainerName || '').split(' ').filter(Boolean).map(n => n[0]).join('').substring(0, 2).toUpperCase() || '-',
      scheduled: !!trainerConsult,
      date: trainerConsult?.booking_date || '',
      time: trainerConsult?.booking_time || '',
      linkUrl: trainerConsult?.room_url || '/patient/consultation/room'
    }
  ]

  return (
    <div className="dash-card p-5 h-full">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-[#1A1F36] font-bold text-base font-[Sora]">Upcoming Care</h3>
        <Link href="/patient/appointments" className="text-[#C4622D] text-xs font-semibold hover:underline no-underline">
          View All
        </Link>
      </div>

      <div className="divide-y divide-[rgba(26,31,54,0.06)]">
        {appointments.map((appt, idx) => (
          <div key={idx} className="flex items-center gap-3 py-3 last:pb-0 first:pt-0">
            {/* Avatar */}
            <div className="w-10 h-10 rounded-full bg-[#F5F0EB] text-[#1A1F36] 
                            font-bold text-xs flex items-center justify-center flex-shrink-0 select-none">
              {appt.initials}
            </div>
            
            {/* Info */}
            <div className="flex-1 min-w-0">
              <p className="text-[#1A1F36] text-sm font-semibold truncate">{appt.name}</p>
              <p className="text-[#8896A4] text-xs">{appt.role}</p>
            </div>

            {/* Action — replace raw "NOT SCHEDULED" text */}
            {appt.scheduled ? (
              <div className="text-right flex-shrink-0 flex items-center gap-2">
                <div>
                  <p className="text-[#1A1F36] text-xs font-semibold">{appt.date}</p>
                  <p className="text-[#8896A4] text-[11px]">{appt.time}</p>
                </div>
                <Link 
                  href={appt.linkUrl}
                  className="bg-[#1A1F36] text-white p-1.5 rounded-full hover:bg-[#C4622D] transition-colors shadow-sm"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 10-4 4 6 6 4-16-18 7 4 2 2 6 3-4"/></svg>
                </Link>
              </div>
            ) : (
              <button 
                onClick={() => appt.type && onBookClick(appt.type)}
                disabled={appt.name === 'Not Assigned'}
                className="flex-shrink-0 text-[11px] font-semibold text-[#C4622D] 
                           border border-[rgba(196,98,45,0.3)] px-3 py-1.5 rounded-full 
                           hover:bg-[rgba(196,98,45,0.06)] transition-colors whitespace-nowrap cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Book Now
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
