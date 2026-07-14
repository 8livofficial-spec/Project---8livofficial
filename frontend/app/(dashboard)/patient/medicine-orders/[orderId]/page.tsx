'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { Truck } from 'lucide-react'
import { authedFetch } from '@/lib/apiClient'

export default function PatientMedicineOrderDetailPage() {
  const params = useParams<{ orderId: string }>()
  const [order, setOrder] = useState<any>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    authedFetch(`/api/patient/pharmacy-orders/${params.orderId}`)
      .then(async (res) => {
        const payload = await res.json()
        if (!res.ok) throw new Error(payload.error || 'Unable to load order.')
        setOrder(payload.order)
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Unable to load order.'))
  }, [params.orderId])

  if (!order) return <div className="space-y-4 text-[#1A1F36]">{error || 'Loading order...'}</div>

  return (
    <div className="space-y-6 text-[#1A1F36]">
      {error && <p className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-700">{error}</p>}
      <div className="dash-card p-6"><p className="text-xs font-black uppercase tracking-wider text-[#C4622D]">Apollo Pharmacy</p><h2 className="mt-1 text-xl font-black">{order.status.replaceAll('_', ' ')}</h2></div>
      <div className="dash-card p-6">
        <h3 className="mb-4 text-sm font-black uppercase tracking-widest text-[#8896A4]"><Truck className="mr-2 inline h-4 w-4" />Delivery timeline</h3>
        {(order.pharmacy_order_status_history || []).map((item: any) => <p key={item.id} className="mb-2 text-sm font-bold">{item.new_status.replaceAll('_', ' ')} <span className="text-[#8896A4]">{new Date(item.created_at).toLocaleString()}</span></p>)}
      </div>
      <div className="dash-card p-6">
        <Meta label="Expected delivery" value={order.estimated_delivery_at ? new Date(order.estimated_delivery_at).toLocaleString() : 'To be updated'} />
        <Meta label="Courier" value={order.courier_name || '-'} />
        <Meta label="Tracking number" value={order.tracking_number || '-'} />
        <Meta label="Support" value="Contact 8liv support for fulfilment questions." />
      </div>
    </div>
  )
}

function Meta({ label, value }: { label: string; value: string }) {
  return <div className="mb-3"><p className="text-[10px] font-black uppercase tracking-wider text-[#8896A4]">{label}</p><p className="mt-1 font-bold">{value}</p></div>
}
