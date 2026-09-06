-- ====================================================================
-- 8LIV HEALTH — CLINICAL NUTRITION & DIETITIAN MANAGEMENT MODULE
-- ====================================================================
-- Production-grade, multi-tenant database migration for:
-- 1. Nutrition Assessments (Anthropometrics, Dietary History, Lifestyle, Goals)
-- 2. Nutrition Plans & Versioning (Immutable published plans, Structured meals)
-- 3. Nutrition Plan Templates (Clinically curated template library)
-- 4. Patient Food & Hydration Logs (Meal logging, Portion tracking, Dietitian reviews)
-- 5. Doctor -> Dietitian Referrals (Routine & Urgent referral lifecycle)
-- 6. Dietitian -> Doctor Communications (Clinical concerns, Treatment reviews)
-- 7. Patient Plan Acknowledgements (Audit records of patient review)
-- ====================================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 1. NUTRITION ASSESSMENTS TABLE
CREATE TABLE IF NOT EXISTS public.nutrition_assessments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT NOT NULL DEFAULT '8liv',
  patient_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  dietitian_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT', 'COMPLETED', 'ARCHIVED')),
  version INTEGER NOT NULL DEFAULT 1,
  
  -- Anthropometrics
  height_cm NUMERIC(5,2) CHECK (height_cm IS NULL OR height_cm BETWEEN 30 AND 300),
  current_weight_kg NUMERIC(5,2) CHECK (current_weight_kg IS NULL OR current_weight_kg BETWEEN 20 AND 500),
  previous_weight_kg NUMERIC(5,2) CHECK (previous_weight_kg IS NULL OR previous_weight_kg BETWEEN 20 AND 500),
  bmi NUMERIC(4,1),
  waist_circumference_cm NUMERIC(5,2),
  weight_change_kg NUMERIC(5,2),
  goal_weight_kg NUMERIC(5,2) CHECK (goal_weight_kg IS NULL OR goal_weight_kg BETWEEN 20 AND 500),
  
  -- Dietary History
  typical_breakfast TEXT,
  typical_lunch TEXT,
  typical_dinner TEXT,
  snacks TEXT,
  meal_timings TEXT,
  portion_sizes TEXT,
  water_intake_liters NUMERIC(4,2),
  beverages TEXT,
  eating_out_frequency TEXT,
  meal_frequency TEXT,
  
  -- Food Preferences
  dietary_preference TEXT, -- e.g. Vegetarian, Non-Vegetarian, Vegan, Eggetarian, Jain
  foods_liked TEXT,
  foods_disliked TEXT,
  regional_preferences TEXT,
  cultural_considerations TEXT,
  budget_considerations TEXT,
  meal_prep_preference TEXT,
  
  -- Allergies & Dietary Intolerances (Clearly separated from medical drug allergies)
  food_allergies TEXT[] DEFAULT ARRAY[]::TEXT[],
  food_intolerances TEXT[] DEFAULT ARRAY[]::TEXT[],
  dietary_restrictions TEXT,
  
  -- Lifestyle & Adherence
  physical_activity_level TEXT, -- Sedentary, Lightly Active, Moderately Active, Very Active
  sleep_hours_per_day NUMERIC(3,1),
  work_schedule TEXT,
  meal_prep_environment TEXT,
  eating_environment TEXT,
  eating_habits TEXT,
  adherence_barriers TEXT,
  
  -- Goals & Targets
  primary_goal TEXT,
  nutrition_goal TEXT,
  water_goal_liters NUMERIC(4,2),
  meal_pattern_goal TEXT,
  target_date DATE,
  review_date DATE,
  
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. NUTRITION PLANS TABLE (Immutable versioned clinical plans)
CREATE TABLE IF NOT EXISTS public.nutrition_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT NOT NULL DEFAULT '8liv',
  patient_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  dietitian_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  plan_name TEXT NOT NULL,
  version INTEGER NOT NULL DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT', 'PUBLISHED', 'ACKNOWLEDGED', 'ARCHIVED')),
  start_date DATE NOT NULL DEFAULT CURRENT_DATE,
  review_date DATE,
  daily_calorie_target INTEGER CHECK (daily_calorie_target IS NULL OR daily_calorie_target BETWEEN 800 AND 6000),
  water_target_liters NUMERIC(4,2) DEFAULT 2.5,
  meals JSONB NOT NULL DEFAULT '[]'::jsonb, -- Structured meals array
  nutrition_goals TEXT,
  general_instructions TEXT,
  pdf_url TEXT,
  pdf_hash TEXT,
  previous_version_id UUID REFERENCES public.nutrition_plans(id) ON DELETE SET NULL,
  published_at TIMESTAMPTZ,
  acknowledged_at TIMESTAMPTZ,
  acknowledged_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. NUTRITION PLAN TEMPLATES TABLE
CREATE TABLE IF NOT EXISTS public.nutrition_plan_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT NOT NULL DEFAULT '8liv',
  dietitian_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL, -- NULL = System-wide standard template
  name TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('Weight Management', 'High Protein', 'Vegetarian', 'South Indian', 'Maintenance', 'Office Worker', 'Simple Meal Plan', 'Other')),
  description TEXT,
  target_calories INTEGER,
  water_target_liters NUMERIC(4,2) DEFAULT 2.5,
  meals JSONB NOT NULL DEFAULT '[]'::jsonb,
  instructions TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. FOOD & HYDRATION LOGS TABLE
CREATE TABLE IF NOT EXISTS public.food_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT NOT NULL DEFAULT '8liv',
  patient_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  log_date DATE NOT NULL DEFAULT CURRENT_DATE,
  meal_type TEXT NOT NULL CHECK (meal_type IN ('BREAKFAST', 'MID_MORNING', 'LUNCH', 'EVENING_SNACK', 'DINNER', 'WATER', 'OTHER')),
  time TEXT,
  food_items TEXT NOT NULL,
  portion TEXT,
  water_liters NUMERIC(4,2),
  photo_url TEXT,
  notes TEXT,
  completed BOOLEAN NOT NULL DEFAULT TRUE,
  dietitian_reviewed BOOLEAN NOT NULL DEFAULT FALSE,
  dietitian_comment TEXT,
  dietitian_reviewed_at TIMESTAMPTZ,
  dietitian_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. DOCTOR -> DIETITIAN REFERRALS TABLE
CREATE TABLE IF NOT EXISTS public.dietitian_referrals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT NOT NULL DEFAULT '8liv',
  patient_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  doctor_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  dietitian_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  reason TEXT NOT NULL,
  priority TEXT NOT NULL DEFAULT 'ROUTINE' CHECK (priority IN ('URGENT', 'HIGH', 'ROUTINE', 'LOW')),
  clinical_notes TEXT,
  status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'ACCEPTED', 'DECLINED', 'COMPLETED', 'CANCELLED')),
  declined_reason TEXT,
  accepted_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 6. DIETITIAN -> DOCTOR COMMUNICATIONS TABLE
CREATE TABLE IF NOT EXISTS public.dietitian_doctor_communications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT NOT NULL DEFAULT '8liv',
  patient_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  dietitian_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  doctor_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  communication_type TEXT NOT NULL CHECK (communication_type IN ('PROGRESS_UPDATE', 'CLINICAL_CONCERN', 'FOLLOW_UP_REQUEST', 'TREATMENT_REVIEW_REQUEST', 'NUTRITION_SUMMARY')),
  concern_summary TEXT NOT NULL,
  message TEXT NOT NULL,
  doctor_acknowledged BOOLEAN NOT NULL DEFAULT FALSE,
  doctor_reply TEXT,
  doctor_replied_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 7. PATIENT PLAN ACKNOWLEDGEMENTS AUDIT TABLE
CREATE TABLE IF NOT EXISTS public.patient_plan_acknowledgements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT NOT NULL DEFAULT '8liv',
  patient_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  plan_id UUID NOT NULL REFERENCES public.nutrition_plans(id) ON DELETE CASCADE,
  plan_version INTEGER NOT NULL,
  acknowledged_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  authenticated_user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  ip_address TEXT,
  user_agent TEXT
);

-- ====================================================================
-- INDEXES FOR SCALE AND TENANT ISOLATION
-- ====================================================================
CREATE INDEX IF NOT EXISTS idx_nutrition_assess_patient_tenant ON public.nutrition_assessments(patient_id, tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_nutrition_assess_dietitian ON public.nutrition_assessments(dietitian_id, status);

CREATE INDEX IF NOT EXISTS idx_nutrition_plans_patient_tenant ON public.nutrition_plans(patient_id, tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_nutrition_plans_dietitian_status ON public.nutrition_plans(dietitian_id, status, review_date);
CREATE INDEX IF NOT EXISTS idx_nutrition_plans_review_date ON public.nutrition_plans(review_date) WHERE status = 'PUBLISHED';

CREATE INDEX IF NOT EXISTS idx_nutrition_templates_category ON public.nutrition_plan_templates(category, is_active);

CREATE INDEX IF NOT EXISTS idx_food_logs_patient_date ON public.food_logs(patient_id, log_date DESC);
CREATE INDEX IF NOT EXISTS idx_food_logs_unreviewed ON public.food_logs(dietitian_reviewed, created_at DESC) WHERE dietitian_reviewed = FALSE;

CREATE INDEX IF NOT EXISTS idx_dietitian_referrals_dietitian ON public.dietitian_referrals(dietitian_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_dietitian_referrals_patient ON public.dietitian_referrals(patient_id, status);
CREATE INDEX IF NOT EXISTS idx_dietitian_referrals_doctor ON public.dietitian_referrals(doctor_id, status);

CREATE INDEX IF NOT EXISTS idx_dietitian_comms_patient ON public.dietitian_doctor_communications(patient_id, doctor_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_dietitian_comms_doctor_unack ON public.dietitian_doctor_communications(doctor_id, doctor_acknowledged) WHERE doctor_acknowledged = FALSE;

CREATE INDEX IF NOT EXISTS idx_plan_acks_plan ON public.patient_plan_acknowledgements(plan_id, plan_version);

-- ====================================================================
-- SEED STANDARD NUTRITION PLAN TEMPLATES
-- ====================================================================
INSERT INTO public.nutrition_plan_templates (name, category, description, target_calories, water_target_liters, meals, instructions)
VALUES
(
  'Weight Management Balanced Plan',
  'Weight Management',
  'Calorie-deficit, protein-sparing nutrition protocol designed for steady, sustainable fat loss with high satiety.',
  1600,
  2.5,
  '[
    {"id":"m1","name":"Breakfast","time":"08:30 AM","items":[{"food":"Vegetable Oats Porridge / 2 Boiled Eggs with 1 Whole Wheat Toast","portion":"1 bowl / 2 eggs","unit":"serving","alternative":"Moong Dal Chilla with Mint Chutney","instructions":"Cook oats in skim milk or water with diced vegetables"}]},
    {"id":"m2","name":"Mid-Morning","time":"11:00 AM","items":[{"food":"Seasonal Whole Fruit (Apple / Guava / Papaya) + 5 Almonds","portion":"1 medium fruit","unit":"serving","alternative":"1 glass of fresh coconut water + chia seeds","instructions":"Avoid fruit juices; consume whole with skin/fiber"}]},
    {"id":"m3","name":"Lunch","time":"01:30 PM","items":[{"food":"Brown Rice / 2 Phulkas + 1 Cup Dal / Grilled Paneer or Chicken + Green Salad","portion":"1 cup rice / 2 rotis","unit":"serving","alternative":"Quinoa Bowl with sautéed vegetables and curd","instructions":"Begin meal with raw cucumber and tomato salad"}]},
    {"id":"m4","name":"Evening Snack","time":"05:00 PM","items":[{"food":"Roasted Makhana (Foxnuts) / Sprouted Moong Chaat","portion":"1 small bowl (30g)","unit":"bowl","alternative":"Green tea with 2 walnuts","instructions":"Dry roast without excess butter or palm oil"}]},
    {"id":"m5","name":"Dinner","time":"08:00 PM","items":[{"food":"Clear Vegetable & Lentil Soup + Grilled Tofu / Fish / Dal with 1 Roti","portion":"1 large bowl soup + 1 roti","unit":"serving","alternative":"Paneer bhurji with stir-fried bell peppers and zucchini","instructions":"Finish dinner at least 2.5 hours before sleeping"}]}
  ]'::jsonb,
  'Maintain 2.5-3 liters of water daily. Walk 15 minutes post-lunch and post-dinner. Avoid refined sugar and packaged beverages.'
),
(
  'South Indian High-Protein Plan',
  'South Indian',
  'Traditional South Indian cuisine balanced with augmented protein sources, complex carbohydrates, and fiber.',
  1750,
  3.0,
  '[
    {"id":"m1","name":"Breakfast","time":"08:00 AM","items":[{"food":"Steamed Idlis with Sambar + boiled egg whites or roasted paneer","portion":"3 pieces idli + 1 cup sambar","unit":"serving","alternative":"Pesarattu (Green Gram Dosa) with ginger chutney","instructions":"Prefer lentil-dense sambar over coconut chutney"}]},
    {"id":"m2","name":"Mid-Morning","time":"11:00 AM","items":[{"food":"Spiced Buttermilk (Neer Mor) + 1 small handful roasted peanuts","portion":"1 large glass (250ml)","unit":"glass","alternative":"Tender coconut water with roasted gram","instructions":"Add crushed curry leaves, ginger, and cumin to buttermilk"}]},
    {"id":"m3","name":"Lunch","time":"01:30 PM","items":[{"food":"Red Rice / Millets + Rasam + Sundal (Kala Chana / Chickpeas) + Curd","portion":"1 cup millets + 1 cup sundal","unit":"serving","alternative":"Brown rice with drumstick sambar and cabbage poriyal","instructions":"Sundal provides high dietary fiber and plant protein"}]},
    {"id":"m4","name":"Evening Snack","time":"05:00 PM","items":[{"food":"Filter Coffee (with toned milk, negligible sugar) + boiled edamame/chana","portion":"1 small cup","unit":"serving","alternative":"Herbal decoction (Kashayam) with dry fruit mix","instructions":"Limit added sweetener to under 2.5g"}]},
    {"id":"m5","name":"Dinner","time":"08:00 PM","items":[{"food":"Vegetable Rava / Broken Wheat Upma with Sprouted Lentils or Grilled Chicken","portion":"1 medium bowl","unit":"serving","alternative":"2 Ragi Rotis with mixed vegetable kootu","instructions":"Ensure meal is completed by 8:15 PM"}]}
  ]'::jsonb,
  'Focus on lentil density in sambar. Use cold-pressed sesame or groundnut oil in minimal measures.'
),
(
  'High-Protein Muscle Preservation Plan',
  'High Protein',
  'Elevated protein protocol (1.6-2.0g/kg) to safeguard lean muscle tissue during active weight loss and medical therapies.',
  1800,
  3.2,
  '[
    {"id":"m1","name":"Breakfast","time":"08:00 AM","items":[{"food":"3 Egg Omelette (1 whole + 2 whites) with Spinach & Mushrooms + 2 Multigrain Toasts","portion":"3 eggs + 2 toasts","unit":"serving","alternative":"Soya chunk stir fry with sprouted beans (150g)","instructions":"Cook with olive oil spray; pair with warm green tea"}]},
    {"id":"m2","name":"Mid-Morning","time":"11:00 AM","items":[{"food":"Greek Yogurt (plain, unsweetened) with 1 tbsp Chia Seeds & Berries","portion":"150g yogurt","unit":"cup","alternative":"Whey / Plant protein isolate shake in water (25g protein)","instructions":"High leucine content stimulates muscle protein synthesis"}]},
    {"id":"m3","name":"Lunch","time":"01:30 PM","items":[{"food":"Grilled Chicken Breast / Pan-seared Tofu (150g) + 1 cup Quinoa + Steamed Broccoli","portion":"150g protein + 1 cup carbs","unit":"serving","alternative":"Low-fat Paneer curry with 2 millet rotis and raw salad","instructions":"Season with turmeric, black pepper, and lemon juice"}]},
    {"id":"m4","name":"Evening Snack","time":"05:00 PM","items":[{"food":"Boiled Egg Whites (3) / Roasted Soya Nuts (30g) with Black Coffee","portion":"3 whites or 30g nuts","unit":"serving","alternative":"Protein bar (<2g sugar, >15g protein)","instructions":"Ideal pre-workout snack"}]},
    {"id":"m5","name":"Dinner","time":"08:00 PM","items":[{"food":"Baked Fish (Salmon / Basa) or Grilled Tempeh + Sautéed Green Beans and Peppers","portion":"150g protein + vegetables","unit":"serving","alternative":"Cottage cheese & bell pepper bowl with 1 small bowl lentil soup","instructions":"Keep dinner carb-moderate for optimal nighttime recovery"}]}
  ]'::jsonb,
  'Essential during GLP-1 or weight loss therapies to prevent sarcopenia. Target 120g-140g protein daily.'
)
ON CONFLICT DO NOTHING;
