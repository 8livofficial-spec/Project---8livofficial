-- 8LIV Admin-Controlled & Database-Driven Treatment Plans Migration
-- Creates canonical treatment_plans table, plan_audit_logs table,
-- relaxes subscriptions duration constraint, and adds immutable pricing snapshot columns.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 1. Create canonical treatment_plans table
CREATE TABLE IF NOT EXISTS public.treatment_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT NOT NULL DEFAULT '8liv',
  name TEXT NOT NULL,
  duration_months INTEGER NOT NULL CHECK (duration_months > 0),
  base_price NUMERIC(12,2) NOT NULL CHECK (base_price >= 0),
  discount_percentage NUMERIC(5,2) NOT NULL DEFAULT 0 CHECK (discount_percentage >= 0 AND discount_percentage <= 100),
  discount_amount NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (discount_amount >= 0),
  final_price NUMERIC(12,2) NOT NULL CHECK (final_price >= 0),
  currency TEXT NOT NULL DEFAULT 'INR',
  description TEXT,
  features TEXT[] NOT NULL DEFAULT '{}'::text[],
  status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'INACTIVE', 'ARCHIVED')),
  display_order INTEGER NOT NULL DEFAULT 0,
  valid_from TIMESTAMPTZ,
  valid_until TIMESTAMPTZ,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  UNIQUE(tenant_id, name)
);

CREATE INDEX IF NOT EXISTS idx_treatment_plans_status_order ON public.treatment_plans(tenant_id, status, display_order ASC);
CREATE INDEX IF NOT EXISTS idx_treatment_plans_duration ON public.treatment_plans(duration_months);

-- 2. Create plan_audit_logs table
CREATE TABLE IF NOT EXISTS public.plan_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT NOT NULL DEFAULT '8liv',
  admin_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  plan_id UUID REFERENCES public.treatment_plans(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  old_values JSONB,
  new_values JSONB,
  reason TEXT,
  ip_address TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_plan_audit_logs_plan ON public.plan_audit_logs(plan_id, created_at DESC);

-- 3. Ensure public.subscriptions table exists with all required columns and relaxed duration check
CREATE TABLE IF NOT EXISTS public.subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT NOT NULL DEFAULT '8liv',
  patient_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  duration_months INTEGER NOT NULL CHECK (duration_months > 0),
  program_name TEXT NOT NULL,
  base_monthly_price NUMERIC(12,2) NOT NULL DEFAULT 1999.00,
  original_price NUMERIC(12,2) NOT NULL DEFAULT 1999.00,
  discount_percentage NUMERIC(5,2) NOT NULL DEFAULT 0,
  discount_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  final_price NUMERIC(12,2) NOT NULL DEFAULT 1999.00,
  start_date DATE NOT NULL DEFAULT CURRENT_DATE,
  end_date DATE NOT NULL DEFAULT (CURRENT_DATE + INTERVAL '1 month'),
  status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('PENDING_PAYMENT', 'ACTIVE', 'COMPLETED', 'PAUSED', 'CANCELLED')),
  payment_status TEXT NOT NULL DEFAULT 'PAID',
  payment_transaction_id TEXT,
  plan_id UUID REFERENCES public.treatment_plans(id) ON DELETE SET NULL,
  plan_name_snapshot TEXT,
  base_price_snapshot NUMERIC(12,2),
  discount_percentage_snapshot NUMERIC(5,2) DEFAULT 0,
  discount_amount_snapshot NUMERIC(12,2) DEFAULT 0,
  tax_snapshot NUMERIC(12,2) DEFAULT 0,
  final_price_snapshot NUMERIC(12,2),
  currency TEXT NOT NULL DEFAULT 'INR',
  pricing_version INTEGER NOT NULL DEFAULT 1,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- If subscriptions table already existed previously, safely alter it
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'subscriptions'
  ) THEN
    -- Drop restrictive constraint if it exists
    IF EXISTS (
      SELECT 1 FROM information_schema.table_constraints
      WHERE constraint_name = 'subscriptions_duration_months_check'
      AND table_name = 'subscriptions'
    ) THEN
      ALTER TABLE public.subscriptions DROP CONSTRAINT subscriptions_duration_months_check;
    END IF;

    -- Add positive duration check if not already present
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.table_constraints
      WHERE constraint_name = 'subscriptions_duration_positive_check'
      AND table_name = 'subscriptions'
    ) THEN
      ALTER TABLE public.subscriptions ADD CONSTRAINT subscriptions_duration_positive_check CHECK (duration_months > 0);
    END IF;
  END IF;
END $$;

-- Safely add pricing snapshot columns to existing subscriptions table if not already present
ALTER TABLE public.subscriptions
  ADD COLUMN IF NOT EXISTS plan_id UUID REFERENCES public.treatment_plans(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS plan_name_snapshot TEXT,
  ADD COLUMN IF NOT EXISTS base_price_snapshot NUMERIC(12,2),
  ADD COLUMN IF NOT EXISTS discount_percentage_snapshot NUMERIC(5,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS discount_amount_snapshot NUMERIC(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS tax_snapshot NUMERIC(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS final_price_snapshot NUMERIC(12,2),
  ADD COLUMN IF NOT EXISTS currency TEXT NOT NULL DEFAULT 'INR',
  ADD COLUMN IF NOT EXISTS pricing_version INTEGER NOT NULL DEFAULT 1;

CREATE INDEX IF NOT EXISTS idx_subscriptions_plan_id ON public.subscriptions(plan_id);

-- 4. Enable Row Level Security
ALTER TABLE public.treatment_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plan_audit_logs ENABLE ROW LEVEL SECURITY;

-- Treatment Plans RLS:
-- Anyone (authenticated or anon) can view active plans within valid date windows
DROP POLICY IF EXISTS "Public can view active treatment plans" ON public.treatment_plans;
CREATE POLICY "Public can view active treatment plans" ON public.treatment_plans
  FOR SELECT USING (
    status = 'ACTIVE' 
    AND (valid_from IS NULL OR valid_from <= NOW())
    AND (valid_until IS NULL OR valid_until >= NOW())
  );

-- Admins and Service Role have full access to treatment plans
DROP POLICY IF EXISTS "Admins have full access to treatment plans" ON public.treatment_plans;
CREATE POLICY "Admins have full access to treatment plans" ON public.treatment_plans
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Service role manages treatment plans" ON public.treatment_plans;
CREATE POLICY "Service role manages treatment plans" ON public.treatment_plans
  FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');

-- Plan Audit Logs RLS:
-- Admins can view audit logs
DROP POLICY IF EXISTS "Admins can view plan audit logs" ON public.plan_audit_logs;
CREATE POLICY "Admins can view plan audit logs" ON public.plan_audit_logs
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Service role manages plan audit logs" ON public.plan_audit_logs;
CREATE POLICY "Service role manages plan audit logs" ON public.plan_audit_logs
  FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');

-- Subscriptions RLS:
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Patients read own subscriptions" ON public.subscriptions;
CREATE POLICY "Patients read own subscriptions" ON public.subscriptions
  FOR SELECT TO authenticated
  USING (
    patient_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'doctor', 'dietitian', 'trainer'))
  );

DROP POLICY IF EXISTS "Service role manages subscriptions" ON public.subscriptions;
CREATE POLICY "Service role manages subscriptions" ON public.subscriptions
  FOR ALL
  USING (
    auth.role() = 'service_role'
    OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- 5. Seed Initial Admin-Controlled Treatment Plans
-- (Preserves initial approved commercial terms as dynamic database records rather than hardcoded code)
INSERT INTO public.treatment_plans (
  name,
  duration_months,
  base_price,
  discount_percentage,
  discount_amount,
  final_price,
  currency,
  description,
  features,
  status,
  display_order
) VALUES 
(
  '1 Month Treatment Program',
  1,
  1999.00,
  0,
  0,
  1999.00,
  'INR',
  '1 monthly treatment cycle with comprehensive doctor review, personalized dietary protocol, and initial lifestyle onboarding.',
  ARRAY['1 Treatment Cycle with doctor review', 'Free follow-up consultation included', 'Personalized nutrition & diet guidance', 'Fitness coach movement plan', 'Prescription & pharmacy coordination'],
  'ACTIVE',
  1
),
(
  '3 Month Treatment Program',
  3,
  5997.00,
  0,
  0,
  5997.00,
  'INR',
  '3 structured treatment cycles to build lasting metabolic habits with consistent doctor monitoring and follow-up reviews.',
  ARRAY['3 Treatment Cycles provisioned', 'Included doctor follow-ups each cycle (₹0)', 'Dedicated dietitian & nutritionist support', 'Continuous habit & weight progress tracking', 'Care team messaging & pharmacy dispatch'],
  'ACTIVE',
  2
),
(
  '6 Month Treatment Program',
  6,
  11994.00,
  0,
  0,
  11994.00,
  'INR',
  '6 monthly treatment cycles for sustained weight reduction, clinical lab monitoring, and habit lock-in.',
  ARRAY['6 Treatment Cycles provisioned', 'Included monthly doctor review consultations', 'Advanced metabolic coaching', 'Proactive care team coordination', 'Partner pharmacy fulfillment integration'],
  'ACTIVE',
  3
),
(
  '10 Month Treatment Program',
  10,
  19990.00,
  10,
  1999.00,
  17991.00,
  'INR',
  'Full year metabolic reset with 10% instant bulk discount. 10 monthly treatment cycles and priority partner pharmacy fulfillment.',
  ARRAY['10 Treatment Cycles provisioned', '10% Instant Bulk Discount Applied', 'Included doctor follow-up review each cycle', 'Full dedicated multi-disciplinary care team', 'Priority pharmacy dispatch & delivery tracking'],
  'ACTIVE',
  4
)
ON CONFLICT (tenant_id, name) DO UPDATE SET
  duration_months = EXCLUDED.duration_months,
  base_price = EXCLUDED.base_price,
  discount_percentage = EXCLUDED.discount_percentage,
  discount_amount = EXCLUDED.discount_amount,
  final_price = EXCLUDED.final_price,
  description = EXCLUDED.description,
  features = EXCLUDED.features,
  status = EXCLUDED.status,
  display_order = EXCLUDED.display_order,
  updated_at = NOW();

NOTIFY pgrst, 'reload schema';
