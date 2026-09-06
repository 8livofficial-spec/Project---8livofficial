'use client'

import React, { useState } from 'react'
import { Pill, Package, CheckCircle2, Truck, FileText, AlertCircle, Loader2 } from 'lucide-react'
import Link from 'next/link'
import { authedFetch } from '@/lib/apiClient'

interface MedicationCardProps {
  medicationName: string
  dosage: string
  dosesTaken: number
  totalDoses: number
  nextRefillDate: string
  daysToRefill: number
  isApproved: boolean
  cycleNumber?: number
  totalCycles?: number
  fulfillmentStatus?: string
  courierName?: string
  trackingNumber?: string
  orderId?: string
  prescriptionId?: string
}

export default function MedicationCard({
  medicationName,
  dosage,
  dosesTaken,
  totalDoses,
  nextRefillDate,
  daysToRefill,
  isApproved,
  cycleNumber = 1,
  totalCycles = 1,
  fulfillmentStatus,
  courierName,
  trackingNumber,
  orderId,
  prescriptionId,
}: MedicationCardProps) {
  const [showReviewModal, setShowReviewModal] = useState(false)
  const [reviewNotes, setReviewNotes] = useState('')
  const [reviewSubmitted, setReviewSubmitted] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleReviewSubmit = async () => {
    if (!reviewNotes.trim()) {
      setError('Please describe your question or symptom for the doctor.')
      return
    }
    setLoading(true)
    setError('')
    try {
      const res = await authedFetch('/api/patient/medication-review-request', {
        method: 'POST',
        body: JSON.stringify({ notes: reviewNotes }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to submit review request.')
      setReviewSubmitted(true)
      setShowReviewModal(false)
    } catch (err: any) {
      setError(err.message || 'Could not submit request.')
    } finally {
      setLoading(false)
    }
  }

  const progressPercent = Math.min(100, Math.round((dosesTaken / totalDoses) * 100)) || 0

  const isInHouse = courierName?.includes('In-House')
  const isDispatched = fulfillmentStatus === 'DISPATCHED'
  const isDelivered = fulfillmentStatus === 'DELIVERED'

  const trackerHref = orderId
    ? `/patient/medicine-orders/${orderId}`
    : prescriptionId
    ? `/patient/prescriptions/${prescriptionId}`
    : '/patient/medicine-orders'

  const getStatusDisplay = () => {
    if (isDelivered) return { label: 'Delivered', color: 'text-emerald-700 bg-emerald-50 border-emerald-200' }
    if (isDispatched) {
      return isInHouse
        ? { label: '🛵 In-House Out for Delivery', color: 'text-emerald-800 bg-emerald-100/80 border-emerald-200' }
        : { label: '🚚 Dispatched with Courier', color: 'text-cyan-800 bg-cyan-50 border-cyan-200' }
    }
    if (fulfillmentStatus === 'PREPARING' || fulfillmentStatus === 'STOCK_CONFIRMED') {
      return { label: 'Preparing Package', color: 'text-purple-800 bg-purple-50 border-purple-200' }
    }
    if (fulfillmentStatus === 'RECEIVED' || fulfillmentStatus === 'ACKNOWLEDGED') {
      return { label: 'Pharmacy Assigned', color: 'text-amber-800 bg-amber-50 border-amber-200' }
    }
    return { label: fulfillmentStatus?.replace(/_/g, ' ') || 'Processing', color: 'text-[#1A1F36] bg-[#F5F0EB]' }
  }

  const statusDisplay = getStatusDisplay()

  return (
    <div className="dash-card p-5 flex flex-col justify-between h-full bg-white rounded-2xl border border-[#1A1F36]/8 shadow-sm">
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#1A1F36]/8 pb-3">
          <div className="flex items-center gap-2 text-[#C4622D]">
            <Pill className="w-5 h-5 shrink-0" />
            <h3 className="font-bold text-[#1A1F36] text-base font-sora">Metabolic Protocol</h3>
          </div>
          {totalCycles > 0 && (
            <span className="rounded-full bg-[#1A1F36]/5 px-2.5 py-0.5 text-[11px] font-black text-[#1A1F36]">
              Cycle {cycleNumber} of {totalCycles}
            </span>
          )}
        </div>

        {isApproved ? (
          <>
            {/* Drug Info */}
            <div>
              <h4 className="text-[#1A1F36] font-bold text-lg leading-tight font-sora">{medicationName}</h4>
              <p className="text-[#C4622D] text-xs font-bold uppercase tracking-wider mt-1">{dosage} · Prescribed Protocol</p>

              <div className="flex items-center gap-1.5 mt-2">
                <span className="w-2 h-2 rounded-full bg-[#5C7A6B] animate-pulse" />
                <span className="text-[#5C7A6B] text-xs font-bold uppercase tracking-wider">
                  Active Clinical Prescription
                </span>
              </div>
            </div>

            <hr className="border-[#1A1F36]/8" />

            {/* Doses Progress */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center text-xs">
                <span className="text-[#8896A4] font-medium">Cycle Administration</span>
                <span className="font-bold text-[#1A1F36]">{dosesTaken} of {totalDoses} doses</span>
              </div>
              <div className="bg-[#F5F0EB] h-2 rounded-full overflow-hidden">
                <div 
                  className="bg-[#C4622D] h-full transition-all duration-500 rounded-full" 
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>

            {/* Delivery / Pharmacy Fulfillment Status */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 bg-[#F5F0EB]/60 rounded-2xl border border-[#1A1F36]/6">
              <div className="flex items-start gap-2.5 min-w-0">
                <Package className="w-5 h-5 text-[#8896A4] shrink-0 mt-0.5" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-black ${statusDisplay.color}`}>
                      {statusDisplay.label}
                    </span>
                  </div>
                  {trackingNumber ? (
                    <p className="text-[11px] font-bold mt-1 text-[#1A1F36]">
                      {isInHouse ? (
                        <span className="text-emerald-900">
                          {trackingNumber.includes('+') ? `Rider Phone: ${trackingNumber.replace(/^Rider Contact:\s*/, '')}` : trackingNumber}
                        </span>
                      ) : (
                        <span className="text-[#C4622D]">AWB Tracking: {trackingNumber}</span>
                      )}
                    </p>
                  ) : (
                    <p className="text-[10px] text-[#8896A4] font-semibold mt-1">
                      Cycle Review: {nextRefillDate || 'Scheduled with Care Team'}
                    </p>
                  )}
                </div>
              </div>

              <Link
                href={trackerHref}
                className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-[#1A1F36] px-3.5 py-2 text-xs font-black text-white hover:bg-[#2A314E] transition-transform active:scale-[0.98] shrink-0 shadow-xs"
              >
                <span>Track Delivery</span>
                <Truck className="w-3.5 h-3.5" />
              </Link>
            </div>
          </>
        ) : (
          <div className="py-6 text-center space-y-3">
            <p className="text-sm text-[#8896A4] font-medium leading-relaxed">
              Your treatment cycle review is in progress with your physician. Once authorized, your structured prescription and pharmacy fulfillment tracking will display here.
            </p>
          </div>
        )}
      </div>

      {/* Patient Action Buttons */}
      <div className="mt-4 pt-3 border-t border-[#1A1F36]/8 space-y-2">
        <div className="grid grid-cols-2 gap-2">
          <Link
            href="/patient/prescriptions"
            className="flex items-center justify-center gap-1.5 rounded-xl border border-[#1A1F36]/10 bg-white py-2 text-xs font-bold text-[#1A1F36] hover:bg-[#F5F0EB] transition"
          >
            <FileText className="w-3.5 h-3.5 text-[#C4622D]" />
            Prescription
          </Link>
          <Link
            href="/patient/prescriptions"
            className="flex items-center justify-center gap-1.5 rounded-xl border border-[#1A1F36]/10 bg-white py-2 text-xs font-bold text-[#1A1F36] hover:bg-[#F5F0EB] transition"
          >
            <Truck className="w-3.5 h-3.5 text-[#C4622D]" />
            Track Delivery
          </Link>
        </div>

        {reviewSubmitted ? (
          <div className="w-full bg-[#5C7A6B]/10 text-[#5C7A6B] border border-[#5C7A6B]/20 rounded-xl py-2.5 text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 shrink-0" /> Review Submitted to Doctor
          </div>
        ) : (
          <button
            onClick={() => setShowReviewModal(true)}
            className="w-full border border-[#C4622D] hover:bg-[#C4622D]/8 text-[#C4622D] font-bold uppercase tracking-wider rounded-xl py-2.5 text-xs transition-colors cursor-pointer"
          >
            Request Medication Review
          </button>
        )}
      </div>

      {/* Medication Review Request Modal */}
      {showReviewModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-[#1A1F36]/10 pb-3">
              <h3 className="text-base font-black text-[#1A1F36]">Request Medication Review</h3>
              <button
                onClick={() => setShowReviewModal(false)}
                className="text-xs font-black text-[#8896A4] hover:text-[#1A1F36]"
              >
                ✕
              </button>
            </div>
            <p className="text-xs text-[#8896A4]">
              Notice: Submitting a request alerts your doctor for clinical evaluation. It does not alter your active prescription.
            </p>
            {error && <p className="text-xs font-bold text-red-600">{error}</p>}
            <div>
              <label className="text-xs font-bold text-[#1A1F36]">Notes or Symptoms for Doctor</label>
              <textarea
                rows={4}
                value={reviewNotes}
                onChange={(e) => setReviewNotes(e.target.value)}
                placeholder="e.g. Experiencing nausea, inquiry about dosage adjustment for next cycle..."
                className="mt-1 w-full rounded-xl border border-[#1A1F36]/10 p-3 text-sm font-medium outline-none focus:border-[#1A1F36]"
              />
            </div>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setShowReviewModal(false)}
                className="rounded-xl px-4 py-2 text-xs font-black text-[#40516A] hover:bg-[#F5F0EB]"
              >
                Cancel
              </button>
              <button
                onClick={handleReviewSubmit}
                disabled={loading || !reviewNotes.trim()}
                className="inline-flex items-center gap-1.5 rounded-xl bg-[#1A1F36] px-4 py-2 text-xs font-black text-white disabled:opacity-50"
              >
                {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                Submit to Doctor
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
