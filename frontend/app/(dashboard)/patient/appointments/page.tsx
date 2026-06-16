'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { Calendar as CalendarIcon, Video, AlertCircle, CheckCircle2, ChevronLeft, ChevronRight, X, Dumbbell, Apple } from 'lucide-react'
import { usePatientData } from '@/hooks/usePatientData'
import { supabase } from '@/lib/supabaseClient'

export default function AppointmentsPage() {
  const { assessment, consultation, staffConsultations, reloadData } = usePatientData()
  const [activeTab, setActiveTab] = useState<'upcoming' | 'past'>('upcoming')
  const [showCancelModal, setShowCancelModal] = useState(false)
  const [cancelling, setCancelling] = useState(false)

  const [pastConsultations, setPastConsultations] = useState<any[]>([
    { doctor: 'Dr. Priya Sharma', date: 'May 28, 2026', day: '28', month: 'MAY', notes: 'Initial intake completed. Commenced standard therapy program.' }
  ])

  // Fetch past completed consultations dynamically
  React.useEffect(() => {
    const fetchPastConsultations = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (!session) return

        const { data, error } = await supabase
          .from('doctor_consultations')
          .select('*, doctor_profiles(full_name)')
          .eq('patient_id', session.user.id)
          .eq('is_completed', true)
          .order('created_at', { ascending: false })

        if (data && data.length > 0) {
          setPastConsultations(data.map(c => {
            const dateObj = new Date(c.booking_date || c.created_at)
            return {
              doctor: c.doctor_profiles?.full_name || 'Clinician Specialist',
              date: dateObj.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }),
              day: dateObj.getDate().toString(),
              month: dateObj.toLocaleDateString('en-US', { month: 'short' }).toUpperCase(),
              notes: c.consultation_notes || 'Metabolic consultation concluded successfully.'
            }
          }))
        }
      } catch (e) {
        console.error("Error fetching past consultations:", e)
      }
    }
    fetchPastConsultations()
  }, [])

  const bookingDate = assessment?.booking_date
  const bookingTime = assessment?.booking_time

  const physicianName = consultation?.doctor_profiles?.full_name 
    ? consultation.doctor_profiles.full_name
    : 'Physician Specialist'

  // Filter staff consultations into upcoming (scheduled) and past (completed)
  const upcomingStaffSessions = (staffConsultations || []).filter(
    (s: any) => s.status === 'scheduled'
  )
  const pastStaffSessions = (staffConsultations || []).filter(
    (s: any) => s.status === 'completed'
  )

  const getRoleIcon = (role: string) => {
    if (role === 'trainer') return <Dumbbell className="w-4 h-4" />
    if (role === 'dietitian') return <Apple className="w-4 h-4" />
    return <CalendarIcon className="w-4 h-4" />
  }

  const getRoleLabel = (role: string) => {
    if (role === 'trainer') return 'Fitness Trainer'
    if (role === 'dietitian') return 'Dietitian'
    return 'Staff'
  }

  const getRoleColor = (role: string) => {
    if (role === 'trainer') return { bg: 'bg-[#C4622D]/10', text: 'text-[#C4622D]' }
    if (role === 'dietitian') return { bg: 'bg-[#5C7A6B]/10', text: 'text-[#5C7A6B]' }
    return { bg: 'bg-[#8896A4]/10', text: 'text-[#8896A4]' }
  }

  const handleCancelAppointment = async () => {
    setCancelling(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return

      const { error } = await supabase
        .from('health_assessments')
        .update({
          booking_date: null,
          booking_time: null
        })
        .eq('patient_id', session.user.id)

      if (error) throw error

      alert("Appointment cancelled successfully.")
      setShowCancelModal(false)
      reloadData()
    } catch (err: any) {
      alert("Failed to cancel appointment: " + err.message)
    } finally {
      setCancelling(false)
    }
  }

  // Calendar render helpers
  const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
  const daysInMonth = Array.from({ length: 30 }, (_, i) => i + 1)
  
  // Custom helper to mock active dates on calendar
  const getDayStatus = (day: number) => {
    if (bookingDate) {
      const apptDay = new Date(bookingDate).getDate()
      const apptMonthIndex = new Date(bookingDate).getMonth()
      const currentMonthIndex = new Date().getMonth()
      if (day === apptDay && apptMonthIndex === currentMonthIndex) {
        return 'appointment'
      }
    }
    
    // Mock dietitian date: day 10, fitness: day 11
    if (day === 10 || day === 11) return 'appointment'
    
    if (day === new Date().getDate()) return 'today'
    return 'none'
  }

  return (
    <div className="space-y-6 text-[#1A1F36]">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold font-sora">My Consultations</h2>
          <p className="text-xs text-[#8896A4] font-medium">View calendar schedule and join video clinics.</p>
        </div>
        <Link
          href="/patient/consultation"
          className="bg-[#1A1F36] text-white rounded-full px-6 py-3 hover:bg-[#C4622D] transition-colors font-semibold text-sm flex items-center justify-center gap-1.5 shrink-0"
        >
          <CalendarIcon className="w-4 h-4" /> Book New Session
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Monthly Calendar (col-span-2) */}
        <div className="lg:col-span-2 bg-white rounded-2xl p-6 shadow-[0_2px_12px_rgba(26,31,54,0.08)] border border-[#1A1F36]/6">
          <div className="flex justify-between items-center mb-6">
            <h3 className="font-bold text-base font-sora">Calendar Overview</h3>
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold">June 2026</span>
              <div className="flex items-center gap-1">
                <button className="p-1.5 hover:bg-[#F5F0EB] rounded-lg border border-[#1A1F36]/12"><ChevronLeft className="w-4 h-4" /></button>
                <button className="p-1.5 hover:bg-[#F5F0EB] rounded-lg border border-[#1A1F36]/12"><ChevronRight className="w-4 h-4" /></button>
              </div>
            </div>
          </div>

          {/* Calendar Grid */}
          <div className="space-y-2">
            <div className="grid grid-cols-7 text-center text-xs font-bold text-[#8896A4] uppercase tracking-wider mb-2">
              {daysOfWeek.map(d => <div key={d}>{d}</div>)}
            </div>
            
            <div className="grid grid-cols-7 gap-y-3 justify-items-center">
              {/* Offset days for June 1 2026 starting on Monday (1 offset) */}
              <div className="text-transparent">0</div>
              
              {daysInMonth.map(day => {
                const status = getDayStatus(day)
                return (
                  <button
                    key={day}
                    className={`w-9 h-9 rounded-full flex flex-col items-center justify-center text-sm font-semibold transition-all relative group cursor-pointer ${
                      status === 'today' 
                        ? 'bg-[#1A1F36] text-white' 
                        : status === 'appointment'
                          ? 'ring-2 ring-[#C4622D] text-[#C4622D] bg-[#C4622D]/5 font-extrabold'
                          : 'hover:bg-[#F5F0EB] text-[#1A1F36]'
                    }`}
                  >
                    <span>{day}</span>
                    {status === 'appointment' && (
                      <span className="absolute bottom-1 w-1.5 h-1.5 bg-[#C4622D] rounded-full" />
                    )}
                  </button>
                )
              })}
            </div>
          </div>
        </div>

        {/* Right: Appointments List (col-span-1) */}
        <div className="lg:col-span-1 flex flex-col gap-4">
          {/* Tab Selection */}
          <div className="bg-white rounded-xl p-1.5 border border-[#1A1F36]/8 shadow-sm flex items-center justify-around">
            <button
              onClick={() => setActiveTab('upcoming')}
              className={`flex-1 text-center py-2.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
                activeTab === 'upcoming' 
                  ? 'bg-[#1A1F36] text-white shadow-sm' 
                  : 'text-[#8896A4] hover:text-[#1A1F36]'
              }`}
            >
              Upcoming
            </button>
            <button
              onClick={() => setActiveTab('past')}
              className={`flex-1 text-center py-2.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
                activeTab === 'past' 
                  ? 'bg-[#1A1F36] text-white shadow-sm' 
                  : 'text-[#8896A4] hover:text-[#1A1F36]'
              }`}
            >
              Past
            </button>
          </div>

          {/* List items */}
          <div className="space-y-4 flex-grow">
            {activeTab === 'upcoming' ? (
              <>
                {/* Doctor Consultation Card */}
                {bookingDate && bookingTime ? (
                  <div className="bg-white rounded-2xl p-5 shadow-[0_2px_12px_rgba(26,31,54,0.08)] border border-[#1A1F36]/6 flex flex-col justify-between space-y-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="bg-[#F5F0EB] rounded-xl p-3 text-center shrink-0 w-14 shadow-sm border border-[#1A1F36]/6">
                          <p className="text-[#1A1F36] font-extrabold text-lg font-sora leading-none">
                            {new Date(bookingDate).getDate()}
                          </p>
                          <p className="text-[#8896A4] text-[9px] font-bold uppercase tracking-wider mt-1">
                            {new Date(bookingDate).toLocaleDateString('en-IN', { month: 'short' })}
                          </p>
                        </div>
                        <div className="min-w-0">
                          <h4 className="text-[#1A1F36] font-bold text-sm leading-snug">
                            {physicianName}
                          </h4>
                          <span className="inline-block bg-[#C4622D]/10 text-[#C4622D] text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full mt-1.5">
                            GLP-1 Consultation
                          </span>
                        </div>
                      </div>
                      <span className="bg-[#5C7A6B]/10 text-[#5C7A6B] text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider">
                        Confirmed
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-xs border-t border-[#1A1F36]/8 pt-3 text-[#8896A4]">
                      <span>Time: <strong className="text-[#1A1F36] font-bold">{bookingTime}</strong></span>
                    </div>

                    <div className="flex flex-col gap-2 pt-2 border-t border-[#1A1F36]/8">
                      <Link
                        href="/patient/consultation/room"
                        className="bg-[#C4622D] hover:bg-[#A8522A] text-white text-center rounded-xl py-3 text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 shadow-md shadow-[#C4622D]/10 cursor-pointer"
                      >
                        <Video className="w-4 h-4 shrink-0" /> Join Call
                      </Link>
                      <div className="grid grid-cols-2 gap-2">
                        <Link
                          href="/patient/consultation"
                          className="border border-[#1A1F36]/12 text-[#1A1F36] hover:bg-[#1A1F36]/4 text-center rounded-xl py-2.5 text-xs font-bold uppercase tracking-wider cursor-pointer"
                        >
                          Reschedule
                        </Link>
                        <button
                          onClick={() => setShowCancelModal(true)}
                          className="border border-rose-500/20 text-rose-500 hover:bg-rose-50 text-center rounded-xl py-2.5 text-xs font-bold uppercase tracking-wider cursor-pointer"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="bg-white rounded-2xl p-8 border border-[#1A1F36]/6 shadow-[0_2px_12px_rgba(26,31,54,0.08)] text-center space-y-4">
                    <div className="w-12 h-12 rounded-full bg-[#C4622D]/10 text-[#C4622D] flex items-center justify-center mx-auto">
                      <CalendarIcon className="w-6 h-6" />
                    </div>
                    <div className="space-y-1.5">
                      <h4 className="font-bold text-sm font-sora">No Doctor Session Scheduled</h4>
                      <p className="text-xs text-[#8896A4] leading-relaxed">Secure your video clinic slot to obtain custom prescription instructions.</p>
                    </div>
                    <Link
                      href="/patient/consultation"
                      className="block bg-[#1A1F36] text-white font-bold text-xs uppercase tracking-wider rounded-xl py-3 shadow-md transition-colors cursor-pointer"
                    >
                      Schedule Consultation
                    </Link>
                  </div>
                )}

                {/* Staff Consultation Cards (Trainer / Dietitian) */}
                {upcomingStaffSessions.length > 0 && (
                  <div className="space-y-3 pt-1">
                    <p className="text-[10px] font-bold text-[#8896A4] uppercase tracking-wider">Staff Sessions</p>
                    {upcomingStaffSessions.map((session: any) => {
                      const roleColor = getRoleColor(session.staff_role)
                      const sessionDate = session.booking_date ? new Date(session.booking_date) : null
                      return (
                        <div key={session.id} className="bg-white rounded-2xl p-5 shadow-[0_2px_12px_rgba(26,31,54,0.08)] border border-[#1A1F36]/6 flex flex-col space-y-3">
                          <div className="flex items-start justify-between">
                            <div className="flex items-center gap-3">
                              <div className="bg-[#F5F0EB] rounded-xl p-3 text-center shrink-0 w-14 shadow-sm border border-[#1A1F36]/6">
                                {sessionDate ? (
                                  <>
                                    <p className="text-[#1A1F36] font-extrabold text-lg font-sora leading-none">
                                      {sessionDate.getDate()}
                                    </p>
                                    <p className="text-[#8896A4] text-[9px] font-bold uppercase tracking-wider mt-1">
                                      {sessionDate.toLocaleDateString('en-IN', { month: 'short' })}
                                    </p>
                                  </>
                                ) : (
                                  <div className={`flex items-center justify-center h-full ${roleColor.text}`}>
                                    {getRoleIcon(session.staff_role)}
                                  </div>
                                )}
                              </div>
                              <div className="min-w-0">
                                <h4 className="text-[#1A1F36] font-bold text-sm leading-snug">
                                  {getRoleLabel(session.staff_role)}
                                </h4>
                                <span className={`inline-block ${roleColor.bg} ${roleColor.text} text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full mt-1.5`}>
                                  {session.staff_role === 'trainer' ? 'Fitness Session' : 'Nutrition Session'}
                                </span>
                              </div>
                            </div>
                            <span className="bg-[#5C7A6B]/10 text-[#5C7A6B] text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider shrink-0">
                              Scheduled
                            </span>
                          </div>

                          {session.booking_time && (
                            <div className="flex items-center text-xs border-t border-[#1A1F36]/8 pt-3 text-[#8896A4]">
                              <span>Time: <strong className="text-[#1A1F36] font-bold">{session.booking_time}</strong></span>
                            </div>
                          )}

                          {session.room_url && (
                            <div className="pt-1 border-t border-[#1A1F36]/8">
                              <Link
                                href={session.room_url}
                                target="_blank"
                                className="bg-[#1A1F36] hover:bg-[#C4622D] text-white text-center rounded-xl py-3 text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 shadow-md transition-colors cursor-pointer w-full"
                              >
                                <Video className="w-4 h-4 shrink-0" /> Join Room
                              </Link>
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}
              </>
            ) : (
              /* Past Appointments list view */
              <div className="space-y-3">
                {/* Past Doctor Consultations */}
                {pastConsultations.map((appt, idx) => (
                  <div key={idx} className="bg-white rounded-2xl p-5 border border-[#1A1F36]/6 shadow-sm flex items-center justify-between opacity-80">
                    <div className="flex items-center gap-3">
                      <div className="bg-[#EDE8E3] rounded-xl p-3 text-center shrink-0 w-12 border border-[#1A1F36]/6 text-[#8896A4]">
                        <p className="font-bold text-sm leading-none">{appt.day}</p>
                        <p className="text-[8px] font-bold mt-1">{appt.month}</p>
                      </div>
                      <div>
                        <h4 className="text-[#1A1F36] text-xs font-bold">{appt.doctor}</h4>
                        <p className="text-[10px] text-[#8896A4] mt-0.5">{appt.date} • Concluded</p>
                      </div>
                    </div>
                    <span className="bg-[#5C7A6B]/10 text-[#5C7A6B] text-[9px] font-bold px-2 py-0.5 rounded-full uppercase">
                      Completed
                    </span>
                  </div>
                ))}

                {/* Past Staff Sessions (Trainer / Dietitian) */}
                {pastStaffSessions.map((session: any) => {
                  const sessionDate = session.booking_date ? new Date(session.booking_date) : (session.created_at ? new Date(session.created_at) : null)
                  const roleColor = getRoleColor(session.staff_role)
                  return (
                    <div key={session.id} className="bg-white rounded-2xl p-5 border border-[#1A1F36]/6 shadow-sm flex items-center justify-between opacity-80">
                      <div className="flex items-center gap-3">
                        <div className="bg-[#EDE8E3] rounded-xl p-3 text-center shrink-0 w-12 border border-[#1A1F36]/6 text-[#8896A4]">
                          {sessionDate ? (
                            <>
                              <p className="font-bold text-sm leading-none">{sessionDate.getDate()}</p>
                              <p className="text-[8px] font-bold mt-1">{sessionDate.toLocaleDateString('en-US', { month: 'short' }).toUpperCase()}</p>
                            </>
                          ) : (
                            <div className={`flex items-center justify-center ${roleColor.text}`}>
                              {getRoleIcon(session.staff_role)}
                            </div>
                          )}
                        </div>
                        <div>
                          <h4 className="text-[#1A1F36] text-xs font-bold">{getRoleLabel(session.staff_role)}</h4>
                          <p className="text-[10px] text-[#8896A4] mt-0.5">
                            {sessionDate ? sessionDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : ''} • Concluded
                          </p>
                        </div>
                      </div>
                      <span className="bg-[#5C7A6B]/10 text-[#5C7A6B] text-[9px] font-bold px-2 py-0.5 rounded-full uppercase">
                        Completed
                      </span>
                    </div>
                  )
                })}

                {pastConsultations.length === 0 && pastStaffSessions.length === 0 && (
                  <div className="bg-white rounded-2xl p-8 border border-[#1A1F36]/6 shadow-sm text-center opacity-70">
                    <p className="text-xs text-[#8896A4]">No past sessions found.</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Cancel Appointment Confirmation Modal */}
      {showCancelModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
          <div className="bg-white rounded-[2rem] border border-[#1A1F36]/8 p-8 max-w-sm w-full relative overflow-hidden shadow-2xl space-y-6 text-[#1A1F36] text-center">
            <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-500 flex items-center justify-center mx-auto">
              <AlertCircle className="w-6 h-6" />
            </div>
            <div className="space-y-2">
              <h3 className="text-lg font-bold font-sora">Cancel Consultation?</h3>
              <p className="text-xs text-[#8896A4] leading-relaxed">
                Are you sure you want to cancel your consultation booking? You will need to select a new slot from available clinical slots later.
              </p>
            </div>
            <div className="flex flex-col gap-2">
              <button
                onClick={handleCancelAppointment}
                disabled={cancelling}
                className="w-full bg-rose-600 hover:bg-rose-700 text-white rounded-xl py-3 text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer disabled:opacity-50"
              >
                {cancelling ? "Processing cancellation..." : "Yes, Cancel Booking"}
              </button>
              <button
                onClick={() => setShowCancelModal(false)}
                className="w-full bg-[#F5F0EB] hover:bg-[#EDE8E3] text-[#1A1F36] rounded-xl py-3 text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer"
              >
                Go Back
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
