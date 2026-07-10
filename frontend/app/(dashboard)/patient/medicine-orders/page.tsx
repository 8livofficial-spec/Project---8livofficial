'use client'

import { useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { Download, FileText, Package, Truck } from 'lucide-react'
import { authedFetch } from '@/lib/apiClient'

type MedicineOrder = {
  id: string
  order_number: string
  status: string
  total_amount?: number | string | null
  delivery_eta?: string | null
  invoice_id?: string | null
  created_at: string
  prescription_order_items?: { medicine_name: string }[]
  delivery_tracking?: unknown[]
}

function titleize(value: string) {
  return value.replaceAll('_', ' ').toLowerCase().replace(/\b\w/g, (char) => char.toUpperCase())
}

export default function PatientMedicineOrdersPage() {
  const [orders, setOrders] = useState<MedicineOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const loadOrders = async () => {
      setLoading(true)
      try {
        const res = await authedFetch('/api/patient/medicine-orders')
        const payload = await res.json()
        if (!res.ok) throw new Error(payload.error || 'Unable to load medicine orders.')
        setOrders(payload.orders || [])
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unable to load medicine orders.')
      } finally {
        setLoading(false)
      }
    }
    loadOrders()
  }, [])

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center text-[#C4622D]">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-current border-t-transparent" />
      </div>
    )
  }

  return (
    <div className="space-y-6 text-[#1A1F36]">
      <div>
        <h2 className="text-xl font-bold">My Medicine Orders</h2>
        <p className="text-xs font-medium text-[#8896A4]">Track pharmacy fulfillment, invoices, and delivery updates.</p>
      </div>

      {error && <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-700">{error}</div>}

      <div className="grid gap-4">
        {orders.length === 0 ? (
          <div className="dash-card p-8 text-center">
            <Package className="mx-auto mb-3 h-10 w-10 text-[#8896A4]" />
            <h3 className="font-black">No medicine orders yet</h3>
            <p className="mt-2 text-sm font-semibold text-[#8896A4]">Orders created from prescriptions will appear here.</p>
          </div>
        ) : orders.map((order) => (
          <div key={order.id} className="dash-card p-5">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p className="text-xs font-black uppercase tracking-wider text-[#C4622D]">{order.order_number}</p>
                <h3 className="mt-1 text-lg font-black">{titleize(order.status)}</h3>
                <p className="mt-1 text-sm font-semibold text-[#8896A4]">
                {(order.prescription_order_items || []).map((item) => item.medicine_name).join(', ') || 'Prescription medicines'}
                </p>
              </div>
              <div className="grid gap-2 sm:grid-cols-3">
                <Action label="Invoice" icon={<Download className="h-4 w-4" />} disabled={!order.invoice_id} />
                <Action label="Prescription" icon={<FileText className="h-4 w-4" />} />
                <Action label="Tracking" icon={<Truck className="h-4 w-4" />} disabled={!order.delivery_tracking?.length} />
              </div>
            </div>
            <div className="mt-4 grid gap-3 border-t border-[#1A1F36]/6 pt-4 text-sm sm:grid-cols-3">
              <Meta label="Amount" value={`₹${Number(order.total_amount || 0).toLocaleString('en-IN')}`} />
              <Meta label="ETA" value={order.delivery_eta ? new Date(order.delivery_eta).toLocaleString() : 'To be assigned'} />
              <Meta label="Created" value={new Date(order.created_at).toLocaleDateString()} />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function Action({ label, icon, disabled }: { label: string; icon: ReactNode; disabled?: boolean }) {
  return (
    <button disabled={disabled} className="flex items-center justify-center gap-2 rounded-xl border border-[#1A1F36]/10 px-4 py-3 text-xs font-black uppercase tracking-wider text-[#1A1F36] disabled:cursor-not-allowed disabled:opacity-40">
      {icon}
      {label}
    </button>
  )
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[10px] font-black uppercase tracking-wider text-[#8896A4]">{label}</p>
      <p className="mt-1 font-bold">{value}</p>
    </div>
  )
}
