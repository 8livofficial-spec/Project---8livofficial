'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft,
  Package,
  CheckCircle2,
  Clock,
  Truck,
  AlertTriangle,
  FileText,
  User,
  MapPin,
  ShieldAlert,
  Send,
  Loader2,
} from 'lucide-react'
import { authedFetch } from '@/lib/apiClient'

type OrderDetail = {
  order_id: string
  order_reference: string
  status: string
  created_at: string
  updated_at: string
  dispatched_at?: string | null
  delivered_at?: string | null
  courier_name?: string | null
  tracking_number?: string | null
  clarification_notes?: string | null
  unable_to_fulfill_reason?: string | null
  patient: {
    name: string
    phone?: string | null
    delivery_address?: any
  }
  doctor: {
    name: string
    registration_number: string
  }
  prescription: {
    id: string
    prescription_number: string
    issued_at?: string
    valid_until?: string
    diagnosis?: string
  }
  items: Array<{
    id: string
    medicine_name: string
    generic_name?: string | null
    brand_name?: string | null
    strength: string
    dosage_form: string
    dose: string
    route: string
    frequency: string
    duration_value: number
    duration_unit: string
    quantity: number
    food_instruction?: string | null
    special_instruction?: string | null
  }>
}

export default function PharmacyOrderDetailPage() {
  const params = useParams()
  const router = useRouter()
  const orderId = String(params?.orderId || '')

  const [order, setOrder] = useState<OrderDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)
  const [error, setError] = useState('')
  const [successMsg, setSuccessMsg] = useState('')

  // Modals / forms
  const [showDispatchModal, setShowDispatchModal] = useState(false)
  const [courierName, setCourierName] = useState('')
  const [trackingNumber, setTrackingNumber] = useState('')

  const [showClarificationModal, setShowClarificationModal] = useState(false)
  const [clarificationNotes, setClarificationNotes] = useState('')

  const [showUnableModal, setShowUnableModal] = useState(false)
  const [unableReason, setUnableReason] = useState('')

  const fetchOrderDetail = async () => {
    setLoading(true)
    setError('')
    try {
      const res = await authedFetch(`/api/pharmacy/orders/${orderId}`)
      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || 'Failed to load order details.')
      }
      setOrder(data.order)
    } catch (err: any) {
      setError(err.message || 'Error retrieving fulfillment order.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (orderId) fetchOrderDetail()
  }, [orderId])

  const handleAction = async (endpoint: string, payload: Record<string, any> = {}) => {
    setActionLoading(true)
    setError('')
    setSuccessMsg('')
    try {
      const res = await authedFetch(`/api/pharmacy/orders/${orderId}/${endpoint}`, {
        method: 'POST',
        body: JSON.stringify(payload),
      })
      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || `Failed to perform action (${endpoint})`)
      }

      setSuccessMsg(`Order updated successfully!`)
      setShowDispatchModal(false)
      setShowClarificationModal(false)
      setShowUnableModal(false)
      await fetchOrderDetail()
    } catch (err: any) {
      setError(err.message || 'Operation failed.')
    } finally {
      setActionLoading(false)
    }
  }

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#F5F0EB]">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-[#C4622D]" />
          <p className="text-sm font-bold text-[#1A1F36]">Loading order details...</p>
        </div>
      </main>
    )
  }

  if (!order) {
    return (
      <main className="min-h-screen bg-[#F5F0EB] p-8">
        <div className="mx-auto max-w-xl rounded-2xl bg-white p-8 text-center shadow-sm">
          <AlertTriangle className="mx-auto h-12 w-12 text-amber-600" />
          <h2 className="mt-4 text-xl font-black text-[#1A1F36]">Order Not Found</h2>
          <p className="mt-2 text-sm text-[#8896A4]">{error || 'Unable to access order.'}</p>
          <Link
            href="/pharmacy"
            className="mt-6 inline-flex rounded-xl bg-[#1A1F36] px-5 py-2.5 text-xs font-black text-white"
          >
            Return to Dashboard
          </Link>
        </div>
      </main>
    )
  }

  const status = (order.status || '').toUpperCase()

  return (
    <main className="min-h-screen bg-[#F5F0EB] p-4 text-[#1A1F36] sm:p-6 lg:p-8">
      <div className="mx-auto max-w-5xl space-y-6">
        {/* Back Link & Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/pharmacy"
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#1A1F36]/10 bg-white text-[#1A1F36] transition-colors hover:bg-[#F5F0EB]"
            >
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-black">{order.order_reference}</h1>
                <span className="rounded-full bg-[#1A1F36]/5 px-2.5 py-0.5 text-xs font-black text-[#1A1F36]">
                  {status}
                </span>
              </div>
              <p className="text-xs font-semibold text-[#8896A4]">
                Rx: {order.prescription?.prescription_number} • Ordered on{' '}
                {new Date(order.created_at).toLocaleDateString('en-IN', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                })}
              </p>
            </div>
          </div>

          {/* Top Level Action Bar */}
          <div className="flex flex-wrap items-center gap-2">
            {(status === 'RECEIVED' || status === 'PENDING_ADMIN_REVIEW') && (
              <button
                onClick={() => handleAction('acknowledge')}
                disabled={actionLoading}
                className="inline-flex items-center gap-2 rounded-xl bg-[#1A1F36] px-4 py-2.5 text-xs font-black text-white shadow-sm transition-transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50"
              >
                <CheckCircle2 className="h-4 w-4" />
                Acknowledge Order
              </button>
            )}

            {status === 'ACKNOWLEDGED' && (
              <button
                onClick={() => handleAction('confirm-stock')}
                disabled={actionLoading}
                className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-xs font-black text-white shadow-sm transition-transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50"
              >
                <CheckCircle2 className="h-4 w-4" />
                Confirm Stock Available
              </button>
            )}

            {status === 'STOCK_CONFIRMED' && (
              <button
                onClick={() => handleAction('prepare')}
                disabled={actionLoading}
                className="inline-flex items-center gap-2 rounded-xl bg-purple-600 px-4 py-2.5 text-xs font-black text-white shadow-sm transition-transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50"
              >
                <Package className="h-4 w-4" />
                Start Preparing & Packing
              </button>
            )}

            {status === 'PREPARING' && (
              <button
                onClick={() => setShowDispatchModal(true)}
                disabled={actionLoading}
                className="inline-flex items-center gap-2 rounded-xl bg-cyan-600 px-4 py-2.5 text-xs font-black text-white shadow-sm transition-transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50"
              >
                <Truck className="h-4 w-4" />
                Dispatch Order
              </button>
            )}

            {status === 'DISPATCHED' && (
              <button
                onClick={() => handleAction('deliver')}
                disabled={actionLoading}
                className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-xs font-black text-white shadow-sm transition-transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50"
              >
                <CheckCircle2 className="h-4 w-4" />
                Confirm Delivery
              </button>
            )}

            {/* Exception buttons available before final delivery */}
            {!['DELIVERED', 'CANCELLED', 'UNABLE_TO_FULFILL'].includes(status) && (
              <>
                <button
                  onClick={() => setShowClarificationModal(true)}
                  disabled={actionLoading}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-amber-300 bg-amber-50 px-3 py-2 text-xs font-black text-amber-800 transition-colors hover:bg-amber-100"
                >
                  <AlertTriangle className="h-3.5 w-3.5" />
                  Clarification
                </button>

                <button
                  onClick={() => setShowUnableModal(true)}
                  disabled={actionLoading}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-rose-300 bg-rose-50 px-3 py-2 text-xs font-black text-rose-800 transition-colors hover:bg-rose-100"
                >
                  Unable to Fulfill
                </button>
              </>
            )}
          </div>
        </div>

        {/* Notifications */}
        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-xs font-bold text-red-800">
            {error}
          </div>
        )}
        {successMsg && (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-xs font-bold text-emerald-800">
            {successMsg}
          </div>
        )}

        {/* Clinical Immutability Compliance Notice */}
        <div className="flex items-start gap-3 rounded-2xl border border-[#1A1F36]/10 bg-white p-4 shadow-sm">
          <ShieldAlert className="h-5 w-5 shrink-0 text-[#C4622D]" />
          <div className="text-xs">
            <p className="font-bold text-[#1A1F36]">Clinical Immutability Notice</p>
            <p className="text-[#8896A4]">
              Medication, dosage, and instructions are authorized by the prescribing medical doctor
              and are strictly immutable. Partner pharmacies must never modify medication details. If
              any item is unavailable or requires clinical clarification, escalate back via the
              Clarification / Unable to Fulfill actions.
            </p>
          </div>
        </div>

        {/* 2-Column Info Layout */}
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          {/* Patient Destination Card */}
          <div className="rounded-2xl border border-[#1A1F36]/10 bg-white p-6 shadow-sm">
            <div className="flex items-center gap-2 border-b border-[#1A1F36]/10 pb-3">
              <MapPin className="h-4 w-4 text-[#C4622D]" />
              <h2 className="text-sm font-black uppercase tracking-wider text-[#1A1F36]">
                Patient Delivery Destination
              </h2>
            </div>
            <div className="mt-4 space-y-2 text-sm">
              <p className="font-bold text-base text-[#1A1F36]">{order.patient?.name}</p>
              {order.patient?.phone && (
                <p className="text-xs font-semibold text-[#8896A4]">
                  Phone: {order.patient.phone}
                </p>
              )}
              <div className="rounded-xl bg-[#F5F0EB]/50 p-3 text-xs leading-relaxed text-[#40516A]">
                {order.patient?.delivery_address ? (
                  <>
                    <p>{order.patient.delivery_address.line1 || order.patient.delivery_address.address_line1}</p>
                    {order.patient.delivery_address.line2 && <p>{order.patient.delivery_address.line2}</p>}
                    <p>
                      {order.patient.delivery_address.city}, {order.patient.delivery_address.state} -{' '}
                      {order.patient.delivery_address.pincode || order.patient.delivery_address.postal_code}
                    </p>
                  </>
                ) : (
                  <p className="italic text-[#8896A4]">Standard patient address on file with 8LIV care team.</p>
                )}
              </div>
            </div>
          </div>

          {/* Doctor & Dispatch Card */}
          <div className="rounded-2xl border border-[#1A1F36]/10 bg-white p-6 shadow-sm">
            <div className="flex items-center gap-2 border-b border-[#1A1F36]/10 pb-3">
              <User className="h-4 w-4 text-[#C4622D]" />
              <h2 className="text-sm font-black uppercase tracking-wider text-[#1A1F36]">
                Prescriber & Fulfillment Tracking
              </h2>
            </div>
            <div className="mt-4 space-y-3 text-sm">
              <div>
                <p className="text-xs font-bold text-[#8896A4]">Authorized Prescriber</p>
                <p className="font-bold text-[#1A1F36]">{order.doctor?.name}</p>
                <p className="text-xs text-[#8896A4]">
                  Reg. No: {order.doctor?.registration_number}
                </p>
              </div>

              {(order.courier_name || order.tracking_number) && (
                <div className="rounded-xl border border-cyan-200 bg-cyan-50/60 p-3 text-xs">
                  <p className="font-bold text-cyan-900">Courier Tracking</p>
                  <p className="text-cyan-800">
                    Carrier: <span className="font-black">{order.courier_name}</span>
                  </p>
                  <p className="text-cyan-800">
                    Tracking / AWB: <span className="font-black">{order.tracking_number}</span>
                  </p>
                  {order.dispatched_at && (
                    <p className="mt-1 text-[11px] text-cyan-700">
                      Dispatched:{' '}
                      {new Date(order.dispatched_at).toLocaleString('en-IN', {
                        dateStyle: 'medium',
                        timeStyle: 'short',
                      })}
                    </p>
                  )}
                </div>
              )}

              {order.clarification_notes && (
                <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
                  <p className="font-bold">Clarification Escalation</p>
                  <p className="mt-1">{order.clarification_notes}</p>
                </div>
              )}

              {order.unable_to_fulfill_reason && (
                <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-900">
                  <p className="font-bold">Unable to Fulfill Reason</p>
                  <p className="mt-1">{order.unable_to_fulfill_reason}</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Prescribed Items Table */}
        <div className="overflow-hidden rounded-2xl border border-[#1A1F36]/10 bg-white shadow-sm">
          <div className="border-b border-[#1A1F36]/10 bg-[#FAF7F5] p-4 pl-6">
            <h2 className="text-sm font-black uppercase tracking-wider text-[#1A1F36]">
              Prescribed Medications ({order.items.length})
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-[#1A1F36]/10 bg-[#FAF7F5] text-xs font-black uppercase tracking-wider text-[#8896A4]">
                <tr>
                  <th className="p-4 pl-6">Medicine & Strength</th>
                  <th className="p-4">Dosage / Frequency</th>
                  <th className="p-4">Duration</th>
                  <th className="p-4">Qty</th>
                  <th className="p-4 pr-6">Clinical Instructions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1A1F36]/5">
                {order.items.map((item) => (
                  <tr key={item.id} className="hover:bg-[#FAF7F5]/40">
                    <td className="p-4 pl-6">
                      <p className="font-black text-[#1A1F36]">{item.medicine_name}</p>
                      <p className="text-xs font-semibold text-[#8896A4]">
                        {item.dosage_form} • {item.strength}
                      </p>
                      {item.generic_name && (
                        <p className="text-[11px] text-[#8896A4]">Generic: {item.generic_name}</p>
                      )}
                    </td>
                    <td className="p-4">
                      <p className="font-bold text-[#1A1F36]">{item.dose}</p>
                      <p className="text-xs text-[#8896A4]">{item.frequency}</p>
                    </td>
                    <td className="p-4 text-xs font-bold text-[#1A1F36]">
                      {item.duration_value} {item.duration_unit}
                    </td>
                    <td className="p-4 font-black text-[#1A1F36]">{item.quantity}</td>
                    <td className="p-4 pr-6 text-xs text-[#40516A]">
                      {item.food_instruction && <p>• {item.food_instruction}</p>}
                      {item.special_instruction && <p>• {item.special_instruction}</p>}
                      {!item.food_instruction && !item.special_instruction && (
                        <span className="text-[#8896A4] italic">As directed by physician</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Dispatch Modal */}
      {showDispatchModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-[#1A1F36]/10 pb-3">
              <h3 className="text-base font-black text-[#1A1F36]">Dispatch Medication Order</h3>
              <button
                onClick={() => setShowDispatchModal(false)}
                className="text-xs font-black text-[#8896A4] hover:text-[#1A1F36]"
              >
                ✕
              </button>
            </div>
            <p className="text-xs text-[#8896A4]">
              Enter courier details and tracking AWB so the patient can track their shipment in real
              time.
            </p>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-bold text-[#1A1F36]">Courier / Carrier Name</label>
                <input
                  type="text"
                  value={courierName}
                  onChange={(e) => setCourierName(e.target.value)}
                  placeholder="e.g. BlueDart, Delhivery, DTDC"
                  className="mt-1 w-full rounded-xl border border-[#1A1F36]/10 p-3 text-sm font-medium outline-none focus:border-[#1A1F36]"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-[#1A1F36]">Tracking / AWB Number</label>
                <input
                  type="text"
                  value={trackingNumber}
                  onChange={(e) => setTrackingNumber(e.target.value)}
                  placeholder="e.g. BLD987654321IN"
                  className="mt-1 w-full rounded-xl border border-[#1A1F36]/10 p-3 text-sm font-medium outline-none focus:border-[#1A1F36]"
                />
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 pt-3">
              <button
                onClick={() => setShowDispatchModal(false)}
                className="rounded-xl px-4 py-2.5 text-xs font-black text-[#40516A] hover:bg-[#F5F0EB]"
              >
                Cancel
              </button>
              <button
                onClick={() =>
                  handleAction('dispatch', {
                    courier_name: courierName,
                    tracking_number: trackingNumber,
                  })
                }
                disabled={actionLoading || !courierName.trim() || !trackingNumber.trim()}
                className="inline-flex items-center gap-1.5 rounded-xl bg-[#1A1F36] px-5 py-2.5 text-xs font-black text-white disabled:opacity-50"
              >
                {actionLoading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                Confirm Dispatch
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Clarification Modal */}
      {showClarificationModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-[#1A1F36]/10 pb-3">
              <h3 className="text-base font-black text-[#1A1F36]">Request Clinical Clarification</h3>
              <button
                onClick={() => setShowClarificationModal(false)}
                className="text-xs font-black text-[#8896A4] hover:text-[#1A1F36]"
              >
                ✕
              </button>
            </div>
            <p className="text-xs text-[#8896A4]">
              Escalate this prescription back to the prescribing doctor. Describe the clarification
              needed (e.g. brand out of stock, dosage clarification).
            </p>
            <div>
              <label className="text-xs font-bold text-[#1A1F36]">Clarification Notes</label>
              <textarea
                rows={4}
                value={clarificationNotes}
                onChange={(e) => setClarificationNotes(e.target.value)}
                placeholder="Describe your query for the doctor..."
                className="mt-1 w-full rounded-xl border border-[#1A1F36]/10 p-3 text-sm font-medium outline-none focus:border-[#1A1F36]"
              />
            </div>
            <div className="flex items-center justify-end gap-2 pt-3">
              <button
                onClick={() => setShowClarificationModal(false)}
                className="rounded-xl px-4 py-2.5 text-xs font-black text-[#40516A] hover:bg-[#F5F0EB]"
              >
                Cancel
              </button>
              <button
                onClick={() =>
                  handleAction('clarification', {
                    notes: clarificationNotes,
                  })
                }
                disabled={actionLoading || !clarificationNotes.trim()}
                className="inline-flex items-center gap-1.5 rounded-xl bg-amber-600 px-5 py-2.5 text-xs font-black text-white disabled:opacity-50"
              >
                {actionLoading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                Submit Request
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Unable to Fulfill Modal */}
      {showUnableModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-[#1A1F36]/10 pb-3">
              <h3 className="text-base font-black text-rose-700">Report Unable to Fulfill</h3>
              <button
                onClick={() => setShowUnableModal(false)}
                className="text-xs font-black text-[#8896A4] hover:text-[#1A1F36]"
              >
                ✕
              </button>
            </div>
            <p className="text-xs text-[#8896A4]">
              Indicate why this prescription cannot be fulfilled so the 8LIV clinical care team can
              reassign or issue an alternative prescription.
            </p>
            <div>
              <label className="text-xs font-bold text-[#1A1F36]">Reason</label>
              <textarea
                rows={4}
                value={unableReason}
                onChange={(e) => setUnableReason(e.target.value)}
                placeholder="e.g. Medication discontinued nationally, region delivery impossible..."
                className="mt-1 w-full rounded-xl border border-[#1A1F36]/10 p-3 text-sm font-medium outline-none focus:border-[#1A1F36]"
              />
            </div>
            <div className="flex items-center justify-end gap-2 pt-3">
              <button
                onClick={() => setShowUnableModal(false)}
                className="rounded-xl px-4 py-2.5 text-xs font-black text-[#40516A] hover:bg-[#F5F0EB]"
              >
                Cancel
              </button>
              <button
                onClick={() =>
                  handleAction('unable-to-fulfill', {
                    reason: unableReason,
                  })
                }
                disabled={actionLoading || !unableReason.trim()}
                className="inline-flex items-center gap-1.5 rounded-xl bg-rose-600 px-5 py-2.5 text-xs font-black text-white disabled:opacity-50"
              >
                {actionLoading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                Confirm Report
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}
