'use client'

import React from 'react'
import Link from 'next/link'

interface UpcomingAppointmentsProps {
  bookingDate?: string
  bookingTime?: string
  physicianName: string
  dietitianName: string
  nutritionistName?: string
  fitnessCoachName?: string
  trainerName: string
  consultations: Array<{ id?: string; status?: string | null }>
  staffConsultations: Array<{
    id?: string
    staff_role?: string | null
    booking_date?: string | null
    booking_time?: string | null
    status?: string | null
  }>
  onBookClick: (type: 'dietitian' | 'nutritionist' | 'fitness_coach') => void
}

export default function UpcomingAppointments({
  bookingDate,
  bookingTime,
  physicianName,
  dietitianName,
  nutritionistName,
  fitnessCoachName,
  trainerName,
  consultations,
  staffConsultations,
  onBookClick
}: UpcomingAppointmentsProps) {
  const [now] = React.useState(() => Date.now())
  const scheduledStatuses = ['scheduled', 'calling', 'attended']
  const terminalStatuses = ['completed', 'cancelled', 'cancelled_by_doctor', 'cancelled_by_patient', 'missed_by_patient']
  const getConsult = (role: string) => staffConsultations.find(c => {
    const normalized = c.staff_role === 'trainer' ? 'fitness_coach' : c.staff_role
    return normalized === role && scheduledStatuses.includes(String(c.status || '').toLowerCase())
  })
  const canJoin = (date?: string | null, time?: string | null, status?: string | null) => {
    if (!date || !time || terminalStatuses.includes(String(status || '').toLowerCase())) return false
    const start = new Date(`${date} ${time}`).getTime()
    return Number.isFinite(start) && now >= start - 15 * 60 * 1000
  }

  const dietitianConsult = getConsult('dietitian')
  const nutritionistConsult = getConsult('nutritionist')
  const fitnessConsult = getConsult('fitness_coach')
  const doctorConsult = consultations.find(c => scheduledStatuses.includes(String(c.status || '').toLowerCase()))

  const appointments = [
    {
      name: physicianName || 'Not Assigned',
      role: 'Physician Specialist',
      initials: (physicianName || '').split(' ').filter(Boolean).map(n => n[0]).join('').substring(0, 2).toUpperCase() || '-',
      scheduled: !!(bookingDate && bookingTime),
      date: bookingDate || '',
      time: bookingTime || '',
      linkUrl: doctorConsult?.id ? `/patient/consultation/room?id=${encodeURIComponent(doctorConsult.id)}` : '',
      status: doctorConsult?.status,
      canJoin: canJoin(bookingDate, bookingTime, doctorConsult?.status)
    },
    {
      name: dietitianName || 'Not Assigned',
      role: 'Dietitian Coach',
      type: 'dietitian' as const,
      initials: (dietitianName || '').split(' ').filter(Boolean).map(n => n[0]).join('').substring(0, 2).toUpperCase() || '-',
      scheduled: !!dietitianConsult,
      date: dietitianConsult?.booking_date || '',
      time: dietitianConsult?.booking_time || '',
      linkUrl: dietitianConsult?.id ? `/patient/consultation/room?id=${encodeURIComponent(dietitianConsult.id)}` : '',
      status: dietitianConsult?.status,
      canJoin: canJoin(dietitianConsult?.booking_date, dietitianConsult?.booking_time, dietitianConsult?.status)
    },
    {
      name: nutritionistName || 'Not Assigned',
      role: 'Nutritionist',
      type: 'nutritionist' as const,
      initials: (nutritionistName || '').split(' ').filter(Boolean).map(n => n[0]).join('').substring(0, 2).toUpperCase() || '-',
      scheduled: !!nutritionistConsult,
      date: nutritionistConsult?.booking_date || '',
      time: nutritionistConsult?.booking_time || '',
      linkUrl: nutritionistConsult?.id ? `/patient/consultation/room?id=${encodeURIComponent(nutritionistConsult.id)}` : '',
      status: nutritionistConsult?.status,
      canJoin: canJoin(nutritionistConsult?.booking_date, nutritionistConsult?.booking_time, nutritionistConsult?.status)
    },
    {
      name: fitnessCoachName || trainerName || 'Not Assigned',
      role: 'Fitness Coach',
      type: 'fitness_coach' as const,
      initials: (fitnessCoachName || trainerName || '').split(' ').filter(Boolean).map(n => n[0]).join('').substring(0, 2).toUpperCase() || '-',
      scheduled: !!fitnessConsult,
      date: fitnessConsult?.booking_date || '',
      time: fitnessConsult?.booking_time || '',
      linkUrl: fitnessConsult?.id ? `/patient/consultation/room?id=${encodeURIComponent(fitnessConsult.id)}` : '',
      status: fitnessConsult?.status,
      canJoin: canJoin(fitnessConsult?.booking_date, fitnessConsult?.booking_time, fitnessConsult?.status)
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
                {appt.canJoin && appt.linkUrl ? (
                  <Link
                    href={appt.linkUrl}
                    className="p-1.5 rounded-full transition-colors shadow-sm bg-[#1A1F36] text-white hover:bg-[#C4622D]"
                    title="Join consultation"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 10-4 4 6 6 4-16-18 7 4 2 2 6 3-4"/></svg>
                  </Link>
                ) : (
                  <span
                    aria-disabled="true"
                    className="p-1.5 rounded-full transition-colors shadow-sm bg-[#E8DED4] text-[#8896A4]"
                    title="Join opens 15 minutes before appointment"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 10-4 4 6 6 4-16-18 7 4 2 2 6 3-4"/></svg>
                  </span>
                )}
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
