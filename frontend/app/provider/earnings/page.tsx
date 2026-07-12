'use client'

import { useEffect, useState } from 'react'
import { authedFetch } from '@/lib/apiClient'

export default function ProviderEarningsPage() {
  const [earnings, setEarnings] = useState<any[]>([])
  const [error, setError] = useState('')

  useEffect(() => {
    authedFetch('/api/provider/earnings')
      .then(async (response) => {
        const json = await response.json()
        if (!response.ok) throw new Error(json.error || 'Unable to load earnings.')
        setEarnings(json.earnings || [])
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Unable to load earnings.'))
  }, [])

  return (
    <main className="min-h-screen bg-[#F9F6F0] px-4 py-8 text-[#1A1F36]">
      <section className="mx-auto max-w-5xl rounded-lg border border-[#E8DED4] bg-white p-6 shadow-sm">
        <p className="text-xs font-black uppercase tracking-[0.18em] text-[#C4622D]">Earnings</p>
        <h1 className="mt-2 text-3xl font-black">Earnings ledger</h1>
        {error && <p className="mt-4 rounded-lg bg-red-50 p-3 text-sm font-bold text-red-700">{error}</p>}
        <div className="mt-6 overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead><tr className="border-b"><th className="py-3">Service</th><th>Status</th><th>Amount</th><th>Hold reason</th><th>Earned</th></tr></thead>
            <tbody>
              {earnings.map((earning) => (
                <tr key={earning.id} className="border-b">
                  <td className="py-3 font-bold">{earning.service_type}</td>
                  <td>{earning.status}</td>
                  <td>Rs {Number(earning.net_amount || 0).toLocaleString('en-IN')}</td>
                  <td>{earning.hold_reason || '-'}</td>
                  <td>{earning.earned_at ? new Date(earning.earned_at).toLocaleDateString('en-IN') : '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {!earnings.length && <p className="mt-5 rounded-lg bg-[#F9F6F0] p-4 text-sm font-semibold text-[#6B7A90]">No earnings recorded yet.</p>}
        </div>
      </section>
    </main>
  )
}
