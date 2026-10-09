import { NextResponse } from 'next/server'
import { WhatsAppOtpService, OtpPurpose } from '@/lib/whatsapp/whatsappOtpService'
import { checkRateLimit, getClientIp, rateLimitResponse } from '@/lib/authSecurity'

export async function POST(request: Request) {
  const ip = getClientIp(request)
  const userAgent = request.headers.get('user-agent') || undefined

  try {
    const body = await request.json().catch(() => ({}))
    const phoneNumber = String(body.phoneNumber || body.phone || '').trim()
    const enteredOtp = String(body.otp || body.enteredOtp || '').trim()
    const purpose = (String(body.purpose || 'LOGIN').toUpperCase()) as OtpPurpose

    if (!phoneNumber || !enteredOtp) {
      return NextResponse.json({ error: 'Mobile number and 6-digit OTP are required.' }, { status: 400 })
    }

    // Rate limiting: Max 10 verification attempts per 10 minutes per IP/Phone
    const rate = checkRateLimit(`wa_otp_verify:${ip}:${phoneNumber}`, {
      limit: 10,
      windowMs: 10 * 60 * 1000,
      lockMs: 15 * 60 * 1000,
    })
    if (!rate.allowed) {
      return rateLimitResponse(rate.retryAfter || 60, rate.message)
    }

    const result = await WhatsAppOtpService.verifyOtp({
      phoneNumber,
      enteredOtp,
      purpose,
      ipAddress: ip,
      userAgent,
    })

    const response = NextResponse.json(result)

    // Set user_role cookie for client routing
    if (result.role) {
      response.cookies.set('user_role', result.role, {
        path: '/',
        maxAge: 86400,
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production',
      })
    }

    return response
  } catch (err: any) {
    console.error('Error in POST /api/auth/whatsapp/otp/verify:', err)
    return NextResponse.json(
      { error: err.message || 'OTP verification failed.' },
      { status: 400 }
    )
  }
}
