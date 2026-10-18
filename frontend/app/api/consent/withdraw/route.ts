import { NextResponse } from 'next/server'
import { getAuthenticatedPatient } from '@/lib/appointmentAvailability'
import { recordConsent } from '@/lib/consent/consentService'
import { CONSENT_VERSION } from '@/lib/consent/constants'
import { getClientIp } from '@/lib/authSecurity'
import { supabaseAdmin } from '@/lib/supabaseServer'

export async function POST(request: Request) {
  try {
    const auth = await getAuthenticatedPatient(request)
    if ('error' in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status })
    }

    const ip = getClientIp(request)
    const userAgent = request.headers.get('user-agent')
    const body = await request.json()

    const { documentId, gate, reason = '' } = body

    if (!documentId || !gate) {
      return NextResponse.json({ error: 'Document ID and gate are required to process withdrawal.' }, { status: 400 })
    }

    // Append-only: Never delete or update previous consent rows; insert a new withdrawal record
    const record = await recordConsent({
      userId: auth.user.id,
      documentId,
      version: CONSENT_VERSION,
      gate: gate as any,
      choices: {
        withdrawn: true,
        reason: String(reason).trim(),
      },
      action: 'withdrawn',
      ipAddress: ip,
      userAgent: userAgent,
    })

    // If a required consent was withdrawn (e.g. data_notice or terms), restrict account access
    if (documentId === 'data_notice' || documentId === 'terms') {
      await supabaseAdmin.from('patient_journey_state').upsert({
        patient_id: auth.user.id,
        dashboardAccess: false,
        consultationStatus: 'RESTRICTED_CONSENT_WITHDRAWN',
      })
    }

    return NextResponse.json({
      success: true,
      message: 'Consent withdrawal recorded in permanent audit trail.',
      recordId: record.id,
      timestamp: record.timestamp,
    })
  } catch (err: any) {
    console.error('Consent withdrawal error:', err)
    return NextResponse.json({ error: err.message || 'Failed to process consent withdrawal' }, { status: 500 })
  }
}
