'use client'

import { useState } from 'react'
import { authedFetch } from '@/lib/apiClient'

export default function AdminNewProviderPage() {
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSaving(true)
    setMessage('')
    setError('')
    const form = new FormData(event.currentTarget)
    const payload = Object.fromEntries(form.entries())
    try {
      const response = await authedFetch('/api/admin/providers', {
        method: 'POST',
        body: JSON.stringify(payload),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Unable to invite provider.')
      setMessage(`Invitation queued for ${data.email}.`)
      event.currentTarget.reset()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to invite provider.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <main className="min-h-screen bg-[#F9F6F0] px-4 py-8 text-[#1A1F36]">
      <section className="mx-auto max-w-3xl rounded-lg border border-[#E8DED4] bg-white p-6 shadow-sm">
        <p className="text-xs font-black uppercase tracking-[0.18em] text-[#C4622D]">Provider invitation</p>
        <h1 className="mt-2 text-3xl font-black">Invite provider</h1>
        {message && <p className="mt-4 rounded-lg bg-emerald-50 p-3 text-sm font-bold text-emerald-700">{message}</p>}
        {error && <p className="mt-4 rounded-lg bg-red-50 p-3 text-sm font-bold text-red-700">{error}</p>}
        <form onSubmit={submit} className="mt-6 grid gap-4 md:grid-cols-2">
          <Input name="fullName" label="Full name" />
          <Input name="email" label="Email" type="email" />
          <Input name="phoneNumber" label="Phone number" />
          <label className="block">
            <span className="text-xs font-black uppercase tracking-[0.16em] text-[#6B7A90]">Role</span>
            <select name="role" required className="mt-2 w-full rounded-lg border border-[#E8DED4] bg-[#F9F6F0] px-4 py-3 text-sm font-semibold outline-none focus:border-[#C4622D]">
              <option value="DOCTOR">Doctor</option>
              <option value="DIETITIAN">Dietitian</option>
              <option value="NUTRITIONIST">Nutritionist</option>
              <option value="FITNESS_COACH">Fitness coach</option>
            </select>
          </label>
          <Input name="specialization" label="Specialization" required={false} />
          <Input name="internalReference" label="Internal reference" required={false} />
          <Input name="joiningDate" label="Joining date" type="date" required={false} />
          <Input name="compensationModelPlaceholder" label="Compensation model" required={false} />
          <label className="block md:col-span-2">
            <span className="text-xs font-black uppercase tracking-[0.16em] text-[#6B7A90]">Internal notes</span>
            <textarea name="internalNotes" className="mt-2 min-h-24 w-full rounded-lg border border-[#E8DED4] bg-[#F9F6F0] px-4 py-3 text-sm font-semibold outline-none focus:border-[#C4622D]" />
          </label>
          <button disabled={saving} className="rounded-lg bg-[#1A1F36] px-5 py-3 text-sm font-black text-white disabled:opacity-50 md:col-span-2">
            {saving ? 'Sending...' : 'Send secure activation email'}
          </button>
        </form>
      </section>
    </main>
  )
}

function Input({ label, name, type = 'text', required = true }: { label: string; name: string; type?: string; required?: boolean }) {
  return (
    <label className="block">
      <span className="text-xs font-black uppercase tracking-[0.16em] text-[#6B7A90]">{label}{required ? ' *' : ''}</span>
      <input name={name} type={type} required={required} className="mt-2 w-full rounded-lg border border-[#E8DED4] bg-[#F9F6F0] px-4 py-3 text-sm font-semibold outline-none focus:border-[#C4622D]" />
    </label>
  )
}
