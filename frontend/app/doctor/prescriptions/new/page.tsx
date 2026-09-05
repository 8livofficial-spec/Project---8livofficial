'use client'

import { useSearchParams, useRouter } from 'next/navigation'
import { Suspense, useState, useEffect } from 'react'
import DoctorPrescriptionBuilderModal from '@/components/doctor/DoctorPrescriptionBuilderModal'
import OfficialPrescriptionModal from '@/components/doctor/OfficialPrescriptionModal'
import { authedFetch } from '@/lib/apiClient'

export default function NewDoctorPrescriptionPage() {
  return (
    <Suspense fallback={<main className="min-h-screen bg-[#F5F0EB] p-6 text-[#1A1F36]">Loading prescription builder...</main>}>
      <PrescriptionBuilderRoute />
    </Suspense>
  )
}

function PrescriptionBuilderRoute() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const consultationId = searchParams.get('consultationId') || ''
  const patientId = searchParams.get('patientId') || ''

  const [consultation, setConsultation] = useState<any | null>(null)
  const [patient, setPatient] = useState<any | null>(null)
  const [signedRx, setSignedRx] = useState<any | null>(null)

  useEffect(() => {
    const loadDetails = async () => {
      if (consultationId) {
        try {
          const res = await authedFetch(`/api/doctor/consultations?id=${consultationId}`)
          if (res.ok) {
            const data = await res.json()
            if (data.consultation) setConsultation(data.consultation)
          }
        } catch (e) {
          console.warn('Could not load consultation context:', e)
        }
      }
      if (patientId) {
        setPatient({ id: patientId })
      }
    }
    loadDetails()
  }, [consultationId, patientId])

  return (
    <main className="min-h-screen bg-[#F5F0EB] p-6">
      <DoctorPrescriptionBuilderModal
        isOpen={true}
        onClose={() => router.push('/doctor/dashboard')}
        onSuccess={(prescription, signed) => {
          if (signed) {
            setSignedRx(prescription)
          } else {
            router.push('/doctor/dashboard')
          }
        }}
        consultation={consultation || (consultationId ? { id: consultationId } : null)}
        patient={patient}
      />

      {signedRx && (
        <OfficialPrescriptionModal
          isOpen={true}
          onClose={() => router.push('/doctor/dashboard')}
          prescription={signedRx}
        />
      )}
    </main>
  )
}
