'use client'

import type { ReactNode } from 'react'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { Download, Pill } from 'lucide-react'
import { authedFetch } from '@/lib/apiClient'

export default function AdminPrescriptionDetailPage() {
  const params = useParams<{ prescriptionId: string }>()
  const [data, setData] = useState<any>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    authedFetch(`/api/admin/prescriptions/${params.prescriptionId}`)
      .then(async (res) => {
        const payload = await res.json()
        if (!res.ok) throw new Error(payload.error || 'Unable to load prescription.')
        setData(payload)
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Unable to load prescription.'))
  }, [params.prescriptionId])

  const rx = data?.prescription
  const order = rx?.pharmacy_orders?.[0]

  return (
    <main className="min-h-screen bg-[#F5F0EB] p-6 text-[#1A1F36]">
      <div className="mx-auto max-w-5xl space-y-6">
        {error && <p className="rounded-lg bg-red-50 p-3 text-sm font-bold text-red-700">{error}</p>}
        {rx && (
          <>
            <div className="rounded-xl bg-white p-6 shadow-sm">
              <p className="text-xs font-black uppercase tracking-widest text-[#C4622D]">{rx.prescription_number}</p>
              <h1 className="mt-2 text-3xl font-black">Signed Prescription</h1>
              <div className="mt-4 flex flex-wrap gap-3">
                {data.signedPdfUrl && <a href={data.signedPdfUrl} target="_blank" className="inline-flex items-center gap-2 rounded-xl bg-[#1A1F36] px-4 py-3 text-sm font-black text-white"><Download className="h-4 w-4" />Signed PDF</a>}
                {order && <Link href={`/admin/pharmacy-orders/${order.id}`} className="rounded-xl border border-[#1A1F36]/10 px-4 py-3 text-sm font-black">Open fulfilment order</Link>}
              </div>
            </div>
            <section className="grid gap-4 md:grid-cols-2">
              <Panel title="Clinical Content">
                <Meta label="Diagnosis" value={rx.diagnosis} />
                <Meta label="Status" value={rx.status} />
                <Meta label="Issue date" value={rx.issued_at ? new Date(rx.issued_at).toLocaleString() : '-'} />
                <Meta label="Valid until" value={rx.valid_until || '-'} />
                <Meta label="Hash" value={rx.signature_hash || '-'} />
              </Panel>
              <Panel title="Apollo Fulfilment">
                <Meta label="Vendor" value={order?.vendor || 'APOLLO_PHARMACY'} />
                <Meta label="Order status" value={order?.status || 'Pending signed order'} />
                <Meta label="Apollo reference" value={order?.apollo_order_reference || '-'} />
                <Meta label="Tracking" value={order?.tracking_number || '-'} />
              </Panel>
            </section>
            <Panel title="Medicines">
              <div className="grid gap-3">
                {(rx.prescription_items || []).map((item: any) => (
                  <div key={item.id} className="rounded-lg border border-[#1A1F36]/8 p-4">
                    <p className="font-black"><Pill className="mr-2 inline h-4 w-4 text-[#C4622D]" />{item.medicine_name}</p>
                    <p className="mt-1 text-sm font-semibold text-[#40516A]">{item.strength} {item.dosage_form} - {item.dose} {item.route} {item.frequency} for {item.duration_value} {item.duration_unit}</p>
                    <p className="mt-1 text-xs font-semibold text-[#8896A4]">{item.food_instruction} {item.special_instruction}</p>
                  </div>
                ))}
              </div>
            </Panel>
          </>
        )}
      </div>
    </main>
  )
}

function Panel({ title, children }: { title: string; children: ReactNode }) {
  return <section className="rounded-xl bg-white p-6 shadow-sm"><h2 className="mb-4 text-sm font-black uppercase tracking-widest text-[#8896A4]">{title}</h2>{children}</section>
}

function Meta({ label, value }: { label: string; value: string }) {
  return <div className="mb-3"><p className="text-[10px] font-black uppercase tracking-widest text-[#8896A4]">{label}</p><p className="break-words text-sm font-bold">{value}</p></div>
}
