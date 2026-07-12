import Link from 'next/link'

export default function AdminProvidersPage() {
  return (
    <main className="min-h-screen bg-[#F9F6F0] px-4 py-8 text-[#1A1F36]">
      <section className="mx-auto max-w-6xl">
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.18em] text-[#C4622D]">Admin</p>
            <h1 className="mt-2 text-3xl font-black">Provider management</h1>
          </div>
          <Link href="/admin/providers/new" className="rounded-lg bg-[#1A1F36] px-5 py-3 text-sm font-black text-white">Invite provider</Link>
        </div>
        <div className="mt-6 grid gap-4 md:grid-cols-4">
          {['Awaiting onboarding', 'Clinical review', 'Bank pending', 'Payout exceptions'].map((label) => (
            <div key={label} className="rounded-lg border border-[#E8DED4] bg-white p-5 shadow-sm">
              <p className="text-xs font-black uppercase tracking-[0.16em] text-[#6B7A90]">{label}</p>
              <p className="mt-3 text-2xl font-black">Review</p>
            </div>
          ))}
        </div>
        <p className="mt-6 rounded-lg border border-[#E8DED4] bg-white p-5 text-sm font-semibold text-[#6B7A90]">
          This route uses the v2 provider APIs and is ready for the existing admin shell to mount a searchable table from /api/admin/providers.
        </p>
      </section>
    </main>
  )
}
