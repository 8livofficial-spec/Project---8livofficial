'use client'

import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { Video, Scale, ArrowRight, X } from 'lucide-react'
import Link from 'next/link'
import { supabase } from '@/lib/supabaseClient'
import { usePatientData } from '@/hooks/usePatientData'
import OverviewCards from '@/components/patient/OverviewCards'
import WeightChart from '@/components/patient/WeightChart'
import UpcomingAppointments from '@/components/patient/UpcomingAppointments'
import MedicationCard from '@/components/patient/MedicationCard'
import MessagesPreview from '@/components/patient/MessagesPreview'
import ProgressRing from '@/components/patient/ProgressRing'
import QuickActions from '@/components/patient/QuickActions'
const getGreeting = () =>{
    const hour = new Date().getHours();
    if(hour>=5 && hour <12) return "Good morning";
    if(hour>=12 && hour <17) return "Good afternoon"
    if(hour >=17 && hour <21) return "Good evening"
    return "Welcome Back!!"
  } ;

type ProviderBookingSlot = {
  slotId?: string
  providerId?: string
  providerRole?: string
  date?: string
  startTime?: string
  endTime?: string
  status?: string
  source?: string
  available_date: string
  time_slot: string
}

const getProviderRoleLabel = (role?: 'dietitian' | 'nutritionist' | 'fitness_coach' | null) => {
  if (role === 'dietitian') return 'Dietitian'
  if (role === 'nutritionist') return 'Nutritionist'
  if (role === 'fitness_coach') return 'Fitness Coach'
  return 'Provider'
}

const formatSlotDate = (date: string) => {
  const parsed = new Date(`${date}T00:00:00`)
  if (Number.isNaN(parsed.getTime())) return date
  return parsed.toLocaleDateString('en-IN', { weekday: 'short', day: '2-digit', month: 'short' })
}

const formatSlotTime = (time: string) => {
  const [hourText, minuteText] = time.split(':')
  const hour = Number(hourText)
  const minute = Number(minuteText)
  if (!Number.isFinite(hour) || !Number.isFinite(minute)) return time
  const parsed = new Date()
  parsed.setHours(hour, minute, 0, 0)
  return parsed.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
}

export default function PatientDashboardHome() {
  const { 
    user,
    profile, 
    assessment, 
    weightLogs, 
    consultation, 
    consultations,
    staffConsultations,
    notifications, 
    careTeam,
    loading,
    reloadData 
  } = usePatientData()

  if (loading) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center text-[#C4622D]">
        <div className="w-10 h-10 border-4 border-current border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }


  const [showWeightLogModal, setShowWeightLogModal] = useState(false)
  const [newWeight, setNewWeight] = useState('')
  const [logLoading, setLogLoading] = useState(false)
  const [bookingModal, setBookingModal] = useState<{ isOpen: boolean, type: 'dietitian' | 'nutritionist' | 'fitness_coach' | null }>({ isOpen: false, type: null })
  const [bookingLoading, setBookingLoading] = useState(false)
  const [providerSlots, setProviderSlots] = useState<ProviderBookingSlot[]>([])
  const [providerSlotDates, setProviderSlotDates] = useState<string[]>([])
  const [selectedProviderDate, setSelectedProviderDate] = useState('')
  const [selectedProviderTime, setSelectedProviderTime] = useState('')
  const [providerSlotsLoading, setProviderSlotsLoading] = useState(false)
  const [providerSlotError, setProviderSlotError] = useState('')

  const patientName = profile?.first_name 
    ? profile.first_name 
    : assessment?.first_name 
      ? assessment.first_name 
      : user?.user_metadata?.display_id?.split(' ')[0]
        || user?.email?.split('@')[0]
        || 'Member'

  // Calculations — use real data only, never fake defaults
  const startWeight = assessment?.weight_kg ?? null
  const goalWeight = assessment?.goal_weight_kg ?? null
  const currentWeight = weightLogs.length > 0
    ? parseFloat(weightLogs[weightLogs.length - 1].weight_kg as any)
    : startWeight

  const weightLost = (startWeight !== null && currentWeight !== null)
    ? Math.max(0, startWeight - currentWeight)
    : null

  // Calculate program week dynamically based on created_at or updated_at date
  const getProgramWeek = (createdAtString?: string) => {
    if (!createdAtString) return 1
    const start = new Date(createdAtString)
    const now = new Date()
    const diffTime = Math.abs(now.getTime() - start.getTime())
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    const week = Math.ceil(diffDays / 7)
    return Math.min(12, Math.max(1, week))
  }

  const programWeek = assessment?.created_at ? getProgramWeek(assessment.created_at) : 1
  const totalWeeks = 12

  // Weight goal progress percent — only compute if we have real data
  const totalGoal = (startWeight !== null && goalWeight !== null) ? Math.abs(startWeight - goalWeight) : 0
  const currentLost = (startWeight !== null && currentWeight !== null) ? Math.abs(startWeight - currentWeight) : 0
  const weightGoalProgressPercent = totalGoal > 0
    ? Math.min(100, Math.round((currentLost / totalGoal) * 100))
    : 0

  // Parse active protocol details dynamically from doctor's consultation rows
  const prescriptionText = consultation?.prescription_text || ''
  const isMedicationApproved = !!consultation && consultation.status === 'approved'
  
  let medicationName = "Pending Prescription"
  let dosage = "-"
  
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

  const dosesTaken = consultation?.created_at ? getDosesTaken(consultation.created_at) : 0
  const totalDoses = 12

  const getNextRefillDetails = (approvedAtString?: string) => {
    if (!approvedAtString) return { date: 'Not scheduled', days: 0 }
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
    : { date: 'Not scheduled', days: 0 }

  const unreadMessages = notifications.filter(n => n.type === 'message' && !n.is_read).length

  const physicianName = careTeam?.doctor_name !== 'Not Assigned'
    ? careTeam.doctor_name
    : assessment?.booking_date
      ? 'Assigned Doctor'
      : 'Not Assigned'

  // Meeting notification / reminder check
  const bookingDateStr = assessment?.booking_date
  const bookingTimeStr = assessment?.booking_time
  let hasMeetingSoon = false
  let meetingReminderText = ''

  if (bookingDateStr) {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const bookingDateObj = new Date(bookingDateStr)
    bookingDateObj.setHours(0, 0, 0, 0)
    
    const isToday = bookingDateObj.toDateString() === new Date().toDateString()
    const isFuture = bookingDateObj.getTime() >= today.getTime()

    const options: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric', year: 'numeric' }
    const formattedDate = new Date(bookingDateStr).toLocaleDateString('en-US', options)
    
    if (isToday) {
      hasMeetingSoon = true
      meetingReminderText = `You have a video consultation scheduled for today at ${bookingTimeStr || 'your slot'}.`
    } else if (isFuture) {
      hasMeetingSoon = true
      meetingReminderText = `You have an upcoming video consultation scheduled on ${formattedDate} at ${bookingTimeStr || 'your slot'}.`
    }
  }

  const availableProviderTimes = useMemo(() => {
    return providerSlots
      .filter((slot) => slot.available_date === selectedProviderDate)
      .map((slot) => slot.time_slot)
  }, [providerSlots, selectedProviderDate])

  const selectedProviderId = bookingModal.type === 'dietitian'
    ? careTeam?.dietitian_id
    : bookingModal.type === 'nutritionist'
      ? careTeam?.nutritionist_id
      : bookingModal.type === 'fitness_coach'
        ? careTeam?.fitness_coach_id || careTeam?.trainer_id
        : null

  const loadProviderDates = useCallback(async (role: 'dietitian' | 'nutritionist' | 'fitness_coach', providerId: string) => {
    setProviderSlotsLoading(true)
    setProviderSlotError('')
    try {
      const { data: sessionData } = await supabase.auth.getSession()
      const token = sessionData.session?.access_token
      if (!token) throw new Error('Please sign in again.')
      const params = new URLSearchParams({ providerId, role: role.toUpperCase() })
      const res = await fetch(`/api/appointments/available-dates?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Unable to load available dates.')
      const dates = ((data.dates || []) as Array<{ date: string }>).map(item => item.date)
      setProviderSlotDates(dates)
      setSelectedProviderDate(dates[0] || '')
      setSelectedProviderTime('')
    } catch (err) {
      setProviderSlotDates([])
      setSelectedProviderDate('')
      setSelectedProviderTime('')
      setProviderSlotError(err instanceof Error ? err.message : 'Unable to load available dates.')
    } finally {
      setProviderSlotsLoading(false)
    }
  }, [])

  const loadProviderSlots = useCallback(async (role: 'dietitian' | 'nutritionist' | 'fitness_coach', providerId: string, date: string) => {
    setProviderSlotsLoading(true)
    setProviderSlotError('')
    try {
      const { data: sessionData } = await supabase.auth.getSession()
      const token = sessionData.session?.access_token
      if (!token) throw new Error('Please sign in again.')
      const params = new URLSearchParams({ providerId, role: role.toUpperCase(), date })
      const res = await fetch(`/api/appointments/available-slots?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Unable to load available slots.')
      setProviderSlots((data.slots || []).map((slot: Record<string, string>) => ({
        ...slot,
        available_date: slot.date,
        time_slot: slot.startTime,
      })))
      setSelectedProviderTime('')
    } catch (err) {
      setProviderSlots([])
      setSelectedProviderTime('')
      setProviderSlotError(err instanceof Error ? err.message : 'Unable to load available slots.')
    } finally {
      setProviderSlotsLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!bookingModal.isOpen || !bookingModal.type) return
    setProviderSlots([])
    setProviderSlotDates([])
    setSelectedProviderDate('')
    setSelectedProviderTime('')
    setProviderSlotError('')
    if (!selectedProviderId) {
      setProviderSlotError(`No assigned ${getProviderRoleLabel(bookingModal.type).toLowerCase()} found.`)
      return
    }
    loadProviderDates(bookingModal.type, selectedProviderId)
  }, [bookingModal.isOpen, bookingModal.type, selectedProviderId, loadProviderDates])

  useEffect(() => {
    if (!bookingModal.isOpen || !bookingModal.type || !selectedProviderDate || !selectedProviderId) return
    loadProviderSlots(bookingModal.type, selectedProviderId, selectedProviderDate)
  }, [bookingModal.isOpen, bookingModal.type, selectedProviderDate, selectedProviderId, loadProviderSlots])

  const handleLogWeightSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newWeight || isNaN(parseFloat(newWeight))) {
      alert("Please enter a valid weight.")
      return
    }

    setLogLoading(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return

      const { error } = await supabase
        .from('progress_logs')
        .insert({
          user_id: session.user.id,
          weight_kg: parseFloat(newWeight)
        })

      if (error) throw error

      // Also record this action in the patient's notification feed
      await supabase
        .from('patient_notifications')
        .insert({
          patient_id: session.user.id,
          type: 'progress',
          title: 'Weight Logged',
          message: `Logged daily weight of ${parseFloat(newWeight)} kg.`,
          is_read: false
        })

      alert("Weight logged successfully! ⚖️")
      setNewWeight('')
      setShowWeightLogModal(false)
      reloadData()
    } catch (err: any) {
      alert("Error logging weight: " + err.message)
    } finally {
      setLogLoading(false)
    }
  }

  const handleBookConsultation = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!bookingModal.type || !user?.id) return
    if (!selectedProviderDate || !selectedProviderTime) {
      setProviderSlotError('Please choose an available consultation slot.')
      return
    }
    
    setBookingLoading(true)
    setProviderSlotError('')
    try {
      const { data: sessionData } = await supabase.auth.getSession()
      const token = sessionData.session?.access_token
      if (!token) throw new Error('Please sign in again.')
      const res = await fetch('/api/patient/provider-consultations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          patientId: user.id,
          role: bookingModal.type,
          bookingDate: selectedProviderDate,
          bookingTime: selectedProviderTime
        })
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to book consultation')

      const roleLabel = getProviderRoleLabel(bookingModal.type)
      alert(`${roleLabel} meeting booked successfully for ${formatSlotDate(selectedProviderDate)} at ${formatSlotTime(selectedProviderTime)}.`)
      setBookingModal({ isOpen: false, type: null })
      setSelectedProviderDate('')
      setSelectedProviderTime('')
      reloadData({ force: true })
    } catch (err: any) {
      setProviderSlotError(err.message)
    } finally {
      setBookingLoading(false)
    }
  }

  const isGoldPlan = assessment?.membership_tier === 'Gold Plan'

  return (
    <div className="space-y-6 text-[#1A1F36]">
      {/* Meeting Reminder Alert */}
      {hasMeetingSoon && (
        <div className="bg-[#C4622D]/8 border border-[#C4622D]/20 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 animate-pulse-glow">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[#C4622D]/10 flex items-center justify-center text-[#C4622D] shrink-0">
              <Video size={18} className="animate-pulse" />
            </div>
            <div>
              <p className="text-sm font-bold text-[#1A1F36]">Upcoming Video Consultation</p>
              <p className="text-xs text-[#8896A4] mt-0.5">{meetingReminderText}</p>
            </div>
          </div>
          <Link 
            href="/patient/consultation"
            className="bg-[#C4622D] hover:bg-[#A8522A] text-white px-5 py-2 rounded-full text-xs font-bold transition-all shrink-0 text-center no-underline shadow-md shadow-[#C4622D]/15"
          >
            View Appointment Details
          </Link>
        </div>
      )}

      {/* 1. Welcome Banner - Modern & Simple */}
      <div className="bg-white rounded-3xl p-6 select-none border border-[#1A1F36]/6 shadow-[0_4px_20px_rgba(26,31,54,0.02)] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <span className="text-[#C4622D] text-xs font-black uppercase tracking-widest">
            Patient Portal
          </span>
          <h2 className="text-[#1A1F36] text-2xl font-black font-sora mt-1">
            {getGreeting()}, {patientName}
          </h2>
           <p className="text-[#8896A4] text-xs font-semibold mt-1 flex items-center gap-1.5">
            <span>Program Track:</span>
            <span className="text-[#1A1F36]">Week {programWeek} of {totalWeeks}</span>
            <span className="text-[#8896A4]/30">•</span>
            <span className="text-[#5C7A6B] bg-[#5C7A6B]/8 px-2.5 py-0.5 rounded-full text-[10px] font-bold">
              On Track 🎯
            </span>
          </p>
        </div>

        {/* CTA button */}
        <Link 
          href="/patient/consultation/room"
          className="flex-shrink-0 flex items-center gap-2 bg-[#1A1F36] text-white hover:bg-[#C4622D]
                     rounded-full px-6 py-3 font-bold text-xs uppercase tracking-wider
                     transition-all duration-300 self-start sm:self-center
                     shadow-md shadow-[#1A1F36]/10 no-underline hover:shadow-lg"
        >
          <Video size={13} />
          <span>Join Video Room</span>
        </Link>
      </div>

      {/* 2. Quick Action shortcuts */}
      <QuickActions onLogWeightClick={() => setShowWeightLogModal(true)} />

      {/* 3. Main Stats Grid */}
      <OverviewCards
        weightLost={weightLost}
        currentWeight={currentWeight}
        goalWeight={goalWeight}
        programWeek={programWeek}
        totalWeeks={totalWeeks}
        bookingDate={assessment?.booking_date || ''}
        bookingTime={assessment?.booking_time || ''}
      />

      {/* 4. Column Rows 1: Chart + Upcoming */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <div className="lg:col-span-2">
          <WeightChart logs={weightLogs} startWeight={startWeight ?? 0} />
        </div>
        <div className="lg:col-span-1">
          <UpcomingAppointments
            bookingDate={assessment?.booking_date}
            bookingTime={assessment?.booking_time}
            physicianName={careTeam?.doctor_name !== 'Not Assigned' ? careTeam.doctor_name : physicianName}
            dietitianName={careTeam?.dietitian_name !== 'Not Assigned' ? careTeam.dietitian_name : ""}
            nutritionistName={careTeam?.nutritionist_name !== 'Not Assigned' ? careTeam.nutritionist_name : ""}
            fitnessCoachName={careTeam?.fitness_coach_name !== 'Not Assigned' ? careTeam.fitness_coach_name : ""}
            trainerName={careTeam?.trainer_name !== 'Not Assigned' ? careTeam.trainer_name : ""}
            consultations={consultations || []}
            staffConsultations={staffConsultations || []}
            onBookClick={(type) => setBookingModal({ isOpen: true, type })}
          />
        </div>
      </div>

      {/* 5. Column Rows 2: Meds + Messages + Ring */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        <div className="col-span-1">
          <MedicationCard
            medicationName={medicationName}
            dosage={dosage}
            dosesTaken={dosesTaken}
            totalDoses={totalDoses}
            nextRefillDate={refillDetails.date}
            daysToRefill={refillDetails.days}
            isApproved={isMedicationApproved}
          />
        </div>
        <div className="col-span-1">
          <MessagesPreview 
            notifications={notifications}
            patientName={patientName}
            doctorName={physicianName}
          />
        </div>
        <div className="col-span-1 md:col-span-2 xl:col-span-1">
          <ProgressRing
            progressPercent={weightGoalProgressPercent}
            startWeight={startWeight ?? 0}
            currentWeight={currentWeight ?? 0}
            goalWeight={goalWeight ?? 0}
          />
        </div>
      </div>

      {/* 6. Care Guidelines (Gold Plan Gated) */}
      {!isGoldPlan ? (
        <div className="bg-gradient-to-br from-[#1A1F36] to-[#2A314A] rounded-3xl p-8 border border-[#1A1F36]/6 shadow-xl relative overflow-hidden">
          {/* Decorative Background Elements */}
          <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 rounded-full bg-gradient-to-br from-[#C4622D]/20 to-transparent blur-3xl"></div>
          <div className="absolute bottom-0 left-0 -ml-16 -mb-16 w-48 h-48 rounded-full bg-gradient-to-tr from-[#5C7A6B]/20 to-transparent blur-3xl"></div>
          
          <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="text-white">
              <div className="inline-flex items-center gap-1.5 bg-[#C4622D]/20 border border-[#C4622D]/30 px-3 py-1 rounded-full mb-3">
                <span className="text-lg">⭐</span>
                <span className="text-[#F5F0EB] text-xs font-black uppercase tracking-wider">Premium Feature</span>
              </div>
              <h3 className="font-bold text-2xl font-sora mb-2">Unlock Your Full Potential</h3>
              <p className="text-[#8896A4] text-sm leading-relaxed max-w-lg">
                Upgrade to the <strong className="text-white">Gold Plan</strong> to access personalized nutrition guidance, custom workout plans, and 1-on-1 live video consultations with your assigned care team.
              </p>
            </div>
            <Link 
              href="/patient/billing"
              className="shrink-0 bg-[#C4622D] hover:bg-[#A8522A] text-white px-8 py-3.5 rounded-full text-sm font-bold transition-all shadow-lg shadow-[#C4622D]/20 no-underline flex items-center gap-2"
            >
              Upgrade to Gold Plan
              <ArrowRight size={16} />
            </Link>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <div className="bg-white rounded-3xl p-6 border border-[#1A1F36]/6 shadow-[0_4px_20px_rgba(26,31,54,0.02)]">
            <h3 className="text-[#1A1F36] font-bold text-lg font-sora mb-4 flex items-center gap-2">
              <span className="text-[#5C7A6B]">🥗</span> Nutrition Guidelines
            </h3>
            {careTeam?.dietitian_notes ? (
              <p className="text-[#1A1F36] text-sm whitespace-pre-line leading-relaxed bg-[#F5F0EB]/50 p-4 rounded-2xl border border-[#1A1F36]/6">
                {careTeam.dietitian_notes}
              </p>
            ) : (
              <p className="text-[#8896A4] text-sm leading-relaxed">
                Your dietitian hasn't set any specific guidelines yet. Once assigned, your personalized diet plan will appear here.
              </p>
            )}
          </div>
          <div className="bg-white rounded-3xl p-6 border border-[#1A1F36]/6 shadow-[0_4px_20px_rgba(26,31,54,0.02)]">
            <h3 className="text-[#1A1F36] font-bold text-lg font-sora mb-4 flex items-center gap-2">
              <span className="text-[#D89A3D]">N</span> Nutritionist Guidance
            </h3>
            {careTeam?.nutritionist_notes ? (
              <p className="text-[#1A1F36] text-sm whitespace-pre-line leading-relaxed bg-[#F5F0EB]/50 p-4 rounded-2xl border border-[#1A1F36]/6">
                {careTeam.nutritionist_notes}
              </p>
            ) : (
              <p className="text-[#8896A4] text-sm leading-relaxed">
                Your nutritionist guidance will appear here after your assigned nutritionist creates it.
              </p>
            )}
          </div>
          <div className="bg-white rounded-3xl p-6 border border-[#1A1F36]/6 shadow-[0_4px_20px_rgba(26,31,54,0.02)]">
            <h3 className="text-[#1A1F36] font-bold text-lg font-sora mb-4 flex items-center gap-2">
              <span className="text-[#C4622D]">🏋️</span> Workout Plan
            </h3>
            {careTeam?.trainer_notes ? (
              <p className="text-[#1A1F36] text-sm whitespace-pre-line leading-relaxed bg-[#F5F0EB]/50 p-4 rounded-2xl border border-[#1A1F36]/6">
                {careTeam.trainer_notes}
              </p>
            ) : (
              <p className="text-[#8896A4] text-sm leading-relaxed">
                Your fitness trainer hasn't set any specific guidelines yet. Once assigned, your personalized workout plan will appear here.
              </p>
            )}
          </div>
        </div>
      )}

      {/* 7. Weight Log Modal overlay */}
      {showWeightLogModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
          <div className="bg-white rounded-[2rem] border border-[#1A1F36]/8 p-8 max-w-md w-full relative overflow-hidden shadow-2xl space-y-6 text-[#1A1F36]">
            <button
              onClick={() => setShowWeightLogModal(false)}
              className="absolute top-6 right-6 p-1 bg-[#F5F0EB] hover:bg-[#EDE8E3] rounded-full text-[#1A1F36] transition-all"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="space-y-2 text-center">
              <div className="w-12 h-12 rounded-full bg-[#C4622D]/10 text-[#C4622D] flex items-center justify-center mx-auto">
                <Scale className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold font-sora">Log Current Weight</h3>
              <p className="text-xs text-[#8896A4] font-medium">Keep your progress tracker updated regularly.</p>
            </div>

            <form onSubmit={handleLogWeightSubmit} className="space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-black uppercase tracking-wider text-[#8896A4] ml-1">Current Weight (kg)</label>
                <input
                  type="number"
                  step="0.1"
                  required
                  autoFocus
                  placeholder="e.g. 74.5"
                  value={newWeight}
                  onChange={(e) => setNewWeight(e.target.value)}
                  className="w-full bg-[#F5F0EB] border border-[#1A1F36]/12 rounded-xl px-4 py-3 text-[#1A1F36] focus:border-[#C4622D] focus:ring-2 focus:ring-[#C4622D]/15 outline-none font-semibold"
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={logLoading}
                  className="w-full bg-[#1A1F36] text-white rounded-full py-4 hover:bg-[#C4622D] font-bold uppercase tracking-wider text-xs transition-colors cursor-pointer disabled:opacity-50"
                >
                  {logLoading ? "Recording log..." : "Confirm Daily Log"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* 8. Booking Modal overlay */}
      {bookingModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
          <div className="bg-white rounded-[2rem] border border-[#1A1F36]/8 p-8 max-w-md w-full relative overflow-hidden shadow-2xl space-y-6 text-[#1A1F36]">
            <button
              onClick={() => {
                setBookingModal({ isOpen: false, type: null })
                setSelectedProviderDate('')
                setSelectedProviderTime('')
                setProviderSlotError('')
              }}
              className="absolute top-6 right-6 p-1 bg-[#F5F0EB] hover:bg-[#EDE8E3] rounded-full text-[#1A1F36] transition-all"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="space-y-2 text-center">
              <div className="w-12 h-12 rounded-full bg-[#1A1F36]/10 text-[#1A1F36] flex items-center justify-center mx-auto">
                <Video className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold font-sora">Book Consultation</h3>
              <p className="text-xs text-[#8896A4] font-medium">Schedule a 1-on-1 meeting with your {getProviderRoleLabel(bookingModal.type)}.</p>
            </div>

            <form onSubmit={handleBookConsultation} className="space-y-4">
              <div className="space-y-3">
                <label className="text-xs font-black uppercase tracking-wider text-[#8896A4] ml-1">Choose Date</label>
                {providerSlotsLoading && !providerSlotDates.length ? (
                  <div className="rounded-2xl border border-[#1A1F36]/8 bg-[#F5F0EB] p-4 text-center text-sm font-semibold text-[#8896A4]">
                    Loading available dates...
                  </div>
                ) : providerSlotDates.length ? (
                  <div className="flex gap-2 overflow-x-auto pb-1">
                    {providerSlotDates.map((date) => (
                      <button
                        key={date}
                        type="button"
                        onClick={() => setSelectedProviderDate(date)}
                        className={`shrink-0 rounded-2xl border px-4 py-3 text-left transition-colors ${
                          selectedProviderDate === date
                            ? 'border-[#C4622D] bg-[#FFF4EC] text-[#C4622D]'
                            : 'border-[#1A1F36]/8 bg-[#F5F0EB] text-[#1A1F36] hover:border-[#C4622D]/40'
                        }`}
                      >
                        <span className="block text-xs font-black">{formatSlotDate(date)}</span>
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="rounded-2xl border border-[#1A1F36]/8 bg-[#F5F0EB] p-4 text-center text-sm font-semibold text-[#8896A4]">
                    No available dates found for your assigned {getProviderRoleLabel(bookingModal.type).toLowerCase()}.
                  </div>
                )}
              </div>

              <div className="space-y-3">
                <label className="text-xs font-black uppercase tracking-wider text-[#8896A4] ml-1">Choose Time</label>
                {providerSlotsLoading && selectedProviderDate ? (
                  <div className="rounded-2xl border border-[#1A1F36]/8 bg-[#F5F0EB] p-4 text-center text-sm font-semibold text-[#8896A4]">
                    Loading slots...
                  </div>
                ) : availableProviderTimes.length ? (
                  <div className="grid grid-cols-2 gap-2">
                    {availableProviderTimes.map((time) => (
                      <button
                        key={time}
                        type="button"
                        onClick={() => setSelectedProviderTime(time)}
                        className={`rounded-xl border px-4 py-3 text-sm font-black transition-colors ${
                          selectedProviderTime === time
                            ? 'border-[#1A1F36] bg-[#1A1F36] text-white'
                            : 'border-[#1A1F36]/8 bg-white text-[#1A1F36] hover:border-[#C4622D] hover:text-[#C4622D]'
                        }`}
                      >
                        {formatSlotTime(time)}
                      </button>
                    ))}
                  </div>
                ) : selectedProviderDate ? (
                  <div className="rounded-2xl border border-[#1A1F36]/8 bg-[#F5F0EB] p-4 text-center text-sm font-semibold text-[#8896A4]">
                    No slots available on this date.
                  </div>
                ) : null}
              </div>

              {providerSlotError && (
                <div className="rounded-2xl border border-[#F2C8BE] bg-[#FFF4EC] p-3 text-sm font-bold text-[#A84A33]">
                  {providerSlotError}
                </div>
              )}

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={bookingLoading || providerSlotsLoading || !selectedProviderDate || !selectedProviderTime}
                  className="w-full bg-[#1A1F36] text-white rounded-full py-4 hover:bg-[#C4622D] font-bold uppercase tracking-wider text-xs transition-colors cursor-pointer disabled:opacity-50"
                >
                  {bookingLoading ? "Confirming..." : "Confirm Booking"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
