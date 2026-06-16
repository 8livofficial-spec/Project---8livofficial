import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseServer'

function generateTxnId(): string {
  return `TXN8LIV${Date.now()}${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const {
      patientId,
      paymentType,
      membershipTier,
      shippingState,
      amount,
      paymentMethod,
      metadata = {}
    } = body

    if (!patientId || !paymentType) {
      return NextResponse.json({ error: 'Missing patientId or paymentType' }, { status: 400 })
    }

    const txnId = generateTxnId()

    // ── 1. Update health_assessments ──────────────────────────────────────
    if (paymentType === 'consultation') {
      const { error } = await supabaseAdmin
        .from('health_assessments')
        .update({
          consultation_fee_paid: true
        })
        .eq('patient_id', patientId)

      if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    } else if (paymentType === 'membership') {
      const { error } = await supabaseAdmin
        .from('health_assessments')
        .update({
          membership_tier: membershipTier || 'Gold Plan',
          shipping_state: shippingState || ''
        })
        .eq('patient_id', patientId)

      if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    } else if (paymentType === 'combined') {
      // Combined: mark consultation paid + set membership tier in one go
      const { error } = await supabaseAdmin
        .from('health_assessments')
        .update({
          consultation_fee_paid: true,
          membership_tier: membershipTier || 'Silver Plan'
        })
        .eq('patient_id', patientId)

      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // ── 2. Record payment transaction ────────────────────────────────────
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
        membership_tier: membershipTier || null,
        payment_type: paymentType,
        metadata: {
          ...metadata,
          recorded_at: new Date().toISOString()
        }
      })

    // Log but don't fail the request if transaction recording fails
    if (txnError) {
      console.error('Failed to record payment transaction:', txnError.message)
    }

    // ── 3. Record dynamic notification for user ──
    const { error: notifError } = await supabaseAdmin
      .from('patient_notifications')
      .insert({
        patient_id: patientId,
        type: 'billing',
        title: 'Payment Received',
        message: `Your payment of ₹${amount || 0} via ${paymentMethod || 'UPI'} was processed successfully (Txn: ${txnId}).`,
        is_read: false
      })

    if (notifError) {
      console.error('Failed to log payment notification:', notifError.message)
    }

    // ── 4. Auto-Assign Care Team ──
    try {
      const { data: existingAssignments } = await supabaseAdmin
        .from('care_team_assignments')
        .select('*')
        .eq('patient_id', patientId)
        
      if (!existingAssignments || existingAssignments.length === 0) {
        const { data: staffProfiles } = await supabaseAdmin
          .from('profiles')
          .select('id, role')
          .in('role', ['doctor', 'trainer', 'dietitian'])
          
        if (staffProfiles && staffProfiles.length > 0) {
          const doctors = staffProfiles.filter(s => s.role === 'doctor')
          const trainers = staffProfiles.filter(s => s.role === 'trainer')
          const dietitians = staffProfiles.filter(s => s.role === 'dietitian')
          
          const randomElement = (arr: any[]) => arr.length > 0 ? arr[Math.floor(Math.random() * arr.length)] : null
          
          const doctor = randomElement(doctors)
          const trainer = randomElement(trainers)
          const dietitian = randomElement(dietitians)
          
          const assignmentsToInsert = []
          
          if (doctor) assignmentsToInsert.push({ patient_id: patientId, staff_id: doctor.id, role: 'doctor' })
          
          // Only assign Trainer & Dietitian if it's the Gold Plan (which implies fitness + diet tracking)
          const tier = membershipTier || 'Silver Plan'
          if (tier === 'Gold Plan') {
            if (trainer) assignmentsToInsert.push({ patient_id: patientId, staff_id: trainer.id, role: 'trainer' })
            if (dietitian) assignmentsToInsert.push({ patient_id: patientId, staff_id: dietitian.id, role: 'dietitian' })
          }
          
          if (assignmentsToInsert.length > 0) {
            const { error: assignErr } = await supabaseAdmin
              .from('care_team_assignments')
              .insert(assignmentsToInsert)
            if (assignErr) console.error('Auto-assign failed:', assignErr.message)
          }
        }
      }
    } catch (e) {
      console.error('Care team assignment error:', e)
    }

    return NextResponse.json({ success: true, transaction_id: txnId })

  } catch (err: any) {
    console.error('API Error in /api/payment:', err)
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 })
  }
}
