'use client'

import { useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { Building2, IndianRupee, PackageCheck, RefreshCw } from 'lucide-react'
import { authedFetch } from '@/lib/apiClient'

type AdminPharmacyData = {
  pharmacies?: {
    id: string
    name: string
    license_number: string
    status: string
    contact_email?: string | null
    contact_phone?: string | null
  }[]
  summary?: {
    totalRevenue?: number
    activeOrders?: number
  }
}

export default function AdminPharmacyPage() {
  const [data, setData] = useState<AdminPharmacyData>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const loadData = async () => {
    setLoading(true)
    setError('')
    try {
      const res = await authedFetch('/api/admin/pharmacy')
      const payload = await res.json()
      if (!res.ok) throw new Error(payload.error || 'Unable to load pharmacy management.')
      setData(payload)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load pharmacy management.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  return (
    <main className="min-h-screen bg-[#F5F0EB] p-6 text-[#1A1F36] lg:p-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-wider text-[#C4622D]">Admin</p>
          <h1 className="text-3xl font-black">Pharmacy Management</h1>
        </div>
        <button onClick={loadData} className="rounded-xl bg-[#1A1F36] p-3 text-white">
          <RefreshCw className="h-5 w-5" />
        </button>
      </div>
      {error && <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-700">{error}</div>}
      {loading ? (
        <div className="flex min-h-[50vh] items-center justify-center text-[#C4622D]">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-current border-t-transparent" />
        </div>
      ) : (
        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-3">
            <Kpi icon={<IndianRupee />} label="Revenue" value={`₹${Number(data.summary?.totalRevenue || 0).toLocaleString('en-IN')}`} />
            <Kpi icon={<PackageCheck />} label="Active Orders" value={data.summary?.activeOrders || 0} />
            <Kpi icon={<Building2 />} label="Pharmacies" value={data.pharmacies?.length || 0} />
          </div>
          <div className="dash-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-left">
                <thead className="bg-[#F5F0EB] text-[10px] font-black uppercase tracking-wider text-[#8896A4]">
                  <tr><th className="px-5 py-4">Pharmacy</th><th className="px-5 py-4">License</th><th className="px-5 py-4">Status</th><th className="px-5 py-4">Contact</th></tr>
                </thead>
                <tbody className="divide-y divide-[#1A1F36]/6 text-sm font-semibold">
                  {(data.pharmacies || []).map((pharmacy) => (
                    <tr key={pharmacy.id}>
                      <td className="px-5 py-4 font-black">{pharmacy.name}</td>
                      <td className="px-5 py-4">{pharmacy.license_number}</td>
                      <td className="px-5 py-4">{pharmacy.status}</td>
                      <td className="px-5 py-4">{pharmacy.contact_email || pharmacy.contact_phone || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}

function Kpi({ icon, label, value }: { icon: ReactNode; label: string; value: ReactNode }) {
  return (
    <div className="dash-card p-5">
      <div className="mb-3 text-[#C4622D]">{icon}</div>
      <p className="card-label">{label}</p>
      <p className="card-value">{value}</p>
    </div>
  )
}
