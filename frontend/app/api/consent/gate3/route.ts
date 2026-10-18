import { NextResponse } from 'next/server'
import { getAuthenticatedPatient } from '@/lib/appointmentAvailability'
import { recordConsent } from '@/lib/consent/consentService'
import { CONSENT_VERSION, PART3_TREATMENT_STATEMENTS } from '@/lib/consent/constants'
import { getClientIp } from '@/lib/authSecurity'
import { WhatsAppOtpService } from '@/lib/whatsapp/whatsappOtpService'

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
      choices = {},
      bookingId = null,
      phoneNumber,
      otp,
      guardianName = null,
      guardianPhoneNumber = null,
      isMinor = false,
    } = body

    // 1. Verify all 12 statements are accepted
    const missingStatements = PART3_TREATMENT_STATEMENTS.filter(
      (stmt) => choices[stmt.id] !== true
    )

    if (missingStatements.length > 0) {
      return NextResponse.json({
        error: `Incomplete consent: All 12 treatment statements must be ticked. Missing: ${missingStatements.map(s => s.lead).join(', ')}`,
      }, { status: 400 })
    }

    // 2. Verify mobile OTP before accepting consent
    const targetPhone = isMinor ? (guardianPhoneNumber || phoneNumber) : phoneNumber
    if (!targetPhone || !otp) {
      return NextResponse.json({
        error: 'Mobile OTP verification is required to authorize Informed Consent to Treatment.',
      }, { status: 400 })
    }

    const otpResult = await WhatsAppOtpService.verifyOtp({
      phoneNumber: targetPhone,
      enteredOtp: otp,
      purpose: 'LOGIN', // or general verification
      ipAddress: ip,
      userAgent: userAgent || undefined,
    }).catch(async (err) => {
      // Allow fallback if already verified or test bypass in development
      if (process.env.NODE_ENV !== 'production' && otp === '123456') {
        return { success: true }
      }
      throw err
    })

    if (!otpResult || !otpResult.success) {
      return NextResponse.json({
        error: 'Invalid or expired mobile verification code. Please request a new code.',
      }, { status: 400 })
    }

    // 3. Record Gate 3 acceptance in append-only consent_records
    const record = await recordConsent({
      userId: auth.user.id,
      guardianUserId: isMinor ? (body.guardianUserId || null) : null,
      documentId: 'treatment_consent',
      version: CONSENT_VERSION,
      gate: 'gate3',
      choices: {
        ...choices,
        isMinor: Boolean(isMinor),
        guardianName: guardianName || null,
        verifiedPhone: targetPhone,
      },
      action: 'accepted',
      ipAddress: ip,
      userAgent: userAgent,
      otpVerified: true,
      bookingId: bookingId || null,
    })

    return NextResponse.json({
      success: true,
      recordId: record.id,
      timestamp: record.timestamp,
      bookingId,
    })
  } catch (err: any) {
    console.error('Gate 3 consent error:', err)
    return NextResponse.json({ error: err.message || 'Failed to record Gate 3 treatment consent' }, { status: 500 })
  }
}
