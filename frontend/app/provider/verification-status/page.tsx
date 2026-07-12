'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { authedFetch } from '@/lib/apiClient'

export default function ProviderVerificationStatusPage() {
  const [data, setData] = useState<any>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    authedFetch('/api/provider/onboarding')
      .then(async (response) => {
        const json = await response.json()
        if (!response.ok) throw new Error(json.error || 'Unable to load verification status.')
        setData(json)
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Unable to load verification status.'))
  }, [])

  const profile = data?.profile

  return (
    <main className="min-h-screen bg-[#F9F6F0] px-4 py-8 text-[#1A1F36]">
      <section className="mx-auto max-w-4xl rounded-lg border border-[#E8DED4] bg-white p-6 shadow-sm">
        <p className="text-xs font-black uppercase tracking-[0.18em] text-[#C4622D]">Verification status</p>
        <h1 className="mt-2 text-3xl font-black">{profile?.full_name || 'Provider review'}</h1>
        {error && <p className="mt-4 rounded-lg bg-red-50 p-3 text-sm font-bold text-red-700">{error}</p>}
        <div className="mt-6 grid gap-3 md:grid-cols-4">
          <Status label="Onboarding" value={profile?.onboarding_status} />
          <Status label="Clinical" value={profile?.clinical_verification_status} />
          <Status label="Bank" value={profile?.bank_verification_status} />
          <Status label="Payout" value={profile?.payout_status} />
        </div>
        <div className="mt-6 space-y-3">
          {(data?.reviews || []).map((review: any) => (
            <div key={review.id} className="rounded-lg bg-[#F9F6F0] p-4">
              <p className="text-sm font-black">{review.section} | {review.decision}</p>
              {review.provider_visible_feedback && <p className="mt-1 text-sm font-semibold text-[#6B7A90]">{review.provider_visible_feedback}</p>}
            </div>
          ))}
        </div>
        <Link href="/provider/onboarding" className="mt-6 inline-block rounded-lg bg-[#1A1F36] px-5 py-3 text-sm font-black text-white">Update onboarding</Link>
      </section>
    </main>
  )
}

function Status({ label, value }: { label: string; value?: string }) {
  return (
    <div className="rounded-lg bg-[#F9F6F0] p-4">
      <p className="text-xs font-black uppercase tracking-[0.16em] text-[#6B7A90]">{label}</p>
      <p className="mt-2 text-sm font-black">{value || 'Pending'}</p>
    </div>
  )
}
