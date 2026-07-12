import { NextResponse } from 'next/server'
import { getAuthenticatedPatient } from '@/lib/appointmentAvailability'
import { loadPatientDoctorAvailability, parsePatientAppointmentType } from '@/lib/patientAppointmentBooking'

const isDate = (value: string) => /^\d{4}-\d{2}-\d{2}$/.test(value)

export async function GET(request: Request) {
  try {
    const patient = await getAuthenticatedPatient(request)
    if ('error' in patient) return NextResponse.json({ error: patient.error }, { status: patient.status })

    const { searchParams } = new URL(request.url)
    const appointmentType = parsePatientAppointmentType(searchParams.get('appointmentType'))
    const date = String(searchParams.get('date') || '')

    if (!appointmentType) {
      return NextResponse.json({ error: 'A supported appointmentType is required.' }, { status: 400 })
    }
    if (date && !isDate(date)) {
      return NextResponse.json({ error: 'Date must be in YYYY-MM-DD format.' }, { status: 400 })
    }

    const result = await loadPatientDoctorAvailability({
      patientId: patient.user.id,
      appointmentType,
      date: date || null,
    })

    if ('error' in result) {
      return NextResponse.json({ error: result.error }, { status: result.status })
    }

    return NextResponse.json({ dates: result.dates, slots: result.slots })
  } catch (err: any) {
    console.error('Error loading patient appointment availability:', err)
    return NextResponse.json({ error: err.message || 'Unable to load appointment availability.' }, { status: 500 })
  }
}
