'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Building2, ShieldCheck, Phone, Mail, MapPin, ArrowLeft, Edit } from 'lucide-react'
import { authedFetch } from '@/lib/apiClient'

export default function PharmacyProfilePage() {
  const [pharmacy, setPharmacy] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    authedFetch('/api/pharmacy/onboarding')
      .then(async (res) => {
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || 'Failed to load profile.')
        setPharmacy(data.pharmacy)
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="min-h-screen bg-[#F5F0EB] p-8 font-bold">Loading profile...</div>

  const addr = pharmacy?.address

  return (
    <main className="min-h-screen bg-[#F5F0EB] p-6 text-[#1A1F36]">
      <div className="mx-auto max-w-4xl space-y-6">
        <Link href="/pharmacy" className="inline-flex items-center gap-2 text-xs font-black text-[#8896A4] hover:text-[#1A1F36]">
          <ArrowLeft className="h-4 w-4" /> Back to Fulfillment Orders
        </Link>

        {/* Profile Card */}
        <div className="rounded-2xl bg-white p-6 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#1A1F36] text-white">
                <Building2 className="h-7 w-7 text-[#C4622D]" />
              </div>
              <div>
                <h1 className="text-2xl font-black">{pharmacy?.name || 'Partner Pharmacy'}</h1>
                <p className="text-xs font-semibold text-[#8896A4]">{pharmacy?.legal_entity_name || pharmacy?.name}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className={`rounded-full px-3 py-1 text-xs font-black uppercase tracking-wider ${
                pharmacy?.verification_status === 'VERIFIED' ? 'bg-emerald-100 text-emerald-800' :
                pharmacy?.verification_status === 'UNDER_REVIEW' ? 'bg-amber-100 text-amber-800' : 'bg-zinc-100 text-zinc-700'
              }`}>
                {pharmacy?.verification_status || 'PENDING'}
              </span>
              <span className={`rounded-full px-3 py-1 text-xs font-black uppercase tracking-wider ${
                pharmacy?.status === 'ACTIVE' ? 'bg-blue-100 text-blue-800' : 'bg-zinc-100 text-zinc-700'
              }`}>
                {pharmacy?.status || 'INACTIVE'}
              </span>
            </div>
          </div>
        </div>

        {error && <p className="rounded-xl bg-red-50 p-4 text-sm font-bold text-red-700">{error}</p>}

        <div className="grid gap-6 sm:grid-cols-2">
          {/* Regulatory Licenses */}
          <div className="rounded-2xl bg-white p-6 shadow-sm space-y-4">
            <h2 className="text-sm font-black uppercase tracking-widest text-[#8896A4]">Drug Regulatory Credentials</h2>
            <div className="space-y-3 text-sm font-semibold">
              <div>
                <p className="text-[10px] font-black uppercase text-[#8896A4]">Drug License Number</p>
                <p className="font-bold text-[#1A1F36]">{pharmacy?.drug_license_number || 'Pending'}</p>
              </div>
              <div>
                <p className="text-[10px] font-black uppercase text-[#8896A4]">Drug License Type</p>
                <p className="font-bold text-[#1A1F36]">{pharmacy?.drug_license_type || 'Form 20B / 21B'}</p>
              </div>
              <div>
                <p className="text-[10px] font-black uppercase text-[#8896A4]">License Expiration</p>
                <p className="font-bold text-[#1A1F36]">{pharmacy?.drug_license_expiry ? new Date(pharmacy.drug_license_expiry).toLocaleDateString() : 'Pending'}</p>
              </div>
              <div>
                <p className="text-[10px] font-black uppercase text-[#8896A4]">Registered Pharmacist</p>
                <p className="font-bold text-[#1A1F36]">{pharmacy?.pharmacist_name || 'Designated Pharmacist'}</p>
              </div>
              <div>
                <p className="text-[10px] font-black uppercase text-[#8896A4]">Pharmacist Registration Number</p>
                <p className="font-bold text-[#1A1F36]">{pharmacy?.pharmacist_registration_number || 'Pending'}</p>
              </div>
            </div>
            <Link
              href="/pharmacy/onboarding"
              className="mt-4 inline-flex items-center gap-1.5 text-xs font-black text-[#C4622D] hover:underline"
            >
              <Edit className="h-3.5 w-3.5" /> Update Regulatory Documents
            </Link>
          </div>

          {/* Contact & Premises */}
          <div className="rounded-2xl bg-white p-6 shadow-sm space-y-4">
            <h2 className="text-sm font-black uppercase tracking-widest text-[#8896A4]">Contact & Physical Premises</h2>
            <div className="space-y-3 text-sm font-semibold">
              <div>
                <p className="text-[10px] font-black uppercase text-[#8896A4]">Official Email</p>
                <p className="font-bold text-[#1A1F36] flex items-center gap-1.5 mt-0.5">
                  <Mail className="h-4 w-4 text-[#8896A4]" /> {pharmacy?.email || '-'}
                </p>
              </div>
              <div>
                <p className="text-[10px] font-black uppercase text-[#8896A4]">Phone</p>
                <p className="font-bold text-[#1A1F36] flex items-center gap-1.5 mt-0.5">
                  <Phone className="h-4 w-4 text-[#8896A4]" /> {pharmacy?.phone || '-'}
                </p>
              </div>
              <div>
                <p className="text-[10px] font-black uppercase text-[#8896A4]">Physical Address</p>
                <p className="font-bold text-[#1A1F36] flex items-start gap-1.5 mt-0.5">
                  <MapPin className="h-4 w-4 text-[#8896A4] shrink-0 mt-0.5" />
                  {addr ? `${addr.line1 || ''}, ${addr.city || ''}, ${addr.state || ''} ${addr.pincode || ''}` : 'Premises address pending onboarding'}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}
