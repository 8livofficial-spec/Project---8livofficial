import { supabaseAdmin } from '@/lib/supabaseServer'
import { assignmentColumnForRole, trainerFallbackColumnForRole, type ProviderRole } from '@/lib/providerServer'

type PatientProfileRow = { id: string; first_name?: string | null; last_name?: string | null; email?: string | null; phone_number?: string | null }

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
  return (rows || [])
    .filter((row) => row.patient_id === patientId)
    .sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime())[0] || null
}

export function providerPlanConfig(role: ProviderRole | string) {
  if (role === 'dietitian') return { table: 'diet_plans', ownerColumn: 'dietitian_id', emptyAction: 'Create diet plan' }
  if (role === 'nutritionist') return { table: 'nutrition_guidance', ownerColumn: 'nutritionist_id', emptyAction: 'Create nutrition guidance' }
  if (role === 'fitness_coach' || role === 'trainer') return { table: 'fitness_plans', ownerColumn: 'fitness_coach_id', emptyAction: 'Create workout plan' }
  return null
}

export async function loadAssignedProviderPatients(providerId: string, role: ProviderRole) {
  const assignmentColumn = assignmentColumnForRole(role)
  const fallbackColumn = trainerFallbackColumnForRole(role)
  if (!assignmentColumn) {
    return {
      patients: [],
      summary: { assignedPatients: 0, activePlans: 0, pendingFollowUps: 0, avgCurrentWeight: null, avgGoalWeight: null },
    }
  }

  let assignments: any[] = []
  const primary = await supabaseAdmin
    .from('care_team_assignments')
    .select('*')
    .eq(assignmentColumn, providerId)

  if (!primary.error && primary.data) assignments = primary.data

  if (fallbackColumn) {
    const fallback = await supabaseAdmin
      .from('care_team_assignments')
      .select('*')
      .eq(fallbackColumn, providerId)
    if (!fallback.error && fallback.data) {
      const seen = new Set(assignments.map((row) => row.patient_id))
      assignments = [...assignments, ...fallback.data.filter((row) => !seen.has(row.patient_id))]
    }
  }

  if (!assignments.length) {
    return {
      patients: [],
      summary: { assignedPatients: 0, activePlans: 0, pendingFollowUps: 0, avgCurrentWeight: null, avgGoalWeight: null },
    }
  }

  const patientIds = assignments.map((assignment) => assignment.patient_id)
  const [profilesRes, assessmentsRes, progressRes] = await Promise.all([
    supabaseAdmin.from('profiles').select('id, first_name, last_name, email, phone_number').in('id', patientIds),
    supabaseAdmin.from('health_assessments').select('*').in('patient_id', patientIds),
    supabaseAdmin.from('progress_logs').select('*').in('user_id', patientIds).order('created_at', { ascending: false }),
  ])

  if (profilesRes.error) throw new Error(profilesRes.error.message)
  if (assessmentsRes.error) throw new Error(assessmentsRes.error.message)
  const profiles = (profilesRes.data || []) as PatientProfileRow[]

  const planConfig = providerPlanConfig(role)
  let plans: any[] = []
  if (planConfig) {
    const plansRes = await supabaseAdmin
      .from(planConfig.table)
      .select('*')
      .eq(planConfig.ownerColumn, providerId)
      .in('patient_id', patientIds)
      .order('created_at', { ascending: false })
    if (!plansRes.error && plansRes.data) plans = plansRes.data
  }

  const patients = assignments
    .map((assignment) => {
      const profile = profiles.find((row) => row.id === assignment.patient_id)
      const assessment = assessmentsRes.data?.find((row) => row.patient_id === assignment.patient_id) || {}
      const membershipTier = assessment.membership_tier || assessment.membershipStatus || 'Not selected'

      if (!String(membershipTier).toLowerCase().includes('gold')) return null

      const latestProgress = (progressRes.data || []).find((row) => row.user_id === assignment.patient_id)
      const latestPlan = latestByPatient(plans, assignment.patient_id)
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
        bmi: numberOrNull(assessment.bmi),
        membershipTier,
        planStatus: latestPlan?.status || 'not_started',
        lastCheckIn: latestProgress?.created_at || null,
        nextAction: latestPlan ? 'Follow up' : planConfig?.emptyAction || 'Review patient',
        foodPreferences: assessment.local_food || assessment.food_preferences || null,
        medicalRestrictions: assessment.medical_history || assessment.extra_medical_info || null,
        fitnessPreference: assessment.fitness_preference || null,
        limitations: assessment.exercise_limitations || assessment.extra_medical_info || null,
        doctorNotes: assessment.doctor_notes || assessment.diagnosis_summary || null,
      }
    })
    .filter(Boolean)

  const activePlans = patients.filter((patient: any) => patient.planStatus === 'active').length
  const pendingFollowUps = patients.filter((patient: any) => patient.planStatus === 'not_started').length

  return {
    patients,
    summary: {
      assignedPatients: patients.length,
      activePlans,
      pendingFollowUps,
      avgCurrentWeight: avg(patients.map((patient: any) => patient.currentWeight)),
      avgGoalWeight: avg(patients.map((patient: any) => patient.goalWeight)),
    },
  }
}
