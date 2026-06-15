'use client'

import React, { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { 
  ArrowRight, ArrowLeft, CheckCircle2, AlertCircle, Scale, Pill, User, Activity,
  Apple, Dumbbell, Video, FileText, ShieldCheck, ChevronRight,
  Calendar, Bell, BellRing, Clock, X, LogOut, PhoneOff, Stethoscope
} from 'lucide-react'
import { supabase } from '@/lib/supabaseClient'

export default function PatientDashboard() {
  const router = useRouter()
  const iframeRef = useRef<HTMLIFrameElement>(null)

  const [user, setUser] = useState<any>(null)
  const [profile, setProfile] = useState<any>(null)
  const [assessment, setAssessment] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  // Weight Progress Logs
  const [weightLogs, setWeightLogs] = useState<any[]>([])
  const [hasLoggedToday, setHasLoggedToday] = useState(false)
  const [newWeight, setNewWeight] = useState('')
  const [weightLoading, setWeightLoading] = useState(false)

  // Booking / Slots
  const [bookingDate, setBookingDate] = useState('')
  const [bookingTime, setBookingTime] = useState('')
  const [isSlotBooked, setIsSlotBooked] = useState(false)
  const [selectedSlotId, setSelectedSlotId] = useState<string | null>(null)
  const [doctorSlots, setDoctorSlots] = useState<any[]>([])
  const [availableDates, setAvailableDates] = useState<string[]>([])
  const [slotsLoading, setSlotsLoading] = useState(false)
  const [videoLoading, setVideoLoading] = useState(false)

  // Video Calls
  const [videoRoomUrl, setVideoRoomUrl] = useState('')
  const [callActive, setCallActive] = useState(false)
  const [callDuration, setCallDuration] = useState(0)
  const [callType, setCallType] = useState<'doctor' | 'dietician' | 'fitness'>('doctor')

  // Payment
  const [paymentLoading, setPaymentLoading] = useState(false)

  // Notifications
  const [notifications, setNotifications] = useState<any[]>([])
  const [showNotifPanel, setShowNotifPanel] = useState(false)

  // Membership & Prescriptions
  const [prescription, setPrescription] = useState<any>(null)
  const [selectedMembership, setSelectedMembership] = useState('')
  const [shippingState, setShippingState] = useState('')

  // 1. Initial Auth & Profile Check
  useEffect(() => {
    const checkUser = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (!session) {
          router.push('/login')
          return
        }

        setUser(session.user)

        // Fetch profile
        let { data: prof, error: profErr } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single()

        if (profErr && profErr.code === 'PGRST116') {
          // Auto-provision profile row if missing
          const { data: newProf, error: createProfErr } = await supabase
            .from('profiles')
            .insert({
              id: session.user.id,
              role: 'patient',
              first_name: session.user.email?.split('@')[0] || 'Patient',
              last_name: ''
            })
            .select()
            .single()

          if (!createProfErr) {
            prof = newProf
          } else {
            console.error("Auto-provision profile error:", createProfErr.message)
          }
        }
        setProfile(prof)

        // Fetch latest assessment
        let { data: assess, error: assessErr } = await supabase
          .from('health_assessments')
          .select('*')
          .eq('patient_id', session.user.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .single()

        if (assessErr && assessErr.code === 'PGRST116') {
          // Auto-provision basic health assessment row if missing, bypassing redirects
          const { data: newAssess, error: createAssessErr } = await supabase
            .from('health_assessments')
            .insert({
              patient_id: session.user.id,
              first_name: prof?.first_name || session.user.email?.split('@')[0] || 'Patient',
              last_name: prof?.last_name || '',
              phone_number: prof?.phone_number || '',
              height_cm: 170, // placeholder default values
              weight_kg: 80,
              goal_weight_kg: 70,
              is_eligible: true,
              consultation_fee_paid: false
            })
            .select()
            .single()

          if (!createAssessErr) {
            assess = newAssess
          } else {
            console.error("Auto-provision health assessment error:", createAssessErr.message)
          }
        }

        if (assess) {
          setAssessment(assess)
          setBookingDate(assess.booking_date || '')
          setBookingTime(assess.booking_time || '')
          setIsSlotBooked(!!assess.booking_date)
          setVideoRoomUrl(assess.room_url || '')
          setSelectedMembership(assess.membership_tier || '')
          setShippingState(assess.shipping_state || '')
        }

        // Fetch related dashboard lists
        fetchWeightLogs(session.user.id, assess?.weight_kg)
        fetchNotifications(session.user.id)
        fetchPrescriptions(session.user.id)
        fetchDoctorSlots()

      } catch (err) {
        console.error("Dashboard init error:", err)
      } finally {
        setLoading(false)
      }
    }

    checkUser()
  }, [])

  // 2. Fetch Lists
  const fetchWeightLogs = async (userId: string, initialWeight?: number) => {
    const { data } = await supabase
      .from('progress_logs')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: true })

    if (data) {
      const todayStr = new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
      let loggedToday = false

      const formatted = data.map((log: any) => {
        const dateStr = new Date(log.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
        if (dateStr === todayStr) loggedToday = true
        return { day: dateStr, weight: parseFloat(log.weight_kg) }
      })

      if (initialWeight) {
        setWeightLogs([{ day: 'Start', weight: parseFloat(initialWeight as any) }, ...formatted])
      } else {
        setWeightLogs(formatted)
      }
      setHasLoggedToday(loggedToday)
    }
  }

  const fetchNotifications = async (userId: string) => {
    const { data } = await supabase
      .from('patient_notifications')
      .select('*')
      .eq('patient_id', userId)
      .order('created_at', { ascending: false })
    if (data) setNotifications(data)
  }

  const fetchPrescriptions = async (userId: string) => {
    const { data } = await supabase
      .from('doctor_consultations')
      .select('*')
      .eq('patient_id', userId)
      .order('created_at', { ascending: false })
      .limit(1)
    if (data && data[0]) setPrescription(data[0])
  }

  const fetchDoctorSlots = async () => {
    setSlotsLoading(true)
    const today = new Date().toISOString().split('T')[0]
    const { data } = await supabase
      .from('doctor_availability')
      .select('id, available_date, time_slot, doctor_id, is_booked')
      .gte('available_date', today)
      .order('available_date', { ascending: true })
      .order('time_slot', { ascending: true })

    if (data) {
      setDoctorSlots(data)
      const dates = Array.from(new Set(data.filter(s => !s.is_booked).map(s => s.available_date)))
      setAvailableDates(dates)
    }
    setSlotsLoading(false)
  }

  // 3. Web Call Duration Timer
  useEffect(() => {
    let interval: any
    if (callActive) {
      interval = setInterval(() => {
        setCallDuration(prev => prev + 1)
      }, 1000)
    } else {
      setCallDuration(0)
    }
    return () => clearInterval(interval)
  }, [callActive])

  // 4. Log Weight Handler
  const handleLogWeight = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newWeight || parseFloat(newWeight) <= 0) return
    setWeightLoading(true)

    try {
      const { error } = await supabase.from('progress_logs').insert({
        user_id: user.id,
        weight_kg: parseFloat(newWeight)
      })

      if (error) throw error

      setNewWeight('')
      fetchWeightLogs(user.id, assessment?.weight_kg)
      alert("Weight logged successfully! 🎉")
    } catch (err: any) {
      alert("Failed to log weight: " + err.message)
    } finally {
      setWeightLoading(false)
    }
  }

  // 5. Simulation Payment Handler (₹499 Consultation fee)
  const handleConsultationPayment = async () => {
    setPaymentLoading(true)
    try {
      const mockOrderId = 'order_mock_' + Math.random().toString(36).substring(2, 11)
      const mockPaymentId = 'pay_mock_' + Math.random().toString(36).substring(2, 11)
      
      const API_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://127.0.0.1:8000'
      const response = await fetch(`${API_URL}/api/verify-payment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          razorpay_order_id: mockOrderId,
          razorpay_payment_id: mockPaymentId,
          razorpay_signature: 'mock_signature',
          patient_id: user.id,
          payment_type: 'consultation'
        })
      })

      const verifyData = await response.json()
      if (verifyData.status === 'success' && verifyData.verified) {
        alert("Payment of ₹499 verified successfully! Please choose your consultation slot.")
        setAssessment((prev: any) => ({ ...prev, consultation_fee_paid: true }))
      } else {
        alert("Payment verification failed. Please try again.")
      }
    } catch (err: any) {
      console.error(err)
      alert("Failed to connect to backend for payment simulation.")
    } finally {
      setPaymentLoading(false)
    }
  }

  // 6. Booking Slot Handler
  const handleBookSlot = async () => {
    if (!bookingDate || !bookingTime || !selectedSlotId) {
      alert("Please select a date and time slot first.")
      return
    }

    setVideoLoading(true)
    try {
      const API_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://127.0.0.1:8000'
      const roomRes = await fetch(`${API_URL}/api/create-video-room`, { method: 'POST' })
      const roomData = await roomRes.json()
      const roomUrl = roomData.room_url || 'https://meet.google.com/abc-defg-hij'

      // Save appointment in Backend
      await fetch(`${API_URL}/api/update-booking`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patient_id: user.id,
          booking_date: bookingDate,
          booking_time: bookingTime,
          room_url: roomUrl
        })
      })

      // Link creation in consultations
      const matchedSlot = doctorSlots.find(s => s.id === selectedSlotId)
      const docId = matchedSlot?.doctor_id || user.id
      const fullName = `${assessment?.first_name || ''} ${assessment?.last_name || ''}`.trim() || 'Patient'

      await supabase.from('doctor_consultations').insert({
        doctor_id: docId,
        patient_id: user.id,
        patient_name: fullName,
        booking_date: bookingDate,
        booking_time: bookingTime,
        room_url: roomUrl,
        status: 'scheduled',
        consultation_fee: 500,
        doctor_payout: 250
      })

      // Lock slot in DB
      await supabase.from('doctor_availability').update({ is_booked: true }).eq('id', selectedSlotId)

      // Create confirmation notification
      await supabase.from('patient_notifications').insert({
        patient_id: user.id,
        type: 'booking_confirmed',
        title: '✅ Consultation Booked!',
        message: `Your consultation is confirmed for {bookingDate} at {bookingTime}.`
      })

      setVideoRoomUrl(roomUrl)
      setIsSlotBooked(true)
      alert("Consultation booked successfully! 🎉")
    } catch (err: any) {
      alert("Booking failed: " + err.message)
    } finally {
      setVideoLoading(false)
    }
  }

  // 7. On-Demand Call Handler (Dietician & Fitness Coach)
  const handleOnDemandCall = async (type: 'dietician' | 'fitness') => {
    setVideoLoading(true)
    setCallType(type)
    try {
      const API_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://127.0.0.1:8000'
      const roomRes = await fetch(`${API_URL}/api/create-video-room`, { method: 'POST' })
      const roomData = await roomRes.json()
      const roomUrl = roomData.room_url || 'https://meet.google.com/abc-defg-hij'

      setVideoRoomUrl(roomUrl)
      setCallActive(true)
    } catch (err: any) {
      setVideoRoomUrl('https://meet.google.com/abc-defg-hij')
      setCallActive(true)
    } finally {
      setVideoLoading(false)
    }
  }

  // 8. Membership payment handler
  const handleMembershipPayment = async () => {
    if (!shippingState) {
      alert("Please select your shipping state.")
      return
    }
    setPaymentLoading(true)
    try {
      const mockOrderId = 'order_mock_' + Math.random().toString(36).substring(2, 11)
      const mockPaymentId = 'pay_mock_' + Math.random().toString(36).substring(2, 11)
      
      const API_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://127.0.0.1:8000'
      const response = await fetch(`${API_URL}/api/verify-payment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          razorpay_order_id: mockOrderId,
          razorpay_payment_id: mockPaymentId,
          razorpay_signature: 'mock_signature',
          patient_id: user.id,
          payment_type: 'membership',
          membership_tier: selectedMembership || 'Gold Plan',
          shipping_state: shippingState
        })
      })

      const verifyData = await response.json()
      if (verifyData.status === 'success' && verifyData.verified) {
        alert("Membership purchased successfully! Your pharmacy order is being prepared for dispatch. 📦")
        window.location.reload()
      } else {
        alert("Verification failed.")
      }
    } catch (err) {
      alert("Verification connection failed.")
    } finally {
      setPaymentLoading(false)
    }
  }

  // 9. Signout Handler
  const handleSignOut = async () => {
    await supabase.auth.signOut()
    // Clear user role cookie
    document.cookie = 'user_role=; path=/; expires=Thu, 01 Jan 1970 00:00:00 UTC; SameSite=Lax'
    router.push('/login')
  }

  // 10. Mark notification read
  const markNotifRead = async (id: string) => {
    await supabase.from('patient_notifications').update({ is_read: true }).eq('id', id)
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n))
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0A0A0F] flex items-center justify-center text-[#2DD4BF]">
        <div className="w-12 h-12 border-4 border-current border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0A0A0F] text-white pt-24 pb-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto space-y-8">
        
        {/* Header */}
        <div className="flex items-center justify-between bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-6 shadow-2xl relative z-20">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-gradient-to-tr from-[#2DD4BF] to-[#0FA89E] rounded-2xl flex items-center justify-center text-[#0A0A0F] font-black text-xl">
              {(assessment?.first_name?.[0] || user?.email?.[0] || '?').toUpperCase()}
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-white leading-tight">
                {assessment?.first_name} {assessment?.last_name || 'Member'}
              </h1>
              <p className="text-xs text-[#2DD4BF] font-black uppercase tracking-wider mt-0.5">
                {selectedMembership ? `${selectedMembership} member` : 'Free Tier'}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            {/* Notification bell */}
            <div className="relative">
              <button 
                onClick={() => setShowNotifPanel(!showNotifPanel)}
                className="p-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl transition-all"
              >
                <Bell className="w-5 h-5 text-[#2DD4BF]" />
                {notifications.filter(n => !n.is_read).length > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 bg-rose-500 rounded-full text-[9px] font-black flex items-center justify-center animate-pulse text-white">
                    {notifications.filter(n => !n.is_read).length}
                  </span>
                )}
              </button>

              {showNotifPanel && (
                <div className="absolute right-0 mt-3 w-80 bg-[#161622] border border-white/10 rounded-3xl shadow-2xl overflow-hidden z-30 animate-slide-up">
                  <div className="p-4 border-b border-white/5 flex items-center justify-between">
                    <p className="font-bold text-sm">Notifications</p>
                    <button onClick={() => setShowNotifPanel(false)}><X className="w-4 h-4 opacity-50 hover:opacity-100" /></button>
                  </div>
                  <div className="max-h-60 overflow-y-auto divide-y divide-white/5">
                    {notifications.length === 0 ? (
                      <p className="p-6 text-center text-xs opacity-50">No notifications yet</p>
                    ) : (
                      notifications.map(n => (
                        <div key={n.id} onClick={() => markNotifRead(n.id)} className={`p-4 cursor-pointer transition-colors ${n.is_read ? 'opacity-60' : 'bg-white/5'}`}>
                          <p className="text-xs font-black">{n.title}</p>
                          <p className="text-[11px] opacity-75 mt-1">{n.message}</p>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            <button 
              onClick={handleSignOut}
              className="px-5 py-2.5 bg-rose-950/30 border border-rose-500/20 hover:border-rose-500/50 hover:bg-rose-950/50 text-rose-400 font-bold rounded-2xl text-sm transition-all flex items-center gap-2"
            >
              <LogOut className="w-4 h-4" /> Sign Out
            </button>
          </div>
        </div>

        {/* Dynamic State Layout */}
        {!assessment?.consultation_fee_paid ? (
          
          /* STATE 1: UNPAID CONSULTATION FEE */
          <div className="bg-[#161622]/50 border border-white/10 rounded-[2.5rem] p-10 text-center max-w-xl mx-auto space-y-6 relative overflow-hidden">
            <div className="absolute inset-0 bg-[#2DD4BF]/5 rounded-full blur-[100px] pointer-events-none" />
            <div className="w-20 h-20 bg-[#2DD4BF]/10 text-[#2DD4BF] rounded-full flex items-center justify-center mx-auto shadow-inner">
              <ShieldCheck className="w-10 h-10" />
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-black">Consultation Fee Pending</h2>
              <p className="text-sm opacity-70 leading-relaxed">
                To consult with our medical specialist, secure your session slot, and obtain your clinical treatment plans, please pay the ₹499 consultation fee.
              </p>
            </div>
            <button
              onClick={handleConsultationPayment}
              disabled={paymentLoading}
              className="w-full bg-[#2DD4BF] hover:bg-[#0FA89E] text-[#0A0A0F] font-bold rounded-2xl py-4 flex items-center justify-center gap-2 transition-all disabled:opacity-50 shadow-[0_0_20px_rgba(45,212,191,0.2)]"
            >
              {paymentLoading ? "Connecting..." : "Pay Consultation Fee (₹499)"} <ArrowRight className="w-5 h-5" />
            </button>
          </div>

        ) : !isSlotBooked ? (
          
          /* STATE 2: PAID BUT UNBOOKED SLOT */
          <div className="bg-[#161622]/50 border border-white/10 rounded-[2.5rem] p-8 space-y-8 max-w-3xl mx-auto relative overflow-hidden">
            <div className="absolute inset-0 bg-[#2DD4BF]/5 rounded-full blur-[100px] pointer-events-none" />
            
            <div className="border-b border-white/5 pb-4 flex items-center gap-3">
              <Calendar className="w-6 h-6 text-[#2DD4BF]" />
              <h2 className="text-xl font-bold">Book Your Specialist Consultation</h2>
            </div>

            <div className="space-y-6">
              {/* Date Selection */}
              <div>
                <label className="block text-xs font-black uppercase tracking-wider opacity-60 mb-3">1. Select Date</label>
                {slotsLoading ? (
                  <p className="text-xs opacity-50">Loading slots...</p>
                ) : availableDates.length === 0 ? (
                  <p className="text-sm opacity-50">No available dates posted at the moment. Please check back later.</p>
                ) : (
                  <div className="flex flex-wrap gap-3">
                    {availableDates.map(d => {
                      const isSelected = bookingDate === d
                      const dateObj = new Date(d)
                      const label = dateObj.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })
                      return (
                        <button 
                          key={d} 
                          onClick={() => { setBookingDate(d); setBookingTime(''); setSelectedSlotId(null); }}
                          className={`px-5 py-3 rounded-2xl border font-bold text-sm transition-all ${
                            isSelected 
                              ? 'border-[#2DD4BF] bg-[#2DD4BF]/10 text-[#2DD4BF]' 
                              : 'border-white/10 bg-white/5 hover:border-white/30 text-white'
                          }`}
                        >
                          {label}
                        </button>
                      )
                    })}
                  </div>
                )}
              </div>

              {/* Time Selection */}
              {bookingDate && (
                <div>
                  <label className="block text-xs font-black uppercase tracking-wider opacity-60 mb-3">2. Select Time Slot</label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {doctorSlots
                      .filter(s => s.available_date === bookingDate && !s.is_booked)
                      .map(slot => {
                        const isSelected = selectedSlotId === slot.id
                        return (
                          <button
                            key={slot.id}
                            onClick={() => { setBookingTime(slot.time_slot); setSelectedSlotId(slot.id); }}
                            className={`p-4 rounded-2xl border font-semibold text-left transition-all ${
                              isSelected 
                                ? 'border-[#2DD4BF] bg-[#2DD4BF]/10 text-white' 
                                : 'border-white/10 bg-white/5 hover:border-white/20'
                            }`}
                          >
                            <p className="text-sm font-bold">{slot.time_slot}</p>
                            <p className="text-[10px] opacity-50 mt-1">Available Doctor Session</p>
                          </button>
                        )
                      })}
                  </div>
                </div>
              )}

              {/* Submit */}
              <button
                onClick={handleBookSlot}
                disabled={!bookingDate || !bookingTime || videoLoading}
                className="w-full bg-[#2DD4BF] hover:bg-[#0FA89E] text-[#0A0A0F] font-bold rounded-2xl py-4 mt-6 flex items-center justify-center gap-2 transition-all disabled:opacity-50"
              >
                {videoLoading ? "Reserving slot..." : "Confirm Consultation Booking"} <ArrowRight className="w-5 h-5" />
              </button>
            </div>
          </div>

        ) : (

          /* STATE 3: ACTIVE PATIENT DASHBOARD */
          <div className="space-y-8">
            {/* Call alert banner */}
            <div className="bg-gradient-to-r from-[#161622] to-[#0D1527] border border-[#2DD4BF]/30 rounded-3xl p-5 flex items-center justify-between flex-wrap gap-4">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-[#2DD4BF]/10 text-[#2DD4BF] rounded-2xl">
                  <Video className="w-6 h-6 animate-pulse" />
                </div>
                <div>
                  <p className="font-bold text-sm">Doctor Consultation Confirmed</p>
                  <p className="text-xs opacity-60 mt-0.5">{bookingDate} at {bookingTime}</p>
                </div>
              </div>
              <button 
                onClick={() => setCallActive(true)}
                className="px-6 py-3 bg-[#2DD4BF] hover:bg-[#0FA89E] text-[#0A0A0F] font-black rounded-2xl text-xs transition-all shadow-[0_0_15px_rgba(45,212,191,0.2)]"
              >
                Join Consultation Room
              </button>
            </div>

            {/* Main Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              
              {/* Daily Weight Tracker */}
              <div className="lg:col-span-2 bg-[#161622]/40 border border-white/10 rounded-[2.5rem] p-6 space-y-6 relative overflow-hidden">
                <div className="border-b border-white/5 pb-4 flex items-center gap-3 justify-between">
                  <div className="flex items-center gap-2">
                    <Scale className="w-5 h-5 text-[#2DD4BF]" />
                    <h2 className="text-lg font-bold">Weight Progress Logs</h2>
                  </div>
                  {!hasLoggedToday && (
                    <form onSubmit={handleLogWeight} className="flex items-center gap-2">
                      <input 
                        type="number" 
                        step="0.1" 
                        required
                        value={newWeight}
                        onChange={(e) => setNewWeight(e.target.value)}
                        placeholder="Log weight (kg)" 
                        className="bg-white/5 border border-white/10 text-white rounded-xl px-3 py-2 text-xs w-28 focus:outline-none focus:border-[#2DD4BF]" 
                      />
                      <button 
                        type="submit" 
                        disabled={weightLoading}
                        className="bg-[#2DD4BF] hover:bg-[#0FA89E] text-[#0A0A0F] font-black rounded-xl px-3 py-2 text-xs transition-all disabled:opacity-50"
                      >
                        {weightLoading ? "..." : "Log"}
                      </button>
                    </form>
                  )}
                </div>

                {/* Chart */}
                <div className="h-64 w-full bg-white/5 rounded-3xl p-4 border border-white/5">
                  {weightLogs.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={weightLogs}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                        <XAxis dataKey="day" stroke="rgba(255,255,255,0.4)" fontSize={10} />
                        <YAxis domain={['dataMin - 5', 'dataMax + 5']} stroke="rgba(255,255,255,0.4)" fontSize={10} />
                        <Tooltip contentStyle={{ backgroundColor: '#161622', borderColor: 'rgba(255,255,255,0.1)' }} labelStyle={{ color: '#2DD4BF' }} />
                        <Line type="monotone" dataKey="weight" stroke="#2DD4BF" strokeWidth={3} dot={{ fill: '#2DD4BF', strokeWidth: 2 }} activeDot={{ r: 6 }} />
                      </LineChart>
                    </ResponsiveContainer>
                  ) : (
                    <p className="text-xs opacity-50 text-center py-24">No logs submitted yet.</p>
                  )}
                </div>
              </div>

              {/* On-Demand Support Coaches */}
              <div className="bg-[#161622]/40 border border-white/10 rounded-[2.5rem] p-6 space-y-6">
                <div className="border-b border-white/5 pb-4 flex items-center gap-2">
                  <Apple className="w-5 h-5 text-[#2DD4BF]" />
                  <h2 className="text-lg font-bold">On-Demand Care Rooms</h2>
                </div>

                <div className="space-y-4">
                  {/* Dietician */}
                  <div className="bg-white/5 p-4 rounded-3xl border border-white/5 hover:border-white/10 transition-all space-y-4">
                    <div className="flex items-center gap-3">
                      <div className="p-3 bg-amber-500/10 text-amber-400 rounded-2xl">
                        <Apple className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="text-sm font-bold">Personalized Dietician</p>
                        <p className="text-[11px] opacity-50 mt-0.5">Meal plans & nutritional guidelines</p>
                      </div>
                    </div>
                    <button 
                      onClick={() => handleOnDemandCall('dietician')}
                      className="w-full bg-amber-500 hover:bg-amber-600 text-white font-black rounded-xl py-3 text-xs transition-all flex items-center justify-center gap-2"
                    >
                      <Video className="w-4 h-4" /> Start Consultation
                    </button>
                  </div>

                  {/* Fitness Coach */}
                  <div className="bg-white/5 p-4 rounded-3xl border border-white/5 hover:border-white/10 transition-all space-y-4">
                    <div className="flex items-center gap-3">
                      <div className="p-3 bg-emerald-500/10 text-emerald-400 rounded-2xl">
                        <Dumbbell className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="text-sm font-bold">Metabolic Fitness Coach</p>
                        <p className="text-[11px] opacity-50 mt-0.5">Custom routines & metabolic active care</p>
                      </div>
                    </div>
                    <button 
                      onClick={() => handleOnDemandCall('fitness')}
                      className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-black rounded-xl py-3 text-xs transition-all flex items-center justify-center gap-2"
                    >
                      <Video className="w-4 h-4" /> Connect with Coach
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Prescriptions & Pharmacy Orders */}
            {prescription ? (
              <div className="bg-[#161622]/40 border border-white/10 rounded-[2.5rem] p-6 space-y-6">
                <div className="border-b border-white/5 pb-4 flex items-center gap-2">
                  <Pill className="w-5 h-5 text-[#2DD4BF]" />
                  <h2 className="text-lg font-bold">Medical Prescriptions & Pharmacy</h2>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Notes */}
                  <div className="bg-white/5 p-5 rounded-3xl border border-white/5 space-y-3">
                    <p className="text-xs font-black uppercase tracking-wider opacity-50">Specialist Clinical Notes</p>
                    <p className="text-sm leading-relaxed whitespace-pre-wrap">{prescription.prescription_text}</p>
                  </div>

                  {/* Actions */}
                  <div className="flex flex-col justify-center space-y-4">
                    {prescription.status === 'approved' && !selectedMembership ? (
                      <div className="bg-amber-500/10 border border-amber-500/20 rounded-3xl p-5 space-y-4">
                        <h4 className="font-bold text-amber-400 text-sm">Unlock Prescriptions Delivery</h4>
                        <p className="text-xs opacity-80 leading-relaxed">
                          Your doctor has approved your medication protocols. Select and buy your membership tier to start home shipping delivery.
                        </p>
                        <div className="space-y-3">
                          <select 
                            value={selectedMembership}
                            onChange={(e) => setSelectedMembership(e.target.value)}
                            className="w-full bg-white/5 border border-white/10 text-white rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-[#2DD4BF] [color-scheme:dark]"
                          >
                            <option value="">Select Plan...</option>
                            <option value="Gold Plan">Gold Plan (Includes Injectable GLP-1)</option>
                            <option value="Silver Plan">Silver Plan (Includes Oral Medication)</option>
                          </select>
                          <input 
                            type="text" 
                            placeholder="Enter Shipping State (e.g. Karnataka)" 
                            value={shippingState}
                            onChange={(e) => setShippingState(e.target.value)}
                            className="w-full bg-white/5 border border-white/10 text-white rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-[#2DD4BF]"
                          />
                          <button
                            onClick={handleMembershipPayment}
                            disabled={!selectedMembership || !shippingState || paymentLoading}
                            className="w-full bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-xl py-3 text-xs transition-all disabled:opacity-50"
                          >
                            Confirm Membership Order
                          </button>
                        </div>
                      </div>
                    ) : selectedMembership ? (
                      <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-3xl p-5 space-y-3">
                        <h4 className="font-bold text-emerald-400 text-sm">Pharmacy Shipping Details</h4>
                        <div className="text-xs space-y-2 opacity-80">
                          <p><strong>Membership tier:</strong> {selectedMembership}</p>
                          <p><strong>Shipping State:</strong> {shippingState}</p>
                          <p><strong>Pharmacy Status:</strong> Dispatched & in route 📦</p>
                        </div>
                      </div>
                    ) : (
                      <p className="text-xs opacity-50 text-center">Your prescription is pending doctor approval. Shipping details will appear here once approved.</p>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-[#161622]/40 border border-white/10 rounded-[2.5rem] p-6 text-center text-xs opacity-50">
                Medical details will appear here after your first consultation concludes.
              </div>
            )}
          </div>
        )}
      </div>

      {/* Video Call Modal Overlay */}
      {callActive && videoRoomUrl && (
        <div className="fixed inset-0 z-50 bg-[#0A0A0F]/90 backdrop-blur-md flex flex-col items-center justify-center p-4">
          <div className="max-w-4xl w-full bg-[#161622] border border-white/10 rounded-3xl overflow-hidden shadow-2xl relative">
            <div className="p-4 border-b border-white/5 flex items-center justify-between text-white bg-black/20">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 bg-red-500 rounded-full animate-pulse" />
                <p className="text-xs font-bold uppercase tracking-wider">
                  Live {callType} Call • {Math.floor(callDuration / 60).toString().padStart(2, '0')}:{(callDuration % 60).toString().padStart(2, '0')}
                </p>
              </div>
              <button 
                onClick={() => setCallActive(false)}
                className="p-1.5 bg-white/5 hover:bg-white/10 rounded-xl transition-all"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <iframe 
              ref={iframeRef}
              src={videoRoomUrl}
              allow="camera; microphone; fullscreen; display-capture"
              className="w-full h-[550px] border-0"
            />
          </div>
        </div>
      )}
    </div>
  )
}
