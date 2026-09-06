import { NextResponse } from 'next/server'
import { assertDietitian, resolveTenant } from '@/lib/apiSecurity'
import { getAssignedDietitianPatients } from '@/lib/nutritionService'

export async function GET(request: Request) {
  try {
    const auth = await assertDietitian(request)
    const tenantId = resolveTenant(request, auth.user)

    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search') || undefined
    const status = searchParams.get('status') || undefined

    const patients = await getAssignedDietitianPatients(auth.user.id, tenantId, { search, status })
    return NextResponse.json({ success: true, patients })
  } catch (error: any) {
    const status = error.message === 'Unauthorized' ? 401 : error.message === 'Forbidden' ? 403 : 500
    return NextResponse.json({ success: false, error: error.message || 'Failed to fetch patients' }, { status })
  }
}
