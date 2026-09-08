'use client'

import { useState } from 'react'
import Link from 'next/link'
import {
  GraduationCap,
  Award,
  Stethoscope,
  Building2,
  Calendar,
  CheckCircle2,
  Copy,
  ExternalLink,
  ShieldCheck,
  User,
  Mail,
  Phone,
  ArrowLeft,
  Sparkles,
  DollarSign,
  Languages,
  BookOpen,
  Info,
} from 'lucide-react'
import { authedFetch } from '@/lib/apiClient'

type ProviderRole = 'DIETITIAN' | 'DOCTOR' | 'NUTRITIONIST' | 'FITNESS_COACH'

interface CreatedResult {
  email: string
  role: string
  providerId: string
  activationLink?: string
}

export default function AdminNewProviderPage() {
  const [role, setRole] = useState<ProviderRole>('DIETITIAN')
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [phoneNumber, setPhoneNumber] = useState('')
  const [qualification, setQualification] = useState('')
  const [institution, setInstitution] = useState('')
  const [yearsExperience, setYearsExperience] = useState<number | string>(5)
  const [registrationNumber, setRegistrationNumber] = useState('')
  const [registrationCouncil, setRegistrationCouncil] = useState('Indian Dietetic Association (IDA)')
  const [specialization, setSpecialization] = useState('Clinical Nutrition & Diabetes Care')
  const [consultationLanguages, setConsultationLanguages] = useState('English, Hindi')
  const [payoutAmount, setPayoutAmount] = useState<number | string>(400)
  const [consultationType, setConsultationType] = useState('Video Consultation')
  const [internalReference, setInternalReference] = useState('')
  const [joiningDate, setJoiningDate] = useState(new Date().toISOString().split('T')[0])
  const [internalNotes, setInternalNotes] = useState('')

  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [createdResult, setCreatedResult] = useState<CreatedResult | null>(null)
  const [copiedLink, setCopiedLink] = useState(false)

  // Handle role switch with intelligent clinical defaults
  const handleRoleChange = (newRole: ProviderRole) => {
    setRole(newRole)
    if (newRole === 'DIETITIAN') {
      if (!qualification || qualification.includes('MBBS')) {
        setQualification('M.Sc. Clinical Nutrition & Dietetics, RD')
      }
      if (!institution || institution.includes('AIIMS')) {
        setInstitution('National Institute of Nutrition (NIN) / SNDT University')
      }
      setRegistrationCouncil('Indian Dietetic Association (IDA)')
      if (!specialization || specialization.includes('Endocrinology')) {
        setSpecialization('Clinical Nutrition, Diabetes & Metabolic Health')
      }
      setPayoutAmount(400)
    } else if (newRole === 'DOCTOR') {
      if (!qualification || qualification.includes('Nutrition')) {
        setQualification('MBBS, MD (General Medicine), DNB Endocrinology')
      }
      if (!institution || institution.includes('Nutrition')) {
        setInstitution('All India Institute of Medical Sciences (AIIMS)')
      }
      setRegistrationCouncil('National Medical Commission (NMC)')
      if (!specialization || specialization.includes('Nutrition')) {
        setSpecialization('Endocrinology & Diabetology')
      }
      setPayoutAmount(500)
    } else if (newRole === 'NUTRITIONIST') {
      setQualification('P.G. Diploma in Sports Nutrition & Dietetics')
      setInstitution('Institute of Home Economics / SNDT')
      setRegistrationCouncil('Nutrition Society of India (NSI)')
      setSpecialization('Sports & Metabolic Nutrition')
      setPayoutAmount(350)
    } else if (newRole === 'FITNESS_COACH') {
      setQualification('Certified Clinical Exercise Physiologist (ACSM/NSCA)')
      setInstitution('American Council on Exercise (ACE)')
      setRegistrationCouncil('National Strength and Conditioning Association')
      setSpecialization('Functional Strength & Metabolic Conditioning')
      setPayoutAmount(350)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError('')
    setCreatedResult(null)

    const payload = {
      fullName: fullName.trim(),
      email: email.trim().toLowerCase(),
      phoneNumber: phoneNumber.trim(),
      role,
      qualification: qualification.trim(),
      institution: institution.trim(),
      yearsExperience: Number(yearsExperience) || 0,
      registrationNumber: registrationNumber.trim(),
      registrationCouncil: registrationCouncil.trim(),
      specialization: specialization.trim(),
      consultationLanguages: consultationLanguages.trim(),
      payoutAmount: Number(payoutAmount) || 0,
      consultationType: consultationType.trim(),
      internalReference: internalReference.trim(),
      joiningDate,
      compensationModelPlaceholder: `INR ${payoutAmount} per consultation`,
      internalNotes: internalNotes.trim(),
    }

    try {
      const response = await authedFetch('/api/admin/providers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || 'Failed to set up and invite provider.')
      }

      setCreatedResult({
        email: data.email || payload.email,
        role: data.role || payload.role,
        providerId: data.providerId || '',
        activationLink: data.activationLink,
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to invite provider.')
    } finally {
      setSaving(false)
    }
  }

  const handleCopyLink = () => {
    if (!createdResult?.activationLink) return
    navigator.clipboard.writeText(createdResult.activationLink)
    setCopiedLink(true)
    setTimeout(() => setCopiedLink(false), 2500)
  }

  const handleResetForAnother = () => {
    setCreatedResult(null)
    setFullName('')
    setEmail('')
    setPhoneNumber('')
    setRegistrationNumber('')
    setInternalReference('')
    setInternalNotes('')
  }

  return (
    <main className="min-h-screen bg-[#FAF8F5] px-4 py-8 text-[#1A1F36]">
      <div className="mx-auto max-w-6xl space-y-6">
        {/* Navigation & Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <Link
              href="/admin/providers"
              className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-[#C4622D] hover:underline"
            >
              <ArrowLeft className="h-3.5 w-3.5" /> Back to Providers Directory
            </Link>
            <h1 className="text-3xl font-black tracking-tight text-[#1A1F36]">
              Clinical Setup & Invitation
            </h1>
            <p className="text-sm font-semibold text-slate-500">
              Enter verified clinical degrees, institution study experience, and registration before inviting the provider.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-black text-emerald-800">
              <ShieldCheck className="h-3.5 w-3.5" /> Pre-Verified Admin Onboarding
            </span>
          </div>
        </div>

        {/* Success Modal / Card if Created */}
        {createdResult && (
          <div className="rounded-3xl border border-emerald-300 bg-gradient-to-br from-emerald-50 via-white to-teal-50 p-8 shadow-md">
            <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
              <div className="space-y-2">
                <div className="inline-flex items-center gap-2 rounded-full bg-emerald-100 px-3 py-1 text-xs font-black text-emerald-900">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  Credentials Pre-Verified & Invitation Sent
                </div>
                <h2 className="text-2xl font-black text-[#1A1F36]">
                  {fullName || 'Provider'} is Ready!
                </h2>
                <p className="text-sm font-medium text-slate-600">
                  An official activation email with login setup instructions was dispatched to{' '}
                  <span className="font-bold text-[#1A1F36]">{createdResult.email}</span>. Their study credentials ({qualification}) and registration are already configured.
                </p>
              </div>

              <div className="flex flex-wrap gap-3">
                {createdResult.activationLink && (
                  <button
                    type="button"
                    onClick={handleCopyLink}
                    className="inline-flex items-center gap-2 rounded-xl bg-[#0D9488] px-4 py-2.5 text-xs font-black text-white shadow-sm transition-all hover:bg-[#0b7a70]"
                  >
                    <Copy className="h-4 w-4" />
                    {copiedLink ? 'Link Copied!' : 'Copy Activation Link'}
                  </button>
                )}
                <button
                  type="button"
                  onClick={handleResetForAnother}
                  className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50"
                >
                  Invite Another Provider
                </button>
                <Link
                  href="/admin/providers"
                  className="rounded-xl bg-[#1A1F36] px-4 py-2.5 text-xs font-black text-white hover:bg-[#252C48]"
                >
                  View Directory
                </Link>
              </div>
            </div>

            {createdResult.activationLink && (
              <div className="mt-6 rounded-xl border border-emerald-200 bg-white/80 p-3 text-xs font-mono text-slate-700">
                <p className="text-[11px] font-bold uppercase text-slate-400">Direct Activation Link (Share via WhatsApp / Slack):</p>
                <p className="truncate select-all mt-1">{createdResult.activationLink}</p>
              </div>
            )}
          </div>
        )}

        {/* Error Notification */}
        {error && (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm font-bold text-rose-800">
            {error}
          </div>
        )}

        {/* Main Grid: Form + Live Clinical Card Preview */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          {/* Left Form: 8 cols */}
          <form onSubmit={handleSubmit} className="space-y-6 lg:col-span-8">
            {/* Step 1: Role Selection */}
            <div className="rounded-3xl border border-[#E8DED4] bg-white p-6 shadow-sm">
              <p className="text-xs font-black uppercase tracking-[0.16em] text-[#C4622D]">
                Step 1 • Provider Clinical Role
              </p>
              <h2 className="mt-1 text-lg font-black text-[#1A1F36]">Select Clinical Discipline</h2>
              <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
                {[
                  {
                    key: 'DIETITIAN',
                    label: 'Dietitian',
                    sub: 'Clinical Nutritionist',
                    icon: GraduationCap,
                    accent: '#0D9488',
                  },
                  {
                    key: 'DOCTOR',
                    label: 'Doctor',
                    sub: 'Physician / Specialist',
                    icon: Stethoscope,
                    accent: '#4F46E5',
                  },
                  {
                    key: 'NUTRITIONIST',
                    label: 'Nutritionist',
                    sub: 'Metabolic & Wellness',
                    icon: Award,
                    accent: '#C4622D',
                  },
                  {
                    key: 'FITNESS_COACH',
                    label: 'Fitness Coach',
                    sub: 'Exercise Physiologist',
                    icon: ShieldCheck,
                    accent: '#0284C7',
                  },
                ].map((item) => {
                  const Icon = item.icon
                  const active = role === item.key
                  return (
                    <button
                      key={item.key}
                      type="button"
                      onClick={() => handleRoleChange(item.key as ProviderRole)}
                      className={`flex flex-col items-start rounded-2xl border p-4 text-left transition-all ${
                        active
                          ? 'border-[#0D9488] bg-[#0D9488]/5 shadow-sm ring-2 ring-[#0D9488]/30'
                          : 'border-[#E8DED4] bg-[#FAF8F5] hover:border-slate-300'
                      }`}
                    >
                      <div
                        className="rounded-xl p-2"
                        style={{
                          backgroundColor: active ? '#0D9488' : '#E2E8F0',
                          color: active ? '#FFFFFF' : '#475569',
                        }}
                      >
                        <Icon className="h-4 w-4" />
                      </div>
                      <p className="mt-3 text-sm font-black text-[#1A1F36]">{item.label}</p>
                      <p className="text-[11px] font-semibold text-slate-500">{item.sub}</p>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Step 2: Study Experience & Degrees (User Request Highlight) */}
            <div className="rounded-3xl border border-[#0D9488]/40 bg-white p-6 shadow-sm ring-1 ring-[#0D9488]/10">
              <div className="flex items-center justify-between">
                <p className="text-xs font-black uppercase tracking-[0.16em] text-[#0D9488]">
                  Step 2 • Study Experience & Credentials
                </p>
                <span className="inline-flex items-center gap-1 rounded-full bg-teal-50 px-2.5 py-0.5 text-[11px] font-black text-[#0D9488]">
                  <BookOpen className="h-3 w-3" /> Admin Configured
                </span>
              </div>
              <h2 className="mt-1 text-lg font-black text-[#1A1F36]">
                Academic Qualifications & Registration
              </h2>
              <p className="text-xs font-semibold text-slate-500">
                These qualifications will appear on generated clinical plans, prescriptions, and provider profiles.
              </p>

              <div className="mt-5 grid gap-4 md:grid-cols-2">
                <div className="md:col-span-2">
                  <label className="block text-xs font-black uppercase tracking-wider text-slate-600">
                    Degrees & Study Qualification *
                  </label>
                  <input
                    type="text"
                    required
                    value={qualification}
                    onChange={(e) => setQualification(e.target.value)}
                    placeholder={
                      role === 'DIETITIAN'
                        ? 'e.g. M.Sc. Clinical Nutrition & Dietetics, RD'
                        : 'e.g. MBBS, MD (General Medicine), DNB Endocrinology'
                    }
                    className="mt-1.5 w-full rounded-xl border border-[#E8DED4] bg-[#FAF8F5] px-4 py-2.5 text-sm font-bold text-slate-800 outline-none focus:border-[#0D9488] focus:bg-white"
                  />
                  <p className="mt-1 text-[11px] text-slate-400">
                    Highest degree and clinical qualifications (e.g. M.Sc, B.Sc, RD, MBBS, MD).
                  </p>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-xs font-black uppercase tracking-wider text-slate-600">
                    Study Institution / University / Medical College *
                  </label>
                  <input
                    type="text"
                    required
                    value={institution}
                    onChange={(e) => setInstitution(e.target.value)}
                    placeholder={
                      role === 'DIETITIAN'
                        ? 'e.g. National Institute of Nutrition (NIN) / SNDT University'
                        : 'e.g. All India Institute of Medical Sciences (AIIMS New Delhi)'
                    }
                    className="mt-1.5 w-full rounded-xl border border-[#E8DED4] bg-[#FAF8F5] px-4 py-2.5 text-sm font-bold text-slate-800 outline-none focus:border-[#0D9488] focus:bg-white"
                  />
                  <p className="mt-1 text-[11px] text-slate-400">
                    College or accredited university where studies were completed.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-black uppercase tracking-wider text-slate-600">
                    Years of Clinical Experience *
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="60"
                    required
                    value={yearsExperience}
                    onChange={(e) => setYearsExperience(e.target.value)}
                    className="mt-1.5 w-full rounded-xl border border-[#E8DED4] bg-[#FAF8F5] px-4 py-2.5 text-sm font-bold text-slate-800 outline-none focus:border-[#0D9488] focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-black uppercase tracking-wider text-slate-600">
                    Clinical Registration / License Number *
                  </label>
                  <input
                    type="text"
                    required
                    value={registrationNumber}
                    onChange={(e) => setRegistrationNumber(e.target.value)}
                    placeholder={role === 'DIETITIAN' ? 'e.g. IDA-RD-2021-8842' : 'e.g. MCI-2018-49281'}
                    className="mt-1.5 w-full rounded-xl border border-[#E8DED4] bg-[#FAF8F5] px-4 py-2.5 text-sm font-bold text-slate-800 outline-none focus:border-[#0D9488] focus:bg-white"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-xs font-black uppercase tracking-wider text-slate-600">
                    Registering Council / Accreditation Body
                  </label>
                  <input
                    type="text"
                    value={registrationCouncil}
                    onChange={(e) => setRegistrationCouncil(e.target.value)}
                    placeholder={
                      role === 'DIETITIAN'
                        ? 'Indian Dietetic Association (IDA)'
                        : 'National Medical Commission (NMC)'
                    }
                    className="mt-1.5 w-full rounded-xl border border-[#E8DED4] bg-[#FAF8F5] px-4 py-2.5 text-sm font-bold text-slate-800 outline-none focus:border-[#0D9488] focus:bg-white"
                  />
                </div>
              </div>
            </div>

            {/* Step 3: Provider Identity & Contact */}
            <div className="rounded-3xl border border-[#E8DED4] bg-white p-6 shadow-sm">
              <p className="text-xs font-black uppercase tracking-[0.16em] text-[#C4622D]">
                Step 3 • Personal & Contact Information
              </p>
              <h2 className="mt-1 text-lg font-black text-[#1A1F36]">Provider Profile & Email</h2>

              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <div>
                  <label className="block text-xs font-black uppercase tracking-wider text-slate-600">
                    Full Legal Name (with prefix) *
                  </label>
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder={role === 'DIETITIAN' ? 'Dt. Priya Sharma' : 'Dr. Arvind Mehra'}
                    className="mt-1.5 w-full rounded-xl border border-[#E8DED4] bg-[#FAF8F5] px-4 py-2.5 text-sm font-bold text-slate-800 outline-none focus:border-[#0D9488] focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-black uppercase tracking-wider text-slate-600">
                    Official Email (Receives Activation Invite) *
                  </label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="dietitian@8liv.com"
                    className="mt-1.5 w-full rounded-xl border border-[#E8DED4] bg-[#FAF8F5] px-4 py-2.5 text-sm font-bold text-slate-800 outline-none focus:border-[#0D9488] focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-black uppercase tracking-wider text-slate-600">
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    placeholder="+91 9876543210"
                    className="mt-1.5 w-full rounded-xl border border-[#E8DED4] bg-[#FAF8F5] px-4 py-2.5 text-sm font-bold text-slate-800 outline-none focus:border-[#0D9488] focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-black uppercase tracking-wider text-slate-600">
                    Joining Date
                  </label>
                  <input
                    type="date"
                    value={joiningDate}
                    onChange={(e) => setJoiningDate(e.target.value)}
                    className="mt-1.5 w-full rounded-xl border border-[#E8DED4] bg-[#FAF8F5] px-4 py-2.5 text-sm font-bold text-slate-800 outline-none focus:border-[#0D9488] focus:bg-white"
                  />
                </div>
              </div>
            </div>

            {/* Step 4: Specialization & Consultation Settings */}
            <div className="rounded-3xl border border-[#E8DED4] bg-white p-6 shadow-sm">
              <p className="text-xs font-black uppercase tracking-[0.16em] text-[#C4622D]">
                Step 4 • Clinical Practice & Consultations
              </p>
              <h2 className="mt-1 text-lg font-black text-[#1A1F36]">Specialization & Compensation</h2>

              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <div>
                  <label className="block text-xs font-black uppercase tracking-wider text-slate-600">
                    Clinical Specialization / Focus Area *
                  </label>
                  <input
                    type="text"
                    required
                    value={specialization}
                    onChange={(e) => setSpecialization(e.target.value)}
                    placeholder="e.g. Clinical Nutrition, Diabetology, Renal Dietetics"
                    className="mt-1.5 w-full rounded-xl border border-[#E8DED4] bg-[#FAF8F5] px-4 py-2.5 text-sm font-bold text-slate-800 outline-none focus:border-[#0D9488] focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-black uppercase tracking-wider text-slate-600">
                    Consultation Languages
                  </label>
                  <input
                    type="text"
                    value={consultationLanguages}
                    onChange={(e) => setConsultationLanguages(e.target.value)}
                    placeholder="English, Hindi, Tamil"
                    className="mt-1.5 w-full rounded-xl border border-[#E8DED4] bg-[#FAF8F5] px-4 py-2.5 text-sm font-bold text-slate-800 outline-none focus:border-[#0D9488] focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-black uppercase tracking-wider text-slate-600">
                    Consultation Fee / Payout Amount (₹)
                  </label>
                  <div className="relative mt-1.5">
                    <span className="absolute left-3 top-2.5 text-sm font-bold text-slate-400">₹</span>
                    <input
                      type="number"
                      min="0"
                      step="50"
                      value={payoutAmount}
                      onChange={(e) => setPayoutAmount(e.target.value)}
                      className="w-full rounded-xl border border-[#E8DED4] bg-[#FAF8F5] py-2.5 pl-8 pr-4 text-sm font-bold text-slate-800 outline-none focus:border-[#0D9488] focus:bg-white"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-black uppercase tracking-wider text-slate-600">
                    Consultation Format
                  </label>
                  <select
                    value={consultationType}
                    onChange={(e) => setConsultationType(e.target.value)}
                    className="mt-1.5 w-full rounded-xl border border-[#E8DED4] bg-[#FAF8F5] px-4 py-2.5 text-sm font-bold text-slate-800 outline-none focus:border-[#0D9488] focus:bg-white"
                  >
                    <option value="Video Consultation">Video Consultation & Clinical Plan</option>
                    <option value="In-Person & Video">Hybrid (In-Person & Video)</option>
                    <option value="Digital Diet Prescription">Digital Diet Prescription Only</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-black uppercase tracking-wider text-slate-600">
                    Internal Staff Code / Reference ID
                  </label>
                  <input
                    type="text"
                    value={internalReference}
                    onChange={(e) => setInternalReference(e.target.value)}
                    placeholder="e.g. 8LIV-DT-042"
                    className="mt-1.5 w-full rounded-xl border border-[#E8DED4] bg-[#FAF8F5] px-4 py-2.5 text-sm font-bold text-slate-800 outline-none focus:border-[#0D9488] focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-black uppercase tracking-wider text-slate-600">
                    Internal Administrative Notes
                  </label>
                  <input
                    type="text"
                    value={internalNotes}
                    onChange={(e) => setInternalNotes(e.target.value)}
                    placeholder="Admin notes on credentials verification"
                    className="mt-1.5 w-full rounded-xl border border-[#E8DED4] bg-[#FAF8F5] px-4 py-2.5 text-sm font-bold text-slate-800 outline-none focus:border-[#0D9488] focus:bg-white"
                  />
                </div>
              </div>
            </div>

            {/* Submission CTA */}
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
              <Link
                href="/admin/providers"
                className="rounded-xl border border-slate-300 bg-white px-6 py-3 text-center text-sm font-bold text-slate-700 transition-colors hover:bg-slate-50"
              >
                Cancel
              </Link>
              <button
                type="submit"
                disabled={saving}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#0D9488] px-8 py-3.5 text-sm font-black text-white shadow-md transition-all hover:bg-[#0b7a70] disabled:opacity-50"
              >
                <ShieldCheck className="h-4 w-4" />
                {saving ? 'Verifying & Sending Invitation...' : 'Save Study Credentials & Send Invitation'}
              </button>
            </div>
          </form>

          {/* Right Sidebar: Live Clinical Badge & Preview (4 cols) */}
          <div className="space-y-6 lg:col-span-4">
            <div className="sticky top-6 space-y-4">
              {/* Badge Preview */}
              <div className="rounded-3xl border border-[#E8DED4] bg-white p-6 shadow-sm">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-black uppercase tracking-wider text-[#C4622D]">
                    Live Clinical Card Preview
                  </span>
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-black text-emerald-700">
                    <CheckCircle2 className="h-3 w-3" /> Verified
                  </span>
                </div>

                <div className="mt-4 rounded-2xl border border-slate-100 bg-gradient-to-br from-[#FAF8F5] to-white p-5">
                  <div className="flex items-start gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#0D9488] text-white font-black text-lg shadow-sm">
                      {fullName ? fullName.replace(/^(Dr\.|Dt\.)\s*/, '').charAt(0) : 'P'}
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="truncate text-base font-black text-[#1A1F36]">
                        {fullName || (role === 'DIETITIAN' ? 'Dt. Provider Name' : 'Dr. Provider Name')}
                      </h3>
                      <p className="text-xs font-bold text-[#0D9488]">
                        {role === 'DIETITIAN' ? 'Clinical Dietitian' : role.replace('_', ' ')}
                      </p>
                      <p className="text-[11px] text-slate-500 font-semibold">{specialization}</p>
                    </div>
                  </div>

                  <div className="mt-4 space-y-2 border-t border-slate-200/60 pt-3 text-xs">
                    <div className="flex items-start gap-2 text-slate-700">
                      <GraduationCap className="h-4 w-4 shrink-0 text-[#0D9488] mt-0.5" />
                      <span className="font-bold">{qualification || 'Degrees / Study'}</span>
                    </div>

                    <div className="flex items-start gap-2 text-slate-600">
                      <Building2 className="h-4 w-4 shrink-0 text-slate-400 mt-0.5" />
                      <span className="text-[11px] font-medium leading-tight">
                        {institution || 'Study Institution / University'}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 text-slate-600">
                      <Award className="h-4 w-4 shrink-0 text-slate-400" />
                      <span className="text-[11px] font-mono font-bold text-slate-800">
                        {registrationNumber || 'Registration Pending'}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 text-slate-600">
                      <Calendar className="h-4 w-4 shrink-0 text-slate-400" />
                      <span className="text-[11px] font-semibold">
                        {yearsExperience} Years Clinical Experience
                      </span>
                    </div>

                    <div className="flex items-center gap-2 text-slate-600">
                      <Languages className="h-4 w-4 shrink-0 text-slate-400" />
                      <span className="text-[11px] font-semibold">{consultationLanguages}</span>
                    </div>
                  </div>

                  <div className="mt-4 flex items-center justify-between rounded-xl bg-slate-50 p-2.5 text-xs font-bold">
                    <span className="text-slate-500">Consultation Fee</span>
                    <span className="font-black text-[#1A1F36]">₹{payoutAmount || 0} / session</span>
                  </div>
                </div>

                <div className="mt-4 rounded-xl bg-blue-50/70 p-3 text-xs text-blue-900 flex items-start gap-2">
                  <Info className="h-4 w-4 shrink-0 text-blue-600 mt-0.5" />
                  <p className="leading-relaxed text-[11px]">
                    <strong>Immediate Dashboard Access:</strong> By entering study experience and license details upfront, the provider will skip self-onboarding review and directly access the clinical dietitian / doctor portal upon setting their password.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}
