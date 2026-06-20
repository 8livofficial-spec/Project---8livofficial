import { NextResponse } from 'next/server'
import { getAuthenticatedProvider } from '@/lib/providerServer'
import { supabaseAdmin } from '@/lib/supabaseServer'

const activeStatuses = ['AVAILABLE', 'BOOKED']
type Source = 'MANUAL' | 'GENERATED'

type IncomingSlot = { available_date?: string; time_slot?: string; end_time?: string; slot_duration?: number | string }
type CleanedSlot = { available_date: string; start_time: string; end_time: string; slot_duration: number; source: Source }
type ExistingSlot = { id: string; available_date: string; start_time: string; end_time: string; status?: string }
type GenerationDay = { enabled?: boolean; startTime?: string; endTime?: string; breakStart?: string; breakEnd?: string }
type GenerationRules = { startDate?: string; endDate?: string; days?: Record<string, GenerationDay> }
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

function timesOverlap(firstStart: string, firstEnd: string, secondStart: string, secondEnd: string) {
  return normalizeTime(firstStart) < normalizeTime(secondEnd) && normalizeTime(firstEnd) > normalizeTime(secondStart)
}

function isPastSlot(date: string, time: string) {
  const timestamp = new Date(`${date}T${normalizeTime(time)}+05:30`).getTime()
  return !Number.isFinite(timestamp) || timestamp <= Date.now()
}

function validateGeneratedSlot(slot: CleanedSlot, rules: GenerationRules) {
  const startDate = String(rules.startDate || '')
  const endDate = String(rules.endDate || '')
  if (!isDate(startDate) || !isDate(endDate) || endDate < startDate) return 'Invalid recurring schedule date range.'
  if (slot.available_date < startDate || slot.available_date > endDate) return 'A generated slot is outside the schedule range.'

  const dayNumber = new Date(`${slot.available_date}T00:00:00`).getDay()
  const day = rules.days?.[String(dayNumber)]
  if (!day?.enabled) return `Cannot generate availability on an OFF day (${slot.available_date}).`

  const workStart = minutesFromTime(String(day.startTime || ''))
  const workEnd = minutesFromTime(String(day.endTime || ''))
  const slotStart = minutesFromTime(slot.start_time)
  const slotEnd = minutesFromTime(slot.end_time)
  if (workStart === null || workEnd === null || slotStart === null || slotEnd === null || workEnd <= workStart) return 'Invalid recurring working hours.'
  if (slotStart < workStart || slotEnd > workEnd) return `A generated slot is outside working hours on ${slot.available_date}.`

  const hasBreakStart = Boolean(day.breakStart)
  const hasBreakEnd = Boolean(day.breakEnd)
  if (hasBreakStart !== hasBreakEnd) return 'Both break start and break end are required.'
  if (hasBreakStart && hasBreakEnd) {
    const breakStart = minutesFromTime(String(day.breakStart))
    const breakEnd = minutesFromTime(String(day.breakEnd))
    if (breakStart === null || breakEnd === null || breakEnd <= breakStart || breakStart < workStart || breakEnd > workEnd) return 'Break time must be inside working hours.'
    if (slotStart < breakEnd && slotEnd > breakStart) return `Cannot generate a slot during the break on ${slot.available_date}.`
  }
  return null
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
  const source: Source = String(body.source || '').toUpperCase() === 'MANUAL' ? 'MANUAL' : 'GENERATED'
  const incoming = Array.isArray(body.slots) ? body.slots as IncomingSlot[] : []
  if (!incoming.length || incoming.length > 5000) return NextResponse.json({ error: 'Provide between 1 and 5000 availability slots.' }, { status: 400 })

  const cleaned: CleanedSlot[] = incoming.map(slot => ({
    available_date: String(slot.available_date || ''),
    start_time: normalizeTime(String(slot.time_slot || '')),
    end_time: normalizeTime(String(slot.end_time || '')),
    slot_duration: Number(slot.slot_duration),
    source,
  }))

  if (source === 'GENERATED') {
    const rules = body.generationRules as GenerationRules | undefined
    const rangeStart = new Date(`${String(rules?.startDate || '')}T00:00:00`).getTime()
    const rangeEnd = new Date(`${String(rules?.endDate || '')}T00:00:00`).getTime()
    const rangeDays = (rangeEnd - rangeStart) / 86_400_000
    if (!Number.isFinite(rangeDays) || rangeDays < 0 || rangeDays > 366) {
      return NextResponse.json({ error: 'Recurring schedules must cover no more than 367 calendar days.' }, { status: 400 })
    }
  }

  for (const slot of cleaned) {
    const start = minutesFromTime(slot.start_time)
    const end = minutesFromTime(slot.end_time)
    if (!isDate(slot.available_date) || !isTime(slot.start_time) || !isTime(slot.end_time) || start === null || end === null || end <= start) {
      return NextResponse.json({ error: 'Every slot requires a valid date, start time, and end time.' }, { status: 400 })
    }
    if (!Number.isInteger(slot.slot_duration) || slot.slot_duration < 5 || slot.slot_duration > 240 || end - start !== slot.slot_duration) {
      return NextResponse.json({ error: 'Slot duration must match the start/end time and be between 5 and 240 minutes.' }, { status: 400 })
    }
    if (isPastSlot(slot.available_date, slot.start_time)) return NextResponse.json({ error: 'Past availability slots cannot be created.' }, { status: 400 })
    if (source === 'GENERATED') {
      const validationError = validateGeneratedSlot(slot, body.generationRules || {})
      if (validationError) return NextResponse.json({ error: validationError }, { status: 400 })
    }
  }

  const accepted: CleanedSlot[] = []
  for (const slot of cleaned) {
    if (accepted.some(item => item.available_date === slot.available_date && timesOverlap(item.start_time, item.end_time, slot.start_time, slot.end_time))) {
      return NextResponse.json({ error: `Submitted slots overlap on ${slot.available_date}.` }, { status: 400 })
    }
    accepted.push(slot)
  }

  const dates = Array.from(new Set(cleaned.map(slot => slot.available_date)))
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
  const reactivations: Array<{ existing: ExistingSlot; slot: CleanedSlot }> = []
  const inserts: CleanedSlot[] = []

  for (const slot of cleaned) {
    if (activeExisting.some(item => item.available_date === slot.available_date && timesOverlap(item.start_time, item.end_time, slot.start_time, slot.end_time))) continue
    const previous = reusable.get(`${slot.available_date}-${slot.start_time}`)
    if (previous) reactivations.push({ existing: previous, slot })
    else inserts.push(slot)
  }

  const reactivationResults = await Promise.all(reactivations.map(item => supabaseAdmin
    .from('provider_availability')
    .update({ end_time: item.slot.end_time, slot_duration: item.slot.slot_duration, source, status: 'AVAILABLE', is_available: true, break_start: null, break_end: null, updated_at: new Date().toISOString() })
    .eq('id', item.existing.id)
    .eq('provider_id', provider.user.id)
    .eq('provider_role', provider.role)
    .in('status', ['CANCELLED', 'EXPIRED'])))
  const reactivationError = reactivationResults.find(result => result.error)?.error
  if (reactivationError) return NextResponse.json({ error: reactivationError.message }, { status: 500 })

  const rows = inserts.map(slot => ({
    provider_id: provider.user.id,
    provider_role: provider.role,
    available_date: slot.available_date,
    start_time: slot.start_time,
    end_time: slot.end_time,
    slot_duration: slot.slot_duration,
    source: slot.source,
    status: 'AVAILABLE',
    is_available: true,
    break_start: null,
    break_end: null,
  }))
  const insertResult = rows.length ? await supabaseAdmin.from('provider_availability').insert(rows) : { error: null }
  if (insertResult.error) {
    const conflict = insertResult.error.code === '23505' || insertResult.error.code === '23P01'
    return NextResponse.json({ error: conflict ? 'One or more slots overlap existing availability for this provider.' : insertResult.error.message }, { status: conflict ? 409 : 500 })
  }

  const saved = rows.length + reactivations.length
  return NextResponse.json({ inserted: saved, skipped: cleaned.length - saved, message: saved ? `Saved ${saved} ${source.toLowerCase()} slot${saved === 1 ? '' : 's'}.` : 'These slots already exist for this provider.' })
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
