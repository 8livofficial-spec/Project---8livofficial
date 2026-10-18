'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import {
  Settings,
  Bell,
  Shield,
  KeyRound,
  CheckCircle2,
  CreditCard,
  Sparkles,
  Eye,
  EyeOff,
  Lock,
  AlertTriangle,
  FileText,
  ExternalLink,
  ShieldCheck,
  RefreshCw,
} from 'lucide-react'
import { supabase } from '@/lib/supabaseClient'
import { usePatientData } from '@/hooks/usePatientData'

export default function PatientSettingsPage() {
  const { assessment, reloadData, loading } = usePatientData()

  // Notification toggles
  const [emailNotif, setEmailNotif] = useState(true)
  const [smsNotif, setSmsNotif] = useState(true)
  const [meetingNotif, setMeetingNotif] = useState(true)

  // Password fields
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  const [savingPass, setSavingPass] = useState(false)
  const [passSuccess, setPassSuccess] = useState('')
  const [passError, setPassError] = useState('')
  const [savingPrefs, setSavingPrefs] = useState(false)
  const [successMsg, setSuccessMsg] = useState('')
  const [errorMsg, setErrorMsg] = useState('')

  // Privacy & Consent state
  const [consentLoading, setConsentLoading] = useState(true)
  const [consentStatus, setConsentStatus] = useState<any>(null)
  const [withdrawing, setWithdrawing] = useState(false)
  const [confirmWithdrawModal, setConfirmWithdrawModal] = useState<string | null>(null)

  const fetchConsentStatus = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return
      const res = await fetch('/api/consent/status', {
        headers: { Authorization: `Bearer ${session.access_token}` },
      })
      if (res.ok) {
        const data = await res.json()
        setConsentStatus(data)
      }
    } catch (err) {
      console.warn('Failed to fetch consent status:', err)
    } finally {
      setConsentLoading(false)
    }
  }

  useEffect(() => {
    fetchConsentStatus()
  }, [])

  const handleWithdrawConsent = async (documentId: string, gate: string) => {
    setWithdrawing(true)
    setErrorMsg('')
    setSuccessMsg('')
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) throw new Error('Session expired.')

      const res = await fetch('/api/consent/withdraw', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          documentId,
          gate,
          reason: 'Patient self-service withdrawal via portal settings',
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to record withdrawal.')

      setSuccessMsg(`Consent for ${documentId.replace('_', ' ')} has been successfully withdrawn and logged in your audit record.`)
      setConfirmWithdrawModal(null)
      await fetchConsentStatus()
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to withdraw consent.')
    } finally {
      setWithdrawing(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center text-[#C4622D]">
        <div className="w-10 h-10 border-4 border-current border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

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
                {assessment?.membership_tier ? (isNaN(Number(assessment.membership_tier)) ? assessment.membership_tier : `${assessment.membership_tier} Month Program`) : 'Active Treatment Program'}
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
                  <div className="relative">
                    <input
                      type={showNewPassword ? "text" : "password"}
                      required
                      placeholder="Enter new password"
                      value={newPassword}
                      onChange={e => setNewPassword(e.target.value)}
                      className="w-full bg-[#F5F0EB] border border-transparent rounded-xl pl-4 pr-11 py-3 text-sm text-[#1A1F36] font-medium outline-none focus:border-[#C4622D]/20 focus:ring-2 focus:ring-[#C4622D]/15"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8896A4] hover:text-[#1A1F36] transition-colors focus:outline-none"
                      aria-label={showNewPassword ? "Hide password" : "Show password"}
                    >
                      {showNewPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase tracking-wider text-[#8896A4] ml-1">Confirm New Password</label>
                  <div className="relative">
                    <input
                      type={showConfirmPassword ? "text" : "password"}
                      required
                      placeholder="Confirm new password"
                      value={confirmPassword}
                      onChange={e => setConfirmPassword(e.target.value)}
                      className="w-full bg-[#F5F0EB] border border-transparent rounded-xl pl-4 pr-11 py-3 text-sm text-[#1A1F36] font-medium outline-none focus:border-[#C4622D]/20 focus:ring-2 focus:ring-[#C4622D]/15"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8896A4] hover:text-[#1A1F36] transition-colors focus:outline-none"
                      aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                    >
                      {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
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

          {/* Privacy & Statutory Consents Management */}
          <div className="bg-white rounded-3xl p-6 lg:p-8 border border-[#1A1F36]/6 shadow-sm space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldCheck size={20} className="text-[#00A884]" />
                <div>
                  <h4 className="text-sm font-bold font-sora text-[#1A1F36]">Privacy &amp; Statutory Consents</h4>
                  <p className="text-xs text-[#8896A4] mt-0.5">DPDP Act &amp; Telemedicine Practice Guidelines compliance records</p>
                </div>
              </div>
              <button
                type="button"
                onClick={fetchConsentStatus}
                disabled={consentLoading}
                className="text-xs text-[#00A884] hover:underline flex items-center gap-1 font-semibold cursor-pointer"
              >
                <RefreshCw size={12} className={consentLoading ? 'animate-spin' : ''} />
                Refresh
              </button>
            </div>

            {consentLoading ? (
              <div className="py-6 text-center text-xs text-slate-400">Loading statutory consent records...</div>
            ) : (
              <div className="space-y-4">
                {/* Gate 1: Data Notice */}
                <div className="p-4 rounded-2xl bg-[#FBF9F5] border border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-[#11241A]">Gate 1: Data &amp; Privacy Notice</span>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded-full font-bold bg-emerald-100 text-emerald-800">
                        Version {consentStatus?.currentVersion || 'v4.0'}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500">
                      Authorizes 8liv health data collection and care-team coordination with your doctor, dietician, and trainer.
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-xl border border-emerald-200">
                      <CheckCircle2 size={13} />
                      {consentStatus?.gate1Accepted ? 'Active & Accepted' : 'Pending'}
                    </span>
                    <Link
                      href="/privacy"
                      target="_blank"
                      className="p-1.5 rounded-xl border border-slate-200 hover:bg-white text-slate-500 hover:text-slate-900 transition-colors"
                      title="View Published Privacy Policy"
                    >
                      <ExternalLink size={14} />
                    </Link>
                  </div>
                </div>

                {/* Gate 2: Terms of Service */}
                <div className="p-4 rounded-2xl bg-[#FBF9F5] border border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-[#11241A]">Gate 2: Terms &amp; Platform Policies</span>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded-full font-bold bg-emerald-100 text-emerald-800">
                        Version {consentStatus?.currentVersion || 'v4.0'}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500">
                      Covers Terms of Service, Privacy Policy, and Prescription Policy before appointment checkout.
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-xl border border-emerald-200">
                      <CheckCircle2 size={13} />
                      {consentStatus?.gate2Accepted ? 'Active & Accepted' : 'Pending'}
                    </span>
                    <Link
                      href="/terms"
                      target="_blank"
                      className="p-1.5 rounded-xl border border-slate-200 hover:bg-white text-slate-500 hover:text-slate-900 transition-colors"
                      title="View Published Terms"
                    >
                      <ExternalLink size={14} />
                    </Link>
                  </div>
                </div>

                {/* Gate 3: Informed Treatment Consent */}
                <div className="p-4 rounded-2xl bg-[#FBF9F5] border border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-[#11241A]">Gate 3: Informed Treatment Consent (12 Statements)</span>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded-full font-bold bg-emerald-100 text-emerald-800">
                        Version {consentStatus?.currentVersion || 'v4.0'}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500">
                      Clinical consent to remote telemedicine consultation, electronic records, and independent medical evaluation.
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className={`inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-xl border ${
                      consentStatus?.gate3Accepted
                        ? 'text-emerald-700 bg-emerald-50 border-emerald-200'
                        : 'text-amber-700 bg-amber-50 border-amber-200'
                    }`}>
                      <CheckCircle2 size={13} />
                      {consentStatus?.gate3Accepted ? 'Active & Accepted' : 'Required for Next Call'}
                    </span>
                    {consentStatus?.gate3Accepted && (
                      <button
                        type="button"
                        onClick={() => setConfirmWithdrawModal('treatment_consent')}
                        disabled={withdrawing}
                        className="px-3 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-xl text-xs font-bold border border-rose-200 transition-colors cursor-pointer"
                      >
                        Withdraw
                      </button>
                    )}
                  </div>
                </div>

                {/* Statutory Notice */}
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-600 text-xs flex items-start gap-2.5">
                  <Lock size={15} className="text-slate-400 shrink-0 mt-0.5" />
                  <p className="leading-relaxed">
                    Under the Digital Personal Data Protection Act, you have the right to withdraw your consent at any time. All acceptances and withdrawals are recorded in a permanent append-only audit trail with UTC and IST timestamps.
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Withdrawal Confirmation Modal */}
          {confirmWithdrawModal && (
            <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
              <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4 animate-in fade-in zoom-in duration-150">
                <div className="flex items-center gap-3 text-rose-600">
                  <div className="p-2.5 rounded-2xl bg-rose-50 border border-rose-200">
                    <AlertTriangle size={22} />
                  </div>
                  <h4 className="text-base font-bold text-slate-900 font-sora">
                    Withdraw Treatment Consent?
                  </h4>
                </div>

                <p className="text-xs text-slate-600 leading-relaxed">
                  Withdrawing your treatment consent will <strong>pause upcoming doctor consultations</strong> and suspend care plan coordination until consent is renewed. Your historical medical records remain protected under statutory medical retention laws.
                </p>

                <div className="flex items-center justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setConfirmWithdrawModal(null)}
                    disabled={withdrawing}
                    className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => handleWithdrawConsent('treatment_consent', 'gate3')}
                    disabled={withdrawing}
                    className="px-4 py-2.5 rounded-xl text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 transition-colors cursor-pointer shadow-md shadow-rose-600/20"
                  >
                    {withdrawing ? 'Recording Withdrawal...' : 'Confirm Withdrawal'}
                  </button>
                </div>
              </div>
            </div>
          )}

        </div>

      </div>
    </div>
  )
}
