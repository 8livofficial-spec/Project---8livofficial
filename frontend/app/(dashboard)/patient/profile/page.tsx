'use client'

import React, { useState, useEffect } from 'react'
import { User, Mail, Phone, Calendar, Scale, Ruler, Lock, CheckCircle2, ShieldCheck, ArrowRight } from 'lucide-react'
import { supabase } from '@/lib/supabaseClient'
import { usePatientData } from '@/hooks/usePatientData'
import { normalizePhoneNumber } from '@/lib/phone'

export default function PatientProfilePage() {
  const { user, profile, assessment, loading, reloadData } = usePatientData()

  // Profile fields
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [phoneNumber, setPhoneNumber] = useState('')

  // Health assessment fields
  const [age, setAge] = useState('')
  const [height, setHeight] = useState('')
  const [weight, setWeight] = useState('')
  const [goalWeight, setGoalWeight] = useState('')

  const [saving, setSaving] = useState(false)
  const [successMsg, setSuccessMsg] = useState('')
  const [errorMsg, setErrorMsg] = useState('')

  // Populate state with smart fallback cascading across profile, assessment, and user metadata
  useEffect(() => {
    const meta = user?.user_metadata || {}
    const metaFullName = meta.full_name || meta.name || ''
    const metaParts = metaFullName.trim().split(/\s+/)
    const emailPrefix = user?.email ? user.email.split('@')[0] : ''

    const resolvedFirst =
      profile?.first_name ||
      assessment?.first_name ||
      meta.first_name ||
      (metaParts[0] && metaParts[0] !== 'Patient' ? metaParts[0] : '') ||
      (profile?.display_id && profile.display_id.trim() ? profile.display_id.split(' ')[0] : '') ||
      emailPrefix

    const resolvedLast =
      profile?.last_name ||
      assessment?.last_name ||
      meta.last_name ||
      (metaParts.length > 1 ? metaParts.slice(1).join(' ') : '') ||
      (profile?.display_id && profile.display_id.trim().split(' ').length > 1 ? profile.display_id.split(' ').slice(1).join(' ') : '')

    const resolvedPhone =
      profile?.phone_number ||
      assessment?.phone_number ||
      meta.phone_number ||
      user?.phone ||
      ''

    setFirstName(resolvedFirst)
    setLastName(resolvedLast)
    setPhoneNumber(resolvedPhone)

    if (assessment) {
      if (assessment.age) setAge(assessment.age.toString())
      if (assessment.height_cm) setHeight(assessment.height_cm.toString())
      if (assessment.weight_kg) setWeight(assessment.weight_kg.toString())
      if (assessment.goal_weight_kg) setGoalWeight(assessment.goal_weight_kg.toString())
    }
  }, [profile, assessment, user])

  if (loading) {
    return (
      <div className="space-y-6 max-w-4xl font-sans text-[#11241A] animate-pulse" aria-busy="true">
        <div className="h-8 w-44 bg-slate-200/80 rounded-xl" />
        <div className="p-6 sm:p-8 space-y-6 bg-white border border-slate-200/70 rounded-3xl">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-slate-100" />
            <div className="space-y-2">
              <div className="h-5 w-40 bg-slate-100 rounded-lg" />
              <div className="h-3 w-56 bg-slate-100 rounded-md" />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-slate-100">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="space-y-2">
                <div className="h-3 w-24 bg-slate-100 rounded" />
                <div className="h-10 bg-slate-50 border border-slate-100 rounded-xl" />
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setSuccessMsg('')
    setErrorMsg('')

    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) throw new Error('No active session.')

      const normalizedPhone = normalizePhoneNumber(phoneNumber)
      if (phoneNumber.trim() && !normalizedPhone.isValid) {
        throw new Error('Please enter a valid mobile number with country code (e.g. +91 98765 43210).')
      }

      // Execute through server endpoint to avoid PostgreSQL RLS recursion (42P17)
      const res = await fetch('/api/patient/profile', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          firstName,
          lastName,
          phoneNumber: normalizedPhone.isValid ? normalizedPhone.e164 : phoneNumber,
          age,
          height,
          weight,
          goalWeight,
        }),
      })

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || 'Failed to update profile.')
      }

      setSuccessMsg('Your profile has been saved successfully! ✨')
      await reloadData({ force: true })
    } catch (err: unknown) {
      console.error(err)
      setErrorMsg(err instanceof Error ? err.message : 'Failed to update profile.')
    } finally {
      setSaving(false)
    }
  }

  const initials = `${firstName?.[0] || 'P'}${lastName?.[0] || 'M'}`.toUpperCase()

  return (
    <div className="max-w-4xl mx-auto space-y-6 text-[#11241A] font-sans pb-12">
      <div>
        <h3 className="text-2xl font-extrabold tracking-tight text-[#11241A]">My Profile</h3>
        <p className="text-xs text-slate-500 mt-1">Manage your personal details and wellness biometrics</p>
      </div>

      {successMsg && (
        <div className="bg-emerald-50 border border-emerald-200 text-[#00A884] text-xs font-semibold px-4 py-3 rounded-2xl flex items-center gap-2 shadow-xs animate-in fade-in">
          <CheckCircle2 size={16} className="text-[#00A884] shrink-0" /> {successMsg}
        </div>
      )}

      {errorMsg && (
        <div className="bg-rose-50 border border-rose-200 text-rose-600 text-xs font-semibold px-4 py-3 rounded-2xl shadow-xs animate-in fade-in">
          {errorMsg}
        </div>
      )}

      <form onSubmit={handleSave} className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Left Column: Summary Info */}
        <div className="md:col-span-1 space-y-6">
          <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs text-center space-y-4">
            <div className="w-20 h-20 bg-gradient-to-br from-[#00A884] to-[#0A8F70] rounded-full mx-auto flex items-center justify-center text-white text-2xl font-black shadow-md shadow-[#00A884]/20 ring-4 ring-emerald-50">
              {initials}
            </div>
            <div>
              <h4 className="font-extrabold text-[#11241A] text-lg truncate">
                {firstName || lastName ? `${firstName} ${lastName}`.trim() : (user?.email?.split('@')[0] || 'Patient Member')}
              </h4>
              <p className="text-xs text-slate-400 truncate mt-0.5">{user?.email}</p>
            </div>
            <div className="bg-emerald-50 border border-emerald-100 py-1.5 px-4 rounded-full inline-block">
              <span className="text-xs font-bold text-[#00A884] capitalize">
                {assessment?.membership_tier ? (isNaN(Number(assessment.membership_tier)) ? assessment.membership_tier : `${assessment.membership_tier} Month Program`) : 'Active Treatment Program'}
              </span>
            </div>
          </div>

          <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs space-y-3">
            <h4 className="text-[11px] font-mono font-bold uppercase tracking-wider text-slate-400">Security Information</h4>
            <div className="flex items-start gap-3 text-xs text-slate-600 bg-emerald-50/50 p-3.5 rounded-2xl border border-emerald-100/60">
              <ShieldCheck size={18} className="text-[#00A884] shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-[#11241A]">Encryption Active</p>
                <p className="text-[11px] text-slate-500 mt-0.5">Your medical records and biometric data are encrypted in accordance with HIPAA clinical privacy standards.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Editable Details */}
        <div className="md:col-span-2 bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-xs space-y-6">
          <div className="space-y-4">
            <h4 className="text-[11px] font-mono font-bold uppercase tracking-wider text-slate-400 border-b border-slate-100 pb-2">
              Personal Information
            </h4>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-[11px] font-semibold text-slate-600 ml-1">First Name</label>
                <div className="relative">
                  <User size={15} className="absolute left-4 top-3.5 text-slate-400" />
                  <input
                    type="text"
                    required
                    value={firstName}
                    placeholder="Enter first name"
                    onChange={e => setFirstName(e.target.value)}
                    className="w-full bg-slate-50/70 border border-slate-200/80 rounded-2xl pl-10 pr-4 py-3 text-sm text-[#11241A] font-medium outline-none focus:bg-white focus:border-[#00A884] focus:ring-4 focus:ring-[#00A884]/10 transition-all shadow-2xs"
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-[11px] font-semibold text-slate-600 ml-1">Last Name</label>
                <div className="relative">
                  <User size={15} className="absolute left-4 top-3.5 text-slate-400" />
                  <input
                    type="text"
                    required
                    value={lastName}
                    placeholder="Enter last name"
                    onChange={e => setLastName(e.target.value)}
                    className="w-full bg-slate-50/70 border border-slate-200/80 rounded-2xl pl-10 pr-4 py-3 text-sm text-[#11241A] font-medium outline-none focus:bg-white focus:border-[#00A884] focus:ring-4 focus:ring-[#00A884]/10 transition-all shadow-2xs"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-[11px] font-semibold text-slate-600 ml-1">Phone Number</label>
                <div className="relative">
                  <Phone size={15} className="absolute left-4 top-3.5 text-slate-400" />
                  <input
                    type="tel"
                    value={phoneNumber}
                    onChange={e => setPhoneNumber(e.target.value)}
                    placeholder="+91 98765 43210"
                    className="w-full bg-slate-50/70 border border-slate-200/80 rounded-2xl pl-10 pr-4 py-3 text-sm text-[#11241A] font-medium outline-none focus:bg-white focus:border-[#00A884] focus:ring-4 focus:ring-[#00A884]/10 transition-all shadow-2xs"
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-[11px] font-semibold text-slate-600 ml-1">Email Address</label>
                <div className="relative">
                  <Mail size={15} className="absolute left-4 top-3.5 text-slate-400 opacity-60" />
                  <input
                    type="email"
                    disabled
                    value={user?.email || ''}
                    className="w-full bg-slate-100/70 border border-slate-200/60 rounded-2xl pl-10 pr-4 py-3 text-sm text-slate-400 font-medium outline-none cursor-not-allowed"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <h4 className="text-[11px] font-mono font-bold uppercase tracking-wider text-slate-400 border-b border-slate-100 pb-2">
              Body Parameters & Biometrics
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-[11px] font-semibold text-slate-600 ml-1">Age (Years)</label>
                <div className="relative">
                  <Calendar size={15} className="absolute left-4 top-3.5 text-slate-400" />
                  <input
                    type="number"
                    min={18}
                    max={100}
                    value={age}
                    onChange={e => setAge(e.target.value)}
                    placeholder="e.g. 28"
                    className="w-full bg-slate-50/70 border border-slate-200/80 rounded-2xl pl-10 pr-4 py-3 text-sm text-[#11241A] font-medium outline-none focus:bg-white focus:border-[#00A884] focus:ring-4 focus:ring-[#00A884]/10 transition-all shadow-2xs"
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-[11px] font-semibold text-slate-600 ml-1">Height (cm)</label>
                <div className="relative">
                  <Ruler size={15} className="absolute left-4 top-3.5 text-slate-400" />
                  <input
                    type="number"
                    step="0.1"
                    min={100}
                    max={250}
                    value={height}
                    onChange={e => setHeight(e.target.value)}
                    placeholder="e.g. 172"
                    className="w-full bg-slate-50/70 border border-slate-200/80 rounded-2xl pl-10 pr-4 py-3 text-sm text-[#11241A] font-medium outline-none focus:bg-white focus:border-[#00A884] focus:ring-4 focus:ring-[#00A884]/10 transition-all shadow-2xs"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-[11px] font-semibold text-slate-600 ml-1">Starting Weight (kg)</label>
                <div className="relative">
                  <Scale size={15} className="absolute left-4 top-3.5 text-slate-400" />
                  <input
                    type="number"
                    step="0.1"
                    min={35}
                    max={250}
                    value={weight}
                    onChange={e => setWeight(e.target.value)}
                    placeholder="e.g. 78"
                    className="w-full bg-slate-50/70 border border-slate-200/80 rounded-2xl pl-10 pr-4 py-3 text-sm text-[#11241A] font-medium outline-none focus:bg-white focus:border-[#00A884] focus:ring-4 focus:ring-[#00A884]/10 transition-all shadow-2xs"
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-[11px] font-semibold text-slate-600 ml-1">Goal Weight (kg)</label>
                <div className="relative">
                  <Scale size={15} className="absolute left-4 top-3.5 text-slate-400" />
                  <input
                    type="number"
                    step="0.1"
                    min={35}
                    max={250}
                    value={goalWeight}
                    onChange={e => setGoalWeight(e.target.value)}
                    placeholder="e.g. 68"
                    className="w-full bg-slate-50/70 border border-slate-200/80 rounded-2xl pl-10 pr-4 py-3 text-sm text-[#11241A] font-medium outline-none focus:bg-white focus:border-[#00A884] focus:ring-4 focus:ring-[#00A884]/10 transition-all shadow-2xs"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="pt-3 flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="bg-gradient-to-r from-[#00A884] to-[#0A8F70] hover:from-[#009977] hover:to-[#087F63] text-white font-bold px-8 py-3.5 rounded-full text-xs uppercase tracking-wider transition-all disabled:opacity-50 cursor-pointer shadow-md shadow-[#00A884]/20 hover:shadow-lg active:scale-[0.99] flex items-center gap-2"
            >
              <span>{saving ? 'Saving changes...' : 'Save Profile Details'}</span>
              <ArrowRight size={14} />
            </button>
          </div>
        </div>

      </form>
    </div>
  )
}
