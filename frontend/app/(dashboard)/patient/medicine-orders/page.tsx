'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Package, Truck } from 'lucide-react'
import { authedFetch } from '@/lib/apiClient'

export default function PatientMedicineOrdersPage() {
  const [orders, setOrders] = useState<any[]>([])
  const [error, setError] = useState('')

  useEffect(() => {
    authedFetch('/api/patient/pharmacy-orders')
      .then(async (res) => {
        const payload = await res.json()
        if (!res.ok) throw new Error(payload.error || 'Unable to load medicine orders.')
        setOrders(payload.orders || [])
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Unable to load medicine orders.'))
  }, [])

  return (
    <div className="space-y-6 text-[#1A1F36]">
      <div><h2 className="text-xl font-bold">My Medicine Orders</h2><p className="text-xs font-medium text-[#8896A4]">Track Apollo Pharmacy fulfilment and delivery updates.</p></div>
      {error && <p className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-700">{error}</p>}
      <div className="grid gap-4">
        {orders.length === 0 ? <div className="dash-card p-8 text-center"><Package className="mx-auto mb-3 h-10 w-10 text-[#8896A4]" /><h3 className="font-black">No medicine orders yet</h3><p className="mt-2 text-sm font-semibold text-[#8896A4]">Orders are created after your doctor signs a prescription.</p></div> : orders.map((order) => (
          <Link key={order.id} href={`/patient/medicine-orders/${order.id}`} className="dash-card block p-5">
            <p className="text-xs font-black uppercase tracking-wider text-[#C4622D]">{order.prescriptions?.prescription_number || order.id}</p>
            <h3 className="mt-1 text-lg font-black">{order.status.replaceAll('_', ' ')}</h3>
            <p className="mt-2 text-sm font-semibold text-[#40516A]">Fulfilment partner: Apollo Pharmacy</p>
            <div className="mt-4 grid gap-3 border-t border-[#1A1F36]/6 pt-4 text-sm sm:grid-cols-3">
              <Meta label="ETA" value={order.estimated_delivery_at ? new Date(order.estimated_delivery_at).toLocaleString() : 'To be updated'} />
              <Meta label="Courier" value={order.courier_name || '-'} />
              <Meta label="Tracking" value={order.tracking_number || '-'} />
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}

function Meta({ label, value }: { label: string; value: string }) {
  return <div><p className="text-[10px] font-black uppercase tracking-wider text-[#8896A4]">{label}</p><p className="mt-1 font-bold">{value}</p></div>
}
