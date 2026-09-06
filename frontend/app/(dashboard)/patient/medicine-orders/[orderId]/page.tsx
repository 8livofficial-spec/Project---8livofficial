'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { Truck, Package, CheckCircle2, ArrowLeft, ShieldCheck, MapPin, Pill } from 'lucide-react'
import { authedFetch } from '@/lib/apiClient'
import FulfillmentTimelineTracker from '@/components/patient/FulfillmentTimelineTracker'

const STATUS_LABELS: Record<string, string> = {
  PENDING_ASSIGNMENT: 'Fulfillment in Progress',
  RECEIVED: 'Assigned to Partner Pharmacy',
  ACKNOWLEDGED: 'Pharmacy Acknowledged',
  STOCK_CONFIRMED: 'Treatment Stock Confirmed',
  PREPARING: 'Preparing Treatment Package',
  DISPATCHED: 'Dispatched with Courier',
  DELIVERED: 'Delivered',
  CLARIFICATION_REQUIRED: 'Clinical Review in Progress',
  UNABLE_TO_FULFILL: 'Fulfillment Rescheduling',
  CANCELLED: 'Fulfillment Cancelled',
}

export default function PatientMedicineOrderDetailPage() {
  const params = useParams<{ orderId: string }>()
  const [order, setOrder] = useState<any>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    authedFetch(`/api/patient/pharmacy-orders/${params.orderId}`)
      .then(async (res) => {
        const payload = await res.json()
        if (!res.ok) throw new Error(payload.error || 'Unable to load fulfillment order.')
        setOrder(payload.order)
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Unable to load fulfillment order.'))
  }, [params.orderId])

  if (!order) return <div className="space-y-4 text-[#1A1F36]">{error || 'Loading fulfillment details...'}</div>

  const rx = order.prescriptions
  const items = rx?.prescription_items || []
  const addr = order.delivery_address_snapshot
  const cycleNumber = order.treatment_cycles?.cycle_number || rx?.treatment_cycles?.cycle_number || null
  const orderRef = `8LIV-PO-${order.id.slice(0, 8).toUpperCase()}`

  return (
    <div className="space-y-6 text-[#1A1F36]">
      <Link
        href="/patient/medicine-orders"
        className="inline-flex items-center gap-2 text-xs font-black text-[#8896A4] hover:text-[#1A1F36] transition-colors"
      >
        <ArrowLeft className="h-4 w-4" /> Back to Treatment Deliveries
      </Link>

      {error && <p className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-700">{error}</p>}

      {/* Subscription Care Package Inclusion Banner */}
      <div className="rounded-2xl border border-emerald-200 bg-emerald-50/80 p-4 text-xs text-emerald-950 flex items-start gap-3 shadow-xs">
        <ShieldCheck className="h-5 w-5 text-emerald-700 shrink-0 mt-0.5" />
        <div>
          <p className="font-bold text-emerald-900">Treatment Package Coverage</p>
          <p className="mt-0.5 text-emerald-800 font-semibold">
            Medication fulfillment is included as part of your 8LIV treatment package. You do not pay the pharmacy separately.
          </p>
        </div>
      </div>

      {/* Header Card */}
      <div className="dash-card p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-black uppercase tracking-wider text-[#C4622D]">
                {orderRef}
              </span>
              {cycleNumber && (
                <span className="rounded-full bg-[#C4622D]/10 px-2.5 py-0.5 text-[10px] font-black text-[#C4622D]">
                  Treatment Cycle {cycleNumber}
                </span>
              )}
            </div>
            <h1 className="mt-1 text-2xl font-black">{STATUS_LABELS[order.status] || order.status}</h1>
            <p className="mt-0.5 text-xs font-semibold text-[#8896A4]">
              Rx Reference: {rx?.prescription_number || 'N/A'} • Authorized on{' '}
              {new Date(rx?.issued_at || order.created_at).toLocaleDateString('en-IN', {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
              })}
            </p>
          </div>
          <span className="self-start sm:self-auto rounded-full bg-[#1A1F36]/5 px-3 py-1 text-xs font-black text-[#1A1F36]">
            8LIV Partner Pharmacy
          </span>
        </div>
      </div>

      {/* 6-Stage Timeline Tracker Component */}
      <FulfillmentTimelineTracker
        status={order.status}
        courierName={order.courier_name}
        trackingNumber={order.tracking_number}
        dispatchedAt={order.shipped_at || order.dispatched_at}
        deliveredAt={order.delivered_at}
      />

      {/* Confirmed Delivery Address Snapshot */}
      {addr && (
        <div className="dash-card p-6">
          <div className="flex items-center gap-2 mb-3 text-[#1A1F36]">
            <MapPin className="h-4 w-4 text-[#C4622D]" />
            <h3 className="text-sm font-black uppercase tracking-widest text-[#8896A4]">Confirmed Delivery Address Snapshot</h3>
          </div>
          <p className="text-sm font-bold text-[#1A1F36]">{addr.recipient_name}</p>
          <p className="text-xs font-semibold text-[#40516A] mt-1">
            {addr.line1}, {addr.line2 ? addr.line2 + ', ' : ''}{addr.city}, {addr.state} - {addr.pincode}
          </p>
          <p className="text-xs font-semibold text-[#8896A4] mt-1">Contact Phone: {addr.phone}</p>
          {addr.snapshot_taken_at && (
            <p className="text-[10px] font-bold text-[#8896A4] mt-2">
              Destination locked on {new Date(addr.snapshot_taken_at).toLocaleString()}
            </p>
          )}
        </div>
      )}

      {/* Prescribed Medications in Package */}
      {items.length > 0 && (
        <div className="dash-card p-6">
          <div className="flex items-center gap-2 mb-4 text-[#1A1F36]">
            <Pill className="h-4 w-4 text-[#C4622D]" />
            <h3 className="text-sm font-black uppercase tracking-widest text-[#8896A4]">Prescribed Treatment Package Contents</h3>
          </div>
          <div className="grid gap-3">
            {items.map((item: any) => (
              <div key={item.id} className="rounded-xl border border-[#1A1F36]/8 bg-[#FAF7F5] p-4 flex justify-between items-center">
                <div>
                  <p className="font-bold text-sm text-[#1A1F36]">
                    {item.medicine_name} <span className="text-xs text-[#8896A4]">({item.strength})</span>
                  </p>
                  <p className="text-xs text-[#40516A] mt-0.5">
                    {item.dose} • {item.frequency} for {item.duration_value} {item.duration_unit?.toLowerCase()}
                  </p>
                  {(item.food_instruction || item.special_instruction) && (
                    <p className="text-[11px] text-[#8896A4] mt-0.5">{item.food_instruction} {item.special_instruction}</p>
                  )}
                </div>
                <span className="text-xs font-black bg-white border border-[#1A1F36]/10 px-3 py-1.5 rounded-lg">
                  Qty: {item.quantity}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Status Transition History */}
      <div className="dash-card p-6">
        <h3 className="mb-4 text-sm font-black uppercase tracking-widest text-[#8896A4]">
          <Truck className="mr-2 inline h-4 w-4" /> Fulfillment Activity Log
        </h3>
        <div className="space-y-3">
          {(order.pharmacy_order_status_history || []).map((item: any) => (
            <div key={item.id} className="flex items-start gap-3 border-l-2 border-[#C4622D] pl-3 py-1">
              <div>
                <p className="text-sm font-bold text-[#1A1F36]">{STATUS_LABELS[item.new_status] || item.new_status}</p>
                {item.reason && <p className="text-xs text-[#40516A] mt-0.5">{item.reason}</p>}
                <p className="text-xs text-[#8896A4] mt-0.5">{new Date(item.created_at).toLocaleString()}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
