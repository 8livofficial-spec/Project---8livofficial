'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { FileText, Pill } from 'lucide-react'
import { authedFetch } from '@/lib/apiClient'

export default function PatientPrescriptionsPage() {
  const [prescriptions, setPrescriptions] = useState<any[]>([])
  const [error, setError] = useState('')

  useEffect(() => {
    authedFetch('/api/patient/prescriptions')
      .then(async (res) => {
        const payload = await res.json()
        if (!res.ok) throw new Error(payload.error || 'Unable to load prescriptions.')
        setPrescriptions(payload.prescriptions || [])
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Unable to load prescriptions.'))
  }, [])

  return (
    <div className="space-y-6 text-[#1A1F36]">
      <div><h2 className="text-xl font-bold">My Prescriptions</h2><p className="text-xs font-medium text-[#8896A4]">Signed prescriptions issued by your doctor.</p></div>
      {error && <p className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-700">{error}</p>}
      <div className="grid gap-4">
        {prescriptions.length === 0 ? <Empty /> : prescriptions.map((rx) => {
          const order = rx.pharmacy_orders?.[0]
          return (
            <Link key={rx.id} href={`/patient/prescriptions/${rx.id}`} className="dash-card block p-5">
              <p className="text-xs font-black uppercase tracking-wider text-[#C4622D]">{rx.prescription_number}</p>
              <h3 className="mt-1 text-lg font-black">{rx.status}</h3>
              <p className="mt-2 text-sm font-semibold text-[#40516A]">{(rx.prescription_items || []).map((item: any) => item.medicine_name).join(', ') || 'Prescription medicines'}</p>
              <div className="mt-4 grid gap-3 border-t border-[#1A1F36]/6 pt-4 text-sm sm:grid-cols-3">
                <Meta label="Issued" value={rx.issued_at ? new Date(rx.issued_at).toLocaleDateString() : '-'} />
                <Meta label="Valid until" value={rx.valid_until || '-'} />
                <Meta label="Apollo order" value={order?.status || 'Pending fulfilment'} />
              </div>
            </Link>
          )
        })}
      </div>
    </div>
  )
}

function Empty() {
  return <div className="dash-card p-8 text-center"><FileText className="mx-auto mb-3 h-10 w-10 text-[#8896A4]" /><h3 className="font-black">No signed prescriptions yet</h3><p className="mt-2 text-sm font-semibold text-[#8896A4]">Your doctor-issued prescriptions will appear here.</p></div>
}

function Meta({ label, value }: { label: string; value: string }) {
  return <div><p className="text-[10px] font-black uppercase tracking-wider text-[#8896A4]">{label}</p><p className="mt-1 font-bold">{value}</p></div>
}
