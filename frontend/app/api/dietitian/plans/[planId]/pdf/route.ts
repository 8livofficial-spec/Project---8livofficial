import { NextResponse } from 'next/server'
import { getAuthenticatedUser } from '@/lib/apiSecurity'
import { generateNutritionPlanPdf } from '@/lib/nutritionPlanPdfService'
import { supabaseAdmin } from '@/lib/supabaseServer'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ planId: string }> }
) {
  try {
    const { planId } = await params
    const auth = await getAuthenticatedUser(request)
    if (!auth) {
      return new NextResponse('Unauthorized', { status: 401 })
    }

    // Fetch plan
    const { data: plan } = await supabaseAdmin
      .from('nutrition_plans')
      .select('*')
      .eq('id', planId)
      .maybeSingle()

    if (!plan) {
      return new NextResponse('Nutrition plan not found', { status: 404 })
    }

    // Enforce authorization: Dietitian, Admin, or the Patient themselves
    const isPatient = auth.user.id === plan.patient_id
    const isDietitian = auth.user.id === plan.dietitian_id || auth.role === 'dietitian' || auth.role === 'nutritionist'
    const isAdmin = auth.role === 'admin'

    if (!isPatient && !isDietitian && !isAdmin) {
      return new NextResponse('Forbidden', { status: 403 })
    }

    // Fetch details for PDF
    let patientName = 'Patient'
    let patientAge: any = '-'
    let patientGender = '-'
    let dietitianName = 'Clinical Dietitian'

    try {
      const { data: p } = await supabaseAdmin
        .from('profiles')
        .select('full_name, age, gender')
        .eq('id', plan.patient_id)
        .maybeSingle()
      if (p) {
        patientName = p.full_name || 'Patient'
        patientAge = p.age || '-'
        patientGender = p.gender || '-'
      }
    } catch (e) {}

    try {
      const { data: d } = await supabaseAdmin
        .from('profiles')
        .select('full_name')
        .eq('id', plan.dietitian_id)
        .maybeSingle()
      if (d) dietitianName = d.full_name || 'Clinical Dietitian'
    } catch (e) {}

    const { pdfBuffer } = await generateNutritionPlanPdf({
      plan_id: plan.id,
      plan_name: plan.plan_name,
      version: plan.version,
      patient_id: plan.patient_id,
      dietitian_id: plan.dietitian_id,
      start_date: plan.start_date,
      review_date: plan.review_date,
      daily_calorie_target: plan.daily_calorie_target,
      water_target_liters: plan.water_target_liters,
      nutrition_goals: plan.nutrition_goals,
      general_instructions: plan.general_instructions,
      status: plan.status,
      published_at: plan.published_at,
      patient_name: patientName,
      patient_age: patientAge,
      patient_gender: patientGender,
      dietitian_name: dietitianName,
      meals: plan.meals || [],
    })

    return new NextResponse(new Uint8Array(pdfBuffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="Nutrition_Plan_${plan.id}_v${plan.version}.pdf"`,
        'Cache-Control': 'private, max-age=3600',
      },
    })

  } catch (error: any) {
    return new NextResponse(error.message || 'Failed to generate PDF', { status: 500 })
  }
}
