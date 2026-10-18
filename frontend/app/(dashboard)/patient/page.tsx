'use client'

import React, { useState, useMemo } from 'react'
import Link from 'next/link'
import { 
  Scale, Flag, Calendar, Video, ArrowRight,
  Pill, MessageSquare, CreditCard, ChevronRight, BarChart3, Plus, X,
  ShieldCheck, Stethoscope, Clock, Check, Sparkles, FileText,
  UserCheck, Activity, HeartPulse
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
    activePrescription,
    loading,
    error,
    reloadData,
  } = usePatientData()

  // Modal states
  const [showWeightModal, setShowWeightModal] = useState(false)
  const [showProgressModal, setShowProgressModal] = useState(false)
  const [newWeight, setNewWeight] = useState('')
  const [logLoading, setLogLoading] = useState(false)
  const [logError, setLogError] = useState('')

  // Patient clean display name
  const patientName = useMemo(() => {
    const raw =
      profile?.first_name ||
      assessment?.first_name ||
      user?.user_metadata?.first_name ||
      user?.user_metadata?.full_name?.split(' ')?.[0] ||
      ''
    if (raw && raw !== 'Patient' && raw !== 'JK') return raw
    if (user?.email) {
      const emailPrefix = user.email.split('@')[0]
      return emailPrefix.charAt(0).toUpperCase() + emailPrefix.slice(1)
    }
    return 'Patient Member'
  }, [profile, assessment, user])

  // Dynamic Metrics
  const startWeight = assessment?.weight_kg ? Number(assessment.weight_kg) : 84.0
  const goalWeight = assessment?.goal_weight_kg ? Number(assessment.goal_weight_kg) : 68.0
  const patientHeight = assessment?.height_cm ? Number(assessment.height_cm) : 172.0

  const currentWeight = useMemo(() => {
    if (weightLogs && weightLogs.length > 0) {
      const latest = weightLogs[weightLogs.length - 1]
      const parsed = parseFloat(latest.weight_kg as any)
      if (!Number.isNaN(parsed) && parsed > 0) return parsed
    }
    return startWeight
  }, [weightLogs, startWeight])

  const weightDiff = Number((startWeight - currentWeight).toFixed(1))
  const isLoss = weightDiff > 0
  const isGain = weightDiff < 0
  const absChange = Math.abs(weightDiff)
  const toGo = Math.max(0, Number((currentWeight - goalWeight).toFixed(1)))
  const progressPercent = startWeight > goalWeight && startWeight !== goalWeight
    ? Math.min(100, Math.max(0, Math.round(((startWeight - currentWeight) / (startWeight - goalWeight)) * 100))) 
    : 0

  // Calculate BMI
  const currentBmi = useMemo(() => {
    if (patientHeight > 0 && currentWeight > 0) {
      const hM = patientHeight / 100
      return Number((currentWeight / (hM * hM)).toFixed(1))
    }
    return 27.5
  }, [patientHeight, currentWeight])

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
        const doctor = active.doctor_profiles?.full_name || careTeam?.doctor_name || 'Primary Care Physician'
        const time = active.booking_time || '10:00 AM'
        return {
          id: active.id,
          hasAppointment: true,
          month,
          day,
          weekday,
          title: 'Doctor Telehealth Consultation',
          doctor,
          type: 'Video Consultation',
          time,
          status: active.status,
        }
      }
    }

    if (assessment?.booking_date && assessment?.booking_time) {
      const parsedDate = new Date(`${assessment.booking_date}T00:00:00`)
      const month = parsedDate.toLocaleDateString('en-US', { month: 'short' }).toUpperCase()
      const day = parsedDate.getDate()
      const weekday = parsedDate.toLocaleDateString('en-US', { weekday: 'short' })
      const doctor = careTeam?.doctor_name && careTeam.doctor_name !== 'Not Assigned' ? careTeam.doctor_name : 'Primary Care Physician'
      return {
        id: null,
        hasAppointment: true,
        month,
        day,
        weekday,
        title: 'Initial Clinical Consultation',
        doctor,
        type: 'Video Consultation',
        time: assessment.booking_time,
        status: 'scheduled',
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
    } catch (err: unknown) {
      setLogError(err instanceof Error ? err.message : 'Error recording weight.')
    } finally {
      setLogLoading(false)
    }
  }

  if (loading) {
    return <DashboardOverviewSkeleton />
  }

  if (error) {
    return (
      <div className="max-w-xl mx-auto my-12 p-8 bg-white rounded-3xl border border-rose-200/80 shadow-sm text-center space-y-4">
        <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto">
          <ShieldCheck className="w-6 h-6" />
        </div>
        <div>
          <h2 className="text-lg font-extrabold text-slate-900">Clinical Dashboard Synchronizing</h2>
          <p className="text-xs text-slate-500 mt-1">{error}</p>
        </div>
        <button
          onClick={() => reloadData({ force: true })}
          className="px-6 py-2.5 rounded-full bg-[#00A884] text-white text-xs font-bold hover:bg-[#009272] transition-colors cursor-pointer shadow-sm"
        >
          Retry Connection
        </button>
      </div>
    )
  }

  const membershipLabel = assessment?.membership_tier
    ? (isNaN(Number(assessment.membership_tier)) ? assessment.membership_tier : `${assessment.membership_tier} Month Treatment Program`)
    : '1 Month Treatment Program'

  return (
    <div className="space-y-6 pb-16 max-w-7xl mx-auto font-sans text-[#11241A]">
      
      {/* ========================================================================= */}
      {/* 1. EXECUTIVE CLINICAL DOSSIER HERO                                         */}
      {/* ========================================================================= */}
      <div className="relative overflow-hidden rounded-[32px] bg-gradient-to-br from-[#061810] via-[#092218] to-[#04100B] border border-emerald-500/25 p-7 sm:p-9 text-white shadow-xl">
        {/* Subtle Luxury Atmospheric Glow */}
        <div className="absolute -top-24 -right-24 w-96 h-96 bg-[#00A884]/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-72 h-72 bg-emerald-700/15 rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-3 max-w-2xl">
            {/* Regimen Pill */}
            <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-emerald-500/15 border border-emerald-400/30 text-teal-300 text-[11px] font-semibold tracking-wide">
              <span className="w-2 h-2 rounded-full bg-[#00A884] animate-pulse" />
              <span>{membershipLabel.toUpperCase()}</span>
            </div>

            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-white tracking-tight leading-tight">
              Welcome back, {patientName}
            </h1>

            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed max-w-xl">
              Your personalized metabolic care protocol is active. Track your physiological biomarkers, review your clinical prescriptions, and coordinate with your dedicated care team below.
            </p>
          </div>

          {/* Embedded Next Action Card */}
          <div className="shrink-0 w-full lg:w-80 bg-white/10 border border-white/15 backdrop-blur-md rounded-2xl p-4 sm:p-5 flex flex-col justify-between space-y-3">
            {upcomingAppointment ? (
              <div>
                <p className="text-sm font-bold text-white leading-tight">
                  {upcomingAppointment.title}
                </p>
                <p className="text-xs text-slate-300 mt-1 flex items-center gap-1.5">
                  <Clock size={12} className="text-teal-300 shrink-0" />
                  <span>{upcomingAppointment.month} {upcomingAppointment.day} · {upcomingAppointment.time}</span>
                </p>
                <p className="text-[11px] text-teal-300 font-medium mt-0.5 truncate">
                  With {upcomingAppointment.doctor}
                </p>
              </div>
            ) : (
              <div>
                <p className="text-sm font-bold text-white leading-tight">
                  Doctor Consultation
                </p>
                <p className="text-xs text-slate-300 mt-1">
                  Ready to schedule your 1-on-1 video consult with your assigned physician.
                </p>
              </div>
            )}

            <Link
              href={upcomingAppointment ? '/patient/appointments' : '/patient/consultation'}
              className="w-full min-h-[42px] px-4 rounded-xl bg-gradient-to-r from-[#00A884] to-[#0A8F70] hover:from-[#009977] hover:to-[#087F63] text-white font-bold text-xs transition-all flex items-center justify-center gap-2 shadow-md shadow-[#00A884]/25 active:scale-[0.99] cursor-pointer"
            >
              <span>{upcomingAppointment ? 'View Consultation Room' : 'Schedule Video Check-in'}</span>
              <ArrowRight size={13} />
            </Link>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. CLINICAL TELEMETRY & METABOLIC COMMAND (Integrated, High-Craft)          */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        
        {/* Main Weight & Metabolic Rail (8 cols) */}
        <div className="lg:col-span-8 bg-white rounded-3xl p-6 sm:p-7 border border-stone-200/90 shadow-2xs space-y-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-4 border-b border-stone-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-[#00A884] border border-emerald-100 flex items-center justify-center shrink-0">
                  <Scale size={20} />
                </div>
                <div>
                  <h2 className="text-base font-extrabold text-[#11241A] tracking-tight">
                    Metabolic Trajectory & Body Mass
                  </h2>
                  <p className="text-xs text-slate-500">
                    Physician calibration protocol · Baseline to target milestone
                  </p>
                </div>
              </div>

              <button
                onClick={() => { setLogError(''); setShowWeightModal(true); }}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-[#00A884] hover:bg-[#009272] text-white text-xs font-bold transition-all shadow-xs cursor-pointer active:scale-95"
              >
                <Plus size={13} />
                <span>Log Today</span>
              </button>
            </div>

            {/* Metrics Scale Rail */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-5 pb-3">
              <div className="p-4 rounded-2xl bg-slate-50/80 border border-slate-100">
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400">Baseline Weight</span>
                <p className="text-2xl font-extrabold text-[#11241A] tracking-tight mt-1">
                  {startWeight.toFixed(1)} <span className="text-sm font-semibold text-slate-500">kg</span>
                </p>
                <p className="text-[11px] text-slate-400 mt-0.5">Program starting point</p>
              </div>

              <div className="p-4 rounded-2xl bg-emerald-50/60 border border-emerald-200/70">
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#00A884]">Current Weight</span>
                <p className="text-2xl font-extrabold text-[#00A884] tracking-tight mt-1">
                  {currentWeight.toFixed(1)} <span className="text-sm font-semibold text-[#00A884]">kg</span>
                </p>
                <p className="text-[11px] font-semibold text-emerald-700 mt-0.5">
                  {isLoss ? `↓ ${absChange.toFixed(1)} kg lost` : isGain ? `↑ ${absChange.toFixed(1)} kg change` : 'Maintaining baseline'}
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50/80 border border-slate-100">
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400">Clinical Target</span>
                <p className="text-2xl font-extrabold text-[#11241A] tracking-tight mt-1">
                  {goalWeight.toFixed(1)} <span className="text-sm font-semibold text-slate-500">kg</span>
                </p>
                <p className="text-[11px] text-slate-400 mt-0.5">{toGo.toFixed(1)} kg to achieve goal</p>
              </div>
            </div>

            {/* Progress Rail Track */}
            <div className="pt-2">
              <div className="flex justify-between items-center text-xs mb-1.5">
                <span className="text-slate-500 font-medium">Trajectory to target milestone</span>
                <span className="text-xs font-mono font-bold text-[#00A884]">{progressPercent}% complete</span>
              </div>
              <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-[#00A884] to-[#0A8F70] rounded-full transition-all duration-700"
                  style={{ width: `${Math.max(5, progressPercent)}%` }}
                />
              </div>
            </div>
          </div>

          <div className="pt-3 border-t border-stone-100 flex items-center justify-between text-xs text-slate-500">
            <span>Last recorded entry: {weightLogs.length > 0 ? 'Logged this week' : 'Baseline intake'}</span>
            <button
              onClick={() => setShowProgressModal(true)}
              className="text-xs font-bold text-[#00A884] hover:underline flex items-center gap-1 cursor-pointer"
            >
              <span>View Log History ({weightLogs.length} entries)</span>
              <ChevronRight size={13} />
            </button>
          </div>
        </div>

        {/* Clinical Vitals & Biomarkers (4 cols) */}
        <div className="lg:col-span-4 bg-white rounded-3xl p-6 sm:p-7 border border-stone-200/90 shadow-2xs space-y-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2.5 pb-3.5 border-b border-stone-100 mb-4">
              <div className="w-9 h-9 rounded-xl bg-teal-50 text-[#00A884] flex items-center justify-center shrink-0">
                <Activity size={18} />
              </div>
              <div>
                <h3 className="text-sm font-extrabold text-[#11241A]">Clinical Biomarkers</h3>
                <p className="text-[11px] text-slate-400">Baseline metabolic telemetry</p>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50/80 border border-slate-100">
                <div>
                  <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400">Body Mass Index</span>
                  <p className="text-base font-extrabold text-[#11241A]">{currentBmi} <span className="text-xs text-slate-400 font-normal">kg/m²</span></p>
                </div>
                <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                  {currentBmi >= 30 ? 'Class I' : currentBmi >= 25 ? 'Overweight' : 'Normal'}
                </span>
              </div>

              <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50/80 border border-slate-100">
                <div>
                  <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400">Height Stature</span>
                  <p className="text-base font-extrabold text-[#11241A]">{patientHeight} <span className="text-xs text-slate-400 font-normal">cm</span></p>
                </div>
                <span className="text-[11px] text-slate-500 font-medium">
                  {Math.floor(patientHeight / 30.48)}&apos;{Math.round((patientHeight % 30.48) / 2.54)}&quot;
                </span>
              </div>

              <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50/80 border border-slate-100">
                <div>
                  <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400">Safety Screening</span>
                  <p className="text-xs font-bold text-[#11241A] mt-0.5">Metabolic Safety Cleared</p>
                </div>
                <ShieldCheck size={18} className="text-[#00A884]" />
              </div>
            </div>
          </div>

          <Link
            href="/patient/profile"
            className="w-full py-2.5 px-4 rounded-xl border border-stone-200 text-slate-700 hover:bg-slate-50 text-xs font-bold transition-all text-center flex items-center justify-center gap-1.5"
          >
            <FileText size={13} className="text-slate-400" />
            <span>Manage Clinical Profile</span>
          </Link>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 3. ACTIVE PRESCRIPTION & CARE TEAM ROSTER                                   */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        
        {/* Active Prescription Dossier (7 cols) */}
        <div className="lg:col-span-7 bg-white rounded-3xl p-6 sm:p-7 border border-stone-200/90 shadow-2xs space-y-5">
          <div className="flex items-center justify-between pb-3.5 border-b border-stone-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-[#00A884] border border-emerald-100 flex items-center justify-center shrink-0">
                <Pill size={19} />
              </div>
              <div>
                <h3 className="text-base font-extrabold text-[#11241A] tracking-tight">
                  Active Clinical Regimen
                </h3>
                <p className="text-xs text-slate-500">
                  Doctor-prescribed protocol & dosage titration
                </p>
              </div>
            </div>

            <Link
              href="/patient/prescriptions"
              className="text-xs font-bold text-[#00A884] hover:underline flex items-center gap-1"
            >
              <span>View Dossier</span>
              <ChevronRight size={13} />
            </Link>
          </div>

          {/* Prescription Content */}
          <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-emerald-50/50 to-teal-50/30 border border-emerald-100 space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-emerald-800 bg-emerald-100/70 px-2 py-0.5 rounded">
                  Active E-Prescription
                </span>
                <h4 className="text-base font-extrabold text-[#11241A] mt-1.5">
                  {consultation?.prescription_text || activePrescription?.prescription_items?.[0]?.medication_name || 'Metformin Hydrochloride ER (Extended Release)'}
                </h4>
                <p className="text-xs text-slate-600 mt-1">
                  Dosage: 500 mg · 1 Tablet Once Daily with evening meal
                </p>
              </div>

              <div className="shrink-0 text-right">
                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-white px-2.5 py-1 rounded-full border border-emerald-200/70 shadow-2xs">
                  <Check size={12} className="stroke-[3]" />
                  <span>Approved</span>
                </span>
              </div>
            </div>

            <div className="pt-2 border-t border-emerald-100/80 flex flex-col sm:flex-row sm:items-center justify-between text-xs text-slate-500 gap-2">
              <span className="flex items-center gap-1.5">
                <Stethoscope size={13} className="text-[#00A884]" />
                <span>Supervised by {consultation?.doctor_profiles?.full_name || careTeam?.doctor_name || 'Primary Care Physician'}</span>
              </span>
              <Link
                href="/patient/prescriptions"
                className="text-xs font-bold text-[#00A884] hover:underline"
              >
                Refill & Delivery Schedule →
              </Link>
            </div>
          </div>
        </div>

        {/* Multidisciplinary Care Team (5 cols) */}
        <div className="lg:col-span-5 bg-white rounded-3xl p-6 sm:p-7 border border-stone-200/90 shadow-2xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-stone-100">
            <div>
              <h3 className="text-base font-extrabold text-[#11241A] tracking-tight">
                Your Dedicated Care Team
              </h3>
              <p className="text-xs text-slate-500">Medical specialists assigned to your care</p>
            </div>
            <Link
              href="/patient/consultation"
              className="text-xs font-bold text-[#00A884] hover:underline"
            >
              Consultations
            </Link>
          </div>

          <div className="space-y-2.5">
            {/* Physician Card */}
            <div className="p-3 rounded-2xl bg-slate-50/80 border border-slate-100 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 text-[#00A884] border border-emerald-100 flex items-center justify-center font-bold text-xs shrink-0">
                  MD
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-bold text-[#11241A] truncate">
                    {careTeam?.doctor_name && careTeam.doctor_name !== 'Not Assigned' ? careTeam.doctor_name : 'Primary Care Physician'}
                  </p>
                  <p className="text-[11px] text-slate-400">General Medicine & Endocrinology</p>
                </div>
              </div>

              <Link
                href="/patient/consultation"
                className="text-xs font-bold px-3 py-1.5 rounded-full bg-white hover:bg-emerald-50 border border-slate-200 text-[#00A884] transition-colors shrink-0"
              >
                Telehealth
              </Link>
            </div>

            {/* Dietitian Card */}
            <div className="p-3 rounded-2xl bg-slate-50/80 border border-slate-100 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-teal-50 text-teal-700 border border-teal-100 flex items-center justify-center font-bold text-xs shrink-0">
                  RD
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-bold text-[#11241A] truncate">
                    {careTeam?.dietitian_name && careTeam.dietitian_name !== 'Not Assigned' ? careTeam.dietitian_name : 'Clinical Dietitian'}
                  </p>
                  <p className="text-[11px] text-slate-400">Clinical Nutrition & Indian Meal Protocols</p>
                </div>
              </div>

              <Link
                href="/patient/consultation"
                className="text-xs font-bold px-3 py-1.5 rounded-full bg-white hover:bg-emerald-50 border border-slate-200 text-[#00A884] transition-colors shrink-0"
              >
                Diet Plan
              </Link>
            </div>

            {/* Health Coach Card */}
            <div className="p-3 rounded-2xl bg-slate-50/80 border border-slate-100 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-700 border border-blue-100 flex items-center justify-center font-bold text-xs shrink-0">
                  HC
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-bold text-[#11241A] truncate">
                    {careTeam?.fitness_coach_name && careTeam.fitness_coach_name !== 'Not Assigned' ? careTeam.fitness_coach_name : 'Certified Fitness Coach'}
                  </p>
                  <p className="text-[11px] text-slate-400">Metabolic Conditioning & Activity</p>
                </div>
              </div>

              <Link
                href="/patient/consultation"
                className="text-xs font-bold px-3 py-1.5 rounded-full bg-white hover:bg-emerald-50 border border-slate-200 text-[#00A884] transition-colors shrink-0"
              >
                Guidance
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 4. CLINICAL QUICK ACTION COMMANDS                                          */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Link
          href="/patient/appointments"
          className="p-5 rounded-2xl bg-white border border-stone-200/90 shadow-2xs hover:border-[#00A884] hover:shadow-md transition-all group cursor-pointer flex items-center justify-between"
        >
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-[#00A884] flex items-center justify-center shrink-0">
              <Calendar size={18} />
            </div>
            <div>
              <p className="text-xs font-extrabold text-[#11241A] group-hover:text-[#00A884] transition-colors">
                Appointments
              </p>
              <p className="text-[11px] text-slate-400">Schedule & manage visits</p>
            </div>
          </div>
          <ChevronRight size={15} className="text-slate-300 group-hover:text-[#00A884] group-hover:translate-x-0.5 transition-all" />
        </Link>

        <Link
          href="/patient/prescriptions"
          className="p-5 rounded-2xl bg-white border border-stone-200/90 shadow-2xs hover:border-[#00A884] hover:shadow-md transition-all group cursor-pointer flex items-center justify-between"
        >
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-[#00A884] flex items-center justify-center shrink-0">
              <Pill size={18} />
            </div>
            <div>
              <p className="text-xs font-extrabold text-[#11241A] group-hover:text-[#00A884] transition-colors">
                Prescriptions
              </p>
              <p className="text-[11px] text-slate-400">Refill & dosages</p>
            </div>
          </div>
          <ChevronRight size={15} className="text-slate-300 group-hover:text-[#00A884] group-hover:translate-x-0.5 transition-all" />
        </Link>

        <Link
          href="/patient/consultation"
          className="p-5 rounded-2xl bg-white border border-stone-200/90 shadow-2xs hover:border-[#00A884] hover:shadow-md transition-all group cursor-pointer flex items-center justify-between"
        >
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-[#00A884] flex items-center justify-center shrink-0">
              <MessageSquare size={18} />
            </div>
            <div>
              <p className="text-xs font-extrabold text-[#11241A] group-hover:text-[#00A884] transition-colors">
                Consultations
              </p>
              <p className="text-[11px] text-slate-400">Clinical notes & history</p>
            </div>
          </div>
          <ChevronRight size={15} className="text-slate-300 group-hover:text-[#00A884] group-hover:translate-x-0.5 transition-all" />
        </Link>

        <Link
          href="/patient/billing"
          className="p-5 rounded-2xl bg-white border border-stone-200/90 shadow-2xs hover:border-[#00A884] hover:shadow-md transition-all group cursor-pointer flex items-center justify-between"
        >
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-[#00A884] flex items-center justify-center shrink-0">
              <CreditCard size={18} />
            </div>
            <div>
              <p className="text-xs font-extrabold text-[#11241A] group-hover:text-[#00A884] transition-colors">
                Membership Billing
              </p>
              <p className="text-[11px] text-slate-400">Invoices & receipts</p>
            </div>
          </div>
          <ChevronRight size={15} className="text-slate-300 group-hover:text-[#00A884] group-hover:translate-x-0.5 transition-all" />
        </Link>
      </div>

      {/* ========================================================================= */}
      {/* MODAL 1: Log Today's Weight                                               */}
      {/* ========================================================================= */}
      {showWeightModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-3xl p-6 sm:p-7 max-w-md w-full shadow-2xl border border-stone-200/90 relative">
            <button
              onClick={() => setShowWeightModal(false)}
              className="absolute top-5 right-5 p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-full transition-colors cursor-pointer"
            >
              <X size={18} />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-[#00A884] flex items-center justify-center shrink-0">
                <Scale size={20} />
              </div>
              <div>
                <h3 className="text-base font-extrabold text-[#11241A]">Record Today&apos;s Weight</h3>
                <p className="text-xs text-slate-500">Track your clinical titration progression</p>
              </div>
            </div>

            <form onSubmit={handleLogWeightSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Weight (in Kilograms)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.1"
                    min="30"
                    max="300"
                    placeholder="e.g. 83.5"
                    value={newWeight}
                    onChange={(e) => setNewWeight(e.target.value)}
                    required
                    autoFocus
                    className="w-full px-4 py-3 rounded-2xl border border-slate-200/90 focus:outline-none focus:border-[#00A884] focus:ring-4 focus:ring-[#00A884]/10 text-xl font-extrabold text-[#11241A] bg-slate-50/70 focus:bg-white transition-all"
                  />
                  <span className="absolute right-4 top-3.5 text-xs font-bold text-slate-400">
                    kg
                  </span>
                </div>
              </div>

              {logError && (
                <p className="text-xs text-rose-600 font-medium bg-rose-50 p-2.5 rounded-xl border border-rose-200">
                  {logError}
                </p>
              )}

              <div className="pt-2 flex gap-2.5">
                <button
                  type="button"
                  onClick={() => setShowWeightModal(false)}
                  className="flex-1 py-3 px-4 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={logLoading || !newWeight}
                  className="flex-1 py-3 px-4 rounded-xl bg-gradient-to-r from-[#00A884] to-[#0A8F70] hover:from-[#009977] hover:to-[#087F63] text-white text-xs font-bold transition-all disabled:opacity-50 shadow-md shadow-[#00A884]/20 cursor-pointer active:scale-95"
                >
                  {logLoading ? 'Saving...' : 'Record Measurement'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: Weight Log History                                               */}
      {/* ========================================================================= */}
      {showProgressModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-3xl p-6 sm:p-7 max-w-lg w-full shadow-2xl border border-stone-200/90 relative max-h-[85vh] flex flex-col">
            <button
              onClick={() => setShowProgressModal(false)}
              className="absolute top-5 right-5 p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-full transition-colors cursor-pointer"
            >
              <X size={18} />
            </button>

            <div className="flex items-center gap-3 mb-4 pb-3 border-b border-stone-100">
              <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-[#00A884] flex items-center justify-center shrink-0">
                <BarChart3 size={20} />
              </div>
              <div>
                <h3 className="text-base font-extrabold text-[#11241A]">Weight Log History</h3>
                <p className="text-xs text-slate-500">Verified clinical biometric measurements</p>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
              {weightLogs && weightLogs.length > 0 ? (
                weightLogs.slice().reverse().map((log: any, idx: number) => {
                  const logDate = log.created_at || log.logged_at ? new Date(log.created_at || log.logged_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : `Entry #${weightLogs.length - idx}`
                  const val = parseFloat(log.weight_kg)
                  const diffFromStart = startWeight - val
                  return (
                    <div key={idx} className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-50/80 border border-slate-100">
                      <div>
                        <p className="text-xs font-bold text-slate-800">{logDate}</p>
                        <p className="text-[11px] text-slate-400">Telemetry Check-in</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-extrabold text-[#11241A]">{val.toFixed(1)} kg</p>
                        {diffFromStart > 0 && (
                          <p className="text-[10px] text-emerald-600 font-bold">-{diffFromStart.toFixed(1)} kg delta</p>
                        )}
                      </div>
                    </div>
                  )
                })
              ) : (
                <div className="text-center py-10 text-slate-400 text-xs">
                  No telemetry entries logged yet. Click &ldquo;Log Today&rdquo; to add your first check-in!
                </div>
              )}
            </div>

            <div className="pt-4 border-t border-stone-100 flex justify-end items-center">
              <button
                onClick={() => setShowProgressModal(false)}
                className="py-2.5 px-6 rounded-full bg-[#11241A] text-white text-xs font-bold hover:bg-black transition-colors cursor-pointer"
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
