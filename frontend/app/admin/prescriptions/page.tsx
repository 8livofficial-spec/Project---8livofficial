'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { FileText, Search } from 'lucide-react'
import { authedFetch } from '@/lib/apiClient'

export default function AdminPrescriptionsPage() {
  const [prescriptions, setPrescriptions] = useState<any[]>([])
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    const load = async () => {
      try {
        const params = new URLSearchParams()
        if (search) params.set('search', search)
        if (status) params.set('status', status)
        const res = await authedFetch(`/api/admin/prescriptions?${params}`)
        const payload = await res.json()
        if (!res.ok) throw new Error(payload.error || 'Unable to load prescriptions.')
        setPrescriptions(payload.prescriptions || [])
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unable to load prescriptions.')
      }
    }
    load()
  }, [search, status])

  return (
    <main className="min-h-screen bg-[#F5F0EB] p-6 text-[#1A1F36]">
      <div className="mx-auto max-w-7xl space-y-6">
        <Header title="Prescription Fulfilment" subtitle="New prescriptions and Apollo fulfilment readiness." />
        <div className="flex flex-col gap-3 rounded-xl bg-white p-4 shadow-sm md:flex-row">
          <label className="flex flex-1 items-center gap-2 rounded-lg border border-[#1A1F36]/10 px-3">
            <Search className="h-4 w-4 text-[#8896A4]" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Prescription number" className="w-full py-3 text-sm font-semibold outline-none" />
          </label>
          <select value={status} onChange={(e) => setStatus(e.target.value)} className="rounded-lg border border-[#1A1F36]/10 px-3 py-3 text-sm font-bold">
            <option value="">All statuses</option>
            {['ISSUED', 'SIGNED', 'DRAFT', 'REPLACED', 'CANCELLED', 'EXPIRED'].map((item) => <option key={item}>{item}</option>)}
          </select>
        </div>
        {error && <p className="rounded-lg bg-red-50 p-3 text-sm font-bold text-red-700">{error}</p>}
        <div className="overflow-hidden rounded-xl bg-white shadow-sm">
          <table className="w-full text-left text-sm">
            <thead className="bg-[#1A1F36] text-xs uppercase tracking-wider text-white">
              <tr><th className="p-4">Prescription</th><th>Status</th><th>Issued</th><th>Order</th><th>Updated</th></tr>
            </thead>
            <tbody className="divide-y divide-[#1A1F36]/8">
              {prescriptions.map((rx) => {
                const order = rx.pharmacy_orders?.[0]
                return (
                  <tr key={rx.id}>
                    <td className="p-4">
                      <Link href={`/admin/prescriptions/${rx.id}`} className="font-black text-[#C4622D]">{rx.prescription_number}</Link>
                      <p className="mt-1 text-xs font-semibold text-[#8896A4]">{rx.consultation_id}</p>
                    </td>
                    <td className="font-bold">{rx.status}</td>
                    <td>{rx.issued_at ? new Date(rx.issued_at).toLocaleString() : '-'}</td>
                    <td>{order ? <Link className="font-bold text-[#C4622D]" href={`/admin/pharmacy-orders/${order.id}`}>{order.status}</Link> : '-'}</td>
                    <td>{new Date(rx.updated_at || rx.created_at).toLocaleString()}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  )
}

function Header({ title, subtitle }: { title: string; subtitle: string }) {
  return <div><p className="text-xs font-black uppercase tracking-widest text-[#C4622D]"><FileText className="mr-2 inline h-4 w-4" />Prescription Fulfilment</p><h1 className="mt-2 text-3xl font-black">{title}</h1><p className="mt-1 text-sm font-semibold text-[#40516A]">{subtitle}</p></div>
}
