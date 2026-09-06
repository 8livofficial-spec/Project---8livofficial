import { NextResponse } from 'next/server'
import { assertDietitian, assertDietitianPatientAccess } from '@/lib/apiSecurity'
import { updateNutritionPlanDraft, createNewNutritionPlanVersion } from '@/lib/nutritionService'
import { supabaseAdmin } from '@/lib/supabaseServer'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ planId: string }> }
) {
  try {
    const { planId } = await params
    const auth = await assertDietitian(request)

    const { data: plan, error } = await supabaseAdmin
      .from('nutrition_plans')
      .select('*, profiles:patient_id(full_name, email, age, gender)')
      .eq('id', planId)
      .maybeSingle()

    if (!plan || error) {
      return NextResponse.json({ success: false, error: 'Plan not found' }, { status: 404 })
    }

    // Verify access
    await assertDietitianPatientAccess(request, plan.patient_id)

    return NextResponse.json({ success: true, plan })
  } catch (error: any) {
    const status = error.message === 'Unauthorized' ? 401 : error.message === 'Forbidden' ? 403 : 500
    return NextResponse.json({ success: false, error: error.message || 'Failed to fetch plan' }, { status })
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ planId: string }> }
) {
  try {
    const { planId } = await params
    const auth = await assertDietitian(request)
    const body = await request.json()

    const updated = await updateNutritionPlanDraft(planId, auth.user.id, body, request)
    return NextResponse.json({ success: true, plan: updated })
  } catch (error: any) {
    const isImmutabilityError = error.message?.includes('IMMUTABILITY VIOLATION')
    const status = isImmutabilityError ? 409 : error.message === 'Unauthorized' ? 401 : error.message === 'Forbidden' ? 403 : 500
    return NextResponse.json({ success: false, error: error.message || 'Failed to update plan' }, { status })
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ planId: string }> }
) {
  try {
    const { planId } = await params
    const auth = await assertDietitian(request)
    const body = await request.json().catch(() => ({}))

    if (body.action === 'create_version') {
      const newVersion = await createNewNutritionPlanVersion(planId, auth.user.id, request)
      return NextResponse.json({ success: true, plan: newVersion })
    }

    return NextResponse.json({ success: false, error: 'Invalid action' }, { status: 400 })
  } catch (error: any) {
    const status = error.message === 'Unauthorized' ? 401 : error.message === 'Forbidden' ? 403 : 500
    return NextResponse.json({ success: false, error: error.message || 'Failed to process plan action' }, { status })
  }
}
