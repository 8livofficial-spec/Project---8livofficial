/**
 * Metabolic Assessment pure calculation & unit conversion utilities
 * 8Liv Platform
 *
 * Rules:
 * - Round all displayed numbers (no floating point artifacts)
 * - Pure functions only, decoupled from UI/storage
 * - Plain patient-facing language (no clinical diagnoses or scary terms)
 */

export type BiologicalGender = 'female' | 'male'

export interface AssessmentInputs {
  gender: BiologicalGender
  age: number
  heightCm: number
  weightKg: number
  waistCm: number
}

export type RiskStatus = 'on track' | 'watch' | 'review'

export interface UnitConversionResult {
  metricValue: number
  metricUnit: string
  metricLabel: string
  imperialValue: number
  imperialUnit: string
  imperialLabel: string
  dualLabel: string
}

/**
 * Shared unit conversion utility for height, weight, and waist measurements.
 * Always returns rounded, floating-point safe numbers and plain text formatted strings.
 */
export function convertUnits(
  value: number,
  type: 'height' | 'weight' | 'waist'
): UnitConversionResult {
  if (type === 'height') {
    const cm = Math.round(value)
    const totalInches = Math.round(cm * 0.393701)
    const feet = Math.floor(totalInches / 12)
    const inches = totalInches % 12
    const imperialLabel = `${feet}'${inches}"`
    return {
      metricValue: cm,
      metricUnit: 'cm',
      metricLabel: `${cm} cm`,
      imperialValue: totalInches,
      imperialUnit: 'in',
      imperialLabel,
      dualLabel: `${cm} cm · ${imperialLabel}`,
    }
  }

  if (type === 'weight') {
    const kg = Math.round(value)
    const lbs = Math.round(kg * 2.20462)
    return {
      metricValue: kg,
      metricUnit: 'kg',
      metricLabel: `${kg} kg`,
      imperialValue: lbs,
      imperialUnit: 'lbs',
      imperialLabel: `${lbs} lbs`,
      dualLabel: `${kg} kg · ${lbs} lbs`,
    }
  }

  // waist
  const cm = Math.round(value)
  const inches = Math.round(cm * 0.393701)
  return {
    metricValue: cm,
    metricUnit: 'cm',
    metricLabel: `${cm} cm`,
    imperialValue: inches,
    imperialUnit: 'in',
    imperialLabel: `${inches}"`,
    dualLabel: `${cm} cm · ${inches}"`,
  }
}

export interface BmiResult {
  score: number
  category: 'below' | 'healthy' | 'moderate' | 'elevated'
  colorHex: string
  trackColorHex: string
  cardBgClass: string
  cardBorderClass: string
  textColorClass: string
  subtextColorClass: string
  textLabel: string
  headline: string
  summary: string
}

/**
 * Computes Body Mass Index (BMI) as a pure function.
 * Outputs plain language without diagnostic labels, formatted for light/white background.
 */
export function calculateBmi(weightKg: number, heightCm: number): BmiResult {
  const heightM = heightCm / 100
  const rawBmi = weightKg / (heightM * heightM)
  // Round to 1 decimal place without floating-point artifacts
  const score = Math.round(rawBmi * 10) / 10

  if (score < 18.5) {
    return {
      score,
      category: 'below',
      colorHex: '#0284C7',
      trackColorHex: '#E0F2FE',
      cardBgClass: 'bg-sky-50/80',
      cardBorderClass: 'border-sky-200',
      textColorClass: 'text-sky-950',
      subtextColorClass: 'text-sky-800/80',
      textLabel: 'Below typical range',
      headline: 'A little below your typical range',
      summary: 'This is just one number among several we look at.',
    }
  }

  if (score < 25) {
    return {
      score,
      category: 'healthy',
      colorHex: '#059669',
      trackColorHex: '#D1FAE5',
      cardBgClass: 'bg-emerald-50/80',
      cardBorderClass: 'border-emerald-200',
      textColorClass: 'text-emerald-950',
      subtextColorClass: 'text-emerald-800/80',
      textLabel: 'Within healthy range',
      headline: 'Right in your healthy range',
      summary: 'This is just one number among several we look at.',
    }
  }

  if (score < 30) {
    return {
      score,
      category: 'moderate',
      colorHex: '#D97706',
      trackColorHex: '#FEF3C7',
      cardBgClass: 'bg-amber-50/80',
      cardBorderClass: 'border-amber-200',
      textColorClass: 'text-amber-950',
      subtextColorClass: 'text-amber-800/80',
      textLabel: 'Above typical range',
      headline: 'A bit above your healthy range',
      summary: 'This is just one number among several we look at.',
    }
  }

  return {
    score,
    category: 'elevated',
    colorHex: '#E11D48',
    trackColorHex: '#FFE4E6',
    cardBgClass: 'bg-rose-50/80',
    cardBorderClass: 'border-rose-200',
    textColorClass: 'text-rose-950',
    subtextColorClass: 'text-rose-800/80',
    textLabel: 'Higher than typical range',
    headline: 'Higher than your typical range',
    summary: 'This is just one number among several we look at.',
  }
}

export interface WaistRiskResult {
  status: RiskStatus
  ratio: number
  label: string
  statusTag: 'Watch' | 'On track' | 'Review'
  badgeBgClass: string
  badgeTextClass: string
  badgeBorderClass: string
  description: string
}

/**
 * Secondary metric: waist-based risk proxy (waist-to-height ratio & gender guidance).
 * Uses strictly 'On track' | 'Watch' | 'Review' as required.
 */
export function calculateWaistRisk(
  gender: BiologicalGender,
  waistCm: number,
  heightCm: number
): WaistRiskResult {
  const rawRatio = waistCm / heightCm
  const ratio = Math.round(rawRatio * 100) / 100

  let status: RiskStatus = 'on track'

  if (gender === 'female') {
    if (waistCm > 88 || ratio >= 0.6) {
      status = 'review'
    } else if (waistCm >= 80 || ratio >= 0.5) {
      status = 'watch'
    } else {
      status = 'on track'
    }
  } else {
    if (waistCm > 102 || ratio >= 0.6) {
      status = 'review'
    } else if (waistCm >= 94 || ratio >= 0.5) {
      status = 'watch'
    } else {
      status = 'on track'
    }
  }

  if (status === 'on track') {
    return {
      status,
      statusTag: 'On track',
      ratio,
      label: 'Waist size',
      badgeBgClass: 'bg-emerald-100',
      badgeTextClass: 'text-emerald-900',
      badgeBorderClass: 'border-emerald-200',
      description: 'In a healthy, balanced range.',
    }
  }

  if (status === 'watch') {
    return {
      status,
      statusTag: 'Watch',
      ratio,
      label: 'Waist size',
      badgeBgClass: 'bg-amber-100',
      badgeTextClass: 'text-amber-900',
      badgeBorderClass: 'border-amber-200',
      description: 'Slightly higher than ideal. Worth keeping an eye on.',
    }
  }

  return {
    status,
    statusTag: 'Review',
    ratio,
    label: 'Waist size',
    badgeBgClass: 'bg-rose-100',
    badgeTextClass: 'text-rose-900',
    badgeBorderClass: 'border-rose-200',
    description: 'Worth reviewing with a clinician.',
  }
}

/**
 * Computes reference range for a healthy weight at the given height.
 * Always rounded to whole integers.
 */
export function calculateHealthyWeightRange(heightCm: number): {
  minKg: number
  maxKg: number
  minLbs: number
  maxLbs: number
  formattedKg: string
  formattedDual: string
} {
  const heightM = heightCm / 100
  const minKg = Math.round(18.5 * heightM * heightM)
  const maxKg = Math.round(24.9 * heightM * heightM)
  const minLbs = Math.round(minKg * 2.20462)
  const maxLbs = Math.round(maxKg * 2.20462)

  return {
    minKg,
    maxKg,
    minLbs,
    maxLbs,
    formattedKg: `${minKg}–${maxKg} kg`,
    formattedDual: `${minKg}–${maxKg} kg (${minLbs}–${maxLbs} lbs)`,
  }
}

export interface AssessmentResult {
  bmi: BmiResult
  waistRisk: WaistRiskResult
  healthyWeight: ReturnType<typeof calculateHealthyWeightRange>
  heightFormatted: UnitConversionResult
  weightFormatted: UnitConversionResult
  waistFormatted: UnitConversionResult
}

/**
 * Complete assessment calculation wrapper
 */
export function computeAssessment(inputs: AssessmentInputs): AssessmentResult {
  return {
    bmi: calculateBmi(inputs.weightKg, inputs.heightCm),
    waistRisk: calculateWaistRisk(inputs.gender, inputs.waistCm, inputs.heightCm),
    healthyWeight: calculateHealthyWeightRange(inputs.heightCm),
    heightFormatted: convertUnits(inputs.heightCm, 'height'),
    weightFormatted: convertUnits(inputs.weightKg, 'weight'),
    waistFormatted: convertUnits(inputs.waistCm, 'waist'),
  }
}

/* =========================================================================
   Full Clinical Intake Types & Helpers (Screens 3–7)
   ========================================================================= */

export interface ContactData {
  first_name: string
  last_name: string
  phone_number: string
  pincode: string
  street_address: string
  city: string
  state: string
  agree_terms: boolean
}

export interface VitalsData {
  height_cm: string
  weight_kg: string
  goal_weight_kg: string
  gender: BiologicalGender
  age: string
  waist_cm: string
  blood_pressure_range: string // 'normal' | 'stage1' | 'stage2' | 'unknown'
  resting_heart_rate: string   // 'normal' | 'below60' | 'above100' | 'unknown'
}

export interface SafetyData {
  has_mtc_men2: string
  is_pregnant_nursing: string
  has_pancreatitis: string
  has_active_cancer: string
  has_severe_gi_disease: string
  hard_rejections: string[]
}

export interface HistoryData {
  comorbidities: string[]
  review_conditions: string[]
}

export interface MedicationData {
  medication_history_choice: string
}

export interface AccountData {
  email: string
  password: string
}

export interface FullAssessmentFormData extends ContactData, VitalsData, SafetyData, HistoryData, MedicationData, AccountData {
  address: string
}

export const COMMON_COMORBIDITY_OPTIONS = [
  'Hypertension',
  'Type 2 diabetes',
  'High cholesterol',
  'High triglycerides',
  'PCOS',
  'Fatty liver disease',
  'Sleep apnea',
  'Asthma',
  'None of the above',
]

export const SENSITIVE_SAFETY_QUESTIONS = [
  {
    id: 'has_mtc_men2' as const,
    title: 'Personal or family history of medullary thyroid cancer or MEN2?',
    whyWeAsk: 'Why we ask: GLP-1 medications are contraindicated in patients with a personal or family history of medullary thyroid carcinoma or Multiple Endocrine Neoplasia syndrome type 2.',
  },
  {
    id: 'is_pregnant_nursing' as const,
    title: 'Are you currently pregnant, nursing, or planning pregnancy within 6 months?',
    whyWeAsk: 'Why we ask: Weight management medications are strictly avoided during pregnancy and breastfeeding to ensure complete fetal and infant safety.',
    femaleOnly: true,
  },
  {
    id: 'has_pancreatitis' as const,
    title: 'History of pancreatitis or serious pancreatic inflammation?',
    whyWeAsk: 'Why we ask: Incretin-based therapies require clinical evaluation in individuals with past pancreatic events.',
  },
  {
    id: 'has_active_cancer' as const,
    title: 'Currently receiving active cancer treatment or in remission for under 5 years?',
    whyWeAsk: 'Why we ask: Active oncological treatment requires specialized metabolic clearance before starting any weight loss medication.',
  },
  {
    id: 'has_severe_gi_disease' as const,
    title: 'Severe gastrointestinal disease, gastroparesis, or inflammatory bowel disease?',
    whyWeAsk: 'Why we ask: Medications that alter gastric emptying need to be tailored around digestive health history.',
  },
]

export const PRIOR_MEDICATION_OPTIONS = [
  { value: 'never_used', label: 'Never used weight management medications' },
  { value: 'glp1_past', label: 'Used GLP-1 medications in the past (Semaglutide, Tirzepatide, etc.)' },
  { value: 'currently_using_glp1', label: 'Currently on a GLP-1 prescription' },
  { value: 'other_weight_med', label: 'Used other medications (Metformin, Orlistat, etc.)' },
]

/**
 * Live phone number auto-formatter for Indian mobile numbers
 * Returns cleanly spaced "+91 XXXXX XXXXX"
 */
export function formatPhoneNumberLive(value: string): string {
  // Strip all non-digits
  const digits = value.replace(/\D/g, '')

  if (!digits) return ''

  // If starts with 91 and has >10 digits
  let national = digits
  if (digits.startsWith('91') && digits.length > 2) {
    national = digits.slice(2)
  }

  // Keep max 10 national digits
  national = national.slice(0, 10)

  if (national.length <= 5) {
    return national ? `+91 ${national}` : ''
  }

  return `+91 ${national.slice(0, 5)} ${national.slice(5)}`
}

/**
 * Validates standard Indian 6-digit PIN code
 */
export function isValidPincode(pincode: string): boolean {
  return /^[1-9][0-9]{5}$/.test(pincode.trim())
}

/**
 * Password strength validator matching platform rules
 */
export function validatePasswordStrength(password: string): string | null {
  if (password.length < 8) return 'Password must be at least 8 characters.'
  if (!/[A-Z]/.test(password)) return 'Password must include at least one uppercase letter.'
  if (!/[a-z]/.test(password)) return 'Password must include at least one lowercase letter.'
  if (!/\d/.test(password)) return 'Password must include at least one number.'
  if (!/[^A-Za-z0-9]/.test(password)) return 'Password must include at least one special character.'
  return null
}
