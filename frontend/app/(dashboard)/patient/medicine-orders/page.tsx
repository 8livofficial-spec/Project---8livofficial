'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Package, Truck, ChevronRight } from 'lucide-react'
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

export default function PatientMedicineOrdersPage() {
  const [orders, setOrders] = useState<any[]>([])
  const [error, setError] = useState('')

  useEffect(() => {
    authedFetch('/api/patient/pharmacy-orders')
      .then(async (res) => {
        const payload = await res.json()
        if (!res.ok) throw new Error(payload.error || 'Unable to load treatment package deliveries.')
        setOrders(payload.orders || [])
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Unable to load treatment package deliveries.'))
  }, [])

  return (
    <div className="space-y-6 text-[#1A1F36]">
      <div>
        <h2 className="text-xl font-bold">Treatment Package Deliveries & Fulfillment</h2>
        <p className="text-xs font-medium text-[#8896A4]">
          Track treatment package fulfillment and dispatch updates covered by your 8LIV care subscription.
        </p>
      </div>
      {error && <p className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-700">{error}</p>}
      <div className="grid gap-4">
        {orders.length === 0 ? (
          <div className="dash-card p-8 text-center">
            <Package className="mx-auto mb-3 h-10 w-10 text-[#8896A4]" />
            <h3 className="font-black">No treatment package dispatches yet</h3>
            <p className="mt-2 text-sm font-semibold text-[#8896A4] max-w-md mx-auto">
              Once your doctor issues an e-prescription and you confirm your delivery address, fulfillment updates will appear here.
            </p>
          </div>
        ) : (
          orders.map((order) => {
            const rx = order.prescriptions
            const cycleNumber = order.treatment_cycles?.cycle_number || rx?.treatment_cycles?.cycle_number || null
            return (
              <Link key={order.id} href={`/patient/medicine-orders/${order.id}`} className="dash-card block p-5 transition-shadow hover:shadow-md">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-black uppercase tracking-wider text-[#C4622D]">
                        {rx?.prescription_number || `8LIV-PO-${order.id.slice(0, 8).toUpperCase()}`}
                      </span>
                      {cycleNumber && (
                        <span className="rounded-full bg-[#C4622D]/10 px-2 py-0.5 text-[10px] font-black text-[#C4622D]">
                          Treatment Cycle {cycleNumber}
                        </span>
                      )}
                    </div>
                    <h3 className="mt-1 text-base font-black text-[#1A1F36]">
                      {STATUS_LABELS[order.status] || order.status}
                    </h3>
                  </div>
                  <span className="self-start sm:self-auto rounded-full bg-[#1A1F36]/5 px-3 py-1 text-xs font-black text-[#1A1F36] flex items-center gap-1">
                    View Tracker <ChevronRight className="h-3 w-3" />
                  </span>
                </div>

                <p className="mt-1 text-xs font-semibold text-[#40516A]">
                  Treatment package covered by your subscription • Dispatched via 8LIV Partner Pharmacy
                </p>

                {/* Compact Milestone Tracker */}
                <div className="mt-3 pt-3 border-t border-[#1A1F36]/6">
                  <FulfillmentTimelineTracker status={order.status} compact={true} />
                </div>

                <div className="mt-3 grid gap-2 border-t border-[#1A1F36]/6 pt-3 text-xs sm:grid-cols-3">
                  <Meta label="Fulfillment State" value={STATUS_LABELS[order.status] || order.status} />
                  <Meta label="Courier Partner" value={order.courier_name || (order.status === 'DISPATCHED' ? 'Courier Assigned' : '-')} />
                  <Meta label="Tracking / AWB" value={order.tracking_number || '-'} />
                </div>
              </Link>
            )
          })
        )}
      </div>
    </div>
  )
}

function Meta({ label, value }: { label: string; value: string }) {
  return <div><p className="text-[10px] font-black uppercase tracking-wider text-[#8896A4]">{label}</p><p className="mt-0.5 font-bold text-[#1A1F36]">{value}</p></div>
}
