import { supabaseAdmin } from '@/lib/supabaseServer'

export interface CommercialRules {
  consultationFee: number
  doctorPayout: number
  platformCommission: number
  dietitianPayout: number
  fitnessCoachPayout: number
  updatedAt?: string
}

const DEFAULT_COMMERCIAL_RULES: CommercialRules = {
  consultationFee: 350,
  doctorPayout: 300,
  platformCommission: 50,
  dietitianPayout: 250,
  fitnessCoachPayout: 250,
}

let cachedRules: CommercialRules | null = null
let cacheExpiresAt = 0
const CACHE_TTL_MS = 15 * 1000 // 15 seconds

export async function getCommercialRules(): Promise<CommercialRules> {
  const now = Date.now()
  if (cachedRules && now < cacheExpiresAt) {
    return cachedRules
  }

  try {
    // 1. Fetch consultation fee from treatment_plans metadata
    const { data: planData } = await supabaseAdmin
      .from('treatment_plans')
      .select('metadata, updated_at')
      .eq('duration_months', 1)
      .maybeSingle()

    // 2. Fetch provider payouts from provider_compensation_settings
    const { data: compensationData } = await supabaseAdmin
      .from('provider_compensation_settings')
      .select('provider_role, fixed_amount, active')

    const metadata = (planData?.metadata as any) || {}
    const rulesMeta = metadata.commercial_rules || metadata

    const doctorComp = compensationData?.find(c => c.provider_role === 'doctor')
    const dietitianComp = compensationData?.find(c => c.provider_role === 'dietitian')
    const fitnessComp = compensationData?.find(c => c.provider_role === 'fitness_coach')

    const consultationFee = Number(rulesMeta.consultation_fee) || DEFAULT_COMMERCIAL_RULES.consultationFee
    const doctorPayout = Number(doctorComp?.fixed_amount) || Number(rulesMeta.doctor_payout) || DEFAULT_COMMERCIAL_RULES.doctorPayout
    const dietitianPayout = Number(dietitianComp?.fixed_amount) || Number(rulesMeta.dietitian_payout) || DEFAULT_COMMERCIAL_RULES.dietitianPayout
    const fitnessCoachPayout = Number(fitnessComp?.fixed_amount) || Number(rulesMeta.fitness_coach_payout) || DEFAULT_COMMERCIAL_RULES.fitnessCoachPayout
    const platformCommission = Math.max(0, consultationFee - doctorPayout)

    cachedRules = {
      consultationFee,
      doctorPayout,
      platformCommission,
      dietitianPayout,
      fitnessCoachPayout,
      updatedAt: planData?.updated_at || new Date().toISOString(),
    }
    cacheExpiresAt = now + CACHE_TTL_MS

    return cachedRules
  } catch (err) {
    console.error('[CommercialRules] Error fetching commercial rules:', err)
    return DEFAULT_COMMERCIAL_RULES
  }
}

export async function updateCommercialRules(updates: {
  consultationFee?: number
  doctorPayout?: number
  dietitianPayout?: number
  fitnessCoachPayout?: number
}): Promise<CommercialRules> {
  const current = await getCommercialRules()

  const consultationFee = typeof updates.consultationFee === 'number' && updates.consultationFee > 0
    ? updates.consultationFee
    : current.consultationFee

  const doctorPayout = typeof updates.doctorPayout === 'number' && updates.doctorPayout >= 0
    ? updates.doctorPayout
    : current.doctorPayout

  const dietitianPayout = typeof updates.dietitianPayout === 'number' && updates.dietitianPayout >= 0
    ? updates.dietitianPayout
    : current.dietitianPayout

  const fitnessCoachPayout = typeof updates.fitnessCoachPayout === 'number' && updates.fitnessCoachPayout >= 0
    ? updates.fitnessCoachPayout
    : current.fitnessCoachPayout

  const platformCommission = Math.max(0, consultationFee - doctorPayout)

  // 1. Update treatment_plans metadata
  const { data: existingPlan } = await supabaseAdmin
    .from('treatment_plans')
    .select('metadata')
    .eq('duration_months', 1)
    .maybeSingle()

  const existingMeta = (existingPlan?.metadata as any) || {}
  const newMeta = {
    ...existingMeta,
    commercial_rules: {
      consultation_fee: consultationFee,
      doctor_payout: doctorPayout,
      dietitian_payout: dietitianPayout,
      fitness_coach_payout: fitnessCoachPayout,
      platform_commission: platformCommission,
      updated_at: new Date().toISOString(),
    },
    consultation_fee: consultationFee,
    doctor_payout: doctorPayout,
  }

  await supabaseAdmin
    .from('treatment_plans')
    .update({ metadata: newMeta, updated_at: new Date().toISOString() })
    .eq('duration_months', 1)

  // 2. Update provider_compensation_settings for doctor
  await supabaseAdmin
    .from('provider_compensation_settings')
    .update({ fixed_amount: doctorPayout, calculation_mode: 'FIXED', updated_at: new Date().toISOString() })
    .eq('provider_role', 'doctor')

  // 3. Update provider_compensation_settings for dietitian
  await supabaseAdmin
    .from('provider_compensation_settings')
    .update({ fixed_amount: dietitianPayout, calculation_mode: 'FIXED', updated_at: new Date().toISOString() })
    .eq('provider_role', 'dietitian')

  // 4. Update provider_compensation_settings for fitness_coach
  await supabaseAdmin
    .from('provider_compensation_settings')
    .update({ fixed_amount: fitnessCoachPayout, calculation_mode: 'FIXED', updated_at: new Date().toISOString() })
    .eq('provider_role', 'fitness_coach')

  // 5. Sync to membership_plans table as well
  await supabaseAdmin
    .from('membership_plans')
    .update({ consultation_fee: consultationFee, updated_at: new Date().toISOString() })
    .neq('id', '00000000-0000-0000-0000-000000000000')

  // Invalidate cache
  cachedRules = {
    consultationFee,
    doctorPayout,
    platformCommission,
    dietitianPayout,
    fitnessCoachPayout,
    updatedAt: new Date().toISOString(),
  }
  cacheExpiresAt = Date.now() + CACHE_TTL_MS

  return cachedRules
}
