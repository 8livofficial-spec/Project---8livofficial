import { supabaseAdmin } from '@/lib/supabaseServer'
import { getAssignedProviderForRole, normalizeProviderRole, type VideoProviderRole } from '@/lib/providerConsultations'

export type BookableRole = Exclude<VideoProviderRole, 'trainer'>

export type AvailableSlot = {
  slotId: string
  providerId: string
  providerRole: string
  date: string
  startTime: string
  endTime: string
  status: 'AVAILABLE'
  source: 'MANUAL' | 'GENERATED'
  slotDuration: number
}

type AvailableDateRow = {
  available_date: string
  available_count: number | string | null
}

type AvailabilityRow = {
  id?: string
  slot_id?: string
  provider_id: string
  provider_role: string
  available_date: string
  start_time: string
  end_time: string
  slot_duration?: number | null
  source?: string | null
  slot_source?: string | null
}

const supportedRoles = new Set<BookableRole>(['doctor', 'dietitian', 'nutritionist', 'fitness_coach'])

export function parseBookableRole(value: string | null): BookableRole | null {
  const normalized = normalizeProviderRole(String(value || '').trim().toLowerCase())
  return supportedRoles.has(normalized as BookableRole) ? normalized as BookableRole : null
}

export async function getAuthenticatedPatient(request: Request) {
  const authorization = request.headers.get('authorization') || ''
  const token = authorization.startsWith('Bearer ') ? authorization.slice(7).trim() : ''
  if (!token) return { error: 'Unauthorized', status: 401 as const }

  const { data, error } = await supabaseAdmin.auth.getUser(token)
  if (error || !data.user) return { error: 'Invalid session', status: 401 as const }

  const { data: profile, error: profileError } = await supabaseAdmin
    .from('profiles')
    .select('id, role')
    .eq('id', data.user.id)
    .maybeSingle()
  if (profileError) return { error: profileError.message, status: 500 as const }
  if (profile?.role !== 'patient') return { error: 'Patient access only', status: 403 as const }
  return { user: data.user }
}

export function getIndiaSlotTimestamp(date: string, time: string) {
  const normalizedTime = String(time || '').slice(0, 5)
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^\d{2}:\d{2}$/.test(normalizedTime)) return null
  const timestamp = new Date(`${date}T${normalizedTime}:00+05:30`).getTime()
  return Number.isFinite(timestamp) ? timestamp : null
}

export function isFutureIndiaSlot(date: string, time: string) {
  const timestamp = getIndiaSlotTimestamp(date, time)
  return timestamp !== null && timestamp > Date.now()
}

async function authorizeRequestedProvider(patientId: string, role: BookableRole, providerId?: string | null) {
  const requestedProviderId = String(providerId || '').trim()
  if (role !== 'doctor' && !requestedProviderId) {
    return { error: 'Assigned providerId is required for care-team booking.', status: 400 as const }
  }
  if (requestedProviderId) {
    const assignedProvider = await getAssignedProviderForRole(patientId, role)
    if (assignedProvider !== requestedProviderId) {
      return { error: 'This provider is not assigned to the patient.', status: 403 as const }
    }
  }
  return { providerId: requestedProviderId || null }
}

function isMissingAvailabilityFunction(error: { code?: string; message?: string } | null) {
  return error?.code === 'PGRST202' || String(error?.message || '').includes('schema cache')
}

async function loadActiveProviderIds(providerIds: string[], role: BookableRole) {
  if (providerIds.length === 0) return new Set<string>()
  const activeIds = new Set<string>()
  const registeredIds = new Set<string>()

  const { data: providers, error: providersError } = await supabaseAdmin
    .from('provider_profiles')
    .select('provider_id, status')
    .in('provider_id', providerIds)
  if (providersError) throw providersError

  for (const provider of providers || []) {
    registeredIds.add(provider.provider_id)
    if (provider.status === 'active') activeIds.add(provider.provider_id)
  }

  const legacyIds = providerIds.filter(providerId => !registeredIds.has(providerId))
  if (legacyIds.length > 0) {
    const { data: profiles, error: profilesError } = await supabaseAdmin
      .from('profiles')
      .select('id')
      .in('id', legacyIds)
      .eq('role', role)
    if (profilesError) throw profilesError
    for (const provider of profiles || []) activeIds.add(provider.id)
  }
  return activeIds
}

async function loadAvailabilityRowsFallback(params: { role: BookableRole; providerId: string | null; date?: string }) {
  let query = supabaseAdmin
    .from('provider_availability')
    .select('id, provider_id, provider_role, available_date, start_time, end_time, slot_duration, source')
    .eq('provider_role', params.role)
    .eq('status', 'AVAILABLE')
    .eq('is_available', true)
    .order('available_date', { ascending: true })
    .order('start_time', { ascending: true })
    .limit(1000)
  if (params.providerId) query = query.eq('provider_id', params.providerId)
  if (params.date) query = query.eq('available_date', params.date)

  const { data, error } = await query
  if (error) throw error

  const rows = (data || []) as AvailabilityRow[]
  const providerIds = Array.from(new Set(rows.map(row => row.provider_id)))
  const activeIds = await loadActiveProviderIds(providerIds, params.role)
  return rows.filter(row => activeIds.has(row.provider_id) && isFutureIndiaSlot(row.available_date, row.start_time))
}

function mapAvailableSlot(row: AvailabilityRow): AvailableSlot {
  return {
    slotId: row.slot_id || row.id || '',
    providerId: row.provider_id,
    providerRole: String(row.provider_role).toUpperCase(),
    date: row.available_date,
    startTime: String(row.start_time).slice(0, 5),
    endTime: String(row.end_time).slice(0, 5),
    status: 'AVAILABLE',
    source: (row.slot_source || row.source) === 'MANUAL' ? 'MANUAL' : 'GENERATED',
    slotDuration: Number(row.slot_duration || 0),
  }
}

export async function loadAvailableDates(params: { patientId: string; role: BookableRole; providerId?: string | null }) {
  const timingStart = performance.now()
  console.log(`[Timer] loadAvailableDates started for role=${params.role}, providerId=${params.providerId}`)

  try {
    const authorization = await authorizeRequestedProvider(params.patientId, params.role, params.providerId)
    if ('error' in authorization) {
      console.log(`[Timer] loadAvailableDates authorization failed in ${(performance.now() - timingStart).toFixed(2)}ms`)
      return { ...authorization, dates: [] as Array<{ date: string; availableCount: number }> }
    }

    const providerId = authorization.providerId

    // 1. Get active provider IDs for this role
    let activeDoctorIds: string[] = []
    if (providerId) {
      const { data: activeProvider } = await supabaseAdmin
        .from('provider_profiles')
        .select('provider_id')
        .eq('provider_id', providerId)
        .eq('status', 'active')
        .maybeSingle()
      
      if (activeProvider) {
        activeDoctorIds = [providerId]
      }
    } else {
      const { data: activeProviders } = await supabaseAdmin
        .from('provider_profiles')
        .select('provider_id')
        .eq('role', params.role)
        .eq('status', 'active')
      activeDoctorIds = (activeProviders || []).map((p) => p.provider_id)
    }

    if (activeDoctorIds.length === 0) {
      console.log(`[Timer] loadAvailableDates completed (no active providers) in ${(performance.now() - timingStart).toFixed(2)}ms`)
      return { dates: [] }
    }

    // 2. Query provider_availability directly
    const todayStr = new Date().toISOString().split('T')[0]
    const { data: slots, error } = await supabaseAdmin
      .from('provider_availability')
      .select('available_date, start_time')
      .eq('provider_role', params.role)
      .eq('status', 'AVAILABLE')
      .eq('is_available', true)
      .in('provider_id', activeDoctorIds)
      .gte('available_date', todayStr)

    if (error) throw error

    const futureSlots = (slots || []).filter((slot) => isFutureIndiaSlot(slot.available_date, slot.start_time))

    const counts = new Map<string, number>()
    futureSlots.forEach((slot) => {
      counts.set(slot.available_date, (counts.get(slot.available_date) || 0) + 1)
    })

    const dates = Array.from(counts, ([date, availableCount]) => ({ date, availableCount }))
      .sort((a, b) => a.date.localeCompare(b.date))

    const duration = performance.now() - timingStart
    console.log(`[Timer] loadAvailableDates completed successfully in ${duration.toFixed(2)}ms with ${dates.length} dates`)

    return { dates }
  } catch (err) {
    const duration = performance.now() - timingStart
    console.error(`[Timer] loadAvailableDates failed in ${duration.toFixed(2)}ms:`, err)
    return {
      error: err instanceof Error ? err.message : 'Unable to load available dates.',
      status: 500 as const,
      dates: []
    }
  }
}

export async function loadAvailableSlots(params: {
  patientId: string
  role: BookableRole
  providerId?: string | null
  date?: string | null
}) {
  const timingStart = performance.now()
  console.log(`[Timer] loadAvailableSlots started for role=${params.role}, providerId=${params.providerId}, date=${params.date}`)

  try {
    if (!params.date) {
      console.log(`[Timer] loadAvailableSlots failed (missing date) in ${(performance.now() - timingStart).toFixed(2)}ms`)
      return { error: 'A date is required to load slots.', status: 400 as const, slots: [] as AvailableSlot[] }
    }

    const authorization = await authorizeRequestedProvider(params.patientId, params.role, params.providerId)
    if ('error' in authorization) {
      console.log(`[Timer] loadAvailableSlots authorization failed in ${(performance.now() - timingStart).toFixed(2)}ms`)
      return { ...authorization, slots: [] as AvailableSlot[] }
    }

    const providerId = authorization.providerId

    // 1. Get active provider IDs
    let activeDoctorIds: string[] = []
    if (providerId) {
      const { data: activeProvider } = await supabaseAdmin
        .from('provider_profiles')
        .select('provider_id')
        .eq('provider_id', providerId)
        .eq('status', 'active')
        .maybeSingle()
      
      if (activeProvider) {
        activeDoctorIds = [providerId]
      }
    } else {
      const { data: activeProviders } = await supabaseAdmin
        .from('provider_profiles')
        .select('provider_id')
        .eq('role', params.role)
        .eq('status', 'active')
      activeDoctorIds = (activeProviders || []).map((p) => p.provider_id)
    }

    if (activeDoctorIds.length === 0) {
      console.log(`[Timer] loadAvailableSlots completed (no active providers) in ${(performance.now() - timingStart).toFixed(2)}ms`)
      return { slots: [] }
    }

    // 2. Query provider_availability directly for selected date
    const { data: slots, error } = await supabaseAdmin
      .from('provider_availability')
      .select('id, provider_id, provider_role, available_date, start_time, end_time, status, source, slot_duration')
      .eq('provider_role', params.role)
      .eq('status', 'AVAILABLE')
      .eq('is_available', true)
      .eq('available_date', params.date)
      .in('provider_id', activeDoctorIds)
      .order('start_time', { ascending: true })

    if (error) throw error

    const availableSlots = (slots || [])
      .filter((slot) => isFutureIndiaSlot(slot.available_date, slot.start_time))
      .map((slot) => ({
        slotId: slot.id,
        providerId: slot.provider_id,
        providerRole: String(slot.provider_role).toUpperCase(),
        date: slot.available_date,
        startTime: String(slot.start_time).slice(0, 5),
        endTime: String(slot.end_time).slice(0, 5),
        status: 'AVAILABLE' as const,
        source: (slot.source || 'GENERATED') === 'MANUAL' ? ('MANUAL' as const) : ('GENERATED' as const),
        slotDuration: Number(slot.slot_duration || 30),
      }))

    const duration = performance.now() - timingStart
    console.log(`[Timer] loadAvailableSlots completed successfully in ${duration.toFixed(2)}ms with ${availableSlots.length} slots`)

    return { slots: availableSlots }
  } catch (err) {
    const duration = performance.now() - timingStart
    console.error(`[Timer] loadAvailableSlots failed in ${duration.toFixed(2)}ms:`, err)
    return {
      error: err instanceof Error ? err.message : 'Unable to load available slots.',
      status: 500 as const,
      slots: []
    }
  }
}
