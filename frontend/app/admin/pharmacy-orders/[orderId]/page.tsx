'use client'

import type { ReactNode } from 'react'
import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Building2, CheckCircle2, AlertTriangle, ShieldCheck, Truck } from 'lucide-react'
import { authedFetch } from '@/lib/apiClient'

const allowedAdminTransitions: Record<string, string[]> = {
  PENDING_ASSIGNMENT: ['CANCELLED'],
  RECEIVED: ['ACKNOWLEDGED', 'CLARIFICATION_REQUIRED', 'UNABLE_TO_FULFILL', 'CANCELLED'],
  ACKNOWLEDGED: ['STOCK_CONFIRMED', 'CLARIFICATION_REQUIRED', 'UNABLE_TO_FULFILL', 'CANCELLED'],
  STOCK_CONFIRMED: ['PREPARING', 'CLARIFICATION_REQUIRED', 'UNABLE_TO_FULFILL', 'CANCELLED'],
  PREPARING: ['DISPATCHED', 'CLARIFICATION_REQUIRED', 'UNABLE_TO_FULFILL', 'CANCELLED'],
  DISPATCHED: ['DELIVERED', 'CANCELLED'],
  CLARIFICATION_REQUIRED: ['ACKNOWLEDGED', 'STOCK_CONFIRMED', 'UNABLE_TO_FULFILL', 'CANCELLED'],
  PARTIALLY_FULFILLED: ['DISPATCHED', 'CANCELLED'],
  UNABLE_TO_FULFILL: ['CANCELLED'],
}

export default function AdminPharmacyOrderDetailPage() {
  const params = useParams<{ orderId: string }>()
  const router = useRouter()
  const orderId = params.orderId

  const [order, setOrder] = useState<any>(null)
  const [form, setForm] = useState<any>({})
  const [pharmacies, setPharmacies] = useState<any[]>([])
  const [selectedPharmacyId, setSelectedPharmacyId] = useState('')
  const [assignLoading, setAssignLoading] = useState(false)
  const [statusLoading, setStatusLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const load = async () => {
    try {
      const res = await authedFetch(`/api/admin/pharmacy-orders/${orderId}`)
      const payload = await res.json()
      if (!res.ok) throw new Error(payload.error || 'Unable to load order.')
      setOrder(payload.order)
      setForm(payload.order || {})

      // Fetch partner pharmacies for assignment dropdown (VERIFIED + ACTIVE only)
      const pRes = await authedFetch('/api/admin/pharmacy')
      const pPayload = await pRes.json()
      if (pRes.ok && Array.isArray(pPayload.pharmacies)) {
        const verifiedActive = pPayload.pharmacies.filter(
          (p: any) => p.verification_status === 'VERIFIED' && p.status === 'ACTIVE'
        )
        setPharmacies(verifiedActive)
        if (verifiedActive.length > 0 && !payload.order.pharmacy_id) {
          setSelectedPharmacyId(verifiedActive[0].id)
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load order.')
    }
  }

  useEffect(() => {
    load()
  }, [orderId])

  const assignPharmacy = async () => {
    if (!selectedPharmacyId) return setError('Please select a verified partner pharmacy.')
    setAssignLoading(true)
    setError('')
    setSuccess('')
    try {
      const res = await authedFetch(`/api/admin/pharmacy-orders/${orderId}/assign-pharmacy`, {
        method: 'PATCH',
        body: JSON.stringify({ pharmacy_id: selectedPharmacyId }),
      })
      const payload = await res.json()
      if (!res.ok) throw new Error(payload.error || 'Failed to assign pharmacy.')
      setSuccess('Partner pharmacy assigned successfully! Order is now RECEIVED.')
      await load()
    } catch (err: any) {
      setError(err.message || 'Failed to assign pharmacy.')
    } finally {
      setAssignLoading(false)
    }
  }

  const patchDetails = async () => {
    setError('')
    setSuccess('')
    try {
      const res = await authedFetch(`/api/admin/pharmacy-orders/${orderId}`, {
        method: 'PATCH',
        body: JSON.stringify(form),
      })
      const payload = await res.json()
      if (!res.ok) throw new Error(payload.error || 'Unable to update order.')
      setSuccess('Order details updated.')
      load()
    } catch (err: any) {
      setError(err.message)
    }
  }

  const transitionStatus = async (next: string) => {
    setStatusLoading(true)
    setError('')
    setSuccess('')
    try {
      const res = await authedFetch(`/api/admin/pharmacy-orders/${orderId}/status`, {
        method: 'POST',
        body: JSON.stringify({ status: next, version: order.version }),
      })
      const payload = await res.json()
      if (!res.ok) throw new Error(payload.error || 'Unable to update status.')
      setSuccess(`Order transitioned to ${next}.`)
      load()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setStatusLoading(false)
    }
  }

  if (!order) return <main className="min-h-screen bg-[#F5F0EB] p-6 text-[#1A1F36]">{error || 'Loading...'}</main>

  const rx = order.prescriptions
  const addr = order.delivery_address_snapshot
  const assignedPharmacy = order.partner_pharmacies
  const availableNext = allowedAdminTransitions[order.status] || []

  return (
    <main className="min-h-screen bg-[#F5F0EB] p-6 text-[#1A1F36]">
      <div className="mx-auto max-w-6xl space-y-6">
        <Link href="/admin/pharmacy-orders" className="inline-flex items-center gap-2 text-xs font-black text-[#8896A4] hover:text-[#1A1F36]">
          <ArrowLeft className="h-4 w-4" /> Back to Pharmacy Orders
        </Link>

        {/* Header */}
        <div className="rounded-xl bg-white p-6 shadow-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <p className="text-xs font-black uppercase tracking-widest text-[#C4622D]">
              {rx?.prescription_number || `8LIV-PO-${order.id.slice(0, 8).toUpperCase()}`}
            </p>
            <h1 className="mt-1 text-3xl font-black">{order.status.replaceAll('_', ' ')}</h1>
            <p className="mt-1 text-xs font-bold text-[#8896A4]">
              Created {new Date(order.created_at).toLocaleString()} • Version: {order.version}
            </p>
          </div>
          {assignedPharmacy && (
            <div className="rounded-xl bg-[#FAF7F5] border border-[#1A1F36]/10 p-4">
              <p className="text-[10px] font-black uppercase tracking-wider text-[#8896A4]">Assigned Pharmacy</p>
              <Link
                href={`/admin/pharmacy/${assignedPharmacy.id}`}
                className="text-sm font-black text-[#1A1F36] hover:text-[#C4622D] flex items-center gap-1.5 mt-0.5"
              >
                <Building2 className="h-4 w-4 text-[#C4622D]" /> {assignedPharmacy.name}
              </Link>
              <p className="text-xs font-semibold text-[#8896A4]">{assignedPharmacy.email || assignedPharmacy.phone}</p>
            </div>
          )}
        </div>

        {error && <p className="rounded-lg bg-red-50 p-4 text-sm font-bold text-red-700">{error}</p>}
        {success && <p className="rounded-lg bg-emerald-50 p-4 text-sm font-bold text-emerald-700">{success}</p>}

        {/* Pharmacy Assignment Panel (Prominent when PENDING_ASSIGNMENT) */}
        {order.status === 'PENDING_ASSIGNMENT' && (
          <section className="rounded-xl bg-amber-50 border-2 border-amber-200 p-6 shadow-sm">
            <div className="flex items-center gap-2 text-amber-900 mb-2">
              <Building2 className="h-5 w-5 text-amber-700" />
              <h2 className="text-base font-black uppercase tracking-wide">Assign Partner Pharmacy</h2>
            </div>
            <p className="text-sm font-semibold text-amber-800 mb-4">
              This order has been confirmed by the patient and is waiting for fulfillment partner assignment. Select an active, verified pharmacy:
            </p>

            {pharmacies.length === 0 ? (
              <div className="rounded-lg bg-white p-4 text-sm font-bold text-red-700 border border-red-200">
                No active and verified partner pharmacies found in this tenant. Please verify and activate a pharmacy in Partner Pharmacies management first.
              </div>
            ) : (
              <div className="flex flex-col sm:flex-row gap-3">
                <select
                  value={selectedPharmacyId}
                  onChange={(e) => setSelectedPharmacyId(e.target.value)}
                  className="flex-1 rounded-xl border border-amber-300 bg-white px-4 py-3 text-sm font-bold outline-none"
                >
                  {pharmacies.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.drug_license_number || 'Verified'}) - {p.email}
                    </option>
                  ))}
                </select>
                <button
                  onClick={assignPharmacy}
                  disabled={assignLoading}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#1A1F36] px-6 py-3 text-sm font-black text-white hover:bg-[#2A314E] disabled:opacity-50"
                >
                  <CheckCircle2 className="h-4 w-4" />
                  {assignLoading ? 'Assigning...' : 'Assign & Notify Pharmacy'}
                </button>
              </div>
            )}
          </section>
        )}

        <section className="grid gap-6 lg:grid-cols-2">
          {/* Prescription & Clinical Read-Only Panel */}
          <Panel title="Prescription Clinical Record">
            <Meta label="Diagnosis" value={rx?.diagnosis || '-'} />
            <div className="mt-3 space-y-2">
              {(rx?.prescription_items || []).map((item: any) => (
                <div key={item.id} className="rounded-lg border border-[#1A1F36]/8 p-3 bg-[#FAF7F5]">
                  <p className="text-sm font-bold">{item.medicine_name} <span className="text-xs text-[#8896A4]">({item.strength})</span></p>
                  <p className="text-xs text-[#40516A] mt-0.5">{item.dose} • {item.frequency} for {item.duration_value} {item.duration_unit?.toLowerCase()} (Qty: {item.quantity})</p>
                </div>
              ))}
            </div>
          </Panel>

          {/* Delivery Address Snapshot */}
          <Panel title="Confirmed Delivery Address">
            {addr ? (
              <div>
                <Meta label="Recipient" value={addr.recipient_name} />
                <Meta label="Address" value={`${addr.line1}, ${addr.line2 ? addr.line2 + ', ' : ''}${addr.city}, ${addr.state} - ${addr.pincode}`} />
                <Meta label="Contact Phone" value={addr.phone} />
                <Meta label="Snapshot Timestamp" value={addr.snapshot_taken_at ? new Date(addr.snapshot_taken_at).toLocaleString() : '-'} />
              </div>
            ) : (
              <p className="text-sm font-semibold text-[#8896A4]">No address snapshot available.</p>
            )}
          </Panel>
        </section>

        {/* Operational & Logistics Panel */}
        <Panel title="Logistics & Dispatch Information">
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="text-[10px] font-black uppercase tracking-widest text-[#8896A4]">Courier Name</span>
              <input value={form.courier_name || ''} onChange={(e) => setForm({ ...form, courier_name: e.target.value })} className="mt-1 w-full rounded-lg border border-[#1A1F36]/10 px-3 py-2 text-sm font-bold" />
            </label>
            <label className="block">
              <span className="text-[10px] font-black uppercase tracking-widest text-[#8896A4]">Tracking Number / AWB</span>
              <input value={form.tracking_number || ''} onChange={(e) => setForm({ ...form, tracking_number: e.target.value })} className="mt-1 w-full rounded-lg border border-[#1A1F36]/10 px-3 py-2 text-sm font-bold" />
            </label>
            <label className="block sm:col-span-2">
              <span className="text-[10px] font-black uppercase tracking-widest text-[#8896A4]">Internal Operational Notes</span>
              <textarea rows={2} value={form.internal_notes || ''} onChange={(e) => setForm({ ...form, internal_notes: e.target.value })} className="mt-1 w-full rounded-lg border border-[#1A1F36]/10 px-3 py-2 text-sm font-bold" />
            </label>
          </div>
          <button onClick={patchDetails} className="mt-4 rounded-xl bg-[#1A1F36] px-4 py-2.5 text-xs font-black text-white hover:bg-[#2A314E]">
            Save Operational Details
          </button>
        </Panel>

        {/* Status Transition Actions */}
        {availableNext.length > 0 && (
          <Panel title="Admin Lifecycle Actions">
            <div className="flex flex-wrap gap-2">
              {availableNext.map((item) => (
                <button
                  key={item}
                  onClick={() => transitionStatus(item)}
                  disabled={statusLoading}
                  className={`rounded-lg px-4 py-2.5 text-xs font-black transition-transform hover:scale-[1.02] disabled:opacity-50 ${
                    item === 'CANCELLED' ? 'bg-red-50 text-red-700 border border-red-200' : 'bg-[#1A1F36] text-white'
                  }`}
                >
                  {item === 'CANCELLED' ? 'Cancel Order' : `Transition to ${item.replaceAll('_', ' ')}`}
                </button>
              ))}
            </div>
          </Panel>
        )}

        {/* Status History */}
        <Panel title="Fulfillment Status History">
          <div className="space-y-3">
            {(order.pharmacy_order_status_history || []).map((item: any) => (
              <div key={item.id} className="border-l-2 border-[#C4622D] pl-3 py-1">
                <p className="text-sm font-bold">
                  {item.previous_status || 'CREATED'} {'->'} {item.new_status}
                </p>
                {item.reason && <p className="text-xs text-[#40516A]">{item.reason}</p>}
                <p className="text-[10px] text-[#8896A4] mt-0.5">{new Date(item.created_at).toLocaleString()}</p>
              </div>
            ))}
          </div>
        </Panel>
      </div>
    </main>
  )
}

function Panel({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="rounded-xl bg-white p-6 shadow-sm">
      <h2 className="mb-4 text-sm font-black uppercase tracking-widest text-[#8896A4]">{title}</h2>
      {children}
    </section>
  )
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div className="mb-3">
      <p className="text-[10px] font-black uppercase tracking-widest text-[#8896A4]">{label}</p>
      <p className="text-sm font-bold text-[#1A1F36] mt-0.5">{value}</p>
    </div>
  )
}
