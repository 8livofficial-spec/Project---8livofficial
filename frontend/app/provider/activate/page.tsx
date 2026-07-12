'use client'

import { Suspense, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

export default function ProviderActivatePage() {
  return (
    <Suspense fallback={<main className="min-h-screen bg-[#F9F6F0] px-4 py-10 text-[#1A1F36]" />}>
      <ProviderActivateContent />
    </Suspense>
  )
}

function ProviderActivateContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const token = searchParams.get('token') || ''
  const [provider, setProvider] = useState<{ name: string; email: string; role: string } | null>(null)
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!token) {
      setError('Activation link is invalid or expired.')
      return
    }
    fetch('/api/provider/activate/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token }),
    })
      .then(async (response) => {
        const data = await response.json()
        if (!response.ok) throw new Error(data.error || 'Activation link is invalid or expired.')
        setProvider(data.provider)
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Activation link is invalid or expired.'))
  }, [token])

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSaving(true)
    setError('')
    try {
      const response = await fetch('/api/provider/activate/set-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Unable to activate account.')
      router.replace('/login')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to activate account.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <main className="min-h-screen bg-[#F9F6F0] px-4 py-10 text-[#1A1F36]">
      <section className="mx-auto max-w-xl rounded-lg border border-[#E8DED4] bg-white p-6 shadow-sm">
        <p className="text-xs font-black uppercase tracking-[0.18em] text-[#C4622D]">Provider activation</p>
        <h1 className="mt-2 text-3xl font-black">Set your password</h1>
        {provider && (
          <p className="mt-2 text-sm font-semibold text-[#6B7A90]">
            {provider.name} | {provider.email} | {provider.role.replaceAll('_', ' ')}
          </p>
        )}
        {error && <p className="mt-5 rounded-lg bg-red-50 p-3 text-sm font-bold text-red-700">{error}</p>}
        <form onSubmit={submit} className="mt-6 space-y-4">
          <label className="block">
            <span className="text-xs font-black uppercase tracking-[0.16em] text-[#6B7A90]">New password</span>
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="mt-2 w-full rounded-lg border border-[#E8DED4] bg-[#F9F6F0] px-4 py-3 text-sm font-semibold outline-none focus:border-[#C4622D]"
              required
            />
          </label>
          <button disabled={saving || !provider} className="rounded-lg bg-[#1A1F36] px-5 py-3 text-sm font-black text-white disabled:opacity-50">
            {saving ? 'Activating...' : 'Activate account'}
          </button>
        </form>
      </section>
    </main>
  )
}
