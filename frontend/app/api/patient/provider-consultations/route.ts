import { NextResponse } from 'next/server'
import { randomUUID } from 'crypto'
import { supabaseAdmin } from '@/lib/supabaseServer'
import { createJitsiMeeting } from '@/lib/jitsi'
import { appointmentTypeForRole, getAssignedProviderForRole, labelForRole, normalizeProviderRole } from '@/lib/providerConsultations'
import { getAuthenticatedPatient, isFutureIndiaSlot } from '@/lib/appointmentAvailability'

type ProviderAvailability = {
  id: string
  provider_id: string
  provider_role: string
  available_date: string
  start_time: string
  end_time: string
  slot_duration?: number | null
  break_start?: string | null
  break_end?: string | null
  is_available?: boolean
  status?: 'AVAILABLE' | 'BOOKED' | 'CANCELLED' | 'EXPIRED'
  max_consultations_per_day?: number | null
  max_consultations_per_hour?: number | null
}

type ProviderSlot = {
  availability_id: string
  available_date: string
  time_slot: string
  provider_id: string
  provider_role: string
}

function isDate(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value)
}

function normalizeTime(value: string) {
  const trimmed = String(value || '').trim()
  const ampmMatch = trimmed.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i)
  if (ampmMatch) {
    let hour = Number(ampmMatch[1])
    const minute = Number(ampmMatch[2])
    const meridiem = ampmMatch[3].toUpperCase()
    if (meridiem === 'PM' && hour < 12) hour += 12
    if (meridiem === 'AM' && hour === 12) hour = 0
    return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`
  }

  const timeMatch = trimmed.match(/^(\d{1,2}):(\d{2})(?::\d{2})?$/)
  if (!timeMatch) return ''
  return `${String(Number(timeMatch[1])).padStart(2, '0')}:${timeMatch[2]}`
}

function toMinutes(value: string) {
  const normalized = normalizeTime(value)
  const [hour, minute] = normalized.split(':').map(Number)
  if (!Number.isFinite(hour) || !Number.isFinite(minute)) return null
  return hour * 60 + minute
}

function isFutureSlot(date: string, time: string) {
  return isFutureIndiaSlot(date, normalizeTime(time))
}

async function getAssignedProviderId(patientId: string, role: string) {
  const providerId = await getAssignedProviderForRole(patientId, role)
  if (!providerId) return null

  const { data: providerProfile } = await supabaseAdmin
    .from('provider_profiles')
    .select('provider_id, status')
    .eq('provider_id', providerId)
    .maybeSingle()

  if (providerProfile && providerProfile.status !== 'active') return null
  return providerId
}

async function getAvailableProviderSlots(patientId: string, role: string, selectedDate?: string) {
  const providerId = await getAssignedProviderId(patientId, role)
  if (!providerId) {
    return { providerId: null, slots: [] as ProviderSlot[], error: `No active assigned ${labelForRole(role)} found for this patient.` }
  }

  const today = new Date().toISOString().split('T')[0]
  const dateFilter = selectedDate && isDate(selectedDate) ? selectedDate : ''
  const normalizedRole = normalizeProviderRole(role)
  const roles = normalizedRole === 'fitness_coach' ? ['fitness_coach', 'trainer'] : [normalizedRole]

  let query = supabaseAdmin
    .from('provider_availability')
    .select('id, provider_id, provider_role, available_date, start_time, end_time, slot_duration, max_consultations_per_day, max_consultations_per_hour')
    .eq('provider_id', providerId)
    .eq('is_available', true)
    .eq('status', 'AVAILABLE')
    .in('provider_role', roles)

  if (dateFilter) {
    query = query.eq('available_date', dateFilter)
  } else {
    query = query.gte('available_date', today)
  }

  const { data: availability, error: availabilityError } = await query
    .order('available_date', { ascending: true })
    .order('start_time', { ascending: true })

  if (availabilityError) {
    return { providerId, slots: [] as ProviderSlot[], error: availabilityError.message }
  }

  if (!availability?.length) return { providerId, slots: [] as ProviderSlot[] }

  const dates = Array.from(new Set((availability as ProviderAvailability[]).map((row) => row.available_date)))
  const [{ data: existingSessions }, { data: leaveRows }] = await Promise.all([
    supabaseAdmin
      .from('staff_consultations')
      .select('booking_date, booking_time, status')
      .eq('staff_id', providerId)
      .in('booking_date', dates)
      .in('status', ['scheduled', 'calling', 'attended']),
    supabaseAdmin
      .from('provider_leave')
      .select('starts_at, ends_at, status')
      .eq('provider_id', providerId)
      .eq('status', 'ACTIVE')
  ])

  const bookedByDate = new Map<string, Set<string>>()
  for (const session of existingSessions || []) {
    const time = normalizeTime(session.booking_time)
    if (!time) continue
    if (!bookedByDate.has(session.booking_date)) bookedByDate.set(session.booking_date, new Set())
    bookedByDate.get(session.booking_date)!.add(time)
  }

  const slots: ProviderSlot[] = []
  for (const row of availability as ProviderAvailability[]) {
    const start = toMinutes(row.start_time)
    const end = toMinutes(row.end_time)
    if (start === null || end === null || end <= start) continue

    const bookedForDay = bookedByDate.get(row.available_date) || new Set<string>()
    const dailyLimit = row.max_consultations_per_day || null
    if (dailyLimit && bookedForDay.size >= dailyLimit) continue
    const time = normalizeTime(row.start_time)
    if (!time || bookedForDay.has(time) || !isFutureSlot(row.available_date, time)) continue

    const hourlyLimit = row.max_consultations_per_hour || null
    if (hourlyLimit) {
      const slotHour = time.slice(0, 2)
      const bookedInHour = Array.from(bookedForDay).filter(bookedTime => bookedTime.slice(0, 2) === slotHour).length
      if (bookedInHour >= hourlyLimit) continue
    }

    const slotStart = new Date(`${row.available_date}T${time}:00`).getTime()
    const onLeave = (leaveRows || []).some(leave => {
      const leaveStart = new Date(leave.starts_at).getTime()
      const leaveEnd = new Date(leave.ends_at).getTime()
      return Number.isFinite(leaveStart) && Number.isFinite(leaveEnd) && slotStart >= leaveStart && slotStart < leaveEnd
    })
    if (onLeave) continue

    slots.push({
      availability_id: row.id,
      available_date: row.available_date,
      time_slot: time,
      provider_id: providerId,
      provider_role: row.provider_role,
    })
  }

  const unique = new Map(slots.map((slot) => [`${slot.provider_id}-${slot.available_date}-${slot.time_slot}`, slot]))
  return {
    providerId,
    slots: Array.from(unique.values()).sort((a, b) => {
      return new Date(`${a.available_date}T${a.time_slot}:00`).getTime() - new Date(`${b.available_date}T${b.time_slot}:00`).getTime()
    }),
  }
}

export async function GET(request: Request) {
  try {
    const authenticatedPatient = await getAuthenticatedPatient(request)
    if ('error' in authenticatedPatient) return NextResponse.json({ error: authenticatedPatient.error }, { status: authenticatedPatient.status })
    const { searchParams } = new URL(request.url)
    const patientId = String(searchParams.get('patientId') || '').trim()
    const role = normalizeProviderRole(String(searchParams.get('role') || searchParams.get('staffType') || '').trim())
    const selectedDate = String(searchParams.get('date') || '').trim()

    if (!patientId || !role) {
      return NextResponse.json({ error: 'patientId and role are required.' }, { status: 400 })
    }
    if (patientId !== authenticatedPatient.user.id) {
      return NextResponse.json({ error: 'Patient identity does not match the authenticated session.' }, { status: 403 })
    }

    if (!['dietitian', 'nutritionist', 'fitness_coach'].includes(role)) {
      return NextResponse.json({ error: 'This provider role does not support patient booking here.' }, { status: 400 })
    }

    const result = await getAvailableProviderSlots(patientId, role, selectedDate)
    if (result.error) return NextResponse.json({ error: result.error }, { status: result.providerId ? 500 : 404 })

    const groupedSlots = new Map<string, { available_date: string; time_slot: string; available_count: number }>()
    for (const slot of result.slots) {
      groupedSlots.set(`${slot.available_date}-${slot.time_slot}`, {
        available_date: slot.available_date,
        time_slot: slot.time_slot,
        available_count: 1,
      })
    }

    return NextResponse.json({ slots: Array.from(groupedSlots.values()) })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unable to load provider slots.'
    console.error('API Error in GET /api/patient/provider-consultations:', err)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const authenticatedPatient = await getAuthenticatedPatient(request)
    if ('error' in authenticatedPatient) return NextResponse.json({ error: authenticatedPatient.error }, { status: authenticatedPatient.status })
    const body = await request.json()
    const patientId = String(body.patientId || '').trim()
    const role = normalizeProviderRole(String(body.role || body.staffType || '').trim())
    const bookingDate = String(body.bookingDate || '').trim()
    const bookingTime = normalizeTime(String(body.bookingTime || '').trim())

    if (!patientId || !role || !bookingDate || !bookingTime) {
      return NextResponse.json({ error: 'patientId, role, bookingDate, and bookingTime are required.' }, { status: 400 })
    }
    if (patientId !== authenticatedPatient.user.id) {
      return NextResponse.json({ error: 'Patient identity does not match the authenticated session.' }, { status: 403 })
    }

    if (!['dietitian', 'nutritionist', 'fitness_coach'].includes(role)) {
      return NextResponse.json({ error: 'This provider role does not support patient booking here.' }, { status: 400 })
    }

    if (!isFutureSlot(bookingDate, bookingTime)) {
      return NextResponse.json({ error: 'Please select a future consultation time.' }, { status: 409 })
    }

    // Prevent duplicate booking for this role: check if patient already has an active scheduled session
    const { data: existingActive, error: activeErr } = await supabaseAdmin
      .from('staff_consultations')
      .select('id')
      .eq('patient_id', patientId)
      .eq('staff_role', role)
      .in('status', ['scheduled', 'calling', 'attended'])
      .limit(1)
      .maybeSingle()

    if (activeErr) {
      console.error('Active appointment lookup failed:', activeErr)
    }
    if (existingActive?.id) {
      return NextResponse.json({ error: `You already have an active scheduled ${labelForRole(role)} consultation.` }, { status: 409 })
    }

    const availableResult = await getAvailableProviderSlots(patientId, role, bookingDate)
    if (availableResult.error) {
      return NextResponse.json({ error: availableResult.error }, { status: availableResult.providerId ? 500 : 404 })
    }

    const selectedSlot = availableResult.slots.find((slot) => slot.available_date === bookingDate && slot.time_slot === bookingTime)
    if (!selectedSlot) {
      return NextResponse.json({ error: 'Selected slot is no longer available. Please choose another time.' }, { status: 409 })
    }

    const providerId = availableResult.providerId
    if (!providerId) {
      return NextResponse.json({ error: `No assigned ${labelForRole(role)} found for this patient.` }, { status: 404 })
    }

    const { data: conflictingSession } = await supabaseAdmin
      .from('staff_consultations')
      .select('id')
      .eq('staff_id', providerId)
      .eq('booking_date', bookingDate)
      .eq('booking_time', bookingTime)
      .in('status', ['scheduled', 'calling', 'attended'])
      .limit(1)
      .maybeSingle()

    if (conflictingSession?.id) {
      return NextResponse.json({ error: `${labelForRole(role)} is already booked for this slot.` }, { status: 409 })
    }

    const { data: reservedAvailability, error: reserveError } = await supabaseAdmin
      .from('provider_availability')
      .update({
        status: 'BOOKED',
        is_available: false,
        updated_at: new Date().toISOString(),
      })
      .eq('id', selectedSlot.availability_id)
      .eq('provider_id', providerId)
      .eq('provider_role', selectedSlot.provider_role)
      .eq('available_date', bookingDate)
      .eq('status', 'AVAILABLE')
      .select('id')
      .maybeSingle()

    if (reserveError) {
      console.error('Provider availability reservation failed:', reserveError)
      return NextResponse.json({ error: 'Unable to reserve selected provider slot.' }, { status: 500 })
    }
    if (!reservedAvailability?.id) {
      return NextResponse.json({ error: 'Selected slot is no longer available. Please choose another time.' }, { status: 409 })
    }

    const consultationId = randomUUID()
    const meeting = createJitsiMeeting(consultationId)
    const roleLabel = labelForRole(role)

    let { data: consultation, error } = await supabaseAdmin
      .from('staff_consultations')
      .insert({
        id: consultationId,
        staff_id: providerId,
        staff_role: role,
        appointment_type: appointmentTypeForRole(role),
        patient_id: patientId,
        booking_date: bookingDate,
        booking_time: bookingTime,
        status: 'scheduled',
        room_url: meeting.meetingUrl,
        meeting_provider: meeting.meetingProvider,
        meeting_room: meeting.meetingRoom,
        meeting_url: meeting.meetingUrl,
        is_completed: false,
      })
      .select()
      .single()

    if (error) {
      const fallback = await supabaseAdmin
        .from('staff_consultations')
        .insert({
          id: consultationId,
          staff_id: providerId,
          staff_role: role,
          patient_id: patientId,
          booking_date: bookingDate,
          booking_time: bookingTime,
          status: 'scheduled',
          room_url: meeting.meetingUrl,
        })
        .select()
        .single()
      consultation = fallback.data
      error = fallback.error
    }

    if (error) {
      await supabaseAdmin
        .from('provider_availability')
        .update({
          status: 'AVAILABLE',
          is_available: true,
          updated_at: new Date().toISOString(),
        })
        .eq('id', selectedSlot.availability_id)
        .eq('provider_id', providerId)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const response = NextResponse.json({ success: true, consultation })

    // Execute non-critical tasks in background
    Promise.resolve().then(async () => {
      try {
        await Promise.all([
          supabaseAdmin
            .from('patient_notifications')
            .insert({
              patient_id: patientId,
              type: 'appointment',
              title: `${roleLabel} session booked`,
              message: `Your ${roleLabel} video session is scheduled for ${bookingDate} at ${bookingTime}.`,
              is_read: false,
            }),
          supabaseAdmin
            .from('provider_notifications')
            .insert({
              provider_id: providerId,
              type: 'appointment',
              title: `New ${roleLabel} session booked`,
              message: `A patient session is scheduled for ${bookingDate} at ${bookingTime}.`,
              metadata: { patientId, consultationId },
              is_read: false,
            })
        ])
      } catch (backgroundErr) {
        console.error('Failed executing background notifications insert:', backgroundErr)
      }
    })

    return response
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unable to book provider consultation.'
    console.error('API Error in /api/patient/provider-consultations:', err)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
