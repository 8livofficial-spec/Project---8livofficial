'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import {
  Truck,
  Package,
  MapPin,
  ChevronRight,
  RefreshCw,
  Phone,
  CheckCircle2,
  Clock,
  ShieldCheck,
  Navigation,
} from 'lucide-react'
import { authedFetch } from '@/lib/apiClient'

type DriverOrder = {
  id: string
  order_reference: string
  status: string
  prescription_number?: string | null
  recipient_name: string
  phone?: string | null
  destination_address: string
  items_count: number
  items_summary: string
  shipped_at?: string | null
  delivered_at?: string | null
  map_urls: {
    navigationUrl: string
    searchUrl: string
  }
}

export default function DriverDashboardPage() {
  const [orders, setOrders] = useState<DriverOrder[]>([])
  const [filter, setFilter] = useState<'active' | 'completed'>('active')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const fetchOrders = async () => {
    setLoading(true)
    setError('')
    try {
      const res = await authedFetch(`/api/driver/orders?filter=${filter}`)
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to load deliveries.')
      setOrders(data.orders || [])
    } catch (err: any) {
      setError(err.message || 'Unable to connect to delivery queue.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchOrders()
  }, [filter])

  return (
    <main className="min-h-screen bg-[#F5F0EB] text-[#1A1F36]">
      {/* Mobile-Centric Container */}
      <div className="mx-auto max-w-lg min-h-screen flex flex-col bg-white shadow-xl sm:border-x border-[#1A1F36]/10">
        {/* App Bar */}
        <header className="sticky top-0 z-30 flex items-center justify-between border-b border-[#1A1F36]/10 bg-white/95 px-5 py-4 backdrop-blur-md">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#C4622D] text-white shadow-md">
              <Truck className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-black uppercase tracking-wider text-[#C4622D]">
                  8LIV In-House Fleet
                </span>
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              </div>
              <h1 className="text-base font-black text-[#1A1F36]">Rider Delivery Portal</h1>
            </div>
          </div>

          <button
            onClick={fetchOrders}
            disabled={loading}
            className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#FAF7F5] text-[#1A1F36] hover:bg-[#F5F0EB]"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin text-[#C4622D]' : ''}`} />
          </button>
        </header>

        {/* Filter Tabs */}
        <div className="border-b border-[#1A1F36]/10 bg-[#FAF7F5] p-3">
          <div className="grid grid-cols-2 gap-2 rounded-2xl bg-[#EFE9E3] p-1">
            <button
              onClick={() => setFilter('active')}
              className={`rounded-xl py-2 text-xs font-black transition-all ${
                filter === 'active'
                  ? 'bg-white text-[#1A1F36] shadow-sm'
                  : 'text-[#8896A4] hover:text-[#1A1F36]'
              }`}
            >
              Active Runs
            </button>
            <button
              onClick={() => setFilter('completed')}
              className={`rounded-xl py-2 text-xs font-black transition-all ${
                filter === 'completed'
                  ? 'bg-white text-[#1A1F36] shadow-sm'
                  : 'text-[#8896A4] hover:text-[#1A1F36]'
              }`}
            >
              Completed Deliveries
            </button>
          </div>
        </div>

        {/* Orders List Content */}
        <div className="flex-1 p-4 space-y-4">
          {error && (
            <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-xs font-bold text-red-700">
              {error}
            </div>
          )}

          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <RefreshCw className="h-8 w-8 animate-spin text-[#C4622D]" />
              <p className="mt-3 text-xs font-bold text-[#8896A4]">Fetching your delivery runs...</p>
            </div>
          ) : orders.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center px-4">
              <Package className="h-12 w-12 text-[#8896A4]/60 mb-3" />
              <h3 className="text-base font-black text-[#1A1F36]">No Deliveries in Queue</h3>
              <p className="mt-1 text-xs text-[#8896A4] max-w-xs">
                {filter === 'active'
                  ? 'No active packages currently assigned for dispatch. Check back once pharmacy confirms preparation.'
                  : 'No completed runs recorded yet for this shift.'}
              </p>
            </div>
          ) : (
            orders.map((order) => {
              const isDispatched = order.status === 'DISPATCHED'
              const isDelivered = order.status === 'DELIVERED'

              return (
                <div
                  key={order.id}
                  className="rounded-3xl border border-[#1A1F36]/10 bg-white p-5 shadow-sm space-y-3 transition-shadow hover:shadow-md"
                >
                  {/* Top Bar */}
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black tracking-wider text-[#C4622D]">
                      {order.order_reference}
                    </span>
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider ${
                        isDelivered
                          ? 'bg-emerald-100 text-emerald-800'
                          : isDispatched
                          ? 'bg-cyan-100 text-cyan-800 animate-pulse'
                          : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {isDelivered
                        ? 'Delivered'
                        : isDispatched
                        ? 'Out For Delivery'
                        : 'Ready for Pickup'}
                    </span>
                  </div>

                  {/* Recipient Info */}
                  <div>
                    <h3 className="text-base font-black text-[#1A1F36]">{order.recipient_name}</h3>
                    <p className="mt-0.5 text-xs text-[#8896A4] flex items-center gap-1.5">
                      <MapPin className="h-3.5 w-3.5 text-[#C4622D] shrink-0" />
                      <span className="line-clamp-2">{order.destination_address}</span>
                    </p>
                  </div>

                  {/* Package Items Snippet */}
                  <div className="rounded-2xl bg-[#FAF7F5] p-3 text-xs">
                    <p className="font-bold text-[#1A1F36]">
                      📦 Package: {order.items_count} prescribed item{order.items_count !== 1 ? 's' : ''}
                    </p>
                    <p className="mt-0.5 text-[11px] text-[#40516A] line-clamp-1">
                      {order.items_summary}
                    </p>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 pt-1">
                    <Link
                      href={`/driver/${order.id}`}
                      className="flex-1 flex items-center justify-center gap-2 rounded-2xl bg-[#1A1F36] px-4 py-3 text-xs font-black text-white shadow-sm transition-transform active:scale-95"
                    >
                      <span>
                        {isDelivered
                          ? 'View Delivery Proof'
                          : isDispatched
                          ? 'Open Navigation & OTP'
                          : 'Start Delivery Run'}
                      </span>
                      <ChevronRight className="h-4 w-4" />
                    </Link>

                    {order.phone && (
                      <a
                        href={`tel:${order.phone}`}
                        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-[#1A1F36]/15 bg-[#FAF7F5] text-[#1A1F36] hover:bg-[#F5F0EB]"
                        title="Call Recipient"
                      >
                        <Phone className="h-4 w-4" />
                      </a>
                    )}
                  </div>
                </div>
              )
            })
          )}
        </div>

        {/* Mobile Bottom Footer */}
        <footer className="sticky bottom-0 border-t border-[#1A1F36]/10 bg-white/95 px-5 py-3 backdrop-blur-md">
          <div className="flex items-center justify-between text-xs text-[#8896A4]">
            <span className="font-bold">8LIV In-House Cold-Chain Logistics</span>
            <span className="flex items-center gap-1 font-black text-emerald-600">
              <ShieldCheck className="h-3.5 w-3.5" /> OTP Protected
            </span>
          </div>
        </footer>
      </div>
    </main>
  )
}
