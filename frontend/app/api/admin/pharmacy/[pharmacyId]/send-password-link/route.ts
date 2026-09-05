import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseServer'
import { assertAdmin } from '@/lib/fulfilmentAuth'
import { emitNotificationEvent } from '@/lib/notificationDispatcher'
import { getOrigin } from '@/lib/authSecurity'
import { audit } from '@/lib/prescriptionService'

type RouteContext = {
  params: Promise<{ pharmacyId: string }>
}

export async function POST(request: Request, context: RouteContext) {
  try {
    const admin = await assertAdmin(request)
    const { pharmacyId } = await context.params

    if (!pharmacyId) {
      return NextResponse.json({ error: 'Pharmacy ID is required.' }, { status: 400 })
    }

    const { data: pharmacy, error: pError } = await supabaseAdmin
      .from('partner_pharmacies')
      .select('*')
      .eq('id', pharmacyId)
      .maybeSingle()

    if (pError || !pharmacy) {
      return NextResponse.json({ error: 'Partner pharmacy not found.' }, { status: 404 })
    }

    if (!pharmacy.email) {
      return NextResponse.json({ error: 'Pharmacy has no associated email address.' }, { status: 400 })
    }

    const origin = getOrigin(request)
    const resetUrl = `${origin}/forgot-password?role=pharmacy&email=${encodeURIComponent(pharmacy.email)}`

    // Emit notification event with direct action button to set/reset password
    await emitNotificationEvent({
      eventType: 'PHARMACY_PASSWORD_LINK_SENT',
      entityType: 'partner_pharmacy',
      entityId: pharmacy.id,
      recipientEmail: pharmacy.email,
      recipientRole: 'pharmacy',
      subject: `Set Your 8LIV Partner Pharmacy Password — ${pharmacy.name}`,
      messageContent: `Hello,\n\nAn administrator has initiated a password setup/reset request for your 8LIV Partner Pharmacy account (${pharmacy.name}).\n\nPlease click the button below to set a new password and access your fulfillment portal:`,
      actionUrl: resetUrl,
      actionLabel: 'Set New Password →',
      secondaryActionUrl: `${origin}/login?role=pharmacy`,
      secondaryActionLabel: 'Already know your password? Sign in here →',
    })

    await audit({
      actorId: admin.user.id,
      actorRole: 'admin',
      action: 'PHARMACY_PASSWORD_LINK_SENT',
      newValues: { pharmacyId, email: pharmacy.email },
      request,
    })

    return NextResponse.json({
      success: true,
      message: `Password setup link sent to ${pharmacy.email}`,
    })
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'Failed to send password setup link' },
      { status: err.status || 500 }
    )
  }
}
