'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { Download, Pill } from 'lucide-react'
import { authedFetch } from '@/lib/apiClient'

export default function PatientPrescriptionDetailPage() {
  const params = useParams<{ prescriptionId: string }>()
  const [rx, setRx] = useState<any>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    authedFetch(`/api/patient/prescriptions/${params.prescriptionId}`)
      .then(async (res) => {
        const payload = await res.json()
        if (!res.ok) throw new Error(payload.error || 'Unable to load prescription.')
        setRx(payload.prescription)
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Unable to load prescription.'))
  }, [params.prescriptionId])

  const download = async () => {
    const res = await authedFetch(`/api/patient/prescriptions/${params.prescriptionId}/pdf`)
    const payload = await res.json()
    if (!res.ok) return setError(payload.error || 'Unable to open signed prescription.')
    window.open(payload.url, '_blank', 'noopener,noreferrer')
  }

  if (!rx) return <div className="space-y-4 text-[#1A1F36]">{error || 'Loading prescription...'}</div>
  const order = rx.pharmacy_orders?.[0]

  return (
    <div className="space-y-6 text-[#1A1F36]">
      {error && <p className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-700">{error}</p>}
      <div className="dash-card p-6">
        <p className="text-xs font-black uppercase tracking-wider text-[#C4622D]">{rx.prescription_number}</p>
        <h2 className="mt-1 text-xl font-black">Signed prescription</h2>
        <button onClick={download} className="mt-4 inline-flex items-center gap-2 rounded-xl bg-[#1A1F36] px-4 py-3 text-xs font-black uppercase tracking-wider text-white"><Download className="h-4 w-4" />Download signed prescription</button>
      </div>
      <div className="dash-card p-6">
        <h3 className="mb-4 text-sm font-black uppercase tracking-widest text-[#8896A4]">Medicines</h3>
        <div className="grid gap-3">
          {(rx.prescription_items || []).map((item: any) => (
            <div key={item.id} className="rounded-xl border border-[#1A1F36]/8 p-4">
              <p className="font-black"><Pill className="mr-2 inline h-4 w-4 text-[#C4622D]" />{item.medicine_name}</p>
              <p className="mt-1 text-sm font-semibold text-[#40516A]">{item.dose} {item.route} {item.frequency} for {item.duration_value} {item.duration_unit}</p>
              <p className="mt-1 text-xs font-semibold text-[#8896A4]">{item.food_instruction} {item.special_instruction}</p>
            </div>
          ))}
        </div>
      </div>
      <div className="dash-card p-6">
        <h3 className="mb-4 text-sm font-black uppercase tracking-widest text-[#8896A4]">Apollo fulfilment</h3>
        <Meta label="Partner" value="Apollo Pharmacy" />
        <Meta label="Order status" value={order?.status || 'Pending admin review'} />
        <Meta label="Expected delivery" value={order?.estimated_delivery_at ? new Date(order.estimated_delivery_at).toLocaleString() : 'To be updated'} />
        <Meta label="Courier" value={order?.courier_name || '-'} />
        <Meta label="Tracking number" value={order?.tracking_number || '-'} />
      </div>
    </div>
  )
}

function Meta({ label, value }: { label: string; value: string }) {
  return <div className="mb-3"><p className="text-[10px] font-black uppercase tracking-wider text-[#8896A4]">{label}</p><p className="mt-1 font-bold">{value}</p></div>
}
