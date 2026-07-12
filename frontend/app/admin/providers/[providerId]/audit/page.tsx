export default async function AdminProviderAuditPage({ params }: { params: Promise<{ providerId: string }> }) {
  const { providerId } = await params
  return (
    <main className="min-h-screen bg-[#F9F6F0] px-4 py-8 text-[#1A1F36]">
      <section className="mx-auto max-w-4xl rounded-lg border border-[#E8DED4] bg-white p-6 shadow-sm">
        <p className="text-xs font-black uppercase tracking-[0.18em] text-[#C4622D]">{providerId}</p>
        <h1 className="mt-2 text-3xl font-black">Audit history</h1>
        <p className="mt-2 text-sm font-semibold text-[#6B7A90]">Critical provider actions are appended to provider_audit_logs with sensitive values redacted.</p>
      </section>
    </main>
  )
}
