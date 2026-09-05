'use client'

import React, { useState } from 'react'
import { AlertTriangle, X } from 'lucide-react'
import { authedFetch } from '@/lib/apiClient'

interface RevokePrescriptionModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  prescription: any | null
}

export default function RevokePrescriptionModal({
  isOpen,
  onClose,
  onSuccess,
  prescription,
}: RevokePrescriptionModalProps) {
  const [reason, setReason] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  if (!isOpen || !prescription) return null

  const handleRevoke = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!reason.trim()) {
      setError('Please provide a clinical rationale for revoking this e-prescription.')
      return
    }

    setLoading(true)
    setError('')
    try {
      const res = await authedFetch(`/api/doctor/prescriptions/${prescription.id}/revoke`, {
        method: 'POST',
        body: JSON.stringify({ reason: reason.trim() }),
      })
      const data = await res.json()
      if (!res.ok || data.error) {
        throw new Error(data.error || 'Failed to revoke prescription.')
      }
      onSuccess()
      onClose()
    } catch (err: any) {
      setError(err.message || 'Error revoking prescription.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-md rounded-3xl bg-white p-6 sm:p-8 shadow-2xl border border-rose-100 space-y-5 animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2.5 text-rose-600">
            <AlertTriangle className="h-6 w-6" />
            <h3 className="text-lg font-black text-[#1A1F36]">Revoke Prescription</h3>
          </div>
          <button onClick={onClose} className="rounded-xl p-1 text-[#8896A4] hover:bg-[#F5F0EB]">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="rounded-2xl border border-rose-200 bg-rose-50/60 p-4 text-xs space-y-1 text-rose-900">
          <p className="font-black uppercase tracking-wider text-[10px] text-rose-700">
            Clinical Cancellation Notice:
          </p>
          <p>
            You are about to revoke prescription <span className="font-mono font-black">{prescription.prescription_number}</span>. Once revoked, partner pharmacies will be blocked from dispensing this order.
          </p>
        </div>

        {error && <p className="rounded-xl bg-rose-50 p-3 text-xs font-bold text-rose-600">{error}</p>}

        <form onSubmit={handleRevoke} className="space-y-4">
          <div>
            <label className="block text-xs font-black uppercase tracking-wider text-[#1A1F36] mb-1.5">
              Clinical Justification / Reason *
            </label>
            <textarea
              required
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Patient reported GI intolerance / dose adjustment required prior to fulfillment..."
              className="w-full rounded-2xl border border-slate-200 p-3 text-xs font-semibold text-[#1A1F36] outline-none focus:border-rose-500 focus:ring-2 focus:ring-rose-200"
            />
          </div>

          <div className="flex gap-2.5 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="flex-1 rounded-2xl border border-[#1A1F36]/15 px-4 py-2.5 text-xs font-black text-[#8896A4] hover:bg-[#F5F0EB]"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !reason.trim()}
              className="flex-1 rounded-2xl bg-rose-600 hover:bg-rose-700 disabled:opacity-50 px-4 py-2.5 text-xs font-black text-white shadow-md shadow-rose-600/20"
            >
              {loading ? 'Revoking...' : 'Confirm Revocation'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
