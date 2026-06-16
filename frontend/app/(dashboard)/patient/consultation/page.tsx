'use client'

import React, { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Calendar as CalendarIcon, Clock, Video, User, ChevronLeft, ChevronRight, BellRing, PhoneCall } from 'lucide-react'
import { usePatientData } from '@/hooks/usePatientData'
import { supabase } from '@/lib/supabaseClient'

export default function ConsultationSchedulingPage() {
  const router = useRouter()
  const { assessment, consultation, reloadData } = usePatientData()
  
  const [selectedDoctor, setSelectedDoctor] = useState('')
  const [bookingDate, setBookingDate] = useState('')
  const [bookingTime, setBookingTime] = useState('')
  const [loading, setLoading] = useState(false)
  const [countdownText, setCountdownText] = useState('')
  const [isJoinEnabled, setIsJoinEnabled] = useState(false)

  // Real-time calling alert state
  const [doctorCallingAlert, setDoctorCallingAlert] = useState<{ roomUrl: string; consultationId: string } | null>(null)
  const callingAudioRef = useRef<HTMLAudioElement | null>(null)

  const activeBookingDate = assessment?.booking_date
  const activeBookingTime = assessment?.booking_time

  // Doctors list (loaded dynamically from database with fallback)
  const [doctors, setDoctors] = useState<any[]>([])

  // Times slots (loaded dynamically from doctor availability table with fallback)
  const [slots, setSlots] = useState<any[]>([])

  // Past consultations (loaded dynamically from database with fallback)
  const [pastConsultations, setPastConsultations] = useState<any[]>([])

  // 1. Fetch real clinicians from the database
  useEffect(() => {
    const fetchClinicians = async () => {
      try {
        const { data, error } = await supabase
          .from('doctor_profiles')
          .select('id, full_name, specialty')
        if (data && data.length > 0) {
          const mappedDoctors = data.map(d => ({
            name: d.full_name,
            role: d.specialty || 'Physician Specialist',
            initials: d.full_name.split(' ').map((n: string) => n[0]).join('').substring(0, 2).toUpperCase()
          }))
          setDoctors(mappedDoctors)
          if (mappedDoctors.length > 0) setSelectedDoctor(mappedDoctors[0].name)
        }
      } catch (e) {
        console.error("Error fetching clinicians:", e)
      }
    }
    fetchClinicians()
  }, [])

  // 2. Fetch slots dynamically based on date and clinician availability
  useEffect(() => {
    if (!bookingDate) return

    const fetchSlots = async () => {
      try {
        let query = supabase.from('doctor_availability').select('*').eq('available_date', bookingDate)
        
        // Find matching doctor ID if available
        const { data: doc } = await supabase
          .from('doctor_profiles')
          .select('id')
          .eq('full_name', selectedDoctor)
          .maybeSingle()

        if (doc) {
          query = query.eq('doctor_id', doc.id)
        }

        const { data, error } = await query
        if (data && data.length > 0) {
          setSlots(data.map(s => ({
            time: s.time_slot,
            booked: s.is_booked
          })))
        }
      } catch (e) {
        console.error("Error fetching slots:", e)
      }
    }
    fetchSlots()
  }, [bookingDate, selectedDoctor])

  // 3. Fetch past consultations dynamically from the database
  useEffect(() => {
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
          setPastConsultations(data.map(c => ({
            doctor: c.doctor_profiles?.full_name || 'Clinician',
            date: c.booking_date ? new Date(c.booking_date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : 'Unknown Date',
            duration: '20 mins',
            notes: c.consultation_notes || 'Consultation completed successfully.'
          })))
        }
      } catch (e) {
        console.error("Error fetching past consultations:", e)
      }
    }
    fetchPastConsultations()
  }, [])

  // ── Real-time: Listen for doctor starting the call ──────────────────────────
  useEffect(() => {
    let channel: ReturnType<typeof supabase.channel> | null = null
    let active = true

    const setupRealtime = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session || !active) return

      const patientId = session.user.id
      const channelName = `patient-call-alert-${patientId}`

      // Remove channel if already cached and subscribed
      const existingChannel = supabase.getChannels().find((c: any) => c.topic === channelName || c.name === channelName)
      if (existingChannel) {
        await supabase.removeChannel(existingChannel)
      }

      if (!active) return

      channel = supabase
        .channel(channelName)
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'doctor_consultations',
            filter: `patient_id=eq.${patientId}`,
          },
          (payload) => {
            const updated = payload.new as any
            if (updated.status === 'calling' && updated.room_url) {
              setDoctorCallingAlert({ roomUrl: updated.room_url, consultationId: updated.id })
              // Play a subtle notification sound if browser allows
              try {
                if (!callingAudioRef.current) {
                  callingAudioRef.current = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2ozEy5p')
                }
                callingAudioRef.current.play().catch(() => {})
              } catch {}
            } else if (updated.status === 'attended' || updated.status === 'completed') {
              setDoctorCallingAlert(null)
            }
          }
        )

      channel.subscribe()
    }

    setupRealtime()

    return () => {
      active = false
      if (channel) supabase.removeChannel(channel)
    }
  }, [])

  // Simple calendar render
  const daysInMonth = Array.from({ length: 30 }, (_, i) => i + 1)
  const currentMonth = 'June'
  const currentYear = '2026'

  // Live countdown timer check
  useEffect(() => {
    if (!activeBookingDate || !activeBookingTime) {
      setCountdownText('No upcoming consultations')
      setIsJoinEnabled(false)
      return
    }

    const interval = setInterval(() => {
      try {
        // Parse "2026-06-15" and "10:00 AM" into local Date object
        const timePart = activeBookingTime.trim() // "10:00 AM"
        const isPM = timePart.toLowerCase().includes('pm')
        const [hourStr, minStr] = timePart.replace(/(am|pm)/i, '').trim().split(':')
        
        let hr = parseInt(hourStr)
        const mn = parseInt(minStr)
        if (isPM && hr < 12) hr += 12
        if (!isPM && hr === 12) hr = 0

        const apptDateTime = new Date(`${activeBookingDate}T${hr.toString().padStart(2, '0')}:${mn.toString().padStart(2, '0')}:00`)
        const now = new Date()
        
        const diffMs = apptDateTime.getTime() - now.getTime()
        
        if (diffMs <= 0) {
          // Check if meeting recently started (less than 1 hour ago)
          if (Math.abs(diffMs) < 3600000) {
            setCountdownText('Live Now')
            setIsJoinEnabled(true)
          } else {
            setCountdownText('Passed')
            setIsJoinEnabled(false)
          }
        } else {
          const hours = Math.floor(diffMs / 3600000)
          const mins = Math.floor((diffMs % 3600000) / 60000)
          
          setCountdownText(`Starts in ${hours}h ${mins}m`)
          
          // Enable join button 15 minutes before the start time
          if (diffMs <= 900000) {
            setIsJoinEnabled(true)
          } else {
            setIsJoinEnabled(false)
          }
        }
      } catch (e) {
        setCountdownText('Calculation error')
      }
    }, 1000)

    return () => clearInterval(interval)
  }, [activeBookingDate, activeBookingTime])

  const handleConfirmBooking = async () => {
    if (!bookingDate || !bookingTime) {
      alert("Please select a date and time slot first.")
      return
    }

    setLoading(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return

      // Call Next.js backend to create the real Daily.co room
      const roomRes = await fetch('/api/daily/create-room', { method: 'POST' });
      const roomData = await roomRes.json();
      const roomUrl = roomData.url || `https://8liv.daily.co/consultation-fallback`;

      const { error } = await supabase
        .from('health_assessments')
        .update({
          booking_date: bookingDate,
          booking_time: bookingTime,
          room_url: roomUrl
        })
        .eq('patient_id', session.user.id)

      if (error) throw error

      // Also create a pending/scheduled consultation entry for doctor dashboard discovery
      const { error: consultError } = await supabase
        .from('doctor_consultations')
        .insert({
          patient_id: session.user.id,
          booking_date: bookingDate,
          booking_time: bookingTime,
          room_url: roomUrl,
          status: 'scheduled',
          is_completed: false
        })

      if (consultError) throw consultError

      // ── Insert notification for scheduling consultation ──
      const { error: notifErr } = await supabase
        .from('patient_notifications')
        .insert({
          patient_id: session.user.id,
          type: 'consultation',
          title: 'Consultation Scheduled',
          message: `Your video consultation is successfully scheduled on ${bookingDate} at ${bookingTime}.`,
          is_read: false
        })

      if (notifErr) {
        console.error('Failed to log consultation notification:', notifErr.message)
      }

      alert("Consultation booked successfully! 🗓️")
      setBookingDate('')
      setBookingTime('')
      reloadData()
    } catch (err: any) {
      alert("Error booking slot: " + err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleDateClick = (day: number) => {
    const monthIndex = 5 // June (0-indexed = May, 5 = June)
    const formattedDate = `${currentYear}-06-${day.toString().padStart(2, '0')}`
    setBookingDate(formattedDate)
  }



  return (
    <div className="space-y-6 text-[#1A1F36]">
      {/* ── REAL-TIME DOCTOR CALLING ALERT BANNER ── */}
      {doctorCallingAlert && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-3xl p-8 max-w-sm w-full shadow-2xl text-center space-y-5 animate-bounce-once">
            <div className="w-20 h-20 bg-gradient-to-tr from-[#C4622D] to-orange-400 rounded-full flex items-center justify-center mx-auto shadow-lg animate-pulse">
              <PhoneCall className="w-10 h-10 text-white" />
            </div>
            <div>
              <span className="text-[10px] font-black uppercase tracking-wider text-[#C4622D] bg-[#C4622D]/10 px-3 py-1 rounded-full">Live Call</span>
              <h3 className="text-xl font-bold font-sora text-[#1A1F36] mt-3">Your Doctor is Calling!</h3>
              <p className="text-xs text-[#8896A4] font-medium mt-2">
                Your physician has started the consultation session. Join now to avoid waiting.
              </p>
            </div>
            <div className="flex flex-col gap-3">
              <button
                onClick={() => {
                  router.push(`/patient/consultation/room?id=${encodeURIComponent(doctorCallingAlert.roomUrl)}`)
                  setDoctorCallingAlert(null)
                }}
                className="w-full bg-[#C4622D] hover:bg-[#A8522A] text-white font-bold py-4 rounded-2xl text-sm transition-all shadow-lg shadow-[#C4622D]/20 flex items-center justify-center gap-2 animate-pulse"
              >
                <Video className="w-5 h-5" /> Join Consultation Now
              </button>
              <button
                onClick={() => setDoctorCallingAlert(null)}
                className="text-xs text-[#8896A4] hover:text-[#1A1F36] font-semibold transition-colors"
              >
                Dismiss (I\'ll join later)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div>
        <h2 className="text-xl font-bold font-sora">Schedule consultations</h2>
        <p className="text-xs text-[#8896A4] font-medium">Book medical appointments and access your live clinic calls.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left column: Schedule form */}
        <div className="bg-white rounded-2xl p-6 shadow-[0_2px_12px_rgba(26,31,54,0.08)] border border-[#1A1F36]/6 space-y-6">
          <h3 className="font-bold text-base font-sora">1. Select Clinician</h3>
          
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {doctors.length === 0 ? (
              <p className="text-xs text-[#8896A4] col-span-3 py-4 text-center border border-dashed rounded-xl">No clinicians available</p>
            ) : doctors.map(doc => {
              const isSelected = selectedDoctor === doc.name
              return (
                <div
                  key={doc.name}
                  onClick={() => setSelectedDoctor(doc.name)}
                  className={`p-4 rounded-2xl border cursor-pointer transition-all flex flex-col items-center text-center gap-2 select-none ${
                    isSelected 
                      ? 'border-[#C4622D] bg-[#C4622D]/5' 
                      : 'border-[#1A1F36]/8 hover:border-[#1A1F36]/20'
                  }`}
                >
                  <div className={`w-9 h-9 rounded-full font-bold text-xs flex items-center justify-center ${
                    isSelected ? 'bg-[#C4622D] text-white' : 'bg-[#F5F0EB] text-[#1A1F36]'
                  }`}>
                    {doc.initials}
                  </div>
                  <div>
                    <h4 className="text-xs font-bold font-sora">{doc.name}</h4>
                    <p className="text-[9px] text-[#8896A4] font-medium mt-0.5">{doc.role}</p>
                  </div>
                </div>
              )
            })}
          </div>

          <hr className="border-[#1A1F36]/8" />
          
          <h3 className="font-bold text-base font-sora">2. Select Date (June)</h3>
          
          {/* Simple CSS Grid calendar */}
          <div className="grid grid-cols-7 gap-y-2 justify-items-center">
            {daysInMonth.map(day => {
              const formatted = `${currentYear}-06-${day.toString().padStart(2, '0')}`
              const isSelected = bookingDate === formatted
              const isPast = day < new Date().getDate() && new Date().getMonth() === 5 // June mock check
              return (
                <button
                  key={day}
                  disabled={isPast}
                  onClick={() => handleDateClick(day)}
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold transition-all cursor-pointer ${
                    isPast 
                      ? 'text-[#8896A4]/40 cursor-not-allowed line-through'
                      : isSelected 
                        ? 'bg-[#C4622D] text-white shadow-sm font-extrabold'
                        : 'hover:bg-[#F5F0EB] text-[#1A1F36]'
                  }`}
                >
                  {day}
                </button>
              )
            })}
          </div>

          {bookingDate && (
            <>
              <hr className="border-[#1A1F36]/8" />
              <h3 className="font-bold text-base font-sora">3. Select Time</h3>
              <div className="flex flex-wrap gap-2">
                {slots.length === 0 ? (
                  <p className="text-xs text-[#8896A4] py-2 w-full text-center">No time slots available for this date.</p>
                ) : slots.map(s => {
                  const isSelected = bookingTime === s.time
                  return (
                    <button
                      key={s.time}
                      disabled={s.booked}
                      onClick={() => setBookingTime(s.time)}
                      className={`px-4 py-2 rounded-full text-xs font-bold transition-all border cursor-pointer ${
                        s.booked 
                          ? 'bg-[#F5F0EB] border-[#1A1F36]/8 text-[#8896A4]/60 line-through cursor-not-allowed'
                          : isSelected 
                            ? 'bg-[#C4622D] text-white border-[#C4622D] shadow-sm'
                            : 'border-[#1A1F36]/15 hover:border-[#C4622D] hover:text-[#C4622D]'
                      }`}
                    >
                      {s.time}
                    </button>
                  )
                })}
              </div>
            </>
          )}

          <button
            onClick={handleConfirmBooking}
            disabled={!bookingDate || !bookingTime || loading}
            className="w-full bg-[#1A1F36] hover:bg-[#C4622D] text-white font-bold uppercase tracking-wider text-xs rounded-full py-4 transition-all cursor-pointer disabled:opacity-50"
          >
            {loading ? "Confirming slot..." : "Confirm Consultation Appointment"}
          </button>
        </div>

        {/* Right column: Next consultation detail + past calls */}
        <div className="space-y-6">
          {/* Active Call Alert box */}
          <div className="bg-[#1A1F36] rounded-2xl p-6 text-white border border-white/5 relative overflow-hidden select-none">
            <div className="absolute top-0 right-0 w-32 h-32 bg-[#C4622D]/15 rounded-full blur-2xl pointer-events-none" />
            <div className="space-y-5 relative z-10">
              <span className="text-[10px] font-black uppercase tracking-wider text-white/50">Next Consultation</span>
              
              {activeBookingDate && activeBookingTime ? (
                <>
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-white/10 text-white font-black text-sm flex items-center justify-center shrink-0">
                      PS
                    </div>
                    <div>
                      <h4 className="font-bold text-sm font-sora">
                        {consultation?.doctor_profiles?.full_name || 'Assigned Clinician'}
                      </h4>
                      <p className="text-white/60 text-xs mt-0.5">Physician Specialist</p>
                    </div>
                  </div>

                  <div className="space-y-1 pt-1">
                    <p className="text-xl font-bold font-sora">{activeBookingDate}</p>
                    <p className="text-sm font-semibold text-white/70">{activeBookingTime} • Video Call</p>
                  </div>

                  <div className="bg-[#C4622D]/20 text-[#C4622D] border border-[#C4622D]/35 rounded-xl px-4 py-2.5 text-xs font-bold uppercase tracking-wider flex items-center gap-2 select-none w-fit">
                    <Clock className="w-4 h-4 text-[#C4622D]" />
                    <span>{countdownText}</span>
                  </div>

                  <div className="pt-2">
                    <Link
                      href="/patient/consultation/room"
                      className={`w-full text-center rounded-xl py-3.5 text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 shadow-md shadow-[#C4622D]/10 cursor-pointer ${
                        isJoinEnabled 
                          ? 'bg-[#C4622D] hover:bg-[#A8522A] text-white animate-pulse' 
                          : 'bg-white/10 text-white/30 border border-white/5 cursor-not-allowed pointer-events-none'
                      }`}
                    >
                      <Video className="w-4 h-4 shrink-0" /> Join Call Room
                    </Link>
                    {!isJoinEnabled && (
                      <p className="text-[10px] text-white/40 mt-2 text-center">
                        Join button will activate 15 minutes before the session starts.
                      </p>
                    )}
                  </div>
                </>
              ) : (
                <div className="py-6 text-center space-y-3">
                  <p className="text-xs text-white/50 leading-relaxed max-w-xs mx-auto">
                    You have no scheduled video clinical consultations. Please book a slot using the form on the left.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Past Consultations history logs */}
          <div className="space-y-3">
            <h3 className="font-bold text-base font-sora">Past Session Summaries</h3>
            {pastConsultations.length === 0 ? (
              <div className="bg-white rounded-2xl p-6 border border-[#1A1F36]/6 shadow-sm text-center">
                <p className="text-xs text-[#8896A4] font-medium">No past sessions found.</p>
              </div>
            ) : pastConsultations.map((p, idx) => (
              <div key={idx} className="bg-white rounded-2xl p-4 border border-[#1A1F36]/6 shadow-sm space-y-2.5">
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="text-xs font-bold">{p.doctor}</h4>
                    <p className="text-[9px] text-[#8896A4] font-semibold mt-0.5">{p.date} • {p.duration}</p>
                  </div>
                  <span className="bg-[#5C7A6B]/10 text-[#5C7A6B] text-[9px] font-bold px-2 py-0.5 rounded-full uppercase">
                    Concluded
                  </span>
                </div>
                <p className="text-[10px] text-[#8896A4] italic leading-relaxed border-t border-[#1A1F36]/5 pt-2">
                  " {p.notes} "
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
