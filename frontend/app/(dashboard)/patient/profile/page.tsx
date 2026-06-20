'use client'

import React, { useState, useEffect } from 'react'
import { User, Mail, Phone, Calendar, Scale, Ruler, Lock, CheckCircle2 } from 'lucide-react'
import { supabase } from '@/lib/supabaseClient'
import { usePatientData } from '@/hooks/usePatientData'
import { motion } from 'framer-motion'

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

  if (loading) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center text-[#C4622D]">
        <div className="w-10 h-10 border-4 border-current border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  // Populate state when data loads
  useEffect(() => {
    if (profile) {
      setFirstName(profile.first_name || '')
      setLastName(profile.last_name || '')
      setPhoneNumber(profile.phone_number || '')
    } else if (assessment) {
      setFirstName(assessment.first_name || '')
      setLastName(assessment.last_name || '')
      setPhoneNumber(assessment.phone_number || '')
    }

    if (assessment) {
      setAge(assessment.age?.toString() || '')
      setHeight(assessment.height_cm?.toString() || '')
      setWeight(assessment.weight_kg?.toString() || '')
      setGoalWeight(assessment.goal_weight_kg?.toString() || '')
    }
  }, [profile, assessment])

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setSuccessMsg('')
    setErrorMsg('')

    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) throw new Error('No active session.')

      const userId = session.user.id

      // ── 1. Update Profiles Table ──
      const { error: profileErr } = await supabase
        .from('profiles')
        .upsert({
          id: userId,
          first_name: firstName,
          last_name: lastName,
          phone_number: phoneNumber,
          role: 'patient',
          updated_at: new Date().toISOString()
        })

      if (profileErr) throw profileErr

      // ── 2. Update Health Assessments Table ──
      // First check if an assessment row already exists for this patient
      const { data: existingAssess } = await supabase
        .from('health_assessments')
        .select('id')
        .eq('patient_id', userId)
        .order('created_at', { ascending: false })
        .limit(1)

      const updateData = {
        first_name: firstName,
        last_name: lastName,
        phone_number: phoneNumber,
        age: age ? parseInt(age) : null,
        height_cm: height ? parseFloat(height) : null,
        weight_kg: weight ? parseFloat(weight) : null,
        goal_weight_kg: goalWeight ? parseFloat(goalWeight) : null,
        updated_at: new Date().toISOString()
      }

      if (existingAssess && existingAssess.length > 0) {
        // Update existing row
        const { error: assessErr } = await supabase
          .from('health_assessments')
          .update(updateData)
          .eq('id', existingAssess[0].id)

        if (assessErr) throw assessErr
      } else {
        // Insert new row
        const { error: assessErr } = await supabase
          .from('health_assessments')
          .insert({
            patient_id: userId,
            ...updateData
          })

        if (assessErr) throw assessErr
      }

      // ── 3. Record dynamic notification for updating profile ──
      await supabase
        .from('patient_notifications')
        .insert({
          patient_id: userId,
          type: 'profile',
          title: 'Profile Updated',
          message: 'You successfully updated your personal profile details.',
          is_read: false
        })

      setSuccessMsg('Your profile has been updated successfully! ✨')
      reloadData()
    } catch (err: any) {
      console.error(err)
      setErrorMsg(err.message || 'Failed to update profile.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 text-[#1A1F36]">
      <div>
        <h3 className="text-xl font-bold font-sora text-[#1A1F36]">My Profile</h3>
        <p className="text-xs text-[#8896A4] mt-1">Manage your personal details and wellness parameters</p>
      </div>

      {successMsg && (
        <div className="bg-[#5C7A6B]/8 border border-[#5C7A6B]/25 text-[#5C7A6B] text-xs font-semibold px-4 py-3 rounded-xl flex items-center gap-2">
          <CheckCircle2 size={14} /> {successMsg}
        </div>
      )}

      {errorMsg && (
        <div className="bg-red-500/8 border border-red-500/25 text-red-500 text-xs font-semibold px-4 py-3 rounded-xl">
          {errorMsg}
        </div>
      )}

      <form onSubmit={handleSave} className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Left Column: Summary Info */}
        <div className="md:col-span-1 space-y-6">
          <div className="bg-white rounded-3xl p-6 border border-[#1A1F36]/6 shadow-sm text-center space-y-4">
            <div className="w-20 h-20 bg-gradient-to-br from-[#C4622D] to-[#A8522A] rounded-full mx-auto flex items-center justify-center text-white text-2xl font-black font-sora shadow-md">
              {firstName?.[0] || 'P'}{lastName?.[0] || 'M'}
            </div>
            <div>
              <h4 className="font-bold text-[#1A1F36] font-sora truncate">{firstName} {lastName}</h4>
              <p className="text-xs text-[#8896A4] truncate">{user?.email}</p>
            </div>
            <div className="bg-[#F5F0EB] py-2 px-4 rounded-full inline-block">
              <span className="text-xs font-bold text-[#C4622D] capitalize">
                {assessment?.membership_tier || 'Silver Plan'} Member
              </span>
            </div>
          </div>

          <div className="bg-white rounded-3xl p-6 border border-[#1A1F36]/6 shadow-sm space-y-4">
            <h4 className="text-xs font-black uppercase tracking-wider text-[#8896A4]">Security Information</h4>
            <div className="flex items-center gap-3 text-xs text-[#8896A4]">
              <Lock size={14} className="text-[#C4622D]" />
              <div>
                <p className="font-bold text-[#1A1F36]">Encryption Active</p>
                <p className="mt-0.5">Your medical records are encrypted.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Editable Details */}
        <div className="md:col-span-2 bg-white rounded-3xl p-6 lg:p-8 border border-[#1A1F36]/6 shadow-sm space-y-6">
          <div className="space-y-4">
            <h4 className="text-xs font-black uppercase tracking-wider text-[#8896A4] border-b border-[#1A1F36]/6 pb-2">
              Personal Information
            </h4>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase tracking-wider text-[#8896A4] ml-1">First Name</label>
                <div className="relative">
                  <User size={14} className="absolute left-4 top-3.5 text-[#8896A4]" />
                  <input
                    type="text"
                    required
                    value={firstName}
                    onChange={e => setFirstName(e.target.value)}
                    className="w-full bg-[#F5F0EB] border border-transparent rounded-xl pl-10 pr-4 py-3 text-sm text-[#1A1F36] font-medium outline-none focus:border-[#C4622D]/20 focus:ring-2 focus:ring-[#C4622D]/15"
                  />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase tracking-wider text-[#8896A4] ml-1">Last Name</label>
                <div className="relative">
                  <User size={14} className="absolute left-4 top-3.5 text-[#8896A4]" />
                  <input
                    type="text"
                    required
                    value={lastName}
                    onChange={e => setLastName(e.target.value)}
                    className="w-full bg-[#F5F0EB] border border-transparent rounded-xl pl-10 pr-4 py-3 text-sm text-[#1A1F36] font-medium outline-none focus:border-[#C4622D]/20 focus:ring-2 focus:ring-[#C4622D]/15"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase tracking-wider text-[#8896A4] ml-1">Phone Number</label>
                <div className="relative">
                  <Phone size={14} className="absolute left-4 top-3.5 text-[#8896A4]" />
                  <input
                    type="tel"
                    value={phoneNumber}
                    onChange={e => setPhoneNumber(e.target.value)}
                    placeholder="Enter phone number"
                    className="w-full bg-[#F5F0EB] border border-transparent rounded-xl pl-10 pr-4 py-3 text-sm text-[#1A1F36] font-medium outline-none focus:border-[#C4622D]/20 focus:ring-2 focus:ring-[#C4622D]/15"
                  />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase tracking-wider text-[#8896A4] ml-1">Email Address</label>
                <div className="relative">
                  <Mail size={14} className="absolute left-4 top-3.5 text-[#8896A4] opacity-50" />
                  <input
                    type="email"
                    disabled
                    value={user?.email || ''}
                    className="w-full bg-[#F5F0EB] opacity-60 border border-transparent rounded-xl pl-10 pr-4 py-3 text-sm text-[#8896A4] font-medium outline-none cursor-not-allowed"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <h4 className="text-xs font-black uppercase tracking-wider text-[#8896A4] border-b border-[#1A1F36]/6 pb-2">
              Body Parameters & Biometrics
            </h4>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase tracking-wider text-[#8896A4] ml-1">Age (Years)</label>
                <div className="relative">
                  <Calendar size={14} className="absolute left-4 top-3.5 text-[#8896A4]" />
                  <input
                    type="number"
                    value={age}
                    onChange={e => setAge(e.target.value)}
                    placeholder="Enter age"
                    className="w-full bg-[#F5F0EB] border border-transparent rounded-xl pl-10 pr-4 py-3 text-sm text-[#1A1F36] font-medium outline-none focus:border-[#C4622D]/20 focus:ring-2 focus:ring-[#C4622D]/15"
                  />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase tracking-wider text-[#8896A4] ml-1">Height (cm)</label>
                <div className="relative">
                  <Ruler size={14} className="absolute left-4 top-3.5 text-[#8896A4]" />
                  <input
                    type="number"
                    step="0.1"
                    value={height}
                    onChange={e => setHeight(e.target.value)}
                    placeholder="Enter height"
                    className="w-full bg-[#F5F0EB] border border-transparent rounded-xl pl-10 pr-4 py-3 text-sm text-[#1A1F36] font-medium outline-none focus:border-[#C4622D]/20 focus:ring-2 focus:ring-[#C4622D]/15"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase tracking-wider text-[#8896A4] ml-1">Starting Weight (kg)</label>
                <div className="relative">
                  <Scale size={14} className="absolute left-4 top-3.5 text-[#8896A4]" />
                  <input
                    type="number"
                    step="0.1"
                    value={weight}
                    onChange={e => setWeight(e.target.value)}
                    placeholder="Enter starting weight"
                    className="w-full bg-[#F5F0EB] border border-transparent rounded-xl pl-10 pr-4 py-3 text-sm text-[#1A1F36] font-medium outline-none focus:border-[#C4622D]/20 focus:ring-2 focus:ring-[#C4622D]/15"
                  />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase tracking-wider text-[#8896A4] ml-1">Goal Weight (kg)</label>
                <div className="relative">
                  <Scale size={14} className="absolute left-4 top-3.5 text-[#8896A4]" />
                  <input
                    type="number"
                    step="0.1"
                    value={goalWeight}
                    onChange={e => setGoalWeight(e.target.value)}
                    placeholder="Enter goal weight"
                    className="w-full bg-[#F5F0EB] border border-transparent rounded-xl pl-10 pr-4 py-3 text-sm text-[#1A1F36] font-medium outline-none focus:border-[#C4622D]/20 focus:ring-2 focus:ring-[#C4622D]/15"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="pt-2 flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="bg-[#1A1F36] hover:bg-[#C4622D] text-white font-bold px-8 py-3.5 rounded-full text-xs uppercase tracking-wider transition-colors disabled:opacity-50 cursor-pointer shadow-md shadow-[#1A1F36]/10"
            >
              {saving ? 'Saving changes...' : 'Save Profile Details'}
            </button>
          </div>
        </div>

      </form>
    </div>
  )
}
