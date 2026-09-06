import { NextResponse } from 'next/server'
import { getAuthenticatedUser, resolveTenant } from '@/lib/apiSecurity'
import { acknowledgeNutritionPlanAsPatient } from '@/lib/nutritionService'

export async function POST(
  request: Request,
  { params }: { params: Promise<{ planId: string }> }
) {
  try {
    const { planId } = await params
    const auth = await getAuthenticatedUser(request)
    if (!auth) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const tenantId = resolveTenant(request, auth.user)
    const result = await acknowledgeNutritionPlanAsPatient(planId, auth.user.id, tenantId, request)

    return NextResponse.json(result)
  } catch (error: any) {
    const status = error.message?.includes('Forbidden') ? 403 : 500
    return NextResponse.json({ success: false, error: error.message || 'Failed to acknowledge plan' }, { status })
  }
}
