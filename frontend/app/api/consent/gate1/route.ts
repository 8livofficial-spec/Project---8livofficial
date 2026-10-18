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

    const {
      consent_health_data,
      consent_care_team_share,
      consent_reminders = false,
      consent_deidentified_research = false,
      guardian_user_id = null,
      otp_verified = false,
    } = body

    if (!consent_health_data || !consent_care_team_share) {
      return NextResponse.json({
        error: 'Required consents missing: You must accept personal health data collection and care team sharing to continue.',
      }, { status: 400 })
    }

    const record = await recordConsent({
      userId: auth.user.id,
      guardianUserId: guardian_user_id,
      documentId: 'data_notice',
      version: CONSENT_VERSION,
      gate: 'gate1',
      choices: {
        consent_health_data: Boolean(consent_health_data),
        consent_care_team_share: Boolean(consent_care_team_share),
        consent_reminders: Boolean(consent_reminders),
        consent_deidentified_research: Boolean(consent_deidentified_research),
      },
      action: 'accepted',
      ipAddress: ip,
      userAgent: userAgent,
      otpVerified: Boolean(otp_verified),
    })

    return NextResponse.json({
      success: true,
      recordId: record.id,
      timestamp: record.timestamp,
    })
  } catch (err: any) {
    console.error('Gate 1 consent error:', err)
    return NextResponse.json({ error: err.message || 'Failed to record Gate 1 consent' }, { status: 500 })
  }
}
