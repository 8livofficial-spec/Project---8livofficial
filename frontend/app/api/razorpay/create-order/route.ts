import { NextResponse } from 'next/server'
import { getAuthenticatedPatient } from '@/lib/appointmentAvailability'
import { APP_CONFIG } from '@/lib/appConfig'
import { checkRateLimit, getClientIp, rateLimitResponse } from '@/lib/authSecurity'
import { getAuthoritativeSubscriptionPricing } from '@/lib/subscriptionService'
import { supabaseAdmin } from '@/lib/supabaseServer'
import { getMembershipValidity } from '@/lib/membershipServer'
import { buildRazorpayOrderMetadata, getRazorpayClient, getRazorpayKeyId } from '@/lib/payments/razorpayServer'

export async function POST(request: Request) {
  try {
    const ip = getClientIp(request)
    const body = await request.json().catch(() => ({}))
    const paymentType = body?.paymentType ? String(body.paymentType) : 'standard'
    const currency = String(body?.currency || 'INR').toUpperCase()
    const requestedReceipt = body?.receipt ? String(body.receipt).trim() : ''
    const receipt = requestedReceipt || `rcpt_${Date.now().toString().slice(-8)}_${Math.random().toString(36).slice(2, 6)}`
    const keyId = getRazorpayKeyId()

    const patient = await getAuthenticatedPatient(request)
    const isPatientAuth = !('error' in patient) && Boolean(patient?.user?.id)

    if (!isPatientAuth && (paymentType === 'consultation' || paymentType === 'membership' || paymentType === 'combined')) {
      return NextResponse.json({ error: 'Unauthorized. Please sign in to continue.' }, { status: 401 })
    }

    const rateKey = isPatientAuth ? `razorpay_order:${ip}:${patient.user.id}` : `razorpay_order:${ip}`
    const rate = checkRateLimit(rateKey, APP_CONFIG.rateLimits.booking)
    if (!rate.allowed) return rateLimitResponse(rate.retryAfter || 60, rate.message)

    if (paymentType === 'consultation' && isPatientAuth) {
      const membership = await getMembershipValidity(patient.user.id)
      if (membership.active) {
        return NextResponse.json({
          error: 'Your treatment program membership includes consultations at INR 0. No fee is required.',
          alreadyCovered: true,
        }, { status: 409 })
      }

      const [{ data: assessment }, { data: existingTxn }, { data: existingConsultation }] = await Promise.all([
        supabaseAdmin
          .from('health_assessments')
          .select('consultation_fee_paid')
          .eq('patient_id', patient.user.id)
          .maybeSingle(),
        supabaseAdmin
          .from('payment_transactions')
          .select('id')
          .eq('patient_id', patient.user.id)
          .eq('payment_type', 'consultation')
          .in('status', ['success', 'paid'])
          .limit(1)
          .maybeSingle(),
        supabaseAdmin
          .from('doctor_consultations')
          .select('id, status')
          .eq('patient_id', patient.user.id)
          .in('status', ['scheduled', 'calling', 'attended', 'approved', 'completed'])
          .limit(1)
          .maybeSingle(),
      ])

      if (assessment?.consultation_fee_paid || existingTxn || existingConsultation) {
        return NextResponse.json({
          error: 'Consultation fee has already been paid for this account.',
          alreadyPaid: true,
        }, { status: 409 })
      }
    } else if ((paymentType === 'membership' || paymentType === 'combined') && isPatientAuth) {
      const membership = await getMembershipValidity(patient.user.id)
      if (membership.active && membership.expiresAt) {
        const daysRemaining = Math.ceil((new Date(membership.expiresAt).getTime() - Date.now()) / (24 * 60 * 60 * 1000))
        if (daysRemaining > 7) {
          return NextResponse.json({
            error: `You already have an active treatment program (valid for ${daysRemaining} more days). Duplicate payment is not permitted.`,
            alreadyActive: true,
            daysRemaining,
          }, { status: 409 })
        }
      }
    }

    const planId = body?.planId ? String(body.planId).trim() : undefined
    const rawDuration = Number(body?.durationMonths)
    const lookupKey = planId || (rawDuration > 0 ? rawDuration : 1)
    const isStandardOrder = paymentType === 'standard'

    let amount = isStandardOrder ? Number(body?.amount) / 100 : 499
    let selectedPricing: any = null

    if (isStandardOrder && !Number.isFinite(Number(body?.amount))) {
      return NextResponse.json({ error: 'Amount is required in paise.' }, { status: 400 })
    } else if (paymentType === 'membership' || paymentType === 'combined') {
      selectedPricing = await getAuthoritativeSubscriptionPricing(lookupKey)
      if (paymentType === 'membership') {
        amount = selectedPricing.finalPrice
      } else {
        const subtotal = selectedPricing.finalPrice + 499
        const gst = Math.round(subtotal * 0.18)
        amount = subtotal + gst
      }
    }

    const amountInPaise = isStandardOrder ? Math.round(Number(body.amount)) : Math.round(amount * 100)
    if (!Number.isFinite(amountInPaise) || amountInPaise < 100) {
      return NextResponse.json({ error: 'Amount must be at least 100 paise.' }, { status: 400 })
    }

    try {
      const razorpay = getRazorpayClient()
      const order = await razorpay.orders.create({
        amount: amountInPaise,
        currency,
        receipt,
        notes: {
          patientId: isPatientAuth ? patient.user.id : 'guest',
          paymentType,
          planId: selectedPricing?.planId || planId || '',
          durationMonths: selectedPricing?.durationMonths || rawDuration || 1,
        },
      })

      const pendingMetadata = buildRazorpayOrderMetadata({
        orderId: order.id,
        receipt: order.receipt,
        paymentType,
        planId: selectedPricing?.planId || planId || '',
        durationMonths: selectedPricing?.durationMonths || rawDuration || 1,
      })

      if (isPatientAuth) {
        const { error: pendingTxnError } = await supabaseAdmin
          .from('payment_transactions')
          .upsert({
            patient_id: patient.user.id,
            amount: Number(order.amount || amountInPaise) / 100,
            currency: order.currency || currency,
            payment_method: 'razorpay',
            payment_provider: 'razorpay',
            transaction_id: order.id,
            status: 'pending',
            membership_tier: selectedPricing?.programName || null,
            payment_type: paymentType,
            metadata: pendingMetadata,
          }, { onConflict: 'transaction_id' })

        if (pendingTxnError) {
          console.error('[Razorpay] Failed to record pending order:', pendingTxnError.message)
          return NextResponse.json({ error: 'Failed to initialize payment tracking.' }, { status: 500 })
        }
      }

      return NextResponse.json({
        id: order.id,
        order_id: order.id,
        amount: order.amount,
        currency: order.currency,
        receipt: order.receipt,
        key: keyId,
        isMock: false,
      })
    } catch (razorpayErr: any) {
      const statusCode = Number(razorpayErr?.statusCode || razorpayErr?.error?.statusCode || 500)
      const isAuthError = statusCode === 401 || statusCode === 403
      console.error('[Razorpay] Order creation failed:', razorpayErr?.error?.description || razorpayErr.message)

      return NextResponse.json({
        error: isAuthError
          ? 'Payment gateway authentication failed. Please verify Razorpay API keys in production environment settings.'
          : (razorpayErr?.error?.description || razorpayErr?.message || 'Failed to create Razorpay order.'),
        code: isAuthError ? 'AUTH_FAILED' : 'PAYMENT_GATEWAY_ERROR',
      }, { status: isAuthError ? 401 : 500 })
    }
  } catch (err: any) {
    console.error('Error creating Razorpay order:', err)
    return NextResponse.json({ error: err.message || 'Failed to initialize payment.' }, { status: 500 })
  }
}
