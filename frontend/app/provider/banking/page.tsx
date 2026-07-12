import Link from 'next/link'

export default function ProviderBankingPage() {
  return (
    <main className="min-h-screen bg-[#F9F6F0] px-4 py-8 text-[#1A1F36]">
      <section className="mx-auto max-w-3xl rounded-lg border border-[#E8DED4] bg-white p-6 shadow-sm">
        <p className="text-xs font-black uppercase tracking-[0.18em] text-[#C4622D]">Banking</p>
        <h1 className="mt-2 text-3xl font-black">Payout details</h1>
        <p className="mt-2 text-sm font-semibold text-[#6B7A90]">Banking details are collected during onboarding and masked after submission. Approved details require a change request before replacement.</p>
        <Link href="/provider/onboarding" className="mt-6 inline-block rounded-lg bg-[#1A1F36] px-5 py-3 text-sm font-black text-white">Open onboarding</Link>
      </section>
    </main>
  )
}
