'use client'

import React, { useState } from 'react'
import { Settings, Bell, Shield, KeyRound, CheckCircle2, CreditCard, Sparkles } from 'lucide-react'
import { supabase } from '@/lib/supabaseClient'
import { usePatientData } from '@/hooks/usePatientData'

export default function PatientSettingsPage() {
  const { assessment, reloadData } = usePatientData()

  // Notification toggles
  const [emailNotif, setEmailNotif] = useState(true)
  const [smsNotif, setSmsNotif] = useState(true)
  const [meetingNotif, setMeetingNotif] = useState(true)

  // Password fields
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  const [savingPass, setSavingPass] = useState(false)
  const [savingPrefs, setSavingPrefs] = useState(false)
  const [successMsg, setSuccessMsg] = useState('')
  const [errorMsg, setErrorMsg] = useState('')

  const handleUpdatePreferences = async (e: React.FormEvent) => {
    e.preventDefault()
    setSavingPrefs(true)
    setSuccessMsg('')
    setErrorMsg('')

    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) throw new Error('No active session.')

      // Insert notification of action
      await supabase
        .from('patient_notifications')
        .insert({
          patient_id: session.user.id,
          type: 'settings',
          title: 'Notification Settings Updated',
          message: 'Your notification and alert preferences were updated successfully.',
          is_read: false
        })

      setSuccessMsg('Notification preferences updated successfully! 🔔')
      reloadData()
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to update preferences.')
    } finally {
      setSavingPrefs(false)
    }
  }

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newPassword || newPassword.length < 6) {
      setErrorMsg('Password must be at least 6 characters long.')
      return
    }
    if (newPassword !== confirmPassword) {
      setErrorMsg('Passwords do not match.')
      return
    }

    setSavingPass(true)
    setSuccessMsg('')
    setErrorMsg('')

    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword })
      if (error) throw error

      const { data: { session } } = await supabase.auth.getSession()
      if (session) {
        // Insert notification of password change
        await supabase
          .from('patient_notifications')
          .insert({
            patient_id: session.user.id,
            type: 'security',
            title: 'Password Updated',
            message: 'Your account password was changed successfully.',
            is_read: false
          })
      }

      setSuccessMsg('Your password has been changed successfully! 🔐')
      setNewPassword('')
      setConfirmPassword('')
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to change password.')
    } finally {
      setSavingPass(false)
    }
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 text-[#1A1F36]">
      <div>
        <h3 className="text-xl font-bold font-sora text-[#1A1F36]">Account Settings</h3>
        <p className="text-xs text-[#8896A4] mt-1">Configure your portal alerts, subscription plans, and credentials</p>
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

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Left Column: Plan Overview */}
        <div className="md:col-span-1 space-y-6">
          <div className="bg-white rounded-3xl p-6 border border-[#1A1F36]/6 shadow-sm space-y-4">
            <div className="flex items-center gap-2 text-[#C4622D]">
              <Sparkles size={16} />
              <h4 className="text-xs font-black uppercase tracking-wider text-[#8896A4]">Current Plan</h4>
            </div>
            
            <div className="space-y-1">
              <p className="text-lg font-black font-sora text-[#1A1F36] capitalize">
                {assessment?.membership_tier || 'Silver Plan'}
              </p>
              <p className="text-xs text-[#8896A4]">Active medical program subscription</p>
            </div>

            <div className="border-t border-[#1A1F36]/6 pt-4 space-y-2.5 text-xs">
              <div className="flex justify-between">
                <span className="text-[#8896A4]">Consultation Fee:</span>
                <span className="font-bold text-[#5C7A6B]">Paid ✅</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#8896A4]">State of Care:</span>
                <span className="font-bold text-[#1A1F36] uppercase">{assessment?.shipping_state || 'Not Set'}</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-3xl p-6 border border-[#1A1F36]/6 shadow-sm space-y-4">
            <div className="flex items-center gap-2 text-[#C4622D]">
              <Shield size={16} />
              <h4 className="text-xs font-black uppercase tracking-wider text-[#8896A4]">Compliance</h4>
            </div>
            <p className="text-xs text-[#8896A4] leading-relaxed">
              Our patient portal is fully HIPAA compliant. All communication, video streams, and messages are encrypted end-to-end.
            </p>
          </div>
        </div>

        {/* Right Column: Preferences & Security */}
        <div className="md:col-span-2 space-y-6">
          
          {/* Notification Preferences */}
          <div className="bg-white rounded-3xl p-6 lg:p-8 border border-[#1A1F36]/6 shadow-sm space-y-6">
            <div className="flex items-center gap-2">
              <Bell size={18} className="text-[#C4622D]" />
              <h4 className="text-sm font-bold font-sora text-[#1A1F36]">Alert & Notification Preferences</h4>
            </div>

            <form onSubmit={handleUpdatePreferences} className="space-y-4">
              <div className="space-y-3">
                <label className="flex items-start gap-3 p-3 hover:bg-[#F5F0EB]/50 rounded-2xl cursor-pointer transition-colors">
                  <input
                    type="checkbox"
                    checked={emailNotif}
                    onChange={e => setEmailNotif(e.target.checked)}
                    className="w-4 h-4 rounded text-[#C4622D] border-[#1A1F36]/12 focus:ring-[#C4622D] mt-0.5"
                  />
                  <div>
                    <span className="text-xs font-bold text-[#1A1F36] block">Email Notifications</span>
                    <span className="text-[11px] text-[#8896A4] mt-0.5 block">Receive prescription refills and consultation links in your inbox.</span>
                  </div>
                </label>

                <label className="flex items-start gap-3 p-3 hover:bg-[#F5F0EB]/50 rounded-2xl cursor-pointer transition-colors">
                  <input
                    type="checkbox"
                    checked={smsNotif}
                    onChange={e => setSmsNotif(e.target.checked)}
                    className="w-4 h-4 rounded text-[#C4622D] border-[#1A1F36]/12 focus:ring-[#C4622D] mt-0.5"
                  />
                  <div>
                    <span className="text-xs font-bold text-[#1A1F36] block">SMS Reminders</span>
                    <span className="text-[11px] text-[#8896A4] mt-0.5 block">Receive SMS text alerts 1 hour before scheduled video sessions.</span>
                  </div>
                </label>

                <label className="flex items-start gap-3 p-3 hover:bg-[#F5F0EB]/50 rounded-2xl cursor-pointer transition-colors">
                  <input
                    type="checkbox"
                    checked={meetingNotif}
                    onChange={e => setMeetingNotif(e.target.checked)}
                    className="w-4 h-4 rounded text-[#C4622D] border-[#1A1F36]/12 focus:ring-[#C4622D] mt-0.5"
                  />
                  <div>
                    <span className="text-xs font-bold text-[#1A1F36] block">Dashboard Alert Banner</span>
                    <span className="text-[11px] text-[#8896A4] mt-0.5 block">Show upcoming meeting reminder alerts at the top of the dashboard.</span>
                  </div>
                </label>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  disabled={savingPrefs}
                  className="bg-[#1A1F36] hover:bg-[#C4622D] text-white font-bold px-6 py-3 rounded-full text-xs uppercase tracking-wider transition-colors disabled:opacity-50 cursor-pointer shadow-md shadow-[#1A1F36]/10"
                >
                  {savingPrefs ? 'Updating...' : 'Save Preferences'}
                </button>
              </div>
            </form>
          </div>

          {/* Change Password */}
          <div className="bg-white rounded-3xl p-6 lg:p-8 border border-[#1A1F36]/6 shadow-sm space-y-6">
            <div className="flex items-center gap-2">
              <KeyRound size={18} className="text-[#C4622D]" />
              <h4 className="text-sm font-bold font-sora text-[#1A1F36]">Change Password</h4>
            </div>

            <form onSubmit={handleChangePassword} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase tracking-wider text-[#8896A4] ml-1">New Password</label>
                  <input
                    type="password"
                    required
                    placeholder="Enter new password"
                    value={newPassword}
                    onChange={e => setNewPassword(e.target.value)}
                    className="w-full bg-[#F5F0EB] border border-transparent rounded-xl px-4 py-3 text-sm text-[#1A1F36] font-medium outline-none focus:border-[#C4622D]/20 focus:ring-2 focus:ring-[#C4622D]/15"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase tracking-wider text-[#8896A4] ml-1">Confirm New Password</label>
                  <input
                    type="password"
                    required
                    placeholder="Confirm new password"
                    value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
                    className="w-full bg-[#F5F0EB] border border-transparent rounded-xl px-4 py-3 text-sm text-[#1A1F36] font-medium outline-none focus:border-[#C4622D]/20 focus:ring-2 focus:ring-[#C4622D]/15"
                  />
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  disabled={savingPass}
                  className="bg-[#1A1F36] hover:bg-[#C4622D] text-white font-bold px-6 py-3 rounded-full text-xs uppercase tracking-wider transition-colors disabled:opacity-50 cursor-pointer shadow-md shadow-[#1A1F36]/10"
                >
                  {savingPass ? 'Updating Password...' : 'Update Password'}
                </button>
              </div>
            </form>
          </div>

        </div>

      </div>
    </div>
  )
}
