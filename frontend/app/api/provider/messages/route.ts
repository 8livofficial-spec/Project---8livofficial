import { NextResponse } from 'next/server'
import { getAuthenticatedProvider } from '@/lib/providerServer'
import { loadAssignedProviderPatients } from '@/lib/providerAssignedPatients'

export async function GET(request: Request) {
  const provider = await getAuthenticatedProvider(request)
  if ('error' in provider) {
    return NextResponse.json({ error: provider.error }, { status: provider.status })
  }

  try {
    const { patients } = await loadAssignedProviderPatients(provider.user.id, provider.role)
    return NextResponse.json({
      patients: patients.map((patient: any) => ({
        id: patient.id,
        name: patient.name,
        phone: patient.phone,
        membershipTier: patient.membershipTier,
      })),
    })
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unable to load message patients.' }, { status: 500 })
  }
}
