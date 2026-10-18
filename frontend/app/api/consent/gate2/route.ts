import { NextResponse } from 'next/server'
import { getAuthenticatedPatient } from '@/lib/appointmentAvailability'
import { recordConsent } from '@/lib/consent/consentService'
import { CONSENT_VERSION } from '@/lib/consent/constants'
import { getClientIp } from '@/lib/authSecurity'

export async function POST(request: Request) {
  try {
    const auth = await getAuthenticatedPatient(request)
    if ('error' in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status })
    }

    const ip = getClientIp(request)
    const userAgent = request.headers.get('user-agent')
    const body = await request.json()

    const { terms_agreed } = body

    if (!terms_agreed) {
      return NextResponse.json({
        error: 'You must agree to the Terms of Service, Privacy Policy, and Prescription Policy before booking or payment.',
      }, { status: 400 })
    }

    const record = await recordConsent({
      userId: auth.user.id,
      documentId: 'terms',
      version: CONSENT_VERSION,
      gate: 'gate2',
      choices: {
        terms_agreed: true,
        terms_version: CONSENT_VERSION,
        privacy_version: CONSENT_VERSION,
        prescription_version: CONSENT_VERSION,
      },
      action: 'accepted',
      ipAddress: ip,
      userAgent: userAgent,
    })

    return NextResponse.json({
      success: true,
      recordId: record.id,
      timestamp: record.timestamp,
    })
  } catch (err: any) {
    console.error('Gate 2 consent error:', err)
    return NextResponse.json({ error: err.message || 'Failed to record Gate 2 consent' }, { status: 500 })
  }
}
