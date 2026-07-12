export default function AdminPayoutBatchesPage() {
  return <PayoutSection title="Payout batches" copy="Batch calculation, maker-checker approval, reservation, and processing are backed by the v2 payout tables." />
}

function PayoutSection({ title, copy }: { title: string; copy: string }) {
  return (
    <main className="min-h-screen bg-[#F9F6F0] px-4 py-8 text-[#1A1F36]">
      <section className="mx-auto max-w-4xl rounded-lg border border-[#E8DED4] bg-white p-6 shadow-sm">
        <p className="text-xs font-black uppercase tracking-[0.18em] text-[#C4622D]">Finance</p>
        <h1 className="mt-2 text-3xl font-black">{title}</h1>
        <p className="mt-2 text-sm font-semibold text-[#6B7A90]">{copy}</p>
      </section>
    </main>
  )
}
