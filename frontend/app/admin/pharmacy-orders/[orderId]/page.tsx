'use client'

import type { ReactNode } from 'react'
import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { authedFetch } from '@/lib/apiClient'

const statuses = ['UNDER_REVIEW', 'READY_TO_PLACE', 'ORDER_PLACED_WITH_APOLLO', 'CONFIRMED_BY_APOLLO', 'PARTIALLY_AVAILABLE', 'UNAVAILABLE', 'PACKED', 'SHIPPED', 'OUT_FOR_DELIVERY', 'DELIVERED', 'CANCELLED', 'REFUND_PENDING', 'REFUNDED']

export default function AdminPharmacyOrderDetailPage() {
  const params = useParams<{ orderId: string }>()
  const [order, setOrder] = useState<any>(null)
  const [form, setForm] = useState<any>({})
  const [error, setError] = useState('')

  const load = () => authedFetch(`/api/admin/pharmacy-orders/${params.orderId}`).then(async (res) => {
    const payload = await res.json()
    if (!res.ok) throw new Error(payload.error || 'Unable to load order.')
    setOrder(payload.order)
    setForm(payload.order || {})
  }).catch((err) => setError(err instanceof Error ? err.message : 'Unable to load order.'))

  useEffect(() => { load() }, [params.orderId])

  const patch = async () => {
    setError('')
    const res = await authedFetch(`/api/admin/pharmacy-orders/${params.orderId}`, { method: 'PATCH', body: JSON.stringify(form) })
    const payload = await res.json()
    if (!res.ok) return setError(payload.error || 'Unable to update order.')
    load()
  }

  const status = async (next: string) => {
    setError('')
    const res = await authedFetch(`/api/admin/pharmacy-orders/${params.orderId}/status`, { method: 'POST', body: JSON.stringify({ status: next, version: order.version }) })
    const payload = await res.json()
    if (!res.ok) return setError(payload.error || 'Unable to update status.')
    load()
  }

  if (!order) return <main className="min-h-screen bg-[#F5F0EB] p-6 text-[#1A1F36]">{error || 'Loading...'}</main>
  const rx = order.prescriptions

  return (
    <main className="min-h-screen bg-[#F5F0EB] p-6 text-[#1A1F36]">
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="rounded-xl bg-white p-6 shadow-sm"><p className="text-xs font-black uppercase tracking-widest text-[#C4622D]">Apollo fulfilment</p><h1 className="mt-2 text-3xl font-black">{order.status}</h1><p className="mt-1 text-sm font-bold text-[#8896A4]">{rx?.prescription_number}</p></div>
        {error && <p className="rounded-lg bg-red-50 p-3 text-sm font-bold text-red-700">{error}</p>}
        <section className="grid gap-4 lg:grid-cols-2">
          <Panel title="Prescription information">
            <Meta label="Diagnosis" value={rx?.diagnosis || '-'} />
            {(rx?.prescription_items || []).map((item: any) => <Meta key={item.id} label={item.medicine_name} value={`${item.dose} ${item.route} ${item.frequency} for ${item.duration_value} ${item.duration_unit}`} />)}
          </Panel>
          <Panel title="Apollo fulfilment information">
            {['apollo_order_reference', 'order_amount', 'currency', 'estimated_delivery_at', 'courier_name', 'tracking_number', 'unavailability_reason', 'internal_notes'].map((key) => (
              <label key={key} className="mb-3 block"><span className="text-[10px] font-black uppercase tracking-widest text-[#8896A4]">{key.replaceAll('_', ' ')}</span><input value={form[key] || ''} onChange={(e) => setForm({ ...form, [key]: e.target.value })} className="mt-1 w-full rounded-lg border border-[#1A1F36]/10 px-3 py-2 text-sm font-bold" /></label>
            ))}
            <button onClick={patch} className="rounded-xl bg-[#1A1F36] px-4 py-3 text-sm font-black text-white">Save operational details</button>
          </Panel>
        </section>
        <Panel title="Status actions">
          <div className="flex flex-wrap gap-2">{statuses.map((item) => <button key={item} onClick={() => status(item)} className="rounded-lg border border-[#1A1F36]/10 bg-white px-3 py-2 text-xs font-black">{item}</button>)}</div>
        </Panel>
        <Panel title="Status history">
          <div className="space-y-2">{(order.pharmacy_order_status_history || []).map((item: any) => <p key={item.id} className="text-sm font-bold">{item.previous_status || 'START'} {'->'} {item.new_status} <span className="text-[#8896A4]">{new Date(item.created_at).toLocaleString()}</span></p>)}</div>
        </Panel>
      </div>
    </main>
  )
}

function Panel({ title, children }: { title: string; children: ReactNode }) {
  return <section className="rounded-xl bg-white p-6 shadow-sm"><h2 className="mb-4 text-sm font-black uppercase tracking-widest text-[#8896A4]">{title}</h2>{children}</section>
}

function Meta({ label, value }: { label: string; value: string }) {
  return <div className="mb-3"><p className="text-[10px] font-black uppercase tracking-widest text-[#8896A4]">{label}</p><p className="text-sm font-bold">{value}</p></div>
}
