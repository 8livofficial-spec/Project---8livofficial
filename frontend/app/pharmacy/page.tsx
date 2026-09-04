'use client'

import { useEffect, useState, useMemo } from 'react'
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
} from 'lucide-react'
import { authedFetch } from '@/lib/apiClient'

type PharmacyOrder = {
  id: string
  apollo_order_reference?: string | null
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
  const [orders, setOrders] = useState<PharmacyOrder[]>([])
  const [pharmacy, setPharmacy] = useState<PharmacyInfo | null>(null)
  const [activeTab, setActiveTab] = useState<TabType>('ALL')
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const fetchOrders = async () => {
    setLoading(true)
    setError('')
    try {
      const res = await authedFetch('/api/pharmacy/orders')
      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || 'Failed to load pharmacy fulfillment orders.')
      }
      setOrders(data.orders || [])
      if (data.pharmacy) {
        setPharmacy(data.pharmacy)
      }
    } catch (err: any) {
      setError(err.message || 'Unable to connect to pharmacy fulfillment service.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchOrders()
  }, [])

  // Filter orders by tab and search
  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      const status = (order.status || '').toUpperCase()

      // Tab match
      let tabMatch = true
      if (activeTab === 'NEW') {
        tabMatch = ['RECEIVED', 'PENDING_ADMIN_REVIEW'].includes(status)
      } else if (activeTab === 'AWAITING_ACK') {
        tabMatch = status === 'RECEIVED' || status === 'PENDING_ADMIN_REVIEW'
      } else if (activeTab === 'AWAITING_STOCK') {
        tabMatch = status === 'ACKNOWLEDGED'
      } else if (activeTab === 'PREPARING') {
        tabMatch = ['STOCK_CONFIRMED', 'PREPARING', 'PACKED'].includes(status)
      } else if (activeTab === 'DISPATCHED') {
        tabMatch = ['DISPATCHED', 'SHIPPED', 'OUT_FOR_DELIVERY'].includes(status)
      } else if (activeTab === 'DELIVERED') {
        tabMatch = status === 'DELIVERED'
      } else if (activeTab === 'EXCEPTIONS') {
        tabMatch = ['CLARIFICATION_REQUIRED', 'UNABLE_TO_FULFILL', 'CANCELLED'].includes(status)
      }

      if (!tabMatch) return false

      // Search match
      if (search.trim()) {
        const term = search.toLowerCase()
        const ref = (order.apollo_order_reference || '').toLowerCase()
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
      if (['RECEIVED', 'PENDING_ADMIN_REVIEW'].includes(s)) {
        map.NEW++
        map.AWAITING_ACK++
      } else if (s === 'ACKNOWLEDGED') {
        map.AWAITING_STOCK++
      } else if (['STOCK_CONFIRMED', 'PREPARING', 'PACKED'].includes(s)) {
        map.PREPARING++
      } else if (['DISPATCHED', 'SHIPPED', 'OUT_FOR_DELIVERY'].includes(s)) {
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
      case 'PENDING_ADMIN_REVIEW':
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
            onClick={fetchOrders}
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
                    const orderRef =
                      order.apollo_order_reference || `8LIV-${order.id.slice(0, 8).toUpperCase()}`

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
