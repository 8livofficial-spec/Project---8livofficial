import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseServer'
import { updatePatientJourneyState } from '@/lib/patientJourneyServer'

type AssessmentDraft = Record<string, unknown>

const stepNames: Record<number, string> = {
  1: 'CONTACT_INFO_COMPLETED',
  2: 'VITALS_COMPLETED',
  3: 'SAFETY_SCREEN_COMPLETED',
  4: 'HEALTH_HISTORY_COMPLETED',
  5: 'MEDICATION_HISTORY_COMPLETED',
}

function requireString(value: unknown, label: string) {
  if (!String(value || '').trim()) throw new Error(`${label} is required.`)
}

function validateStep(step: number, data: AssessmentDraft) {
  if (!stepNames[step]) throw new Error('Unsupported assessment step.')

  if (step === 1) {
    requireString(data.first_name, 'First name')
    requireString(data.last_name, 'Last name')
    requireString(data.age, 'Age')
    requireString(data.phone_number, 'Phone number')
    if (data.agree_terms !== true) throw new Error('Terms and privacy consent is required.')
  }

  if (step === 2) {
    requireString(data.height_cm, 'Height')
    requireString(data.weight_kg, 'Current weight')
    requireString(data.goal_weight_kg, 'Goal weight')
    requireString(data.blood_pressure_range, 'Blood pressure')
    requireString(data.resting_heart_rate, 'Resting heart rate')
  }

  if (step === 3) {
    requireString(data.has_mtc_men2, 'MTC/MEN2 answer')
    requireString(data.has_pancreatitis, 'Pancreatitis answer')
    requireString(data.has_severe_gi_disease, 'GI disease answer')
    requireString(data.has_active_cancer, 'Cancer answer')
    if (data.gender === 'female') requireString(data.is_pregnant_nursing, 'Pregnancy answer')
  }
}

async function saveAssessmentDraft(patientId: string, step: number, data: AssessmentDraft) {
  const now = new Date().toISOString()

  if (step === 1) {
    const { error: profileError } = await supabaseAdmin.from('profiles').upsert({
      id: patientId,
      role: 'patient',
      display_id: `${data.first_name || ''} ${data.last_name || ''}`.trim(),
      first_name: String(data.first_name || ''),
      last_name: String(data.last_name || ''),
      phone_number: String(data.phone_number || ''),
    })
    if (profileError) throw profileError
  }

  const { data: latestAssessment, error: lookupError } = await supabaseAdmin
    .from('health_assessments')
    .select('*')
    .eq('patient_id', patientId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (lookupError) throw lookupError

  const previousMedicalHistory = latestAssessment?.medical_history && typeof latestAssessment.medical_history === 'object'
    ? latestAssessment.medical_history as Record<string, unknown>
    : {}

  const draftPayload: Record<string, unknown> = {
    patient_id: patientId,
    updated_at: now,
    medical_history: {
      ...previousMedicalHistory,
      draft_step: step,
      draft_form: {
        ...(previousMedicalHistory.draft_form && typeof previousMedicalHistory.draft_form === 'object' ? previousMedicalHistory.draft_form as Record<string, unknown> : {}),
        ...data,
      },
    },
  }

  if (step >= 1) {
    Object.assign(draftPayload, {
      first_name: data.first_name || undefined,
      last_name: data.last_name || undefined,
      age: data.age ? Number(data.age) : undefined,
      phone_number: data.phone_number || undefined,
      address: data.address || undefined,
      agree_terms: data.agree_terms,
    })
  }

  if (step >= 2) {
    Object.assign(draftPayload, {
      height_cm: data.height_cm ? Number(data.height_cm) : undefined,
      weight_kg: data.weight_kg ? Number(data.weight_kg) : undefined,
      goal_weight_kg: data.goal_weight_kg ? Number(data.goal_weight_kg) : undefined,
    })
  }

  const cleanPayload = Object.fromEntries(Object.entries(draftPayload).filter(([, value]) => value !== undefined))

  if (latestAssessment?.id) {
    const { error } = await supabaseAdmin
      .from('health_assessments')
      .update(cleanPayload)
      .eq('id', latestAssessment.id)
    if (error) throw error
    return {
      assessmentId: latestAssessment.id,
      rollback: async () => {
        const { id, ...previous } = latestAssessment
        await supabaseAdmin.from('health_assessments').update(previous).eq('id', id)
      },
    }
  }

  const { data: inserted, error } = await supabaseAdmin
    .from('health_assessments')
    .insert(cleanPayload)
    .select('id')
    .single()
  if (error) throw error
  return {
    assessmentId: inserted.id,
    rollback: async () => {
      await supabaseAdmin.from('health_assessments').delete().eq('id', inserted.id)
    },
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json()
    const patientId = String(body.patientId || '')
    const step = Number(body.step)
    const formData = body.formData || {}

    if (!patientId) return NextResponse.json({ error: 'Missing patientId.' }, { status: 400 })
    validateStep(step, formData)

    const savedDraft = await saveAssessmentDraft(patientId, step, formData)
    const nextStep = Math.min(step + 1, 6)

    try {
      await updatePatientJourneyState(patientId, {
        assessmentStatus: 'IN_PROGRESS',
        assessmentProgress: nextStep,
        eligibilityStatus: 'IN_PROGRESS',
        lastCompletedStep: stepNames[step],
        metadata: { assessmentId: savedDraft.assessmentId, confirmedStep: step },
      })
    } catch (journeyError) {
      await savedDraft.rollback()
      throw journeyError
    }

    return NextResponse.json({ success: true, nextStep, assessmentId: savedDraft.assessmentId })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to save assessment progress.'
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
