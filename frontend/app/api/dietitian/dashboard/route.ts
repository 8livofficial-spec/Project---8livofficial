import { NextResponse } from 'next/server'
import { assertDietitian, resolveTenant } from '@/lib/apiSecurity'
import { getDietitianDashboardData } from '@/lib/nutritionService'

export async function GET(request: Request) {
  try {
    const auth = await assertDietitian(request)
    const tenantId = resolveTenant(request, auth.user)

    const dashboardData = await getDietitianDashboardData(auth.user.id, tenantId)
    return NextResponse.json({ success: true, ...dashboardData })
  } catch (error: any) {
    const status = error.message === 'Unauthorized' ? 401 : error.message === 'Forbidden' ? 403 : 500
    return NextResponse.json({ success: false, error: error.message || 'Failed to fetch dashboard' }, { status })
  }
}
