import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseServer'
import { EmailService } from '@/lib/emailService'
import { updatePatientJourneyState } from '@/lib/patientJourneyServer'
import { assignMembershipCareTeam } from '@/lib/smartAssignmentEngine'
import { assertPatientOrAssignedProvider } from '@/lib/apiSecurity'
import { APP_CONFIG } from '@/lib/appConfig'
import { activateSubscriptionForPatient } from '@/lib/subscriptionService'

function generateTxnId(): string {
  return `TXN8LIV${Date.now()}${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`
}

export async function POST(request: Request) {
  try {
    if (!APP_CONFIG.payment.allowMock || APP_CONFIG.payment.mode === 'production') {
      return NextResponse.json({ error: 'Mock payments are disabled. Please use signature verification.' }, { status: 400 })
    }

    const body = await request.json()
    const {
      patientId,
      paymentType,
      membershipTier,
      shippingState,
      amount,
      paymentMethod,
      metadata = {},
    } = body

    if (!patientId || !paymentType) {
      return NextResponse.json({ error: 'Missing patientId or paymentType' }, { status: 400 })
    }

    await assertPatientOrAssignedProvider(request, patientId)

    const txnId = generateTxnId()

    const rawDuration = Number(body?.durationMonths || (metadata as any)?.durationMonths || (membershipTier ? parseInt(String(membershipTier)) : 1) || 1)
    const durationMonths = [1, 3, 6, 10].includes(rawDuration) ? rawDuration : 1
    const programName = `${durationMonths} Month Treatment Program`

    if (paymentType === 'consultation') {
      const { error } = await supabaseAdmin
        .from('health_assessments')
        .update({ consultation_fee_paid: true })
        .eq('patient_id', patientId)

      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    } else if (paymentType === 'membership' || paymentType === 'combined') {
      const { error } = await supabaseAdmin
        .from('health_assessments')
        .update({
          consultation_fee_paid: paymentType === 'combined' ? true : undefined,
          membership_tier: programName,
          shipping_state: shippingState || '',
          onboarding_completed: true,
          current_journey_step: 'DASHBOARD',
        })
        .eq('patient_id', patientId)

      if (error) return NextResponse.json({ error: error.message }, { status: 500 })

      await activateSubscriptionForPatient({
        patientId,
        durationMonths,
        paymentTransactionId: txnId,
        paidAmount: amount || 0,
        metadata,
      })
    }

    const { error: txnError } = await supabaseAdmin
      .from('payment_transactions')
      .insert({
        patient_id: patientId,
        amount: amount || 0,
        currency: 'INR',
        payment_method: paymentMethod || 'unknown',
        payment_provider: 'razorpay_sim',
        transaction_id: txnId,
        status: 'success',
        membership_tier: programName,
        payment_type: paymentType,
        metadata: {
          ...metadata,
          recorded_at: new Date().toISOString(),
        },
      })

    if (txnError) {
      console.error('Failed to record payment transaction:', txnError.message)
    }

    const { error: notifError } = await supabaseAdmin
      .from('patient_notifications')
      .insert({
        patient_id: patientId,
        type: 'billing',
        title: 'Payment Received',
        message: `Your payment of INR ${amount || 0} via ${paymentMethod || 'UPI'} was processed successfully (Txn: ${txnId}).`,
        is_read: false,
      })

    if (notifError) {
      console.error('Failed to log payment notification:', notifError.message)
    }

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
        paymentId: txnId,
        lastCompletedStep: 'CONSULTATION_PAYMENT',
      })
    } else if (paymentType === 'membership' || paymentType === 'combined') {
      await updatePatientJourneyState(patientId, {
        membershipStatus: 'ACTIVE',
        dashboardAccess: true,
        firstConsultationCompleted: true,
        onboardingCompleted: true,
        currentJourneyStep: 'DASHBOARD',
        paymentId: txnId,
        lastCompletedStep: 'MEMBERSHIP_PAYMENT',
      })
    }

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
          paymentId: txnId,
          paymentMethod: paymentMethod || 'unknown',
          paymentType,
          paymentDate: new Date().toISOString(),
        })

        if (paymentType === 'membership' || paymentType === 'combined') {
          await EmailService.sendMembershipActivated({
            email: patientEmail,
            name: patientName,
            patientId,
            planName: programName,
            amount: amount || 0,
            paymentId: txnId,
          })
        }
      }
    } catch (emailError) {
      console.error('Failed to send payment email:', emailError)
    }

    if (paymentType === 'membership' || paymentType === 'combined') {
      try {
        await assignMembershipCareTeam(patientId, programName)
      } catch (assignmentError) {
        console.error('Smart care team assignment error:', assignmentError)
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

    return NextResponse.json({ success: true, transaction_id: txnId })
  } catch (err: any) {
    console.error('API Error in /api/payment:', err)
    const status = err.message === 'Forbidden' ? 403 : (err.message === 'Unauthorized' ? 401 : 500)
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status })
  }
}
