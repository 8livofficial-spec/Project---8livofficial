'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { Truck, Package, CheckCircle2 } from 'lucide-react'
import { authedFetch } from '@/lib/apiClient'

const STATUS_LABELS: Record<string, string> = {
  PENDING_ASSIGNMENT: 'Pending',
  RECEIVED: 'Order sent to pharmacy',
  ACKNOWLEDGED: 'Pharmacy received your order',
  STOCK_CONFIRMED: 'Pharmacy confirmed your order',
  PREPARING: 'Your medicine is being prepared',
  DISPATCHED: 'Your medicine is on the way',
  DELIVERED: 'Delivered',
  CLARIFICATION_REQUIRED: "Pharmacy has a question — we'll be in touch",
  UNABLE_TO_FULFILL: 'Pharmacy was unable to fulfill this order',
  CANCELLED: 'Order cancelled',
}

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

  const rx = order.prescriptions
  const items = rx?.prescription_items || []
  const addr = order.delivery_address_snapshot

  return (
    <div className="space-y-6 text-[#1A1F36]">
      {error && <p className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-700">{error}</p>}

      {/* Header Card */}
      <div className="dash-card p-6">
        <p className="text-xs font-black uppercase tracking-wider text-[#C4622D]">
          {rx?.prescription_number || `8LIV-PO-${order.id.slice(0, 8).toUpperCase()}`}
        </p>
        <div className="mt-1 flex items-center justify-between">
          <h2 className="text-xl font-black">{STATUS_LABELS[order.status] || order.status}</h2>
          <span className="rounded-full bg-[#1A1F36]/5 px-3 py-1 text-xs font-black text-[#C4622D]">
            8LIV Partner Pharmacy
          </span>
        </div>
      </div>

      {/* Delivery Address */}
      {addr && (
        <div className="dash-card p-6">
          <h3 className="mb-3 text-sm font-black uppercase tracking-widest text-[#8896A4]">Delivery Address</h3>
          <p className="text-sm font-bold text-[#1A1F36]">{addr.recipient_name}</p>
          <p className="text-xs font-semibold text-[#40516A] mt-1">{addr.line1}, {addr.line2 ? addr.line2 + ', ' : ''}{addr.city}, {addr.state} - {addr.pincode}</p>
          <p className="text-xs font-semibold text-[#8896A4] mt-1">Phone: {addr.phone}</p>
        </div>
      )}

      {/* Medicines in Order */}
      {items.length > 0 && (
        <div className="dash-card p-6">
          <h3 className="mb-4 text-sm font-black uppercase tracking-widest text-[#8896A4]">Medications</h3>
          <div className="grid gap-2">
            {items.map((item: any) => (
              <div key={item.id} className="rounded-lg border border-[#1A1F36]/8 p-3 flex justify-between items-center">
                <div>
                  <p className="font-bold text-sm text-[#1A1F36]">{item.medicine_name} <span className="text-xs text-[#8896A4]">({item.strength})</span></p>
                  <p className="text-xs text-[#40516A]">{item.dose} • {item.frequency} for {item.duration_value} {item.duration_unit.toLowerCase()}</p>
                </div>
                <span className="text-xs font-black bg-[#FAF7F5] px-2.5 py-1 rounded">Qty: {item.quantity}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Timeline */}
      <div className="dash-card p-6">
        <h3 className="mb-4 text-sm font-black uppercase tracking-widest text-[#8896A4]"><Truck className="mr-2 inline h-4 w-4" />Delivery Timeline</h3>
        <div className="space-y-3">
          {(order.pharmacy_order_status_history || []).map((item: any) => (
            <div key={item.id} className="flex items-start gap-3 border-l-2 border-[#C4622D] pl-3 py-1">
              <div>
                <p className="text-sm font-bold text-[#1A1F36]">{STATUS_LABELS[item.new_status] || item.new_status}</p>
                <p className="text-xs text-[#8896A4]">{new Date(item.created_at).toLocaleString()}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Logistics Details */}
      <div className="dash-card p-6">
        <Meta label="Courier" value={order.courier_name || '-'} />
        <Meta label="Tracking Number" value={order.tracking_number || '-'} />
        <Meta label="Support" value="Contact 8LIV care team for any fulfillment inquiries." />
      </div>
    </div>
  )
}

function Meta({ label, value }: { label: string; value: string }) {
  return <div className="mb-3"><p className="text-[10px] font-black uppercase tracking-wider text-[#8896A4]">{label}</p><p className="mt-1 font-bold">{value}</p></div>
}
