'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Building2, ShieldCheck, CheckCircle2, Clock, AlertCircle, FileText, ArrowLeft, LogOut } from 'lucide-react'
import { authedFetch } from '@/lib/apiClient'
import { supabase } from '@/lib/supabaseClient'

export default function PharmacyOnboardingPage() {
  const router = useRouter()
  const [pharmacy, setPharmacy] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    document.cookie = 'user_role=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT'
    router.push('/login?role=pharmacy')
  }

  const [form, setForm] = useState({
    legal_entity_name: '',
    drug_license_number: '',
    drug_license_type: '20B/21B',
    drug_license_expiry: '',
    pharmacist_name: '',
    pharmacist_registration_number: '',
    phone: '',
    line1: '',
    city: '',
    state: '',
    pincode: '',
  })

  useEffect(() => {
    authedFetch('/api/pharmacy/onboarding')
      .then(async (res) => {
        const data = await res.json()
        if (res.ok && data.pharmacy) {
          setPharmacy(data.pharmacy)
          setForm({
            legal_entity_name: data.pharmacy.legal_entity_name || data.pharmacy.name || '',
            drug_license_number: data.pharmacy.drug_license_number?.startsWith('PENDING-') ? '' : data.pharmacy.drug_license_number || '',
            drug_license_type: data.pharmacy.drug_license_type || '20B/21B',
            drug_license_expiry: data.pharmacy.drug_license_expiry ? data.pharmacy.drug_license_expiry.split('T')[0] : '',
            pharmacist_name: data.pharmacy.pharmacist_name === 'Designated Pharmacist' ? '' : data.pharmacy.pharmacist_name || '',
            pharmacist_registration_number: data.pharmacy.pharmacist_registration_number === 'PENDING' ? '' : data.pharmacy.pharmacist_registration_number || '',
            phone: data.pharmacy.phone || '',
            line1: data.pharmacy.address?.line1 || '',
            city: data.pharmacy.address?.city || '',
            state: data.pharmacy.address?.state || '',
            pincode: data.pharmacy.address?.pincode || '',
          })
        }
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setError('')
    setSuccess('')
    try {
      const res = await authedFetch('/api/pharmacy/onboarding', {
        method: 'PATCH',
        body: JSON.stringify({
          legal_entity_name: form.legal_entity_name,
          drug_license_number: form.drug_license_number,
          drug_license_type: form.drug_license_type,
          drug_license_expiry: form.drug_license_expiry,
          pharmacist_name: form.pharmacist_name,
          pharmacist_registration_number: form.pharmacist_registration_number,
          phone: form.phone,
          address: {
            line1: form.line1,
            city: form.city,
            state: form.state,
            pincode: form.pincode,
          },
        }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to submit onboarding details.')

      setSuccess('Details submitted! Your pharmacy verification is now UNDER_REVIEW by 8LIV Administrators. Once approved, your fulfillment portal will activate.')
      setPharmacy(data.pharmacy)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) return <div className="min-h-screen bg-[#F5F0EB] p-8 font-bold">Loading pharmacy profile...</div>

  const isVerifiedActive = pharmacy?.verification_status === 'VERIFIED' && pharmacy?.status === 'ACTIVE'
  const isUnderReview = pharmacy?.verification_status === 'UNDER_REVIEW'

  return (
    <main className="min-h-screen bg-[#F5F0EB] p-6 text-[#1A1F36]">
      <div className="mx-auto max-w-3xl space-y-6">
        {/* Navigation & Header */}
        <div>
          <Link
            href="/pharmacy"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-[#8896A4] hover:text-[#1A1F36] transition-colors mb-3"
          >
            <ArrowLeft className="h-4 w-4" /> Back to Pharmacy Portal
          </Link>

          <div className="rounded-2xl bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-black uppercase tracking-widest text-[#C4622D]">Regulatory Compliance</p>
                <h1 className="mt-1 text-2xl font-black">{pharmacy?.name || 'Partner Pharmacy'} Onboarding</h1>
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
                <button
                  onClick={handleSignOut}
                  className="inline-flex items-center gap-1 rounded-xl border border-[#1A1F36]/10 px-3 py-1.5 text-xs font-black text-[#8896A4] hover:bg-[#F5F0EB] hover:text-[#1A1F36] transition-colors"
                >
                  <LogOut className="h-3 w-3" /> Sign Out
                </button>
              </div>
            </div>

            {isVerifiedActive && (
              <div className="mt-4 rounded-xl bg-emerald-50 border border-emerald-200 p-4 flex items-center justify-between">
                <div className="flex items-center gap-2 text-emerald-800 text-sm font-bold">
                  <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                  Your pharmacy is fully verified and active. You can fulfill assigned prescription orders.
                </div>
                <Link href="/pharmacy" className="rounded-xl bg-[#1A1F36] text-white px-4 py-2 text-xs font-black">
                  Go to Fulfillment Orders
                </Link>
              </div>
            )}

            {isUnderReview && !isVerifiedActive && (
              <div className="mt-4 rounded-xl bg-amber-50 border border-amber-200 p-4 flex items-center justify-between">
                <div className="flex items-center gap-2 text-amber-900 text-xs font-bold">
                  <Clock className="h-4 w-4 text-amber-700 shrink-0" />
                  Your credentials have been submitted and are UNDER REVIEW by 8LIV Administrators. You may edit below if needed.
                </div>
                <Link href="/pharmacy" className="rounded-xl border border-amber-300 bg-white text-amber-900 px-3 py-1.5 text-xs font-black hover:bg-amber-100">
                  View Portal Status
                </Link>
              </div>
            )}
          </div>
        </div>

        {error && <p className="rounded-xl bg-red-50 border border-red-200 p-4 text-sm font-bold text-red-700">{error}</p>}
        {success && (
          <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-4 text-sm font-bold text-emerald-800 flex items-center justify-between">
            <p>{success}</p>
            <Link href="/pharmacy" className="rounded-lg bg-emerald-700 text-white px-3 py-1.5 text-xs font-black shrink-0 ml-3">
              View Status
            </Link>
          </div>
        )}

        <form onSubmit={handleSubmit} className="rounded-2xl bg-white p-6 shadow-sm space-y-4">
          <h2 className="text-base font-black">Pharmacy Regulatory Details</h2>
          <p className="text-xs font-semibold text-[#8896A4]">
            Under CDSCO and state drug control rules, all fulfillment pharmacies must hold valid retail/wholesale drug licenses.
          </p>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="text-[10px] font-black uppercase tracking-wider text-[#8896A4]">Legal Entity Name</label>
              <input
                required
                value={form.legal_entity_name}
                onChange={(e) => setForm({ ...form, legal_entity_name: e.target.value })}
                className="mt-1 w-full rounded-xl border border-[#1A1F36]/10 p-2.5 text-sm font-semibold"
              />
            </div>
            <div>
              <label className="text-[10px] font-black uppercase tracking-wider text-[#8896A4]">Contact Phone</label>
              <input
                required
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                className="mt-1 w-full rounded-xl border border-[#1A1F36]/10 p-2.5 text-sm font-semibold"
              />
            </div>

            <div>
              <label className="text-[10px] font-black uppercase tracking-wider text-[#8896A4]">Drug License Number</label>
              <input
                required
                placeholder="e.g. KA-B1-123456 / 20B/21B"
                value={form.drug_license_number}
                onChange={(e) => setForm({ ...form, drug_license_number: e.target.value })}
                className="mt-1 w-full rounded-xl border border-[#1A1F36]/10 p-2.5 text-sm font-semibold"
              />
            </div>

            <div>
              <label className="text-[10px] font-black uppercase tracking-wider text-[#8896A4]">Drug License Type</label>
              <input
                required
                placeholder="Form 20B / 21B"
                value={form.drug_license_type}
                onChange={(e) => setForm({ ...form, drug_license_type: e.target.value })}
                className="mt-1 w-full rounded-xl border border-[#1A1F36]/10 p-2.5 text-sm font-semibold"
              />
            </div>

            <div>
              <label className="text-[10px] font-black uppercase tracking-wider text-[#8896A4]">License Expiry Date</label>
              <input
                required
                type="date"
                value={form.drug_license_expiry}
                onChange={(e) => setForm({ ...form, drug_license_expiry: e.target.value })}
                className="mt-1 w-full rounded-xl border border-[#1A1F36]/10 p-2.5 text-sm font-semibold"
              />
            </div>

            <div>
              <label className="text-[10px] font-black uppercase tracking-wider text-[#8896A4]">Registered Pharmacist Name</label>
              <input
                required
                placeholder="Full registered name"
                value={form.pharmacist_name}
                onChange={(e) => setForm({ ...form, pharmacist_name: e.target.value })}
                className="mt-1 w-full rounded-xl border border-[#1A1F36]/10 p-2.5 text-sm font-semibold"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="text-[10px] font-black uppercase tracking-wider text-[#8896A4]">Pharmacist State Registration Number</label>
              <input
                required
                placeholder="State Pharmacy Council Registration No."
                value={form.pharmacist_registration_number}
                onChange={(e) => setForm({ ...form, pharmacist_registration_number: e.target.value })}
                className="mt-1 w-full rounded-xl border border-[#1A1F36]/10 p-2.5 text-sm font-semibold"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="text-[10px] font-black uppercase tracking-wider text-[#8896A4]">Pharmacy Physical Address</label>
              <input
                required
                placeholder="Premises, Street, Building"
                value={form.line1}
                onChange={(e) => setForm({ ...form, line1: e.target.value })}
                className="mt-1 w-full rounded-xl border border-[#1A1F36]/10 p-2.5 text-sm font-semibold"
              />
            </div>

            <div>
              <label className="text-[10px] font-black uppercase tracking-wider text-[#8896A4]">City</label>
              <input
                required
                value={form.city}
                onChange={(e) => setForm({ ...form, city: e.target.value })}
                className="mt-1 w-full rounded-xl border border-[#1A1F36]/10 p-2.5 text-sm font-semibold"
              />
            </div>

            <div>
              <label className="text-[10px] font-black uppercase tracking-wider text-[#8896A4]">State</label>
              <input
                required
                value={form.state}
                onChange={(e) => setForm({ ...form, state: e.target.value })}
                className="mt-1 w-full rounded-xl border border-[#1A1F36]/10 p-2.5 text-sm font-semibold"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="mt-6 inline-flex items-center gap-2 rounded-xl bg-[#1A1F36] px-6 py-3 text-sm font-black text-white hover:bg-[#2A314E] disabled:opacity-50"
          >
            <ShieldCheck className="h-4 w-4" />
            {submitting ? 'Submitting Details...' : 'Submit Credentials for Review'}
          </button>
        </form>
      </div>
    </main>
  )
}
