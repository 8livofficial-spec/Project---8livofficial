'use client'

import { useCallback, useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { AlertCircle, CheckCircle2, Download, FileText, Loader2, Pill } from 'lucide-react'
import { authedFetch } from '@/lib/apiClient'

async function readJsonResponse(response: Response) {
  const contentType = response.headers.get('content-type') || ''
  if (!contentType.includes('application/json')) {
    throw new Error('The prescription service returned an unexpected response. Please try again.')
  }
  return response.json()
}

export default function PatientPrescriptionDetailPage() {
  const params = useParams<{ prescriptionId: string }>()
  const [rx, setRx] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [downloadingPdf, setDownloadingPdf] = useState(false)
  const [error, setError] = useState('')

  const loadData = useCallback(async () => {
    setLoading(true)
    setError('')

    try {
      const response = await authedFetch(`/api/patient/prescriptions/${params.prescriptionId}`)
      const payload = await readJsonResponse(response)
      if (!response.ok) throw new Error(payload.error || 'Unable to load prescription.')
      setRx(payload.prescription)
    } catch (err) {
      setRx(null)
      setError(err instanceof Error ? err.message : 'Unable to load prescription.')
    } finally {
      setLoading(false)
    }
  }, [params.prescriptionId])

  useEffect(() => {
    void loadData()
  }, [loadData])

  const download = async () => {
    try {
      setDownloadingPdf(true)
      setError('')
      const response = await authedFetch(`/api/patient/prescriptions/${params.prescriptionId}/pdf?download=1`)

      if (!response.ok) {
        const contentType = response.headers.get('content-type') || ''
        const payload = contentType.includes('application/json') ? await response.json() : null
        throw new Error(payload?.error || 'Unable to download signed prescription.')
      }

      const blob = await response.blob()
      const blobUrl = window.URL.createObjectURL(blob)
      const anchor = document.createElement('a')
      anchor.href = blobUrl
      anchor.download = `8LIV-Prescription-${rx?.prescription_number || params.prescriptionId}.pdf`
      document.body.appendChild(anchor)
      anchor.click()
      anchor.remove()
      window.URL.revokeObjectURL(blobUrl)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to download prescription.')
    } finally {
      setDownloadingPdf(false)
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-48 items-center justify-center text-slate-600" role="status">
        <Loader2 className="me-2 h-5 w-5 animate-spin text-[#0F766E]" aria-hidden="true" />
        <span className="text-sm font-semibold">Loading your prescription…</span>
      </div>
    )
  }

  if (!rx) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-red-900" role="alert">
        <div className="flex items-start gap-3">
          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
          <div>
            <h2 className="text-base font-bold">We couldn’t load this prescription</h2>
            <p className="mt-1 text-sm">{error}</p>
            <button
              type="button"
              onClick={() => void loadData()}
              className="mt-4 min-h-11 rounded-lg bg-red-900 px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-red-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-700 focus-visible:ring-offset-2"
            >
              Try again
            </button>
          </div>
        </div>
      </div>
    )
  }

  const cycleNumber = rx.treatment_cycles?.cycle_number || null
  const medications = rx.prescription_items || []

  return (
    <div className="space-y-6 text-[#0F172A]">
      {error && (
        <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-900" role="alert">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          <p className="font-semibold">{error}</p>
        </div>
      )}

      <section className="dash-card p-6" aria-labelledby="prescription-title">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="break-all text-xs font-black uppercase tracking-wider text-[#0F766E]">
                {rx.prescription_number}
              </span>
              {cycleNumber && (
                <span className="rounded-md bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-800">
                  Treatment cycle {cycleNumber}
                </span>
              )}
            </div>
            <h1 id="prescription-title" className="mt-2 text-2xl font-black tracking-tight sm:text-3xl">
              Official e-Prescription
            </h1>
            <p className="mt-1 text-sm font-medium text-slate-600">
              Authorized{' '}
              {new Intl.DateTimeFormat('en-IN', {
                day: 'numeric',
                month: 'short',
                year: 'numeric',
              }).format(new Date(rx.issued_at || rx.created_at))}
            </p>
          </div>

          <button
            type="button"
            onClick={download}
            disabled={downloadingPdf}
            className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-lg bg-[#0F172A] px-4 py-3 text-sm font-bold text-white shadow-sm transition-colors hover:bg-[#0F766E] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0F766E] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {downloadingPdf ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            ) : (
              <Download className="h-4 w-4" aria-hidden="true" />
            )}
            {downloadingPdf ? 'Preparing PDF…' : 'Download signed PDF'}
          </button>
        </div>
      </section>

      <section className="dash-card p-6" aria-labelledby="clinical-treatment-title">
        <div className="flex items-center gap-3 border-b border-slate-200 pb-4">
          <Pill className="h-5 w-5 text-[#0F766E]" aria-hidden="true" />
          <h2 id="clinical-treatment-title" className="text-lg font-bold">
            Authorized clinical treatment
          </h2>
        </div>

        {medications.length > 0 ? (
          <div className="divide-y divide-slate-200">
            {medications.map((item: any) => (
              <article key={item.id} className="py-5 first:pt-5 last:pb-0">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <h3 className="break-words text-base font-bold">
                      {item.medicine_name}
                      {item.strength && <span className="ms-2 text-sm font-semibold text-slate-600">({item.strength})</span>}
                    </h3>
                    <p className="mt-1 text-sm font-medium leading-6 text-slate-700">
                      {[item.dose, item.route, item.frequency].filter(Boolean).join(' • ')}
                      {item.duration_value && item.duration_unit
                        ? ` for ${item.duration_value} ${String(item.duration_unit).toLowerCase()}`
                        : ''}
                    </p>
                  </div>
                  {item.quantity != null && (
                    <span className="w-fit shrink-0 rounded-md bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-700">
                      Quantity: {item.quantity}
                    </span>
                  )}
                </div>
                {(item.food_instruction || item.special_instruction) && (
                  <p className="mt-2 max-w-[75ch] text-sm leading-6 text-slate-600">
                    {[item.food_instruction, item.special_instruction].filter(Boolean).join(' ')}
                  </p>
                )}
              </article>
            ))}
          </div>
        ) : (
          <p className="py-6 text-sm text-slate-600">No medication items are listed on this prescription.</p>
        )}
      </section>

      <section className="flex items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-5 text-emerald-950">
        <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-700" aria-hidden="true" />
        <div>
          <h2 className="text-sm font-bold">Your signed prescription is ready</h2>
          <p className="mt-1 max-w-[75ch] text-sm leading-6 text-emerald-900">
            Download the signed PDF and present it to any licensed pharmacy of your choice. 8Liv does not require fulfillment through a specific pharmacy.
          </p>
        </div>
        <FileText className="ms-auto hidden h-5 w-5 shrink-0 text-emerald-700 sm:block" aria-hidden="true" />
      </section>
    </div>
  )
}
