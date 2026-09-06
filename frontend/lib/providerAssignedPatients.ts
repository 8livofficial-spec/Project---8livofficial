import { supabaseAdmin } from '@/lib/supabaseServer'
import { assignmentColumnForRole, trainerFallbackColumnForRole, type ProviderRole } from '@/lib/providerServer'

type PatientProfileRow = { id: string; first_name?: string | null; last_name?: string | null; email?: string | null; phone_number?: string | null }
type LoadAssignedProviderPatientsOptions = {
  patientIds?: string[]
  page?: number
  limit?: number
}

function numberOrNull(value: unknown) {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

function avg(values: Array<number | null>) {
  const clean = values.filter((value): value is number => typeof value === 'number')
  if (!clean.length) return null
  return Math.round((clean.reduce((sum, value) => sum + value, 0) / clean.length) * 10) / 10
}

function latestByPatient(rows: any[] | null | undefined, patientId: string) {
  return (rows || []).find((row) => row.patient_id === patientId) || null
}

export function providerPlanConfig(role: ProviderRole | string) {
  if (role === 'dietitian') return { table: 'diet_plans', ownerColumn: 'dietitian_id', emptyAction: 'Create diet plan' }
  if (role === 'nutritionist') return { table: 'nutrition_guidance', ownerColumn: 'nutritionist_id', emptyAction: 'Create nutrition guidance' }
  if (role === 'fitness_coach' || role === 'trainer') return { table: 'fitness_plans', ownerColumn: 'fitness_coach_id', emptyAction: 'Create workout plan' }
  return null
}

export async function loadAssignedProviderPatients(providerId: string, role: ProviderRole, options: LoadAssignedProviderPatientsOptions = {}) {
  const assignmentColumn = assignmentColumnForRole(role)
  const fallbackColumn = trainerFallbackColumnForRole(role)
  if (!assignmentColumn) {
    return {
      patients: [],
      summary: { assignedPatients: 0, activePlans: 0, pendingFollowUps: 0, avgCurrentWeight: null, avgGoalWeight: null },
      totalCount: 0,
      totalPages: 0,
    }
  }

  const page = Math.max(1, Number(options.page || 1))
  const requestedLimit = options.limit ? Math.max(1, Number(options.limit)) : null
  const canPageInDatabase = requestedLimit !== null && !fallbackColumn

  let assignments: any[] = []
  let totalAssigned = 0
  let primaryQuery = supabaseAdmin
    .from('care_team_assignments')
    .select('patient_id', { count: canPageInDatabase ? 'exact' : undefined })
    .eq(assignmentColumn, providerId)
  if (options.patientIds?.length) primaryQuery = primaryQuery.in('patient_id', options.patientIds)
  if (canPageInDatabase) {
    primaryQuery = primaryQuery.range((page - 1) * requestedLimit, page * requestedLimit - 1)
  }
  const primary = await primaryQuery

  if (!primary.error && primary.data) {
    assignments = primary.data
    totalAssigned = primary.count ?? primary.data.length
  }

  if (fallbackColumn) {
    let fallbackQuery = supabaseAdmin
      .from('care_team_assignments')
      .select('patient_id')
      .eq(fallbackColumn, providerId)
    if (options.patientIds?.length) fallbackQuery = fallbackQuery.in('patient_id', options.patientIds)
    const fallback = await fallbackQuery
    if (!fallback.error && fallback.data) {
      const seen = new Set(assignments.map((row) => row.patient_id))
      assignments = [...assignments, ...fallback.data.filter((row) => !seen.has(row.patient_id))]
    }
    totalAssigned = assignments.length
  }

  if (!assignments.length) {
    return {
      patients: [],
      summary: { assignedPatients: totalAssigned, activePlans: 0, pendingFollowUps: 0, avgCurrentWeight: null, avgGoalWeight: null },
      totalCount: totalAssigned,
      totalPages: requestedLimit ? Math.ceil(totalAssigned / requestedLimit) : 0,
    }
  }

  if (!totalAssigned) totalAssigned = assignments.length
  const limit = Math.max(1, Number(options.limit || assignments.length))
  const selectedAssignments = canPageInDatabase
    ? assignments
    : options.page || options.limit
    ? assignments.slice((page - 1) * limit, page * limit)
    : assignments
  if (!selectedAssignments.length) {
    return {
      patients: [],
      summary: { assignedPatients: totalAssigned, activePlans: 0, pendingFollowUps: 0, avgCurrentWeight: null, avgGoalWeight: null },
      totalCount: totalAssigned,
      totalPages: Math.ceil(totalAssigned / limit),
    }
  }
  const patientIds = selectedAssignments.map((assignment) => assignment.patient_id)
  const [profilesRes, assessmentsRes, progressRes] = await Promise.all([
    supabaseAdmin.from('profiles').select('id, first_name, last_name, email, phone_number').in('id', patientIds),
    supabaseAdmin.from('health_assessments').select('patient_id, first_name, last_name, phone_number, height_cm, weight_kg, goal_weight_kg, membership_tier, membership_status, local_food, workout_preference, medical_history, extra_medical_info').in('patient_id', patientIds),
    supabaseAdmin.from('progress_logs').select('user_id, weight_kg, created_at').in('user_id', patientIds).order('created_at', { ascending: false }),
  ])

  if (profilesRes.error) throw new Error(profilesRes.error.message)
  if (assessmentsRes.error) throw new Error(assessmentsRes.error.message)
  const profiles = (profilesRes.data || []) as PatientProfileRow[]
  const profilesById = new Map(profiles.map((profile) => [profile.id, profile]))
  const assessmentsByPatientId = new Map((assessmentsRes.data || []).map((assessment: any) => [assessment.patient_id, assessment]))
  const progressByPatientId = new Map<string, any>()
  for (const progress of progressRes.data || []) {
    if (!progressByPatientId.has(progress.user_id)) progressByPatientId.set(progress.user_id, progress)
  }

  const planConfig = providerPlanConfig(role)
  let plans: any[] = []
  if (planConfig) {
    const plansRes = await supabaseAdmin
      .from(planConfig.table)
      .select('id, patient_id, status, created_at')
      .eq(planConfig.ownerColumn, providerId)
      .in('patient_id', patientIds)
      .order('created_at', { ascending: false })
    if (!plansRes.error && plansRes.data) plans = plansRes.data
  }
  const plansByPatientId = new Map<string, any>()
  for (const plan of plans) {
    if (!plansByPatientId.has(plan.patient_id)) plansByPatientId.set(plan.patient_id, plan)
  }

  const patients = selectedAssignments
    .map((assignment) => {
      const profile = profilesById.get(assignment.patient_id)
      const assessment = assessmentsByPatientId.get(assignment.patient_id) || {}
      const membershipTier = assessment.membership_tier || assessment.membership_status || 'Not selected'

      // All patients assigned to the provider care team are eligible for provider plans and guidance
      if (assignment.status === 'INACTIVE') return null

      const latestProgress = progressByPatientId.get(assignment.patient_id)
      const latestPlan = plansByPatientId.get(assignment.patient_id) || latestByPatient(plans, assignment.patient_id)
      const currentWeight = numberOrNull(latestProgress?.weight_kg) ?? numberOrNull(assessment.weight_kg)
      const goalWeight = numberOrNull(assessment.goal_weight_kg)
      const firstName = assessment.first_name || profile?.first_name || ''
      const lastName = assessment.last_name || profile?.last_name || ''
      const name = `${firstName} ${lastName}`.trim() || profile?.email || 'Patient'

      return {
        id: assignment.patient_id,
        name,
        phone: assessment.phone_number || profile?.phone_number || 'Not provided',
        currentWeight,
        goalWeight,
        bmi: assessment.height_cm && assessment.weight_kg ? Number((Number(assessment.weight_kg) / Math.pow(Number(assessment.height_cm) / 100, 2)).toFixed(1)) : null,
        membershipTier,
        planStatus: latestPlan?.status || 'not_started',
        lastCheckIn: latestProgress?.created_at || null,
        nextAction: latestPlan ? 'Follow up' : planConfig?.emptyAction || 'Review patient',
        foodPreferences: assessment.local_food || assessment.medical_history?.food_preferences || null,
        medicalRestrictions: assessment.medical_history || assessment.extra_medical_info || null,
        fitnessPreference: assessment.workout_preference || assessment.medical_history?.fitness_preference || null,
        limitations: assessment.extra_medical_info || assessment.medical_history?.exercise_limitations || null,
        doctorNotes: assessment.medical_history?.doctor_notes || assessment.medical_history?.diagnosis_summary || null,
      }
    })
    .filter(Boolean)

  const activePlans = patients.filter((patient: any) => patient.planStatus === 'active').length
  const pendingFollowUps = patients.filter((patient: any) => patient.planStatus === 'not_started').length

  return {
    patients,
    summary: {
      assignedPatients: totalAssigned,
      activePlans,
      pendingFollowUps,
      avgCurrentWeight: avg(patients.map((patient: any) => patient.currentWeight)),
      avgGoalWeight: avg(patients.map((patient: any) => patient.goalWeight)),
    },
    totalCount: totalAssigned,
    totalPages: Math.ceil(totalAssigned / limit),
  }
}
