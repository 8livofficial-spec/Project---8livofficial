import Link from 'next/link'

export default function ProviderAgreementsPage() {
  return (
    <main className="min-h-screen bg-[#F9F6F0] px-4 py-8 text-[#1A1F36]">
      <section className="mx-auto max-w-3xl rounded-lg border border-[#E8DED4] bg-white p-6 shadow-sm">
        <p className="text-xs font-black uppercase tracking-[0.18em] text-[#C4622D]">Agreements</p>
        <h1 className="mt-2 text-3xl font-black">Provider agreements</h1>
        <p className="mt-2 text-sm font-semibold text-[#6B7A90]">Current versioned agreements are accepted in the onboarding wizard and stored with IP address, user agent, and document hash evidence.</p>
        <Link href="/provider/onboarding" className="mt-6 inline-block rounded-lg bg-[#1A1F36] px-5 py-3 text-sm font-black text-white">Review agreements</Link>
      </section>
    </main>
  )
}
