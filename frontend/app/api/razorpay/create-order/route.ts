import { NextResponse } from 'next/server'
import Razorpay from 'razorpay'
import { getAuthenticatedPatient } from '@/lib/appointmentAvailability'
import { APP_CONFIG } from '@/lib/appConfig'
import { checkRateLimit, getClientIp, rateLimitResponse } from '@/lib/authSecurity'
import { getAuthoritativeSubscriptionPricing } from '@/lib/subscriptionService'
import { supabaseAdmin } from '@/lib/supabaseServer'
import { getMembershipValidity } from '@/lib/membershipServer'

function getRazorpayClient() {
  const keyId = process.env.RAZORPAY_KEY_ID || process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID
  const keySecret = process.env.RAZORPAY_KEY_SECRET

  if (!keyId || !keySecret) {
    throw new Error('Razorpay credentials are not configured.')
  }

  return new Razorpay({
    key_id: keyId,
    key_secret: keySecret,
  })
}

export async function POST(request: Request) {
  try {
    const patient = await getAuthenticatedPatient(request)
    if ('error' in patient) {
      return NextResponse.json({ error: patient.error }, { status: patient.status })
    }

    const ip = getClientIp(request)
    const rate = checkRateLimit(`razorpay_order:${ip}:${patient.user.id}`, APP_CONFIG.rateLimits.booking)
    if (!rate.allowed) return rateLimitResponse(rate.retryAfter || 60, rate.message)

    const body = await request.json()
    const paymentType = body?.paymentType ? String(body.paymentType) : 'standard'
    const currency = String(body?.currency || 'INR').toUpperCase()
    const requestedReceipt = body?.receipt ? String(body.receipt).trim() : ''
    const receipt = requestedReceipt || `rcpt_${Date.now().toString().slice(-8)}_${Math.random().toString(36).slice(2, 6)}`
    const keyId = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || process.env.RAZORPAY_KEY_ID

    if (paymentType === 'consultation') {
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
    } else if (paymentType === 'membership' || paymentType === 'combined') {
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
          patientId: patient.user.id,
          paymentType,
          planId: selectedPricing?.planId || planId || '',
          durationMonths: selectedPricing?.durationMonths || rawDuration || 1,
        },
      })

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
        error: isAuthError ? 'Razorpay authentication failed.' : 'Failed to create Razorpay order.',
      }, { status: isAuthError ? 401 : 500 })
    }
  } catch (err: any) {
    console.error('Error creating Razorpay order:', err)
    return NextResponse.json({ error: err.message || 'Failed to initialize payment.' }, { status: 500 })
  }
}
