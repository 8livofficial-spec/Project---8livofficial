import Link from 'next/link'

export default async function AdminProviderDetailPage({ params }: { params: Promise<{ providerId: string }> }) {
  const { providerId } = await params
  const tabs = ['verification', 'compensation', 'payouts', 'audit']
  return (
    <main className="min-h-screen bg-[#F9F6F0] px-4 py-8 text-[#1A1F36]">
      <section className="mx-auto max-w-5xl rounded-lg border border-[#E8DED4] bg-white p-6 shadow-sm">
        <p className="text-xs font-black uppercase tracking-[0.18em] text-[#C4622D]">Provider</p>
        <h1 className="mt-2 text-3xl font-black">{providerId}</h1>
        <div className="mt-6 flex flex-wrap gap-2">
          {tabs.map((tab) => (
            <Link key={tab} href={`/admin/providers/${providerId}/${tab}`} className="rounded-lg bg-[#F9F6F0] px-4 py-2 text-sm font-black capitalize">{tab}</Link>
          ))}
        </div>
      </section>
    </main>
  )
}
