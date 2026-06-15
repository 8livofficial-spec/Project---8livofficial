import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseServer'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { userId, formData } = body

    if (!userId || !formData) {
      return NextResponse.json({ error: 'Missing userId or formData' }, { status: 400 })
    }

    // 1. Create Profile (using upsert in case a DB trigger already created a basic profile row on auth signup)
    const { error: profileError } = await supabaseAdmin.from('profiles').upsert({
      id: userId,
      role: 'patient',
      display_id: `${formData.first_name} ${formData.last_name}`,
      first_name: formData.first_name,
      last_name: formData.last_name,
      phone_number: formData.phone_number
    })

    if (profileError) {
      console.warn("Profile upsert warning:", profileError.message)
      // We don't fail the whole request if just the profile fails, 
      // but ideally we should log this in an error tracking system.
    }

    // 2. Create Health Assessment
    const { error: assessmentError } = await supabaseAdmin.from('health_assessments').insert({
      patient_id: userId,
      first_name: formData.first_name,
      last_name: formData.last_name,
      age: parseInt(formData.age) || null,
      phone_number: formData.phone_number,
      address: formData.address,
      agree_terms: formData.agree_terms,
      height_cm: parseFloat(formData.height_cm) || null,
      weight_kg: parseFloat(formData.weight_kg) || null,
      goal_weight_kg: parseFloat(formData.goal_weight_kg) || null,
      medical_history: {
        gender: formData.gender,
        has_severe_conditions: formData.has_active_cancer === 'yes' || formData.has_severe_gi_disease === 'yes' || formData.has_pancreatitis === 'yes' || formData.has_mtc_men2 === 'yes',
        comorbidities: formData.comorbidities,
        medication_history: {
          type: formData.medication_history_choice
        }
      },
      is_eligible: true
    })

    if (assessmentError) {
      return NextResponse.json({ error: assessmentError.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })

  } catch (err: any) {
    console.error("API Error in /api/assessment:", err)
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 })
  }
}
