import { NextResponse } from 'next/server'
import { assertDietitian, resolveTenant } from '@/lib/apiSecurity'
import { acceptDoctorReferral, declineDoctorReferral } from '@/lib/nutritionService'

export async function POST(
  request: Request,
  { params }: { params: Promise<{ referralId: string }> }
) {
  try {
    const { referralId } = await params
    const auth = await assertDietitian(request)
    const tenantId = resolveTenant(request, auth.user)

    const body = await request.json()
    const action = String(body.action || '').toUpperCase()

    if (action === 'ACCEPT') {
      const result = await acceptDoctorReferral(referralId, auth.user.id, tenantId, request)
      return NextResponse.json(result)
    } else if (action === 'DECLINE') {
      const result = await declineDoctorReferral(referralId, auth.user.id, body.reason || 'Capacity reached', request)
      return NextResponse.json(result)
    }


    return NextResponse.json({ success: false, error: 'Invalid action. Must be ACCEPT or DECLINE' }, { status: 400 })
  } catch (error: any) {
    const status = error.message === 'Unauthorized' ? 401 : error.message === 'Forbidden' ? 403 : 500
    return NextResponse.json({ success: false, error: error.message || 'Failed to update referral' }, { status })
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ referralId: string }> }
) {
  return POST(request, { params })
}
