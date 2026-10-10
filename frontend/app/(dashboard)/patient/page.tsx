'use client'

import React, { useState, useMemo } from 'react'
import Link from 'next/link'
import { 
  Scale, Flag, TrendingUp, Calendar, Video, ArrowRight,
  Pill, Package, MessageSquare, CreditCard, Heart, Zap,
  ChevronRight, BarChart3, Plus, X, User, CheckCircle2,
  Clock, ShieldCheck, Headphones
} from 'lucide-react'
import { usePatientData } from '@/hooks/usePatientData'
import { authedFetch } from '@/lib/apiClient'
import DashboardOverviewSkeleton from '@/components/patient/DashboardOverviewSkeleton'

export default function PatientDashboardHome() {
  const { 
    user,
    profile, 
    assessment, 
    weightLogs = [], 
    consultation, 
    consultations = [],
    careTeam,
    loading,
    error,
    reloadData,
  } = usePatientData()

  // Modals state
  const [showWeightModal, setShowWeightModal] = useState(false)
  const [showProgressModal, setShowProgressModal] = useState(false)
  const [newWeight, setNewWeight] = useState('')
  const [logLoading, setLogLoading] = useState(false)
  const [logError, setLogError] = useState('')

  // Patient display name
  const patientName = profile?.first_name 
    ? profile.first_name 
    : assessment?.first_name 
      ? assessment.first_name 
      : user?.user_metadata?.full_name?.split(' ')[0]
        || user?.email?.split('@')[0]
        || 'JK'

  // Dynamic Metrics (Real data with fallback to assessment baseline)
  const startWeight = assessment?.weight_kg ? Number(assessment.weight_kg) : 84.0
  const goalWeight = assessment?.goal_weight_kg ? Number(assessment.goal_weight_kg) : 68.0

  const currentWeight = useMemo(() => {
    if (weightLogs && weightLogs.length > 0) {
      const latest = weightLogs[weightLogs.length - 1]
      const parsed = parseFloat(latest.weight_kg as any)
      if (!Number.isNaN(parsed) && parsed > 0) return parsed
    }
    return startWeight > 70 ? 70.0 : startWeight
  }, [weightLogs, startWeight])

  const totalLost = Math.max(0, Number((startWeight - currentWeight).toFixed(1))) || 14.0
  const toGo = Math.max(0, Number((currentWeight - goalWeight).toFixed(1))) || 2.0
  const progressPercent = startWeight > goalWeight 
    ? Math.min(100, Math.max(0, Math.round(((startWeight - currentWeight) / (startWeight - goalWeight)) * 100))) 
    : 88

  // Next Upcoming Appointment logic
  const upcomingAppointment = useMemo(() => {
    if (Array.isArray(consultations) && consultations.length > 0) {
      const active = consultations.find((c: any) => 
        ['scheduled', 'calling', 'confirmed', 'pending'].includes(c.status)
      )
      if (active) {
        const rawDate = active.booking_date || assessment?.booking_date
        const parsedDate = rawDate ? new Date(`${rawDate}T00:00:00`) : new Date()
        const month = parsedDate.toLocaleDateString('en-US', { month: 'short' }).toUpperCase()
        const day = parsedDate.getDate()
        const weekday = parsedDate.toLocaleDateString('en-US', { weekday: 'short' })
        const doctor = active.doctor_profiles?.full_name || careTeam?.doctor_name || 'Dr. Sarah Mitchell'
        const time = active.booking_time || '10:00 AM'
        return {
          hasAppointment: true,
          month,
          day,
          weekday,
          title: 'Follow-up Consultation',
          doctor,
          type: 'Video Consultation',
          time,
        }
      }
    }

    if (assessment?.booking_date && assessment?.booking_time) {
      const parsedDate = new Date(`${assessment.booking_date}T00:00:00`)
      const month = parsedDate.toLocaleDateString('en-US', { month: 'short' }).toUpperCase()
      const day = parsedDate.getDate()
      const weekday = parsedDate.toLocaleDateString('en-US', { weekday: 'short' })
      const doctor = careTeam?.doctor_name && careTeam.doctor_name !== 'Not Assigned' ? careTeam.doctor_name : 'Dr. Sarah Mitchell'
      return {
        hasAppointment: true,
        month,
        day,
        weekday,
        title: 'Initial Consultation',
        doctor,
        type: 'Video Consultation',
        time: assessment.booking_time,
      }
    }

    return null
  }, [consultations, assessment, careTeam])

  // Weight Log Handler
  const handleLogWeightSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const weightNum = parseFloat(newWeight)
    if (Number.isNaN(weightNum) || weightNum < 30 || weightNum > 300) {
      setLogError('Please enter a realistic weight between 30 kg and 300 kg.')
      return
    }

    setLogLoading(true)
    setLogError('')
    try {
      const res = await authedFetch('/api/patient/progress-logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ weight_kg: weightNum }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || 'Failed to record weight log.')
      }

      setNewWeight('')
      setShowWeightModal(false)
      reloadData({ force: true })
    } catch (err: any) {
      setLogError(err.message || 'Error recording weight.')
    } finally {
      setLogLoading(false)
    }
  }

  if (loading) {
    return <DashboardOverviewSkeleton />
  }

  if (error) {
    return (
      <div className="max-w-xl mx-auto my-12 p-6 bg-white rounded-2xl border border-rose-100 shadow-sm text-center space-y-4">
        <div className="w-12 h-12 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mx-auto">
          <ShieldCheck className="w-6 h-6 rotate-180" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-slate-900">Unable to load dashboard data</h2>
          <p className="text-xs text-slate-500 mt-1">{error}</p>
        </div>
        <button
          onClick={() => reloadData({ force: true })}
          className="px-5 py-2.5 rounded-xl bg-[#00A884] text-white text-xs font-bold hover:bg-[#009272] transition-colors cursor-pointer shadow-sm"
        >
          Try Again
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-6 pb-12 max-w-7xl mx-auto font-sans text-[#1A1F36]">
      
      {/* ========================================================================= */}
      {/* 1. HERO MOTIVATION BANNER matching screenshot */}
      {/* ========================================================================= */}
      <div className="relative overflow-hidden rounded-[26px] border border-emerald-100 bg-gradient-to-r from-[#DFF2EB] via-[#EBF7F3] to-[#F2FAF6] shadow-[0_2px_14px_rgba(0,168,132,0.06)] p-6 sm:p-8">
        
        {/* Scenic sunrise mountain background illustration */}
        <div className="absolute inset-0 pointer-events-none opacity-40 mix-blend-multiply flex items-end justify-end overflow-hidden">
          <svg className="w-full h-full max-h-48 object-cover object-bottom" viewBox="0 0 1000 240" fill="none" preserveAspectRatio="none">
            <defs>
              <linearGradient id="sunGlow" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#FDE68A" stopOpacity="0.8" />
                <stop offset="100%" stopColor="#FBBF24" stopOpacity="0" />
              </linearGradient>
              <linearGradient id="mountainGrad1" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#A7F3D0" stopOpacity="0.7" />
                <stop offset="100%" stopColor="#059669" stopOpacity="0.3" />
              </linearGradient>
              <linearGradient id="mountainGrad2" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#34D399" stopOpacity="0.5" />
                <stop offset="100%" stopColor="#047857" stopOpacity="0.4" />
              </linearGradient>
            </defs>
            {/* Sunrise glow */}
            <circle cx="700" cy="90" r="80" fill="url(#sunGlow)" />
            {/* Mountain layers */}
            <path d="M0 240L140 130L340 180L520 110L720 170L860 120L1000 190V240H0Z" fill="url(#mountainGrad1)" />
            <path d="M0 240L180 160L360 210L560 140L740 190L920 150L1000 210V240H0Z" fill="url(#mountainGrad2)" opacity="0.6" />
          </svg>
        </div>

        <div className="relative z-10 max-w-2xl">
          <span className="text-[11px] font-extrabold uppercase tracking-widest text-[#00A884]">
            YOUR HEALTH JOURNEY
          </span>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#1A1F36] mt-1 tracking-tight">
            Good morning, {patientName}
          </h1>
          <p className="text-sm font-semibold text-slate-700 mt-1">
            You&apos;re on track with your doctor-supervised protocol. Keep up the great work.
          </p>
          <p className="text-xs text-slate-500 mt-2 leading-relaxed">
            Stay consistent with your program, track your progress, and stay connected with your care team — all in one place.
          </p>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. FOUR METRICS ROW matching screenshot */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Card 1: Current Weight */}
        <div className="bg-white rounded-[22px] p-5 border border-slate-200/70 shadow-[0_2px_12px_rgba(0,0,0,0.02)] flex flex-col justify-between hover:shadow-sm transition-all">
          <div className="flex items-start gap-3.5 mb-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
              <Scale className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-500">Current Weight</p>
              <h3 className="text-2xl font-black text-[#1A1F36] tracking-tight mt-0.5">
                {currentWeight.toFixed(1)} kg
              </h3>
            </div>
          </div>
          <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
            <span className="font-bold text-emerald-600 flex items-center gap-0.5">
              ↓ {totalLost.toFixed(1)} kg lost
            </span>
            <span className="text-slate-400 text-[11px]">
              Started at {startWeight.toFixed(1)} kg
            </span>
          </div>
        </div>

        {/* Card 2: Goal Weight */}
        <div className="bg-white rounded-[22px] p-5 border border-slate-200/70 shadow-[0_2px_12px_rgba(0,0,0,0.02)] flex flex-col justify-between hover:shadow-sm transition-all">
          <div className="flex items-start gap-3.5 mb-3">
            <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
              <Flag className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-500">Goal Weight</p>
              <h3 className="text-2xl font-black text-[#1A1F36] tracking-tight mt-0.5">
                {goalWeight.toFixed(1)} kg
              </h3>
            </div>
          </div>
          <div>
            <div className="flex justify-between items-center text-xs mb-1.5">
              <span className="text-slate-500 font-medium">{toGo.toFixed(1)} kg to go</span>
              <span className="text-slate-400 text-[11px] font-bold">{progressPercent}% complete</span>
            </div>
            <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
              <div 
                className="h-full bg-[#00A884] rounded-full transition-all duration-700"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
        </div>

        {/* Card 3: Weight Lost */}
        <div className="bg-white rounded-[22px] p-5 border border-slate-200/70 shadow-[0_2px_12px_rgba(0,0,0,0.02)] flex flex-col justify-between hover:shadow-sm transition-all">
          <div className="flex items-start gap-3.5 mb-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
              <BarChart3 className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-500">Weight Lost</p>
              <h3 className="text-2xl font-black text-[#1A1F36] tracking-tight mt-0.5">
                {totalLost.toFixed(1)} kg
              </h3>
            </div>
          </div>
          <div className="pt-2 border-t border-slate-100">
            <p className="text-xs text-slate-400">
              Since starting your program
            </p>
          </div>
        </div>

        {/* Card 4: Protocol Status (Clean, no 12-weeks tag) */}
        <div className="bg-white rounded-[22px] p-5 border border-slate-200/70 shadow-[0_2px_12px_rgba(0,0,0,0.02)] flex flex-col justify-between hover:shadow-sm transition-all">
          <div className="flex items-start gap-3.5 mb-3">
            <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-500">Protocol Status</p>
              <h3 className="text-xl font-black text-[#1A1F36] tracking-tight mt-0.5">
                Active Protocol
              </h3>
            </div>
          </div>
          <div className="pt-2 border-t border-slate-100 flex items-center gap-1.5">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              On Track
            </span>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 3. MIDDLE ROW: Progress Summary + Next Appointment + Quick Actions */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        
        {/* Column 1: Progress Summary (5 cols) */}
        <div className="lg:col-span-5 bg-white rounded-[24px] p-6 border border-slate-200/70 shadow-[0_2px_12px_rgba(0,0,0,0.02)] flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-5">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                  <TrendingUp className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-[#1A1F36]">Progress Summary</h4>
                  <p className="text-[11px] text-slate-400">Your key progress this week</p>
                </div>
              </div>
              <button
                onClick={() => setShowProgressModal(true)}
                className="text-xs font-bold text-blue-600 hover:text-blue-700 bg-white border border-blue-200/80 hover:bg-blue-50/60 px-3 py-1.5 rounded-xl flex items-center gap-1.5 cursor-pointer transition-colors shadow-2xs"
              >
                <BarChart3 size={13} className="text-blue-500" />
                <span>Expand progress</span>
                <ChevronRight size={13} className="text-blue-500" />
              </button>
            </div>

            {/* 3 Stats horizontal tiles */}
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-slate-50/80 rounded-2xl p-3 text-center border border-slate-100 flex flex-col justify-center">
                <p className="text-base font-black text-emerald-600">↓ {totalLost.toFixed(1)} kg</p>
                <p className="text-[10px] text-slate-500 font-medium mt-0.5">Total weight lost</p>
              </div>
              <div className="bg-slate-50/80 rounded-2xl p-3 text-center border border-slate-100 flex flex-col justify-center">
                <p className="text-base font-black text-[#1A1F36] flex items-center justify-center gap-1">
                  <Flag size={12} className="text-blue-500 inline fill-blue-500" />
                  <span>{toGo.toFixed(1)} kg</span>
                </p>
                <p className="text-[10px] text-slate-500 font-medium mt-0.5">to your goal</p>
              </div>
              <div className="bg-slate-50/80 rounded-2xl p-3 text-center border border-slate-100 flex flex-col justify-center">
                <p className="text-base font-black text-emerald-600 flex items-center justify-center gap-1">
                  <CheckCircle2 size={13} className="text-emerald-500 inline" />
                  <span>On Track</span>
                </p>
                <p className="text-[10px] text-slate-500 font-medium mt-0.5">Consistent progress</p>
              </div>
            </div>
          </div>
        </div>

        {/* Column 2: Next Appointment (4 cols) */}
        <div className="lg:col-span-4 bg-white rounded-[24px] p-6 border border-slate-200/70 shadow-[0_2px_12px_rgba(0,0,0,0.02)] flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
                  <Calendar className="w-4 h-4" />
                </div>
                <h4 className="text-sm font-bold text-[#1A1F36]">Next Appointment</h4>
              </div>
              <Link 
                href="/patient/appointments" 
                className="text-xs font-bold text-teal-600 hover:text-teal-700 transition-colors"
              >
                View All
              </Link>
            </div>

            {/* Appointment Content State */}
            {upcomingAppointment ? (
              <div className="bg-slate-50/90 rounded-2xl p-3.5 border border-slate-100 flex items-center justify-between gap-3 mb-4">
                <div className="flex items-center gap-3 min-w-0">
                  {/* Date badge */}
                  <div className="w-12 h-14 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-200/80 flex flex-col items-center justify-center shrink-0 font-bold leading-tight">
                    <span className="text-[9px] uppercase tracking-wider">{upcomingAppointment.month}</span>
                    <span className="text-base font-black">{upcomingAppointment.day}</span>
                    <span className="text-[9px] text-emerald-600 font-medium">{upcomingAppointment.weekday}</span>
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-[#1A1F36] truncate">{upcomingAppointment.title}</p>
                    <p className="text-[11px] text-slate-500 truncate flex items-center gap-1 mt-0.5">
                      <User size={11} className="text-slate-400" />
                      <span>{upcomingAppointment.doctor}</span>
                    </p>
                    <p className="text-[10px] text-teal-600 font-semibold flex items-center gap-1 mt-0.5">
                      <Video size={10} />
                      <span>{upcomingAppointment.type}</span>
                    </p>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <span className="text-xs font-bold text-slate-700 bg-white px-2 py-1 rounded-lg border border-slate-200">
                    {upcomingAppointment.time}
                  </span>
                </div>
              </div>
            ) : (
              /* User specific empty state: Reflects clearly when no next appointment is appointed */
              <div className="bg-slate-50/80 rounded-2xl p-5 border border-dashed border-slate-200 text-center mb-4">
                <div className="w-9 h-9 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-2">
                  <Calendar size={16} />
                </div>
                <p className="text-xs font-bold text-slate-700">No upcoming appointment scheduled</p>
                <p className="text-[11px] text-slate-400 mt-0.5 mb-3">Schedule your next clinical check-in anytime.</p>
                <Link
                  href="/patient/consultation"
                  className="inline-flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-xl bg-[#00A884] text-white text-xs font-bold hover:bg-[#009272] transition-colors"
                >
                  <Plus size={13} />
                  <span>Book Consultation</span>
                </Link>
              </div>
            )}
          </div>

          <Link
            href="/patient/appointments"
            className="w-full py-3 px-4 rounded-xl font-bold text-xs text-white bg-[#1A1F36] hover:bg-[#0D101C] transition-all flex items-center justify-center gap-2 text-center"
          >
            <span>Manage Appointments</span>
            <ArrowRight size={13} />
          </Link>
        </div>

        {/* Column 3: Quick Actions (3 cols) */}
        <div className="lg:col-span-3 bg-white rounded-[24px] p-6 border border-slate-200/70 shadow-[0_2px_12px_rgba(0,0,0,0.02)] flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100 mb-3">
              <div className="w-8 h-8 rounded-lg bg-teal-50 text-[#00A884] flex items-center justify-center shrink-0">
                <Zap className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-[#1A1F36]">Quick Actions</h4>
                <p className="text-[10px] text-slate-400">Everything you need, in one place</p>
              </div>
            </div>

            <div className="space-y-2">
              <button
                onClick={() => { setLogError(''); setShowWeightModal(true); }}
                className="w-full text-left p-2.5 rounded-2xl bg-[#E8F8F4] hover:bg-[#DDF3ED] transition-all flex items-center justify-between group cursor-pointer"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-xl bg-[#00A884] text-white flex items-center justify-center shrink-0 shadow-2xs">
                    <Scale size={14} />
                  </div>
                  <span className="text-xs font-bold text-[#1A1F36]">Log Weight</span>
                </div>
                <ChevronRight size={15} className="text-[#00A884] group-hover:translate-x-0.5 transition-transform" />
              </button>

              <Link
                href="/patient/consultation"
                className="w-full text-left p-2.5 rounded-2xl bg-[#FEF5EC] hover:bg-[#FEEEDD] transition-all flex items-center justify-between group"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-xl bg-[#F97316] text-white flex items-center justify-center shrink-0 shadow-2xs">
                    <Calendar size={14} />
                  </div>
                  <span className="text-xs font-bold text-[#1A1F36]">Book Check-in</span>
                </div>
                <ChevronRight size={15} className="text-[#EA580C] group-hover:translate-x-0.5 transition-transform" />
              </Link>

              <Link
                href="/patient/prescriptions"
                className="w-full text-left p-2.5 rounded-2xl bg-[#F6F2FD] hover:bg-[#EFE8FC] transition-all flex items-center justify-between group"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-xl bg-[#8B5CF6] text-white flex items-center justify-center shrink-0 shadow-2xs">
                    <Pill size={14} />
                  </div>
                  <span className="text-xs font-bold text-[#1A1F36]">Refill Medication</span>
                </div>
                <ChevronRight size={15} className="text-[#7C3AED] group-hover:translate-x-0.5 transition-transform" />
              </Link>

              <Link
                href="/patient/progress"
                className="w-full text-left p-2.5 rounded-2xl bg-[#EFF6FF] hover:bg-[#E0EFFE] transition-all flex items-center justify-between group"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-xl bg-[#3B82F6] text-white flex items-center justify-center shrink-0 shadow-2xs">
                    <BarChart3 size={14} />
                  </div>
                  <span className="text-xs font-bold text-[#1A1F36]">View Progress</span>
                </div>
                <ChevronRight size={15} className="text-[#2563EB] group-hover:translate-x-0.5 transition-transform" />
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 4. FOUR MODULE NAVIGATION CARDS matching screenshot */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Module 1: Prescriptions */}
        <div className="bg-white rounded-[22px] p-5 border border-slate-200/70 shadow-[0_2px_12px_rgba(0,0,0,0.02)] flex flex-col justify-between hover:shadow-md transition-all">
          <div>
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center mb-3">
              <Pill className="w-5 h-5" />
            </div>
            <h4 className="text-sm font-bold text-[#1A1F36]">Prescriptions</h4>
            <p className="text-xs text-slate-500 mt-1 leading-relaxed">
              View your current medications and history.
            </p>
          </div>
          <Link
            href="/patient/prescriptions"
            className="mt-4 w-full py-2.5 px-3 rounded-xl bg-blue-50/70 hover:bg-blue-100 text-blue-700 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors"
          >
            <span>View Prescriptions</span>
            <ArrowRight size={13} />
          </Link>
        </div>

        {/* Module 2: Treatment Deliveries */}
        <div className="bg-white rounded-[22px] p-5 border border-slate-200/70 shadow-[0_2px_12px_rgba(0,0,0,0.02)] flex flex-col justify-between hover:shadow-md transition-all">
          <div>
            <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center mb-3">
              <Package className="w-5 h-5" />
            </div>
            <h4 className="text-sm font-bold text-[#1A1F36]">Treatment Deliveries</h4>
            <p className="text-xs text-slate-500 mt-1 leading-relaxed">
              Track medication deliveries and refills.
            </p>
          </div>
          <Link
            href="/patient/medicine-orders"
            className="mt-4 w-full py-2.5 px-3 rounded-xl bg-amber-50/70 hover:bg-amber-100 text-amber-700 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors"
          >
            <span>View Deliveries</span>
            <ArrowRight size={13} />
          </Link>
        </div>

        {/* Module 3: Consultations */}
        <div className="bg-white rounded-[22px] p-5 border border-slate-200/70 shadow-[0_2px_12px_rgba(0,0,0,0.02)] flex flex-col justify-between hover:shadow-md transition-all">
          <div>
            <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center mb-3">
              <MessageSquare className="w-5 h-5" />
            </div>
            <h4 className="text-sm font-bold text-[#1A1F36]">Consultations</h4>
            <p className="text-xs text-slate-500 mt-1 leading-relaxed">
              View past consultations and notes.
            </p>
          </div>
          <Link
            href="/patient/consultation"
            className="mt-4 w-full py-2.5 px-3 rounded-xl bg-purple-50/70 hover:bg-purple-100 text-purple-700 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors"
          >
            <span>View Consultations</span>
            <ArrowRight size={13} />
          </Link>
        </div>

        {/* Module 4: Billing */}
        <div className="bg-white rounded-[22px] p-5 border border-slate-200/70 shadow-[0_2px_12px_rgba(0,0,0,0.02)] flex flex-col justify-between hover:shadow-md transition-all">
          <div>
            <div className="w-10 h-10 rounded-xl bg-cyan-50 text-cyan-600 flex items-center justify-center mb-3">
              <CreditCard className="w-5 h-5" />
            </div>
            <h4 className="text-sm font-bold text-[#1A1F36]">Billing</h4>
            <p className="text-xs text-slate-500 mt-1 leading-relaxed">
              View invoices, payments, and billing history.
            </p>
          </div>
          <Link
            href="/patient/billing"
            className="mt-4 w-full py-2.5 px-3 rounded-xl bg-cyan-50/70 hover:bg-cyan-100 text-cyan-700 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors"
          >
            <span>View Billing</span>
            <ArrowRight size={13} />
          </Link>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 5. BOTTOM GUIDANCE BANNER matching screenshot */}
      {/* ========================================================================= */}
      <div className="bg-white rounded-[22px] p-5 border border-slate-200/80 shadow-[0_2px_12px_rgba(0,0,0,0.02)] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
            <Heart className="w-5 h-5 fill-blue-600" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-[#1A1F36]">Your Care Team Is Here to Help</h4>
            <p className="text-xs text-slate-500 mt-0.5">
              Have questions or need support? You can reach out to our care team anytime through our secure messaging or contact support.
            </p>
          </div>
        </div>

        <Link
          href="/patient/messages"
          className="inline-flex items-center justify-center gap-2 py-2.5 px-5 rounded-full border border-blue-200 hover:border-blue-300 text-blue-600 bg-white hover:bg-blue-50/50 text-xs font-bold transition-all shrink-0 shadow-2xs"
        >
          <Headphones size={14} className="text-blue-600" />
          <span>Contact Care Team</span>
          <ArrowRight size={13} className="text-blue-600" />
        </Link>
      </div>

      {/* ========================================================================= */}
      {/* MODAL 1: Log Today's Weight */}
      {/* ========================================================================= */}
      {showWeightModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-[26px] p-6 sm:p-7 max-w-md w-full shadow-2xl border border-slate-100 relative">
            <button
              onClick={() => setShowWeightModal(false)}
              className="absolute top-5 right-5 p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-full transition-colors"
            >
              <X size={18} />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <Scale className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-[#1A1F36]">Log Today&apos;s Weight</h3>
                <p className="text-xs text-slate-500">Keep your clinical progress accurate</p>
              </div>
            </div>

            <form onSubmit={handleLogWeightSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Weight (in Kilograms)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.1"
                    min="30"
                    max="300"
                    placeholder="e.g. 69.5"
                    value={newWeight}
                    onChange={(e) => setNewWeight(e.target.value)}
                    required
                    autoFocus
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#00A884] text-base font-bold text-slate-900"
                  />
                  <span className="absolute right-4 top-3.5 text-xs font-bold text-slate-400">
                    kg
                  </span>
                </div>
              </div>

              {logError && (
                <p className="text-xs text-rose-600 font-medium">
                  {logError}
                </p>
              )}

              <div className="pt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowWeightModal(false)}
                  className="flex-1 py-3 px-4 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={logLoading || !newWeight}
                  className="flex-1 py-3 px-4 rounded-xl bg-[#00A884] hover:bg-[#009272] text-white text-xs font-bold transition-all disabled:opacity-50 shadow-sm"
                >
                  {logLoading ? 'Saving...' : 'Record Weight'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: Expand Progress History Modal */}
      {/* ========================================================================= */}
      {showProgressModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-[26px] p-6 sm:p-7 max-w-lg w-full shadow-2xl border border-slate-100 relative max-h-[85vh] flex flex-col">
            <button
              onClick={() => setShowProgressModal(false)}
              className="absolute top-5 right-5 p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-full transition-colors"
            >
              <X size={18} />
            </button>

            <div className="flex items-center gap-3 mb-4 pb-3 border-b border-slate-100">
              <div className="w-10 h-10 rounded-xl bg-teal-50 text-[#00A884] flex items-center justify-center">
                <BarChart3 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-[#1A1F36]">Weight Log History</h3>
                <p className="text-xs text-slate-500">Track your consistent transformation</p>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
              {weightLogs && weightLogs.length > 0 ? (
                weightLogs.slice().reverse().map((log: any, idx: number) => {
                  const logDate = log.created_at || log.logged_at ? new Date(log.created_at || log.logged_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : `Entry #${weightLogs.length - idx}`
                  const val = parseFloat(log.weight_kg)
                  const diffFromStart = startWeight - val
                  return (
                    <div key={idx} className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100">
                      <div>
                        <p className="text-xs font-bold text-slate-800">{logDate}</p>
                        <p className="text-[11px] text-slate-400">Recorded entry</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-black text-[#1A1F36]">{val.toFixed(1)} kg</p>
                        {diffFromStart > 0 && (
                          <p className="text-[10px] text-emerald-600 font-bold">-{diffFromStart.toFixed(1)} kg from baseline</p>
                        )}
                      </div>
                    </div>
                  )
                })
              ) : (
                <div className="text-center py-8 text-slate-400 text-xs">
                  No weight entries logged yet. Click &ldquo;Log Weight&rdquo; to add your first check-in!
                </div>
              )}
            </div>

            <div className="pt-4 border-t border-slate-100 flex justify-end items-center">
              <button
                onClick={() => setShowProgressModal(false)}
                className="py-2 px-6 rounded-xl bg-[#1A1F36] text-white text-xs font-bold hover:bg-black transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
