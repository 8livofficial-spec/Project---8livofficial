'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import {
  GraduationCap,
  Stethoscope,
  Award,
  ShieldCheck,
  Search,
  UserPlus,
  RefreshCw,
  Mail,
  Phone,
  ArrowLeft,
  Calendar,
  DollarSign,
  CheckCircle2,
  Clock,
} from 'lucide-react'
import { authedFetch } from '@/lib/apiClient'

interface ProviderItem {
  provider_id: string
  full_name: string
  email: string
  phone_number?: string
  role: string
  qualification?: string
  specialization?: string
  years_experience?: number
  registration_number?: string
  status?: string
  payout_amount?: number
  consultation_type?: string
  created_at?: string
}

export default function AdminProvidersPage() {
  const [providers, setProviders] = useState<ProviderItem[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState('all')
  const [error, setError] = useState('')

  async function loadProviders() {
    setLoading(true)
    setError('')
    try {
      const query = search ? `?search=${encodeURIComponent(search)}` : ''
      const res = await authedFetch(`/api/admin/providers${query}`)
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to fetch providers.')
      setProviders(data.providers || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch providers.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadProviders()
  }, [])

  const filtered = providers.filter((p) => {
    const roleMatch =
      roleFilter === 'all' ||
      p.role?.toLowerCase() === roleFilter.toLowerCase()
    return roleMatch
  })

  const countDietitians = providers.filter(
    (p) => p.role?.toLowerCase() === 'dietitian'
  ).length
  const countDoctors = providers.filter(
    (p) => p.role?.toLowerCase() === 'doctor'
  ).length

  return (
    <main className="min-h-screen bg-[#FAF8F5] px-4 py-8 text-[#1A1F36]">
      <section className="mx-auto max-w-7xl space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <Link
              href="/admin"
              className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-[#C4622D] hover:underline"
            >
              <ArrowLeft className="h-3.5 w-3.5" /> Back to Main Admin
            </Link>
            <h1 className="mt-1 text-3xl font-black tracking-tight text-[#1A1F36]">
              Clinical Providers Directory
            </h1>
            <p className="text-xs font-semibold text-slate-500">
              Manage pre-verified dietitians, doctors, and clinical specialists.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => loadProviders()}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs font-bold text-slate-700 shadow-sm hover:bg-slate-50"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} /> Refresh
            </button>
            <Link
              href="/admin/providers/new"
              className="inline-flex items-center gap-2 rounded-xl bg-[#0D9488] px-5 py-2.5 text-xs font-black text-white shadow-md transition-all hover:bg-[#0b7a70]"
            >
              <UserPlus className="h-4 w-4" />
              Set Up & Invite Provider
            </Link>
          </div>
        </div>

        {/* Metric Cards */}
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <div className="rounded-2xl border border-[#E8DED4] bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-[11px] font-black uppercase tracking-wider">Total Clinicians</span>
              <ShieldCheck className="h-4 w-4 text-[#0D9488]" />
            </div>
            <p className="mt-2 text-2xl font-black text-[#1A1F36]">{providers.length}</p>
            <p className="mt-0.5 text-[11px] font-semibold text-slate-500">Registered staff & partners</p>
          </div>

          <div className="rounded-2xl border border-[#0D9488]/30 bg-teal-50/40 p-5 shadow-sm">
            <div className="flex items-center justify-between text-[#0D9488]">
              <span className="text-[11px] font-black uppercase tracking-wider">Dietitians</span>
              <GraduationCap className="h-4 w-4" />
            </div>
            <p className="mt-2 text-2xl font-black text-[#0D9488]">{countDietitians}</p>
            <p className="mt-0.5 text-[11px] font-semibold text-slate-600">Clinical nutrition experts</p>
          </div>

          <div className="rounded-2xl border border-indigo-200 bg-indigo-50/40 p-5 shadow-sm">
            <div className="flex items-center justify-between text-indigo-600">
              <span className="text-[11px] font-black uppercase tracking-wider">Doctors</span>
              <Stethoscope className="h-4 w-4" />
            </div>
            <p className="mt-2 text-2xl font-black text-indigo-900">{countDoctors}</p>
            <p className="mt-0.5 text-[11px] font-semibold text-slate-600">Physicians & specialists</p>
          </div>

          <div className="rounded-2xl border border-[#E8DED4] bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-[11px] font-black uppercase tracking-wider">Active Verified</span>
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            </div>
            <p className="mt-2 text-2xl font-black text-emerald-700">
              {providers.filter((p) => p.status === 'active' || !p.status).length}
            </p>
            <p className="mt-0.5 text-[11px] font-semibold text-slate-500">Ready for patient bookings</p>
          </div>
        </div>

        {/* Filter Bar */}
        <div className="flex flex-col gap-3 rounded-2xl border border-[#E8DED4] bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-2">
            {[
              { key: 'all', label: 'All Disciplines' },
              { key: 'dietitian', label: 'Dietitians' },
              { key: 'doctor', label: 'Doctors' },
              { key: 'nutritionist', label: 'Nutritionists' },
              { key: 'fitness_coach', label: 'Fitness Coaches' },
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => setRoleFilter(tab.key)}
                className={`rounded-xl px-3.5 py-1.5 text-xs font-black transition-all ${
                  roleFilter === tab.key
                    ? 'bg-[#1A1F36] text-white'
                    : 'bg-[#FAF8F5] text-slate-600 hover:bg-slate-200'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search by name, email, reg #..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && loadProviders()}
              className="w-full rounded-xl border border-slate-200 bg-[#FAF8F5] py-2 pl-9 pr-4 text-xs font-bold text-slate-700 outline-none focus:border-[#0D9488] focus:bg-white sm:w-64"
            />
          </div>
        </div>

        {/* Providers Table / Cards */}
        {error && (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-xs font-bold text-rose-800">
            {error}
          </div>
        )}

        {loading ? (
          <div className="flex flex-col items-center justify-center rounded-3xl border border-[#E8DED4] bg-white p-16">
            <div className="h-10 w-10 animate-spin rounded-full border-4 border-[#0D9488] border-t-transparent mb-3" />
            <p className="text-xs font-bold text-slate-500">Loading clinical providers...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-3xl border border-[#E8DED4] bg-white p-16 text-center">
            <GraduationCap className="h-12 w-12 text-slate-300 mb-3" />
            <h3 className="text-lg font-black text-[#1A1F36]">No Clinicians Found</h3>
            <p className="mt-1 text-xs font-semibold text-slate-500 max-w-sm">
              No clinical providers matched your search or filter. Set up study experience and credentials to invite a new dietitian or doctor.
            </p>
            <Link
              href="/admin/providers/new"
              className="mt-5 inline-flex items-center gap-2 rounded-xl bg-[#0D9488] px-5 py-2.5 text-xs font-black text-white shadow-sm hover:bg-[#0b7a70]"
            >
              <UserPlus className="h-4 w-4" />
              Set Up & Invite Provider Now
            </Link>
          </div>
        ) : (
          <div className="overflow-hidden rounded-3xl border border-[#E8DED4] bg-white shadow-sm">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-100 bg-[#FAF8F5] font-black uppercase tracking-wider text-slate-400">
                <tr>
                  <th className="px-6 py-4">Clinician</th>
                  <th className="px-6 py-4">Role & Discipline</th>
                  <th className="px-6 py-4">Study Qualification & Reg</th>
                  <th className="px-6 py-4">Specialization</th>
                  <th className="px-6 py-4">Experience & Fee</th>
                  <th className="px-6 py-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((item) => {
                  const isDietitian = item.role?.toLowerCase() === 'dietitian'
                  const isDoctor = item.role?.toLowerCase() === 'doctor'

                  return (
                    <tr key={item.provider_id || item.email} className="hover:bg-slate-50/60 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div
                            className={`flex h-10 w-10 items-center justify-center rounded-xl font-black text-sm text-white shadow-xs ${
                              isDietitian
                                ? 'bg-[#0D9488]'
                                : isDoctor
                                ? 'bg-[#4F46E5]'
                                : 'bg-slate-700'
                            }`}
                          >
                            {item.full_name?.charAt(0) || 'P'}
                          </div>
                          <div>
                            <p className="font-black text-[#1A1F36]">{item.full_name || 'Provider'}</p>
                            <p className="text-[11px] text-slate-400 font-medium">{item.email}</p>
                            {item.phone_number && (
                              <p className="text-[10px] text-slate-400">{item.phone_number}</p>
                            )}
                          </div>
                        </div>
                      </td>

                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-black uppercase ${
                            isDietitian
                              ? 'bg-teal-50 text-[#0D9488] border border-teal-200'
                              : isDoctor
                              ? 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                              : 'bg-slate-100 text-slate-700'
                          }`}
                        >
                          {isDietitian && <GraduationCap className="h-3 w-3" />}
                          {isDoctor && <Stethoscope className="h-3 w-3" />}
                          {item.role?.replace('_', ' ')}
                        </span>
                      </td>

                      <td className="px-6 py-4">
                        <p className="font-bold text-slate-800">
                          {item.qualification || (isDietitian ? 'M.Sc. Clinical Nutrition' : 'MBBS')}
                        </p>
                        {item.registration_number ? (
                          <p className="text-[11px] font-mono font-semibold text-slate-500">
                            Reg: {item.registration_number}
                          </p>
                        ) : (
                          <p className="text-[10px] text-slate-400">Reg: Pending</p>
                        )}
                      </td>

                      <td className="px-6 py-4">
                        <p className="font-semibold text-slate-700">
                          {item.specialization || (isDietitian ? 'Clinical Nutrition' : 'General Medicine')}
                        </p>
                        <p className="text-[11px] text-slate-400">
                          {item.consultation_type || 'Video Consultation'}
                        </p>
                      </td>

                      <td className="px-6 py-4">
                        <p className="font-bold text-slate-800">
                          {item.years_experience ? `${item.years_experience} yrs exp` : '3+ yrs exp'}
                        </p>
                        <p className="text-[11px] font-black text-[#0D9488]">
                          ₹{item.payout_amount || (isDoctor ? 300 : 250)} / session
                        </p>
                      </td>

                      <td className="px-6 py-4">
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-black text-emerald-700 border border-emerald-200">
                          <CheckCircle2 className="h-3 w-3" />
                          Pre-Verified
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  )
}
