import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseServer'
import { assertPatient, errorResponse } from '@/lib/fulfilmentAuth'
import { getAuthenticatedProvider } from '@/lib/providerServer'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const queryPatientId = searchParams.get('patientId')

    let patientId = ''

    // 1. Try patient auth first
    try {
      const patientAuth = await assertPatient(request)
      patientId = patientAuth.user.id
    } catch {
      // 2. Try provider auth (doctor, dietitian, or coach viewing patient protocols)
      const providerAuth = await getAuthenticatedProvider(request)
      if (!('error' in providerAuth)) {
        if (!queryPatientId) {
          return NextResponse.json({
            prescriptions: [],
            activePrescription: null,
            nutritionPlans: [],
            activeNutritionPlan: null,
            fitnessPlans: [],
            activeFitnessPlan: null,
          })
        }
        patientId = queryPatientId
      } else {
        return NextResponse.json({ error: 'Unauthorized: please sign in' }, { status: 401 })
      }
    }

    // 3. Fetch Doctor Prescriptions
    let rawPrescriptions: any[] = []
    const { data: rxData, error: rxErr } = await supabaseAdmin
      .from('prescriptions')
      .select('*, prescription_items(*), pharmacy_orders(id, status, vendor, estimated_delivery_at, courier_name, tracking_number, shipped_at, delivered_at, delivery_address_snapshot, created_at)')
      .eq('patient_id', patientId)
      .neq('status', 'DRAFT')
      .order('created_at', { ascending: false })

    if (!rxErr && rxData) {
      rawPrescriptions = rxData
    } else {
      const { data: fallbackRx } = await supabaseAdmin
        .from('prescriptions')
        .select('*, prescription_items(*)')
        .eq('patient_id', patientId)
        .neq('status', 'DRAFT')
        .order('created_at', { ascending: false })
      rawPrescriptions = fallbackRx || []
    }

    // Enrich prescriptions with Doctor details
    const doctorIds = Array.from(new Set(rawPrescriptions.map(rx => rx.doctor_id).filter(Boolean)))
    let doctorsMap = new Map()
    if (doctorIds.length > 0) {
      const [{ data: docProfiles }, { data: baseProfiles }] = await Promise.all([
        supabaseAdmin.from('doctor_profiles').select('*').in('id', doctorIds),
        supabaseAdmin.from('profiles').select('id, first_name, last_name, full_name, email').in('id', doctorIds),
      ])
      const baseMap = new Map((baseProfiles || []).map((p: any) => [p.id, p]))
      for (const doc of docProfiles || []) {
        const base = baseMap.get(doc.id)
        const name = doc.full_name || (base ? `${base.first_name || ''} ${base.last_name || ''}`.trim() || base.full_name : null) || 'Licensed Physician'
        doctorsMap.set(doc.id, {
          id: doc.id,
          name: name.startsWith('Dr.') ? name : `Dr. ${name}`,
          specialty: doc.specialty || 'General Medicine / Metabolic Health',
          qualification: doc.qualification || 'MBBS',
          reg_number: doc.medical_council_reg_number || doc.mci_number || 'Registered Medical Practitioner',
        })
      }
    }

    const prescriptions = rawPrescriptions.map(rx => ({
      ...rx,
      doctor: doctorsMap.get(rx.doctor_id) || rx.canonical_data?.doctor || {
        name: 'Authorized 8LIV Doctor',
        specialty: 'Metabolic & Obesity Medicine',
        reg_number: 'RMP',
      },
      is_active: !['DRAFT', 'REVOKED', 'CANCELLED', 'REPLACED'].includes(rx.status),
    }))

    const activePrescription = prescriptions.find(rx => rx.is_active) || null

    // 4. Fetch Dietitian Nutrition Plans
    const [nutritionRes, dietRes] = await Promise.all([
      supabaseAdmin
        .from('nutrition_plans')
        .select('*')
        .eq('patient_id', patientId)
        .order('created_at', { ascending: false }),
      supabaseAdmin
        .from('diet_plans')
        .select('*')
        .eq('patient_id', patientId)
        .order('created_at', { ascending: false }),
    ])

    const nutritionPlans = (nutritionRes.data || []).map((plan: any) => ({
      id: plan.id,
      type: 'NUTRITION_PLAN',
      title: plan.title || 'Personalized Indian Metabolic Meal Blueprint',
      description: plan.description || 'Clinical nutrition protocol calibrated for blood glucose stabilization and healthy weight loss.',
      version: plan.version || 1,
      target_calories: plan.target_calories || 1650,
      target_protein_g: plan.target_protein_g || 90,
      target_carbs_g: plan.target_carbs_g || 140,
      target_fat_g: plan.target_fat_g || 45,
      hydration_liters: plan.hydration_liters || 3.0,
      meals: plan.meals || {},
      guidelines: Array.isArray(plan.guidelines) ? plan.guidelines : (plan.guidelines ? [plan.guidelines] : []),
      food_restrictions: Array.isArray(plan.food_restrictions) ? plan.food_restrictions : [],
      clinical_notes: plan.clinical_notes || null,
      dietitian_name: plan.dietitian_name || 'Clinical Dietitian (RD)',
      dietitian_id: plan.dietitian_id || null,
      status: plan.status || 'PUBLISHED',
      created_at: plan.created_at,
    }))

    const legacyDietPlans = (dietRes.data || []).map((dp: any) => ({
      id: dp.id,
      type: 'DIET_PLAN',
      title: dp.title || 'Clinical Diet Protocol',
      description: dp.description || 'Structured diet recommendations from your nutritionist.',
      version: 1,
      target_calories: dp.calorie_target || null,
      target_protein_g: dp.protein_target || null,
      target_carbs_g: dp.carbs_target || null,
      target_fat_g: dp.fat_target || null,
      hydration_liters: dp.water_liters || null,
      meals: dp.meals || {},
      guidelines: dp.guidelines ? [dp.guidelines] : [],
      food_restrictions: dp.food_restrictions || [],
      clinical_notes: dp.dietitian_notes || dp.notes || null,
      dietitian_name: dp.dietitian_name || 'Assigned Dietitian',
      dietitian_id: dp.dietitian_id || null,
      status: dp.status || 'ACTIVE',
      created_at: dp.created_at,
    }))

    const allDietitianPlans = [...nutritionPlans, ...legacyDietPlans].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    )

    const activeNutritionPlan = allDietitianPlans.find(
      p => p.status === 'PUBLISHED' || p.status === 'ACKNOWLEDGED' || p.status === 'ACTIVE'
    ) || allDietitianPlans[0] || null

    // 5. Fetch Fitness Coach Workout Plans
    const { data: fitnessData } = await supabaseAdmin
      .from('fitness_plans')
      .select('*')
      .eq('patient_id', patientId)
      .order('created_at', { ascending: false })

    // Enrich with coach profile details if coach_id exists
    const coachIds = Array.from(new Set((fitnessData || []).map((f: any) => f.fitness_coach_id).filter(Boolean)))
    let coachesMap = new Map()
    if (coachIds.length > 0) {
      const { data: coachProfiles } = await supabaseAdmin
        .from('profiles')
        .select('id, first_name, last_name, display_id')
        .in('id', coachIds)
      for (const c of coachProfiles || []) {
        coachesMap.set(c.id, `${c.first_name || ''} ${c.last_name || ''}`.trim() || 'Certified Fitness Coach')
      }
    }

    const fitnessPlans = (fitnessData || []).map((fp: any) => ({
      id: fp.id,
      title: fp.title || `${fp.workout_type || 'Personalized'} Movement Protocol`,
      workout_type: fp.workout_type || 'Resistance & Low-Impact Cardio',
      weekly_frequency: fp.weekly_frequency || 3,
      daily_step_goal: fp.daily_step_goal || 8000,
      exercise_restrictions: fp.exercise_restrictions || 'None reported',
      notes: fp.notes || fp.description || null,
      attachment_url: fp.attachment_url || null,
      coach_name: coachesMap.get(fp.fitness_coach_id) || 'Certified Fitness Coach',
      status: fp.status || 'ACTIVE',
      created_at: fp.created_at,
      updated_at: fp.updated_at,
    }))

    const activeFitnessPlan = fitnessPlans.find(f => f.status === 'ACTIVE') || fitnessPlans[0] || null

    return NextResponse.json({
      success: true,
      prescriptions,
      activePrescription,
      nutritionPlans: allDietitianPlans,
      activeNutritionPlan,
      fitnessPlans,
      activeFitnessPlan,
    })
  } catch (err) {
    console.error('Error in /api/patient/care-protocols:', err)
    const failure = errorResponse(err instanceof Error ? err.message : 'Internal Server Error')
    return NextResponse.json({
      error: failure.error,
      prescriptions: [],
      activePrescription: null,
      nutritionPlans: [],
      activeNutritionPlan: null,
      fitnessPlans: [],
      activeFitnessPlan: null,
    }, { status: failure.status })
  }
}
