export default async function AdminPayoutBatchDetailPage({ params }: { params: Promise<{ batchId: string }> }) {
  const { batchId } = await params
  return (
    <main className="min-h-screen bg-[#F9F6F0] px-4 py-8 text-[#1A1F36]">
      <section className="mx-auto max-w-4xl rounded-lg border border-[#E8DED4] bg-white p-6 shadow-sm">
        <p className="text-xs font-black uppercase tracking-[0.18em] text-[#C4622D]">Batch</p>
        <h1 className="mt-2 text-3xl font-black">{batchId}</h1>
        <p className="mt-2 text-sm font-semibold text-[#6B7A90]">Payout batch detail route for review, approval, processing, and reconciliation evidence.</p>
      </section>
    </main>
  )
}
