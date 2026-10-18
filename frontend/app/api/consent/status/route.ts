import { NextResponse } from 'next/server'
import { getAuthenticatedPatient } from '@/lib/appointmentAvailability'
import { getUserConsentStatus } from '@/lib/consent/consentService'
import { CONSENT_VERSION } from '@/lib/consent/constants'

export async function GET(request: Request) {
  try {
    const auth = await getAuthenticatedPatient(request)
    if ('error' in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status })
    }

    const { searchParams } = new URL(request.url)
    const bookingId = searchParams.get('bookingId')

    const status = await getUserConsentStatus(auth.user.id, bookingId)

    return NextResponse.json({
      success: true,
      userId: auth.user.id,
      currentVersion: CONSENT_VERSION,
      gate1Accepted: status.gate1Accepted,
      gate2Accepted: status.gate2Accepted,
      gate3Accepted: status.gate3Accepted,
      records: status.records,
    })
  } catch (err: any) {
    console.error('Consent status error:', err)
    return NextResponse.json({ error: err.message || 'Failed to check consent status' }, { status: 500 })
  }
}
