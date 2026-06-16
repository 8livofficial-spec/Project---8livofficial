-- Drop old role constraint and apply extended roles check constraint
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_role_check CHECK (role IN ('admin', 'doctor', 'dietitian', 'trainer', 'patient'));

-- 1. Create care_team_assignments table
CREATE TABLE IF NOT EXISTS public.care_team_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  doctor_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  dietitian_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  trainer_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  assigned_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT unique_patient_assignment UNIQUE (patient_id)
);

-- RLS for care_team_assignments
ALTER TABLE public.care_team_assignments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins have full control on assignments" ON public.care_team_assignments;
CREATE POLICY "Admins have full control on assignments"
  ON public.care_team_assignments FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Patients can view own assignment" ON public.care_team_assignments;
CREATE POLICY "Patients can view own assignment"
  ON public.care_team_assignments FOR SELECT TO authenticated
  USING (auth.uid() = patient_id);

DROP POLICY IF EXISTS "Care team members can view assigned patients" ON public.care_team_assignments;
CREATE POLICY "Care team members can view assigned patients"
  ON public.care_team_assignments FOR SELECT TO authenticated
  USING (
    auth.uid() = doctor_id OR 
    auth.uid() = dietitian_id OR 
    auth.uid() = trainer_id
  );

-- 2. Create membership_plans table
CREATE TABLE IF NOT EXISTS public.membership_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  price_monthly NUMERIC(10,2) NOT NULL,
  consultation_fee NUMERIC(10,2) DEFAULT 499.00,
  features TEXT[] NOT NULL,
  is_active BOOLEAN DEFAULT true,
  discount_code TEXT,
  discount_percent INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- RLS for membership_plans
ALTER TABLE public.membership_plans ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view active plans" ON public.membership_plans;
CREATE POLICY "Anyone can view active plans"
  ON public.membership_plans FOR SELECT
  USING (is_active = true);

DROP POLICY IF EXISTS "Admins have write access on plans" ON public.membership_plans;
CREATE POLICY "Admins have write access on plans"
  ON public.membership_plans FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Seed initial subscription plans if they don't exist
INSERT INTO public.membership_plans (name, price_monthly, consultation_fee, features, is_active)
VALUES 
  ('Silver Plan', 999.00, 499.00, ARRAY['1:1 Monthly video consultations', 'Pharmacy delivery', 'Prioritized chat', 'GLP-1 prescriptions'], true),
  ('Gold Plan', 1999.00, 499.00, ARRAY['1:1 Bi-weekly video consultations', 'Pharmacy delivery', '24/7 Priority Chat', 'Dietitian coaching', 'Fitness trainer check-ins', 'Monthly group wellness meets', 'Dedicated Care Coordinator', 'Quarterly blood panel reviews', 'GLP-1 prescriptions'], true)
ON CONFLICT (name) DO UPDATE 
SET 
  price_monthly = EXCLUDED.price_monthly,
  consultation_fee = EXCLUDED.consultation_fee,
  features = EXCLUDED.features;

-- 3. Create doctor_wallet & doctor_wallet_transactions tables (if they don't exist in Supabase yet)
CREATE TABLE IF NOT EXISTS public.doctor_wallet (
  doctor_id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  balance NUMERIC(10,2) NOT NULL DEFAULT 0.00,
  total_earned NUMERIC(10,2) NOT NULL DEFAULT 0.00,
  total_withdrawn NUMERIC(10,2) NOT NULL DEFAULT 0.00,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.doctor_wallet_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  doctor_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('credit', 'withdrawal')),
  amount NUMERIC(10,2) NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS on doctor_wallet tables
ALTER TABLE public.doctor_wallet ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.doctor_wallet_transactions ENABLE ROW LEVEL SECURITY;

-- 4. Security Definer Helper Function to check if user is admin safely (prevents RLS select recursion)
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Enable read permission for admins on other dashboard tables
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
CREATE POLICY "Admins can view all profiles"
  ON public.profiles FOR SELECT TO authenticated
  USING (public.is_admin());

DROP POLICY IF EXISTS "Admins can view all assessments" ON public.health_assessments;
CREATE POLICY "Admins can view all assessments"
  ON public.health_assessments FOR SELECT TO authenticated
  USING (public.is_admin());

DROP POLICY IF EXISTS "Admins can view all doctor profiles" ON public.doctor_profiles;
CREATE POLICY "Admins can view all doctor profiles"
  ON public.doctor_profiles FOR SELECT TO authenticated
  USING (public.is_admin());

DROP POLICY IF EXISTS "Admins can manage all consultations" ON public.doctor_consultations;
CREATE POLICY "Admins can manage all consultations"
  ON public.doctor_consultations FOR ALL TO authenticated
  USING (public.is_admin());

DROP POLICY IF EXISTS "Admins can view all wallets" ON public.doctor_wallet;
CREATE POLICY "Admins can view all wallets"
  ON public.doctor_wallet FOR SELECT TO authenticated
  USING (public.is_admin());

DROP POLICY IF EXISTS "Admins can manage all transactions" ON public.doctor_wallet_transactions;
CREATE POLICY "Admins can manage all transactions"
  ON public.doctor_wallet_transactions FOR ALL TO authenticated
  USING (public.is_admin());

-- 6. Add columns for dietitian and trainer guidelines
ALTER TABLE public.care_team_assignments 
  ADD COLUMN IF NOT EXISTS dietitian_notes TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS trainer_notes TEXT DEFAULT NULL;

-- 7. RLS policy to allow assigned care team members to update their patient's guidelines
DROP POLICY IF EXISTS "Care team members can update assignments" ON public.care_team_assignments;
CREATE POLICY "Care team members can update assignments"
  ON public.care_team_assignments FOR UPDATE TO authenticated
  USING (
    auth.uid() = doctor_id OR 
    auth.uid() = dietitian_id OR 
    auth.uid() = trainer_id
  );

-- 8. RLS select policies for assigned care team members on profiles, assessments, and progress logs
DROP POLICY IF EXISTS "Clinicians can view assigned patient profiles" ON public.profiles;
CREATE POLICY "Clinicians can view assigned patient profiles"
  ON public.profiles FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.care_team_assignments 
      WHERE patient_id = public.profiles.id 
        AND (doctor_id = auth.uid() OR dietitian_id = auth.uid() OR trainer_id = auth.uid())
    )
  );

DROP POLICY IF EXISTS "Clinicians can view assigned patient assessments" ON public.health_assessments;
CREATE POLICY "Clinicians can view assigned patient assessments"
  ON public.health_assessments FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.care_team_assignments 
      WHERE patient_id = public.health_assessments.patient_id 
        AND (doctor_id = auth.uid() OR dietitian_id = auth.uid() OR trainer_id = auth.uid())
    )
  );

DROP POLICY IF EXISTS "Clinicians can view assigned patient progress_logs" ON public.progress_logs;
CREATE POLICY "Clinicians can view assigned patient progress_logs"
  ON public.progress_logs FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.care_team_assignments 
      WHERE patient_id = public.progress_logs.user_id 
        AND (doctor_id = auth.uid() OR dietitian_id = auth.uid() OR trainer_id = auth.uid())
    )
  );


