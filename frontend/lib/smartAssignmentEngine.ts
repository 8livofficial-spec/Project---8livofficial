import { randomUUID } from 'crypto'
import { supabaseAdmin } from '@/lib/supabaseServer'
import { createJitsiMeeting } from '@/lib/jitsi'
import { getIndiaSlotTimestamp } from '@/lib/appointmentAvailability'

type ProviderRole = 'doctor' | 'dietitian' | 'nutritionist' | 'fitness_coach' | 'trainer'

type EngineSettings = {
  auto_assignment_enabled?: boolean
  preferred_strategy?: 'LEAST_WORKLOAD' | 'ROUND_ROBIN' | 'SAME_PROVIDER_FIRST'
  max_daily_consultations?: number
  max_hourly_consultations?: number
}

type Candidate = {
  providerId: string
  role: ProviderRole
  fullName?: string | null
  specialization?: string | null
  slotId?: string | null
  activeConsultations: number
  consultationsToday: number
  lastAssignedAt?: string | null
  roundRobinCounter: number
}

function normalizeRole(role: string): ProviderRole {
  return role === 'trainer' ? 'fitness_coach' : role as ProviderRole
}

function normalizePlan(planType?: string | null) {
  const value = String(planType || '').toLowerCase()
  return value.includes('gold') ? 'Gold Plan' : 'Silver Plan'
}

function includesSpecialization(candidate?: string | null, required?: string | null) {
  if (!required) return true
  if (!candidate) return true
  return candidate.toLowerCase().includes(required.toLowerCase())
}

function getSlotTimestamp(date: string, time: string) {
  return getIndiaSlotTimestamp(date, time) || 0
}

async function getSettings(): Promise<EngineSettings> {
  const { data } = await supabaseAdmin
    .from('assignment_engine_settings')
    .select('*')
    .eq('id', true)
    .maybeSingle()

  return data || {
    auto_assignment_enabled: true,
    preferred_strategy: 'LEAST_WORKLOAD',
    max_daily_consultations: 12,
    max_hourly_consultations: 3,
  }
}

async function logAssignment(params: {
  patientId?: string | null
  providerId?: string | null
  previousProviderId?: string | null
  appointmentId?: string | null
  providerRole?: string | null
  eventType: string
  reason?: string | null
  strategy?: string | null
  metadata?: Record<string, unknown>
}) {
  try {
    await supabaseAdmin
      .from('provider_assignment_logs')
      .insert({
        patient_id: params.patientId || null,
        provider_id: params.providerId || null,
        previous_provider_id: params.previousProviderId || null,
        appointment_id: params.appointmentId || null,
        provider_role: params.providerRole || null,
        event_type: params.eventType,
        reason: params.reason || null,
        strategy: params.strategy || null,
        metadata: params.metadata || {},
      })
  } catch (error) {
    console.error('Failed to write provider assignment log:', error)
  }
}

async function notifyProvider(params: {
  providerId: string
  type: string
  title: string
  message: string
  metadata?: Record<string, unknown>
}) {
  try {
    await supabaseAdmin
      .from('provider_notifications')
      .insert({
        provider_id: params.providerId,
        type: params.type,
        title: params.title,
        message: params.message,
        metadata: params.metadata || {},
        is_read: false,
      })
  } catch (error) {
    console.error('Failed to create provider notification:', error)
  }
}

async function getActiveProviderProfiles(role: ProviderRole) {
  const roles = role === 'fitness_coach' ? ['fitness_coach', 'trainer'] : [role]
  const { data: providerProfiles, error } = await supabaseAdmin
    .from('provider_profiles')
    .select('provider_id, role, full_name, specialization, status')
    .in('role', roles)
    .eq('status', 'active')

  if (!error && providerProfiles?.length) {
    return providerProfiles.map((provider) => ({
      providerId: provider.provider_id,
      role: normalizeRole(provider.role),
      fullName: provider.full_name,
      specialization: provider.specialization,
    }))
  }

  const profileRoles = role === 'fitness_coach' ? ['fitness_coach', 'trainer'] : [role]
  const { data: profiles } = await supabaseAdmin
    .from('profiles')
    .select('id, role, first_name, last_name, email')
    .in('role', profileRoles)

  return (profiles || []).map((profile) => ({
    providerId: profile.id,
    role: normalizeRole(profile.role),
    fullName: `${profile.first_name || ''} ${profile.last_name || ''}`.trim() || profile.email,
    specialization: null,
  }))
}

async function filterOutLeave(providerIds: string[], slotDate?: string, slotTime?: string) {
  if (!providerIds.length) return new Set<string>()
  const timestamp = slotDate && slotTime ? new Date(`${slotDate} ${slotTime}`).toISOString() : new Date().toISOString()
  const { data } = await supabaseAdmin
    .from('provider_leave')
    .select('provider_id')
    .in('provider_id', providerIds)
    .eq('status', 'ACTIVE')
    .lte('starts_at', timestamp)
    .gte('ends_at', timestamp)

  return new Set((data || []).map((row) => row.provider_id))
}

async function getWorkload(providerIds: string[], selectedDate?: string, selectedTime?: string) {
  const result = new Map<string, { active: number; today: number; hourly: number }>()
  providerIds.forEach((id) => result.set(id, { active: 0, today: 0, hourly: 0 }))
  if (!providerIds.length) return result

  const today = selectedDate || new Date().toISOString().split('T')[0]
  const { data } = await supabaseAdmin
    .from('doctor_consultations')
    .select('doctor_id, booking_date, booking_time, status')
    .in('doctor_id', providerIds)
    .in('status', ['scheduled', 'SCHEDULED', 'pending', 'PENDING'])

  ;(data || []).forEach((row) => {
    if (!row.doctor_id) return
    const current = result.get(row.doctor_id) || { active: 0, today: 0, hourly: 0 }
    current.active += 1
    if (row.booking_date === today) current.today += 1
    if (selectedTime && row.booking_date === today && String(row.booking_time).slice(0, 2) === String(selectedTime).slice(0, 2)) {
      current.hourly += 1
    }
    result.set(row.doctor_id, current)
  })

  return result
}

async function getRoundRobin(providerIds: string[]) {
  if (!providerIds.length) return new Map<string, { lastAssignedAt: string | null; counter: number }>()
  const { data } = await supabaseAdmin
    .from('provider_workload')
    .select('provider_id, last_assigned_at, round_robin_counter')
    .in('provider_id', providerIds)

  const map = new Map<string, { lastAssignedAt: string | null; counter: number }>()
  providerIds.forEach((id) => map.set(id, { lastAssignedAt: null, counter: 0 }))
  ;(data || []).forEach((row) => map.set(row.provider_id, {
    lastAssignedAt: row.last_assigned_at,
    counter: Number(row.round_robin_counter || 0),
  }))
  return map
}

function rankCandidates(candidates: Candidate[], settings: EngineSettings) {
  return [...candidates].sort((a, b) => {
    if (settings.preferred_strategy === 'ROUND_ROBIN') {
      return a.roundRobinCounter - b.roundRobinCounter
    }

    const workloadDiff = a.activeConsultations - b.activeConsultations
    if (workloadDiff !== 0) return workloadDiff

    const todayDiff = a.consultationsToday - b.consultationsToday
    if (todayDiff !== 0) return todayDiff

    const aIdle = a.lastAssignedAt ? new Date(a.lastAssignedAt).getTime() : 0
    const bIdle = b.lastAssignedAt ? new Date(b.lastAssignedAt).getTime() : 0
    if (aIdle !== bIdle) return aIdle - bIdle

    return a.roundRobinCounter - b.roundRobinCounter
  })
}

async function markProviderAssigned(providerId: string, activeConsultations: number, consultationsToday: number) {
  await supabaseAdmin
    .from('provider_workload')
    .upsert({
      provider_id: providerId,
      active_consultations: activeConsultations + 1,
      consultations_today: consultationsToday + 1,
      last_assigned_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }, { onConflict: 'provider_id' })
}

async function incrementRoundRobin(providerId: string) {
  const { data } = await supabaseAdmin
    .from('provider_workload')
    .select('round_robin_counter')
    .eq('provider_id', providerId)
    .maybeSingle()

  await supabaseAdmin
    .from('provider_workload')
    .upsert({
      provider_id: providerId,
      round_robin_counter: Number(data?.round_robin_counter || 0) + 1,
      last_assigned_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }, { onConflict: 'provider_id' })
}

export async function reserveDoctorForInitialConsultation(params: {
  patientId: string
  selectedDate: string
  selectedTime: string
  requiredSpecialization?: string | null
  preferredDoctorId?: string | null
}) {
  const settings = await getSettings()
  if (settings.auto_assignment_enabled === false) {
    throw new Error('Auto assignment is disabled. Manual assignment is required.')
  }

  if (getSlotTimestamp(params.selectedDate, params.selectedTime) <= Date.now()) {
    throw new Error('Selected consultation time is no longer available.')
  }

  const { data: slots, error: slotError } = await supabaseAdmin
    .from('provider_availability')
    .select('*')
    .eq('provider_role', 'doctor')
    .eq('status', 'AVAILABLE')
    .eq('is_available', true)
    .eq('available_date', params.selectedDate)
    .eq('start_time', params.selectedTime)

  if (slotError) throw slotError
  if (!slots?.length) throw new Error('This consultation time was just booked. Please choose another slot.')

  const slotProviderIds = Array.from(new Set(slots.map((slot) => slot.provider_id).filter(Boolean)))
  const activeProviders = await getActiveProviderProfiles('doctor')
  const activeById = new Map(activeProviders.map((provider) => [provider.providerId, provider]))
  const leaveIds = await filterOutLeave(slotProviderIds, params.selectedDate, params.selectedTime)
  const workload = await getWorkload(slotProviderIds, params.selectedDate, params.selectedTime)
  const rr = await getRoundRobin(slotProviderIds)
  const settingsDaily = settings.max_daily_consultations || 12
  const settingsHourly = settings.max_hourly_consultations || 3

  const candidates = slots
    .filter((slot) => {
      if (!slot.provider_id) return false
      const provider = activeById.get(slot.provider_id)
      if (!provider) return false
      if (leaveIds.has(slot.provider_id)) return false
      if (!includesSpecialization(provider.specialization, params.requiredSpecialization)) return false
      const counts = workload.get(slot.provider_id)
      if ((counts?.today || 0) >= settingsDaily) return false
      if ((counts?.hourly || 0) >= settingsHourly) return false
      return true
    })
    .map((slot) => {
      const provider = activeById.get(slot.provider_id)!
      const counts = workload.get(slot.provider_id) || { active: 0, today: 0, hourly: 0 }
      const roundRobin = rr.get(slot.provider_id) || { lastAssignedAt: null, counter: 0 }
      return {
        providerId: slot.provider_id,
        role: 'doctor' as ProviderRole,
        fullName: provider.fullName,
        specialization: provider.specialization,
        slotId: slot.id,
        activeConsultations: counts.active,
        consultationsToday: counts.today,
        lastAssignedAt: roundRobin.lastAssignedAt,
        roundRobinCounter: roundRobin.counter,
      }
    })

  if (!candidates.length) {
    await logAssignment({
      patientId: params.patientId,
      providerRole: 'doctor',
      eventType: 'ASSIGNMENT_FAILED',
      reason: 'NO_AVAILABLE_DOCTOR',
      strategy: settings.preferred_strategy,
      metadata: { selectedDate: params.selectedDate, selectedTime: params.selectedTime, requiredSpecialization: params.requiredSpecialization },
    })
    throw new Error('No qualified doctors are available for this slot.')
  }

  const sameProviderFirst = params.preferredDoctorId
    ? candidates.filter((candidate) => candidate.providerId === params.preferredDoctorId)
    : []
  const ranked = sameProviderFirst.length ? sameProviderFirst : rankCandidates(candidates, settings)

  for (const candidate of ranked) {
    const { data: reservedSlot, error } = await supabaseAdmin
      .from('provider_availability')
      .update({ status: 'BOOKED', is_available: false, updated_at: new Date().toISOString() })
      .eq('id', candidate.slotId)
      .eq('provider_id', candidate.providerId)
      .eq('provider_role', 'doctor')
      .eq('available_date', params.selectedDate)
      .eq('start_time', params.selectedTime)
      .eq('status', 'AVAILABLE')
      .eq('is_available', true)
      .select('*')
      .maybeSingle()

    if (error) {
      console.error('Smart assignment slot reserve failed:', error)
      continue
    }

    if (reservedSlot) {
      await incrementRoundRobin(candidate.providerId)
      await logAssignment({
        patientId: params.patientId,
        providerId: candidate.providerId,
        providerRole: 'doctor',
        eventType: sameProviderFirst.length ? 'FOLLOW_UP_PROVIDER_RESERVED' : 'INITIAL_PROVIDER_RESERVED',
        reason: sameProviderFirst.length ? 'SAME_PROVIDER_FIRST' : 'SMART_ASSIGNMENT',
        strategy: settings.preferred_strategy,
        metadata: { selectedDate: params.selectedDate, selectedTime: params.selectedTime, specialization: candidate.specialization },
      })
      return {
        slot: {
          ...reservedSlot,
          doctor_id: reservedSlot.provider_id,
          time_slot: reservedSlot.start_time,
          is_booked: true,
        },
        provider: candidate,
      }
    }
  }

  throw new Error('Selected slot was taken during assignment. Please choose another time.')
}

export async function finalizeConsultationAssignment(params: {
  patientId: string
  appointmentId: string
  provider: Candidate
  selectedDate: string
  selectedTime: string
  isFollowUp?: boolean
}) {
  await markProviderAssigned(params.provider.providerId, params.provider.activeConsultations, params.provider.consultationsToday)
  await logAssignment({
    patientId: params.patientId,
    providerId: params.provider.providerId,
    appointmentId: params.appointmentId,
    providerRole: 'doctor',
    eventType: params.isFollowUp ? 'FOLLOW_UP_PROVIDER_ASSIGNED' : 'INITIAL_PROVIDER_ASSIGNED',
    reason: params.isFollowUp ? 'SAME_PROVIDER_FIRST_OR_FALLBACK' : 'SMART_ASSIGNMENT_CONFIRMED',
    strategy: 'SMART_ENGINE',
    metadata: {
      selectedDate: params.selectedDate,
      selectedTime: params.selectedTime,
      specialization: params.provider.specialization,
    },
  })
  await notifyProvider({
    providerId: params.provider.providerId,
    type: 'consultation_assignment',
    title: params.isFollowUp ? 'Follow-up consultation booked' : 'New consultation assigned',
    message: `A consultation is scheduled for ${params.selectedDate} at ${params.selectedTime}.`,
    metadata: {
      patientId: params.patientId,
      appointmentId: params.appointmentId,
      selectedDate: params.selectedDate,
      selectedTime: params.selectedTime,
    },
  })
}

async function chooseProviderForRole(role: ProviderRole, planType: string, patientId: string) {
  const settings = await getSettings()
  const providers = await getActiveProviderProfiles(role)
  if (!providers.length) return null

  const providerIds = providers.map((provider) => provider.providerId)
  const leaveIds = await filterOutLeave(providerIds)
  const workload = await getWorkload(providerIds)
  const rr = await getRoundRobin(providerIds)

  const candidates = providers
    .filter((provider) => !leaveIds.has(provider.providerId))
    .map((provider) => {
      const counts = workload.get(provider.providerId) || { active: 0, today: 0, hourly: 0 }
      const roundRobin = rr.get(provider.providerId) || { lastAssignedAt: null, counter: 0 }
      return {
        providerId: provider.providerId,
        role,
        fullName: provider.fullName,
        specialization: provider.specialization,
        activeConsultations: counts.active,
        consultationsToday: counts.today,
        lastAssignedAt: roundRobin.lastAssignedAt,
        roundRobinCounter: roundRobin.counter,
      }
    })

  const selected = rankCandidates(candidates, settings)[0] || null
  if (selected) {
    await incrementRoundRobin(selected.providerId)
    await logAssignment({
      patientId,
      providerId: selected.providerId,
      providerRole: role,
      eventType: 'CARE_TEAM_PROVIDER_ASSIGNED',
      reason: `${planType} membership care team`,
      strategy: settings.preferred_strategy,
      metadata: { planType },
    })
    await notifyProvider({
      providerId: selected.providerId,
      type: 'care_team_assignment',
      title: 'New patient assigned',
      message: `You have been assigned to a ${planType} patient care team.`,
      metadata: { patientId, planType, providerRole: role },
    })
  }
  return selected
}

async function getPrimaryDoctor(patientId: string) {
  const { data: assignment } = await supabaseAdmin
    .from('care_team_assignments')
    .select('doctor_id')
    .eq('patient_id', patientId)
    .maybeSingle()

  if (assignment?.doctor_id) return assignment.doctor_id

  const { data: consultation } = await supabaseAdmin
    .from('doctor_consultations')
    .select('doctor_id')
    .eq('patient_id', patientId)
    .not('doctor_id', 'is', null)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  return consultation?.doctor_id || null
}

export async function assignMembershipCareTeam(patientId: string, rawPlanType?: string | null) {
  const planType = normalizePlan(rawPlanType)
  const primaryDoctorId = await getPrimaryDoctor(patientId)
  const doctor = primaryDoctorId
    ? { providerId: primaryDoctorId, role: 'doctor' as ProviderRole }
    : await chooseProviderForRole('doctor', planType, patientId)

  const dietitian = planType === 'Gold Plan' ? await chooseProviderForRole('dietitian', planType, patientId) : null
  const nutritionist = planType === 'Gold Plan' ? await chooseProviderForRole('nutritionist', planType, patientId) : null
  const fitnessCoach = planType === 'Gold Plan' ? await chooseProviderForRole('fitness_coach', planType, patientId) : null

  const widePayload = {
    patient_id: patientId,
    doctor_id: doctor?.providerId || null,
    dietitian_id: dietitian?.providerId || null,
    nutritionist_id: nutritionist?.providerId || null,
    fitness_coach_id: fitnessCoach?.providerId || null,
    trainer_id: fitnessCoach?.providerId || null,
    plan_type: planType,
    status: 'ACTIVE',
    assignment_strategy: 'SMART_ENGINE',
    updated_at: new Date().toISOString(),
  }

  await supabaseAdmin
    .from('care_team_assignments')
    .upsert(widePayload, { onConflict: 'patient_id' })

  const normalized = [
    doctor && { patient_id: patientId, provider_id: doctor.providerId, provider_role: 'doctor', plan_type: planType, is_primary: true, status: 'ACTIVE' },
    dietitian && { patient_id: patientId, provider_id: dietitian.providerId, provider_role: 'dietitian', plan_type: planType, is_primary: false, status: 'ACTIVE' },
    nutritionist && { patient_id: patientId, provider_id: nutritionist.providerId, provider_role: 'nutritionist', plan_type: planType, is_primary: false, status: 'ACTIVE' },
    fitnessCoach && { patient_id: patientId, provider_id: fitnessCoach.providerId, provider_role: 'fitness_coach', plan_type: planType, is_primary: false, status: 'ACTIVE' },
  ].filter(Boolean)

  if (normalized.length) {
    for (const row of normalized as any[]) {
      await supabaseAdmin
        .from('provider_assignments')
        .upsert(row, { onConflict: 'patient_id,provider_role,status' })
    }
  }

  await logAssignment({
    patientId,
    providerRole: 'care_team',
    eventType: 'CARE_TEAM_ASSIGNED',
    reason: `${planType} membership activated`,
    strategy: 'SMART_ENGINE',
    metadata: {
      planType,
      doctorId: doctor?.providerId || null,
      dietitianId: dietitian?.providerId || null,
      nutritionistId: nutritionist?.providerId || null,
      fitnessCoachId: fitnessCoach?.providerId || null,
    },
  })

  return {
    planType,
    doctor,
    dietitian,
    nutritionist,
    fitnessCoach,
  }
}

export function createAppointmentMeeting(appointmentId = randomUUID()) {
  return {
    appointmentId,
    meeting: createJitsiMeeting(appointmentId),
  }
}
