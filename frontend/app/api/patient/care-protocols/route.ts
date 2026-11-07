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
    const [{ data: rxData }, { data: consultRxData }] = await Promise.all([
      supabaseAdmin
        .from('prescriptions')
        .select('*, prescription_items(*)')
        .eq('patient_id', patientId)
        .order('created_at', { ascending: false }),
      supabaseAdmin
        .from('doctor_consultations')
        .select('id, doctor_id, booking_date, booking_time, prescription_text, clinical_notes, status, created_at, updated_at')
        .eq('patient_id', patientId)
        .not('prescription_text', 'is', null)
        .order('created_at', { ascending: false })
    ])

    const rawPrescriptions = (rxData || []).filter((r: any) => r.status !== 'DRAFT' || r.prescription_items?.length > 0)

    // Enrich prescriptions with Doctor details
    const doctorIds = Array.from(new Set([
      ...rawPrescriptions.map(rx => rx.doctor_id),
      ...(consultRxData || []).map(c => c.doctor_id)
    ].filter(Boolean)))

    const doctorsMap = new Map()
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

    const formalPrescriptions = rawPrescriptions.map(rx => ({
      ...rx,
      doctor: doctorsMap.get(rx.doctor_id) || rx.canonical_data?.doctor || {
        name: 'Authorized 8LIV Doctor',
        specialty: 'Metabolic & Obesity Medicine',
        reg_number: 'RMP',
      },
      is_active: !['DRAFT', 'REVOKED', 'CANCELLED', 'REPLACED'].includes(String(rx.status).toUpperCase()),
    }))

    // Include doctor consultation prescription notes if not already linked to a formal prescription
    const existingConsultIds = new Set(formalPrescriptions.map(rx => rx.consultation_id).filter(Boolean))
    const consultNotesPrescriptions: any[] = []
    for (const c of consultRxData || []) {
      if (c.prescription_text && !existingConsultIds.has(c.id)) {
        consultNotesPrescriptions.push({
          id: c.id,
          prescription_number: `RX-CONSULT-${String(c.id).slice(0, 8).toUpperCase()}`,
          status: 'ISSUED',
          diagnosis: 'Clinical Consultation Prescription',
          consultation_id: c.id,
          doctor_id: c.doctor_id,
          doctor: doctorsMap.get(c.doctor_id) || {
            name: 'Authorized 8LIV Doctor',
            specialty: 'Metabolic Medicine',
            reg_number: 'RMP',
          },
          prescription_items: [
            {
              id: c.id,
              medicine_name: c.prescription_text,
              strength: '',
              dosage_form: 'Prescription Medication',
              dose: 'Follow physician instructions',
              route: 'Oral / As directed',
              frequency: 'As prescribed',
              duration_value: 4,
              duration_unit: 'WEEKS',
              quantity: 1,
              special_instruction: c.clinical_notes || null,
            }
          ],
          issued_at: c.updated_at || c.created_at,
          created_at: c.created_at,
          is_active: true,
          is_consultation_note: true,
        })
      }
    }

    const prescriptions = [...formalPrescriptions, ...consultNotesPrescriptions].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    )

    const activePrescription = prescriptions.find(rx => rx.is_active) || prescriptions[0] || null

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

    // Dietitian profiles lookup
    const dietitianIds = Array.from(new Set([
      ...(nutritionRes.data || []).map((p: any) => p.dietitian_id),
      ...(dietRes.data || []).map((p: any) => p.dietitian_id),
    ].filter(Boolean)))
    const dietitiansMap = new Map()
    if (dietitianIds.length > 0) {
      const { data: dietProfiles } = await supabaseAdmin
        .from('profiles')
        .select('id, first_name, last_name, full_name')
        .in('id', dietitianIds)
      for (const d of dietProfiles || []) {
        dietitiansMap.set(d.id, d.full_name || `${d.first_name || ''} ${d.last_name || ''}`.trim() || 'Clinical Dietitian (RD)')
      }
    }

    const nutritionPlans = await Promise.all((nutritionRes.data || []).map(async (plan: any) => {
      let attachment_signed_url = null
      if (plan.pdf_url) {
        try {
          const rawPath = String(plan.pdf_url).replace(/^diet-plans\//, '')
          const { data: signed } = await supabaseAdmin.storage
            .from('diet-plans')
            .createSignedUrl(rawPath, 3600 * 24)
          if (signed?.signedUrl) attachment_signed_url = signed.signedUrl
        } catch (e) {
          console.warn('Diet signed URL warning:', e)
        }
      }
      return {
        id: plan.id,
        type: 'NUTRITION_PLAN',
        title: plan.plan_name || plan.title || 'Personalized Indian Metabolic Meal Blueprint',
        description: plan.general_instructions || plan.description || 'Clinical nutrition protocol calibrated for blood glucose stabilization and healthy weight loss.',
        version: plan.version || 1,
        target_calories: plan.daily_calorie_target || plan.target_calories || 1650,
        target_protein_g: plan.target_protein_g || 90,
        target_carbs_g: plan.target_carbs_g || 140,
        target_fat_g: plan.target_fat_g || 45,
        hydration_liters: plan.water_target_liters || plan.hydration_liters || 3.0,
        meals: plan.meals || {},
        guidelines: Array.isArray(plan.guidelines) ? plan.guidelines : (plan.guidelines ? [plan.guidelines] : []),
        food_restrictions: Array.isArray(plan.food_restrictions) ? plan.food_restrictions : [],
        clinical_notes: plan.clinical_notes || null,
        dietitian_name: dietitiansMap.get(plan.dietitian_id) || plan.dietitian_name || 'Clinical Dietitian (RD)',
        dietitian_id: plan.dietitian_id || null,
        status: (plan.status || 'PUBLISHED').toUpperCase(),
        attachment_url: plan.pdf_url || null,
        attachment_signed_url,
        created_at: plan.created_at,
      }
    }))

    const legacyDietPlans = await Promise.all((dietRes.data || []).map(async (dp: any) => {
      let attachment_signed_url = null
      if (dp.attachment_url) {
        try {
          const rawPath = String(dp.attachment_url).replace(/^diet-plans\//, '')
          const { data: signed } = await supabaseAdmin.storage
            .from('diet-plans')
            .createSignedUrl(rawPath, 3600 * 24)
          if (signed?.signedUrl) attachment_signed_url = signed.signedUrl
        } catch (e) {
          console.warn('Diet plan signed URL warning:', e)
        }
      }
      return {
        id: dp.id,
        type: 'DIET_PLAN',
        title: dp.title || 'Personalized Clinical Nutrition Plan',
        description: dp.description || dp.notes || 'Structured diet recommendations from your clinical dietitian.',
        version: 1,
        target_calories: dp.calories_per_day || dp.calorie_target || 1600,
        target_protein_g: dp.protein_target || 90,
        target_carbs_g: dp.carbs_target || 140,
        target_fat_g: dp.fat_target || 45,
        hydration_liters: dp.hydration_goal ? parseFloat(dp.hydration_goal) : (dp.water_liters || 2.5),
        meals: dp.meals || (dp.meal_schedule ? { schedule: dp.meal_schedule } : {}),
        meal_schedule: dp.meal_schedule || null,
        guidelines: dp.guidelines ? (Array.isArray(dp.guidelines) ? dp.guidelines : [dp.guidelines]) : [],
        food_restrictions: dp.food_restrictions ? (Array.isArray(dp.food_restrictions) ? dp.food_restrictions : [dp.food_restrictions]) : [],
        clinical_notes: dp.dietitian_notes || dp.notes || null,
        dietitian_name: dietitiansMap.get(dp.dietitian_id) || dp.dietitian_name || 'Clinical Dietitian (RD)',
        dietitian_id: dp.dietitian_id || null,
        status: (dp.status || 'ACTIVE').toUpperCase(),
        attachment_url: dp.attachment_url || null,
        attachment_type: dp.attachment_type || null,
        attachment_signed_url,
        created_at: dp.created_at,
      }
    }))

    const allDietitianPlans = [...nutritionPlans, ...legacyDietPlans].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    )

    const activeNutritionPlan = allDietitianPlans.find(
      p => ['PUBLISHED', 'ACKNOWLEDGED', 'ACTIVE'].includes(String(p.status).toUpperCase())
    ) || allDietitianPlans[0] || null

    // 5. Fetch Fitness Coach Workout Plans
    const { data: fitnessData } = await supabaseAdmin
      .from('fitness_plans')
      .select('*')
      .eq('patient_id', patientId)
      .order('created_at', { ascending: false })

    // Enrich with coach profile details if coach_id exists
    const coachIds = Array.from(new Set((fitnessData || []).map((f: any) => f.fitness_coach_id).filter(Boolean)))
    const coachesMap = new Map()
    if (coachIds.length > 0) {
      const { data: coachProfiles } = await supabaseAdmin
        .from('profiles')
        .select('id, first_name, last_name, display_id')
        .in('id', coachIds)
      for (const c of coachProfiles || []) {
        coachesMap.set(c.id, `${c.first_name || ''} ${c.last_name || ''}`.trim() || 'Certified Fitness Coach')
      }
    }

    const fitnessPlans = await Promise.all((fitnessData || []).map(async (fp: any) => {
      let attachment_signed_url = null
      if (fp.attachment_url) {
        try {
          const rawPath = String(fp.attachment_url).replace(/^fitness-plans\//, '')
          const { data: signed } = await supabaseAdmin.storage
            .from('fitness-plans')
            .createSignedUrl(rawPath, 3600 * 24)
          if (signed?.signedUrl) attachment_signed_url = signed.signedUrl
        } catch (e) {
          console.warn('Fitness plan signed URL warning:', e)
        }
      }
      return {
        id: fp.id,
        title: fp.title || `${fp.workout_type || 'Personalized'} Movement Protocol`,
        workout_type: fp.workout_type || 'Resistance & Low-Impact Cardio',
        weekly_frequency: fp.weekly_frequency || 3,
        daily_step_goal: fp.daily_step_goal || 8000,
        exercise_restrictions: fp.exercise_restrictions || 'None reported',
        notes: fp.notes || fp.description || null,
        attachment_url: fp.attachment_url || null,
        attachment_type: fp.attachment_type || null,
        attachment_signed_url,
        coach_name: coachesMap.get(fp.fitness_coach_id) || 'Certified Fitness Coach',
        status: (fp.status || 'ACTIVE').toUpperCase(),
        created_at: fp.created_at,
        updated_at: fp.updated_at,
      }
    }))

    const activeFitnessPlan = fitnessPlans.find(f => String(f.status).toUpperCase() === 'ACTIVE') || fitnessPlans[0] || null

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
