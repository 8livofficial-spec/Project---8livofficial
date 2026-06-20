import { NextResponse } from 'next/server'
import { getAuthenticatedPatient, loadAvailableSlots, parseBookableRole } from '@/lib/appointmentAvailability'

const isDate = (value: string) => /^\d{4}-\d{2}-\d{2}$/.test(value)

export async function GET(request: Request) {
  const patient = await getAuthenticatedPatient(request)
  if ('error' in patient) return NextResponse.json({ error: patient.error }, { status: patient.status })

  const { searchParams } = new URL(request.url)
  const role = parseBookableRole(searchParams.get('role'))
  const date = String(searchParams.get('date') || '')
  if (!role || !isDate(date)) return NextResponse.json({ error: 'A supported role and date in YYYY-MM-DD format are required.' }, { status: 400 })

  const result = await loadAvailableSlots({
    patientId: patient.user.id,
    role,
    providerId: searchParams.get('providerId'),
    date,
  })
  if ('error' in result) return NextResponse.json({ error: result.error }, { status: result.status })
  return NextResponse.json({ slots: result.slots })
}
