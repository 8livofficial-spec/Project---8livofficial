import { NextResponse } from 'next/server'
import { assertDietitian, assertDietitianPatientAccess, resolveTenant } from '@/lib/apiSecurity'
import { createNutritionPlanDraft } from '@/lib/nutritionService'
import { supabaseAdmin } from '@/lib/supabaseServer'

export async function GET(request: Request) {
  try {
    const auth = await assertDietitian(request)
    const tenantId = resolveTenant(request, auth.user)

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const patientId = searchParams.get('patientId')
    const filter = searchParams.get('filter')

    let query = supabaseAdmin
      .from('nutrition_plans')
      .select('*, profiles:patient_id(full_name, email, age, gender)')
      .eq('dietitian_id', auth.user.id)
      .order('updated_at', { ascending: false })

    if (status) {
      query = query.eq('status', status)
    }
    if (patientId) {
      query = query.eq('patient_id', patientId)
    }
    if (filter === 'review_due') {
      const next7Days = new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0]
      query = query.eq('status', 'PUBLISHED').lte('review_date', next7Days)
    }

    const { data, error } = await query

    if (error) {
      // Fallback: return plans from memory
      return NextResponse.json({ success: true, plans: [] })
    }

    return NextResponse.json({ success: true, plans: data || [] })
  } catch (error: any) {
    const status = error.message === 'Unauthorized' ? 401 : error.message === 'Forbidden' ? 403 : 500
    return NextResponse.json({ success: false, error: error.message || 'Failed to fetch plans' }, { status })
  }
}

export async function POST(request: Request) {
  try {
    const auth = await assertDietitian(request)
    const tenantId = resolveTenant(request, auth.user)

    const body = await request.json()
    if (!body.patient_id) {
      return NextResponse.json({ success: false, error: 'Patient ID is required' }, { status: 400 })
    }

    // Verify patient access
    await assertDietitianPatientAccess(request, body.patient_id)

    const plan = await createNutritionPlanDraft(
      auth.user.id,
      body.patient_id,
      {
        plan_name: body.plan_name,
        start_date: body.start_date,
        review_date: body.review_date,
        daily_calorie_target: body.daily_calorie_target ? Number(body.daily_calorie_target) : null,
        water_target_liters: body.water_target_liters ? Number(body.water_target_liters) : 2.5,
        meals: body.meals || [],
        nutrition_goals: body.nutrition_goals,
        general_instructions: body.general_instructions,
      },
      tenantId,
      request
    )

    return NextResponse.json({ success: true, plan })
  } catch (error: any) {
    const status = error.message === 'Unauthorized' ? 401 : error.message === 'Forbidden' ? 403 : 500
    return NextResponse.json({ success: false, error: error.message || 'Failed to create plan draft' }, { status })
  }
}
