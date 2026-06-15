import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseServer'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { patientId, paymentType, membershipTier, shippingState } = body

    if (!patientId || !paymentType) {
      return NextResponse.json({ error: 'Missing patientId or paymentType' }, { status: 400 })
    }

    if (paymentType === 'consultation') {
      const { error } = await supabaseAdmin
        .from('health_assessments')
        .update({
          consultation_fee_paid: true,
          updated_at: new Date().toISOString()
        })
        .eq('patient_id', patientId)

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 })
      }
    } else if (paymentType === 'membership') {
      const { error } = await supabaseAdmin
        .from('health_assessments')
        .update({
          membership_tier: membershipTier || 'Gold Plan',
          shipping_state: shippingState || '',
          updated_at: new Date().toISOString()
        })
        .eq('patient_id', patientId)

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 })
      }
    }

    return NextResponse.json({ success: true })

  } catch (err: any) {
    console.error("API Error in /api/payment:", err)
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 })
  }
}
