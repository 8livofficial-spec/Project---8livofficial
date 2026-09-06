'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { Download, Pill, MapPin, Truck, CheckCircle2, Clock, AlertCircle } from 'lucide-react'
import { authedFetch } from '@/lib/apiClient'
import { INDIAN_STATES } from '@/lib/constants/indianStates'

import FulfillmentTimelineTracker from '@/components/patient/FulfillmentTimelineTracker'

const STATUS_LABELS: Record<string, string> = {
  PENDING_ASSIGNMENT: 'Fulfillment in Progress',
  RECEIVED: 'Assigned to Partner Pharmacy',
  ACKNOWLEDGED: 'Pharmacy Acknowledged',
  STOCK_CONFIRMED: 'Treatment Stock Confirmed',
  PREPARING: 'Preparing Treatment Package',
  DISPATCHED: 'Dispatched with Courier',
  DELIVERED: 'Delivered',
  CLARIFICATION_REQUIRED: 'Clinical Review in Progress',
  UNABLE_TO_FULFILL: 'Fulfillment Rescheduling',
  CANCELLED: 'Fulfillment Cancelled',
}

export default function PatientPrescriptionDetailPage() {
  const params = useParams<{ prescriptionId: string }>()
  const [rx, setRx] = useState<any>(null)
  const [savedAddresses, setSavedAddresses] = useState<any[]>([])
  const [selectedAddressId, setSelectedAddressId] = useState<string>('')
  const [isAddingNew, setIsAddingNew] = useState(false)
  const [isChangingAddress, setIsChangingAddress] = useState(false)
  const [newAddress, setNewAddress] = useState({
    recipient_name: '',
    line1: '',
    line2: '',
    area: '',
    city: '',
    state: 'Karnataka',
    pincode: '',
    phone: '',
    save_address: true,
  })
  const [consentReviewed, setConsentReviewed] = useState(false)
  const [consentTransmission, setConsentTransmission] = useState(false)
  const [consentAddress, setConsentAddress] = useState(false)

  const [confirmLoading, setConfirmLoading] = useState(false)
  const [error, setError] = useState('')
  const [successMsg, setSuccessMsg] = useState('')

  const loadData = async () => {
    try {
      const rxRes = await authedFetch(`/api/patient/prescriptions/${params.prescriptionId}`)
      const rxData = await rxRes.json()
      if (!rxRes.ok) throw new Error(rxData.error || 'Unable to load prescription.')
      setRx(rxData.prescription)

      // Also load delivery addresses
      const addrRes = await authedFetch('/api/patient/delivery-address')
      const addrData = await addrRes.json()
      if (addrRes.ok && Array.isArray(addrData.addresses)) {
        setSavedAddresses(addrData.addresses)
        const def = addrData.addresses.find((a: any) => a.is_default) || addrData.addresses[0]
        if (def) setSelectedAddressId(def.id)
        if (addrData.addresses.length === 0) setIsAddingNew(true)
      }
    } catch (err: any) {
      setError(err.message || 'Unable to load details.')
    }
  }

  useEffect(() => {
    loadData()
  }, [params.prescriptionId])

  const download = async () => {
    const res = await authedFetch(`/api/patient/prescriptions/${params.prescriptionId}/pdf`)
    const payload = await res.json()
    if (!res.ok) return setError(payload.error || 'Unable to open signed prescription.')
    window.open(payload.url, '_blank', 'noopener,noreferrer')
  }

  const handleConfirmDelivery = async () => {
    setConfirmLoading(true)
    setError('')
    setSuccessMsg('')
    try {
      if (!consentReviewed || !consentTransmission || !consentAddress) {
        throw new Error('Please complete all 3 acknowledgements before confirming delivery.')
      }

      const payload: any = {
        prescription_id: rx.id,
        consent: {
          reviewed_prescription: consentReviewed,
          consent_transmission: consentTransmission,
          confirm_delivery_info: consentAddress,
        },
      }
      if (isAddingNew) {
        payload.address = newAddress
        payload.save_address = newAddress.save_address
      } else {
        if (!selectedAddressId) throw new Error('Please select a delivery address.')
        payload.address_id = selectedAddressId
      }

      const res = await authedFetch('/api/patient/confirm-delivery', {
        method: 'POST',
        body: JSON.stringify(payload),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to confirm delivery.')

      setSuccessMsg('Delivery address confirmed! Your treatment package is now being prepared for fulfillment.')
      await loadData()
    } catch (err: any) {
      setError(err.message || 'Failed to confirm delivery.')
    } finally {
      setConfirmLoading(false)
    }
  }

  if (!rx) return <div className="space-y-4 text-[#1A1F36]">{error || 'Loading prescription...'}</div>

  // Find active or latest fulfillment order
  const orders = rx.pharmacy_orders || []
  const activeOrder = orders.find((o: any) => !['CANCELLED', 'UNABLE_TO_FULFILL'].includes(o.status)) || orders[0]
  const hasFulfillableItems = (rx.prescription_items || []).some((i: any) => Number(i.quantity) > 0)
  const canConfirm = ['ISSUED', 'SIGNED', 'ACTIVE'].includes(rx.status) && !activeOrder && hasFulfillableItems

  const cycleNumber = rx.treatment_cycles?.cycle_number || null
  const selectedAddrObj = savedAddresses.find((a: any) => a.id === selectedAddressId) || savedAddresses[0]

  return (
    <div className="space-y-6 text-[#1A1F36]">
      {error && <p className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-700">{error}</p>}
      {successMsg && <p className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-bold text-emerald-700">{successMsg}</p>}

      {/* Header Card */}
      <div className="dash-card p-6">
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-black uppercase tracking-wider text-[#C4622D]">{rx.prescription_number}</span>
              {cycleNumber && (
                <span className="rounded-full bg-[#C4622D]/10 px-2.5 py-0.5 text-[10px] font-black text-[#C4622D]">
                  Treatment Cycle {cycleNumber}
                </span>
              )}
            </div>
            <h2 className="mt-1 text-2xl font-black">Official e-Prescription</h2>
            <p className="text-xs font-semibold text-[#8896A4]">
              Authorized {new Date(rx.issued_at || rx.created_at).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' })}
            </p>
          </div>
          <button onClick={download} className="inline-flex items-center gap-2 rounded-xl bg-[#1A1F36] px-4 py-3 text-xs font-black uppercase tracking-wider text-white transition-transform hover:scale-[1.02]">
            <Download className="h-4 w-4" /> Download signed PDF
          </button>
        </div>
      </div>

      {/* Prescribed Medications */}
      <div className="dash-card p-6">
        <h3 className="mb-4 text-sm font-black uppercase tracking-widest text-[#8896A4]">Authorized Clinical Treatment</h3>
        <div className="grid gap-3">
          {(rx.prescription_items || []).map((item: any) => (
            <div key={item.id} className="rounded-xl border border-[#1A1F36]/8 bg-white p-4">
              <div className="flex items-center justify-between">
                <p className="font-black text-sm text-[#1A1F36]">
                  <Pill className="mr-2 inline h-4 w-4 text-[#C4622D]" />
                  {item.medicine_name} <span className="text-xs text-[#8896A4]">({item.strength})</span>
                </p>
                <span className="text-xs font-black bg-[#FAF7F5] px-2.5 py-1 rounded text-[#1A1F36]">
                  Qty: {item.quantity}
                </span>
              </div>
              <p className="mt-1 text-sm font-semibold text-[#40516A]">
                {item.dose} • {item.route} • {item.frequency} for {item.duration_value} {item.duration_unit?.toLowerCase()}
              </p>
              {(item.food_instruction || item.special_instruction) && (
                <p className="mt-1 text-xs font-semibold text-[#8896A4]">{item.food_instruction} {item.special_instruction}</p>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Delivery Confirmation Box */}
      {canConfirm ? (
        <div className="dash-card p-6 border-2 border-[#C4622D]/30">
          <div className="flex items-center gap-2 text-[#C4622D] mb-2">
            <MapPin className="h-5 w-5" />
            <h3 className="text-base font-black">Prescription Issued</h3>
          </div>
          <p className="text-sm font-semibold text-[#40516A] mb-4">
            {cycleNumber
              ? `Your doctor has issued your prescription for Treatment Cycle ${cycleNumber}. Please confirm your delivery destination below:`
              : 'Your doctor has issued your prescription. Please confirm your delivery destination below:'}
          </p>

          {/* Saved Address Preview */}
          {savedAddresses.length > 0 && !isAddingNew && !isChangingAddress && selectedAddrObj && (
            <div className="rounded-2xl border border-[#1A1F36]/15 bg-[#FAF7F5] p-5 space-y-3 mb-4">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black uppercase tracking-widest text-[#8896A4]">Delivery Address</span>
                <span className="text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                  Destination on File
                </span>
              </div>
              <div>
                <p className="text-sm font-black text-[#1A1F36]">{selectedAddrObj.recipient_name}</p>
                <p className="text-xs font-semibold text-[#40516A] mt-0.5">
                  {selectedAddrObj.line1}, {selectedAddrObj.line2 ? selectedAddrObj.line2 + ', ' : ''}{selectedAddrObj.city}, {selectedAddrObj.state} - {selectedAddrObj.pincode}
                </p>
                <p className="text-xs font-semibold text-[#8896A4] mt-0.5">Phone: {selectedAddrObj.phone}</p>
              </div>

              <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-[#1A1F36]/8">
                <button
                  type="button"
                  className="rounded-xl bg-[#1A1F36] px-4 py-2 text-xs font-black text-white shadow-xs"
                >
                  ✓ Use this address
                </button>
                <button
                  type="button"
                  onClick={() => setIsChangingAddress(true)}
                  className="rounded-xl border border-[#1A1F36]/15 bg-white px-4 py-2 text-xs font-bold text-[#1A1F36] hover:bg-[#F5F0EB]"
                >
                  Change address
                </button>
                <button
                  type="button"
                  onClick={() => { setIsAddingNew(true); setIsChangingAddress(false) }}
                  className="rounded-xl border border-[#1A1F36]/15 bg-white px-4 py-2 text-xs font-bold text-[#C4622D] hover:bg-[#FAF7F5]"
                >
                  + Add new address
                </button>
              </div>
            </div>
          )}

          {/* Address Selection List if changing */}
          {savedAddresses.length > 0 && isChangingAddress && !isAddingNew && (
            <div className="space-y-3 mb-4">
              <div className="flex items-center justify-between">
                <label className="text-xs font-black uppercase tracking-wider text-[#8896A4]">Select Delivery Address</label>
                <button
                  type="button"
                  onClick={() => setIsChangingAddress(false)}
                  className="text-xs font-bold text-[#C4622D] underline"
                >
                  Done Selecting
                </button>
              </div>
              <div className="grid gap-2">
                {savedAddresses.map((addr) => (
                  <label
                    key={addr.id}
                    className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                      selectedAddressId === addr.id ? 'border-[#C4622D] bg-[#C4622D]/5' : 'border-[#1A1F36]/10 bg-white'
                    }`}
                  >
                    <input
                      type="radio"
                      name="address"
                      checked={selectedAddressId === addr.id}
                      onChange={() => { setSelectedAddressId(addr.id); setIsChangingAddress(false) }}
                      className="mt-1 text-[#C4622D]"
                    />
                    <div>
                      <p className="text-sm font-black">{addr.recipient_name} {addr.is_default && <span className="text-[10px] bg-[#1A1F36] text-white px-2 py-0.5 rounded-full ml-2">DEFAULT</span>}</p>
                      <p className="text-xs text-[#40516A] font-semibold">{addr.line1}, {addr.line2 ? addr.line2 + ', ' : ''}{addr.city}, {addr.state} - {addr.pincode}</p>
                      <p className="text-xs text-[#8896A4]">Phone: {addr.phone}</p>
                    </div>
                  </label>
                ))}
              </div>
              <button type="button" onClick={() => { setIsAddingNew(true); setIsChangingAddress(false) }} className="text-xs font-black text-[#C4622D] underline">
                + Add a new delivery address
              </button>
            </div>
          )}

          {/* New Address Form */}
          {(isAddingNew || savedAddresses.length === 0) && (
            <div className="space-y-3 mb-4 rounded-xl border border-[#1A1F36]/10 p-4 bg-[#FAF7F5]">
              <div className="flex justify-between items-center">
                <p className="text-xs font-black uppercase tracking-wider text-[#8896A4]">Add Delivery Address</p>
                {savedAddresses.length > 0 && (
                  <button type="button" onClick={() => setIsAddingNew(false)} className="text-xs font-bold text-[#40516A]">Use saved address</button>
                )}
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
                <input placeholder="Recipient Name" value={newAddress.recipient_name} onChange={(e) => setNewAddress({ ...newAddress, recipient_name: e.target.value })} className="rounded-lg border border-[#1A1F36]/10 p-2 text-sm font-semibold" />
                <input placeholder="Phone (10 digits)" value={newAddress.phone} onChange={(e) => setNewAddress({ ...newAddress, phone: e.target.value })} className="rounded-lg border border-[#1A1F36]/10 p-2 text-sm font-semibold" />
                <input placeholder="Flat, House no., Building, Street (Line 1)" value={newAddress.line1} onChange={(e) => setNewAddress({ ...newAddress, line1: e.target.value })} className="sm:col-span-2 rounded-lg border border-[#1A1F36]/10 p-2 text-sm font-semibold" />
                <input placeholder="Area, Landmark (Line 2)" value={newAddress.line2} onChange={(e) => setNewAddress({ ...newAddress, line2: e.target.value })} className="rounded-lg border border-[#1A1F36]/10 p-2 text-sm font-semibold" />
                <input placeholder="City" value={newAddress.city} onChange={(e) => setNewAddress({ ...newAddress, city: e.target.value })} className="rounded-lg border border-[#1A1F36]/10 p-2 text-sm font-semibold" />
                <select value={newAddress.state} onChange={(e) => setNewAddress({ ...newAddress, state: e.target.value })} className="rounded-lg border border-[#1A1F36]/10 p-2 text-sm font-semibold">
                  {INDIAN_STATES.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
                <input placeholder="PIN code (6 digits)" value={newAddress.pincode} onChange={(e) => setNewAddress({ ...newAddress, pincode: e.target.value })} className="rounded-lg border border-[#1A1F36]/10 p-2 text-sm font-semibold" />
              </div>
            </div>
          )}

          {/* Patient Acknowledgements & Consent */}
          <div className="my-5 rounded-2xl border border-[#1A1F36]/15 bg-white p-5 shadow-xs space-y-3">
            <div className="flex items-center gap-2 text-[#1A1F36]">
              <CheckCircle2 className="h-4 w-4 text-[#C4622D]" />
              <h4 className="text-xs font-black uppercase tracking-wider">
                Patient Acknowledgement & Delivery Consent
              </h4>
            </div>

            <div className="space-y-2.5 pt-2">
              <label className="flex items-start gap-3 text-xs font-semibold text-[#1A1F36] cursor-pointer">
                <input
                  type="checkbox"
                  checked={consentReviewed}
                  onChange={(e) => setConsentReviewed(e.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded border-[#1A1F36]/20 text-[#C4622D] focus:ring-[#C4622D]"
                />
                <span>I have reviewed my prescription.</span>
              </label>

              <label className="flex items-start gap-3 text-xs font-semibold text-[#1A1F36] cursor-pointer">
                <input
                  type="checkbox"
                  checked={consentTransmission}
                  onChange={(e) => setConsentTransmission(e.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded border-[#1A1F36]/20 text-[#C4622D] focus:ring-[#C4622D]"
                />
                <span>I consent to electronic transmission of my prescription to the 8LIV partner pharmacy for fulfillment.</span>
              </label>

              <label className="flex items-start gap-3 text-xs font-semibold text-[#1A1F36] cursor-pointer">
                <input
                  type="checkbox"
                  checked={consentAddress}
                  onChange={(e) => setConsentAddress(e.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded border-[#1A1F36]/20 text-[#C4622D] focus:ring-[#C4622D]"
                />
                <span>I confirm that my delivery information is accurate.</span>
              </label>
            </div>
          </div>

          <button
            onClick={handleConfirmDelivery}
            disabled={confirmLoading || !consentReviewed || !consentTransmission || !consentAddress}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-[#C4622D] px-6 py-3.5 text-sm font-black text-white shadow-sm transition-transform hover:scale-[1.02] disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <CheckCircle2 className="h-4 w-4" />
            {confirmLoading ? 'Confirming Delivery Address...' : 'Confirm Delivery Address'}
          </button>
        </div>
      ) : activeOrder ? (
        <div className="space-y-4">
          {/* Post-confirmation banner */}
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50/80 p-5 shadow-xs">
            <div className="flex items-center gap-2 text-emerald-900 font-bold">
              <CheckCircle2 className="h-5 w-5 text-emerald-600" />
              <h3 className="text-base font-black">Your treatment package is being prepared.</h3>
            </div>
            <p className="mt-1 text-xs text-emerald-800 font-semibold">
              Fulfillment is in progress. Your confirmed delivery address has been securely snapshotted for partner pharmacy fulfillment.
            </p>
          </div>

          {/* 6-Stage Timeline Tracker Component */}
          <FulfillmentTimelineTracker
            status={activeOrder.status}
            courierName={activeOrder.courier_name}
            trackingNumber={activeOrder.tracking_number}
            dispatchedAt={activeOrder.dispatched_at}
            deliveredAt={activeOrder.delivered_at}
          />

          {/* Delivery Snapshot Summary */}
          {activeOrder.delivery_address_snapshot && (
            <div className="dash-card p-6">
              <p className="text-[10px] font-black uppercase tracking-wider text-[#8896A4]">Confirmed Delivery Destination</p>
              <p className="mt-1 text-sm font-bold text-[#1A1F36]">{activeOrder.delivery_address_snapshot.recipient_name}</p>
              <p className="mt-0.5 text-xs font-semibold text-[#40516A]">
                {activeOrder.delivery_address_snapshot.line1}, {activeOrder.delivery_address_snapshot.line2 ? activeOrder.delivery_address_snapshot.line2 + ', ' : ''}{activeOrder.delivery_address_snapshot.city}, {activeOrder.delivery_address_snapshot.state} - {activeOrder.delivery_address_snapshot.pincode}
              </p>
              <p className="mt-0.5 text-xs font-semibold text-[#8896A4]">
                Contact: {activeOrder.delivery_address_snapshot.phone}
              </p>
            </div>
          )}
        </div>
      ) : null}
    </div>
  )
}
