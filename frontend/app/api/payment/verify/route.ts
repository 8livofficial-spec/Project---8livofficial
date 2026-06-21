import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseServer'
import { EmailService } from '@/lib/emailService'
import { updatePatientJourneyState } from '@/lib/patientJourneyServer'
import { assignMembershipCareTeam } from '@/lib/smartAssignmentEngine'
import { assertPatientOrAssignedProvider } from '@/lib/apiSecurity'
import { APP_CONFIG } from '@/lib/appConfig'
import { checkRateLimit, getClientIp, rateLimitResponse } from '@/lib/authSecurity'
import crypto from 'crypto'

export async function POST(request: Request) {
  const ip = getClientIp(request)

  try {
    const body = await request.json()
    const {
      patientId,
      paymentType,
      membershipTier,
      shippingState,
      amount,
      paymentMethod,
      metadata = {},
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
    } = body

    if (!patientId || !paymentType || !razorpay_payment_id) {
      return NextResponse.json({ error: 'Missing required payment details' }, { status: 400 })
    }

    // 1. Rate Limiting
    const rate = checkRateLimit(`payment_verify:${ip}:${patientId}`, APP_CONFIG.rateLimits.paymentVerify)
    if (!rate.allowed) {
      return rateLimitResponse(rate.retryAfter || 60, rate.message)
    }

    // 2. Authorization
    await assertPatientOrAssignedProvider(request, patientId)

    // 3. Signature Verification / Sandbox Bypass
    const isMock = APP_CONFIG.payment.allowMock && (!razorpay_signature || razorpay_signature === 'mock_signature')
    
    if (APP_CONFIG.payment.mode === 'production' && isMock) {
      return NextResponse.json({ error: 'Mock payments are disabled in production' }, { status: 400 })
    }

    if (!isMock) {
      const secret = process.env.RAZORPAY_KEY_SECRET
      if (!secret) {
        console.error('RAZORPAY_KEY_SECRET is not configured on the server.')
        return NextResponse.json({ error: 'Payment gateway configuration error' }, { status: 500 })
      }
      
      const payload = `${razorpay_order_id}|${razorpay_payment_id}`
      const generatedSignature = crypto
        .createHmac('sha256', secret)
        .update(payload)
        .digest('hex')

      if (generatedSignature !== razorpay_signature) {
        return NextResponse.json({ error: 'Invalid payment signature. Verification failed.' }, { status: 400 })
      }
    }

    // 4. Idempotency Check (Check if payment was already successfully processed)
    const { data: existingTxn, error: lookupError } = await supabaseAdmin
      .from('payment_transactions')
      .select('*')
      .eq('transaction_id', razorpay_payment_id)
      .maybeSingle()

    if (lookupError) {
      console.error('Database lookup error during payment verification:', lookupError.message)
    }

    if (existingTxn) {
      if (existingTxn.status === 'success') {
        return NextResponse.json({
          success: true,
          transaction_id: razorpay_payment_id,
          already_processed: true,
          message: 'Payment has already been successfully verified and processed.'
        })
      } else {
        // If txn existed but was not success, we can update it or continue
        console.log(`Payment transaction ${razorpay_payment_id} exists with status: ${existingTxn.status}. Proceeding to finalize success.`)
      }
    }

    // 5. Atomic Update based on Payment Type
    if (paymentType === 'consultation') {
      const { error } = await supabaseAdmin
        .from('health_assessments')
        .update({ consultation_fee_paid: true })
        .eq('patient_id', patientId)

      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    } else if (paymentType === 'membership') {
      const { error } = await supabaseAdmin
        .from('health_assessments')
        .update({
          membership_tier: membershipTier || 'Gold Plan',
          shipping_state: shippingState || '',
        })
        .eq('patient_id', patientId)

      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    } else if (paymentType === 'combined') {
      const { error } = await supabaseAdmin
        .from('health_assessments')
        .update({
          consultation_fee_paid: true,
          membership_tier: membershipTier || 'Silver Plan',
        })
        .eq('patient_id', patientId)

      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // 6. Save or Update Transaction as SUCCESS
    const txnPayload = {
      patient_id: patientId,
      amount: amount || 0,
      currency: 'INR',
      payment_method: paymentMethod || 'upi',
      payment_provider: isMock ? 'razorpay_sim' : 'razorpay',
      transaction_id: razorpay_payment_id,
      status: 'success',
      membership_tier: membershipTier || null,
      payment_type: paymentType,
      metadata: {
        ...metadata,
        razorpay_order_id,
        razorpay_payment_id,
        razorpay_signature,
        recorded_at: new Date().toISOString(),
      },
    }

    const { error: txnError } = await supabaseAdmin
      .from('payment_transactions')
      .upsert(txnPayload, { onConflict: 'transaction_id' })

    if (txnError) {
      console.error('Failed to record verified payment transaction:', txnError.message)
      return NextResponse.json({ error: 'Failed to record transaction log' }, { status: 500 })
    }

    // 7. Add Notification
    await supabaseAdmin
      .from('patient_notifications')
      .insert({
        patient_id: patientId,
        type: 'billing',
        title: 'Payment Verified',
        message: `Your payment of INR ${amount || 0} has been verified successfully (Txn: ${razorpay_payment_id}).`,
        is_read: false,
      })

    // 8. Update Patient Journey State
    if (paymentType === 'consultation') {
      await updatePatientJourneyState(patientId, {
        assessmentStatus: 'COMPLETED',
        consultationPaymentStatus: 'PAID',
        appointmentStatus: 'NOT_BOOKED',
        consultationStatus: 'PENDING',
        membershipStatus: 'NOT_SELECTED',
        dashboardAccess: false,
        firstConsultationCompleted: false,
        onboardingCompleted: false,
        appointmentType: 'INITIAL_CONSULTATION',
        currentJourneyStep: 'INITIAL_CONSULTATION_PAYMENT',
        paymentId: razorpay_payment_id,
        lastCompletedStep: 'CONSULTATION_PAYMENT',
      })
    } else if (paymentType === 'membership' || paymentType === 'combined') {
      await updatePatientJourneyState(patientId, {
        membershipStatus: 'ACTIVE',
        dashboardAccess: true,
        firstConsultationCompleted: true,
        onboardingCompleted: true,
        currentJourneyStep: 'DASHBOARD',
        paymentId: razorpay_payment_id,
        lastCompletedStep: 'MEMBERSHIP_PAYMENT',
      })
    }

    // 9. Send Receipt & Activation Emails
    try {
      const [{ data: userData }, { data: profile }] = await Promise.all([
        supabaseAdmin.auth.admin.getUserById(patientId),
        supabaseAdmin
          .from('profiles')
          .select('first_name, last_name, display_id')
          .eq('id', patientId)
          .maybeSingle(),
      ])

      const patientEmail = userData?.user?.email
      const patientName = [profile?.first_name, profile?.last_name].filter(Boolean).join(' ')
        || profile?.display_id
        || patientEmail?.split('@')[0]
        || 'there'

      if (patientEmail) {
        await EmailService.sendPaymentReceipt({
          email: patientEmail,
          name: patientName,
          patientId,
          amount: amount || 0,
          paymentId: razorpay_payment_id,
          paymentMethod: paymentMethod || 'upi',
          paymentType,
          paymentDate: new Date().toISOString(),
        })

        if (paymentType === 'membership' || paymentType === 'combined') {
          await EmailService.sendMembershipActivated({
            email: patientEmail,
            name: patientName,
            patientId,
            planName: membershipTier || (paymentType === 'combined' ? 'Silver Plan' : 'Gold Plan'),
            amount: amount || 0,
            paymentId: razorpay_payment_id,
          })
        }
      }
    } catch (emailError) {
      console.error('Failed to send payment email notifications:', emailError)
    }

    // 10. Auto Smart Care Team Assignment for Membership
    if (paymentType === 'membership' || paymentType === 'combined') {
      try {
        await assignMembershipCareTeam(patientId, membershipTier || (paymentType === 'combined' ? 'Silver Plan' : 'Gold Plan'))
      } catch (assignmentError) {
        console.error('Smart care team assignment error in verification:', assignmentError)
        await supabaseAdmin
          .from('patient_notifications')
          .insert({
            patient_id: patientId,
            type: 'care_team',
            title: 'Care team assignment pending',
            message: 'Your membership is active. We are finalizing your care team assignment and will notify you shortly.',
            is_read: false,
          })
      }
    }

    return NextResponse.json({ success: true, transaction_id: razorpay_payment_id })
  } catch (err: any) {
    console.error('API Error in /api/payment/verify:', err)
    const status = err.message === 'Forbidden' ? 403 : (err.message === 'Unauthorized' ? 401 : 500)
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status })
  }
}
