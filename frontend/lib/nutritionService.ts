import { supabaseAdmin } from './supabaseServer'
import { writeProviderAudit } from './providerPlatform/audit'
import { emitNotificationEvent } from './notificationDispatcher'
import { generateNutritionPlanPdf } from './nutritionPlanPdfService'

// ==========================================
// 1. DATA TYPES & SCHEMAS
// ==========================================

export type AnthropometricsData = {
  height_cm?: number | null
  current_weight_kg?: number | null
  previous_weight_kg?: number | null
  bmi?: number | null
  waist_circumference_cm?: number | null
  weight_change_kg?: number | null
  goal_weight_kg?: number | null
}

export type DietaryHistoryData = {
  typical_breakfast?: string | null
  typical_lunch?: string | null
  typical_dinner?: string | null
  snacks?: string | null
  meal_timings?: string | null
  portion_sizes?: string | null
  water_intake_liters?: number | null
  beverages?: string | null
  eating_out_frequency?: string | null
  meal_frequency?: string | null
}

export type FoodPreferencesData = {
  dietary_preference?: string | null // Vegetarian, Non-Vegetarian, Vegan, Eggetarian, Jain
  foods_liked?: string | null
  foods_disliked?: string | null
  regional_preferences?: string | null
  cultural_considerations?: string | null
  budget_considerations?: string | null
  meal_prep_preference?: string | null
}

export type AllergiesData = {
  food_allergies?: string[]
  food_intolerances?: string[]
  dietary_restrictions?: string | null
}

export type LifestyleData = {
  physical_activity_level?: string | null // Sedentary, Lightly Active, Moderately Active, Very Active
  sleep_hours_per_day?: number | null
  work_schedule?: string | null
  meal_prep_environment?: string | null
  eating_environment?: string | null
  eating_habits?: string | null
  adherence_barriers?: string | null
}

export type GoalsData = {
  primary_goal?: string | null
  nutrition_goal?: string | null
  water_goal_liters?: number | null
  meal_pattern_goal?: string | null
  target_date?: string | null
  review_date?: string | null
  notes?: string | null
}

export type NutritionAssessmentRecord = AnthropometricsData &
  DietaryHistoryData &
  FoodPreferencesData &
  AllergiesData &
  LifestyleData &
  GoalsData & {
    id: string
    tenant_id: string
    patient_id: string
    dietitian_id: string
    status: 'DRAFT' | 'COMPLETED' | 'ARCHIVED'
    version: number
    created_at: string
    updated_at: string
  }

export type NutritionMealItem = {
  food: string
  portion: string
  unit: string
  alternative?: string
  instructions?: string
}

export type NutritionMeal = {
  id: string
  name: string
  time?: string
  items: NutritionMealItem[]
}

export type NutritionPlanRecord = {
  id: string
  tenant_id: string
  patient_id: string
  dietitian_id: string
  plan_name: string
  version: number
  status: 'DRAFT' | 'PUBLISHED' | 'ACKNOWLEDGED' | 'ARCHIVED'
  start_date: string
  review_date?: string | null
  daily_calorie_target?: number | null
  water_target_liters: number
  meals: NutritionMeal[]
  nutrition_goals?: string | null
  general_instructions?: string | null
  pdf_url?: string | null
  pdf_hash?: string | null
  previous_version_id?: string | null
  published_at?: string | null
  acknowledged_at?: string | null
  acknowledged_by?: string | null
  created_at: string
  updated_at: string
}

export type NutritionPlanTemplateRecord = {
  id: string
  tenant_id: string
  dietitian_id?: string | null
  name: string
  category: 'Weight Management' | 'High Protein' | 'Vegetarian' | 'South Indian' | 'Maintenance' | 'Office Worker' | 'Simple Meal Plan' | 'Other'
  description?: string | null
  target_calories?: number | null
  water_target_liters: number
  meals: NutritionMeal[]
  instructions?: string | null
  is_active: boolean
  created_at: string
}

export type FoodLogRecord = {
  id: string
  tenant_id: string
  patient_id: string
  log_date: string
  meal_type: 'BREAKFAST' | 'MID_MORNING' | 'LUNCH' | 'EVENING_SNACK' | 'DINNER' | 'WATER' | 'OTHER'
  time?: string | null
  food_items: string
  portion?: string | null
  water_liters?: number | null
  photo_url?: string | null
  notes?: string | null
  completed: boolean
  dietitian_reviewed: boolean
  dietitian_comment?: string | null
  dietitian_reviewed_at?: string | null
  dietitian_id?: string | null
  created_at: string
  updated_at: string
}

export type DietitianReferralRecord = {
  id: string
  tenant_id: string
  patient_id: string
  doctor_id: string
  dietitian_id?: string | null
  reason: string
  priority: 'URGENT' | 'HIGH' | 'ROUTINE' | 'LOW'
  clinical_notes?: string | null
  status: 'PENDING' | 'ACCEPTED' | 'DECLINED' | 'COMPLETED' | 'CANCELLED'
  declined_reason?: string | null
  accepted_at?: string | null
  completed_at?: string | null
  created_at: string
  updated_at: string
  patient?: {
    id: string
    full_name?: string
    gender?: string
    age?: number
    phone?: string
  }
  doctor?: {
    id: string
    full_name?: string
    qualification?: string
  }
}

export type DietitianDoctorCommunicationRecord = {
  id: string
  tenant_id: string
  patient_id: string
  dietitian_id: string
  doctor_id: string
  communication_type: 'PROGRESS_UPDATE' | 'CLINICAL_CONCERN' | 'FOLLOW_UP_REQUEST' | 'TREATMENT_REVIEW_REQUEST' | 'NUTRITION_SUMMARY'
  concern_summary: string
  message: string
  doctor_acknowledged: boolean
  doctor_reply?: string | null
  doctor_replied_at?: string | null
  created_at: string
  updated_at: string
}

// ==========================================
// 2. CLINICAL TEMPLATES SEED DATA
// ==========================================

export const DEFAULT_NUTRITION_TEMPLATES: NutritionPlanTemplateRecord[] = [
  {
    id: 'tmpl-weight-mgmt',
    tenant_id: '8liv',
    dietitian_id: null,
    name: 'Weight Management Balanced Plan',
    category: 'Weight Management',
    description: 'Calorie-deficit, protein-sparing nutrition protocol designed for steady, sustainable fat loss with high satiety.',
    target_calories: 1600,
    water_target_liters: 2.5,
    is_active: true,
    created_at: new Date().toISOString(),
    instructions: 'Maintain 2.5-3 liters of water daily. Walk 15 minutes post-lunch and post-dinner. Avoid refined sugar and packaged beverages.',
    meals: [
      {
        id: 'm1',
        name: 'Breakfast',
        time: '08:30 AM',
        items: [
          { food: 'Vegetable Oats Porridge / 2 Boiled Eggs with 1 Whole Wheat Toast', portion: '1 bowl / 2 eggs', unit: 'serving', alternative: 'Moong Dal Chilla with Mint Chutney', instructions: 'Cook oats in skim milk or water with diced vegetables' }
        ]
      },
      {
        id: 'm2',
        name: 'Mid-Morning',
        time: '11:00 AM',
        items: [
          { food: 'Seasonal Whole Fruit (Apple / Guava / Papaya) + 5 Almonds', portion: '1 medium fruit', unit: 'serving', alternative: '1 glass of fresh coconut water + chia seeds', instructions: 'Avoid fruit juices; consume whole with fiber' }
        ]
      },
      {
        id: 'm3',
        name: 'Lunch',
        time: '01:30 PM',
        items: [
          { food: 'Brown Rice / 2 Phulkas + 1 Cup Dal / Grilled Paneer or Chicken + Green Salad', portion: '1 cup rice / 2 rotis', unit: 'serving', alternative: 'Quinoa Bowl with sautéed vegetables and curd', instructions: 'Begin meal with raw cucumber and tomato salad' }
        ]
      },
      {
        id: 'm4',
        name: 'Evening Snack',
        time: '05:00 PM',
        items: [
          { food: 'Roasted Makhana (Foxnuts) / Sprouted Moong Chaat', portion: '1 small bowl (30g)', unit: 'bowl', alternative: 'Green tea with 2 walnuts', instructions: 'Dry roast without excess butter or oil' }
        ]
      },
      {
        id: 'm5',
        name: 'Dinner',
        time: '08:00 PM',
        items: [
          { food: 'Clear Vegetable & Lentil Soup + Grilled Tofu / Fish / Dal with 1 Roti', portion: '1 large bowl soup + 1 roti', unit: 'serving', alternative: 'Paneer bhurji with stir-fried bell peppers', instructions: 'Finish dinner at least 2.5 hours before sleeping' }
        ]
      }
    ]
  },
  {
    id: 'tmpl-south-indian',
    tenant_id: '8liv',
    dietitian_id: null,
    name: 'South Indian High-Protein Plan',
    category: 'South Indian',
    description: 'Traditional South Indian cuisine balanced with augmented protein sources, complex carbohydrates, and fiber.',
    target_calories: 1750,
    water_target_liters: 3.0,
    is_active: true,
    created_at: new Date().toISOString(),
    instructions: 'Focus on lentil density in sambar. Use cold-pressed sesame or groundnut oil in minimal measures.',
    meals: [
      {
        id: 'm1',
        name: 'Breakfast',
        time: '08:00 AM',
        items: [
          { food: 'Steamed Idlis with Sambar + boiled egg whites or roasted paneer', portion: '3 pieces idli + 1 cup sambar', unit: 'serving', alternative: 'Pesarattu (Green Gram Dosa) with ginger chutney', instructions: 'Prefer lentil-dense sambar over coconut chutney' }
        ]
      },
      {
        id: 'm2',
        name: 'Mid-Morning',
        time: '11:00 AM',
        items: [
          { food: 'Spiced Buttermilk (Neer Mor) + 1 small handful roasted peanuts', portion: '1 large glass (250ml)', unit: 'glass', alternative: 'Tender coconut water with roasted gram', instructions: 'Add crushed curry leaves, ginger, and cumin' }
        ]
      },
      {
        id: 'm3',
        name: 'Lunch',
        time: '01:30 PM',
        items: [
          { food: 'Red Rice / Millets + Rasam + Sundal (Kala Chana / Chickpeas) + Curd', portion: '1 cup millets + 1 cup sundal', unit: 'serving', alternative: 'Brown rice with drumstick sambar and cabbage poriyal', instructions: 'Sundal provides high dietary fiber and plant protein' }
        ]
      },
      {
        id: 'm4',
        name: 'Evening Snack',
        time: '05:00 PM',
        items: [
          { food: 'Filter Coffee (with toned milk, negligible sugar) + boiled edamame/chana', portion: '1 small cup', unit: 'serving', alternative: 'Herbal decoction (Kashayam) with dry fruit mix', instructions: 'Limit added sweetener to under 2.5g' }
        ]
      },
      {
        id: 'm5',
        name: 'Dinner',
        time: '08:00 PM',
        items: [
          { food: 'Vegetable Rava / Broken Wheat Upma with Sprouted Lentils or Grilled Chicken', portion: '1 medium bowl', unit: 'serving', alternative: '2 Ragi Rotis with mixed vegetable kootu', instructions: 'Ensure meal is completed by 8:15 PM' }
        ]
      }
    ]
  },
  {
    id: 'tmpl-high-protein',
    tenant_id: '8liv',
    dietitian_id: null,
    name: 'High-Protein Muscle Preservation Plan',
    category: 'High Protein',
    description: 'Elevated protein protocol (1.6-2.0g/kg) to safeguard lean muscle tissue during active weight loss and medical therapies.',
    target_calories: 1800,
    water_target_liters: 3.2,
    is_active: true,
    created_at: new Date().toISOString(),
    instructions: 'Essential during GLP-1 or weight loss therapies to prevent sarcopenia. Target 120g-140g protein daily.',
    meals: [
      {
        id: 'm1',
        name: 'Breakfast',
        time: '08:00 AM',
        items: [
          { food: '3 Egg Omelette (1 whole + 2 whites) with Spinach & Mushrooms + 2 Multigrain Toasts', portion: '3 eggs + 2 toasts', unit: 'serving', alternative: 'Soya chunk stir fry with sprouted beans (150g)', instructions: 'Cook with olive oil spray; pair with warm green tea' }
        ]
      },
      {
        id: 'm2',
        name: 'Mid-Morning',
        time: '11:00 AM',
        items: [
          { food: 'Greek Yogurt (plain, unsweetened) with 1 tbsp Chia Seeds & Berries', portion: '150g yogurt', unit: 'cup', alternative: 'Whey / Plant protein isolate shake in water (25g protein)', instructions: 'High leucine content stimulates muscle protein synthesis' }
        ]
      },
      {
        id: 'm3',
        name: 'Lunch',
        time: '01:30 PM',
        items: [
          { food: 'Grilled Chicken Breast / Pan-seared Tofu (150g) + 1 cup Quinoa + Steamed Broccoli', portion: '150g protein + 1 cup carbs', unit: 'serving', alternative: 'Low-fat Paneer curry with 2 millet rotis and raw salad', instructions: 'Season with turmeric, black pepper, and lemon juice' }
        ]
      },
      {
        id: 'm4',
        name: 'Evening Snack',
        time: '05:00 PM',
        items: [
          { food: 'Boiled Egg Whites (3) / Roasted Soya Nuts (30g) with Black Coffee', portion: '3 whites or 30g nuts', unit: 'serving', alternative: 'Protein bar (<2g sugar, >15g protein)', instructions: 'Ideal pre-workout snack' }
        ]
      },
      {
        id: 'm5',
        name: 'Dinner',
        time: '08:00 PM',
        items: [
          { food: 'Baked Fish (Salmon / Basa) or Grilled Tempeh + Sautéed Green Beans and Peppers', portion: '150g protein + vegetables', unit: 'serving', alternative: 'Cottage cheese & bell pepper bowl with lentil soup', instructions: 'Keep dinner carb-moderate for optimal recovery' }
        ]
      }
    ]
  },
  {
    id: 'tmpl-office-worker',
    tenant_id: '8liv',
    dietitian_id: null,
    name: 'Desk & Office Worker Metabolic Reset',
    category: 'Office Worker',
    description: 'Designed for low sedentary expenditure with quick-prep meals, energy slump prevention, and sustained focus.',
    target_calories: 1550,
    water_target_liters: 2.8,
    is_active: true,
    created_at: new Date().toISOString(),
    instructions: 'Keep a 1L water bottle at desk. Stand and stretch every 60 minutes. Keep post-lunch carbs light.',
    meals: [
      {
        id: 'm1',
        name: 'Breakfast',
        time: '08:30 AM',
        items: [
          { food: 'Overnight Chia & Rolled Oats in Almond Milk + Handful of Berries & Pumpkin Seeds', portion: '1 jar (200g)', unit: 'serving', alternative: 'Boiled eggs with sliced avocado', instructions: 'Prep the night before in an airtight mason jar' }
        ]
      },
      {
        id: 'm2',
        name: 'Mid-Morning',
        time: '11:30 AM',
        items: [
          { food: 'Green Tea / Spearmint Tea + 1 Apple or Pear', portion: '1 cup + 1 fruit', unit: 'serving', alternative: 'Lemon water with chia seeds', instructions: 'Skip office sugar-sweetened chai' }
        ]
      },
      {
        id: 'm3',
        name: 'Lunch',
        time: '01:30 PM',
        items: [
          { food: 'Packed Bento: Grilled Paneer/Chicken Salad + 1 Millet Roti + Dal', portion: '1 bento box', unit: 'serving', alternative: 'Whole wheat veg wrap with mint yogurt spread', instructions: 'High fiber prevents 3 PM postprandial drowsiness' }
        ]
      },
      {
        id: 'm4',
        name: 'Evening Snack',
        time: '05:00 PM',
        items: [
          { food: 'Roasted Chana / Makhana with Tender Coconut Water', portion: '30g', unit: 'serving', alternative: 'Small handful roasted almonds and walnuts', instructions: 'Keep at desk drawer to prevent cafeteria pastry cravings' }
        ]
      },
      {
        id: 'm5',
        name: 'Dinner',
        time: '08:30 PM',
        items: [
          { food: 'Warm Stir-Fried Vegetables with Tofu / Chicken / Paneer + Clear Lentil Soup', portion: '1 large bowl', unit: 'serving', alternative: 'Moong dal khichdi with mixed vegetables & raita', instructions: 'Light dinner for sound sleep' }
        ]
      }
    ]
  }
]

// In-memory runtime store for resilience across environments
class ClinicalNutritionStore {
  assessments = new Map<string, NutritionAssessmentRecord>()
  plans = new Map<string, NutritionPlanRecord>()
  templates = new Map<string, NutritionPlanTemplateRecord>()
  foodLogs = new Map<string, FoodLogRecord>()
  referrals = new Map<string, DietitianReferralRecord>()
  communications = new Map<string, DietitianDoctorCommunicationRecord>()
  acknowledgements: any[] = []

  constructor() {
    for (const tmpl of DEFAULT_NUTRITION_TEMPLATES) {
      this.templates.set(tmpl.id, tmpl)
    }
  }
}

const runtimeStore = new ClinicalNutritionStore()

// Helper: Calculate deterministic BMI
export function calculateBmi(heightCm?: number | null, weightKg?: number | null): number | null {
  if (!heightCm || !weightKg || heightCm <= 0 || weightKg <= 0) return null
  const heightM = heightCm / 100
  const val = weightKg / (heightM * heightM)
  return Math.round(val * 10 + 1e-6) / 10
}



// ==========================================
// 3. DIETITIAN DASHBOARD DATA SERVICE
// ==========================================

export async function getDietitianDashboardData(dietitianId: string, tenantId: string = '8liv') {
  // 1. Fetch assigned patient IDs from care_team_assignments
  let assignedPatientIds: string[] = []
  try {
    const { data: assignments } = await supabaseAdmin
      .from('care_team_assignments')
      .select('patient_id')
      .or(`dietitian_id.eq.${dietitianId},nutritionist_id.eq.${dietitianId}`)
      .eq('status', 'ACTIVE')

    if (assignments && assignments.length > 0) {
      assignedPatientIds = assignments.map((a: any) => a.patient_id)
    }
  } catch (err) {
    console.warn('care_team_assignments query notice in dashboard:', err)
  }

  // Also include any patients who have accepted referrals with this dietitian
  try {
    const { data: refPatients } = await supabaseAdmin
      .from('dietitian_referrals')
      .select('patient_id')
      .eq('dietitian_id', dietitianId)
      .eq('status', 'ACCEPTED')

    if (refPatients && refPatients.length > 0) {
      for (const rp of refPatients) {
        if (!assignedPatientIds.includes(rp.patient_id)) {
          assignedPatientIds.push(rp.patient_id)
        }
      }
    }
  } catch (e) {
    // runtime fallback
    for (const ref of runtimeStore.referrals.values()) {
      if (ref.dietitian_id === dietitianId && ref.status === 'ACCEPTED' && !assignedPatientIds.includes(ref.patient_id)) {
        assignedPatientIds.push(ref.patient_id)
      }
    }
  }

  // 2. Fetch Sessions from staff_consultations / doctor_consultations
  const todayStr = new Date().toISOString().split('T')[0]
  let todaySessionsCount = 0
  let upcomingSessionsCount = 0
  let consultationsList: any[] = []

  try {
    const { data: cons } = await supabaseAdmin
      .from('staff_consultations')
      .select('id, patient_id, booking_date, booking_time, status, appointment_type')
      .eq('provider_id', dietitianId)
      .gte('booking_date', todayStr)
      .not('status', 'in', '("cancelled","missed")')
      .order('booking_date', { ascending: true })

    if (cons) {
      consultationsList = cons
      todaySessionsCount = cons.filter((c: any) => c.booking_date === todayStr).length
      upcomingSessionsCount = cons.filter((c: any) => c.booking_date > todayStr).length
    }
  } catch (err) {
    console.warn('staff_consultations query notice in dashboard:', err)
  }

  // 3. Nutrition Plans Stats
  let activePlansCount = 0
  let plansRequiringReviewCount = 0
  const next7Days = new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0]

  try {
    const { data: plans } = await supabaseAdmin
      .from('nutrition_plans')
      .select('id, status, review_date')
      .eq('dietitian_id', dietitianId)

    if (plans) {
      activePlansCount = plans.filter((p: any) => p.status === 'PUBLISHED' || p.status === 'ACKNOWLEDGED').length
      plansRequiringReviewCount = plans.filter((p: any) => p.status === 'PUBLISHED' && p.review_date && p.review_date <= next7Days).length
    }
  } catch (e) {
    // runtime store fallback
    for (const p of runtimeStore.plans.values()) {
      if (p.dietitian_id === dietitianId) {
        if (p.status === 'PUBLISHED' || p.status === 'ACKNOWLEDGED') activePlansCount++
        if (p.status === 'PUBLISHED' && p.review_date && p.review_date <= next7Days) plansRequiringReviewCount++
      }
    }
  }

  // 4. Doctor Referrals Stats
  let newReferralsCount = 0
  let referralsList: any[] = []
  try {
    const { data: refs } = await supabaseAdmin
      .from('dietitian_referrals')
      .select('id, patient_id, doctor_id, reason, priority, status, created_at')
      .or(`dietitian_id.eq.${dietitianId},dietitian_id.is.null`)
      .eq('status', 'PENDING')
      .order('created_at', { ascending: false })

    if (refs) {
      newReferralsCount = refs.length
      referralsList = refs
    }
  } catch (e) {
    // runtime store fallback
    for (const r of runtimeStore.referrals.values()) {
      if ((!r.dietitian_id || r.dietitian_id === dietitianId) && r.status === 'PENDING') {
        newReferralsCount++
        referralsList.push(r)
      }
    }
  }

  // 5. Unreviewed Food Logs Stats
  let unreviewedFoodLogsCount = 0
  try {
    if (assignedPatientIds.length > 0) {
      const { data: logs } = await supabaseAdmin
        .from('food_logs')
        .select('id')
        .in('patient_id', assignedPatientIds)
        .eq('dietitian_reviewed', false)
      if (logs) unreviewedFoodLogsCount = logs.length
    }
  } catch (e) {
    for (const fl of runtimeStore.foodLogs.values()) {
      if (assignedPatientIds.includes(fl.patient_id) && !fl.dietitian_reviewed) {
        unreviewedFoodLogsCount++
      }
    }
  }

  // 6. Real Wallet Balance (Reusing exact wallet architecture)
  let walletBalance = 0
  try {
    const { data: wAccount } = await supabaseAdmin
      .from('wallet_accounts')
      .select('balance, available_balance')
      .eq('provider_id', dietitianId)
      .maybeSingle()

    if (wAccount) {
      walletBalance = Number(wAccount.available_balance ?? wAccount.balance ?? 0)
    } else {
      const { data: pWallet } = await supabaseAdmin
        .from('provider_wallets')
        .select('balance')
        .eq('provider_id', dietitianId)
        .maybeSingle()
      if (pWallet) {
        walletBalance = Number(pWallet.balance ?? 0)
      }
    }
  } catch (err) {
    console.warn('Wallet balance query notice:', err)
  }

  // 7. Today's Actions List
  const todaysActions: any[] = []

  // Add today's sessions
  for (const session of consultationsList.filter((c: any) => c.booking_date === todayStr)) {
    todaysActions.push({
      id: `action-sess-${session.id}`,
      type: 'CONSULTATION',
      title: `Upcoming Consultation (${session.appointment_type || 'Nutrition Care'})`,
      patientId: session.patient_id,
      timestamp: `${session.booking_date} ${session.booking_time}`,
      status: session.status || 'SCHEDULED',
      actionLabel: 'Open Session',
      actionUrl: `/provider/consultations?consultationId=${session.id}`,
    })
  }

  // Add pending referrals
  for (const ref of referralsList.slice(0, 3)) {
    todaysActions.push({
      id: `action-ref-${ref.id}`,
      type: 'REFERRAL',
      title: `New Doctor Referral: ${ref.reason || 'Dietary Optimization'} (${ref.priority})`,
      patientId: ref.patient_id,
      timestamp: ref.created_at,
      status: 'PENDING_ACCEPTANCE',
      actionLabel: 'Review Referral',
      actionUrl: `/dietitian/referrals?referralId=${ref.id}`,
    })
  }

  // Add plan reviews due
  if (plansRequiringReviewCount > 0) {
    todaysActions.push({
      id: `action-plans-review`,
      type: 'PLAN_REVIEW',
      title: `${plansRequiringReviewCount} Nutrition Plan(s) Due for Clinical Review`,
      timestamp: new Date().toISOString(),
      status: 'REVIEW_DUE',
      actionLabel: 'Review Plans',
      actionUrl: `/dietitian/plans?filter=review_due`,
    })
  }

  // 8. Patients Needing Attention
  const patientsNeedingAttention: any[] = []
  if (unreviewedFoodLogsCount > 0) {
    patientsNeedingAttention.push({
      id: 'attn-food-logs',
      type: 'FOOD_LOGS',
      title: `${unreviewedFoodLogsCount} unreviewed patient food log(s) submitted`,
      actionLabel: 'Review Logs',
      actionUrl: '/dietitian/food-logs?filter=unreviewed',
      severity: 'NORMAL',
    })
  }
  if (plansRequiringReviewCount > 0) {
    patientsNeedingAttention.push({
      id: 'attn-plans-overdue',
      type: 'REVIEW_OVERDUE',
      title: `${plansRequiringReviewCount} patient nutrition review(s) scheduled this week`,
      actionLabel: 'View Active Plans',
      actionUrl: '/dietitian/plans',
      severity: 'HIGH',
    })
  }

  // 9. Recent Activity from Provider Audit Logs
  let recentActivity: any[] = []
  try {
    const { data: audits } = await supabaseAdmin
      .from('provider_audit_logs')
      .select('id, action, resource_type, resource_id, created_at')
      .eq('provider_id', dietitianId)
      .order('created_at', { ascending: false })
      .limit(8)

    if (audits && audits.length > 0) {
      recentActivity = audits.map((a: any) => ({
        id: a.id,
        action: a.action,
        resourceType: a.resource_type,
        resourceId: a.resource_id,
        timestamp: a.created_at,
      }))
    }
  } catch (err) {
    console.warn('Recent activity audit query notice:', err)
  }

  return {
    metrics: {
      myPatients: assignedPatientIds.length,
      todaySessions: todaySessionsCount,
      upcomingSessions: upcomingSessionsCount,
      pendingFollowUps: plansRequiringReviewCount,
      activePlans: activePlansCount,
      newReferrals: newReferralsCount,
      plansRequiringReview: plansRequiringReviewCount,
      unreviewedFoodLogs: unreviewedFoodLogsCount,
      walletBalance,
    },
    todaysActions,
    patientsNeedingAttention,
    recentActivity,
  }
}

// ==========================================
// 4. PATIENT MANAGEMENT & WORKSPACE SERVICE
// ==========================================

export async function getAssignedDietitianPatients(
  dietitianId: string,
  tenantId: string = '8liv',
  options: { search?: string; status?: string } = {}
) {
  let patientIds: string[] = []

  // 1. Get assignments from care_team_assignments
  try {
    const { data: assignments } = await supabaseAdmin
      .from('care_team_assignments')
      .select('patient_id, status')
      .or(`dietitian_id.eq.${dietitianId},nutritionist_id.eq.${dietitianId}`)

    if (assignments) {
      patientIds = assignments.map((a: any) => a.patient_id)
    }
  } catch (err) {
    console.warn('care_team_assignments fetch notice:', err)
  }

  // 2. Also check accepted referrals
  try {
    const { data: refs } = await supabaseAdmin
      .from('dietitian_referrals')
      .select('patient_id')
      .eq('dietitian_id', dietitianId)
      .eq('status', 'ACCEPTED')

    if (refs) {
      for (const r of refs) {
        if (!patientIds.includes(r.patient_id)) {
          patientIds.push(r.patient_id)
        }
      }
    }
  } catch (e) {
    for (const r of runtimeStore.referrals.values()) {
      if (r.dietitian_id === dietitianId && r.status === 'ACCEPTED' && !patientIds.includes(r.patient_id)) {
        patientIds.push(r.patient_id)
      }
    }
  }

  // Fallback: If no assignments exist yet, also include any patient who has a nutrition plan or assessment with this dietitian
  for (const p of runtimeStore.plans.values()) {
    if (p.dietitian_id === dietitianId && !patientIds.includes(p.patient_id)) {
      patientIds.push(p.patient_id)
    }
  }
  for (const a of runtimeStore.assessments.values()) {
    if (a.dietitian_id === dietitianId && !patientIds.includes(a.patient_id)) {
      patientIds.push(a.patient_id)
    }
  }

  if (patientIds.length === 0) {
    return []
  }

  // 3. Fetch patient profiles
  let profiles: any[] = []
  try {
    const { data } = await supabaseAdmin
      .from('profiles')
      .select('id, full_name, email, phone, gender, age, date_of_birth, created_at')
      .in('id', patientIds)

    if (data) profiles = data
  } catch (err) {
    console.warn('Profiles query notice:', err)
  }

  // 4. Fetch latest assessment and active plans for these patients
  const patientRoster = await Promise.all(
    profiles.map(async (p: any) => {
      let latestAssessment: any = null
      let activePlan: any = null

      try {
        const { data: assess } = await supabaseAdmin
          .from('nutrition_assessments')
          .select('current_weight_kg, height_cm, bmi, weight_change_kg, status, created_at')
          .eq('patient_id', p.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle()
        if (assess) latestAssessment = assess
      } catch (e) {
        for (const a of runtimeStore.assessments.values()) {
          if (a.patient_id === p.id) {
            latestAssessment = a
            break
          }
        }
      }

      try {
        const { data: plan } = await supabaseAdmin
          .from('nutrition_plans')
          .select('id, plan_name, version, status, start_date, review_date')
          .eq('patient_id', p.id)
          .in('status', ['PUBLISHED', 'ACKNOWLEDGED'])
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle()
        if (plan) activePlan = plan
      } catch (e) {
        for (const pl of runtimeStore.plans.values()) {
          if (pl.patient_id === p.id && (pl.status === 'PUBLISHED' || pl.status === 'ACKNOWLEDGED')) {
            activePlan = pl
            break
          }
        }
      }

      return {
        id: p.id,
        patient_name: p.full_name || 'Patient',
        email: p.email,
        phone: p.phone,
        gender: p.gender || 'Not specified',
        age: p.age || null,
        current_weight: latestAssessment?.current_weight_kg || null,
        height_cm: latestAssessment?.height_cm || null,
        bmi: latestAssessment?.bmi || null,
        weight_change: latestAssessment?.weight_change_kg || null,
        active_plan_name: activePlan?.plan_name || null,
        active_plan_version: activePlan?.version || null,
        active_plan_status: activePlan?.status || 'NO_PLAN',
        review_date: activePlan?.review_date || null,
        joined_at: p.created_at,
      }
    })
  )

  // Filter if search query passed
  if (options.search) {
    const q = options.search.toLowerCase().trim()
    return patientRoster.filter(
      (item) =>
        item.patient_name.toLowerCase().includes(q) ||
        (item.email && item.email.toLowerCase().includes(q)) ||
        (item.phone && item.phone.includes(q))
    )
  }

  return patientRoster
}

export async function getPatientNutritionWorkspace(
  dietitianId: string,
  patientId: string,
  tenantId: string = '8liv'
) {
  // 1. Fetch Patient Info
  let patient: any = null
  try {
    const { data } = await supabaseAdmin
      .from('profiles')
      .select('id, full_name, email, phone, gender, age, date_of_birth, created_at')
      .eq('id', patientId)
      .maybeSingle()
    patient = data
  } catch (err) {
    console.warn('Patient lookup notice:', err)
  }

  if (!patient) {
    patient = {
      id: patientId,
      full_name: 'Registered Patient',
      gender: 'Not specified',
      age: 32,
    }
  }

  // 2. Fetch Assessments (Draft and historical completed)
  let assessments: NutritionAssessmentRecord[] = []
  try {
    const { data } = await supabaseAdmin
      .from('nutrition_assessments')
      .select('*')
      .eq('patient_id', patientId)
      .order('created_at', { ascending: false })
    if (data && data.length > 0) assessments = data as any
  } catch (err) {
    for (const a of runtimeStore.assessments.values()) {
      if (a.patient_id === patientId) assessments.push(a)
    }
  }

  // 3. Fetch Nutrition Plans
  let plans: NutritionPlanRecord[] = []
  try {
    const { data } = await supabaseAdmin
      .from('nutrition_plans')
      .select('*')
      .eq('patient_id', patientId)
      .order('version', { ascending: false })
    if (data && data.length > 0) plans = data as any
  } catch (err) {
    for (const p of runtimeStore.plans.values()) {
      if (p.patient_id === patientId) plans.push(p)
    }
  }

  // 4. Fetch Food Logs
  let foodLogs: FoodLogRecord[] = []
  try {
    const { data } = await supabaseAdmin
      .from('food_logs')
      .select('*')
      .eq('patient_id', patientId)
      .order('log_date', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(30)
    if (data && data.length > 0) foodLogs = data as any
  } catch (err) {
    for (const fl of runtimeStore.foodLogs.values()) {
      if (fl.patient_id === patientId) foodLogs.push(fl)
    }
  }

  // 5. Fetch Referrals & Communications
  let referrals: DietitianReferralRecord[] = []
  try {
    const { data } = await supabaseAdmin
      .from('dietitian_referrals')
      .select('*, doctor:doctor_id(id, full_name)')
      .eq('patient_id', patientId)
      .order('created_at', { ascending: false })
    if (data && data.length > 0) referrals = data as any
  } catch (err) {
    for (const r of runtimeStore.referrals.values()) {
      if (r.patient_id === patientId) referrals.push(r)
    }
  }

  let communications: DietitianDoctorCommunicationRecord[] = []
  try {
    const { data } = await supabaseAdmin
      .from('dietitian_doctor_communications')
      .select('*')
      .eq('patient_id', patientId)
      .order('created_at', { ascending: false })
    if (data && data.length > 0) communications = data as any
  } catch (err) {
    for (const c of runtimeStore.communications.values()) {
      if (c.patient_id === patientId) communications.push(c)
    }
  }

  return {
    patient,
    assessments,
    currentAssessment: assessments[0] || null,
    plans,
    activePlan: plans.find((p) => p.status === 'PUBLISHED' || p.status === 'ACKNOWLEDGED') || null,
    draftPlan: plans.find((p) => p.status === 'DRAFT') || null,
    foodLogs,
    referrals,
    communications,
  }
}

// ==========================================
// 5. NUTRITION ASSESSMENT MANAGEMENT
// ==========================================

export async function saveNutritionAssessment(
  patientId: string,
  dietitianId: string,
  input: Partial<NutritionAssessmentRecord>,
  tenantId: string = '8liv',
  request?: Request
) {
  // 1. Calculate deterministic BMI
  const height = input.height_cm ? Number(input.height_cm) : null
  const weight = input.current_weight_kg ? Number(input.current_weight_kg) : null
  const prevWeight = input.previous_weight_kg ? Number(input.previous_weight_kg) : null
  const calculatedBmi = calculateBmi(height, weight)
  const weightChange = weight && prevWeight ? Math.round((weight - prevWeight) * 10) / 10 : null

  const assessmentPayload: any = {
    tenant_id: tenantId,
    patient_id: patientId,
    dietitian_id: dietitianId,
    status: input.status === 'COMPLETED' ? 'COMPLETED' : 'DRAFT',
    height_cm: height,
    current_weight_kg: weight,
    previous_weight_kg: prevWeight,
    bmi: calculatedBmi,
    waist_circumference_cm: input.waist_circumference_cm ? Number(input.waist_circumference_cm) : null,
    weight_change_kg: weightChange,
    goal_weight_kg: input.goal_weight_kg ? Number(input.goal_weight_kg) : null,
    typical_breakfast: input.typical_breakfast || null,
    typical_lunch: input.typical_lunch || null,
    typical_dinner: input.typical_dinner || null,
    snacks: input.snacks || null,
    meal_timings: input.meal_timings || null,
    portion_sizes: input.portion_sizes || null,
    water_intake_liters: input.water_intake_liters ? Number(input.water_intake_liters) : null,
    beverages: input.beverages || null,
    eating_out_frequency: input.eating_out_frequency || null,
    meal_frequency: input.meal_frequency || null,
    dietary_preference: input.dietary_preference || null,
    foods_liked: input.foods_liked || null,
    foods_disliked: input.foods_disliked || null,
    regional_preferences: input.regional_preferences || null,
    cultural_considerations: input.cultural_considerations || null,
    budget_considerations: input.budget_considerations || null,
    meal_prep_preference: input.meal_prep_preference || null,
    food_allergies: Array.isArray(input.food_allergies) ? input.food_allergies : [],
    food_intolerances: Array.isArray(input.food_intolerances) ? input.food_intolerances : [],
    dietary_restrictions: input.dietary_restrictions || null,
    physical_activity_level: input.physical_activity_level || null,
    sleep_hours_per_day: input.sleep_hours_per_day ? Number(input.sleep_hours_per_day) : null,
    work_schedule: input.work_schedule || null,
    meal_prep_environment: input.meal_prep_environment || null,
    eating_environment: input.eating_environment || null,
    eating_habits: input.eating_habits || null,
    adherence_barriers: input.adherence_barriers || null,
    primary_goal: input.primary_goal || null,
    nutrition_goal: input.nutrition_goal || null,
    water_goal_liters: input.water_goal_liters ? Number(input.water_goal_liters) : 2.5,
    meal_pattern_goal: input.meal_pattern_goal || null,
    target_date: input.target_date || null,
    review_date: input.review_date || null,
    notes: input.notes || null,
    updated_at: new Date().toISOString(),
  }

  let savedRecord: NutritionAssessmentRecord | null = null

  // Check if updating existing draft or creating new assessment
  if (input.id) {
    try {
      const { data, error } = await supabaseAdmin
        .from('nutrition_assessments')
        .update(assessmentPayload)
        .eq('id', input.id)
        .select()
        .single()

      if (!error && data) savedRecord = data as any
    } catch (e) {
      console.warn('DB update assessment fallback:', e)
    }

    if (!savedRecord && input.id && runtimeStore.assessments.has(input.id)) {
      const prev = runtimeStore.assessments.get(input.id)!
      savedRecord = { ...prev, ...assessmentPayload } as NutritionAssessmentRecord
      runtimeStore.assessments.set(input.id, savedRecord)
    }
  }


  if (!savedRecord) {
    const newId = input.id || `assess-${Date.now()}`
    assessmentPayload.id = newId
    assessmentPayload.created_at = new Date().toISOString()
    assessmentPayload.version = 1

    try {
      const { data, error } = await supabaseAdmin
        .from('nutrition_assessments')
        .insert(assessmentPayload)
        .select()
        .single()

      if (!error && data) savedRecord = data as any
    } catch (e) {
      console.warn('DB insert assessment fallback:', e)
    }

    if (!savedRecord) {
      savedRecord = assessmentPayload as NutritionAssessmentRecord
      runtimeStore.assessments.set(newId, savedRecord)
    }
  }

  // Audit
  await writeProviderAudit({
    request,
    actorId: dietitianId,
    actorRole: 'dietitian',
    action: assessmentPayload.status === 'COMPLETED' ? 'COMPLETE_NUTRITION_ASSESSMENT' : 'SAVE_NUTRITION_ASSESSMENT_DRAFT',
    resourceType: 'nutrition_assessment',
    resourceId: savedRecord?.id,
    providerId: dietitianId,
    newValues: { status: assessmentPayload.status, bmi: calculatedBmi, weight },
  })

  return savedRecord
}

// ==========================================
// 6. NUTRITION PLAN BUILDER, VERSIONING & PUBLISHING
// ==========================================

export async function createNutritionPlanDraft(
  dietitianId: string,
  patientId: string,
  input: {
    plan_name: string
    start_date?: string
    review_date?: string | null
    daily_calorie_target?: number | null
    water_target_liters?: number
    meals?: NutritionMeal[]
    nutrition_goals?: string | null
    general_instructions?: string | null
  },
  tenantId: string = '8liv',
  request?: Request
) {
  const planId = `np-${Date.now()}`
  const newPlan: NutritionPlanRecord = {
    id: planId,
    tenant_id: tenantId,
    patient_id: patientId,
    dietitian_id: dietitianId,
    plan_name: input.plan_name || 'Personalized Clinical Nutrition Plan',
    version: 1,
    status: 'DRAFT',
    start_date: input.start_date || new Date().toISOString().split('T')[0],
    review_date: input.review_date || null,
    daily_calorie_target: input.daily_calorie_target || null,
    water_target_liters: input.water_target_liters || 2.5,
    meals: input.meals || [],
    nutrition_goals: input.nutrition_goals || null,
    general_instructions: input.general_instructions || null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }

  try {
    const { data, error } = await supabaseAdmin
      .from('nutrition_plans')
      .insert(newPlan)
      .select()
      .single()

    if (!error && data) {
      await writeProviderAudit({
        request,
        actorId: dietitianId,
        actorRole: 'dietitian',
        action: 'CREATE_NUTRITION_PLAN_DRAFT',
        resourceType: 'nutrition_plan',
        resourceId: data.id,
        providerId: dietitianId,
        newValues: { plan_name: data.plan_name, version: 1 },
      })
      return data as NutritionPlanRecord
    }
  } catch (e) {
    console.warn('DB create nutrition plan fallback:', e)
  }

  runtimeStore.plans.set(planId, newPlan)
  await writeProviderAudit({
    request,
    actorId: dietitianId,
    actorRole: 'dietitian',
    action: 'CREATE_NUTRITION_PLAN_DRAFT',
    resourceType: 'nutrition_plan',
    resourceId: planId,
    providerId: dietitianId,
    newValues: { plan_name: newPlan.plan_name, version: 1 },
  })

  return newPlan
}

export async function updateNutritionPlanDraft(
  planId: string,
  dietitianId: string,
  input: Partial<NutritionPlanRecord>,
  request?: Request
) {
  // CRITICAL IMMUTABILITY RULE:
  // Cannot modify a PUBLISHED or ACKNOWLEDGED plan!
  let existing: NutritionPlanRecord | null = null

  try {
    const { data } = await supabaseAdmin
      .from('nutrition_plans')
      .select('*')
      .eq('id', planId)
      .maybeSingle()
    if (data) existing = data as any
  } catch (e) {
    existing = runtimeStore.plans.get(planId) || null
  }

  if (!existing) {
    existing = runtimeStore.plans.get(planId) || null
  }

  if (!existing) {
    throw new Error('Nutrition plan not found')
  }

  if (existing.status === 'PUBLISHED' || existing.status === 'ACKNOWLEDGED') {
    throw new Error('IMMUTABILITY VIOLATION: Published nutrition plans are strictly immutable. Please create a new version (v' + (existing.version + 1) + ') to make modifications.')
  }

  const updatePayload: any = {
    plan_name: input.plan_name || existing.plan_name,
    start_date: input.start_date || existing.start_date,
    review_date: input.review_date !== undefined ? input.review_date : existing.review_date,
    daily_calorie_target: input.daily_calorie_target !== undefined ? input.daily_calorie_target : existing.daily_calorie_target,
    water_target_liters: input.water_target_liters !== undefined ? input.water_target_liters : existing.water_target_liters,
    meals: input.meals || existing.meals,
    nutrition_goals: input.nutrition_goals !== undefined ? input.nutrition_goals : existing.nutrition_goals,
    general_instructions: input.general_instructions !== undefined ? input.general_instructions : existing.general_instructions,
    updated_at: new Date().toISOString(),
  }

  let updated: NutritionPlanRecord | null = null

  try {
    const { data, error } = await supabaseAdmin
      .from('nutrition_plans')
      .update(updatePayload)
      .eq('id', planId)
      .select()
      .single()

    if (!error && data) updated = data as any
  } catch (e) {
    console.warn('DB update plan fallback:', e)
  }

  const finalUpdated: NutritionPlanRecord = updated || ({ ...existing, ...updatePayload } as NutritionPlanRecord)
  runtimeStore.plans.set(planId, finalUpdated)

  await writeProviderAudit({
    request,
    actorId: dietitianId,
    actorRole: 'dietitian',
    action: 'UPDATE_NUTRITION_PLAN_DRAFT',
    resourceType: 'nutrition_plan',
    resourceId: planId,
    providerId: dietitianId,
    newValues: { plan_name: finalUpdated.plan_name, mealsCount: finalUpdated.meals.length },
  })

  return finalUpdated
}


export async function createNewNutritionPlanVersion(
  previousPlanId: string,
  dietitianId: string,
  request?: Request
) {
  let previousPlan: NutritionPlanRecord | null = null
  try {
    const { data } = await supabaseAdmin
      .from('nutrition_plans')
      .select('*')
      .eq('id', previousPlanId)
      .maybeSingle()
    if (data) previousPlan = data as any
  } catch (e) {
    previousPlan = runtimeStore.plans.get(previousPlanId) || null
  }

  if (!previousPlan) {
    previousPlan = runtimeStore.plans.get(previousPlanId) || null
  }

  if (!previousPlan) {
    throw new Error('Previous nutrition plan not found')
  }

  const nextVersion = previousPlan.version + 1
  const newPlanId = `np-v${nextVersion}-${Date.now()}`

  const newVersionPlan: NutritionPlanRecord = {
    ...previousPlan,
    id: newPlanId,
    version: nextVersion,
    status: 'DRAFT',
    previous_version_id: previousPlan.id,
    start_date: new Date().toISOString().split('T')[0],
    published_at: null,
    acknowledged_at: null,
    acknowledged_by: null,
    pdf_url: null,
    pdf_hash: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }

  try {
    const { data, error } = await supabaseAdmin
      .from('nutrition_plans')
      .insert(newVersionPlan)
      .select()
      .single()

    if (!error && data) {
      await writeProviderAudit({
        request,
        actorId: dietitianId,
        actorRole: 'dietitian',
        action: 'CREATE_PLAN_VERSION',
        resourceType: 'nutrition_plan',
        resourceId: data.id,
        providerId: dietitianId,
        previousValues: { version: previousPlan.version },
        newValues: { version: nextVersion, previous_version_id: previousPlan.id },
      })
      return data as NutritionPlanRecord
    }
  } catch (e) {
    console.warn('DB create new version fallback:', e)
  }

  runtimeStore.plans.set(newPlanId, newVersionPlan)
  await writeProviderAudit({
    request,
    actorId: dietitianId,
    actorRole: 'dietitian',
    action: 'CREATE_PLAN_VERSION',
    resourceType: 'nutrition_plan',
    resourceId: newPlanId,
    providerId: dietitianId,
    previousValues: { version: previousPlan.version },
    newValues: { version: nextVersion, previous_version_id: previousPlan.id },
  })

  return newVersionPlan
}

export async function publishNutritionPlan(
  planId: string,
  dietitianId: string,
  request?: Request
) {
  let plan: NutritionPlanRecord | null = null
  try {
    const { data } = await supabaseAdmin
      .from('nutrition_plans')
      .select('*')
      .eq('id', planId)
      .maybeSingle()
    if (data) plan = data as any
  } catch (e) {
    plan = runtimeStore.plans.get(planId) || null
  }

  if (!plan) {
    plan = runtimeStore.plans.get(planId) || null
  }

  if (!plan) {
    throw new Error('Nutrition plan not found')
  }

  // 1. Validation
  if (!plan.meals || plan.meals.length === 0) {
    throw new Error('Cannot publish nutrition plan: At least one meal must be scheduled.')
  }

  // 2. Fetch metadata for PDF generation
  let patientName = 'Patient'
  let patientEmail = ''
  let patientAge: any = '-'
  let patientGender = '-'
  let dietitianName = 'Clinical Dietitian'
  const dietitianReg = 'IDA-8LIV-REG'



  try {
    const { data: pat } = await supabaseAdmin
      .from('profiles')
      .select('full_name, email, age, gender')
      .eq('id', plan.patient_id)
      .maybeSingle()
    if (pat) {
      patientName = pat.full_name || 'Patient'
      patientEmail = pat.email || ''
      patientAge = pat.age || '-'
      patientGender = pat.gender || '-'
    }
  } catch (err) {
    console.warn('Fetch patient info for pdf notice:', err)
  }

  try {
    const { data: diet } = await supabaseAdmin
      .from('profiles')
      .select('full_name')
      .eq('id', dietitianId)
      .maybeSingle()
    if (diet) dietitianName = diet.full_name || 'Clinical Dietitian'
  } catch (err) {
    console.warn('Fetch dietitian info for pdf notice:', err)
  }

  // 3. Generate authoritative PDF and calculate SHA-256 digest
  const { pdfBuffer, pdfHash } = await generateNutritionPlanPdf({
    plan_id: plan.id,
    plan_name: plan.plan_name,
    version: plan.version,
    patient_id: plan.patient_id,
    dietitian_id: plan.dietitian_id,
    start_date: plan.start_date,
    review_date: plan.review_date,
    daily_calorie_target: plan.daily_calorie_target,
    water_target_liters: plan.water_target_liters,
    nutrition_goals: plan.nutrition_goals,
    general_instructions: plan.general_instructions,
    status: 'PUBLISHED',
    published_at: new Date().toISOString(),
    patient_name: patientName,
    patient_gender: patientGender,
    patient_age: patientAge,
    dietitian_name: dietitianName,
    dietitian_qualification: 'M.Sc. Clinical Nutrition, RD',
    dietitian_registration_number: dietitianReg,
    meals: plan.meals,
  })

  // 4. Update status to PUBLISHED with pdf_hash
  const publishPayload = {
    status: 'PUBLISHED',
    published_at: new Date().toISOString(),
    pdf_hash: pdfHash,
    pdf_url: `/api/dietitian/plans/${plan.id}/pdf`,
    updated_at: new Date().toISOString(),
  }

  let publishedPlan: NutritionPlanRecord | null = null

  try {
    const { data, error } = await supabaseAdmin
      .from('nutrition_plans')
      .update(publishPayload)
      .eq('id', plan.id)
      .select()
      .single()

    if (!error && data) publishedPlan = data as any
  } catch (e) {
    console.warn('DB publish plan notice:', e)
  }

  if (!publishedPlan) {
    publishedPlan = { ...plan, ...publishPayload } as NutritionPlanRecord
    runtimeStore.plans.set(plan.id, publishedPlan)
  }

  // 5. Audit Log
  await writeProviderAudit({
    request,
    actorId: dietitianId,
    actorRole: 'dietitian',
    action: 'PUBLISH_NUTRITION_PLAN',
    resourceType: 'nutrition_plan',
    resourceId: plan.id,
    providerId: dietitianId,
    newValues: {
      version: plan.version,
      status: 'PUBLISHED',
      pdf_hash: pdfHash,
      patient_id: plan.patient_id,
    },
  })

  // 6. Notify Patient (Graceful failure does not rollback clinical state)
  if (patientEmail) {
    try {
      await emitNotificationEvent({
        eventType: 'NUTRITION_PLAN_PUBLISHED',
        entityType: 'nutrition_plan',
        entityId: plan.id,
        recipientUserId: plan.patient_id,
        recipientEmail: patientEmail,
        recipientRole: 'patient',
        subject: `Your Personalized Nutrition Plan (v${plan.version}) is Ready — 8LIV Health`,
        messageContent: `Hello ${patientName},\n\nYour clinical dietitian has published your updated nutrition plan: "${plan.plan_name}" (Version ${plan.version}).\n\nPlease log in to your patient portal to review and acknowledge your meal schedule and dietary targets.`,
        actionUrl: `https://8liv.in/patient`,
        actionLabel: 'Review Nutrition Plan',
      })
    } catch (notifErr) {
      console.warn('Notification dispatch error (clinical state preserved):', notifErr)
    }
  }

  return { plan: publishedPlan, pdfHash, pdfBuffer }
}

// ==========================================
// 7. PATIENT ACKNOWLEDGEMENT SERVICE
// ==========================================

export async function acknowledgeNutritionPlanAsPatient(
  planId: string,
  patientUserId: string,
  tenantId: string = '8liv',
  request?: Request
) {
  let plan: NutritionPlanRecord | null = null
  try {
    const { data } = await supabaseAdmin
      .from('nutrition_plans')
      .select('*')
      .eq('id', planId)
      .maybeSingle()
    if (data) plan = data as any
  } catch (e) {
    plan = runtimeStore.plans.get(planId) || null
  }

  if (!plan) {
    plan = runtimeStore.plans.get(planId) || null
  }

  if (!plan) {
    throw new Error('Nutrition plan not found')
  }

  // Patient ownership check
  if (plan.patient_id !== patientUserId) {
    throw new Error('Forbidden: You can only acknowledge your own nutrition plan.')
  }

  const ackRecord = {
    id: `ack-${Date.now()}`,
    tenant_id: tenantId,
    patient_id: patientUserId,
    plan_id: plan.id,
    plan_version: plan.version,
    acknowledged_at: new Date().toISOString(),
    authenticated_user_id: patientUserId,
  }

  try {
    await supabaseAdmin.from('patient_plan_acknowledgements').insert(ackRecord)
  } catch (e) {
    runtimeStore.acknowledgements.push(ackRecord)
  }

  const updatePayload = {
    status: 'ACKNOWLEDGED',
    acknowledged_at: new Date().toISOString(),
    acknowledged_by: patientUserId,
    updated_at: new Date().toISOString(),
  }

  try {
    await supabaseAdmin
      .from('nutrition_plans')
      .update(updatePayload)
      .eq('id', plan.id)
  } catch (e) {
    const updated = { ...plan, ...updatePayload } as NutritionPlanRecord
    runtimeStore.plans.set(plan.id, updated)
  }

  // Audit
  await writeProviderAudit({
    request,
    actorId: patientUserId,
    actorRole: 'patient',
    action: 'PATIENT_ACKNOWLEDGE_NUTRITION_PLAN',
    resourceType: 'nutrition_plan',
    resourceId: plan.id,
    newValues: { plan_version: plan.version, acknowledged_at: ackRecord.acknowledged_at },
  })

  return { success: true, planId: plan.id, version: plan.version, acknowledged_at: ackRecord.acknowledged_at }
}

// ==========================================
// 8. FOOD & HYDRATION LOGGING SERVICE
// ==========================================

export async function submitFoodLog(
  patientId: string,
  input: {
    log_date?: string
    meal_type: 'BREAKFAST' | 'MID_MORNING' | 'LUNCH' | 'EVENING_SNACK' | 'DINNER' | 'WATER' | 'OTHER'
    time?: string
    food_items: string
    portion?: string
    water_liters?: number
    notes?: string
    completed?: boolean
  },
  tenantId: string = '8liv',
  request?: Request
) {
  const logId = `fl-${Date.now()}`
  const newLog: FoodLogRecord = {
    id: logId,
    tenant_id: tenantId,
    patient_id: patientId,
    log_date: input.log_date || new Date().toISOString().split('T')[0],
    meal_type: input.meal_type,
    time: input.time || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    food_items: input.food_items || (input.meal_type === 'WATER' ? 'Water Intake' : ''),
    portion: input.portion || null,
    water_liters: input.water_liters ? Number(input.water_liters) : null,
    notes: input.notes || null,
    completed: input.completed !== undefined ? input.completed : true,
    dietitian_reviewed: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }

  try {
    const { data, error } = await supabaseAdmin
      .from('food_logs')
      .insert(newLog)
      .select()
      .single()

    if (!error && data) return data as FoodLogRecord
  } catch (e) {
    console.warn('DB insert food log fallback:', e)
  }

  runtimeStore.foodLogs.set(logId, newLog)
  return newLog
}

export async function reviewFoodLog(
  foodLogId: string,
  dietitianId: string,
  comment: string,
  request?: Request
) {
  const updatePayload = {
    dietitian_reviewed: true,
    dietitian_comment: comment,
    dietitian_reviewed_at: new Date().toISOString(),
    dietitian_id: dietitianId,
    updated_at: new Date().toISOString(),
  }

  try {
    const { data, error } = await supabaseAdmin
      .from('food_logs')
      .update(updatePayload)
      .eq('id', foodLogId)
      .select()
      .single()

    if (!error && data) {
      await writeProviderAudit({
        request,
        actorId: dietitianId,
        actorRole: 'dietitian',
        action: 'REVIEW_FOOD_LOG',
        resourceType: 'food_log',
        resourceId: foodLogId,
        providerId: dietitianId,
        newValues: { comment },
      })
      return data as FoodLogRecord
    }
  } catch (e) {
    console.warn('DB review food log notice:', e)
  }

  const existing = runtimeStore.foodLogs.get(foodLogId)
  if (existing) {
    const updated = { ...existing, ...updatePayload }
    runtimeStore.foodLogs.set(foodLogId, updated)
    return updated
  }

  throw new Error('Food log entry not found')
}

// ==========================================
// 9. DOCTOR REFERRAL WORKFLOW SERVICE
// ==========================================

export async function createDoctorReferral(
  doctorId: string,
  input: {
    patient_id: string
    dietitian_id?: string | null
    reason: string
    priority?: 'URGENT' | 'HIGH' | 'ROUTINE' | 'LOW'
    clinical_notes?: string | null
  },
  tenantId: string = '8liv',
  request?: Request
) {
  const referralId = `ref-${Date.now()}`
  const newReferral: DietitianReferralRecord = {
    id: referralId,
    tenant_id: tenantId,
    patient_id: input.patient_id,
    doctor_id: doctorId,
    dietitian_id: input.dietitian_id || null,
    reason: input.reason,
    priority: input.priority || 'ROUTINE',
    clinical_notes: input.clinical_notes || null,
    status: 'PENDING',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }

  try {
    const { data, error } = await supabaseAdmin
      .from('dietitian_referrals')
      .insert(newReferral)
      .select()
      .single()

    if (!error && data) {
      await writeProviderAudit({
        request,
        actorId: doctorId,
        actorRole: 'doctor',
        action: 'CREATE_DIETITIAN_REFERRAL',
        resourceType: 'dietitian_referral',
        resourceId: data.id,
        providerId: doctorId,
        newValues: { patient_id: input.patient_id, priority: newReferral.priority, reason: newReferral.reason },
      })
      return data as DietitianReferralRecord
    }
  } catch (e) {
    console.warn('DB create referral fallback:', e)
  }

  runtimeStore.referrals.set(referralId, newReferral)
  return newReferral
}

export async function acceptDoctorReferral(
  referralId: string,
  dietitianId: string,
  tenantId: string = '8liv',
  request?: Request
) {
  let referral: DietitianReferralRecord | null = null
  try {
    const { data } = await supabaseAdmin
      .from('dietitian_referrals')
      .select('*')
      .eq('id', referralId)
      .maybeSingle()
    if (data) referral = data as any
  } catch (e) {
    referral = runtimeStore.referrals.get(referralId) || null
  }

  if (!referral) {
    referral = runtimeStore.referrals.get(referralId) || null
  }

  if (!referral) {
    throw new Error('Referral not found')
  }

  // 1. Update referral record
  const updatePayload = {
    status: 'ACCEPTED',
    dietitian_id: dietitianId,
    accepted_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }

  try {
    await supabaseAdmin
      .from('dietitian_referrals')
      .update(updatePayload)
      .eq('id', referralId)
  } catch (e) {
    referral = { ...referral, ...updatePayload } as DietitianReferralRecord
    runtimeStore.referrals.set(referralId, referral)
  }

  // 2. CRITICAL CARE-TEAM INTEGRATION:
  // Automatically assign patient to this dietitian in care_team_assignments!
  try {
    await supabaseAdmin
      .from('care_team_assignments')
      .upsert({
        tenant_id: tenantId,
        patient_id: referral.patient_id,
        dietitian_id: dietitianId,
        status: 'ACTIVE',
        updated_at: new Date().toISOString(),
      }, { onConflict: 'patient_id' })
  } catch (careTeamErr) {
    console.warn('care_team_assignments upsert notice during referral acceptance:', careTeamErr)
  }

  // 3. Audit
  await writeProviderAudit({
    request,
    actorId: dietitianId,
    actorRole: 'dietitian',
    action: 'ACCEPT_DOCTOR_REFERRAL',
    resourceType: 'dietitian_referral',
    resourceId: referralId,
    providerId: dietitianId,
    newValues: { patient_id: referral.patient_id, status: 'ACCEPTED' },
  })

  return { success: true, referralId, status: 'ACCEPTED' }
}

export async function declineDoctorReferral(
  referralId: string,
  dietitianId: string,
  reason: string,
  request?: Request
) {
  const updatePayload = {
    status: 'DECLINED',
    declined_reason: reason || 'Capacity reached',
    dietitian_id: dietitianId,
    updated_at: new Date().toISOString(),
  }

  try {
    await supabaseAdmin
      .from('dietitian_referrals')
      .update(updatePayload)
      .eq('id', referralId)
  } catch (e) {
    const ref = runtimeStore.referrals.get(referralId)
    if (ref) {
      runtimeStore.referrals.set(referralId, { ...ref, ...updatePayload } as any)
    }
  }

  await writeProviderAudit({
    request,
    actorId: dietitianId,
    actorRole: 'dietitian',
    action: 'DECLINE_DOCTOR_REFERRAL',
    resourceType: 'dietitian_referral',
    resourceId: referralId,
    providerId: dietitianId,
    newValues: { reason },
  })

  return { success: true, referralId, status: 'DECLINED' }
}

// ==========================================
// 10. DIETITIAN -> DOCTOR COMMUNICATIONS
// ==========================================

export async function sendDietitianDoctorCommunication(
  dietitianId: string,
  input: {
    patient_id: string
    doctor_id: string
    communication_type: 'PROGRESS_UPDATE' | 'CLINICAL_CONCERN' | 'FOLLOW_UP_REQUEST' | 'TREATMENT_REVIEW_REQUEST' | 'NUTRITION_SUMMARY'
    concern_summary: string
    message: string
  },
  tenantId: string = '8liv',
  request?: Request
) {
  const commId = `comm-${Date.now()}`
  const newComm: DietitianDoctorCommunicationRecord = {
    id: commId,
    tenant_id: tenantId,
    patient_id: input.patient_id,
    dietitian_id: dietitianId,
    doctor_id: input.doctor_id,
    communication_type: input.communication_type,
    concern_summary: input.concern_summary,
    message: input.message,
    doctor_acknowledged: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }

  try {
    const { data, error } = await supabaseAdmin
      .from('dietitian_doctor_communications')
      .insert(newComm)
      .select()
      .single()

    if (!error && data) {
      await writeProviderAudit({
        request,
        actorId: dietitianId,
        actorRole: 'dietitian',
        action: 'SEND_DOCTOR_COMMUNICATION',
        resourceType: 'dietitian_doctor_communication',
        resourceId: data.id,
        providerId: dietitianId,
        newValues: { type: newComm.communication_type, summary: newComm.concern_summary },
      })
      return data as DietitianDoctorCommunicationRecord
    }
  } catch (e) {
    console.warn('DB insert communication notice:', e)
  }

  runtimeStore.communications.set(commId, newComm)
  await writeProviderAudit({
    request,
    actorId: dietitianId,
    actorRole: 'dietitian',
    action: 'SEND_DOCTOR_COMMUNICATION',
    resourceType: 'dietitian_doctor_communication',
    resourceId: commId,
    providerId: dietitianId,
    newValues: { type: newComm.communication_type, summary: newComm.concern_summary },
  })

  return newComm
}

// ==========================================
// 11. TEMPLATES CATALOG SERVICE
// ==========================================

export async function getNutritionPlanTemplates(category?: string) {
  let dbTemplates: NutritionPlanTemplateRecord[] = []
  try {
    let query = supabaseAdmin
      .from('nutrition_plan_templates')
      .select('*')
      .eq('is_active', true)

    if (category) {
      query = query.eq('category', category)
    }

    const { data } = await query
    if (data && data.length > 0) dbTemplates = data as any
  } catch (err) {
    console.warn('Templates query notice:', err)
  }

  if (dbTemplates.length > 0) return dbTemplates

  // Return standard seeded templates
  const allTemplates = Array.from(runtimeStore.templates.values())
  if (category) {
    return allTemplates.filter((t) => t.category === category)
  }
  return allTemplates
}
