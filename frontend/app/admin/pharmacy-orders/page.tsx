'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Package, Search, Building2, ArrowLeft, ChevronRight } from 'lucide-react'
import { authedFetch } from '@/lib/apiClient'

const statusTabs = [
  'ALL',
  'PENDING_ASSIGNMENT',
  'RECEIVED',
  'ACKNOWLEDGED',
  'STOCK_CONFIRMED',
  'PREPARING',
  'DISPATCHED',
  'DELIVERED',
  'CLARIFICATION_REQUIRED',
  'UNABLE_TO_FULFILL',
  'CANCELLED',
]

export default function AdminPharmacyOrdersPage() {
  const [orders, setOrders] = useState<any[]>([])
  const [status, setStatus] = useState('')
  const [search, setSearch] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    const params = new URLSearchParams()
    if (status && status !== 'ALL') params.set('status', status)
    if (search) params.set('search', search)
    authedFetch(`/api/admin/pharmacy-orders?${params}`)
      .then(async (res) => {
        const payload = await res.json()
        if (!res.ok) throw new Error(payload.error || 'Unable to load orders.')
        setOrders(payload.orders || [])
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Unable to load orders.'))
  }, [status, search])

  return (
    <main className="min-h-screen bg-[#F5F0EB] p-6 text-[#1A1F36]">
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
              <span className="text-[#C4622D]">Pharmacy Orders</span>
            </div>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between pt-1">
            <div>
              <h1 className="text-2xl sm:text-3xl font-black text-[#1A1F36]">Partner Pharmacy Orders</h1>
              <p className="mt-1 text-xs sm:text-sm font-semibold text-[#8896A4]">
                Manage fulfillment assignments, track order dispatch, and monitor delivery progress.
              </p>
            </div>
            <Link
              href="/admin/pharmacy"
              className="inline-flex items-center gap-2 rounded-xl bg-[#1A1F36] px-4 py-2.5 text-xs font-black text-white hover:bg-[#2A314E] shadow-sm"
            >
              <Building2 className="h-4 w-4" /> Manage Partner Pharmacies
            </Link>
          </div>
        </div>

        <div className="flex flex-col gap-3 rounded-xl bg-white p-4 shadow-sm md:flex-row">
          <label className="flex flex-1 items-center gap-2 rounded-lg border border-[#1A1F36]/10 px-3">
            <Search className="h-4 w-4 text-[#8896A4]" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by tracking number or courier"
              className="w-full py-3 text-sm font-semibold outline-none"
            />
          </label>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="rounded-lg border border-[#1A1F36]/10 px-3 py-3 text-sm font-bold"
          >
            <option value="">All Fulfillment Queues</option>
            {statusTabs.filter(s => s !== 'ALL').map((item) => (
              <option key={item} value={item}>{item.replaceAll('_', ' ')}</option>
            ))}
          </select>
        </div>

        {error && <p className="rounded-lg bg-red-50 p-3 text-sm font-bold text-red-700">{error}</p>}

        <div className="grid gap-4">
          {orders.length === 0 ? (
            <div className="rounded-xl bg-white p-12 text-center shadow-sm">
              <Package className="mx-auto mb-3 h-10 w-10 text-[#8896A4]" />
              <p className="text-base font-bold text-[#1A1F36]">No fulfillment orders found in this queue</p>
            </div>
          ) : (
            orders.map((order) => {
              const pharmacy = order.partner_pharmacies
              const rx = order.prescriptions
              return (
                <Link
                  key={order.id}
                  href={`/admin/pharmacy-orders/${order.id}`}
                  className="rounded-xl bg-white p-5 shadow-sm transition hover:shadow-md block"
                >
                  <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <div>
                      <p className="text-xs font-black uppercase tracking-widest text-[#C4622D]">
                        {rx?.prescription_number || `8LIV-PO-${order.id.slice(0, 8).toUpperCase()}`}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <h2 className="text-xl font-black">{order.status.replaceAll('_', ' ')}</h2>
                        {order.status === 'PENDING_ASSIGNMENT' && (
                          <span className="rounded-full bg-amber-100 text-amber-800 text-[10px] font-black px-2.5 py-0.5 uppercase tracking-wider">
                            Requires Assignment
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="grid gap-2 text-sm font-bold sm:grid-cols-3">
                      <span>Pharmacy: {pharmacy?.name || (order.status === 'PENDING_ASSIGNMENT' ? 'Unassigned' : 'Pending')}</span>
                      <span>Courier: {order.courier_name || '-'}</span>
                      <span>Tracking: {order.tracking_number || '-'}</span>
                    </div>
                  </div>
                </Link>
              )
            })
          )}
        </div>
      </div>
    </main>
  )
}
