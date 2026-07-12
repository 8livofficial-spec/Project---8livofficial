'use client'

import { useEffect, useState } from 'react'
import { authedFetch } from '@/lib/apiClient'

export default function ProviderPayoutsPage() {
  const [payouts, setPayouts] = useState<any[]>([])
  const [error, setError] = useState('')

  useEffect(() => {
    authedFetch('/api/provider/payouts')
      .then(async (response) => {
        const json = await response.json()
        if (!response.ok) throw new Error(json.error || 'Unable to load payouts.')
        setPayouts(json.payouts || [])
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Unable to load payouts.'))
  }, [])

  return (
    <main className="min-h-screen bg-[#F9F6F0] px-4 py-8 text-[#1A1F36]">
      <section className="mx-auto max-w-5xl rounded-lg border border-[#E8DED4] bg-white p-6 shadow-sm">
        <p className="text-xs font-black uppercase tracking-[0.18em] text-[#C4622D]">Payouts</p>
        <h1 className="mt-2 text-3xl font-black">Payout history</h1>
        {error && <p className="mt-4 rounded-lg bg-red-50 p-3 text-sm font-bold text-red-700">{error}</p>}
        <div className="mt-6 space-y-3">
          {payouts.map((payout) => (
            <div key={payout.id} className="rounded-lg bg-[#F9F6F0] p-4">
              <p className="font-black">Rs {Number(payout.net_amount || 0).toLocaleString('en-IN')} | {payout.status}</p>
              <p className="mt-1 text-sm font-semibold text-[#6B7A90]">{payout.payout_provider} | {payout.created_at ? new Date(payout.created_at).toLocaleDateString('en-IN') : '-'}</p>
            </div>
          ))}
          {!payouts.length && <p className="rounded-lg bg-[#F9F6F0] p-4 text-sm font-semibold text-[#6B7A90]">No payouts recorded yet.</p>}
        </div>
      </section>
    </main>
  )
}
