'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { authedFetch } from '@/lib/apiClient'

type OnboardingData = {
  profile?: { role: string; full_name: string; onboarding_status: string; payout_status: string; clinical_verification_status: string }
  professional?: unknown | null
  tax?: unknown | null
  payout?: unknown | null
  agreements?: Array<{ id: string; title: string; agreement_type: string; agreement_version: string }>
  acceptances?: Array<{ agreement_id: string; agreement_type: string; agreement_version: string; accepted_at: string }>
  reviews?: Array<{ provider_visible_feedback?: string; section: string; decision: string }>
}

const steps = ['Personal', 'Professional', 'Tax', 'Banking', 'Agreements', 'Submit']

function nextOnboardingStep(data: OnboardingData) {
  const status = data.profile?.onboarding_status
  if (status === 'SUBMITTED' || status === 'UNDER_REVIEW') return 5
  if (status === 'NOT_STARTED') return 0
  if (!data.professional) return 1
  if (!data.tax) return 2
  if (!data.payout) return 3

  const acceptedAgreementIds = new Set((data.acceptances || []).map((acceptance) => acceptance.agreement_id))
  const hasPendingAgreement = (data.agreements || []).some((agreement) => !acceptedAgreementIds.has(agreement.id))
  return hasPendingAgreement ? 4 : 5
}

export default function ProviderOnboardingPage() {
  const router = useRouter()
  const [data, setData] = useState<OnboardingData>({})
  const [step, setStep] = useState(0)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  const progress = useMemo(() => Math.round(((step + 1) / steps.length) * 100), [step])

  async function loadOnboarding() {
    const response = await authedFetch('/api/provider/onboarding')
    const json = await response.json()
    if (!response.ok) throw new Error(json.error || 'Unable to load onboarding.')
    setData(json)
    setStep(nextOnboardingStep(json))
    return json as OnboardingData
  }

  useEffect(() => {
    loadOnboarding().catch((err) => setError(err instanceof Error ? err.message : 'Unable to load onboarding.'))
  }, [])

  async function save(endpoint: string, payload: Record<string, unknown>) {
    setSaving(true)
    setError('')
    setMessage('')
    try {
      const response = await authedFetch(endpoint, { method: 'PATCH', body: JSON.stringify(payload) })
      const json = await response.json()
      if (!response.ok) throw new Error(json.error || 'Unable to save.')
      setMessage('Saved.')
      await loadOnboarding()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to save.')
    } finally {
      setSaving(false)
    }
  }

  async function acceptAgreement(agreementId: string) {
    const response = await authedFetch(`/api/provider/onboarding/agreements/${agreementId}/accept`, { method: 'POST', body: '{}' })
    const json = await response.json()
    if (!response.ok) throw new Error(json.error || 'Unable to accept agreement.')
    await loadOnboarding()
  }

  async function submitOnboarding() {
    setSaving(true)
    setError('')
    try {
      const response = await authedFetch('/api/provider/onboarding/submit', { method: 'POST', body: '{}' })
      const json = await response.json()
      if (!response.ok) throw new Error(json.error || 'Unable to submit onboarding.')
      router.replace('/provider/verification-status')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to submit onboarding.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <main className="min-h-screen bg-[#F9F6F0] px-4 py-8 text-[#1A1F36]">
      <section className="mx-auto max-w-5xl">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.18em] text-[#C4622D]">Provider onboarding</p>
            <h1 className="mt-2 text-3xl font-black">{data.profile?.full_name || 'Complete your profile'}</h1>
            <p className="mt-1 text-sm font-semibold text-[#6B7A90]">{data.profile?.role?.replaceAll('_', ' ') || 'Provider'} onboarding must be approved before clinical access.</p>
          </div>
          <div className="min-w-48">
            <div className="h-2 rounded-full bg-white"><div className="h-2 rounded-full bg-[#C4622D]" style={{ width: `${progress}%` }} /></div>
            <p className="mt-2 text-xs font-black uppercase tracking-[0.14em] text-[#6B7A90]">{progress}% complete</p>
          </div>
        </div>

        <div className="mt-6 flex gap-2 overflow-x-auto">
          {steps.map((label, index) => (
            <button key={label} onClick={() => setStep(index)} className={`rounded-lg px-4 py-2 text-xs font-black ${index === step ? 'bg-[#1A1F36] text-white' : 'bg-white text-[#1A1F36]'}`}>
              {label}
            </button>
          ))}
        </div>

        {data.reviews?.filter((review) => review.provider_visible_feedback).map((review) => (
          <p key={`${review.section}-${review.provider_visible_feedback}`} className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm font-bold text-amber-800">
            {review.section}: {review.provider_visible_feedback}
          </p>
        ))}
        {message && <p className="mt-4 rounded-lg bg-emerald-50 p-3 text-sm font-bold text-emerald-700">{message}</p>}
        {error && <p className="mt-4 rounded-lg bg-red-50 p-3 text-sm font-bold text-red-700">{error}</p>}

        <div className="mt-6 rounded-lg border border-[#E8DED4] bg-white p-6 shadow-sm">
          {step === 0 && <PersonalForm saving={saving} onSave={(payload) => save('/api/provider/onboarding/personal', payload)} defaultName={data.profile?.full_name || ''} />}
          {step === 1 && <ProfessionalForm role={data.profile?.role || 'DIETITIAN'} saving={saving} onSave={(payload) => save('/api/provider/onboarding/professional', payload)} />}
          {step === 2 && <TaxForm saving={saving} onSave={(payload) => save('/api/provider/onboarding/tax', payload)} />}
          {step === 3 && <BankingForm saving={saving} onSave={(payload) => save('/api/provider/onboarding/banking', payload)} />}
          {step === 4 && (
            <div>
              <h2 className="text-xl font-black">Agreements</h2>
              <div className="mt-4 space-y-3">
                {(data.agreements || []).map((agreement) => (
                  <label key={agreement.id} className="flex items-center gap-3 rounded-lg bg-[#F9F6F0] p-3 text-sm font-bold">
                    <input
                      type="checkbox"
                      checked={(data.acceptances || []).some((acceptance) => acceptance.agreement_id === agreement.id)}
                      onChange={(event) => event.currentTarget.checked && acceptAgreement(agreement.id).catch((err) => setError(err.message))}
                      readOnly={(data.acceptances || []).some((acceptance) => acceptance.agreement_id === agreement.id)}
                    />
                    {agreement.title} v{agreement.agreement_version}
                  </label>
                ))}
              </div>
              <button onClick={() => setStep(5)} className="mt-5 rounded-lg bg-[#1A1F36] px-5 py-3 text-sm font-black text-white">Continue</button>
            </div>
          )}
          {step === 5 && (
            <div>
              <h2 className="text-xl font-black">Review and submit</h2>
              <p className="mt-2 text-sm font-semibold text-[#6B7A90]">Submission freezes the current onboarding snapshot for admin review. Admins must request changes instead of editing your submitted legal, tax, or banking details.</p>
              <button disabled={saving} onClick={submitOnboarding} className="mt-5 rounded-lg bg-[#1A1F36] px-5 py-3 text-sm font-black text-white disabled:opacity-50">
                {saving ? 'Submitting...' : 'Submit for review'}
              </button>
            </div>
          )}
        </div>
      </section>
    </main>
  )
}

function formData(event: React.FormEvent<HTMLFormElement>): Record<string, unknown> {
  event.preventDefault()
  const form = new FormData(event.currentTarget)
  return Object.fromEntries(form.entries())
}

function PersonalForm({ onSave, saving, defaultName }: { onSave: (payload: Record<string, unknown>) => void; saving: boolean; defaultName: string }) {
  return (
    <form onSubmit={(event) => onSave(formData(event))} className="grid gap-4 md:grid-cols-2">
      <Input name="legalFullName" label="Legal full name" defaultValue={defaultName} />
      <Input name="displayName" label="Display name" required={false} />
      <Input name="dateOfBirth" label="Date of birth" type="date" />
      <Input name="primaryPhone" label="Primary phone" />
      <Input name="alternatePhone" label="Alternate phone" required={false} />
      <Input name="residentialAddress" label="Residential address" />
      <Input name="city" label="City" />
      <Input name="state" label="State" />
      <Input name="postalCode" label="Postal code" />
      <Input name="country" label="Country" defaultValue="India" />
      <button disabled={saving} className="rounded-lg bg-[#1A1F36] px-5 py-3 text-sm font-black text-white md:col-span-2">{saving ? 'Saving...' : 'Save personal details'}</button>
    </form>
  )
}

function ProfessionalForm({ role, onSave, saving }: { role: string; onSave: (payload: Record<string, unknown>) => void; saving: boolean }) {
  const isDoctor = role === 'DOCTOR'
  const isFitness = role === 'FITNESS_COACH'
  return (
    <form onSubmit={(event) => {
      const payload = formData(event)
      payload.consultationLanguages = String(payload.consultationLanguages || '').split(',').map((item) => item.trim()).filter(Boolean)
      payload.areasOfExpertise = String(payload.areasOfExpertise || '').split(',').map((item) => item.trim()).filter(Boolean)
      payload.trainingSpecialties = String(payload.trainingSpecialties || '').split(',').map((item) => item.trim()).filter(Boolean)
      payload.telemedicineEligibilityConfirmed = payload.telemedicineEligibilityConfirmed === 'on'
      payload.prescriptionEligibility = payload.prescriptionEligibility === 'on'
      onSave(payload)
    }} className="grid gap-4 md:grid-cols-2">
      <Input name="qualification" label="Qualification" />
      <Input name="yearsOfExperience" label="Years of experience" type="number" />
      <Input name="consultationLanguages" label="Languages, comma separated" />
      <Input name="professionalBiography" label="Professional biography" required={false} />
      {isDoctor ? (
        <>
          <Input name="specialization" label="Specialization" />
          <Input name="medicalCouncilName" label="Medical council name" />
          <Input name="medicalRegistrationNumber" label="Registration number" />
          <Input name="registrationState" label="Registration state" />
          <Input name="registrationIssueDate" label="Registration issue date" type="date" />
          <label className="text-sm font-bold"><input name="telemedicineEligibilityConfirmed" type="checkbox" className="mr-2" />Telemedicine eligibility confirmed</label>
          <label className="text-sm font-bold"><input name="prescriptionEligibility" type="checkbox" className="mr-2" />Prescription eligibility</label>
        </>
      ) : (
        <>
          <Input name={isFitness ? 'certificationBody' : 'specialization'} label={isFitness ? 'Certification body' : 'Specialization'} />
          <Input name="certificateNumber" label="Certificate number" required={false} />
          <Input name="institution" label="Institution" required={!isFitness} />
          <Input name="areasOfExpertise" label="Areas of expertise, comma separated" />
          {isFitness && <Input name="trainingSpecialties" label="Training specialties, comma separated" />}
        </>
      )}
      <button disabled={saving} className="rounded-lg bg-[#1A1F36] px-5 py-3 text-sm font-black text-white md:col-span-2">{saving ? 'Saving...' : 'Save professional details'}</button>
    </form>
  )
}

function TaxForm({ onSave, saving }: { onSave: (payload: Record<string, unknown>) => void; saving: boolean }) {
  return (
    <form onSubmit={(event) => {
      const payload = formData(event)
      payload.complianceConsent = payload.complianceConsent === 'on'
      onSave(payload)
    }} className="grid gap-4 md:grid-cols-2">
      <Input name="pan" label="PAN" />
      <Input name="panName" label="PAN name" />
      <Input name="entityType" label="Entity type" defaultValue="INDIVIDUAL" />
      <Input name="gstNumber" label="GST number" required={false} />
      <label className="text-sm font-bold md:col-span-2"><input name="complianceConsent" type="checkbox" className="mr-2" />I consent to tax and compliance data processing.</label>
      <button disabled={saving} className="rounded-lg bg-[#1A1F36] px-5 py-3 text-sm font-black text-white md:col-span-2">{saving ? 'Saving...' : 'Save tax details'}</button>
    </form>
  )
}

function BankingForm({ onSave, saving }: { onSave: (payload: Record<string, unknown>) => void; saving: boolean }) {
  return (
    <form onSubmit={(event) => {
      const payload = formData(event)
      payload.payoutConsent = payload.payoutConsent === 'on'
      onSave(payload)
    }} className="grid gap-4 md:grid-cols-2">
      <Input name="accountHolderName" label="Account holder name" />
      <Input name="accountNumber" label="Account number" />
      <Input name="confirmAccountNumber" label="Confirm account number" />
      <Input name="ifsc" label="IFSC" />
      <Input name="bankName" label="Bank name" />
      <Input name="branch" label="Branch" required={false} />
      <Input name="accountType" label="Account type" defaultValue="SAVINGS" />
      <Input name="upiId" label="UPI ID" required={false} />
      <label className="text-sm font-bold md:col-span-2"><input name="payoutConsent" type="checkbox" className="mr-2" />I consent to payout verification and bank data processing.</label>
      <button disabled={saving} className="rounded-lg bg-[#1A1F36] px-5 py-3 text-sm font-black text-white md:col-span-2">{saving ? 'Saving...' : 'Save banking details'}</button>
    </form>
  )
}

function Input({ label, name, type = 'text', required = true, defaultValue = '' }: { label: string; name: string; type?: string; required?: boolean; defaultValue?: string }) {
  return (
    <label className="block">
      <span className="text-xs font-black uppercase tracking-[0.16em] text-[#6B7A90]">{label}{required ? ' *' : ''}</span>
      <input name={name} type={type} required={required} defaultValue={defaultValue} className="mt-2 w-full rounded-lg border border-[#E8DED4] bg-[#F9F6F0] px-4 py-3 text-sm font-semibold outline-none focus:border-[#C4622D]" />
    </label>
  )
}
