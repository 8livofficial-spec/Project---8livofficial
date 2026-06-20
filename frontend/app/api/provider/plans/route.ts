import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseServer'
import { assignmentColumnForRole, getAuthenticatedProvider, trainerFallbackColumnForRole } from '@/lib/providerServer'
import { loadAssignedProviderPatients } from '@/lib/providerAssignedPatients'

function requiredString(value: unknown, label: string) {
  const text = String(value || '').trim()
  if (!text) return { error: `${label} is required.` }
  return { value: text }
}

function boundedNumber(value: unknown, label: string, min: number, max: number, required = true) {
  if ((value === null || value === undefined || value === '') && !required) return { value: null }
  const parsed = Number(value)
  if (!Number.isFinite(parsed) || parsed < min || parsed > max) {
    return { error: `${label} must be between ${min} and ${max}.` }
  }
  return { value: parsed }
}

async function verifyAssignment(patientId: string, providerId: string, role: string) {
  const assignmentColumn = assignmentColumnForRole(role as any)
  const fallbackColumn = trainerFallbackColumnForRole(role as any)
  if (!assignmentColumn) return false

  const { data } = await supabaseAdmin
    .from('care_team_assignments')
    .select('*')
    .eq('patient_id', patientId)
    .maybeSingle()

  if (!data) return false
  if (data[assignmentColumn] === providerId) return true
  if (fallbackColumn && data[fallbackColumn] === providerId) return true
  return false
}

function planConfigForRole(role: string) {
  if (role === 'dietitian') return { table: 'diet_plans', ownerColumn: 'dietitian_id' }
  if (role === 'nutritionist') return { table: 'nutrition_guidance', ownerColumn: 'nutritionist_id' }
  if (role === 'fitness_coach' || role === 'trainer') return { table: 'fitness_plans', ownerColumn: 'fitness_coach_id' }
  return null
}

export async function GET(request: Request) {
  const provider = await getAuthenticatedProvider(request)
  if ('error' in provider) {
    return NextResponse.json({ error: provider.error }, { status: provider.status })
  }

  const { searchParams } = new URL(request.url)
  const patientId = searchParams.get('patientId')

  const config = planConfigForRole(provider.role)
  if (!config) return NextResponse.json({ plans: [] })

  let query = supabaseAdmin
    .from(config.table)
    .select('*')
    .eq(config.ownerColumn, provider.user.id)
    .order('created_at', { ascending: false })

  if (patientId) query = query.eq('patient_id', patientId)

  const [{ patients }, plansResult] = await Promise.all([
    loadAssignedProviderPatients(provider.user.id, provider.role),
    query,
  ])

  const { data, error } = plansResult
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ plans: data || [], patients })
}

export async function POST(request: Request) {
  const provider = await getAuthenticatedProvider(request)
  if ('error' in provider) {
    return NextResponse.json({ error: provider.error }, { status: provider.status })
  }

  if (!['dietitian', 'nutritionist', 'fitness_coach'].includes(provider.role)) {
    return NextResponse.json({ error: 'Plan creation is not available for this provider role yet.' }, { status: 403 })
  }

  const body = await request.json()
  const patientId = String(body.patientId || '').trim()
  if (!patientId) return NextResponse.json({ error: 'Patient is required.' }, { status: 400 })

  const assigned = await verifyAssignment(patientId, provider.user.id, provider.role)
  if (!assigned) return NextResponse.json({ error: 'You are not assigned to this patient.' }, { status: 403 })

  if (provider.role === 'dietitian') {
    const calories = boundedNumber(body.caloriesPerDay, 'Calories per day', 800, 6000)
    const mealSchedule = requiredString(body.mealSchedule, 'Meal schedule')
    if (calories.error) return NextResponse.json({ error: calories.error }, { status: 400 })
    if (mealSchedule.error) return NextResponse.json({ error: mealSchedule.error }, { status: 400 })

    const { data, error } = await supabaseAdmin
      .from('diet_plans')
      .insert({
        patient_id: patientId,
        dietitian_id: provider.user.id,
        calories_per_day: calories.value,
        meal_schedule: mealSchedule.value,
        food_restrictions: String(body.foodRestrictions || '').trim() || null,
        hydration_goal: String(body.hydrationGoal || '').trim() || null,
        notes: String(body.notes || '').trim() || null,
        status: 'active',
      })
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    await supabaseAdmin
      .from('care_team_assignments')
      .update({ dietitian_notes: body.notes || mealSchedule.value, updated_at: new Date().toISOString() })
      .eq('patient_id', patientId)

    return NextResponse.json({ plan: data })
  }

  if (provider.role === 'nutritionist') {
    const guidanceFocus = requiredString(body.guidanceFocus, 'Guidance focus')
    if (guidanceFocus.error) return NextResponse.json({ error: guidanceFocus.error }, { status: 400 })

    const { data, error } = await supabaseAdmin
      .from('nutrition_guidance')
      .insert({
        patient_id: patientId,
        nutritionist_id: provider.user.id,
        guidance_focus: guidanceFocus.value,
        calorie_strategy: String(body.calorieStrategy || '').trim() || null,
        meal_timing: String(body.mealTiming || '').trim() || null,
        supplement_notes: String(body.supplementNotes || '').trim() || null,
        notes: String(body.notes || '').trim() || null,
        status: 'active',
      })
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    await supabaseAdmin
      .from('care_team_assignments')
      .update({ nutritionist_notes: body.notes || guidanceFocus.value, updated_at: new Date().toISOString() })
      .eq('patient_id', patientId)

    return NextResponse.json({ plan: data })
  }

  const workoutType = requiredString(body.workoutType, 'Workout type')
  const weeklyFrequency = boundedNumber(body.weeklyFrequency, 'Weekly frequency', 1, 14)
  const dailyStepGoal = boundedNumber(body.dailyStepGoal, 'Daily step goal', 0, 100000, false)
  if (workoutType.error) return NextResponse.json({ error: workoutType.error }, { status: 400 })
  if (weeklyFrequency.error) return NextResponse.json({ error: weeklyFrequency.error }, { status: 400 })
  if (dailyStepGoal.error) return NextResponse.json({ error: dailyStepGoal.error }, { status: 400 })

  const { data, error } = await supabaseAdmin
    .from('fitness_plans')
    .insert({
      patient_id: patientId,
      fitness_coach_id: provider.user.id,
      workout_type: workoutType.value,
      weekly_frequency: weeklyFrequency.value,
      daily_step_goal: dailyStepGoal.value,
      exercise_restrictions: String(body.exerciseRestrictions || '').trim() || null,
      notes: String(body.notes || '').trim() || null,
      status: 'active',
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  await supabaseAdmin
    .from('care_team_assignments')
    .update({ trainer_notes: body.notes || workoutType.value, updated_at: new Date().toISOString() })
    .eq('patient_id', patientId)

  return NextResponse.json({ plan: data })
}

export async function PATCH(request: Request) {
  const provider = await getAuthenticatedProvider(request)
  if ('error' in provider) {
    return NextResponse.json({ error: provider.error }, { status: provider.status })
  }

  const { planId, status } = await request.json()
  if (!planId || !['active', 'completed'].includes(status)) {
    return NextResponse.json({ error: 'Valid planId and status are required.' }, { status: 400 })
  }

  const config = planConfigForRole(provider.role)
  if (!config) return NextResponse.json({ error: 'Plan status updates are not available for this provider role.' }, { status: 403 })

  const { data, error } = await supabaseAdmin
    .from(config.table)
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', planId)
    .eq(config.ownerColumn, provider.user.id)
    .select()
    .maybeSingle()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!data) return NextResponse.json({ error: 'Plan not found.' }, { status: 404 })
  return NextResponse.json({ plan: data })
}
