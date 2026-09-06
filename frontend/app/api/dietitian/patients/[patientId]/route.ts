import { NextResponse } from 'next/server'
import { assertDietitianPatientAccess, resolveTenant } from '@/lib/apiSecurity'
import { getPatientNutritionWorkspace } from '@/lib/nutritionService'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ patientId: string }> }
) {
  try {
    const { patientId } = await params
    const auth = await assertDietitianPatientAccess(request, patientId)
    const tenantId = resolveTenant(request, auth.user)

    const workspace = await getPatientNutritionWorkspace(auth.user.id, patientId, tenantId)
    return NextResponse.json({ success: true, ...workspace })
  } catch (error: any) {
    const status = error.message === 'Unauthorized' ? 401 : error.message === 'Forbidden' ? 403 : 500
    return NextResponse.json({ success: false, error: error.message || 'Failed to fetch patient workspace' }, { status })
  }
}
