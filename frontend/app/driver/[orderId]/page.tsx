'use client'

import React, { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft,
  Truck,
  Package,
  MapPin,
  ShieldCheck,
  CheckCircle2,
  Clock,
  Navigation,
  Phone,
  AlertTriangle,
  Loader2,
  Snowflake,
  ExternalLink,
} from 'lucide-react'
import { authedFetch } from '@/lib/apiClient'
import SwipeButton from '@/components/driver/SwipeButton'
import OtpInputModal from '@/components/driver/OtpInputModal'
import DriverMapCard from '@/components/driver/DriverMapCard'

type OrderDetail = {
  id: string
  order_reference: string
  status: string
  prescription_number?: string
  created_at: string
  shipped_at?: string | null
  delivered_at?: string | null
  patient: {
    name: string
    phone?: string | null
    address: any
    formatted_address: string
  }
  navigation: {
    destination_query: string
    google_maps_navigate: string
    google_maps_search: string
    embed_map_url: string
  }
  driver_meta: {
    delivery_mode: string
    driver_name?: string | null
    driver_phone?: string | null
    delivery_slot?: string | null
    otp_active: boolean
    driver_arrived_at?: string | null
    otp_verified_at?: string | null
  }
  items: Array<{
    id: string
    medicine_name: string
    dosage_form: string
    strength: string
    quantity: number
    special_instruction?: string | null
  }>
}

export default function DriverOrderRunPage() {
  const params = useParams()
  const router = useRouter()
  const orderId = String(params?.orderId || '')

  const [order, setOrder] = useState<OrderDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [actionLoading, setActionLoading] = useState(false)
  const [successMsg, setSuccessMsg] = useState('')

  // Modals
  const [showOtpModal, setShowOtpModal] = useState(false)

  const fetchRunDetail = async () => {
    setLoading(true)
    setError('')
    try {
      const res = await authedFetch(`/api/driver/orders/${orderId}`)
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to retrieve delivery run.')
      setOrder(data.order)
    } catch (err: any) {
      setError(err.message || 'Error loading run details.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (orderId) fetchRunDetail()
  }, [orderId])

  // Action: Swipe to pick up package from pharmacy
  const handlePickup = async () => {
    setActionLoading(true)
    setError('')
    setSuccessMsg('')
    try {
      const res = await authedFetch(`/api/driver/orders/${orderId}/pickup`, {
        method: 'POST',
        body: JSON.stringify({
          driver_name: order?.driver_meta?.driver_name || '8LIV In-House Rider',
          driver_phone: order?.driver_meta?.driver_phone || '+91 98765 43210',
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to initiate pickup.')

      setSuccessMsg('Package picked up! Delivery OTP has been dispatched to patient email.')
      await fetchRunDetail()
    } catch (err: any) {
      setError(err.message || 'Failed to record package pickup.')
      throw err
    } finally {
      setActionLoading(false)
    }
  }

  // Action: Driver marks arrived at customer location
  const handleMarkArrived = async () => {
    setActionLoading(true)
    setError('')
    try {
      const res = await authedFetch(`/api/driver/orders/${orderId}/arrive`, {
        method: 'POST',
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to record arrival.')

      setSuccessMsg('Arrived at customer location. Ask patient for the 6-digit OTP.')
      await fetchRunDetail()
      setShowOtpModal(true)
    } catch (err: any) {
      setError(err.message || 'Failed to mark arrival.')
    } finally {
      setActionLoading(false)
    }
  }

  // Action: OTP successfully verified
  const handleOtpVerified = (deliveredAt: string) => {
    setShowOtpModal(false)
    setSuccessMsg('Delivered and verified successfully!')
    fetchRunDetail()
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-[#F5F0EB] flex items-center justify-center p-4">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-[#C4622D]" />
          <p className="text-sm font-bold text-[#1A1F36]">Loading delivery run...</p>
        </div>
      </main>
    )
  }

  if (!order) {
    return (
      <main className="min-h-screen bg-[#F5F0EB] p-4 flex items-center justify-center">
        <div className="w-full max-w-md rounded-3xl bg-white p-6 text-center shadow-lg">
          <AlertTriangle className="mx-auto h-12 w-12 text-amber-600" />
          <h2 className="mt-3 text-lg font-black text-[#1A1F36]">Run Not Found</h2>
          <p className="mt-1 text-xs text-[#8896A4]">{error || 'Could not find this delivery order.'}</p>
          <Link
            href="/driver"
            className="mt-5 inline-flex rounded-2xl bg-[#1A1F36] px-5 py-2.5 text-xs font-black text-white"
          >
            Return to Runs
          </Link>
        </div>
      </main>
    )
  }

  const isDispatched = order.status === 'DISPATCHED'
  const isDelivered = order.status === 'DELIVERED'
  const isArrived = Boolean(order.driver_meta?.driver_arrived_at)

  return (
    <main className="min-h-screen bg-[#F5F0EB] text-[#1A1F36]">
      <div className="mx-auto max-w-lg min-h-screen flex flex-col bg-white shadow-xl sm:border-x border-[#1A1F36]/10">
        {/* Header App Bar */}
        <header className="sticky top-0 z-30 flex items-center justify-between border-b border-[#1A1F36]/10 bg-white/95 px-5 py-4 backdrop-blur-md">
          <div className="flex items-center gap-3">
            <Link
              href="/driver"
              className="flex h-10 w-10 items-center justify-center rounded-2xl border border-[#1A1F36]/10 bg-[#FAF7F5] text-[#1A1F36] hover:bg-[#F5F0EB]"
            >
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base font-black text-[#1A1F36]">{order.order_reference}</h1>
                <span
                  className={`rounded-full px-2 py-0.5 text-[10px] font-black uppercase tracking-wider ${
                    isDelivered
                      ? 'bg-emerald-100 text-emerald-800'
                      : isDispatched
                      ? 'bg-cyan-100 text-cyan-800'
                      : 'bg-amber-100 text-amber-800'
                  }`}
                >
                  {isDelivered
                    ? 'Delivered'
                    : isDispatched
                    ? 'In Transit'
                    : 'Awaiting Pickup'}
                </span>
              </div>
              <p className="text-[11px] font-semibold text-[#8896A4]">
                Rx: {order.prescription_number || '8LIV Medical Order'}
              </p>
            </div>
          </div>
        </header>

        {/* Content Body */}
        <div className="flex-1 p-4 space-y-4 pb-28">
          {/* Notifications */}
          {error && (
            <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-xs font-bold text-red-700">
              {error}
            </div>
          )}
          {successMsg && (
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-xs font-bold text-emerald-800">
              {successMsg}
            </div>
          )}

          {/* Delivered Status Card */}
          {isDelivered ? (
            <div className="rounded-3xl border border-emerald-200 bg-emerald-50/70 p-6 text-center shadow-sm space-y-2">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500 text-white shadow-md">
                <CheckCircle2 className="h-8 w-8 stroke-[2.5]" />
              </div>
              <h2 className="text-lg font-black text-emerald-950">Delivery Confirmed</h2>
              <p className="text-xs text-emerald-800 font-medium">
                Verified with 6-digit patient OTP and securely completed at patient doorstep.
              </p>
              {order.delivered_at && (
                <p className="text-[11px] font-bold text-emerald-700">
                  Delivered on:{' '}
                  {new Date(order.delivered_at).toLocaleTimeString('en-IN', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}{' '}
                  •{' '}
                  {new Date(order.delivered_at).toLocaleDateString('en-IN', {
                    month: 'short',
                    day: 'numeric',
                  })}
                </p>
              )}
            </div>
          ) : null}

          {/* Interactive Route Map & Customer Destination Card */}
          <DriverMapCard
            recipientName={order.patient.name}
            phone={order.patient.phone}
            addressSnapshot={order.patient.address}
            formattedAddress={order.patient.formatted_address}
            navigationUrl={order.navigation.google_maps_navigate}
            searchUrl={order.navigation.google_maps_search}
            embedMapUrl={order.navigation.embed_map_url}
          />

          {/* Cold-Chain Storage Badge */}
          <div className="flex items-center gap-3 rounded-2xl border border-cyan-200 bg-cyan-50/60 p-4 shadow-sm text-xs">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-cyan-600 text-white shadow-sm">
              <Snowflake className="h-5 w-5" />
            </div>
            <div>
              <p className="font-bold text-cyan-950">Cold-Chain Temperature Sensitive (2°C – 8°C)</p>
              <p className="text-[11px] text-cyan-800 mt-0.5">
                Keep in insulated cold sleeve with gel packs. Deliver directly to patient or caregiver.
              </p>
            </div>
          </div>

          {/* Prescribed Items in Package */}
          <div className="rounded-3xl border border-[#1A1F36]/10 bg-white p-5 shadow-sm space-y-3">
            <div className="flex items-center justify-between border-b border-[#1A1F36]/10 pb-3">
              <div className="flex items-center gap-2">
                <Package className="h-4 w-4 text-[#C4622D]" />
                <h3 className="text-xs font-black uppercase tracking-wider text-[#1A1F36]">
                  Package Contents ({order.items.length})
                </h3>
              </div>
              <span className="text-[11px] font-bold text-[#8896A4]">Tamper-Evident Sealed</span>
            </div>

            <div className="divide-y divide-[#1A1F36]/5 text-xs">
              {order.items.map((item) => (
                <div key={item.id} className="py-2.5 flex items-center justify-between">
                  <div>
                    <p className="font-bold text-[#1A1F36]">{item.medicine_name}</p>
                    <p className="text-[11px] text-[#8896A4]">
                      {item.dosage_form} • {item.strength}
                    </p>
                  </div>
                  <span className="rounded-xl bg-[#FAF7F5] px-3 py-1 font-black text-[#1A1F36]">
                    Qty: {item.quantity}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Floating Mobile Action Bar */}
        {!isDelivered && (
          <div className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-[#1A1F36]/10 p-4 shadow-2xl">
            <div className="mx-auto max-w-lg space-y-2">
              {!isDispatched ? (
                /* Step 1: Ready to pick up -> Swipe to pick up */
                <div>
                  <p className="text-[11px] text-center font-bold text-[#8896A4] mb-2">
                    Pick up package at pharmacy and dispatch OTP email to patient
                  </p>
                  <SwipeButton
                    label="Swipe to Pick Up Package"
                    successLabel="Package Picked Up!"
                    onConfirm={handlePickup}
                    loading={actionLoading}
                  />
                </div>
              ) : (
                /* Step 2: In transit -> Arrived & Verify OTP */
                <div className="space-y-2">
                  {!isArrived ? (
                    <button
                      type="button"
                      onClick={handleMarkArrived}
                      disabled={actionLoading}
                      className="w-full flex items-center justify-center gap-2 rounded-2xl bg-cyan-600 py-3.5 text-xs font-black text-white shadow-md transition-transform hover:scale-[1.01] active:scale-[0.98] disabled:opacity-50"
                    >
                      <MapPin className="h-4 w-4" />
                      Mark Arrived at Destination
                    </button>
                  ) : null}

                  <button
                    type="button"
                    onClick={() => setShowOtpModal(true)}
                    className="w-full flex items-center justify-center gap-2 rounded-2xl bg-emerald-600 py-3.5 text-xs font-black text-white shadow-md transition-transform hover:scale-[1.01] active:scale-[0.98]"
                  >
                    <ShieldCheck className="h-4 w-4" />
                    Enter Delivery OTP & Complete Delivery
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* 6-Digit OTP Modal */}
      <OtpInputModal
        orderId={order.id}
        orderReference={order.order_reference}
        patientName={order.patient.name}
        isOpen={showOtpModal}
        onClose={() => setShowOtpModal(false)}
        onSuccess={handleOtpVerified}
      />
    </main>
  )
}
