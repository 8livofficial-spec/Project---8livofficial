import { NextResponse } from 'next/server'
import { getAuthenticatedProvider } from '@/lib/providerServer'
import { supabaseAdmin } from '@/lib/supabaseServer'

const activeStatuses = ['AVAILABLE', 'BOOKED']
type Source = 'MANUAL' | 'GENERATED'

type ExistingSlot = { id: string; available_date: string; start_time: string; end_time: string; status?: string }
type StaffConsultation = { patient_id?: string | null; meeting_url?: string | null; [key: string]: unknown }
type PatientProfile = { id: string; first_name?: string | null; last_name?: string | null; email?: string | null }

const isDate = (value: string) => /^\d{4}-\d{2}-\d{2}$/.test(value)
const isTime = (value: string) => /^\d{2}:\d{2}(:\d{2})?$/.test(value)

function normalizeTime(value: string) {
  const match = String(value || '').trim().match(/^(\d{1,2}):(\d{2})(?::\d{2})?$/)
  if (!match || Number(match[1]) > 23 || Number(match[2]) > 59) return ''
  return `${String(Number(match[1])).padStart(2, '0')}:${match[2]}:00`
}

function minutesFromTime(value: string) {
  const normalized = normalizeTime(value)
  if (!normalized) return null
  const [hour, minute] = normalized.split(':').map(Number)
  return hour * 60 + minute
}

function timeFromMinutes(minutes: number) {
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:00`
}

function timesOverlap(firstStart: string, firstEnd: string, secondStart: string, secondEnd: string) {
  return normalizeTime(firstStart) < normalizeTime(secondEnd) && normalizeTime(firstEnd) > normalizeTime(secondStart)
}

function isPastSlot(date: string, time: string) {
  const timestamp = new Date(`${date}T${normalizeTime(time)}+05:30`).getTime()
  return !Number.isFinite(timestamp) || timestamp <= Date.now()
}

export async function GET(request: Request) {
  const provider = await getAuthenticatedProvider(request)
  if ('error' in provider) return NextResponse.json({ error: provider.error }, { status: provider.status })

  const { searchParams } = new URL(request.url)
  const from = searchParams.get('from')
  const to = searchParams.get('to')
  const today = new Date().toISOString().split('T')[0]
  let query = supabaseAdmin
    .from('provider_availability')
    .select('*')
    .eq('provider_id', provider.user.id)
    .eq('provider_role', provider.role)
    .order('available_date', { ascending: true })
    .order('start_time', { ascending: true })
  query = query.gte('available_date', from && isDate(from) ? from : today)
  if (to && isDate(to)) query = query.lte('available_date', to)

  const [{ data, error }, consultationsResult] = await Promise.all([
    query,
    supabaseAdmin.from('staff_consultations').select('*').eq('staff_id', provider.user.id).order('booking_date').order('booking_time'),
  ])
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (consultationsResult.error) return NextResponse.json({ error: consultationsResult.error.message }, { status: 500 })

  const consultationRows = (consultationsResult.data || []) as StaffConsultation[]
  const patientIds = Array.from(new Set(consultationRows.map(row => row.patient_id).filter(Boolean))) as string[]
  const profilesResult = patientIds.length
    ? await supabaseAdmin.from('profiles').select('id, first_name, last_name, email').in('id', patientIds)
    : { data: [], error: null }
  if (profilesResult.error) return NextResponse.json({ error: profilesResult.error.message }, { status: 500 })
  const profiles = (profilesResult.data || []) as PatientProfile[]
  const consultations = consultationRows.map(consultation => {
    const profile = profiles.find(row => row.id === consultation.patient_id)
    return { ...consultation, patientName: `${profile?.first_name || ''} ${profile?.last_name || ''}`.trim() || profile?.email || 'Patient', meetingUrl: consultation.meeting_url }
  })
  return NextResponse.json({ availability: data || [], consultations })
}

export async function POST(request: Request) {
  const provider = await getAuthenticatedProvider(request)
  if ('error' in provider) return NextResponse.json({ error: provider.error }, { status: provider.status })

  if (!provider.providerProfile) {
    const fullName = [provider.profile?.first_name, provider.profile?.last_name].filter(Boolean).join(' ')
      || provider.user.user_metadata?.full_name
      || provider.user.email?.split('@')[0]
      || 'Provider'
    const { error: profileError } = await supabaseAdmin.from('provider_profiles').insert({
      provider_id: provider.user.id,
      role: provider.role,
      full_name: fullName,
      email: provider.user.email || provider.profile?.email || null,
      status: 'active',
    })
    if (profileError && profileError.code !== '23505') {
      return NextResponse.json({ error: `Provider profile setup failed: ${profileError.message}` }, { status: 500 })
    }
  } else if (provider.providerProfile.status !== 'active') {
    return NextResponse.json({ error: 'Inactive providers cannot publish availability.' }, { status: 403 })
  }

  const body = await request.json()
  const scheduleMode = String(body.scheduleMode || body.source || '').toUpperCase()

  if (scheduleMode !== 'MANUAL' && scheduleMode !== 'RECURRING') {
    return NextResponse.json({ error: 'Invalid scheduleMode. Must be MANUAL or RECURRING.' }, { status: 400 })
  }

  if (scheduleMode === 'MANUAL') {
    const slots = Array.isArray(body.slots)
      ? body.slots
      : [{ available_date: body.date, time_slot: body.startTime, slot_duration: body.duration }]

    if (slots.length === 0) {
      return NextResponse.json({ error: 'No manual slots provided.' }, { status: 400 })
    }

    let createdCount = 0
    let overlapCount = 0
    const errors: string[] = []

    for (const slot of slots) {
      const date = slot.available_date
      const startTime = slot.time_slot
      const duration = slot.slot_duration

      if (!date || !startTime || duration === undefined) {
        errors.push('Missing slot fields (date, startTime, duration).')
        continue
      }

      const durationNum = Number(duration)
      if (!isDate(date)) {
        errors.push(`Invalid date format: ${date}.`)
        continue
      }

      const startNorm = normalizeTime(startTime)
      if (!startNorm) {
        errors.push(`Invalid start time: ${startTime}.`)
        continue
      }

      if (!Number.isInteger(durationNum) || durationNum < 5 || durationNum > 240) {
        errors.push(`Duration must be between 5 and 240 minutes for date ${date}.`)
        continue
      }

      if (isPastSlot(date, startNorm)) {
        errors.push(`Past availability slots cannot be created: ${date} ${startTime}.`)
        continue
      }

      const startMin = minutesFromTime(startNorm)!
      const endNorm = normalizeTime(timeFromMinutes(startMin + durationNum))

      // Check duplicates or overlaps for SAME provider
      const { data: existing, error: existingError } = await supabaseAdmin
        .from('provider_availability')
        .select('id, available_date, start_time, end_time, status')
        .eq('provider_id', provider.user.id)
        .eq('provider_role', provider.role)
        .eq('available_date', date)

      if (existingError) {
        errors.push(existingError.message)
        continue
      }

      const activeExisting = (existing || []).filter(item => activeStatuses.includes(String(item.status)))
      if (activeExisting.some(item => timesOverlap(item.start_time, item.end_time, startNorm, endNorm))) {
        overlapCount++
        continue
      }

      const previous = (existing || []).find(item => ['CANCELLED', 'EXPIRED'].includes(String(item.status)) && normalizeTime(item.start_time) === startNorm)
      if (previous) {
        const { error: updateErr } = await supabaseAdmin
          .from('provider_availability')
          .update({
            end_time: endNorm,
            slot_duration: durationNum,
            source: 'MANUAL',
            status: 'AVAILABLE',
            is_available: true,
            break_start: null,
            break_end: null,
            updated_at: new Date().toISOString()
          })
          .eq('id', previous.id)
          .eq('provider_id', provider.user.id)
          .eq('provider_role', provider.role)

        if (updateErr) {
          errors.push(updateErr.message)
        } else {
          createdCount++
        }
      } else {
        const { error: insertErr } = await supabaseAdmin
          .from('provider_availability')
          .insert({
            provider_id: provider.user.id,
            provider_role: provider.role,
            available_date: date,
            start_time: startNorm,
            end_time: endNorm,
            slot_duration: durationNum,
            source: 'MANUAL',
            status: 'AVAILABLE',
            is_available: true,
          })

        if (insertErr) {
          const conflict = insertErr.code === '23505' || insertErr.code === '23P01'
          if (conflict) {
            overlapCount++
          } else {
            errors.push(insertErr.message)
          }
        } else {
          createdCount++
        }
      }
    }

    if (errors.length > 0) {
      return NextResponse.json({ error: errors.join('; ') }, { status: 500 })
    }

    if (createdCount === 0 && overlapCount > 0) {
      return NextResponse.json({ error: 'Slot overlaps with existing availability.' }, { status: 409 })
    }

    return NextResponse.json({
      message: 'Manual slot created successfully.',
      inserted: createdCount,
      skipped: overlapCount
    })
  }

  if (scheduleMode === 'RECURRING') {
    const { startDate, endDate, workingDays, startTime, endTime, slotDuration, breakStart, breakEnd } = body
    if (!startDate || !endDate || !Array.isArray(workingDays) || !startTime || !endTime || slotDuration === undefined) {
      return NextResponse.json({ error: 'Missing required recurring schedule fields.' }, { status: 400 })
    }

    if (!isDate(startDate) || !isDate(endDate)) {
      return NextResponse.json({ error: 'Invalid startDate or endDate format.' }, { status: 400 })
    }

    const today = new Date().toISOString().split('T')[0]
    if (startDate < today) {
      return NextResponse.json({ error: 'Start date cannot be in the past.' }, { status: 400 })
    }
    if (endDate < startDate) {
      return NextResponse.json({ error: 'End date cannot be before start date.' }, { status: 400 })
    }

    const rangeStart = new Date(`${startDate}T00:00:00`).getTime()
    const rangeEnd = new Date(`${endDate}T00:00:00`).getTime()
    const rangeDays = (rangeEnd - rangeStart) / 86_400_000
    if (!Number.isFinite(rangeDays) || rangeDays < 0 || rangeDays > 366) {
      return NextResponse.json({ error: 'Recurring schedules must cover no more than 367 calendar days.' }, { status: 400 })
    }

    const durationNum = Number(slotDuration)
    if (!Number.isInteger(durationNum) || durationNum < 5 || durationNum > 240) {
      return NextResponse.json({ error: 'slotDuration must be between 5 and 240 minutes.' }, { status: 400 })
    }

    const startNorm = normalizeTime(startTime)
    const endNorm = normalizeTime(endTime)
    if (!startNorm || !endNorm) {
      return NextResponse.json({ error: 'Invalid startTime or endTime.' }, { status: 400 })
    }

    const workStart = minutesFromTime(startNorm)!
    const workEnd = minutesFromTime(endNorm)!
    if (workEnd <= workStart) {
      return NextResponse.json({ error: 'End time must be after start time.' }, { status: 400 })
    }

    if (workEnd - workStart < durationNum) {
      return NextResponse.json({ error: 'slotDuration is too large for the working hours.' }, { status: 400 })
    }

    let bStartMin: number | null = null
    let bEndMin: number | null = null
    if (breakStart && breakEnd) {
      const bStartNorm = normalizeTime(breakStart)
      const bEndNorm = normalizeTime(breakEnd)
      if (!bStartNorm || !bEndNorm) {
        return NextResponse.json({ error: 'Invalid breakStart or breakEnd.' }, { status: 400 })
      }
      bStartMin = minutesFromTime(bStartNorm)
      bEndMin = minutesFromTime(bEndNorm)
      if (bStartMin === null || bEndMin === null || bEndMin <= bStartMin || bStartMin < workStart || bEndMin > workEnd) {
        return NextResponse.json({ error: 'Break time must be inside working hours.' }, { status: 400 })
      }
    }

    // Generate slots across date range
    const generatedSlots: Array<{ available_date: string; start_time: string; end_time: string }> = []
    const cursor = new Date(`${startDate}T00:00:00`)
    const finalDate = new Date(`${endDate}T00:00:00`)

    const workingDaysSet = new Set(workingDays.map(Number))

    while (cursor <= finalDate) {
      const jsDay = cursor.getDay()
      if (workingDaysSet.has(jsDay)) {
        const dateStr = cursor.toISOString().split('T')[0]
        for (let minute = workStart; minute + durationNum <= workEnd; minute += durationNum) {
          const overlapsBreak = bStartMin !== null && bEndMin !== null && minute < bEndMin && minute + durationNum > bStartMin
          const startSlotNorm = normalizeTime(timeFromMinutes(minute))
          const endSlotNorm = normalizeTime(timeFromMinutes(minute + durationNum))
          if (!overlapsBreak && !isPastSlot(dateStr, startSlotNorm)) {
            generatedSlots.push({
              available_date: dateStr,
              start_time: startSlotNorm,
              end_time: endSlotNorm,
            })
          }
        }
      }
      cursor.setDate(cursor.getDate() + 1)
    }

    if (!generatedSlots.length) {
      return NextResponse.json({ error: 'No slots generated. Check working days and date range.' }, { status: 400 })
    }

    const dates = Array.from(new Set(generatedSlots.map(s => s.available_date)))
    const { data: existing, error: existingError } = await supabaseAdmin
      .from('provider_availability')
      .select('id, available_date, start_time, end_time, status')
      .eq('provider_id', provider.user.id)
      .eq('provider_role', provider.role)
      .in('available_date', dates)

    if (existingError) return NextResponse.json({ error: existingError.message }, { status: 500 })

    const existingSlots = (existing || []) as ExistingSlot[]
    const activeExisting = existingSlots.filter(slot => activeStatuses.includes(String(slot.status)))
    const reusable = new Map(existingSlots.filter(slot => ['CANCELLED', 'EXPIRED'].includes(String(slot.status))).map(slot => [`${slot.available_date}-${normalizeTime(slot.start_time)}`, slot]))
    const reactivations: Array<{ id: string; end_time: string }> = []
    const inserts: Array<{ provider_id: string; provider_role: string; available_date: string; start_time: string; end_time: string; slot_duration: number; source: Source; status: string; is_available: boolean }> = []

    for (const slot of generatedSlots) {
      if (activeExisting.some(item => item.available_date === slot.available_date && timesOverlap(item.start_time, item.end_time, slot.start_time, slot.end_time))) {
        continue
      }
      const previous = reusable.get(`${slot.available_date}-${slot.start_time}`)
      if (previous) {
        reactivations.push({ id: previous.id, end_time: slot.end_time })
      } else {
        inserts.push({
          provider_id: provider.user.id,
          provider_role: provider.role,
          available_date: slot.available_date,
          start_time: slot.start_time,
          end_time: slot.end_time,
          slot_duration: durationNum,
          source: 'GENERATED',
          status: 'AVAILABLE',
          is_available: true,
        })
      }
    }

    if (reactivations.length > 0) {
      const reactivationResults = await Promise.all(reactivations.map(item => supabaseAdmin
        .from('provider_availability')
        .update({
          end_time: item.end_time,
          slot_duration: durationNum,
          source: 'GENERATED',
          status: 'AVAILABLE',
          is_available: true,
          break_start: null,
          break_end: null,
          updated_at: new Date().toISOString()
        })
        .eq('id', item.id)
        .eq('provider_id', provider.user.id)
        .eq('provider_role', provider.role)
      ))
      const reactivationError = reactivationResults.find(result => result.error)?.error
      if (reactivationError) return NextResponse.json({ error: reactivationError.message }, { status: 500 })
    }

    if (inserts.length > 0) {
      const insertResult = await supabaseAdmin.from('provider_availability').insert(inserts)
      if (insertResult.error) {
        const conflict = insertResult.error.code === '23505' || insertResult.error.code === '23P01'
        return NextResponse.json({ error: conflict ? 'One or more slots overlap existing availability for this provider.' : insertResult.error.message }, { status: conflict ? 409 : 500 })
      }
    }

    const totalSaved = inserts.length + reactivations.length
    return NextResponse.json({
      inserted: totalSaved,
      message: `Generated ${totalSaved} availability slots.`
    })
  }
}

export async function DELETE(request: Request) {
  const provider = await getAuthenticatedProvider(request)
  if ('error' in provider) return NextResponse.json({ error: provider.error }, { status: provider.status })
  const id = new URL(request.url).searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'Availability id is required.' }, { status: 400 })

  const { data, error } = await supabaseAdmin
    .from('provider_availability')
    .update({ status: 'CANCELLED', is_available: false, updated_at: new Date().toISOString() })
    .eq('id', id)
    .eq('provider_id', provider.user.id)
    .eq('provider_role', provider.role)
    .eq('status', 'AVAILABLE')
    .select('id')
    .maybeSingle()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!data?.id) return NextResponse.json({ error: 'Only an available slot can be cancelled.' }, { status: 409 })
  return NextResponse.json({ success: true })
}

export async function PUT(request: Request) {
  const provider = await getAuthenticatedProvider(request)
  if ('error' in provider) return NextResponse.json({ error: provider.error }, { status: provider.status })

  const body = await request.json()
  const { id, status, is_available } = body

  if (!id) return NextResponse.json({ error: 'Availability id is required.' }, { status: 400 })

  const updatePayload: any = {}
  if (status !== undefined) updatePayload.status = status
  if (is_available !== undefined) updatePayload.is_available = is_available
  updatePayload.updated_at = new Date().toISOString()

  const { data, error } = await supabaseAdmin
    .from('provider_availability')
    .update(updatePayload)
    .eq('id', id)
    .eq('provider_id', provider.user.id)
    .eq('provider_role', provider.role)
    .select('id')
    .maybeSingle()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!data?.id) return NextResponse.json({ error: 'Slot not found or unauthorized.' }, { status: 404 })

  return NextResponse.json({ success: true })
}
