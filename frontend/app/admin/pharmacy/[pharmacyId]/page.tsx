'use client'

import { useEffect, useState, use } from 'react'
import Link from 'next/link'
import {
  Building2,
  Mail,
  Phone,
  MapPin,
  FileText,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  Clock,
  AlertTriangle,
  ArrowLeft,
  RefreshCw,
  ExternalLink,
  Ban,
  PlayCircle,
  UserCheck,
  Package,
  History,
  Send,
  FileCheck,
  ShieldAlert,
  Calendar,
  Truck,
  Check,
  ChevronRight,
  KeyRound,
} from 'lucide-react'
import { authedFetch } from '@/lib/apiClient'

type RouteProps = {
  params: Promise<{ pharmacyId: string }>
}

export default function AdminPharmacyDetailPage({ params }: RouteProps) {
  const resolvedParams = use(params)
  const pharmacyId = resolvedParams.pharmacyId

  const [pharmacy, setPharmacy] = useState<any | null>(null)
  const [users, setUsers] = useState<any[]>([])
  const [invitations, setInvitations] = useState<any[]>([])
  const [stats, setStats] = useState({ totalOrders: 0, activeOrders: 0, completedOrders: 0 })
  const [recentOrders, setRecentOrders] = useState<any[]>([])
  const [auditLogs, setAuditLogs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  // Modals
  const [showReviewModal, setShowReviewModal] = useState(false)
  const [showRejectInput, setShowRejectInput] = useState(false)
  const [rejectReason, setRejectReason] = useState('')

  const [showSuspendModal, setShowSuspendModal] = useState(false)
  const [suspendReason, setSuspendReason] = useState('')

  const [showActivateModal, setShowActivateModal] = useState(false)

  const loadData = async () => {
    setLoading(true)
    setError('')
    try {
      const res = await authedFetch(`/api/admin/pharmacy/${pharmacyId}`)
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to load pharmacy details.')

      setPharmacy(data.pharmacy)
      setUsers(data.users || [])
      setInvitations(data.invitations || [])
      if (data.stats) setStats(data.stats)
      setRecentOrders(data.recentOrders || [])
      setAuditLogs(data.auditLogs || [])
    } catch (err: any) {
      setError(err.message || 'Unable to retrieve partner pharmacy record.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [pharmacyId])

  const handleStatusUpdate = async (updates: any) => {
    setActionLoading(true)
    setError('')
    setSuccess('')
    try {
      const res = await authedFetch(`/api/admin/pharmacy/${pharmacyId}`, {
        method: 'PATCH',
        body: JSON.stringify(updates),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to update status.')

      let msg = 'Pharmacy updated successfully.'
      if (updates.verification_status === 'VERIFIED') msg = 'Pharmacy credentials verified successfully.'
      else if (updates.verification_status === 'REJECTED') msg = 'Pharmacy credentials rejected.'
      else if (updates.status === 'ACTIVE') msg = 'Pharmacy activated! It is now live for order assignments.'
      else if (updates.status === 'SUSPENDED') msg = 'Pharmacy suspended from fulfillment network.'

      setSuccess(msg)
      setShowReviewModal(false)
      setShowRejectInput(false)
      setRejectReason('')
      setShowSuspendModal(false)
      setSuspendReason('')
      setShowActivateModal(false)
      await loadData()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setActionLoading(false)
    }
  }

  const handleSendPasswordLink = async () => {
    if (!pharmacy?.email) return setError('Pharmacy has no associated email address.')
    setActionLoading(true)
    setError('')
    setSuccess('')
    try {
      const res = await authedFetch(`/api/admin/pharmacy/${pharmacyId}/send-password-link`, {
        method: 'POST',
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to send password setup link.')
      setSuccess(`Password setup/reset email sent successfully to ${pharmacy.email}!`)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setActionLoading(false)
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-[#F5F0EB] p-8 flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="mx-auto h-8 w-8 animate-spin text-[#C4622D]" />
          <p className="mt-3 text-xs font-bold text-[#8896A4]">Loading partner pharmacy profile...</p>
        </div>
      </main>
    )
  }

  if (error && !pharmacy) {
    return (
      <main className="min-h-screen bg-[#F5F0EB] p-8">
        <div className="mx-auto max-w-3xl rounded-2xl bg-white p-8 shadow-sm text-center">
          <AlertTriangle className="mx-auto h-10 w-10 text-red-500" />
          <h2 className="mt-3 text-lg font-black text-[#1A1F36]">Partner Pharmacy Not Found</h2>
          <p className="mt-1 text-xs text-[#8896A4]">{error}</p>
          <Link
            href="/admin/pharmacy"
            className="mt-6 inline-flex items-center gap-2 rounded-xl bg-[#1A1F36] px-5 py-2.5 text-xs font-black text-white hover:bg-[#2A314E]"
          >
            <ArrowLeft className="h-4 w-4" /> Return to Partner Pharmacies
          </Link>
        </div>
      </main>
    )
  }

  const isVerified = pharmacy.verification_status === 'VERIFIED'
  const isUnderReview = pharmacy.verification_status === 'UNDER_REVIEW'
  const isRejected = pharmacy.verification_status === 'REJECTED'
  const isActive = pharmacy.status === 'ACTIVE'
  const isSuspended = pharmacy.status === 'SUSPENDED'

  // Format address
  let addressText = '—'
  if (pharmacy.address) {
    if (typeof pharmacy.address === 'string') {
      addressText = pharmacy.address
    } else if (typeof pharmacy.address === 'object') {
      const a = pharmacy.address
      addressText = [a.line1, a.line2, a.area, a.city, a.state, a.pincode].filter(Boolean).join(', ')
    }
  }

  return (
    <main className="min-h-screen bg-[#F5F0EB] p-4 sm:p-6 lg:p-8 text-[#1A1F36]">
      <div className="mx-auto max-w-7xl space-y-6">
        
        {/* Navigation & Breadcrumb */}
        <div className="flex flex-col gap-3 border-b border-[#1A1F36]/10 pb-4">
          <div className="flex items-center justify-between">
            <Link
              href="/admin/pharmacy"
              className="inline-flex items-center gap-2 rounded-xl border border-[#1A1F36]/15 bg-white px-3.5 py-2 text-xs font-black text-[#1A1F36] hover:bg-[#FAF7F5] shadow-sm transition-all group"
            >
              <ArrowLeft className="h-4 w-4 text-[#8896A4] group-hover:text-[#1A1F36] group-hover:-translate-x-0.5 transition-transform" />
              <span>Back to Partner Pharmacies</span>
            </Link>

            <div className="flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-[#8896A4]">
              <Link href="/admin" className="hover:text-[#1A1F36] transition-colors">
                Admin Portal
              </Link>
              <ChevronRight className="h-3 w-3" />
              <Link href="/admin/pharmacy" className="hover:text-[#1A1F36] transition-colors">
                Partner Pharmacies
              </Link>
              <ChevronRight className="h-3 w-3" />
              <span className="text-[#C4622D] truncate max-w-[160px]">{pharmacy.name}</span>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pt-1">
            <div>
              <div className="flex flex-wrap items-center gap-2.5">
                <h1 className="text-2xl sm:text-3xl font-black text-[#1A1F36]">{pharmacy.name}</h1>
              <span
                className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider ${
                  isVerified
                    ? 'bg-emerald-100 text-emerald-800'
                    : isUnderReview
                    ? 'bg-amber-100 text-amber-800'
                    : isRejected
                    ? 'bg-red-100 text-red-800'
                    : 'bg-zinc-100 text-zinc-700'
                }`}
              >
                {isVerified && <CheckCircle2 className="h-3 w-3" />}
                {isUnderReview && <Clock className="h-3 w-3" />}
                {isRejected && <XCircle className="h-3 w-3" />}
                {pharmacy.verification_status}
              </span>
              <span
                className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider ${
                  isActive
                    ? 'bg-blue-100 text-blue-800'
                    : isSuspended
                    ? 'bg-red-100 text-red-800'
                    : 'bg-zinc-100 text-zinc-700'
                }`}
              >
                {isActive && <span className="h-1.5 w-1.5 rounded-full bg-blue-600 animate-pulse" />}
                {pharmacy.status}
              </span>
            </div>
            <p className="mt-1 text-xs font-semibold text-[#8896A4]">
              Partner ID: <span className="font-mono text-[#1A1F36]">{pharmacy.id}</span> • Registered: {new Date(pharmacy.created_at).toLocaleDateString()}
            </p>
          </div>

          {/* Contextual Action Bar */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={loadData}
              disabled={actionLoading}
              className="inline-flex items-center gap-1.5 rounded-xl border border-[#1A1F36]/15 bg-white px-3.5 py-2 text-xs font-black text-[#1A1F36] hover:bg-[#FAF7F5] shadow-sm"
              title="Refresh profile"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${actionLoading ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>

            {/* Review Action */}
            {isUnderReview && (
              <button
                onClick={() => setShowReviewModal(true)}
                disabled={actionLoading}
                className="inline-flex items-center gap-1.5 rounded-xl bg-amber-600 px-4 py-2 text-xs font-black text-white hover:bg-amber-700 shadow-sm"
              >
                <FileCheck className="h-3.5 w-3.5" />
                <span>Review Credentials</span>
              </button>
            )}

            {/* Direct Verify (if PENDING or REJECTED) */}
            {!isVerified && !isUnderReview && (
              <button
                onClick={() => setShowReviewModal(true)}
                disabled={actionLoading}
                className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-black text-white hover:bg-emerald-700 shadow-sm"
              >
                <CheckCircle2 className="h-3.5 w-3.5" />
                <span>Verify Credentials</span>
              </button>
            )}

            {/* Activate Action (Only if VERIFIED and INACTIVE) */}
            {isVerified && pharmacy.status === 'INACTIVE' && (
              <button
                onClick={() => setShowActivateModal(true)}
                disabled={actionLoading}
                className="inline-flex items-center gap-1.5 rounded-xl bg-[#1A1F36] px-4 py-2 text-xs font-black text-white hover:bg-[#2A314E] shadow-sm"
              >
                <PlayCircle className="h-3.5 w-3.5" />
                <span>Activate Pharmacy</span>
              </button>
            )}

            {/* Suspend Action (If ACTIVE) */}
            {isActive && (
              <button
                onClick={() => setShowSuspendModal(true)}
                disabled={actionLoading}
                className="inline-flex items-center gap-1.5 rounded-xl border border-red-200 text-red-700 bg-white px-4 py-2 text-xs font-black hover:bg-red-50 shadow-sm"
              >
                <Ban className="h-3.5 w-3.5" />
                <span>Suspend Pharmacy</span>
              </button>
            )}

            {/* Reactivate Action (If SUSPENDED) */}
            {isSuspended && (
              <button
                onClick={() => handleStatusUpdate({ status: 'ACTIVE' })}
                disabled={actionLoading}
                className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-black text-white hover:bg-emerald-700 shadow-sm"
              >
                <PlayCircle className="h-3.5 w-3.5" />
                <span>Reactivate Pharmacy</span>
              </button>
            )}

            {/* Send Password Setup / Reset Link */}
            <button
              onClick={handleSendPasswordLink}
              disabled={actionLoading}
              className="inline-flex items-center gap-1.5 rounded-xl border border-[#1A1F36]/15 bg-white px-3.5 py-2 text-xs font-black text-[#1A1F36] hover:bg-[#F5F0EB] shadow-sm transition-colors"
              title="Send an email to the pharmacy with a link to set or reset their login password"
            >
              <KeyRound className="h-3.5 w-3.5 text-[#C4622D]" />
              <span>Send Password Link</span>
            </button>
          </div>
        </div>
      </div>

        {/* Global Notifications */}
        {error && (
          <div className="flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-xs font-bold text-red-800 shadow-sm">
            <AlertTriangle className="h-5 w-5 flex-shrink-0 text-red-600" />
            <span>{error}</span>
          </div>
        )}
        {success && (
          <div className="flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-xs font-bold text-emerald-800 shadow-sm">
            <CheckCircle2 className="h-5 w-5 flex-shrink-0 text-emerald-600" />
            <span>{success}</span>
          </div>
        )}

        {/* Rejection / Suspension Notice Banner if applicable */}
        {isRejected && (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-5 text-xs text-red-900 shadow-sm space-y-1">
            <div className="flex items-center gap-2 font-black text-red-700">
              <XCircle className="h-4 w-4" />
              <span>Credentials Rejected by Administrator</span>
            </div>
            <p className="font-semibold text-red-800">
              Reason: &quot;{pharmacy.rejection_reason || 'License or credential discrepancy'}&quot;
            </p>
          </div>
        )}

        {isSuspended && (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-xs text-amber-900 shadow-sm space-y-1">
            <div className="flex items-center gap-2 font-black text-amber-700">
              <ShieldAlert className="h-4 w-4" />
              <span>Partner Fulfillment Suspended</span>
            </div>
            <p className="font-semibold text-amber-800">
              Reason: &quot;{pharmacy.suspension_reason || 'Administrative hold'}&quot;
            </p>
          </div>
        )}

        {/* 4-Card Master Grid */}
        <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          
          {/* Card 1: Pharmacy Identity */}
          <div className="rounded-2xl bg-white p-5 shadow-sm border border-[#1A1F36]/5 space-y-3">
            <div className="flex items-center gap-2 text-[#C4622D]">
              <Building2 className="h-4 w-4" />
              <h3 className="text-xs font-black uppercase tracking-wider">General Information</h3>
            </div>
            <div className="space-y-2 text-xs">
              <div>
                <span className="text-[10px] font-black uppercase text-[#8896A4]">Trade Name</span>
                <p className="font-black text-[#1A1F36]">{pharmacy.name}</p>
              </div>
              <div>
                <span className="text-[10px] font-black uppercase text-[#8896A4]">Legal Entity Name</span>
                <p className="font-semibold text-[#40516A]">{pharmacy.legal_entity_name || '—'}</p>
              </div>
              <div>
                <span className="text-[10px] font-black uppercase text-[#8896A4]">Official Email</span>
                <p className="font-semibold text-[#1A1F36]">{pharmacy.email || '—'}</p>
              </div>
              <div>
                <span className="text-[10px] font-black uppercase text-[#8896A4]">Phone Number</span>
                <p className="font-semibold text-[#40516A]">{pharmacy.phone || '—'}</p>
              </div>
              <div>
                <span className="text-[10px] font-black uppercase text-[#8896A4]">Physical Address</span>
                <p className="font-semibold text-[#40516A] text-[11px] leading-relaxed">{addressText}</p>
              </div>
            </div>
          </div>

          {/* Card 2: Regulatory & Compliance */}
          <div className="rounded-2xl bg-white p-5 shadow-sm border border-[#1A1F36]/5 space-y-3">
            <div className="flex items-center gap-2 text-indigo-600">
              <ShieldCheck className="h-4 w-4" />
              <h3 className="text-xs font-black uppercase tracking-wider">Regulatory & License</h3>
            </div>
            <div className="space-y-2 text-xs">
              <div>
                <span className="text-[10px] font-black uppercase text-[#8896A4]">Drug License Number</span>
                <p className="font-mono font-black text-[#1A1F36]">{pharmacy.drug_license_number || 'Pending'}</p>
              </div>
              <div>
                <span className="text-[10px] font-black uppercase text-[#8896A4]">License Classification</span>
                <p className="font-semibold text-[#40516A]">{pharmacy.drug_license_type || 'Form 20B / Form 21B'}</p>
              </div>
              <div>
                <span className="text-[10px] font-black uppercase text-[#8896A4]">License Expiry Date</span>
                <p className="font-semibold text-[#40516A]">
                  {pharmacy.drug_license_expiry ? new Date(pharmacy.drug_license_expiry).toLocaleDateString() : 'Not Specified'}
                </p>
              </div>
              <div>
                <span className="text-[10px] font-black uppercase text-[#8896A4]">Registered Pharmacist</span>
                <p className="font-semibold text-[#1A1F36]">{pharmacy.pharmacist_name || '—'}</p>
              </div>
              <div>
                <span className="text-[10px] font-black uppercase text-[#8896A4]">Pharmacist Reg #</span>
                <p className="font-mono font-semibold text-[#40516A]">{pharmacy.pharmacist_registration_number || '—'}</p>
              </div>
            </div>
          </div>

          {/* Card 3: Fulfillment Performance */}
          <div className="rounded-2xl bg-white p-5 shadow-sm border border-[#1A1F36]/5 space-y-3">
            <div className="flex items-center justify-between text-[#1A1F36]">
              <div className="flex items-center gap-2 text-[#C4622D]">
                <Package className="h-4 w-4" />
                <h3 className="text-xs font-black uppercase tracking-wider">Fulfillment Metrics</h3>
              </div>
              <Link
                href="/admin/pharmacy-orders"
                className="text-[10px] font-black text-[#C4622D] hover:underline"
              >
                All Orders →
              </Link>
            </div>
            <div className="grid grid-cols-2 gap-2 pt-1 text-xs">
              <div className="rounded-xl bg-[#FAF7F5] p-3">
                <span className="text-[10px] font-black uppercase text-[#8896A4]">Total Orders</span>
                <p className="mt-1 text-2xl font-black text-[#1A1F36]">{stats.totalOrders}</p>
              </div>
              <div className="rounded-xl bg-[#FAF7F5] p-3">
                <span className="text-[10px] font-black uppercase text-amber-600">Active</span>
                <p className="mt-1 text-2xl font-black text-amber-600">{stats.activeOrders}</p>
              </div>
              <div className="col-span-2 rounded-xl bg-[#FAF7F5] p-3">
                <span className="text-[10px] font-black uppercase text-emerald-600">Completed Deliveries</span>
                <p className="mt-1 text-2xl font-black text-emerald-600">{stats.completedOrders}</p>
              </div>
            </div>
            <div className="pt-2 text-[11px] text-[#8896A4] font-semibold">
              Eligible for assignment: {isActive && isVerified ? (
                <span className="font-bold text-emerald-700">Yes (Live Partner)</span>
              ) : (
                <span className="font-bold text-red-600">No (Verification or Activation required)</span>
              )}
            </div>
          </div>

          {/* Card 4: Authorized Accounts */}
          <div className="rounded-2xl bg-white p-5 shadow-sm border border-[#1A1F36]/5 space-y-3">
            <div className="flex items-center gap-2 text-[#1A1F36]">
              <UserCheck className="h-4 w-4 text-[#C4622D]" />
              <h3 className="text-xs font-black uppercase tracking-wider">Pharmacy Staff Users</h3>
            </div>
            <p className="text-[10px] text-[#8896A4]">
              Authenticated user credentials bound to this pharmacy tenant record.
            </p>
            {users.length === 0 ? (
              <div className="rounded-xl bg-[#FAF7F5] p-4 text-center text-xs text-[#8896A4]">
                No user account linked yet. The user will be created upon invitation acceptance.
              </div>
            ) : (
              <div className="space-y-2 max-h-[190px] overflow-y-auto pr-1">
                {users.map((u) => (
                  <div key={u.id} className="rounded-xl bg-[#FAF7F5] p-2.5 text-xs space-y-0.5 border border-[#1A1F36]/5">
                    <p className="font-bold text-[#1A1F36] truncate">{u.name}</p>
                    <p className="text-[11px] text-[#40516A] truncate">{u.email}</p>
                    <div className="flex items-center gap-1.5 pt-1">
                      <span className="rounded bg-[#1A1F36]/10 px-1.5 py-0.5 text-[9px] font-black text-[#1A1F36]">
                        {u.role}
                      </span>
                      <span className={`rounded px-1.5 py-0.5 text-[9px] font-black ${
                        u.status === 'ACTIVE' ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'
                      }`}>
                        {u.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* Section: Recent Fulfillment Orders */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-black text-[#1A1F36] flex items-center gap-2">
              <Package className="h-4 w-4 text-[#C4622D]" />
              <span>Assigned Fulfillment Orders</span>
              <span className="rounded-full bg-[#1A1F36]/10 px-2 py-0.5 text-xs text-[#1A1F36]">
                {recentOrders.length}
              </span>
            </h2>
          </div>

          {recentOrders.length === 0 ? (
            <div className="rounded-2xl bg-white p-8 text-center shadow-sm border border-[#1A1F36]/5">
              <Truck className="mx-auto h-8 w-8 text-[#8896A4]/40" />
              <p className="mt-2 text-xs font-bold text-[#8896A4]">No orders have been fulfilled by this pharmacy yet.</p>
              <p className="mt-0.5 text-[11px] text-[#8896A4]">
                When an admin assigns a pending prescription order to this partner, it will appear here.
              </p>
            </div>
          ) : (
            <div className="overflow-hidden rounded-2xl bg-white shadow-sm border border-[#1A1F36]/5">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#1A1F36] text-[10px] uppercase tracking-wider text-white">
                    <tr>
                      <th className="p-4">Order Reference</th>
                      <th>Status</th>
                      <th>Courier & Tracking</th>
                      <th>Assigned At</th>
                      <th className="p-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#1A1F36]/5">
                    {recentOrders.map((order) => (
                      <tr key={order.id} className="hover:bg-[#FAF7F5] transition-colors">
                        <td className="p-4 font-mono font-black text-[#1A1F36]">
                          8LIV-PO-{order.id.slice(0, 8).toUpperCase()}
                        </td>
                        <td>
                          <span className="rounded-full bg-blue-100 px-2.5 py-0.5 text-[10px] font-black text-blue-800 uppercase">
                            {order.status.replaceAll('_', ' ')}
                          </span>
                        </td>
                        <td className="text-[#40516A] font-semibold">
                          {order.tracking_number ? (
                            <span>{order.courier_partner || 'Courier'}: {order.tracking_number}</span>
                          ) : (
                            <span className="text-[#8896A4]">Pending Dispatch</span>
                          )}
                        </td>
                        <td className="text-[#8896A4] text-[11px] font-semibold">
                          {new Date(order.created_at).toLocaleString()}
                        </td>
                        <td className="p-4 text-right">
                          <Link
                            href={`/admin/pharmacy-orders/${order.id}`}
                            className="rounded-lg border border-[#1A1F36]/15 bg-white px-3 py-1.5 text-[11px] font-black text-[#1A1F36] hover:bg-[#FAF7F5]"
                          >
                            Open Order
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </section>

        {/* Section: Status & Audit Lifecycle Timeline */}
        <section className="space-y-4 pt-2">
          <div className="flex items-center gap-2">
            <History className="h-4 w-4 text-[#C4622D]" />
            <h2 className="text-base font-black text-[#1A1F36]">Partner Lifecycle & Audit Trail</h2>
          </div>

          <div className="rounded-2xl bg-white p-6 shadow-sm border border-[#1A1F36]/5 space-y-4">
            {/* Sequential Phase Indicator */}
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-2 pb-4 border-b border-[#1A1F36]/10 text-xs">
              <div className={`p-3 rounded-xl ${invitations.length > 0 ? 'bg-emerald-50 text-emerald-900 border border-emerald-200' : 'bg-[#FAF7F5] text-[#8896A4]'}`}>
                <p className="text-[10px] font-black uppercase">1. Invited</p>
                <p className="font-bold mt-0.5">{invitations.length > 0 ? 'Completed' : 'Pending'}</p>
              </div>
              <div className={`p-3 rounded-xl ${users.length > 0 ? 'bg-emerald-50 text-emerald-900 border border-emerald-200' : 'bg-[#FAF7F5] text-[#8896A4]'}`}>
                <p className="text-[10px] font-black uppercase">2. Onboarded</p>
                <p className="font-bold mt-0.5">{users.length > 0 ? 'Account Created' : 'Pending'}</p>
              </div>
              <div className={`p-3 rounded-xl ${isUnderReview ? 'bg-amber-50 text-amber-900 border border-amber-200' : isVerified ? 'bg-emerald-50 text-emerald-900 border border-emerald-200' : 'bg-[#FAF7F5] text-[#8896A4]'}`}>
                <p className="text-[10px] font-black uppercase">3. Review</p>
                <p className="font-bold mt-0.5">{isUnderReview ? 'In Progress' : isVerified ? 'Passed' : 'Pending'}</p>
              </div>
              <div className={`p-3 rounded-xl ${isVerified ? 'bg-emerald-50 text-emerald-900 border border-emerald-200' : 'bg-[#FAF7F5] text-[#8896A4]'}`}>
                <p className="text-[10px] font-black uppercase">4. Verified</p>
                <p className="font-bold mt-0.5">{isVerified ? 'Credentials Approved' : 'Pending'}</p>
              </div>
              <div className={`p-3 rounded-xl ${isActive ? 'bg-blue-50 text-blue-900 border border-blue-200' : 'bg-[#FAF7F5] text-[#8896A4]'}`}>
                <p className="text-[10px] font-black uppercase">5. Activated</p>
                <p className="font-bold mt-0.5">{isActive ? 'Live Network' : isSuspended ? 'Suspended' : 'Inactive'}</p>
              </div>
              <div className={`p-3 rounded-xl ${stats.completedOrders > 0 ? 'bg-emerald-50 text-emerald-900 border border-emerald-200' : 'bg-[#FAF7F5] text-[#8896A4]'}`}>
                <p className="text-[10px] font-black uppercase">6. Fulfillment</p>
                <p className="font-bold mt-0.5">{stats.completedOrders} Orders Delivered</p>
              </div>
            </div>

            {/* Audit Log Entries */}
            <div className="space-y-3 pt-2">
              <h3 className="text-xs font-black uppercase tracking-wider text-[#8896A4]">Logged Audit Events</h3>
              {auditLogs.length === 0 ? (
                <p className="text-xs text-[#8896A4] italic">No prior audit logs recorded for this partner record.</p>
              ) : (
                <div className="divide-y divide-[#1A1F36]/5">
                  {auditLogs.map((log) => (
                    <div key={log.id} className="py-2.5 flex items-start justify-between text-xs">
                      <div>
                        <p className="font-black text-[#1A1F36]">{log.action}</p>
                        <p className="text-[11px] text-[#8896A4]">
                          Actor Role: <span className="uppercase font-bold">{log.actor_role || 'system'}</span> • IP: {log.ip_address || 'internal'}
                        </p>
                      </div>
                      <span className="text-[11px] font-semibold text-[#8896A4]">
                        {new Date(log.created_at).toLocaleString()}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </section>
      </div>

      {/* ── MODAL: Review Credentials Modal ── */}
      {showReviewModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-xl rounded-2xl bg-white p-6 shadow-2xl border border-[#1A1F36]/10 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#1A1F36]/10">
              <div className="flex items-center gap-2">
                <FileCheck className="h-5 w-5 text-amber-600" />
                <h3 className="text-base font-black text-[#1A1F36]">Review Pharmacy Credentials</h3>
              </div>
              <button
                onClick={() => {
                  setShowReviewModal(false)
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
                  <span className="text-[10px] font-black uppercase text-[#8896A4]">Trade Name</span>
                  <p className="font-bold text-[#1A1F36]">{pharmacy.name}</p>
                </div>
                <div>
                  <span className="text-[10px] font-black uppercase text-[#8896A4]">Legal Entity</span>
                  <p className="font-bold text-[#1A1F36]">{pharmacy.legal_entity_name || '—'}</p>
                </div>
                <div>
                  <span className="text-[10px] font-black uppercase text-[#8896A4]">Drug License #</span>
                  <p className="font-mono font-bold text-[#1A1F36]">{pharmacy.drug_license_number || 'Pending'}</p>
                </div>
                <div>
                  <span className="text-[10px] font-black uppercase text-[#8896A4]">License Type</span>
                  <p className="font-bold text-[#1A1F36]">{pharmacy.drug_license_type || '20B / 21B'}</p>
                </div>
                <div>
                  <span className="text-[10px] font-black uppercase text-[#8896A4]">Registered Pharmacist</span>
                  <p className="font-bold text-[#1A1F36]">{pharmacy.pharmacist_name || '—'}</p>
                </div>
                <div>
                  <span className="text-[10px] font-black uppercase text-[#8896A4]">Pharmacist Reg #</span>
                  <p className="font-mono font-bold text-[#1A1F36]">{pharmacy.pharmacist_registration_number || '—'}</p>
                </div>
              </div>
              <div className="pt-2 border-t border-[#1A1F36]/5">
                <span className="text-[10px] font-black uppercase text-[#8896A4]">Contact</span>
                <p className="font-semibold text-[#40516A]">
                  Email: {pharmacy.email || '—'} • Phone: {pharmacy.phone || '—'}
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
                  placeholder="Explain why credentials cannot be approved..."
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
                      handleStatusUpdate({
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
                  onClick={() => handleStatusUpdate({ verification_status: 'VERIFIED' })}
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

      {/* ── MODAL: Activate Pharmacy Confirmation Modal ── */}
      {showActivateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl border border-[#1A1F36]/10 space-y-4">
            <div className="flex items-center gap-2 text-emerald-600 pb-2 border-b border-[#1A1F36]/10">
              <PlayCircle className="h-5 w-5" />
              <h3 className="text-base font-black text-[#1A1F36]">Activate Pharmacy Partner?</h3>
            </div>

            <p className="text-xs font-semibold text-[#8896A4]">
              Activating <strong className="text-[#1A1F36]">{pharmacy.name}</strong> enables its partner portal and allows 8LIV administrators to assign confirmed prescription fulfillment orders to this pharmacy.
            </p>

            <div className="flex justify-end gap-2.5 pt-3 border-t border-[#1A1F36]/10">
              <button
                onClick={() => setShowActivateModal(false)}
                className="rounded-xl border border-[#1A1F36]/15 px-4 py-2 text-xs font-black text-[#40516A]"
              >
                Cancel
              </button>
              <button
                onClick={() => handleStatusUpdate({ status: 'ACTIVE' })}
                disabled={actionLoading}
                className="rounded-xl bg-[#1A1F36] px-5 py-2 text-xs font-black text-white hover:bg-[#2A314E] disabled:opacity-50"
              >
                Confirm Activation
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL: Suspend Pharmacy Modal ── */}
      {showSuspendModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl border border-[#1A1F36]/10 space-y-4">
            <div className="flex items-center gap-2 text-red-600 pb-2 border-b border-[#1A1F36]/10">
              <ShieldAlert className="h-5 w-5" />
              <h3 className="text-base font-black text-[#1A1F36]">Suspend Partner Pharmacy</h3>
            </div>

            <p className="text-xs font-semibold text-[#8896A4]">
              Suspending <strong className="text-[#1A1F36]">{pharmacy.name}</strong> immediately revokes its fulfillment eligibility and pauses portal operations. Existing historical orders will be preserved.
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
                onClick={() => setShowSuspendModal(false)}
                className="rounded-xl border border-[#1A1F36]/15 px-4 py-2 text-xs font-black text-[#40516A]"
              >
                Cancel
              </button>
              <button
                onClick={() =>
                  handleStatusUpdate({
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
