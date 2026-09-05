'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { Download, Pill, MapPin, Truck, CheckCircle2, Clock, AlertCircle } from 'lucide-react'
import { authedFetch } from '@/lib/apiClient'
import { INDIAN_STATES } from '@/app/api/patient/delivery-address/route'

const STATUS_LABELS: Record<string, string> = {
  PENDING_ASSIGNMENT: 'Pending',
  RECEIVED: 'Order sent to pharmacy',
  ACKNOWLEDGED: 'Pharmacy received your order',
  STOCK_CONFIRMED: 'Pharmacy confirmed your order',
  PREPARING: 'Your medicine is being prepared',
  DISPATCHED: 'Your medicine is on the way',
  DELIVERED: 'Delivered',
  CLARIFICATION_REQUIRED: "Pharmacy has a question — we'll be in touch",
  UNABLE_TO_FULFILL: 'Pharmacy was unable to fulfill this order',
  CANCELLED: 'Order cancelled',
}

export default function PatientPrescriptionDetailPage() {
  const params = useParams<{ prescriptionId: string }>()
  const [rx, setRx] = useState<any>(null)
  const [savedAddresses, setSavedAddresses] = useState<any[]>([])
  const [selectedAddressId, setSelectedAddressId] = useState<string>('')
  const [isAddingNew, setIsAddingNew] = useState(false)
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
      const payload: any = { prescription_id: rx.id }
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

      setSuccessMsg('Delivery address confirmed! Your medication order has been submitted.')
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
  const canConfirm = ['ISSUED', 'SIGNED'].includes(rx.status) && !activeOrder && hasFulfillableItems

  return (
    <div className="space-y-6 text-[#1A1F36]">
      {error && <p className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-700">{error}</p>}
      {successMsg && <p className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-bold text-emerald-700">{successMsg}</p>}

      {/* Header Card */}
      <div className="dash-card p-6">
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-wider text-[#C4622D]">{rx.prescription_number}</p>
            <h2 className="mt-1 text-2xl font-black">Official e-Prescription</h2>
            <p className="text-xs font-semibold text-[#8896A4]">Issued {new Date(rx.issued_at || rx.created_at).toLocaleDateString()}</p>
          </div>
          <button onClick={download} className="inline-flex items-center gap-2 rounded-xl bg-[#1A1F36] px-4 py-3 text-xs font-black uppercase tracking-wider text-white transition-transform hover:scale-[1.02]">
            <Download className="h-4 w-4" /> Download signed PDF
          </button>
        </div>
      </div>

      {/* Medication List */}
      <div className="dash-card p-6">
        <h3 className="mb-4 text-sm font-black uppercase tracking-widest text-[#8896A4]">Prescribed Medications</h3>
        <div className="grid gap-3">
          {(rx.prescription_items || []).map((item: any) => (
            <div key={item.id} className="rounded-xl border border-[#1A1F36]/8 bg-white p-4">
              <p className="font-black"><Pill className="mr-2 inline h-4 w-4 text-[#C4622D]" />{item.medicine_name} <span className="text-xs text-[#8896A4]">({item.strength})</span></p>
              <p className="mt-1 text-sm font-semibold text-[#40516A]">{item.dose} • {item.route} • {item.frequency} for {item.duration_value} {item.duration_unit.toLowerCase()}</p>
              {(item.food_instruction || item.special_instruction) && (
                <p className="mt-1 text-xs font-semibold text-[#8896A4]">{item.food_instruction} {item.special_instruction}</p>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Delivery Confirmation or Fulfillment Status */}
      {canConfirm ? (
        <div className="dash-card p-6 border-2 border-[#C4622D]/20">
          <div className="flex items-center gap-2 text-[#C4622D] mb-3">
            <MapPin className="h-5 w-5" />
            <h3 className="text-base font-black">Confirm Delivery Address</h3>
          </div>
          <p className="text-sm font-semibold text-[#40516A] mb-4">
            Your doctor has issued your prescription. Please confirm your delivery address to dispatch medication from our licensed pharmacy partner.
          </p>

          {savedAddresses.length > 0 && !isAddingNew && (
            <div className="space-y-3 mb-4">
              <label className="text-xs font-black uppercase tracking-wider text-[#8896A4]">Select Delivery Address</label>
              <div className="grid gap-2">
                {savedAddresses.map((addr) => (
                  <label key={addr.id} className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${selectedAddressId === addr.id ? 'border-[#C4622D] bg-[#C4622D]/5' : 'border-[#1A1F36]/10'}`}>
                    <input type="radio" name="address" checked={selectedAddressId === addr.id} onChange={() => setSelectedAddressId(addr.id)} className="mt-1" />
                    <div>
                      <p className="text-sm font-black">{addr.recipient_name} {addr.is_default && <span className="text-[10px] bg-[#1A1F36] text-white px-2 py-0.5 rounded-full ml-2">DEFAULT</span>}</p>
                      <p className="text-xs text-[#40516A] font-semibold">{addr.line1}, {addr.line2 ? addr.line2 + ', ' : ''}{addr.city}, {addr.state} - {addr.pincode}</p>
                      <p className="text-xs text-[#8896A4]">Phone: {addr.phone}</p>
                    </div>
                  </label>
                ))}
              </div>
              <button type="button" onClick={() => setIsAddingNew(true)} className="text-xs font-black text-[#C4622D] underline">
                + Use a different address
              </button>
            </div>
          )}

          {(isAddingNew || savedAddresses.length === 0) && (
            <div className="space-y-3 mb-4 rounded-xl border border-[#1A1F36]/10 p-4 bg-[#FAF7F5]">
              <div className="flex justify-between items-center">
                <p className="text-xs font-black uppercase tracking-wider text-[#8896A4]">New Delivery Address</p>
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

          <button
            onClick={handleConfirmDelivery}
            disabled={confirmLoading}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-[#C4622D] px-6 py-3.5 text-sm font-black text-white shadow-sm transition-transform hover:scale-[1.02] disabled:opacity-50"
          >
            <CheckCircle2 className="h-4 w-4" />
            {confirmLoading ? 'Submitting Order...' : 'Confirm Address & Dispatch Order'}
          </button>
        </div>
      ) : activeOrder ? (
        <div className="dash-card p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-black uppercase tracking-widest text-[#8896A4]">Medication Fulfillment</h3>
            <span className="rounded-full bg-[#1A1F36]/5 px-3 py-1 text-xs font-black text-[#C4622D]">
              {STATUS_LABELS[activeOrder.status] || activeOrder.status}
            </span>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <p className="text-[10px] font-black uppercase tracking-wider text-[#8896A4]">Delivery Status</p>
              <p className="mt-1 text-sm font-bold text-[#1A1F36]">{STATUS_LABELS[activeOrder.status] || activeOrder.status}</p>
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-wider text-[#8896A4]">Fulfillment Partner</p>
              <p className="mt-1 text-sm font-bold text-[#1A1F36]">8LIV Licensed Partner Pharmacy</p>
            </div>
            {activeOrder.delivery_address_snapshot && (
              <div className="sm:col-span-2">
                <p className="text-[10px] font-black uppercase tracking-wider text-[#8896A4]">Delivery Address</p>
                <p className="mt-1 text-sm font-semibold text-[#40516A]">
                  {activeOrder.delivery_address_snapshot.recipient_name} • {activeOrder.delivery_address_snapshot.line1}, {activeOrder.delivery_address_snapshot.city}, {activeOrder.delivery_address_snapshot.state} - {activeOrder.delivery_address_snapshot.pincode}
                </p>
              </div>
            )}
            {activeOrder.courier_name && (
              <div>
                <p className="text-[10px] font-black uppercase tracking-wider text-[#8896A4]">Courier</p>
                <p className="mt-1 text-sm font-bold">{activeOrder.courier_name}</p>
              </div>
            )}
            {activeOrder.tracking_number && (
              <div>
                <p className="text-[10px] font-black uppercase tracking-wider text-[#8896A4]">Tracking Number</p>
                <p className="mt-1 text-sm font-bold">{activeOrder.tracking_number}</p>
              </div>
            )}
          </div>
        </div>
      ) : null}
    </div>
  )
}
