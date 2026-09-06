import { NextResponse } from 'next/server'
import { assertDietitian } from '@/lib/apiSecurity'
import { publishNutritionPlan } from '@/lib/nutritionService'

export async function POST(
  request: Request,
  { params }: { params: Promise<{ planId: string }> }
) {
  try {
    const { planId } = await params
    const auth = await assertDietitian(request)

    const result = await publishNutritionPlan(planId, auth.user.id, request)

    return NextResponse.json({
      success: true,
      plan: result.plan,
      pdfHash: result.pdfHash,
      pdfUrl: `/api/dietitian/plans/${planId}/pdf`,
    })
  } catch (error: any) {
    const status = error.message === 'Unauthorized' ? 401 : error.message === 'Forbidden' ? 403 : 500
    return NextResponse.json({ success: false, error: error.message || 'Failed to publish nutrition plan' }, { status })
  }
}
