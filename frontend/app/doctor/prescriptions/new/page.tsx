'use client'

import { useSearchParams } from 'next/navigation'
import { Suspense, useState } from 'react'
import { Plus, Save, Signature } from 'lucide-react'
import { authedFetch } from '@/lib/apiClient'

const emptyItem = {
  medicine_name: '',
  generic_name: '',
  brand_name: '',
  strength: '',
  dosage_form: '',
  dose: '',
  route: '',
  frequency: '',
  duration_value: 1,
  duration_unit: 'DAYS',
  quantity: 1,
  food_instruction: '',
  special_instruction: '',
}

export default function NewDoctorPrescriptionPage() {
  return (
    <Suspense fallback={<main className="min-h-screen bg-[#F5F0EB] p-6 text-[#1A1F36]">Loading prescription builder...</main>}>
      <PrescriptionBuilder />
    </Suspense>
  )
}

function PrescriptionBuilder() {
  const searchParams = useSearchParams()
  const consultationId = searchParams.get('consultationId') || ''
  const [diagnosis, setDiagnosis] = useState('')
  const [validUntil, setValidUntil] = useState('')
  const [items, setItems] = useState<any[]>([{ ...emptyItem }])
  const [prescriptionId, setPrescriptionId] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  const payload = { diagnosis, valid_until: validUntil, items }

  const save = async () => {
    setError('')
    const endpoint = prescriptionId ? `/api/doctor/prescriptions/${prescriptionId}` : `/api/doctor/consultations/${consultationId}/prescriptions`
    const res = await authedFetch(endpoint, { method: prescriptionId ? 'PATCH' : 'POST', body: JSON.stringify(payload) })
    const data = await res.json()
    if (!res.ok) return setError(data.error || 'Unable to save prescription.')
    if (data.prescription?.id) setPrescriptionId(data.prescription.id)
    setMessage('Draft saved.')
  }

  const sign = async () => {
    setError('')
    if (!prescriptionId) await save()
    const id = prescriptionId
    if (!id) return setError('Save the draft before signing.')
    const res = await authedFetch(`/api/doctor/prescriptions/${id}/sign`, { method: 'POST', body: JSON.stringify({}) })
    const data = await res.json()
    if (!res.ok) return setError(data.error || 'Unable to sign prescription.')
    setMessage(data.alreadySigned ? 'Prescription was already signed.' : 'Prescription signed and fulfilment order created.')
  }

  return (
    <main className="min-h-screen bg-[#F5F0EB] p-6 text-[#1A1F36]">
      <div className="mx-auto max-w-5xl space-y-6">
        <div className="rounded-xl bg-white p-6 shadow-sm">
          <p className="text-xs font-black uppercase tracking-widest text-[#C4622D]">Doctor prescription builder</p>
          <h1 className="mt-2 text-3xl font-black">Structured e-prescription</h1>
          <p className="mt-1 text-sm font-bold text-[#8896A4]">Consultation: {consultationId || 'missing consultationId'}</p>
        </div>
        {error && <p className="rounded-lg bg-red-50 p-3 text-sm font-bold text-red-700">{error}</p>}
        {message && <p className="rounded-lg bg-green-50 p-3 text-sm font-bold text-green-700">{message}</p>}
        <section className="rounded-xl bg-white p-6 shadow-sm">
          <label className="block"><span className="text-xs font-black uppercase tracking-widest text-[#8896A4]">Diagnosis</span><textarea value={diagnosis} onChange={(e) => setDiagnosis(e.target.value)} className="mt-2 min-h-28 w-full rounded-lg border border-[#1A1F36]/10 p-3 text-sm font-bold" /></label>
          <label className="mt-4 block"><span className="text-xs font-black uppercase tracking-widest text-[#8896A4]">Prescription validity date</span><input type="date" value={validUntil} onChange={(e) => setValidUntil(e.target.value)} className="mt-2 rounded-lg border border-[#1A1F36]/10 p-3 text-sm font-bold" /></label>
        </section>
        <section className="space-y-4">
          {items.map((item, index) => (
            <div key={index} className="rounded-xl bg-white p-6 shadow-sm">
              <h2 className="mb-4 text-sm font-black uppercase tracking-widest text-[#8896A4]">Medicine {index + 1}</h2>
              <div className="grid gap-3 md:grid-cols-3">
                {Object.keys(emptyItem).map((key) => (
                  <label key={key} className="block">
                    <span className="text-[10px] font-black uppercase tracking-widest text-[#8896A4]">{key.replaceAll('_', ' ')}</span>
                    <input value={item[key]} type={['duration_value', 'quantity'].includes(key) ? 'number' : 'text'} onChange={(e) => setItems(items.map((row, rowIndex) => rowIndex === index ? { ...row, [key]: ['duration_value', 'quantity'].includes(key) ? Number(e.target.value) : e.target.value } : row))} className="mt-1 w-full rounded-lg border border-[#1A1F36]/10 px-3 py-2 text-sm font-bold" />
                  </label>
                ))}
              </div>
            </div>
          ))}
          <button onClick={() => setItems([...items, { ...emptyItem }])} className="inline-flex items-center gap-2 rounded-xl border border-[#1A1F36]/10 bg-white px-4 py-3 text-sm font-black"><Plus className="h-4 w-4" />Add medicine</button>
        </section>
        <div className="flex flex-wrap gap-3">
          <button onClick={save} disabled={!consultationId} className="inline-flex items-center gap-2 rounded-xl bg-[#1A1F36] px-5 py-3 text-sm font-black text-white disabled:opacity-50"><Save className="h-4 w-4" />Save draft</button>
          <button onClick={sign} disabled={!consultationId} className="inline-flex items-center gap-2 rounded-xl bg-[#C4622D] px-5 py-3 text-sm font-black text-white disabled:opacity-50"><Signature className="h-4 w-4" />Sign and issue</button>
        </div>
      </div>
    </main>
  )
}
