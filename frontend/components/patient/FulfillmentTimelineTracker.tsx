'use client'

import React from 'react'
import { CheckCircle2, Circle, Clock, Truck, Package, ShieldCheck, AlertCircle, ExternalLink } from 'lucide-react'

export type FulfillmentTimelineTrackerProps = {
  status: string
  courierName?: string | null
  trackingNumber?: string | null
  dispatchedAt?: string | null
  deliveredAt?: string | null
  compact?: boolean
}

type Stage = {
  key: string
  label: string
  description?: string
  state: 'completed' | 'in_progress' | 'pending' | 'exception'
}

export default function FulfillmentTimelineTracker({
  status,
  courierName,
  trackingNumber,
  dispatchedAt,
  deliveredAt,
  compact = false,
}: FulfillmentTimelineTrackerProps) {
  const normStatus = (status || '').toUpperCase()

  // Define 6 Canonical Milestones per 8LIV Specification:
  // 1. Prescription Issued
  // 2. Address Confirmed
  // 3. Pharmacy Assigned
  // 4. Preparing
  // 5. Dispatched
  // 6. Delivered

  const isPrescriptionIssued = true // Given that an order or address confirmation exists
  const isAddressConfirmed = true // Fulfillment order only created upon address confirmation

  let isPharmacyAssigned = false
  let isPreparing = false
  let isDispatched = false
  let isDelivered = false
  let isException = false

  if (normStatus === 'PENDING_ASSIGNMENT') {
    // Stage 3 In Progress
  } else if (normStatus === 'RECEIVED' || normStatus === 'ACKNOWLEDGED') {
    isPharmacyAssigned = true
  } else if (normStatus === 'STOCK_CONFIRMED' || normStatus === 'PREPARING') {
    isPharmacyAssigned = true
    isPreparing = true
  } else if (normStatus === 'DISPATCHED') {
    isPharmacyAssigned = true
    isPreparing = true
    isDispatched = true
  } else if (normStatus === 'DELIVERED') {
    isPharmacyAssigned = true
    isPreparing = true
    isDispatched = true
    isDelivered = true
  } else if (['CLARIFICATION_REQUIRED', 'UNABLE_TO_FULFILL', 'CANCELLED'].includes(normStatus)) {
    isException = true
    isPharmacyAssigned = normStatus !== 'CANCELLED'
  }

  const stages: Stage[] = [
    {
      key: 'rx_issued',
      label: 'Prescription Issued',
      description: 'Authorized by doctor',
      state: 'completed',
    },
    {
      key: 'addr_confirmed',
      label: 'Address Confirmed',
      description: 'Destination locked',
      state: 'completed',
    },
    {
      key: 'pharmacy_assigned',
      label: 'Pharmacy Assigned',
      description: isPharmacyAssigned ? 'Partner assigned' : 'Assigning partner...',
      state: isPharmacyAssigned
        ? 'completed'
        : normStatus === 'PENDING_ASSIGNMENT'
        ? 'in_progress'
        : 'pending',
    },
    {
      key: 'preparing',
      label: 'Preparing',
      description: isPreparing ? 'Package verified' : isPharmacyAssigned ? 'Queued for prep' : 'Awaiting prep',
      state: isDelivered || isDispatched
        ? 'completed'
        : ['STOCK_CONFIRMED', 'PREPARING'].includes(normStatus)
        ? 'in_progress'
        : 'pending',
    },
    {
      key: 'dispatched',
      label: 'Dispatched',
      description: isDispatched ? 'In transit' : 'Awaiting courier',
      state: isDelivered
        ? 'completed'
        : isDispatched
        ? 'in_progress'
        : 'pending',
    },
    {
      key: 'delivered',
      label: 'Delivered',
      description: isDelivered ? 'Treatment delivered' : 'Final delivery',
      state: isDelivered ? 'completed' : 'pending',
    },
  ]

  if (compact) {
    return (
      <div className="flex items-center gap-1.5 overflow-x-auto py-1 text-xs">
        {stages.map((st, i) => (
          <React.Fragment key={st.key}>
            <div className="flex items-center gap-1 shrink-0">
              {st.state === 'completed' ? (
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
              ) : st.state === 'in_progress' ? (
                <Clock className="h-3.5 w-3.5 animate-spin text-[#C4622D]" />
              ) : (
                <Circle className="h-3.5 w-3.5 text-zinc-300" />
              )}
              <span
                className={`text-[11px] font-bold ${
                  st.state === 'completed'
                    ? 'text-[#1A1F36]'
                    : st.state === 'in_progress'
                    ? 'text-[#C4622D]'
                    : 'text-[#8896A4]'
                }`}
              >
                {st.label}
              </span>
            </div>
            {i < stages.length - 1 && <span className="text-zinc-300">→</span>}
          </React.Fragment>
        ))}
      </div>
    )
  }

  return (
    <div className="rounded-2xl border border-[#1A1F36]/10 bg-white p-6 shadow-sm space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-[#1A1F36]/8 pb-4">
        <div>
          <p className="text-[10px] font-black uppercase tracking-widest text-[#C4622D]">
            Fulfillment Journey
          </p>
          <h3 className="text-lg font-black text-[#1A1F36]">Treatment Package Dispatch Tracker</h3>
        </div>
        <div className="flex items-center gap-2">
          {normStatus === 'PENDING_ASSIGNMENT' && (
            <span className="rounded-full bg-amber-50 border border-amber-200 px-3 py-1 text-xs font-black text-amber-800">
              Fulfillment in Progress
            </span>
          )}
          {['RECEIVED', 'ACKNOWLEDGED', 'STOCK_CONFIRMED', 'PREPARING'].includes(normStatus) && (
            <span className="rounded-full bg-purple-50 border border-purple-200 px-3 py-1 text-xs font-black text-purple-800">
              Preparing
            </span>
          )}
          {normStatus === 'DISPATCHED' && (
            <span className="rounded-full bg-cyan-50 border border-cyan-200 px-3 py-1 text-xs font-black text-cyan-800 flex items-center gap-1.5">
              <Truck className="h-3.5 w-3.5" /> Dispatched
            </span>
          )}
          {normStatus === 'DELIVERED' && (
            <span className="rounded-full bg-emerald-50 border border-emerald-200 px-3 py-1 text-xs font-black text-emerald-800 flex items-center gap-1.5">
              <CheckCircle2 className="h-3.5 w-3.5" /> Delivered
            </span>
          )}
          {isException && (
            <span className="rounded-full bg-rose-50 border border-rose-200 px-3 py-1 text-xs font-black text-rose-800 flex items-center gap-1.5">
              <AlertCircle className="h-3.5 w-3.5" /> {normStatus.replace(/_/g, ' ')}
            </span>
          )}
        </div>
      </div>

      {/* 6-Stage Timeline Grid */}
      <div className="relative">
        {/* Connector line for desktop */}
        <div className="hidden lg:block absolute top-4 left-6 right-6 h-0.5 bg-[#1A1F36]/10 -z-0" />

        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6 relative z-10">
          {stages.map((stage, idx) => {
            const isDone = stage.state === 'completed'
            const isInProg = stage.state === 'in_progress'

            return (
              <div
                key={stage.key}
                className={`flex flex-col items-center text-center p-3 rounded-xl transition-all ${
                  isInProg
                    ? 'bg-[#C4622D]/5 border border-[#C4622D]/20 shadow-xs'
                    : isDone
                    ? 'bg-[#FAF7F5]'
                    : 'bg-white/40 border border-transparent'
                }`}
              >
                <div
                  className={`flex h-8 w-8 items-center justify-center rounded-full mb-2.5 transition-colors ${
                    isDone
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : isInProg
                      ? 'bg-[#C4622D] text-white animate-pulse'
                      : 'border border-[#1A1F36]/15 bg-white text-[#8896A4]'
                  }`}
                >
                  {isDone ? (
                    <CheckCircle2 className="h-4 w-4" />
                  ) : isInProg ? (
                    <Clock className="h-4 w-4" />
                  ) : (
                    <span className="text-xs font-black">{idx + 1}</span>
                  )}
                </div>

                <p
                  className={`text-xs font-black ${
                    isDone
                      ? 'text-[#1A1F36]'
                      : isInProg
                      ? 'text-[#C4622D]'
                      : 'text-[#8896A4]'
                  }`}
                >
                  {stage.label}
                </p>
                {stage.description && (
                  <p className="mt-0.5 text-[10px] font-semibold text-[#8896A4]">
                    {stage.description}
                  </p>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Dispatch Logistics Banner if Dispatched or Delivered */}
      {(isDispatched || trackingNumber || courierName) && (
        <div
          className={`rounded-xl border p-4 text-xs ${
            courierName?.includes('In-House')
              ? 'border-emerald-200 bg-emerald-50/80 text-emerald-950'
              : 'border-cyan-200 bg-cyan-50/70 text-cyan-950'
          }`}
        >
          <div className="flex items-center gap-2 font-bold mb-2.5">
            {courierName?.includes('In-House') ? (
              <>
                <span className="text-base">🛵</span>
                <span className="text-emerald-900 font-black">Pharmacy In-House Fleet Dispatch</span>
                <span className="rounded-full bg-emerald-200/60 px-2 py-0.5 text-[10px] font-bold text-emerald-900">
                  Local Delivery Staff
                </span>
              </>
            ) : (
              <>
                <Truck className="h-4 w-4 text-cyan-700" />
                <span className="text-cyan-900 font-black">Third-Party Courier Tracking Details</span>
              </>
            )}
          </div>
          <div className="grid gap-3 sm:grid-cols-3 font-semibold">
            <div>
              <p
                className={`text-[10px] uppercase tracking-wider font-bold ${
                  courierName?.includes('In-House') ? 'text-emerald-800' : 'text-cyan-700'
                }`}
              >
                {courierName?.includes('In-House') ? 'Delivery Executive / Fleet' : 'Courier Partner'}
              </p>
              <p className="text-sm font-black mt-0.5">
                {courierName?.replace(/^In-House Delivery \((.*)\)$/, '$1') || courierName || '8LIV Pharmacy Fleet'}
              </p>
            </div>
            <div>
              <p
                className={`text-[10px] uppercase tracking-wider font-bold ${
                  courierName?.includes('In-House') ? 'text-emerald-800' : 'text-cyan-700'
                }`}
              >
                {courierName?.includes('In-House') ? 'Rider Contact Phone' : 'AWB / Tracking Number'}
              </p>
              {courierName?.includes('In-House') && trackingNumber?.includes('+') ? (
                <a
                  href={`tel:${trackingNumber.replace(/[^0-9+]/g, '')}`}
                  className="text-sm font-black text-emerald-800 hover:underline inline-flex items-center gap-1 mt-0.5 font-mono"
                >
                  📞 {trackingNumber.replace(/^Rider Contact:\s*/, '')}
                </a>
              ) : (
                <p className="text-sm font-black font-mono mt-0.5 text-[#C4622D]">
                  {trackingNumber?.replace(/^Rider Contact:\s*/, '') || 'Assigned to delivery route'}
                </p>
              )}
            </div>
            <div>
              <p
                className={`text-[10px] uppercase tracking-wider font-bold ${
                  courierName?.includes('In-House') ? 'text-emerald-800' : 'text-cyan-700'
                }`}
              >
                Dispatch Status & Time
              </p>
              <p className="text-xs font-bold mt-0.5">
                {dispatchedAt
                  ? new Date(dispatchedAt).toLocaleString('en-IN', {
                      dateStyle: 'medium',
                      timeStyle: 'short',
                    })
                  : 'Dispatched & In Transit'}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
