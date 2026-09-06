'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { FileText, Pill, ShieldCheck, CheckCircle2, AlertCircle, ArrowRight, Download, Clock } from 'lucide-react'
import { authedFetch } from '@/lib/apiClient'

const STATUS_LABELS: Record<string, string> = {
  PENDING_ASSIGNMENT: 'Pending pharmacy allocation',
  RECEIVED: 'Order sent to pharmacy',
  ACKNOWLEDGED: 'Pharmacy processing',
  STOCK_CONFIRMED: 'Stock confirmed',
  PREPARING: 'Medication being packed',
  DISPATCHED: 'Dispatched & in transit',
  DELIVERED: 'Delivered',
  CLARIFICATION_REQUIRED: 'In clinical review',
  UNABLE_TO_FULFILL: 'Unable to fulfill',
  CANCELLED: 'Cancelled',
}

export default function PatientPrescriptionsPage() {
  const [prescriptions, setPrescriptions] = useState<any[]>([])
  const [activePrescription, setActivePrescription] = useState<any | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    setLoading(true)
    authedFetch('/api/patient/prescriptions')
      .then(async (res) => {
        const payload = await res.json()
        if (!res.ok) throw new Error(payload.error || 'Unable to load prescriptions.')
        setPrescriptions(payload.prescriptions || [])
        setActivePrescription(payload.activePrescription || (payload.prescriptions || []).find((rx: any) => !['DRAFT', 'REVOKED', 'CANCELLED', 'REPLACED'].includes(rx.status)) || null)
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Unable to load prescriptions.'))
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="space-y-6 text-[#1A1F36]">
      <div>
        <h2 className="text-2xl font-black font-sora">My Prescriptions</h2>
        <p className="text-xs font-semibold text-[#8896A4] mt-1">
          Official digital prescriptions authored and authorized by your 8LIV care team.
        </p>
      </div>

      {error && (
        <p className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-700">
          {error}
        </p>
      )}

      {loading ? (
        <div className="space-y-4">
          {[1, 2].map((i) => (
            <div key={i} className="dash-card p-6 animate-pulse space-y-3">
              <div className="h-5 w-40 bg-slate-100 rounded-lg"></div>
              <div className="h-8 w-64 bg-slate-100 rounded-lg"></div>
              <div className="h-16 bg-slate-50 rounded-xl"></div>
            </div>
          ))}
        </div>
      ) : prescriptions.length === 0 ? (
        <Empty />
      ) : (
        <div className="space-y-6">
          {/* Active E-Prescription Spotlight (if available) */}
          {activePrescription && (
            <div className="rounded-3xl border-2 border-[#0D9488]/30 bg-gradient-to-br from-white to-[#0D9488]/5 p-6 shadow-sm">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-[#0D9488]/15 pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-[#0D9488]/15 flex items-center justify-center text-[#0D9488]">
                    <ShieldCheck className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-black uppercase tracking-wider text-[#0D9488]">
                        Active E-Prescription
                      </span>
                      <span className="flex h-2 w-2 relative">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                      </span>
                    </div>
                    <h3 className="text-lg font-black text-[#1A1F36] mt-0.5">
                      {activePrescription.prescription_number}
                    </h3>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <Link
                    href={`/patient/prescriptions/${activePrescription.id}`}
                    className="inline-flex items-center gap-2 rounded-xl bg-[#0D9488] hover:bg-[#0B7A6F] text-white px-5 py-2.5 text-xs font-black uppercase tracking-wider transition-all shadow-md"
                  >
                    View &amp; Fulfill <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>

              {/* Medication details */}
              <div className="mt-4 grid gap-3">
                {(activePrescription.prescription_items || []).map((item: any) => (
                  <div key={item.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-3.5 rounded-2xl bg-white border border-[#0D9488]/20 gap-2">
                    <div>
                      <p className="text-sm font-black text-[#1A1F36] flex items-center gap-2">
                        <Pill className="w-4 h-4 text-[#0D9488]" />
                        {item.medicine_name}
                        <span className="text-xs font-bold text-[#8896A4]">({item.strength})</span>
                      </p>
                      <p className="text-xs font-semibold text-[#40516A] mt-0.5">
                        {item.dose} • {item.route} • {item.frequency} for {item.duration_value} {String(item.duration_unit || 'weeks').toLowerCase()}
                      </p>
                    </div>
                    <span className="text-xs font-black text-[#0D9488] bg-[#0D9488]/10 px-3 py-1 rounded-full w-fit">
                      Qty: {item.quantity}
                    </span>
                  </div>
                ))}
              </div>

              <div className="mt-4 grid gap-3 border-t border-[#0D9488]/15 pt-4 text-xs sm:grid-cols-3 text-[#40516A]">
                <div>
                  <span className="text-[10px] font-black uppercase tracking-wider text-[#8896A4] block">Prescribing Physician</span>
                  <span className="font-bold text-[#1A1F36]">{activePrescription.doctor?.name || '8LIV Physician'}</span>
                  {activePrescription.doctor?.reg_number && (
                    <span className="block text-[11px] text-[#8896A4]">Reg: {activePrescription.doctor.reg_number}</span>
                  )}
                </div>
                <div>
                  <span className="text-[10px] font-black uppercase tracking-wider text-[#8896A4] block">Issued On</span>
                  <span className="font-bold text-[#1A1F36]">
                    {activePrescription.issued_at ? new Date(activePrescription.issued_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '-'}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] font-black uppercase tracking-wider text-[#8896A4] block">Fulfillment Status</span>
                  {(() => {
                    const order = (activePrescription.pharmacy_orders || []).find((o: any) => !['CANCELLED', 'UNABLE_TO_FULFILL'].includes(o.status)) || activePrescription.pharmacy_orders?.[0]
                    return (
                      <span className={`font-black ${order ? 'text-[#0D9488]' : 'text-[#C4622D]'}`}>
                        {order ? (STATUS_LABELS[order.status] || order.status) : 'Action Required: Confirm Delivery Address'}
                      </span>
                    )
                  })()}
                </div>
              </div>
            </div>
          )}

          {/* All Prescriptions List */}
          <div className="space-y-4">
            <h3 className="text-xs font-black uppercase tracking-widest text-[#8896A4]">
              All Prescriptions History ({prescriptions.length})
            </h3>
            <div className="grid gap-4">
              {prescriptions.map((rx) => {
                const order = (rx.pharmacy_orders || []).find((o: any) => !['CANCELLED', 'UNABLE_TO_FULFILL'].includes(o.status)) || rx.pharmacy_orders?.[0]
                const isActive = ['ISSUED', 'ACTIVE', 'SIGNED'].includes(rx.status)
                return (
                  <Link
                    key={rx.id}
                    href={`/patient/prescriptions/${rx.id}`}
                    className="dash-card block p-5 hover:border-[#0D9488]/40 transition-all group"
                  >
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-black uppercase tracking-wider text-[#C4622D]">
                        {rx.prescription_number}
                      </p>
                      <span className={`text-[11px] font-black px-3 py-1 rounded-full ${
                        isActive
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/60'
                          : rx.status === 'COMPLETED'
                          ? 'bg-blue-50 text-blue-700'
                          : 'bg-slate-100 text-slate-700'
                      }`}>
                        {isActive ? 'Active Clinical Rx' : rx.status}
                      </span>
                    </div>

                    <p className="mt-2 text-sm font-bold text-[#1A1F36]">
                      {(rx.prescription_items || []).map((item: any) => `${item.medicine_name} (${item.strength})`).join(', ') || 'Prescription medications'}
                    </p>

                    <div className="mt-4 grid gap-3 border-t border-[#1A1F36]/6 pt-4 text-xs sm:grid-cols-3">
                      <Meta label="Issued Date" value={rx.issued_at ? new Date(rx.issued_at).toLocaleDateString('en-IN') : '-'} />
                      <Meta label="Valid Until" value={rx.valid_until ? new Date(rx.valid_until).toLocaleDateString('en-IN') : '-'} />
                      <Meta label="Fulfillment" value={order?.status ? (STATUS_LABELS[order.status] || order.status) : 'Pending address confirmation'} />
                    </div>
                  </Link>
                )
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function Empty() {
  return (
    <div className="dash-card p-10 text-center">
      <FileText className="mx-auto mb-3 h-10 w-10 text-[#8896A4]" />
      <h3 className="font-black text-lg">No signed prescriptions yet</h3>
      <p className="mt-2 text-sm font-semibold text-[#8896A4] max-w-sm mx-auto">
        Your doctor-issued electronic prescriptions and pharmacy fulfillment status will appear here after your clinical consultation.
      </p>
    </div>
  )
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[10px] font-black uppercase tracking-wider text-[#8896A4]">{label}</p>
      <p className="mt-1 font-bold text-[#1A1F36]">{value}</p>
    </div>
  )
}
