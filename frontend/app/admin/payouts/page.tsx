import Link from 'next/link'

export default function AdminPayoutsPage() {
  return (
    <main className="min-h-screen bg-[#F9F6F0] px-4 py-8 text-[#1A1F36]">
      <section className="mx-auto max-w-5xl">
        <p className="text-xs font-black uppercase tracking-[0.18em] text-[#C4622D]">Finance</p>
        <h1 className="mt-2 text-3xl font-black">Payout management</h1>
        <div className="mt-6 flex flex-wrap gap-2">
          <Link href="/admin/payouts/batches" className="rounded-lg bg-white px-4 py-2 text-sm font-black">Batches</Link>
          <Link href="/admin/payouts/exceptions" className="rounded-lg bg-white px-4 py-2 text-sm font-black">Exceptions</Link>
          <Link href="/admin/payouts/reconciliation" className="rounded-lg bg-white px-4 py-2 text-sm font-black">Reconciliation</Link>
        </div>
      </section>
    </main>
  )
}
