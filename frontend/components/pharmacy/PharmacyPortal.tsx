'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useCallback, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import {
  AlertTriangle,
  BarChart3,
  ClipboardList,
  LayoutDashboard,
  LogOut,
  Package,
  Pill,
  Search,
  Truck,
  UserCog,
} from 'lucide-react'
import { authedFetch } from '@/lib/apiClient'
import { supabase } from '@/lib/supabaseClient'

type PortalView = 'dashboard' | 'orders' | 'inventory' | 'prescriptions' | 'delivery' | 'profile' | 'reports'

type RowRecord = Record<string, unknown>

type ApiState = {
  summary?: Record<string, number>
  orders?: RowRecord[]
  medicines?: RowRecord[]
  prescriptions?: RowRecord[]
  deliveries?: RowRecord[]
  lowStockMedicines?: RowRecord[]
  expiringMedicines?: RowRecord[]
  alerts?: RowRecord[]
  role?: string
  pharmacyId?: string | null
}

const navItems = [
  { href: '/pharmacy/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/pharmacy/orders', label: 'Orders', icon: Package },
  { href: '/pharmacy/inventory', label: 'Inventory', icon: Pill },
  { href: '/pharmacy/prescriptions', label: 'Prescriptions', icon: ClipboardList },
  { href: '/pharmacy/delivery', label: 'Delivery', icon: Truck },
  { href: '/pharmacy/reports', label: 'Reports', icon: BarChart3 },
  { href: '/pharmacy/profile', label: 'Profile', icon: UserCog },
]

const nextStatuses = ['PAYMENT_PENDING', 'PAYMENT_COMPLETED', 'PHARMACY_ACCEPTED', 'PREPARING', 'PACKED', 'READY_FOR_DISPATCH', 'OUT_FOR_DELIVERY', 'DELIVERED', 'CANCELLED']

function titleize(value: string) {
  return value.replaceAll('_', ' ').toLowerCase().replace(/\b\w/g, (char) => char.toUpperCase())
}

export default function PharmacyPortal({ view }: { view: PortalView }) {
  const pathname = usePathname()
  const router = useRouter()
  const [data, setData] = useState<ApiState>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')

  const endpoint = useMemo(() => {
    if (view === 'dashboard' || view === 'profile' || view === 'reports') return '/api/pharmacy/dashboard'
    if (view === 'orders') return `/api/pharmacy/orders?search=${encodeURIComponent(search)}&status=${encodeURIComponent(statusFilter)}`
    if (view === 'inventory') return `/api/pharmacy/inventory?search=${encodeURIComponent(search)}`
    if (view === 'prescriptions') return '/api/pharmacy/prescriptions'
    if (view === 'delivery') return '/api/pharmacy/delivery'
    return '/api/pharmacy/dashboard'
  }, [search, statusFilter, view])

  const loadData = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const res = await authedFetch(endpoint)
      const payload = await res.json()
      if (!res.ok) throw new Error(payload.error || 'Unable to load pharmacy data.')
      setData(payload)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load pharmacy data.')
    } finally {
      setLoading(false)
    }
  }, [endpoint])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadData()
  }, [loadData])

  const updateOrderStatus = async (orderId: string, nextStatus: string) => {
    const res = await authedFetch('/api/pharmacy/orders', {
      method: 'PATCH',
      body: JSON.stringify({ orderId, status: nextStatus }),
    })
    const payload = await res.json()
    if (!res.ok) {
      alert(payload.error || 'Unable to update order.')
      return
    }
    await loadData()
  }

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    document.cookie = 'user_role=; path=/; expires=Thu, 01 Jan 1970 00:00:00 UTC; SameSite=Lax'
    router.push('/')
  }

  const stats = data.summary || {}

  return (
    <div className="min-h-screen bg-[#F5F0EB] text-[#1A1F36] lg:flex">
      <aside className="bg-[#1A1F36] p-4 text-white lg:fixed lg:inset-y-0 lg:min-h-screen lg:w-64">
        <Link href="/pharmacy/dashboard" className="flex items-center gap-2 px-2 py-3 font-black text-xl">
          <span className="h-6 w-2 rounded-full bg-[#C4622D]" />
          8liv Pharmacy
        </Link>
        <nav className="mt-6 grid gap-1">
          {navItems.map((item) => {
            const Icon = item.icon
            const active = pathname === item.href
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-4 py-3 border-l-4 text-sm font-bold transition-colors ${
                  active ? 'border-[#C4622D] bg-white/10 text-white' : 'border-transparent text-white/60 hover:text-white hover:bg-white/5'
                }`}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </Link>
            )
          })}
        </nav>
        <button onClick={handleSignOut} className="mt-8 flex w-full items-center gap-2 rounded-xl px-4 py-3 text-sm font-bold text-white/60 hover:bg-white/5 hover:text-white">
          <LogOut className="h-4 w-4" />
          Sign Out
        </button>
      </aside>

      <main className="w-full p-4 lg:ml-64 lg:p-8">
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-wider text-[#C4622D]">Pharmacy Portal</p>
            <h1 className="mt-1 text-2xl font-black sm:text-3xl">{titleize(view)}</h1>
          </div>
          {['orders', 'inventory'].includes(view) && (
            <div className="flex flex-col gap-2 sm:flex-row">
              <label className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-[#8896A4]" />
                <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search" className="input pl-9" />
              </label>
              {view === 'orders' && (
                <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="input sm:w-56">
                  <option value="">All statuses</option>
                  {nextStatuses.map((status) => <option key={status} value={status}>{titleize(status)}</option>)}
                </select>
              )}
            </div>
          )}
        </div>

        {error && <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-700">{error}</div>}
        {loading ? (
          <div className="flex min-h-[50vh] items-center justify-center text-[#C4622D]">
            <div className="h-10 w-10 animate-spin rounded-full border-4 border-current border-t-transparent" />
          </div>
        ) : (
          <>
            {(view === 'dashboard' || view === 'reports') && (
              <div className="space-y-6">
                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                  {[
                    ['Today Orders', stats.todaysOrders],
                    ['Pending Verification', stats.pendingVerification],
                    ['Preparing', stats.preparingOrders],
                    ['Packed', stats.packedOrders],
                    ['Out For Delivery', stats.outForDelivery],
                    ['Delivered', stats.delivered],
                    ['Cancelled', stats.cancelled],
                    ['Revenue', `₹${Number(stats.revenue || 0).toLocaleString('en-IN')}`],
                  ].map(([label, value]) => (
                    <div key={label} className="dash-card p-5">
                      <p className="card-label">{label}</p>
                      <p className="card-value">{value || 0}</p>
                    </div>
                  ))}
                </div>
                <div className="grid gap-4 lg:grid-cols-3">
                  <AlertList title="Inventory Alerts" rows={data.alerts || []} />
                  <AlertList title="Low Stock Medicines" rows={data.lowStockMedicines || []} />
                  <AlertList title="Expiring Medicines" rows={data.expiringMedicines || []} />
                </div>
              </div>
            )}

            {view === 'orders' && (
              <Table
                headers={['Order', 'Status', 'Amount', 'Created', 'Action']}
                rows={(data.orders || []).map((order) => [
                  String(order.order_number || ''),
                  titleize(String(order.status || '')),
                  `₹${Number(order.total_amount || 0).toLocaleString('en-IN')}`,
                  order.created_at ? new Date(String(order.created_at)).toLocaleDateString() : '-',
                  <select key={String(order.id)} value="" onChange={(e) => e.target.value && updateOrderStatus(String(order.id), e.target.value)} className="input min-w-52">
                    <option value="">Update status</option>
                    {nextStatuses.map((status) => <option key={status} value={status}>{titleize(status)}</option>)}
                  </select>,
                ])}
              />
            )}

            {view === 'inventory' && (
              <Table
                headers={['Medicine', 'Batch Count', 'Stock', 'Min', 'Expiry Alert', 'Status']}
                rows={(data.medicines || []).map((med) => [
                  <div key={String(med.id)}><p className="font-black">{String(med.name || '')}</p><p className="text-xs text-[#8896A4]">{String(med.generic_name || med.brand || 'Generic')}</p></div>,
                  Array.isArray(med.medicine_batches) ? med.medicine_batches.length : 0,
                  String(med.current_stock || 0),
                  String(med.minimum_stock || 0),
                  Number(med.current_stock || 0) <= Number(med.minimum_stock || 0) ? 'Low stock' : 'Clear',
                  String(med.status || ''),
                ])}
              />
            )}

            {view === 'prescriptions' && (
              <Table
                headers={['Patient', 'Doctor', 'Prescription Date', 'Medicines', 'Order Status']}
                rows={(data.prescriptions || []).map((rx) => [
                  `${(rx.patient as RowRecord | undefined)?.first_name || 'Patient'} ${(rx.patient as RowRecord | undefined)?.last_name || ''}`.trim(),
                  String((rx.doctor as RowRecord | undefined)?.full_name || 'Assigned Doctor'),
                  rx.created_at ? new Date(String(rx.created_at)).toLocaleDateString() : '-',
                  String(rx.prescription_text || rx.prescription_type || 'Prescription'),
                  (rx.order as RowRecord | undefined)?.status ? titleize(String((rx.order as RowRecord).status)) : 'Awaiting patient order',
                ])}
              />
            )}

            {view === 'delivery' && (
              <Table
                headers={['Order', 'Status', 'ETA', 'Delivered', 'Failure']}
                rows={(data.deliveries || []).map((delivery) => [
                  String((delivery.prescription_orders as RowRecord | undefined)?.order_number || delivery.order_id || ''),
                  titleize(String(delivery.status || 'ASSIGNED')),
                  delivery.estimated_delivery_at ? new Date(String(delivery.estimated_delivery_at)).toLocaleString() : 'Not set',
                  delivery.delivered_at ? new Date(String(delivery.delivered_at)).toLocaleString() : 'Pending',
                  String(delivery.failure_reason || '-'),
                ])}
              />
            )}

            {view === 'profile' && (
              <div className="dash-card max-w-2xl p-6">
                <p className="card-label">Signed-in role</p>
                <p className="card-value">{data.role || 'Pharmacy'}</p>
                <p className="mt-4 text-sm font-semibold text-[#8896A4]">Pharmacy ID: {data.pharmacyId || 'Admin/global access'}</p>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  )
}

function AlertList({ title, rows }: { title: string; rows: RowRecord[] }) {
  return (
    <div className="dash-card p-5">
      <div className="mb-4 flex items-center gap-2">
        <AlertTriangle className="h-4 w-4 text-[#C4622D]" />
        <h2 className="font-black">{title}</h2>
      </div>
      <div className="space-y-3">
        {rows.length === 0 ? <p className="text-sm font-semibold text-[#8896A4]">No active items.</p> : rows.map((row, index) => (
          <div key={String(row.id || index)} className="rounded-xl bg-[#F5F0EB] p-3 text-sm font-bold">
            {String(row.name || row.title || row.batch_number || row.alert_type || 'Inventory item')}
          </div>
        ))}
      </div>
    </div>
  )
}

function Table({ headers, rows }: { headers: string[]; rows: ReactNode[][] }) {
  return (
    <div className="dash-card overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[760px] text-left">
          <thead className="bg-[#F5F0EB] text-[10px] font-black uppercase tracking-wider text-[#8896A4]">
            <tr>{headers.map((header) => <th key={header} className="px-5 py-4">{header}</th>)}</tr>
          </thead>
          <tbody className="divide-y divide-[#1A1F36]/6 text-sm font-semibold">
            {rows.length === 0 ? (
              <tr><td colSpan={headers.length} className="px-5 py-8 text-center text-[#8896A4]">No records found.</td></tr>
            ) : rows.map((row, index) => (
              <tr key={index} className="hover:bg-[#F5F0EB]/50">
                {row.map((cell, cellIndex) => <td key={cellIndex} className="px-5 py-4">{cell}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
