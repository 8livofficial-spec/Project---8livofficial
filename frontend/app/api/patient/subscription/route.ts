import { NextResponse } from 'next/server'
import { getAuthenticatedUser } from '@/lib/apiSecurity'
import { getActivePatientSubscription } from '@/lib/subscriptionService'

export async function GET(request: Request) {
  try {
    const auth = await getAuthenticatedUser(request)
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const patientId = auth.user.id
    const subscription = await getActivePatientSubscription(patientId)

    return NextResponse.json({
      success: true,
      subscription: subscription || null,
    })
  } catch (err: any) {
    console.error('Error in GET /api/patient/subscription:', err)
    return NextResponse.json(
      { error: err.message || 'Failed to fetch subscription details' },
      { status: 500 }
    )
  }
}
