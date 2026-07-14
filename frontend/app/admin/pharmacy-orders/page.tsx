'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Package, Search } from 'lucide-react'
import { authedFetch } from '@/lib/apiClient'

const statusTabs = ['PENDING_ADMIN_REVIEW', 'UNDER_REVIEW', 'READY_TO_PLACE', 'ORDER_PLACED_WITH_APOLLO', 'CONFIRMED_BY_APOLLO', 'PARTIALLY_AVAILABLE', 'UNAVAILABLE', 'PACKED', 'SHIPPED', 'OUT_FOR_DELIVERY', 'DELIVERED', 'CANCELLED']

export default function AdminPharmacyOrdersPage() {
  const [orders, setOrders] = useState<any[]>([])
  const [status, setStatus] = useState('')
  const [search, setSearch] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    const params = new URLSearchParams()
    if (status) params.set('status', status)
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
        <div><p className="text-xs font-black uppercase tracking-widest text-[#C4622D]"><Package className="mr-2 inline h-4 w-4" />Prescription Fulfilment</p><h1 className="mt-2 text-3xl font-black">Apollo Medicine Orders</h1></div>
        <div className="flex flex-col gap-3 rounded-xl bg-white p-4 shadow-sm md:flex-row">
          <label className="flex flex-1 items-center gap-2 rounded-lg border border-[#1A1F36]/10 px-3"><Search className="h-4 w-4 text-[#8896A4]" /><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Apollo reference or tracking number" className="w-full py-3 text-sm font-semibold outline-none" /></label>
          <select value={status} onChange={(e) => setStatus(e.target.value)} className="rounded-lg border border-[#1A1F36]/10 px-3 py-3 text-sm font-bold"><option value="">All fulfilment queues</option>{statusTabs.map((item) => <option key={item}>{item}</option>)}</select>
        </div>
        {error && <p className="rounded-lg bg-red-50 p-3 text-sm font-bold text-red-700">{error}</p>}
        <div className="grid gap-4">
          {orders.map((order) => (
            <Link key={order.id} href={`/admin/pharmacy-orders/${order.id}`} className="rounded-xl bg-white p-5 shadow-sm transition hover:shadow-md">
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div><p className="text-xs font-black uppercase tracking-widest text-[#C4622D]">{order.prescriptions?.prescription_number || order.prescription_id}</p><h2 className="mt-1 text-xl font-black">{order.status}</h2></div>
                <div className="grid gap-2 text-sm font-bold md:grid-cols-3">
                  <span>Apollo: {order.apollo_order_reference || '-'}</span>
                  <span>Courier: {order.courier_name || '-'}</span>
                  <span>Tracking: {order.tracking_number || '-'}</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </main>
  )
}
