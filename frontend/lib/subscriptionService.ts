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
  currency: string
  description?: string | null
  features?: string[]
}

export const DEFAULT_BASE_MONTHLY_RATE = 1999.00

// Fallback seed definitions matching current commercial baseline in case database table is unreachable
export const SEED_PLANS: TreatmentPlanRecord[] = [
  {
    id: 'seed-plan-1m',
    tenant_id: '8liv',
    name: '1 Month Treatment Program',
    duration_months: 1,
    base_price: 1999.00,
    discount_percentage: 0,
    discount_amount: 0,
    final_price: 1999.00,
    currency: 'INR',
    description: '1 monthly treatment cycle with comprehensive doctor review, personalized dietary protocol, and initial lifestyle onboarding.',
    features: ['1 Treatment Cycle with doctor review', 'Free follow-up consultation included', 'Personalized nutrition & diet guidance', 'Fitness coach movement plan', 'Prescription & pharmacy coordination'],
    status: 'ACTIVE',
    display_order: 1,
    valid_from: null,
    valid_until: null,
    metadata: {},
  },
  {
    id: 'seed-plan-3m',
    tenant_id: '8liv',
    name: '3 Month Treatment Program',
    duration_months: 3,
    base_price: 5997.00,
    discount_percentage: 0,
    discount_amount: 0,
    final_price: 5997.00,
    currency: 'INR',
    description: '3 structured treatment cycles to build lasting metabolic habits with consistent doctor monitoring and follow-up reviews.',
    features: ['3 Treatment Cycles provisioned', 'Included doctor follow-ups each cycle (₹0)', 'Dedicated dietitian & nutritionist support', 'Continuous habit & weight progress tracking', 'Care team messaging & pharmacy dispatch'],
    status: 'ACTIVE',
    display_order: 2,
    valid_from: null,
    valid_until: null,
    metadata: {},
  },
  {
    id: 'seed-plan-6m',
    tenant_id: '8liv',
    name: '6 Month Treatment Program',
    duration_months: 6,
    base_price: 11994.00,
    discount_percentage: 0,
    discount_amount: 0,
    final_price: 11994.00,
    currency: 'INR',
    description: '6 monthly treatment cycles for sustained weight reduction, clinical lab monitoring, and habit lock-in.',
    features: ['6 Treatment Cycles provisioned', 'Included monthly doctor review consultations', 'Advanced metabolic coaching', 'Proactive care team coordination', 'Partner pharmacy fulfillment integration'],
    status: 'ACTIVE',
    display_order: 3,
    valid_from: null,
    valid_until: null,
    metadata: {},
  },
  {
    id: 'seed-plan-10m',
    tenant_id: '8liv',
    name: '10 Month Treatment Program',
    duration_months: 10,
    base_price: 19990.00,
    discount_percentage: 10,
    discount_amount: 1999.00,
    final_price: 17991.00,
    currency: 'INR',
    description: 'Full year metabolic reset with 10% instant bulk discount. 10 monthly treatment cycles and priority partner pharmacy fulfillment.',
    features: ['10 Treatment Cycles provisioned', '10% Instant Bulk Discount Applied', 'Included doctor follow-up review each cycle', 'Full dedicated multi-disciplinary care team', 'Priority pharmacy dispatch & delivery tracking'],
    status: 'ACTIVE',
    display_order: 4,
    valid_from: null,
    valid_until: null,
    metadata: {},
  },
]

export function computePlanPricing(basePrice: number, discountPercentage: number, durationMonths: number) {
  const base = Math.max(0, Number(basePrice) || 0)
  const discountPct = Math.min(100, Math.max(0, Number(discountPercentage) || 0))
  const duration = Math.max(1, Number(durationMonths) || 1)
  const discountAmount = Math.round((base * discountPct) / 100)
  const finalPrice = Math.max(0, base - discountAmount)
  const monthlyEquivalent = Math.round(finalPrice / duration)

  return {
    basePrice: base,
    discountPercentage: discountPct,
    discountAmount,
    finalPrice,
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
      currency: plan.currency || 'INR',
      description: plan.description,
      features: plan.features,
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
    currency: 'INR',
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

  const startDate = new Date()
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
