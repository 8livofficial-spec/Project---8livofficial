import Link from 'next/link'

export default function PharmacyRetired() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#F5F0EB] px-6 text-[#1A1F36]">
      <div className="max-w-lg rounded-2xl border border-[#1A1F36]/10 bg-white p-8 shadow-sm">
        <p className="text-xs font-black uppercase tracking-widest text-[#C4622D]">410 Gone</p>
        <h1 className="mt-3 text-2xl font-black">Pharmacy portal retired</h1>
        <p className="mt-3 text-sm font-semibold leading-6 text-[#40516A]">
          8liv now manages Apollo Pharmacy fulfilment from the admin portal. Pharmacy and pharmacist users no longer log in to 8liv.
        </p>
        <Link href="/" className="mt-6 inline-flex rounded-xl bg-[#1A1F36] px-5 py-3 text-sm font-black text-white">
          Return to login
        </Link>
      </div>
    </main>
  )
}
