import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseServer'
import { updatePatientJourneyState } from '@/lib/patientJourneyServer'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { patientId, membershipTier } = body

    if (!patientId || !membershipTier) {
      return NextResponse.json({ error: 'Missing patientId or membershipTier' }, { status: 400 })
    }

    // 1. Fetch latest assessment for the patient
    const { data: existingAssess, error: fetchError } = await supabaseAdmin
      .from('health_assessments')
      .select('id')
      .eq('patient_id', patientId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (fetchError) {
      return NextResponse.json({ error: fetchError.message }, { status: 500 })
    }

    if (existingAssess) {
      // 2a. Update existing row
      const { error: updateError } = await supabaseAdmin
        .from('health_assessments')
        .update({ membership_tier: membershipTier })
        .eq('id', existingAssess.id)
      if (updateError) {
        return NextResponse.json({ error: updateError.message }, { status: 500 })
      }
    } else {
      // 2b. Insert new row
      const { error: insertError } = await supabaseAdmin
        .from('health_assessments')
        .insert({
          patient_id: patientId,
          membership_tier: membershipTier
        })
      if (insertError) {
        return NextResponse.json({ error: insertError.message }, { status: 500 })
      }
    }

    await updatePatientJourneyState(patientId, {
      consultationStatus: 'COMPLETED',
      membershipStatus: 'SELECTED',
      dashboardAccess: false,
      firstConsultationCompleted: true,
      onboardingCompleted: false,
      currentJourneyStep: 'MEMBERSHIP_PAYMENT',
      lastCompletedStep: 'PLAN_SELECTED',
      metadata: { membershipTier },
    })

    return NextResponse.json({ success: true })
  } catch (err: any) {
    console.error("API Error in /api/plan:", err)
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 })
  }
}
