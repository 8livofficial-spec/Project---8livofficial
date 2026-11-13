import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseServer'
import { updatePatientJourneyState } from '@/lib/patientJourneyServer'
import { getAuthenticatedUser } from '@/lib/apiSecurity'

const INELIGIBLE_PACK_ID = '90000000-0000-4000-8000-000000000090'

export async function POST(request: Request) {
  try {
    const auth = await getAuthenticatedUser(request)
    if (!auth?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    if (auth.role !== 'patient') {
      return NextResponse.json({ error: 'Only patients can select a membership plan.' }, { status: 403 })
    }

    const body = await request.json()
    const { membershipTier, planId, durationMonths } = body
    const patientId = auth.user.id

    if (planId === INELIGIBLE_PACK_ID) {
      const { data: consultation } = await supabaseAdmin
        .from('doctor_consultations')
        .select('id, status')
        .eq('patient_id', patientId)
        .eq('status', 'rejected')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (!consultation) {
        return NextResponse.json({ error: 'This coaching pack is available after your doctor consultation when the standard program is not suitable.' }, { status: 403 })
      }
      if (String(membershipTier) !== '90-Day Guided Wellness Pack' || Number(durationMonths) !== 3) {
        return NextResponse.json({ error: 'Invalid 90-day pack selection.' }, { status: 400 })
      }
    }

    if (!membershipTier && !planId) {
      return NextResponse.json({ error: 'Missing membershipTier or planId' }, { status: 400 })
    }

    const tierName = membershipTier || `${durationMonths || 1} Month Treatment Program`

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
        .update({ membership_tier: tierName })
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
          membership_tier: tierName
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
      metadata: { membershipTier: tierName, planId, durationMonths },
    })

    return NextResponse.json({ success: true })
  } catch (err: any) {
    console.error("API Error in /api/plan:", err)
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 })
  }
}
