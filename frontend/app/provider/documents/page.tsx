import Link from 'next/link'

export default function ProviderDocumentsPage() {
  return (
    <main className="min-h-screen bg-[#F9F6F0] px-4 py-8 text-[#1A1F36]">
      <section className="mx-auto max-w-3xl rounded-lg border border-[#E8DED4] bg-white p-6 shadow-sm">
        <p className="text-xs font-black uppercase tracking-[0.18em] text-[#C4622D]">Documents</p>
        <h1 className="mt-2 text-3xl font-black">Private provider documents</h1>
        <p className="mt-2 text-sm font-semibold text-[#6B7A90]">The v2 schema stores private document versions, hashes, verification status, and signed-download audit metadata. Upload UI can be expanded from this route.</p>
        <Link href="/provider/onboarding" className="mt-6 inline-block rounded-lg bg-[#1A1F36] px-5 py-3 text-sm font-black text-white">Return to onboarding</Link>
      </section>
    </main>
  )
}
