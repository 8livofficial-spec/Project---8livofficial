import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseServer'
import { assignmentColumnForRole, getAuthenticatedProvider, trainerFallbackColumnForRole } from '@/lib/providerServer'

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

function planConfigForRole(role: string) {
  if (role === 'dietitian') return { table: 'diet_plans', ownerColumn: 'dietitian_id', emptyAction: 'Create diet plan' }
  if (role === 'nutritionist') return { table: 'nutrition_guidance', ownerColumn: 'nutritionist_id', emptyAction: 'Create nutrition guidance' }
  if (role === 'fitness_coach' || role === 'trainer') return { table: 'fitness_plans', ownerColumn: 'fitness_coach_id', emptyAction: 'Create workout plan' }
  return null
}

export async function GET(request: Request) {
  const provider = await getAuthenticatedProvider(request)
  if ('error' in provider) {
    return NextResponse.json({ error: provider.error }, { status: provider.status })
  }

  const { searchParams } = new URL(request.url)
  const page = Number(searchParams.get('page') || '1')
  const limit = Number(searchParams.get('limit') || '25')
  const search = searchParams.get('search') || ''

  const assignmentColumn = assignmentColumnForRole(provider.role)
  const fallbackColumn = trainerFallbackColumnForRole(provider.role)
  if (!assignmentColumn) {
    return NextResponse.json({
      patients: [],
      totalCount: 0,
      totalPages: 0,
      summary: { assignedPatients: 0, activePlans: 0, pendingFollowUps: 0, avgCurrentWeight: null, avgGoalWeight: null },
    })
  }

  let matchingPatientIds: string[] = []
  if (search.trim()) {
    const [matchedProfiles, matchedAssess] = await Promise.all([
      supabaseAdmin.from('profiles').select('id').or(`first_name.ilike.%${search}%,last_name.ilike.%${search}%,email.ilike.%${search}%,phone_number.ilike.%${search}%`),
      supabaseAdmin.from('health_assessments').select('patient_id').or(`first_name.ilike.%${search}%,last_name.ilike.%${search}%,phone_number.ilike.%${search}%`)
    ])
    const ids = new Set([
      ...(matchedProfiles.data || []).map((p: any) => p.id),
      ...(matchedAssess.data || []).map((a: any) => a.patient_id)
    ])
    matchingPatientIds = Array.from(ids)
  }

  let assignments: any[] = []
  let primaryQuery = supabaseAdmin
    .from('care_team_assignments')
    .select('*')
    .eq(assignmentColumn, provider.user.id)

  if (search.trim()) {
    if (matchingPatientIds.length > 0) {
      primaryQuery = primaryQuery.in('patient_id', matchingPatientIds)
    } else {
      return NextResponse.json({
        patients: [],
        totalCount: 0,
        totalPages: 0,
        summary: { assignedPatients: 0, activePlans: 0, pendingFollowUps: 0, avgCurrentWeight: null, avgGoalWeight: null },
      })
    }
  }

  const primary = await primaryQuery
  if (!primary.error && primary.data) assignments = primary.data

  if (fallbackColumn) {
    let fallbackQuery = supabaseAdmin
      .from('care_team_assignments')
      .select('*')
      .eq(fallbackColumn, provider.user.id)

    if (search.trim()) {
      fallbackQuery = fallbackQuery.in('patient_id', matchingPatientIds)
    }

    const fallback = await fallbackQuery
    if (!fallback.error && fallback.data) {
      const seen = new Set(assignments.map((row) => row.patient_id))
      assignments = [...assignments, ...fallback.data.filter((row) => !seen.has(row.patient_id))]
    }
  }

  if (!assignments.length) {
    return NextResponse.json({
      patients: [],
      totalCount: 0,
      totalPages: 0,
      summary: { assignedPatients: 0, activePlans: 0, pendingFollowUps: 0, avgCurrentWeight: null, avgGoalWeight: null },
    })
  }

  const totalCount = assignments.length
  const totalPages = Math.ceil(totalCount / limit)

  const from = (page - 1) * limit
  const paginatedAssignments = assignments.slice(from, from + limit)

  if (!paginatedAssignments.length) {
    return NextResponse.json({
      patients: [],
      totalCount,
      totalPages,
      summary: { assignedPatients: totalCount, activePlans: 0, pendingFollowUps: 0, avgCurrentWeight: null, avgGoalWeight: null },
    })
  }

  const patientIds = paginatedAssignments.map((assignment) => assignment.patient_id)
  const [profilesRes, assessmentsRes, progressRes] = await Promise.all([
    supabaseAdmin.from('profiles').select('id, first_name, last_name, email, phone_number').in('id', patientIds),
    supabaseAdmin.from('health_assessments').select('*').in('patient_id', patientIds),
    supabaseAdmin.from('progress_logs').select('*').in('user_id', patientIds).order('created_at', { ascending: false }),
  ])

  if (profilesRes.error) return NextResponse.json({ error: profilesRes.error.message }, { status: 500 })
  if (assessmentsRes.error) return NextResponse.json({ error: assessmentsRes.error.message }, { status: 500 })
  const profiles = (profilesRes.data || []) as PatientProfileRow[]

  const planConfig = planConfigForRole(provider.role)
  let plans: any[] = []
  if (planConfig) {
    const plansRes = await supabaseAdmin
      .from(planConfig.table)
      .select('*')
      .eq(planConfig.ownerColumn, provider.user.id)
      .in('patient_id', patientIds)
      .order('created_at', { ascending: false })
    if (!plansRes.error && plansRes.data) plans = plansRes.data
  }

  const patients = paginatedAssignments
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

  return NextResponse.json({
    patients,
    totalCount,
    totalPages,
    summary: {
      assignedPatients: totalCount,
      activePlans,
      pendingFollowUps,
      avgCurrentWeight: avg(patients.map((patient: any) => patient.currentWeight)),
      avgGoalWeight: avg(patients.map((patient: any) => patient.goalWeight)),
    },
  })
}
