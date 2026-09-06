import { NextResponse } from 'next/server'
import { assertDietitianPatientAccess, resolveTenant } from '@/lib/apiSecurity'
import { saveNutritionAssessment, calculateBmi } from '@/lib/nutritionService'

export async function POST(
  request: Request,
  { params }: { params: Promise<{ patientId: string }> }
) {
  try {
    const { patientId } = await params
    const auth = await assertDietitianPatientAccess(request, patientId)
    const tenantId = resolveTenant(request, auth.user)

    const body = await request.json()

    // Validate numeric fields
    if (body.height_cm !== undefined && body.height_cm !== null) {
      const h = Number(body.height_cm)
      if (isNaN(h) || h < 40 || h > 260) {
        return NextResponse.json({ success: false, error: 'Height must be between 40 cm and 260 cm' }, { status: 400 })
      }
    }

    if (body.current_weight_kg !== undefined && body.current_weight_kg !== null) {
      const w = Number(body.current_weight_kg)
      if (isNaN(w) || w < 20 || w > 350) {
        return NextResponse.json({ success: false, error: 'Weight must be between 20 kg and 350 kg' }, { status: 400 })
      }
    }

    const saved = await saveNutritionAssessment(
      patientId,
      auth.user.id,
      body,
      tenantId,
      request
    )

    return NextResponse.json({ success: true, assessment: saved })
  } catch (error: any) {
    const status = error.message === 'Unauthorized' ? 401 : error.message === 'Forbidden' ? 403 : 500
    return NextResponse.json({ success: false, error: error.message || 'Failed to save nutrition assessment' }, { status })
  }
}
