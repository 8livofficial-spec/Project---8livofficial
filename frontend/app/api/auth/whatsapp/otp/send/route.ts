import { NextResponse } from 'next/server'
import { WhatsAppOtpService, OtpPurpose } from '@/lib/whatsapp/whatsappOtpService'
import { checkRateLimit, getClientIp, rateLimitResponse } from '@/lib/authSecurity'

export async function POST(request: Request) {
  const ip = getClientIp(request)
  const userAgent = request.headers.get('user-agent') || undefined

  try {
    const body = await request.json().catch(() => ({}))
    const phoneNumber = String(body.phoneNumber || body.phone || '').trim()
    const purpose = (String(body.purpose || 'LOGIN').toUpperCase()) as OtpPurpose

    if (!phoneNumber) {
      return NextResponse.json({ error: 'Please enter your mobile number.' }, { status: 400 })
    }

    // Rate limiting: Max 5 requests per 10 minutes per IP/Phone
    const rate = checkRateLimit(`wa_otp_send:${ip}:${phoneNumber}`, {
      limit: 5,
      windowMs: 10 * 60 * 1000,
      lockMs: 15 * 60 * 1000,
    })
    if (!rate.allowed) {
      return rateLimitResponse(rate.retryAfter || 60, rate.message)
    }

    const result = await WhatsAppOtpService.sendOtp({
      phoneNumber,
      purpose,
      ipAddress: ip,
      userAgent,
    })

    return NextResponse.json(result)
  } catch (err: any) {
    console.error('Error in POST /api/auth/whatsapp/otp/send:', err)
    return NextResponse.json(
      { error: err.message || 'Failed to dispatch WhatsApp OTP.' },
      { status: 400 }
    )
  }
}
