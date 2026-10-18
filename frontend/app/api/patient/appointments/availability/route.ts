import { NextResponse } from 'next/server'
import { getAuthenticatedPatient } from '@/lib/appointmentAvailability'
import { loadPatientDoctorAvailability, parsePatientAppointmentType } from '@/lib/patientAppointmentBooking'

const isDate = (value: string) => /^\d{4}-\d{2}-\d{2}$/.test(value)

export async function GET(request: Request) {
  try {
    const patient = await getAuthenticatedPatient(request)
    if ('error' in patient) return NextResponse.json({ error: patient.error }, { status: patient.status })

    const { searchParams } = new URL(request.url)
    const rawRole = searchParams.get('role') || 'doctor'
    const normalizedRole = rawRole.toLowerCase() === 'trainer' ? 'fitness_coach' : rawRole.toLowerCase()
    const rawAppointmentType = searchParams.get('appointmentType')
    const appointmentType = rawAppointmentType && rawAppointmentType.toUpperCase() !== 'AUTO'
      ? parsePatientAppointmentType(rawAppointmentType)
      : null
    const date = String(searchParams.get('date') || '')
    const force = searchParams.get('force') === 'true'

    if (date && !isDate(date)) {
      return NextResponse.json({ error: 'Date must be in YYYY-MM-DD format.' }, { status: 400 })
    }

    if (normalizedRole === 'dietitian' || normalizedRole === 'fitness_coach') {
      const { loadAvailableDates, loadAvailableSlots } = await import('@/lib/appointmentAvailability')
      if (date) {
        const slotResult = await loadAvailableSlots({
          patientId: patient.user.id,
          role: normalizedRole as any,
          date,
        })
        if ('error' in slotResult) {
          return NextResponse.json({ error: slotResult.error }, { status: slotResult.status })
        }
        return NextResponse.json(
          { dates: [{ date, availableCount: slotResult.slots.length }], slots: slotResult.slots, appointmentType: normalizedRole.toUpperCase() },
          { headers: { 'Cache-Control': 'private, no-cache, no-store, must-revalidate' } }
        )
      } else {
        const dateResult = await loadAvailableDates({
          patientId: patient.user.id,
          role: normalizedRole as any,
        })
        if ('error' in dateResult) {
          return NextResponse.json({ error: dateResult.error }, { status: dateResult.status })
        }
        return NextResponse.json(
          { dates: dateResult.dates, slots: dateResult.slots, appointmentType: normalizedRole.toUpperCase() },
          { headers: { 'Cache-Control': 'private, no-cache, no-store, must-revalidate' } }
        )
      }
    }

    if (rawAppointmentType && rawAppointmentType.toUpperCase() !== 'AUTO' && !appointmentType) {
      return NextResponse.json({ error: 'A supported appointmentType is required.' }, { status: 400 })
    }

    const result = await loadPatientDoctorAvailability({
      patientId: patient.user.id,
      appointmentType,
      date: date || null,
      force,
    })

    if ('error' in result) {
      return NextResponse.json({ error: result.error }, { status: result.status })
    }

    return NextResponse.json(
      { dates: result.dates, slots: result.slots, appointmentType: result.appointmentType },
      {
        headers: {
          'Cache-Control': 'private, no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
        },
      }
    )
  } catch (err: any) {
    console.error('Error loading patient appointment availability:', err)
    return NextResponse.json({ error: err.message || 'Unable to load appointment availability.' }, { status: 500 })
  }
}
