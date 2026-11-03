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

    // 1. Fetch diet_plans created by or assigned to this dietitian
    let dietPlansQuery = supabaseAdmin
      .from('diet_plans')
      .select('*')
      .eq('dietitian_id', auth.user.id)
      .order('created_at', { ascending: false })

    if (patientId) {
      dietPlansQuery = dietPlansQuery.eq('patient_id', patientId)
    }

    const { data: rawDietPlans } = await dietPlansQuery

    // 2. Fetch any nutrition_plans
    let nutritionPlansQuery = supabaseAdmin
      .from('nutrition_plans')
      .select('*')
      .eq('dietitian_id', auth.user.id)
      .order('updated_at', { ascending: false })

    if (patientId) {
      nutritionPlansQuery = nutritionPlansQuery.eq('patient_id', patientId)
    }
    if (status) {
      nutritionPlansQuery = nutritionPlansQuery.eq('status', status)
    }
    if (filter === 'review_due') {
      const next7Days = new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0]
      nutritionPlansQuery = nutritionPlansQuery.eq('status', 'PUBLISHED').lte('review_date', next7Days)
    }

    const { data: rawNutritionPlans } = await nutritionPlansQuery

    // 3. Collect unique patient IDs to fetch their profiles cleanly
    const allPatientIds = Array.from(
      new Set([
        ...(rawDietPlans || []).map((p: any) => p.patient_id),
        ...(rawNutritionPlans || []).map((p: any) => p.patient_id),
      ].filter(Boolean))
    )

    const profileMap: Record<string, { full_name: string; email: string | null; phone: string | null }> = {}
    if (allPatientIds.length > 0) {
      const { data: profiles } = await supabaseAdmin
        .from('profiles')
        .select('id, first_name, last_name, full_name, email, phone_number')
        .in('id', allPatientIds)

      if (profiles) {
        for (const pr of profiles) {
          const name = pr.full_name || `${pr.first_name || ''} ${pr.last_name || ''}`.trim() || pr.email?.split('@')[0] || 'Patient'
          profileMap[pr.id] = {
            full_name: name,
            email: pr.email,
            phone: pr.phone_number,
          }
        }
      }
    }

    // Format diet_plans rows to match the PlanRecord shape
    const formattedDietPlans = await Promise.all(
      (rawDietPlans || []).map(async (d: any) => {
        let waterLiters = 2.5
        if (d.hydration_goal) {
          const parsed = parseFloat(String(d.hydration_goal).replace(/[^0-9.]/g, ''))
          if (!isNaN(parsed) && parsed > 0) waterLiters = parsed
        }

        let signedUrl: string | null = null
        if (d.attachment_url) {
          try {
            const rawPath = String(d.attachment_url).replace(/^diet-plans\//, '')
            const { data: sData } = await supabaseAdmin.storage
              .from('diet-plans')
              .createSignedUrl(rawPath, 3600)
            if (sData?.signedUrl) {
              signedUrl = sData.signedUrl
            }
          } catch (eSign) {
            console.warn('Diet plan attachment signed URL notice:', eSign)
          }
        }

        return {
          id: d.id,
          patient_id: d.patient_id,
          dietitian_id: d.dietitian_id,
          plan_name: d.title || 'Personalized Clinical Nutrition Plan',
          status: (d.status || 'ACTIVE').toUpperCase(),
          version: 1,
          daily_calorie_target: d.calories_per_day || 1800,
          water_target_liters: waterLiters,
          attachment_url: d.attachment_url || null,
          attachment_type: d.attachment_type || null,
          attachment_signed_url: signedUrl,
          description: d.description || null,
          meal_schedule: d.meal_schedule || null,
          food_restrictions: d.food_restrictions || null,
          hydration_goal: d.hydration_goal || `${waterLiters} L`,
          notes: d.notes || null,
          created_at: d.created_at,
          updated_at: d.updated_at || d.created_at,
          profiles: profileMap[d.patient_id] || { full_name: 'Assigned Patient', email: null, phone: null },
        }
      })
    )

    const formattedNutritionPlans = (rawNutritionPlans || []).map((n: any) => ({
      ...n,
      profiles: profileMap[n.patient_id] || { full_name: 'Assigned Patient', email: null, phone: null },
    }))

    // Merge both, prioritizing newer plans first
    const combinedPlans = [...formattedDietPlans, ...formattedNutritionPlans].sort(
      (a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime()
    )

    // Filter by status if requested
    const filteredPlans = status
      ? combinedPlans.filter((p) => p.status.toUpperCase() === status.toUpperCase())
      : combinedPlans

    return NextResponse.json({ success: true, plans: filteredPlans })
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
