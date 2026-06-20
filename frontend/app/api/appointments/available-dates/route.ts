import { NextResponse } from 'next/server'
import { getAuthenticatedPatient, loadAvailableDates, parseBookableRole } from '@/lib/appointmentAvailability'

export async function GET(request: Request) {
  const patient = await getAuthenticatedPatient(request)
  if ('error' in patient) return NextResponse.json({ error: patient.error }, { status: patient.status })

  const { searchParams } = new URL(request.url)
  const role = parseBookableRole(searchParams.get('role'))
  if (!role) return NextResponse.json({ error: 'A supported provider role is required.' }, { status: 400 })

  const result = await loadAvailableDates({
    patientId: patient.user.id,
    role,
    providerId: searchParams.get('providerId'),
  })
  if ('error' in result) return NextResponse.json({ error: result.error }, { status: result.status })

  return NextResponse.json({ dates: result.dates })
}
