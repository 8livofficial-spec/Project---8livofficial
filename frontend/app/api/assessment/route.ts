import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseServer'
import { updatePatientJourneyState } from '@/lib/patientJourneyServer'
import { getAuthenticatedUser } from '@/lib/apiSecurity'

type EligibilityStatus = 'ELIGIBLE' | 'REVIEW_REQUIRED' | 'NOT_ELIGIBLE'

type EligibilityResult = {
  status: EligibilityStatus
  reason: string | null
  message: string
  bmi: number | null
  highPriority: boolean
}

const NOT_ELIGIBLE_MESSAGE = 'Based on your responses, our medical team cannot safely recommend this program at this time.'
const REVIEW_REQUIRED_MESSAGE = 'Your responses require review by our medical team before treatment recommendations can be provided.'
const ELIGIBLE_MESSAGE = 'Congratulations! You appear to be a strong candidate for our medical weight loss program.'

const hardRejectionLabels = [
  'End-stage kidney disease',
  'Dialysis treatment',
  'End-stage liver disease',
  'Liver cirrhosis',
  'Active cancer treatment',
  'Cancer-free for less than 5 years',
  'Severe gastrointestinal disease',
  'Gastroparesis',
  'Intestinal blockage',
  'Inflammatory bowel disease',
  'Current suicidal thoughts',
  'Previous suicide attempt',
  'Current alcohol dependence',
  'Opioid dependence',
  'Substance use disorder',
  'Type 1 Diabetes',
  'Medullary thyroid cancer',
  'Multiple endocrine neoplasia syndrome type 2',
  'Personal history of thyroid cancer',
  'Family history of thyroid cancer',
  'Opiate medications used within the last 3 months',
  'Opiate street drugs used within the last 3 months',
  'Pregnant, planning pregnancy, or breastfeeding',
]

const reviewRequiredLabels = [
  'Hypertension',
  'Sleep apnea',
  'Type 2 diabetes',
  'PCOS',
  'Depression',
  'Fatty liver disease',
  'Kidney disease',
  'Coronary artery disease',
  'Previous heart attack',
  'Previous stroke',
  'Asthma',
  'Congestive heart failure',
  'Hospitalization within last year',
  'Seizure history',
  'Glaucoma',
  'Gallbladder disease',
  'Pancreatitis history',
  'HIV',
  'High cholesterol',
  'High triglycerides',
]

const normalize = (value: unknown) => String(value ?? '').trim().toLowerCase()

const includesTerm = (source: string, term: string) => source.includes(normalize(term))

const firstMatchingLabel = (source: string, labels: string[]) => (
  labels.find((label) => includesTerm(source, label))
)

const selectedList = (value: unknown): string[] => {
  if (Array.isArray(value)) {
    return value.map(String).filter(Boolean)
  }
  if (typeof value === 'string' && value.trim()) {
    return [value]
  }
  return []
}

function classifyBloodPressure(formData: Record<string, unknown>) {
  const rawBp = normalize(formData.blood_pressure_range || formData.bloodPressure || formData.bpCategory)
  if (rawBp.includes('stage 1')) return { status: 'REVIEW_REQUIRED' as const, reason: 'Stage 1 Hypertension' }
  if (rawBp.includes('stage 2')) return { status: 'REVIEW_REQUIRED' as const, reason: 'Stage 2 Hypertension' }
  if (rawBp.includes('hypertension')) return { status: 'REVIEW_REQUIRED' as const, reason: 'Hypertension' }

  const systolic = Number(formData.systolic_bp || formData.systolic || formData.bp_systolic)
  const diastolic = Number(formData.diastolic_bp || formData.diastolic || formData.bp_diastolic)
  if (Number.isFinite(systolic) && Number.isFinite(diastolic) && systolic > 0 && diastolic > 0) {
    if (systolic >= 140 || diastolic >= 90) return { status: 'REVIEW_REQUIRED' as const, reason: 'Stage 2 Hypertension' }
    if ((systolic >= 130 && systolic <= 139) || (diastolic >= 80 && diastolic <= 89)) {
      return { status: 'REVIEW_REQUIRED' as const, reason: 'Stage 1 Hypertension' }
    }
  }

  return null
}

function classifyHeartRate(formData: Record<string, unknown>) {
  const rawHr = normalize(formData.resting_heart_rate || formData.heartRate || formData.heart_rate)
  const parsedHr = Number(rawHr.match(/\d+/)?.[0])

  if (rawHr.includes('below') || (Number.isFinite(parsedHr) && parsedHr < 60)) {
    return { status: 'REVIEW_REQUIRED' as const, reason: 'Heart rate below 60 bpm' }
  }

  if (rawHr.includes('above') || (Number.isFinite(parsedHr) && parsedHr > 100)) {
    return { status: 'REVIEW_REQUIRED' as const, reason: 'Heart rate above 100 bpm' }
  }

  return null
}

function evaluateEligibility(formData: Record<string, unknown>): EligibilityResult {
  const age = Number(formData.age)
  const heightCm = Number(formData.height_cm)
  const weightKg = Number(formData.weight_kg)
  const heightM = heightCm > 0 ? heightCm / 100 : 0
  const bmi = heightM > 0 && weightKg > 0 ? Number((weightKg / (heightM * heightM)).toFixed(1)) : null

  const selectedHardRejections = selectedList(formData.hard_rejections)
  const selectedReviewConditions = [
    ...selectedList(formData.review_conditions),
    ...selectedList(formData.comorbidities).filter((condition) => condition !== 'None of the above'),
  ]

  const submittedText = normalize(JSON.stringify({
    ...formData,
    hard_rejections: selectedHardRejections,
    review_conditions: selectedReviewConditions,
  }))

  const yesFlagReasonMap: Array<[string, string]> = [
    ['has_active_cancer', 'Active cancer treatment'],
    ['has_severe_gi_disease', 'Severe gastrointestinal disease'],
    ['has_mtc_men2', 'Medullary thyroid cancer'],
    ['recent_opiate_use', 'Opiate medications used within the last 3 months'],
    ['is_pregnant_nursing', 'Pregnant, planning pregnancy, or breastfeeding'],
  ]

  const yesFlagRejection = yesFlagReasonMap.find(([field]) => normalize(formData[field]) === 'yes' || formData[field] === true)
  if (yesFlagRejection) {
    return { status: 'NOT_ELIGIBLE', reason: yesFlagRejection[1], message: NOT_ELIGIBLE_MESSAGE, bmi, highPriority: Boolean(bmi && bmi >= 30) }
  }

  const hardReason = selectedHardRejections[0] || firstMatchingLabel(submittedText, hardRejectionLabels)
  if (hardReason) {
    return { status: 'NOT_ELIGIBLE', reason: hardReason, message: NOT_ELIGIBLE_MESSAGE, bmi, highPriority: Boolean(bmi && bmi >= 30) }
  }

  if (!Number.isFinite(age) || age < 18) {
    return { status: 'NOT_ELIGIBLE', reason: 'Age under 18', message: NOT_ELIGIBLE_MESSAGE, bmi, highPriority: false }
  }

  if (bmi !== null && bmi < 25) {
    return { status: 'NOT_ELIGIBLE', reason: 'BMI below 25', message: NOT_ELIGIBLE_MESSAGE, bmi, highPriority: false }
  }

  if (bmi !== null && bmi < 27) {
    return { status: 'REVIEW_REQUIRED', reason: 'BMI 25 - 26.9', message: REVIEW_REQUIRED_MESSAGE, bmi, highPriority: false }
  }

  if (normalize(formData.has_pancreatitis) === 'yes' || formData.has_pancreatitis === true) {
    return { status: 'REVIEW_REQUIRED', reason: 'Pancreatitis history', message: REVIEW_REQUIRED_MESSAGE, bmi, highPriority: Boolean(bmi && bmi >= 30) }
  }

  const bpReview = classifyBloodPressure(formData)
  if (bpReview) {
    return { ...bpReview, message: REVIEW_REQUIRED_MESSAGE, bmi, highPriority: Boolean(bmi && bmi >= 30) }
  }

  const hrReview = classifyHeartRate(formData)
  if (hrReview) {
    return { ...hrReview, message: REVIEW_REQUIRED_MESSAGE, bmi, highPriority: Boolean(bmi && bmi >= 30) }
  }

  const reviewReason = selectedReviewConditions[0] || firstMatchingLabel(submittedText, reviewRequiredLabels)
  if (reviewReason) {
    return { status: 'REVIEW_REQUIRED', reason: reviewReason, message: REVIEW_REQUIRED_MESSAGE, bmi, highPriority: Boolean(bmi && bmi >= 30) }
  }

  return { status: 'ELIGIBLE', reason: null, message: ELIGIBLE_MESSAGE, bmi, highPriority: Boolean(bmi && bmi >= 30) }
}

async function resolveAssessmentPatientId(request: Request, submittedUserId: unknown) {
  const auth = await getAuthenticatedUser(request)
  if (auth?.user?.id) {
    return auth.user.id
  }

  const userId = String(submittedUserId || '').trim()
  if (!userId) throw new Error('Missing userId.')

  const { data, error } = await supabaseAdmin.auth.admin.getUserById(userId)
  if (error || !data.user) throw new Error('Invalid assessment account.')

  if (data.user.email_confirmed_at || data.user.confirmed_at) {
    throw new Error('Authentication is required to submit assessment for this account.')
  }

  return data.user.id
}

function getNextJourneyStep(eligibilityStatus: EligibilityStatus) {
  if (eligibilityStatus === 'NOT_ELIGIBLE') return 'NOT_ELIGIBLE'
  return 'INITIAL_CONSULTATION_PAYMENT'
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { userId, formData } = body

    if (!formData) {
      return NextResponse.json({ error: 'Missing formData' }, { status: 400 })
    }

    const patientId = await resolveAssessmentPatientId(request, userId)
    const eligibility = evaluateEligibility(formData)
    console.info('[assessment-submit]', {
      patientId,
      eligibilityStatus: eligibility.status,
      currentJourneyStep: getNextJourneyStep(eligibility.status),
      reason: 'persist completed assessment',
    })

    // 1. Create Profile (using upsert in case a DB trigger already created a basic profile row on auth signup)
    const { error: profileError } = await supabaseAdmin.from('profiles').upsert({
      id: patientId,
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

    const assessmentPayload = {
      patient_id: patientId,
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
        eligibility_status: eligibility.status,
        eligibility_reason: eligibility.reason,
        eligibility_message: eligibility.message,
        bmi: eligibility.bmi,
        high_priority_candidate: eligibility.highPriority,
        hard_rejections: formData.hard_rejections || [],
        review_conditions: formData.review_conditions || [],
        has_severe_conditions: eligibility.status === 'NOT_ELIGIBLE',
        comorbidities: formData.comorbidities,
        vitals: {
          bp: formData.blood_pressure_range || null,
          hr: formData.resting_heart_rate || null,
        },
        contraindications: {
          has_mtc_men2: formData.has_mtc_men2,
          is_pregnant_nursing: formData.is_pregnant_nursing,
          has_pancreatitis: formData.has_pancreatitis,
          has_active_cancer: formData.has_active_cancer,
          has_severe_gi_disease: formData.has_severe_gi_disease,
        },
        medication_history: {
          type: formData.medication_history_choice
        }
      },
      is_eligible: eligibility.status !== 'NOT_ELIGIBLE',
      updated_at: new Date().toISOString(),
    }

    const { data: latestAssessment, error: lookupError } = await supabaseAdmin
      .from('health_assessments')
      .select('id, medical_history')
      .eq('patient_id', patientId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (lookupError) throw lookupError

    const previousMedicalHistory = latestAssessment?.medical_history && typeof latestAssessment.medical_history === 'object'
      ? latestAssessment.medical_history as Record<string, unknown>
      : null

    const shouldUpdateDraft = Boolean(
      latestAssessment?.id
      && previousMedicalHistory
      && previousMedicalHistory.draft_form
      && !previousMedicalHistory.eligibility_status
    )

    const assessmentWrite = shouldUpdateDraft
      ? await supabaseAdmin
          .from('health_assessments')
          .update(assessmentPayload)
          .eq('id', latestAssessment!.id)
      : await supabaseAdmin
          .from('health_assessments')
          .insert(assessmentPayload)

    const assessmentError = assessmentWrite.error

    if (assessmentError) {
      return NextResponse.json({ error: assessmentError.message }, { status: 500 })
    }

    await updatePatientJourneyState(patientId, {
      assessmentStatus: 'COMPLETED',
      assessmentProgress: 5,
      eligibilityStatus: eligibility.status,
      consultationPaymentStatus: 'NOT_PAID',
      appointmentStatus: 'NOT_BOOKED',
      consultationStatus: 'PENDING',
      membershipStatus: 'NOT_SELECTED',
      dashboardAccess: false,
      currentJourneyStep: getNextJourneyStep(eligibility.status),
      lastCompletedStep: 'ASSESSMENT',
    })

    return NextResponse.json({
      success: true,
      status: eligibility.status,
      reason: eligibility.reason,
      message: eligibility.message,
      bmi: eligibility.bmi,
      highPriority: eligibility.highPriority,
    })

  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal Server Error'
    console.error("API Error in /api/assessment:", err)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
