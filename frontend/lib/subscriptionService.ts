import { supabaseAdmin } from './supabaseServer'
import { randomUUID } from 'crypto'
import { emitNotificationEvent } from './notificationDispatcher'

export interface TreatmentPlanRecord {
  id: string
  tenant_id: string
  name: string
  duration_months: number
  base_price: number
  discount_percentage: number
  discount_amount: number
  final_price: number
  currency: string
  description: string | null
  features: string[]
  status: 'ACTIVE' | 'INACTIVE' | 'ARCHIVED'
  display_order: number
  valid_from: string | null
  valid_until: string | null
  metadata: Record<string, unknown>
  created_at?: string
  updated_at?: string
}

export type SubscriptionPricing = {
  planId?: string
  durationMonths: number
  programName: string
  baseMonthlyPrice: number
  originalPrice: number
  discountPercentage: number
  discountAmount: number
  finalPrice: number
  gstRate: number
  gstAmount: number
  totalWithGst: number
  currency: string
  description?: string | null
  features?: string[]
  metadata?: Record<string, unknown>
}

export const DEFAULT_BASE_MONTHLY_RATE = 1820.00
export const STATUTORY_GST_RATE = 0.18 // 18% GST

// Authoritative 8Liv Clinical Membership Plans
export const SEED_PLANS: TreatmentPlanRecord[] = [
  {
    id: 'seed-plan-1m',
    tenant_id: '8liv',
    name: '1-Month Kickstart Trial',
    duration_months: 1,
    base_price: 1820.00,
    discount_percentage: 19.23,
    discount_amount: 350.00,
    final_price: 1470.00,
    currency: 'INR',
    description: '1-month trial plan for new users. Exactly 3 consultations included (1 with Doctor, 1 with Nutritionist, 1 with Fitness Coach).',
    features: [
      '3 Consultations Total (1 Doctor, 1 Dietitian, 1 Fitness Coach)',
      '1 Doctor Video Telehealth Consultation',
      '1 Clinical Dietitian Meal Calibration',
      '1 Fitness Coach Movement Session',
      'Official CDSCO Digital E-Prescription',
      'Customized Indian Diet Plan & Daily Logs',
    ],
    status: 'ACTIVE',
    display_order: 1,
    valid_from: null,
    valid_until: null,
    metadata: {
      is_trial: true,
      max_consultations: {
        doctor: 1,
        dietitian: 1,
        fitness_coach: 1,
      },
      total_consultations: 3,
      tag: 'New User Trial',
    },
  },
  {
    id: 'seed-plan-3m',
    tenant_id: '8liv',
    name: '3-Month Metabolic Reset',
    duration_months: 3,
    base_price: 5460.00,
    discount_percentage: 10.26,
    discount_amount: 560.00,
    final_price: 4900.00,
    currency: 'INR',
    description: '3 months of structured clinical metabolic care with recurring doctor reviews and continuous dietitian support.',
    features: [
      'Multi-Cycle Physician Follow-ups & Dosage Calibration',
      'Dedicated Clinical Dietitian Support',
      'Progressive Resistance & Muscle-Defense Routines',
      'Continuous Metabolic Telemetry Monitoring',
      'Care Team In-App Messaging Coordination',
    ],
    status: 'ACTIVE',
    display_order: 2,
    valid_from: null,
    valid_until: null,
    metadata: {
      is_trial: false,
      max_consultations: {
        doctor: 3,
        dietitian: 3,
        fitness_coach: 3,
      },
      total_consultations: 9,
      tag: 'Recommended Habit Cycle',
    },
  },
  {
    id: 'seed-plan-5m',
    tenant_id: '8liv',
    name: '5-Month Sustainable Transformation',
    duration_months: 5,
    base_price: 9100.00,
    discount_percentage: 9.62,
    discount_amount: 875.00,
    final_price: 8225.00,
    currency: 'INR',
    description: 'Complete 5-month sustained weight reduction program designed to lock in metabolic health and prevent weight regain.',
    features: [
      'Full 5-Month Physician-Supervised Protocol',
      'Comprehensive Biomarker & Lab Review Cycles',
      'Dynamic Indian Diet & Habit Lock-In Strategy',
      'Guided Gym & Home Resistance Routines',
      'Long-Term Weight Regain Defense Protocol',
    ],
    status: 'ACTIVE',
    display_order: 3,
    valid_from: null,
    valid_until: null,
    metadata: {
      is_trial: false,
      max_consultations: {
        doctor: 5,
        dietitian: 5,
        fitness_coach: 5,
      },
      total_consultations: 15,
      tag: 'Best Long-Term Value',
    },
  },
]

export function computePlanPricing(basePrice: number, discountPercentage: number, durationMonths: number) {
  const base = Math.max(0, Number(basePrice) || 0)
  const discountPct = Math.min(100, Math.max(0, Number(discountPercentage) || 0))
  const duration = Math.max(1, Number(durationMonths) || 1)
  const discountAmount = Math.round((base * discountPct) / 100)
  const finalPrice = Math.max(0, base - discountAmount)
  const gstAmount = Math.round(finalPrice * STATUTORY_GST_RATE)
  const totalWithGst = finalPrice + gstAmount
  const monthlyEquivalent = Math.round(finalPrice / duration)

  return {
    basePrice: base,
    discountPercentage: discountPct,
    discountAmount,
    finalPrice,
    gstRate: STATUTORY_GST_RATE,
    gstAmount,
    totalWithGst,
    monthlyEquivalent,
    durationMonths: duration,
  }
}

/**
 * Fetch all active treatment plans from the database.
 * Falls back to seed plans if table is not yet migrated.
 */
export async function getActiveTreatmentPlans(tenantId = '8liv'): Promise<TreatmentPlanRecord[]> {
  try {
    const now = new Date().toISOString()
    const { data, error } = await supabaseAdmin
      .from('treatment_plans')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('status', 'ACTIVE')
      .order('display_order', { ascending: true })

    if (!error && data && data.length > 0) {
      // Filter validity window if configured
      return data.filter((plan: TreatmentPlanRecord) => {
        if (plan.valid_from && new Date(plan.valid_from).toISOString() > now) return false
        if (plan.valid_until && new Date(plan.valid_until).toISOString() < now) return false
        return true
      })
    }
  } catch (err) {
    console.warn('[subscriptionService] Error fetching treatment_plans from DB:', err)
  }

  return SEED_PLANS
}

/**
 * Fetch plan by ID from database
 */
export async function getTreatmentPlanById(planId: string, tenantId = '8liv'): Promise<TreatmentPlanRecord | null> {
  try {
    const { data, error } = await supabaseAdmin
      .from('treatment_plans')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('id', planId)
      .maybeSingle()

    if (!error && data) return data
  } catch (err) {
    console.warn('[subscriptionService] Error fetching plan by ID:', err)
  }

  // Fallback to seed
  return SEED_PLANS.find(p => p.id === planId) || null
}

/**
 * Fetch plan by duration from database
 */
export async function getTreatmentPlanByDuration(durationMonths: number, tenantId = '8liv'): Promise<TreatmentPlanRecord | null> {
  try {
    const { data, error } = await supabaseAdmin
      .from('treatment_plans')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('duration_months', durationMonths)
      .eq('status', 'ACTIVE')
      .order('display_order', { ascending: true })
      .limit(1)
      .maybeSingle()

    if (!error && data) return data
  } catch (err) {
    console.warn('[subscriptionService] Error fetching plan by duration:', err)
  }

  return SEED_PLANS.find(p => p.duration_months === durationMonths) || null
}

/**
 * Authoritative Server-Side Pricing Lookup
 * Patient/frontend cannot tamper with amount; backend resolves active plan or duration from database.
 */
export async function getAuthoritativeSubscriptionPricing(planIdOrDuration: string | number, tenantId = '8liv'): Promise<SubscriptionPricing> {
  let plan: TreatmentPlanRecord | null = null

  if (typeof planIdOrDuration === 'string' && planIdOrDuration.length > 0) {
    // Try by plan ID
    plan = await getTreatmentPlanById(planIdOrDuration, tenantId)
    // If not found by ID, maybe it's a numeric string like "10"
    if (!plan && !isNaN(Number(planIdOrDuration))) {
      plan = await getTreatmentPlanByDuration(Number(planIdOrDuration), tenantId)
    }
  } else if (typeof planIdOrDuration === 'number' && planIdOrDuration > 0) {
    plan = await getTreatmentPlanByDuration(planIdOrDuration, tenantId)
  }

  if (plan) {
    const calc = computePlanPricing(plan.base_price, plan.discount_percentage, plan.duration_months)
    return {
      planId: plan.id,
      durationMonths: plan.duration_months,
      programName: plan.name,
      baseMonthlyPrice: Math.round(plan.base_price / plan.duration_months),
      originalPrice: calc.basePrice,
      discountPercentage: calc.discountPercentage,
      discountAmount: calc.discountAmount,
      finalPrice: calc.finalPrice,
      gstRate: calc.gstRate,
      gstAmount: calc.gstAmount,
      totalWithGst: calc.totalWithGst,
      currency: plan.currency || 'INR',
      description: plan.description,
      features: plan.features,
      metadata: plan.metadata,
    }
  }

  // Generic dynamic calculation if custom duration passed without explicit plan
  const duration = typeof planIdOrDuration === 'number' ? planIdOrDuration : (Number(planIdOrDuration) || 1)
  const basePrice = duration * DEFAULT_BASE_MONTHLY_RATE
  const calc = computePlanPricing(basePrice, 0, duration)

  return {
    durationMonths: duration,
    programName: `${duration} Month Treatment Program`,
    baseMonthlyPrice: DEFAULT_BASE_MONTHLY_RATE,
    originalPrice: calc.basePrice,
    discountPercentage: 0,
    discountAmount: 0,
    finalPrice: calc.finalPrice,
    gstRate: calc.gstRate,
    gstAmount: calc.gstAmount,
    totalWithGst: calc.totalWithGst,
    currency: 'INR',
  }
}

/**
 * Checks whether a patient has remaining consultation quota for a specific role (doctor, dietitian, fitness_coach).
 * Under the 1-Month Trial Plan, the quota is exactly 1 Doctor, 1 Dietitian, 1 Fitness Coach consultation (total 3).
 */
export async function checkPatientConsultationQuota(
  patientId: string,
  role: 'doctor' | 'dietitian' | 'fitness_coach' | 'trainer' | 'nutritionist'
): Promise<{
  allowed: boolean
  maxAllowed: number
  usedCount: number
  isTrial: boolean
  planName: string
  reason?: string
}> {
  try {
    // 1. Identify active subscription / treatment plan
    const { data: sub } = await supabaseAdmin
      .from('subscriptions')
      .select('*, treatment_plans(*)')
      .eq('patient_id', patientId)
      .eq('status', 'ACTIVE')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    // Fallback: check latest successful payment transaction
    const { data: txn } = await supabaseAdmin
      .from('payment_transactions')
      .select('metadata, plan_name_snapshot, created_at')
      .eq('patient_id', patientId)
      .in('payment_type', ['membership', 'combined'])
      .in('status', ['success', 'paid'])
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    const planMetadata = (sub?.treatment_plans?.metadata || txn?.metadata || {}) as Record<string, any>
    const planName = sub?.treatment_plans?.name || txn?.plan_name_snapshot || '1-Month Kickstart Trial'
    const durationMonths = sub?.treatment_plans?.duration_months || txn?.metadata?.duration_months || 1

    const isTrial = Boolean(planMetadata?.is_trial || durationMonths === 1 || /trial/i.test(planName))
    const maxConsultationsForRole = isTrial ? 1 : Math.max(1, durationMonths)

    // 2. Count existing non-cancelled bookings
    const isDoctor = role === 'doctor'
    let usedCount = 0

    if (isDoctor) {
      const { data: consults } = await supabaseAdmin
        .from('doctor_consultations')
        .select('id, status')
        .eq('patient_id', patientId)
        .in('status', ['scheduled', 'calling', 'attended', 'approved', 'completed'])

      usedCount = consults?.length || 0
    } else {
      const staffRoles = (role === 'dietitian' || role === 'nutritionist')
        ? ['dietitian', 'nutritionist']
        : ['fitness_coach', 'trainer']

      const { data: consults } = await supabaseAdmin
        .from('staff_consultations')
        .select('id, status')
        .eq('patient_id', patientId)
        .in('staff_role', staffRoles)
        .in('status', ['scheduled', 'calling', 'attended', 'completed'])

      usedCount = consults?.length || 0
    }

    if (isTrial && usedCount >= maxConsultationsForRole) {
      const roleDisplay = isDoctor ? 'Doctor' : (role === 'dietitian' || role === 'nutritionist' ? 'Clinical Dietitian' : 'Fitness Coach')
      return {
        allowed: false,
        maxAllowed: maxConsultationsForRole,
        usedCount,
        isTrial: true,
        planName,
        reason: `Your 1-Month Trial Plan includes exactly 1 ${roleDisplay} Consultation, which has already been booked. Please renew or upgrade to our 3-Month or 5-Month Care Plan to schedule additional sessions.`,
      }
    }

    return {
      allowed: true,
      maxAllowed: maxConsultationsForRole,
      usedCount,
      isTrial,
      planName,
    }
  } catch (err) {
    console.warn('[checkPatientConsultationQuota] Failed to check quota:', err)
    return {
      allowed: true,
      maxAllowed: 1,
      usedCount: 0,
      isTrial: false,
      planName: 'Care Plan',
    }
  }
}

export async function getActivePatientSubscription(patientId: string) {
  try {
    const { data: sub, error } = await supabaseAdmin
      .from('subscriptions')
      .select('*, treatment_cycles(*)')
      .eq('patient_id', patientId)
      .eq('status', 'ACTIVE')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (!error && sub) return sub

    // Fallback: check if legacy payment exists
    const { data: legacyTxn } = await supabaseAdmin
      .from('payment_transactions')
      .select('*')
      .eq('patient_id', patientId)
      .in('payment_type', ['membership', 'combined'])
      .in('status', ['success', 'paid'])
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (legacyTxn) {
      const duration = Number(legacyTxn.metadata?.durationMonths || 1)
      return {
        id: legacyTxn.id,
        patient_id: patientId,
        duration_months: duration,
        program_name: `${duration} Month Treatment Program`,
        base_monthly_price: Number(legacyTxn.amount || DEFAULT_BASE_MONTHLY_RATE),
        original_price: Number(legacyTxn.amount || DEFAULT_BASE_MONTHLY_RATE),
        discount_percentage: 0,
        discount_amount: 0,
        final_price: Number(legacyTxn.amount || DEFAULT_BASE_MONTHLY_RATE),
        start_date: legacyTxn.created_at.split('T')[0],
        end_date: new Date(new Date(legacyTxn.created_at).getTime() + duration * 30 * 86400000).toISOString().split('T')[0],
        status: 'ACTIVE',
        payment_status: 'PAID',
        payment_transaction_id: legacyTxn.transaction_id,
        treatment_cycles: [],
      }
    }

    return null
  } catch (err) {
    console.error('Error in getActivePatientSubscription:', err)
    return null
  }
}

/**
 * Idempotent subscription activation and dynamic treatment cycle provisioning.
 * Records complete commercial pricing snapshot at purchase time.
 */
export async function activateSubscriptionForPatient(params: {
  patientId: string
  durationMonths?: number
  planId?: string
  paymentTransactionId: string
  paidAmount: number
  taxAmount?: number
  metadata?: Record<string, unknown>
}) {
  // 1. Idempotency Check: Prevent duplicate subscriptions for the same payment transaction
  if (params.paymentTransactionId) {
    const { data: existingSub } = await supabaseAdmin
      .from('subscriptions')
      .select('*, treatment_cycles(*)')
      .eq('payment_transaction_id', params.paymentTransactionId)
      .maybeSingle()

    if (existingSub) {
      console.log(`[subscriptionService] Subscription already activated for transaction ${params.paymentTransactionId}. Returning existing record.`)
      return { subscription: existingSub, alreadyActivated: true }
    }
  }

  // 2. Authoritative pricing lookup (server-side from DB plan or duration)
  const lookupKey = params.planId || params.durationMonths || 1
  const pricing = await getAuthoritativeSubscriptionPricing(lookupKey)

  // 3. Prevent duplicate concurrent ACTIVE subscriptions for the same patient
  const { data: currentActiveSub } = await supabaseAdmin
    .from('subscriptions')
    .select('id, start_date, end_date, duration_months, program_name, status, created_at')
    .eq('patient_id', params.patientId)
    .eq('status', 'ACTIVE')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (currentActiveSub) {
    const timeSinceCreated = Date.now() - new Date(currentActiveSub.created_at).getTime()
    if (timeSinceCreated < 60 * 1000) {
      console.log(`[subscriptionService] Rapid duplicate subscription request detected for patient ${params.patientId}. Returning current active subscription.`)
      return { subscription: currentActiveSub, alreadyActivated: true }
    }
  }

  let startDate = new Date()
  if (currentActiveSub) {
    const existingEndTime = new Date(currentActiveSub.end_date).getTime()
    // If current subscription still has remaining time, seamlessly extend from that end date
    if (existingEndTime > Date.now()) {
      startDate = new Date(currentActiveSub.end_date)
    }
    // Archive previous active subscription so there is only ever one ACTIVE subscription
    await supabaseAdmin
      .from('subscriptions')
      .update({ status: 'UPGRADED', updated_at: new Date().toISOString() })
      .eq('id', currentActiveSub.id)
  }

  const endDate = new Date(startDate.getTime() + pricing.durationMonths * 30 * 86400000)

  // 3. Create Subscription record with complete commercial terms snapshot
  const subscriptionId = randomUUID()
  const subscriptionPayload = {
    id: subscriptionId,
    tenant_id: '8liv',
    patient_id: params.patientId,
    duration_months: pricing.durationMonths,
    program_name: pricing.programName,
    base_monthly_price: pricing.baseMonthlyPrice,
    original_price: pricing.originalPrice,
    discount_percentage: pricing.discountPercentage,
    discount_amount: pricing.discountAmount,
    final_price: pricing.finalPrice,
    start_date: startDate.toISOString().split('T')[0],
    end_date: endDate.toISOString().split('T')[0],
    status: 'ACTIVE',
    payment_status: 'PAID',
    payment_transaction_id: params.paymentTransactionId,
    // Commercial Snapshot fields:
    plan_id: pricing.planId || null,
    plan_name_snapshot: pricing.programName,
    base_price_snapshot: pricing.originalPrice,
    discount_percentage_snapshot: pricing.discountPercentage,
    discount_amount_snapshot: pricing.discountAmount,
    tax_snapshot: params.taxAmount || 0,
    final_price_snapshot: pricing.finalPrice,
    currency: pricing.currency || 'INR',
    pricing_version: 1,
    metadata: params.metadata || {},
  }

  const { data: subscription, error: subError } = await supabaseAdmin
    .from('subscriptions')
    .insert(subscriptionPayload)
    .select('*')
    .single()

  if (subError) {
    console.error('Failed to create subscription record in database:', subError.message)
  }

  // 4. Automatically provision exactly N treatment cycles dynamically based on duration_months
  const targetSubId = subscription?.id || subscriptionId
  const { count: existingCycleCount } = await supabaseAdmin
    .from('treatment_cycles')
    .select('id', { count: 'exact', head: true })
    .eq('subscription_id', targetSubId)

  if ((existingCycleCount || 0) === 0) {
    const cyclesToInsert = []
    const numberOfCycles = pricing.durationMonths

    for (let cycleNum = 1; cycleNum <= numberOfCycles; cycleNum++) {
      const cycleStart = new Date(startDate.getTime() + (cycleNum - 1) * 30 * 86400000)
      const cycleEnd = new Date(cycleStart.getTime() + 30 * 86400000)

      cyclesToInsert.push({
        tenant_id: '8liv',
        subscription_id: targetSubId,
        patient_id: params.patientId,
        cycle_number: cycleNum,
        start_date: cycleStart.toISOString().split('T')[0],
        end_date: cycleEnd.toISOString().split('T')[0],
        status: cycleNum === 1 ? 'ACTIVE' : 'PENDING',
        consultation_used: false,
        metadata: {
          provisioned_at: new Date().toISOString(),
          plan_name: pricing.programName,
        },
      })
    }

    try {
      const { error: cyclesError } = await supabaseAdmin
        .from('treatment_cycles')
        .insert(cyclesToInsert)

      if (cyclesError) {
        console.warn('Could not insert treatment cycles into treatment_cycles table:', cyclesError.message)
      }
    } catch (cycleErr) {
      console.warn('Treatment cycle provisioning warning:', cycleErr)
    }
  }

  // 5. Update patient journey state
  try {
    await supabaseAdmin
      .from('patient_journey_state')
      .upsert({
        patient_id: params.patientId,
        membership_status: 'ACTIVE',
        onboarding_completed: true,
        current_journey_step: 'DASHBOARD',
        dashboard_access: true,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'patient_id' })

    await supabaseAdmin
      .from('health_assessments')
      .update({
        onboarding_completed: true,
        membership_status: 'ACTIVE',
        current_journey_step: 'DASHBOARD',
      })
      .eq('patient_id', params.patientId)
  } catch (journeyErr) {
    console.warn('Journey state update notice:', journeyErr)
  }

  // 6. Emit domain notification event
  try {
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('email, first_name')
      .eq('id', params.patientId)
      .maybeSingle()

    if (profile?.email) {
      await emitNotificationEvent({
        eventType: 'SUBSCRIPTION_ACTIVATED',
        entityType: 'subscription',
        entityId: subscription?.id || subscriptionId,
        recipientUserId: params.patientId,
        recipientEmail: profile.email,
        subject: `Your ${pricing.programName} is Active`,
        messageContent: `Welcome to 8LIV. Your ${pricing.programName} has been activated for ${pricing.durationMonths} months. You can now access your treatment dashboard and monthly clinical cycles.`,
      })
    }
  } catch (notifErr) {
    console.warn('Subscription activation notification warning:', notifErr)
  }

  return subscription || {
    id: subscriptionId,
    patient_id: params.patientId,
    duration_months: pricing.durationMonths,
    program_name: pricing.programName,
    final_price: pricing.finalPrice,
    status: 'ACTIVE',
  }
}
