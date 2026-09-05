'use client'

import { useEffect, useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  Package,
  Search,
  CheckCircle2,
  Clock,
  Truck,
  AlertTriangle,
  Building2,
  RefreshCw,
  ExternalLink,
  ShieldCheck,
  FileText,
  ArrowRight,
  LogOut,
} from 'lucide-react'
import { authedFetch } from '@/lib/apiClient'
import { supabase } from '@/lib/supabaseClient'

type PharmacyOrder = {
  id: string
  status: string
  created_at: string
  updated_at: string
  dispatched_at?: string | null
  delivered_at?: string | null
  dispatch_courier_name?: string | null
  dispatch_tracking_number?: string | null
  tracking_number?: string | null
  clarification_notes?: string | null
  unable_to_fulfill_reason?: string | null
  delivery_address_snapshot?: any
  patient_phone_snapshot?: string | null
  prescriptions?: {
    prescription_number: string
    issued_at?: string
    valid_until?: string
    prescription_items?: any[]
  }
}

type PharmacyInfo = {
  id: string
  name: string
  verification_status: string
  status: string
}

type TabType =
  | 'ALL'
  | 'NEW'
  | 'AWAITING_ACK'
  | 'AWAITING_STOCK'
  | 'PREPARING'
  | 'DISPATCHED'
  | 'DELIVERED'
  | 'EXCEPTIONS'

export default function PharmacyPortalPage() {
  const router = useRouter()
  const [orders, setOrders] = useState<PharmacyOrder[]>([])
  const [pharmacy, setPharmacy] = useState<any>(null)
  const [activeTab, setActiveTab] = useState<TabType>('ALL')
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    document.cookie = 'user_role=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT'
    router.push('/login?role=pharmacy')
  }

  const fetchPharmacyState = async () => {
    setLoading(true)
    setError('')
    try {
      // 1. Fetch pharmacy compliance status from onboarding endpoint (allowed for PENDING & UNDER_REVIEW)
      const onbRes = await authedFetch('/api/pharmacy/onboarding')
      const onbData = await onbRes.json()
      
      if (onbRes.ok && onbData.pharmacy) {
        setPharmacy(onbData.pharmacy)

        // If verified and active, fetch fulfillment orders
        if (onbData.pharmacy.verification_status === 'VERIFIED' && onbData.pharmacy.status === 'ACTIVE') {
          const ordersRes = await authedFetch('/api/pharmacy/orders')
          const ordersData = await ordersRes.json()
          if (ordersRes.ok) {
            setOrders(ordersData.orders || [])
          } else {
            setError(ordersData.error || 'Failed to load fulfillment orders.')
          }
        }
      } else {
        // Fallback: try orders endpoint
        const res = await authedFetch('/api/pharmacy/orders')
        const data = await res.json()
        if (res.ok) {
          setOrders(data.orders || [])
          if (data.pharmacy) setPharmacy(data.pharmacy)
        } else {
          setError(data.error || 'Failed to load pharmacy account.')
        }
      }
    } catch (err: any) {
      setError(err.message || 'Unable to connect to pharmacy fulfillment service.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchPharmacyState()
  }, [])

  // Filter orders by tab and search
  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      const status = (order.status || '').toUpperCase()

      // Tab match
      let tabMatch = true
      if (activeTab === 'NEW') {
        tabMatch = status === 'RECEIVED'
      } else if (activeTab === 'AWAITING_ACK') {
        tabMatch = status === 'RECEIVED'
      } else if (activeTab === 'AWAITING_STOCK') {
        tabMatch = status === 'ACKNOWLEDGED'
      } else if (activeTab === 'PREPARING') {
        tabMatch = ['STOCK_CONFIRMED', 'PREPARING'].includes(status)
      } else if (activeTab === 'DISPATCHED') {
        tabMatch = status === 'DISPATCHED'
      } else if (activeTab === 'DELIVERED') {
        tabMatch = status === 'DELIVERED'
      } else if (activeTab === 'EXCEPTIONS') {
        tabMatch = ['CLARIFICATION_REQUIRED', 'UNABLE_TO_FULFILL', 'CANCELLED'].includes(status)
      }

      if (!tabMatch) return false

      // Search match
      if (search.trim()) {
        const term = search.toLowerCase()
        const ref = `8liv-po-${order.id.slice(0, 8)}`.toLowerCase()
        const rxNum = (order.prescriptions?.prescription_number || '').toLowerCase()
        const trk = (order.dispatch_tracking_number || order.tracking_number || '').toLowerCase()
        const patientName = String(order.delivery_address_snapshot?.patient_name || '').toLowerCase()
        return ref.includes(term) || rxNum.includes(term) || trk.includes(term) || patientName.includes(term)
      }

      return true
    })
  }, [orders, activeTab, search])

  // Status counts for tab badges
  const counts = useMemo(() => {
    const map = {
      ALL: orders.length,
      NEW: 0,
      AWAITING_ACK: 0,
      AWAITING_STOCK: 0,
      PREPARING: 0,
      DISPATCHED: 0,
      DELIVERED: 0,
      EXCEPTIONS: 0,
    }
    for (const o of orders) {
      const s = (o.status || '').toUpperCase()
      if (s === 'RECEIVED') {
        map.NEW++
        map.AWAITING_ACK++
      } else if (s === 'ACKNOWLEDGED') {
        map.AWAITING_STOCK++
      } else if (['STOCK_CONFIRMED', 'PREPARING'].includes(s)) {
        map.PREPARING++
      } else if (s === 'DISPATCHED') {
        map.DISPATCHED++
      } else if (s === 'DELIVERED') {
        map.DELIVERED++
      } else if (['CLARIFICATION_REQUIRED', 'UNABLE_TO_FULFILL', 'CANCELLED'].includes(s)) {
        map.EXCEPTIONS++
      }
    }
    return map
  }, [orders])

  const getStatusBadge = (status: string) => {
    const s = (status || '').toUpperCase()
    switch (s) {
      case 'RECEIVED':
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-2.5 py-1 text-xs font-bold text-blue-700">
            <span className="h-1.5 w-1.5 rounded-full bg-blue-600 animate-pulse" />
            New / Received
          </span>
        )
      case 'ACKNOWLEDGED':
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-bold text-amber-700">
            <Clock className="h-3 w-3" />
            Acknowledged
          </span>
        )
      case 'STOCK_CONFIRMED':
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-indigo-50 px-2.5 py-1 text-xs font-bold text-indigo-700">
            <CheckCircle2 className="h-3 w-3" />
            Stock Confirmed
          </span>
        )
      case 'PREPARING':
      case 'PACKED':
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-purple-50 px-2.5 py-1 text-xs font-bold text-purple-700">
            <Package className="h-3 w-3" />
            Preparing
          </span>
        )
      case 'DISPATCHED':
      case 'SHIPPED':
      case 'OUT_FOR_DELIVERY':
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-cyan-50 px-2.5 py-1 text-xs font-bold text-cyan-700">
            <Truck className="h-3 w-3" />
            Dispatched
          </span>
        )
      case 'DELIVERED':
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700">
            <CheckCircle2 className="h-3 w-3" />
            Delivered
          </span>
        )
      case 'CLARIFICATION_REQUIRED':
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-2.5 py-1 text-xs font-bold text-amber-800">
            <AlertTriangle className="h-3 w-3" />
            Clarification Required
          </span>
        )
      case 'UNABLE_TO_FULFILL':
      case 'CANCELLED':
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-50 px-2.5 py-1 text-xs font-bold text-rose-700">
            <AlertTriangle className="h-3 w-3" />
            {s.replace(/_/g, ' ')}
          </span>
        )
      default:
        return (
          <span className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-1 text-xs font-bold text-gray-700">
            {s}
          </span>
        )
    }
  }

  const isVerifiedActive = pharmacy?.verification_status === 'VERIFIED' && pharmacy?.status === 'ACTIVE'

  // Loading state
  if (loading && !pharmacy) {
    return (
      <main className="min-h-screen bg-[#F5F0EB] flex flex-col items-center justify-center p-6 text-[#1A1F36]">
        <RefreshCw className="h-8 w-8 animate-spin text-[#C4622D]" />
        <p className="mt-3 text-sm font-bold text-[#1A1F36]">Loading partner pharmacy account...</p>
      </main>
    )
  }

  // Awaiting Admin Approval / Regulatory Onboarding screen
  if (pharmacy && !isVerifiedActive) {
    const isUnderReview = pharmacy.verification_status === 'UNDER_REVIEW'
    const isRejected = pharmacy.verification_status === 'REJECTED'
    const isVerifiedInactive = pharmacy.verification_status === 'VERIFIED' && pharmacy.status !== 'ACTIVE'

    return (
      <main className="min-h-screen bg-[#F5F0EB] p-4 text-[#1A1F36] sm:p-6 lg:p-8">
        <div className="mx-auto max-w-4xl space-y-6">
          {/* Header Bar */}
          <div className="rounded-2xl border border-[#1A1F36]/10 bg-white p-6 shadow-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#1A1F36] text-white">
                <Building2 className="h-6 w-6 text-[#C4622D]" />
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-[#C4622D]">8LIV Partner Pharmacy Network</p>
                <h1 className="text-xl font-black text-[#1A1F36]">{pharmacy.name}</h1>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className={`rounded-full px-3 py-1 text-xs font-black uppercase tracking-wider ${
                isUnderReview ? 'bg-amber-100 text-amber-900 border border-amber-300' :
                isRejected ? 'bg-rose-100 text-rose-800 border border-rose-300' :
                isVerifiedInactive ? 'bg-blue-100 text-blue-800 border border-blue-300' :
                'bg-zinc-100 text-zinc-700 border border-zinc-200'
              }`}>
                {pharmacy.verification_status}
              </span>
              <button
                onClick={handleSignOut}
                className="inline-flex items-center gap-1.5 rounded-xl border border-[#1A1F36]/10 px-3.5 py-2 text-xs font-black text-[#8896A4] hover:bg-[#F5F0EB] hover:text-[#1A1F36] transition-colors"
              >
                <LogOut className="h-3.5 w-3.5" /> Sign Out
              </button>
            </div>
          </div>

          {/* Pending State Hero Card */}
          <div className="rounded-3xl border border-[#1A1F36]/10 bg-white p-8 shadow-sm space-y-6">
            {isUnderReview ? (
              <div className="space-y-6">
                <div className="flex items-start gap-4">
                  <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-amber-50 text-amber-700 border border-amber-200">
                    <Clock className="h-7 w-7 animate-pulse" />
                  </div>
                  <div>
                    <span className="rounded-full bg-amber-100 px-3 py-1 text-[11px] font-black uppercase tracking-wider text-amber-900">
                      Under Admin Review
                    </span>
                    <h2 className="mt-2 text-2xl font-black text-[#1A1F36]">
                      Application Awaiting 8LIV Admin Approval
                    </h2>
                    <p className="mt-1 text-sm text-[#40516A] leading-relaxed">
                      Your pharmacy onboarding details and Form 20B/21B drug license credentials have been submitted.
                      The 8LIV Administrator team is currently reviewing and verifying your credentials.
                    </p>
                  </div>
                </div>

                <div className="rounded-2xl border border-amber-200 bg-amber-50/60 p-5 text-xs text-amber-900 leading-relaxed space-y-2">
                  <p className="font-bold flex items-center gap-1.5">
                    <ShieldCheck className="h-4 w-4 text-amber-700" />
                    Fulfillment Activation Notice:
                  </p>
                  <p>
                    Once an 8LIV Admin approves and activates your account, this dashboard will automatically unlock to assign and process patient prescription orders. You will also receive an email notification when your account goes live.
                  </p>
                </div>

                {/* Submitted Details Snapshot */}
                <div className="rounded-2xl border border-[#1A1F36]/10 bg-[#FAF7F5] p-5 space-y-3">
                  <p className="text-[10px] font-black uppercase tracking-widest text-[#8896A4]">
                    Submitted Regulatory Credentials
                  </p>
                  <div className="grid gap-3 sm:grid-cols-2 text-xs">
                    <div>
                      <p className="font-bold text-[#8896A4]">Legal Entity Name</p>
                      <p className="font-black text-[#1A1F36] mt-0.5">{pharmacy.legal_entity_name || pharmacy.name}</p>
                    </div>
                    <div>
                      <p className="font-bold text-[#8896A4]">Drug License Number</p>
                      <p className="font-black text-[#1A1F36] mt-0.5">{pharmacy.drug_license_number || 'Under Review'}</p>
                    </div>
                    <div>
                      <p className="font-bold text-[#8896A4]">License Type</p>
                      <p className="font-black text-[#1A1F36] mt-0.5">{pharmacy.drug_license_type || 'Form 20B/21B'}</p>
                    </div>
                    <div>
                      <p className="font-bold text-[#8896A4]">Registered Pharmacist</p>
                      <p className="font-black text-[#1A1F36] mt-0.5">{pharmacy.pharmacist_name || 'Designated Pharmacist'}</p>
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-3 pt-2">
                  <Link
                    href="/pharmacy/onboarding"
                    className="inline-flex items-center gap-2 rounded-xl bg-[#1A1F36] px-5 py-3 text-xs font-black text-white hover:bg-[#2A314E] transition-all shadow-sm"
                  >
                    <FileText className="h-4 w-4" />
                    Update Submitted Regulatory Details <ArrowRight className="h-4 w-4" />
                  </Link>

                  <button
                    onClick={fetchPharmacyState}
                    disabled={loading}
                    className="inline-flex items-center gap-2 rounded-xl border border-[#1A1F36]/15 bg-white px-5 py-3 text-xs font-black text-[#1A1F36] hover:bg-[#F5F0EB] transition-all disabled:opacity-50"
                  >
                    <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
                    Check Status / Refresh
                  </button>
                </div>
              </div>
            ) : isRejected ? (
              <div className="space-y-6">
                <div className="flex items-start gap-4">
                  <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-rose-50 text-rose-700 border border-rose-200">
                    <AlertTriangle className="h-7 w-7" />
                  </div>
                  <div>
                    <span className="rounded-full bg-rose-100 px-3 py-1 text-[11px] font-black uppercase tracking-wider text-rose-900">
                      Verification Rejected
                    </span>
                    <h2 className="mt-2 text-2xl font-black text-[#1A1F36]">
                      License Credentials Need Revision
                    </h2>
                    <p className="mt-1 text-sm text-[#40516A] leading-relaxed">
                      The 8LIV Admin team was unable to verify your submitted drug license or credentials.
                      Please review the feedback and submit updated documents.
                    </p>
                  </div>
                </div>

                <Link
                  href="/pharmacy/onboarding"
                  className="inline-flex items-center gap-2 rounded-xl bg-[#1A1F36] px-6 py-3.5 text-sm font-black text-white hover:bg-[#2A314E] transition-all shadow-sm"
                >
                  <FileText className="h-4 w-4" />
                  Resubmit Regulatory Details <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            ) : isVerifiedInactive ? (
              <div className="space-y-6">
                <div className="flex items-start gap-4">
                  <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-blue-700 border border-blue-200">
                    <ShieldCheck className="h-7 w-7" />
                  </div>
                  <div>
                    <span className="rounded-full bg-blue-100 px-3 py-1 text-[11px] font-black uppercase tracking-wider text-blue-900">
                      Verified — Awaiting Network Activation
                    </span>
                    <h2 className="mt-2 text-2xl font-black text-[#1A1F36]">
                      Credentials Verified by Administrator
                    </h2>
                    <p className="mt-1 text-sm text-[#40516A] leading-relaxed">
                      Your pharmacy credentials have been verified by 8LIV Admin. The administration team will activate your operational routing shortly.
                    </p>
                  </div>
                </div>

                <button
                  onClick={fetchPharmacyState}
                  disabled={loading}
                  className="inline-flex items-center gap-2 rounded-xl bg-[#1A1F36] px-5 py-3 text-xs font-black text-white hover:bg-[#2A314E] transition-all"
                >
                  <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
                  Refresh Status
                </button>
              </div>
            ) : (
              // Default PENDING state
              <div className="space-y-6">
                <div className="flex items-start gap-4">
                  <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-amber-50 text-amber-700 border border-amber-200">
                    <Clock className="h-7 w-7" />
                  </div>
                  <div>
                    <span className="rounded-full bg-amber-100 px-3 py-1 text-[11px] font-black uppercase tracking-wider text-amber-900">
                      Step 2: Regulatory Onboarding Required
                    </span>
                    <h2 className="mt-2 text-2xl font-black text-[#1A1F36]">
                      Submit Your Drug License for Admin Review
                    </h2>
                    <p className="mt-1 text-sm text-[#40516A] leading-relaxed">
                      Your invitation has been accepted. Under Indian healthcare compliance laws, partner pharmacies must submit valid Form 20B/21B retail/wholesale drug license details and registered pharmacist information before an 8LIV Administrator can approve your fulfillment portal.
                    </p>
                  </div>
                </div>

                <div className="rounded-2xl border border-[#1A1F36]/10 bg-[#FAF7F5] p-5 space-y-2 text-xs text-[#40516A]">
                  <p className="font-bold text-[#1A1F36]">Required Onboarding Documents:</p>
                  <ul className="list-disc pl-5 space-y-1">
                    <li>Drug License Number (Form 20B / Form 21B)</li>
                    <li>State Pharmacy Council Registered Pharmacist Name & Number</li>
                    <li>Valid Drug License Expiry Date</li>
                    <li>Registered Physical Pharmacy Premises Address</li>
                  </ul>
                </div>

                <div className="flex flex-wrap items-center gap-3 pt-2">
                  <Link
                    href="/pharmacy/onboarding"
                    className="inline-flex items-center gap-2 rounded-xl bg-[#1A1F36] px-6 py-3.5 text-sm font-black text-white hover:bg-[#2A314E] transition-all shadow-sm"
                  >
                    <FileText className="h-4 w-4" />
                    Submit Regulatory Onboarding Details <ArrowRight className="h-4 w-4" />
                  </Link>

                  <button
                    onClick={fetchPharmacyState}
                    disabled={loading}
                    className="inline-flex items-center gap-2 rounded-xl border border-[#1A1F36]/15 bg-white px-5 py-3 text-xs font-black text-[#1A1F36] hover:bg-[#F5F0EB] transition-all"
                  >
                    <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
                    Refresh
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-[#F5F0EB] p-4 text-[#1A1F36] sm:p-6 lg:p-8">
      <div className="mx-auto max-w-7xl space-y-6">
        {/* Top Header Card */}
        <div className="rounded-2xl border border-[#1A1F36]/10 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#1A1F36] text-white">
                  <Building2 className="h-5 w-5" />
                </div>
                <div>
                  <h1 className="text-xl font-black tracking-tight sm:text-2xl">
                    Partner Pharmacy Fulfillment
                  </h1>
                  <p className="text-xs font-semibold text-[#8896A4]">
                    Operational portal for prescription verification, preparation, and dispatch
                  </p>
                </div>
              </div>
            </div>

            {pharmacy && (
              <div className="flex flex-wrap items-center gap-2">
                <div className="rounded-xl border border-[#1A1F36]/10 bg-[#F5F0EB]/60 px-3.5 py-2">
                  <p className="text-xs font-bold text-[#8896A4]">Pharmacy Partner</p>
                  <p className="text-sm font-black text-[#1A1F36]">{pharmacy.name}</p>
                </div>
                <div className="flex items-center gap-1.5 rounded-xl bg-emerald-50 border border-emerald-200 px-3 py-2 text-xs font-black text-emerald-800">
                  <ShieldCheck className="h-4 w-4 text-emerald-600" />
                  {pharmacy.verification_status} • {pharmacy.status}
                </div>
                <button
                  onClick={handleSignOut}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-[#1A1F36]/10 px-3 py-2 text-xs font-black text-[#8896A4] hover:bg-[#F5F0EB] hover:text-[#1A1F36] transition-colors ml-1"
                >
                  <LogOut className="h-3.5 w-3.5" /> Sign Out
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-800 shadow-sm">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 shrink-0 text-red-600" />
              <div>
                <p className="font-bold">Access or Operation Notice</p>
                <p className="mt-1">{error}</p>
                <p className="mt-2 text-xs text-red-600">
                  Note: Partner pharmacies must be in VERIFIED and ACTIVE status to process orders.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Search & Refresh Controls */}
        <div className="flex flex-col gap-3 rounded-xl bg-white p-4 shadow-sm sm:flex-row sm:items-center">
          <label className="flex flex-1 items-center gap-2.5 rounded-lg border border-[#1A1F36]/10 px-3.5 py-2">
            <Search className="h-4 w-4 text-[#8896A4]" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by order ref, prescription number, tracking ID, or patient name..."
              className="w-full bg-transparent text-sm font-medium outline-none placeholder:text-[#8896A4]"
            />
          </label>
          <button
            onClick={fetchPharmacyState}
            disabled={loading}
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-[#1A1F36]/10 bg-[#F5F0EB]/50 px-4 py-2.5 text-xs font-black uppercase tracking-wider text-[#1A1F36] transition-colors hover:bg-[#F5F0EB] disabled:opacity-50"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>

        {/* Operational Status Tabs */}
        <div className="flex overflow-x-auto gap-2 border-b border-[#1A1F36]/10 pb-2 scrollbar-none">
          {[
            { id: 'ALL', label: 'All Orders', count: counts.ALL },
            { id: 'NEW', label: 'New Orders', count: counts.NEW },
            { id: 'AWAITING_STOCK', label: 'Awaiting Stock', count: counts.AWAITING_STOCK },
            { id: 'PREPARING', label: 'Preparing', count: counts.PREPARING },
            { id: 'DISPATCHED', label: 'Dispatched', count: counts.DISPATCHED },
            { id: 'DELIVERED', label: 'Delivered', count: counts.DELIVERED },
            { id: 'EXCEPTIONS', label: 'Exceptions', count: counts.EXCEPTIONS },
          ].map((tab) => {
            const isActive = activeTab === tab.id
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as TabType)}
                className={`flex shrink-0 items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-black transition-all ${
                  isActive
                    ? 'bg-[#1A1F36] text-white shadow-sm'
                    : 'bg-white text-[#40516A] hover:bg-[#F5F0EB] border border-[#1A1F36]/5'
                }`}
              >
                <span>{tab.label}</span>
                <span
                  className={`rounded-full px-2 py-0.5 text-[11px] font-black ${
                    isActive ? 'bg-white/20 text-white' : 'bg-[#F5F0EB] text-[#1A1F36]'
                  }`}
                >
                  {tab.count}
                </span>
              </button>
            )
          })}
        </div>

        {/* Orders Table */}
        <div className="overflow-hidden rounded-2xl border border-[#1A1F36]/10 bg-white shadow-sm">
          {loading ? (
            <div className="flex flex-col items-center justify-center p-12 text-center">
              <RefreshCw className="h-8 w-8 animate-spin text-[#C4622D]" />
              <p className="mt-3 text-sm font-bold text-[#1A1F36]">Loading fulfillment orders...</p>
            </div>
          ) : filteredOrders.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-12 text-center">
              <Package className="h-10 w-10 text-[#8896A4]/60" />
              <p className="mt-3 text-base font-bold text-[#1A1F36]">No orders found</p>
              <p className="mt-1 text-xs font-semibold text-[#8896A4]">
                There are no orders matching this filter right now.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-[#1A1F36]/10 bg-[#FAF7F5] text-xs font-black uppercase tracking-wider text-[#8896A4]">
                  <tr>
                    <th className="p-4 pl-6">Order Ref / Rx</th>
                    <th className="p-4">Patient Destination</th>
                    <th className="p-4">Medications</th>
                    <th className="p-4">Status</th>
                    <th className="p-4">Timeline</th>
                    <th className="p-4 pr-6 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1A1F36]/5">
                  {filteredOrders.map((order) => {
                    const items = order.prescriptions?.prescription_items || []
                    const patientName = order.delivery_address_snapshot?.patient_name || 'Patient'
                    const city =
                      order.delivery_address_snapshot?.city ||
                      order.delivery_address_snapshot?.state ||
                      'Standard Delivery'
                    const orderRef = `8LIV-PO-${order.id.slice(0, 8).toUpperCase()}`

                    return (
                      <tr key={order.id} className="transition-colors hover:bg-[#FAF7F5]/60">
                        <td className="p-4 pl-6">
                          <Link
                            href={`/pharmacy/orders/${order.id}`}
                            className="font-black text-[#C4622D] hover:underline inline-flex items-center gap-1"
                          >
                            {orderRef}
                            <ExternalLink className="h-3 w-3" />
                          </Link>
                          <p className="mt-0.5 text-xs font-semibold text-[#8896A4]">
                            Rx: {order.prescriptions?.prescription_number || 'N/A'}
                          </p>
                        </td>
                        <td className="p-4">
                          <p className="font-bold text-[#1A1F36]">{patientName}</p>
                          <p className="text-xs font-semibold text-[#8896A4]">{city}</p>
                        </td>
                        <td className="p-4">
                          <p className="font-bold text-[#1A1F36]">
                            {items.length} {items.length === 1 ? 'item' : 'items'}
                          </p>
                          <p className="text-xs font-semibold text-[#8896A4] truncate max-w-[200px]">
                            {items.map((i: any) => i.medicine_name).join(', ') || 'Prescribed therapy'}
                          </p>
                        </td>
                        <td className="p-4">{getStatusBadge(order.status)}</td>
                        <td className="p-4 text-xs font-medium text-[#8896A4]">
                          <p>
                            Ordered: {new Date(order.created_at).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })}
                          </p>
                          {order.dispatch_tracking_number && (
                            <p className="font-bold text-[#1A1F36]">
                              AWB: {order.dispatch_tracking_number}
                            </p>
                          )}
                        </td>
                        <td className="p-4 pr-6 text-right">
                          <Link
                            href={`/pharmacy/orders/${order.id}`}
                            className="inline-flex items-center gap-1.5 rounded-xl bg-[#1A1F36] px-3.5 py-2 text-xs font-black text-white shadow-sm transition-transform hover:scale-[1.02] active:scale-[0.98]"
                          >
                            Process Order
                          </Link>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </main>
  )
}
