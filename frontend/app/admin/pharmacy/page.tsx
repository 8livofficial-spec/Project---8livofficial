'use client'

import { useEffect, useState, useMemo } from 'react'
import Link from 'next/link'
import {
  Building2,
  Mail,
  Phone,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  Clock,
  Plus,
  RefreshCw,
  AlertTriangle,
  ArrowRight,
  Search,
  Filter,
  FileCheck,
  ExternalLink,
  Ban,
  PlayCircle,
  Eye,
  Send,
  AlertCircle,
  ChevronRight,
  ShieldAlert,
  Package,
  ArrowLeft,
} from 'lucide-react'
import { authedFetch } from '@/lib/apiClient'

type FilterStatus = 'ALL' | 'INVITED' | 'UNDER_REVIEW' | 'VERIFIED' | 'ACTIVE' | 'SUSPENDED' | 'REJECTED'

export default function AdminPartnerPharmaciesPage() {
  const [pharmacies, setPharmacies] = useState<any[]>([])
  const [invitations, setInvitations] = useState<any[]>([])
  const [stats, setStats] = useState({
    totalPartners: 0,
    pendingInvitations: 0,
    underReview: 0,
    verified: 0,
    active: 0,
    suspended: 0,
    rejected: 0,
  })
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<FilterStatus>('ALL')

  // Modals state
  const [showInviteModal, setShowInviteModal] = useState(false)
  const [inviteName, setInviteName] = useState('')
  const [inviteEmail, setInviteEmail] = useState('')
  const [invitePhone, setInvitePhone] = useState('')
  const [inviteLoading, setInviteLoading] = useState(false)

  // Review Modal state
  const [reviewingPharmacy, setReviewingPharmacy] = useState<any | null>(null)
  const [rejectReason, setRejectReason] = useState('')
  const [showRejectInput, setShowRejectInput] = useState(false)

  // Suspend Modal state
  const [suspendingPharmacy, setSuspendingPharmacy] = useState<any | null>(null)
  const [suspendReason, setSuspendReason] = useState('')

  const [actionLoading, setActionLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const loadData = async () => {
    setLoading(true)
    setError('')
    try {
      const [pRes, iRes] = await Promise.all([
        authedFetch('/api/admin/pharmacy'),
        authedFetch('/api/admin/pharmacy/invite'),
      ])

      const pData = await pRes.json()
      const iData = await iRes.json()

      if (pRes.ok) {
        setPharmacies(pData.pharmacies || [])
        if (pData.stats) {
          setStats(pData.stats)
        }
      }
      if (iRes.ok) {
        setInvitations(iData.invitations || [])
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load pharmacy data.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  // Send new invitation
  const handleSendInvite = async (e: React.FormEvent) => {
    e.preventDefault()
    setInviteLoading(true)
    setError('')
    setSuccess('')
    try {
      const res = await authedFetch('/api/admin/pharmacy/invite', {
        method: 'POST',
        body: JSON.stringify({
          pharmacy_name: inviteName,
          email: inviteEmail,
          phone: invitePhone || null,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to send invitation.')
      setSuccess(`Invitation Sent! The pharmacy invitation has been sent successfully to ${inviteEmail}. Expires in 48 hours.`)
      setShowInviteModal(false)
      setInviteName('')
      setInviteEmail('')
      setInvitePhone('')
      await loadData()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setInviteLoading(false)
    }
  }

  // Resend invitation
  const handleResend = async (id: string) => {
    setActionLoading(true)
    setError('')
    setSuccess('')
    try {
      const res = await authedFetch(`/api/admin/pharmacy/invitations/${id}/resend`, { method: 'POST' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to resend.')
      setSuccess('Invitation resent successfully. A fresh 48-hour access token was emailed, and previous links are invalidated.')
      await loadData()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setActionLoading(false)
    }
  }

  // Cancel invitation
  const handleCancelInvite = async (id: string) => {
    if (!confirm('Are you sure you want to cancel this pending invitation?')) return
    setActionLoading(true)
    setError('')
    setSuccess('')
    try {
      const res = await authedFetch(`/api/admin/pharmacy/invite/${id}`, { method: 'DELETE' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to cancel invitation.')
      setSuccess('Invitation cancelled.')
      await loadData()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setActionLoading(false)
    }
  }

  // Status mutation handler
  const handleStatusUpdate = async (pharmacyId: string, updates: any) => {
    setActionLoading(true)
    setError('')
    setSuccess('')
    try {
      const res = await authedFetch(`/api/admin/pharmacy/${pharmacyId}`, {
        method: 'PATCH',
        body: JSON.stringify(updates),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to update pharmacy status.')
      
      let msg = 'Pharmacy updated successfully.'
      if (updates.verification_status === 'VERIFIED') msg = 'Pharmacy credentials verified successfully.'
      else if (updates.verification_status === 'REJECTED') msg = 'Pharmacy credentials rejected.'
      else if (updates.status === 'ACTIVE') msg = 'Pharmacy activated! It can now fulfill assigned orders.'
      else if (updates.status === 'SUSPENDED') msg = 'Pharmacy suspended from fulfillment operations.'

      setSuccess(msg)
      setReviewingPharmacy(null)
      setSuspendingPharmacy(null)
      setRejectReason('')
      setShowRejectInput(false)
      setSuspendReason('')
      await loadData()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setActionLoading(false)
    }
  }

  // Filtered pharmacies list
  const filteredPharmacies = useMemo(() => {
    return pharmacies.filter((p) => {
      // Status filter
      if (filter === 'UNDER_REVIEW' && p.verification_status !== 'UNDER_REVIEW') return false
      if (filter === 'VERIFIED' && p.verification_status !== 'VERIFIED') return false
      if (filter === 'REJECTED' && p.verification_status !== 'REJECTED') return false
      if (filter === 'ACTIVE' && p.status !== 'ACTIVE') return false
      if (filter === 'SUSPENDED' && p.status !== 'SUSPENDED') return false

      // Search query
      if (search.trim()) {
        const query = search.toLowerCase()
        const matchName = (p.name || '').toLowerCase().includes(query)
        const matchLegal = (p.legal_entity_name || '').toLowerCase().includes(query)
        const matchEmail = (p.email || '').toLowerCase().includes(query)
        const matchPhone = (p.phone || '').toLowerCase().includes(query)
        const matchLicense = (p.drug_license_number || '').toLowerCase().includes(query)
        if (!matchName && !matchLegal && !matchEmail && !matchPhone && !matchLicense) return false
      }

      return true
    })
  }, [pharmacies, filter, search])

  return (
    <main className="min-h-screen bg-[#F5F0EB] p-4 sm:p-6 lg:p-8 text-[#1A1F36]">
      <div className="mx-auto max-w-7xl space-y-6">
        
        {/* Navigation Breadcrumb & Back Button */}
        <div className="flex flex-col gap-3 border-b border-[#1A1F36]/10 pb-4">
          <div className="flex items-center justify-between">
            <Link
              href="/admin"
              className="inline-flex items-center gap-2 rounded-xl border border-[#1A1F36]/15 bg-white px-3.5 py-2 text-xs font-black text-[#1A1F36] hover:bg-[#FAF7F5] shadow-sm transition-all group"
            >
              <ArrowLeft className="h-4 w-4 text-[#8896A4] group-hover:text-[#1A1F36] group-hover:-translate-x-0.5 transition-transform" />
              <span>Back to Admin Dashboard</span>
            </Link>

            <div className="flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-[#8896A4]">
              <Link href="/admin" className="hover:text-[#1A1F36] transition-colors">
                Admin Portal
              </Link>
              <ChevronRight className="h-3 w-3" />
              <span className="text-[#C4622D]">Partner Pharmacies</span>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pt-1">
            <div>
              <h1 className="text-2xl sm:text-3xl font-black text-[#1A1F36]">Partner Pharmacies</h1>
              <p className="mt-1 text-xs sm:text-sm font-semibold text-[#8896A4]">
                Control partner onboarding, regulatory verification, portal activation, and fulfillment assignment eligibility.
              </p>
            </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={loadData}
              disabled={loading}
              className="inline-flex items-center gap-2 rounded-xl border border-[#1A1F36]/15 bg-white px-3.5 py-2.5 text-xs font-black text-[#1A1F36] hover:bg-[#FAF7F5] disabled:opacity-50 shadow-sm"
              title="Refresh Data"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>
            <Link
              href="/admin/pharmacy-orders"
              className="inline-flex items-center gap-2 rounded-xl border border-[#1A1F36]/15 bg-white px-4 py-2.5 text-xs font-black text-[#1A1F36] hover:bg-[#FAF7F5] shadow-sm"
            >
              <Package className="h-4 w-4 text-[#C4622D]" />
              <span>Fulfillment Orders</span>
            </Link>
            <button
              onClick={() => setShowInviteModal(true)}
              className="inline-flex items-center gap-2 rounded-xl bg-[#1A1F36] px-4 py-2.5 text-xs font-black text-white hover:bg-[#2A314E] shadow-sm transition-all"
            >
              <Plus className="h-4 w-4" />
              <span>+ Invite Pharmacy</span>
            </button>
          </div>
        </div>
      </div>

        {/* Global Notifications */}
        {error && (
          <div className="flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-xs font-bold text-red-800 shadow-sm">
            <AlertCircle className="h-5 w-5 flex-shrink-0 text-red-600" />
            <span>{error}</span>
          </div>
        )}
        {success && (
          <div className="flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-xs font-bold text-emerald-800 shadow-sm">
            <CheckCircle2 className="h-5 w-5 flex-shrink-0 text-emerald-600" />
            <span>{success}</span>
          </div>
        )}

        {/* Executive Summary Cards */}
        <section className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
          <div className="rounded-2xl bg-white p-4 sm:p-5 shadow-sm border border-[#1A1F36]/5">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase tracking-wider text-[#8896A4]">Total Partners</span>
              <Building2 className="h-4 w-4 text-[#1A1F36]" />
            </div>
            <p className="mt-2 text-2xl font-black text-[#1A1F36]">{stats.totalPartners}</p>
            <p className="mt-0.5 text-[10px] font-semibold text-[#8896A4]">Registered in tenant</p>
          </div>

          <div className="rounded-2xl bg-white p-4 sm:p-5 shadow-sm border border-[#1A1F36]/5">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase tracking-wider text-[#C4622D]">Invitations</span>
              <Send className="h-4 w-4 text-[#C4622D]" />
            </div>
            <p className="mt-2 text-2xl font-black text-[#C4622D]">{stats.pendingInvitations}</p>
            <p className="mt-0.5 text-[10px] font-semibold text-[#8896A4]">Active 48h invites</p>
          </div>

          <div className="rounded-2xl bg-white p-4 sm:p-5 shadow-sm border border-[#1A1F36]/5">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase tracking-wider text-amber-600">Under Review</span>
              <Clock className="h-4 w-4 text-amber-600" />
            </div>
            <p className="mt-2 text-2xl font-black text-amber-600">{stats.underReview}</p>
            <p className="mt-0.5 text-[10px] font-semibold text-[#8896A4]">Pending verification</p>
          </div>

          <div className="rounded-2xl bg-white p-4 sm:p-5 shadow-sm border border-[#1A1F36]/5">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase tracking-wider text-indigo-600">Verified</span>
              <ShieldCheck className="h-4 w-4 text-indigo-600" />
            </div>
            <p className="mt-2 text-2xl font-black text-indigo-600">{stats.verified}</p>
            <p className="mt-0.5 text-[10px] font-semibold text-[#8896A4]">Credentials approved</p>
          </div>

          <div className="rounded-2xl bg-white p-4 sm:p-5 shadow-sm border border-[#1A1F36]/5">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase tracking-wider text-emerald-600">Active</span>
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            </div>
            <p className="mt-2 text-2xl font-black text-emerald-600">{stats.active}</p>
            <p className="mt-0.5 text-[10px] font-semibold text-[#8896A4]">Live for fulfillment</p>
          </div>

          <div className="rounded-2xl bg-white p-4 sm:p-5 shadow-sm border border-[#1A1F36]/5">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase tracking-wider text-red-600">Suspended</span>
              <Ban className="h-4 w-4 text-red-600" />
            </div>
            <p className="mt-2 text-2xl font-black text-red-600">{stats.suspended}</p>
            <p className="mt-0.5 text-[10px] font-semibold text-[#8896A4]">Fulfillment paused</p>
          </div>
        </section>

        {/* Filter & Search Bar */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 rounded-2xl bg-white p-4 shadow-sm border border-[#1A1F36]/5">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#8896A4]" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by pharmacy name, license number, email, or phone..."
              className="w-full rounded-xl border border-[#1A1F36]/10 py-2.5 pl-10 pr-4 text-xs font-semibold outline-none focus:border-[#1A1F36] transition-colors"
            />
          </div>

          <div className="flex flex-wrap items-center gap-1.5 overflow-x-auto">
            {(
              [
                { key: 'ALL', label: `All (${pharmacies.length})` },
                { key: 'UNDER_REVIEW', label: `Under Review (${stats.underReview})` },
                { key: 'VERIFIED', label: `Verified (${stats.verified})` },
                { key: 'ACTIVE', label: `Active (${stats.active})` },
                { key: 'SUSPENDED', label: `Suspended (${stats.suspended})` },
              ] as { key: FilterStatus; label: string }[]
            ).map((tab) => (
              <button
                key={tab.key}
                onClick={() => setFilter(tab.key)}
                className={`rounded-xl px-3 py-2 text-[11px] font-black transition-all ${
                  filter === tab.key
                    ? 'bg-[#1A1F36] text-white shadow-sm'
                    : 'bg-[#FAF7F5] text-[#40516A] hover:bg-[#F5F0EB]'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Partner Pharmacies List */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-black text-[#1A1F36] flex items-center gap-2">
              <span>Partner Pharmacies</span>
              <span className="rounded-full bg-[#1A1F36]/10 px-2 py-0.5 text-xs text-[#1A1F36]">
                {filteredPharmacies.length}
              </span>
            </h2>
          </div>

          {loading ? (
            <div className="rounded-2xl bg-white p-12 text-center shadow-sm border border-[#1A1F36]/5">
              <RefreshCw className="mx-auto h-8 w-8 animate-spin text-[#C4622D]" />
              <p className="mt-3 text-xs font-bold text-[#8896A4]">Loading registered pharmacy partners...</p>
            </div>
          ) : filteredPharmacies.length === 0 ? (
            <div className="rounded-2xl bg-white p-12 text-center shadow-sm border border-[#1A1F36]/5">
              <Building2 className="mx-auto h-12 w-12 text-[#8896A4]/40" />
              <h3 className="mt-3 text-sm font-black text-[#1A1F36]">No partner pharmacies match this filter</h3>
              <p className="mt-1 text-xs text-[#8896A4] max-w-sm mx-auto">
                {search ? 'Try adjusting your search criteria or filter tags.' : 'Invite your first third-party pharmacy partner to start prescription fulfillment.'}
              </p>
              {!search && (
                <button
                  onClick={() => setShowInviteModal(true)}
                  className="mt-4 inline-flex items-center gap-2 rounded-xl bg-[#1A1F36] px-4 py-2.5 text-xs font-black text-white hover:bg-[#2A314E]"
                >
                  <Plus className="h-4 w-4" /> Invite Pharmacy
                </button>
              )}
            </div>
          ) : (
            <div className="overflow-hidden rounded-2xl bg-white shadow-sm border border-[#1A1F36]/5">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#1A1F36] text-[10px] uppercase tracking-wider text-white">
                    <tr>
                      <th className="p-4">Pharmacy & Legal Entity</th>
                      <th>Contact Details</th>
                      <th>License / Classification</th>
                      <th>Verification</th>
                      <th>Operational</th>
                      <th>Staff Accounts</th>
                      <th className="p-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#1A1F36]/5">
                    {filteredPharmacies.map((pharmacy) => {
                      const usersCount = (pharmacy.partner_pharmacy_users || []).length
                      const isVerified = pharmacy.verification_status === 'VERIFIED'
                      const isUnderReview = pharmacy.verification_status === 'UNDER_REVIEW'
                      const isActive = pharmacy.status === 'ACTIVE'
                      const isSuspended = pharmacy.status === 'SUSPENDED'

                      return (
                        <tr key={pharmacy.id} className="hover:bg-[#FAF7F5] transition-colors">
                          <td className="p-4">
                            <Link
                              href={`/admin/pharmacy/${pharmacy.id}`}
                              className="font-black text-[#1A1F36] hover:text-[#C4622D] flex items-center gap-1.5"
                            >
                              <span className="text-sm">{pharmacy.name}</span>
                              <ExternalLink className="h-3 w-3 opacity-60" />
                            </Link>
                            <p className="text-[11px] font-semibold text-[#8896A4] mt-0.5">
                              {pharmacy.legal_entity_name || 'Legal Name Not Specified'}
                            </p>
                          </td>

                          <td className="py-4">
                            <div className="space-y-0.5">
                              <p className="font-semibold text-[#1A1F36] flex items-center gap-1.5">
                                <Mail className="h-3 w-3 text-[#8896A4]" /> {pharmacy.email || '—'}
                              </p>
                              {pharmacy.phone && (
                                <p className="text-[#8896A4] flex items-center gap-1.5">
                                  <Phone className="h-3 w-3" /> {pharmacy.phone}
                                </p>
                              )}
                            </div>
                          </td>

                          <td className="py-4">
                            <span className="font-bold text-[#1A1F36]">
                              {pharmacy.drug_license_number || 'Pending'}
                            </span>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <span className="rounded bg-[#1A1F36]/5 px-1.5 py-0.5 text-[9px] font-black text-[#40516A]">
                                {pharmacy.drug_license_type || '20B / 21B'}
                              </span>
                              {pharmacy.pharmacist_name && (
                                <span className="text-[10px] text-[#8896A4] truncate max-w-[120px]">
                                  Pharm: {pharmacy.pharmacist_name}
                                </span>
                              )}
                            </div>
                          </td>

                          <td className="py-4">
                            <span
                              className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider ${
                                pharmacy.verification_status === 'VERIFIED'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : pharmacy.verification_status === 'UNDER_REVIEW'
                                  ? 'bg-amber-100 text-amber-800'
                                  : pharmacy.verification_status === 'REJECTED'
                                  ? 'bg-red-100 text-red-800'
                                  : 'bg-zinc-100 text-zinc-700'
                              }`}
                            >
                              {pharmacy.verification_status === 'VERIFIED' && <CheckCircle2 className="h-3 w-3" />}
                              {pharmacy.verification_status === 'UNDER_REVIEW' && <Clock className="h-3 w-3" />}
                              {pharmacy.verification_status === 'REJECTED' && <XCircle className="h-3 w-3" />}
                              {pharmacy.verification_status}
                            </span>
                          </td>

                          <td className="py-4">
                            <span
                              className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider ${
                                pharmacy.status === 'ACTIVE'
                                  ? 'bg-blue-100 text-blue-800'
                                  : pharmacy.status === 'SUSPENDED'
                                  ? 'bg-red-100 text-red-800'
                                  : 'bg-zinc-100 text-zinc-700'
                              }`}
                            >
                              {pharmacy.status === 'ACTIVE' && <span className="h-1.5 w-1.5 rounded-full bg-blue-600 animate-pulse" />}
                              {pharmacy.status}
                            </span>
                          </td>

                          <td className="py-4">
                            <span className="text-xs font-bold text-[#40516A]">
                              {usersCount} {usersCount === 1 ? 'account' : 'accounts'}
                            </span>
                          </td>

                          <td className="p-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              {/* Detail page link */}
                              <Link
                                href={`/admin/pharmacy/${pharmacy.id}`}
                                className="rounded-lg border border-[#1A1F36]/15 bg-white px-2.5 py-1.5 text-[11px] font-black text-[#1A1F36] hover:bg-[#FAF7F5]"
                              >
                                View
                              </Link>

                              {/* Review Action */}
                              {isUnderReview && (
                                <button
                                  onClick={() => setReviewingPharmacy(pharmacy)}
                                  disabled={actionLoading}
                                  className="rounded-lg bg-amber-600 px-2.5 py-1.5 text-[11px] font-black text-white hover:bg-amber-700 disabled:opacity-50"
                                >
                                  Review
                                </button>
                              )}

                              {/* Direct Verify if Pending */}
                              {!isVerified && !isUnderReview && (
                                <button
                                  onClick={() => handleStatusUpdate(pharmacy.id, { verification_status: 'VERIFIED' })}
                                  disabled={actionLoading}
                                  className="rounded-lg bg-emerald-600 px-2.5 py-1.5 text-[11px] font-black text-white hover:bg-emerald-700 disabled:opacity-50"
                                >
                                  Verify
                                </button>
                              )}

                              {/* Activate Action */}
                              {isVerified && pharmacy.status === 'INACTIVE' && (
                                <button
                                  onClick={() => handleStatusUpdate(pharmacy.id, { status: 'ACTIVE' })}
                                  disabled={actionLoading}
                                  className="rounded-lg bg-[#1A1F36] px-2.5 py-1.5 text-[11px] font-black text-white hover:bg-[#2A314E] disabled:opacity-50"
                                >
                                  Activate
                                </button>
                              )}

                              {/* Suspend Action */}
                              {isActive && (
                                <button
                                  onClick={() => setSuspendingPharmacy(pharmacy)}
                                  disabled={actionLoading}
                                  className="rounded-lg border border-red-200 text-red-700 px-2.5 py-1.5 text-[11px] font-black hover:bg-red-50 disabled:opacity-50"
                                >
                                  Suspend
                                </button>
                              )}

                              {/* Reactivate Action */}
                              {isSuspended && (
                                <button
                                  onClick={() => handleStatusUpdate(pharmacy.id, { status: 'ACTIVE' })}
                                  disabled={actionLoading}
                                  className="rounded-lg bg-emerald-600 px-2.5 py-1.5 text-[11px] font-black text-white hover:bg-emerald-700 disabled:opacity-50"
                                >
                                  Reactivate
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </section>

        {/* Invitations History Section */}
        <section className="space-y-4 pt-4 border-t border-[#1A1F36]/10">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-black text-[#1A1F36] flex items-center gap-2">
                <Send className="h-4 w-4 text-[#C4622D]" />
                <span>Pharmacy Onboarding Invitations</span>
                <span className="rounded-full bg-[#1A1F36]/10 px-2 py-0.5 text-xs text-[#1A1F36]">
                  {invitations.length}
                </span>
              </h2>
              <p className="text-xs text-[#8896A4] mt-0.5">
                Token-secured 48-hour onboarding links sent to third-party pharmacies.
              </p>
            </div>
          </div>

          {invitations.length === 0 ? (
            <div className="rounded-2xl bg-white p-8 text-center shadow-sm border border-[#1A1F36]/5">
              <Mail className="mx-auto h-8 w-8 text-[#8896A4]/40" />
              <p className="mt-2 text-xs font-bold text-[#8896A4]">No pharmacy invitations issued yet.</p>
            </div>
          ) : (
            <div className="overflow-hidden rounded-2xl bg-white shadow-sm border border-[#1A1F36]/5">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#FAF7F5] text-[10px] uppercase tracking-wider text-[#40516A] border-b border-[#1A1F36]/10">
                    <tr>
                      <th className="p-4">Invited Pharmacy</th>
                      <th>Recipient Email</th>
                      <th>Status</th>
                      <th>Issued At</th>
                      <th>Expires At</th>
                      <th className="p-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#1A1F36]/5">
                    {invitations.map((inv) => {
                      const isExpired = new Date(inv.expires_at).getTime() < Date.now()
                      return (
                        <tr key={inv.id} className="hover:bg-[#FAF7F5]/60 transition-colors">
                          <td className="p-4 font-black text-[#1A1F36]">{inv.pharmacy_name}</td>
                          <td className="text-[#40516A] font-semibold">{inv.email}</td>
                          <td>
                            <span
                              className={`rounded-full px-2.5 py-0.5 text-[10px] font-black uppercase ${
                                inv.status === 'ACCEPTED'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : inv.status === 'INVITED' && !isExpired
                                  ? 'bg-amber-100 text-amber-800'
                                  : 'bg-zinc-100 text-zinc-700'
                              }`}
                            >
                              {inv.status === 'INVITED' && isExpired ? 'EXPIRED' : inv.status}
                            </span>
                          </td>
                          <td className="text-[#8896A4] text-[11px] font-semibold">
                            {new Date(inv.created_at).toLocaleDateString()}
                          </td>
                          <td className="text-[#8896A4] text-[11px] font-semibold">
                            {new Date(inv.expires_at).toLocaleString()}
                          </td>
                          <td className="p-4 text-right">
                            {inv.status === 'INVITED' && (
                              <div className="flex items-center justify-end gap-2">
                                <button
                                  onClick={() => handleResend(inv.id)}
                                  disabled={actionLoading}
                                  className="text-xs font-black text-[#C4622D] hover:underline disabled:opacity-50"
                                >
                                  Resend
                                </button>
                                <span className="text-zinc-300">|</span>
                                <button
                                  onClick={() => handleCancelInvite(inv.id)}
                                  disabled={actionLoading}
                                  className="text-xs font-black text-red-600 hover:underline disabled:opacity-50"
                                >
                                  Cancel
                                </button>
                              </div>
                            )}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </section>
      </div>

      {/* ── MODAL 1: Invite Pharmacy Modal ── */}
      {showInviteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl border border-[#1A1F36]/10">
            <div className="flex items-center justify-between pb-3 border-b border-[#1A1F36]/10">
              <div className="flex items-center gap-2">
                <Building2 className="h-5 w-5 text-[#C4622D]" />
                <h3 className="text-base font-black text-[#1A1F36]">Invite Partner Pharmacy</h3>
              </div>
              <button
                onClick={() => setShowInviteModal(false)}
                className="text-[#8896A4] hover:text-[#1A1F36] text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <p className="mt-3 text-xs font-semibold text-[#8896A4]">
              A secure 48-hour onboarding invitation will be generated. The recipient will be guided through identity verification and licensing compliance.
            </p>

            <form onSubmit={handleSendInvite} className="mt-4 space-y-3.5">
              <div>
                <label className="text-[10px] font-black uppercase tracking-wider text-[#8896A4]">
                  Pharmacy Name <span className="text-red-500">*</span>
                </label>
                <input
                  required
                  placeholder="e.g. HealthBridge Pharmacy Bengaluru"
                  value={inviteName}
                  onChange={(e) => setInviteName(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-[#1A1F36]/15 p-3 text-xs font-semibold outline-none focus:border-[#1A1F36]"
                />
              </div>

              <div>
                <label className="text-[10px] font-black uppercase tracking-wider text-[#8896A4]">
                  Official Contact Email <span className="text-red-500">*</span>
                </label>
                <input
                  required
                  type="email"
                  placeholder="pharmacist@healthbridge.in"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-[#1A1F36]/15 p-3 text-xs font-semibold outline-none focus:border-[#1A1F36]"
                />
              </div>

              <div>
                <label className="text-[10px] font-black uppercase tracking-wider text-[#8896A4]">
                  Contact Phone (Optional)
                </label>
                <input
                  type="tel"
                  placeholder="+91 98765 43210"
                  value={invitePhone}
                  onChange={(e) => setInvitePhone(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-[#1A1F36]/15 p-3 text-xs font-semibold outline-none focus:border-[#1A1F36]"
                />
              </div>

              <div className="mt-6 flex justify-end gap-2.5 pt-3 border-t border-[#1A1F36]/10">
                <button
                  type="button"
                  onClick={() => setShowInviteModal(false)}
                  className="rounded-xl border border-[#1A1F36]/15 px-4 py-2.5 text-xs font-black text-[#40516A] hover:bg-[#FAF7F5]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={inviteLoading}
                  className="inline-flex items-center gap-2 rounded-xl bg-[#1A1F36] px-5 py-2.5 text-xs font-black text-white hover:bg-[#2A314E] disabled:opacity-50"
                >
                  {inviteLoading ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                  <span>{inviteLoading ? 'Sending...' : 'Send Invitation'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL 2: Review Pharmacy Onboarding Modal ── */}
      {reviewingPharmacy && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-xl rounded-2xl bg-white p-6 shadow-2xl border border-[#1A1F36]/10 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#1A1F36]/10">
              <div className="flex items-center gap-2">
                <FileCheck className="h-5 w-5 text-amber-600" />
                <h3 className="text-base font-black text-[#1A1F36]">Review Pharmacy Credentials</h3>
              </div>
              <button
                onClick={() => {
                  setReviewingPharmacy(null)
                  setShowRejectInput(false)
                  setRejectReason('')
                }}
                className="text-[#8896A4] hover:text-[#1A1F36] text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <div className="rounded-xl bg-[#FAF7F5] p-4 space-y-2 border border-[#1A1F36]/5 text-xs">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <span className="text-[10px] font-black uppercase text-[#8896A4]">Pharmacy Trade Name</span>
                  <p className="font-bold text-[#1A1F36]">{reviewingPharmacy.name}</p>
                </div>
                <div>
                  <span className="text-[10px] font-black uppercase text-[#8896A4]">Legal Entity Name</span>
                  <p className="font-bold text-[#1A1F36]">{reviewingPharmacy.legal_entity_name || '—'}</p>
                </div>
                <div>
                  <span className="text-[10px] font-black uppercase text-[#8896A4]">Drug License #</span>
                  <p className="font-bold text-[#1A1F36]">{reviewingPharmacy.drug_license_number || '—'}</p>
                </div>
                <div>
                  <span className="text-[10px] font-black uppercase text-[#8896A4]">License Type</span>
                  <p className="font-bold text-[#1A1F36]">{reviewingPharmacy.drug_license_type || '20B / 21B'}</p>
                </div>
                <div>
                  <span className="text-[10px] font-black uppercase text-[#8896A4]">Registered Pharmacist</span>
                  <p className="font-bold text-[#1A1F36]">{reviewingPharmacy.pharmacist_name || '—'}</p>
                </div>
                <div>
                  <span className="text-[10px] font-black uppercase text-[#8896A4]">Registration Number</span>
                  <p className="font-bold text-[#1A1F36]">{reviewingPharmacy.pharmacist_registration_number || '—'}</p>
                </div>
              </div>
              <div className="pt-2 border-t border-[#1A1F36]/5">
                <span className="text-[10px] font-black uppercase text-[#8896A4]">Contact Information</span>
                <p className="font-semibold text-[#40516A]">
                  Email: {reviewingPharmacy.email || '—'} • Phone: {reviewingPharmacy.phone || '—'}
                </p>
              </div>
            </div>

            {showRejectInput ? (
              <div className="space-y-2 pt-2">
                <label className="text-[10px] font-black uppercase text-red-600">
                  Rejection Reason (Required)
                </label>
                <textarea
                  rows={3}
                  required
                  placeholder="Explain why credentials cannot be approved (e.g., license expired, registration mismatch)..."
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  className="w-full rounded-xl border border-red-200 p-3 text-xs font-semibold outline-none focus:border-red-600"
                />
                <div className="flex justify-end gap-2">
                  <button
                    onClick={() => setShowRejectInput(false)}
                    className="rounded-lg border border-[#1A1F36]/15 px-3 py-1.5 text-xs font-black text-[#40516A]"
                  >
                    Back
                  </button>
                  <button
                    onClick={() => {
                      if (!rejectReason.trim()) {
                        alert('Please provide a rejection reason.')
                        return
                      }
                      handleStatusUpdate(reviewingPharmacy.id, {
                        verification_status: 'REJECTED',
                        rejection_reason: rejectReason,
                      })
                    }}
                    disabled={actionLoading || !rejectReason.trim()}
                    className="rounded-lg bg-red-600 px-4 py-1.5 text-xs font-black text-white hover:bg-red-700 disabled:opacity-50"
                  >
                    Confirm Rejection
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between pt-3 border-t border-[#1A1F36]/10">
                <button
                  onClick={() => setShowRejectInput(true)}
                  className="rounded-xl border border-red-200 text-red-700 px-4 py-2.5 text-xs font-black hover:bg-red-50"
                >
                  Reject Credentials
                </button>
                <button
                  onClick={() => handleStatusUpdate(reviewingPharmacy.id, { verification_status: 'VERIFIED' })}
                  disabled={actionLoading}
                  className="rounded-xl bg-emerald-600 px-5 py-2.5 text-xs font-black text-white hover:bg-emerald-700 disabled:opacity-50"
                >
                  Verify Credentials
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── MODAL 3: Suspend Pharmacy Modal ── */}
      {suspendingPharmacy && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl border border-[#1A1F36]/10 space-y-4">
            <div className="flex items-center gap-2 text-red-600 pb-2 border-b border-[#1A1F36]/10">
              <ShieldAlert className="h-5 w-5" />
              <h3 className="text-base font-black text-[#1A1F36]">Suspend Partner Pharmacy</h3>
            </div>

            <p className="text-xs font-semibold text-[#8896A4]">
              Suspending <strong className="text-[#1A1F36]">{suspendingPharmacy.name}</strong> immediately revokes its fulfillment eligibility and pauses portal operations. Existing historical orders will be preserved.
            </p>

            <div>
              <label className="text-[10px] font-black uppercase tracking-wider text-[#8896A4]">
                Reason for Suspension
              </label>
              <textarea
                rows={3}
                placeholder="e.g. Audit non-compliance, license renewal pending..."
                value={suspendReason}
                onChange={(e) => setSuspendReason(e.target.value)}
                className="mt-1 w-full rounded-xl border border-[#1A1F36]/15 p-3 text-xs font-semibold outline-none focus:border-red-600"
              />
            </div>

            <div className="flex justify-end gap-2.5 pt-3 border-t border-[#1A1F36]/10">
              <button
                onClick={() => setSuspendingPharmacy(null)}
                className="rounded-xl border border-[#1A1F36]/15 px-4 py-2 text-xs font-black text-[#40516A]"
              >
                Cancel
              </button>
              <button
                onClick={() =>
                  handleStatusUpdate(suspendingPharmacy.id, {
                    status: 'SUSPENDED',
                    suspension_reason: suspendReason || 'Suspended by admin',
                  })
                }
                disabled={actionLoading}
                className="rounded-xl bg-red-600 px-5 py-2 text-xs font-black text-white hover:bg-red-700 disabled:opacity-50"
              >
                Suspend Pharmacy
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}
