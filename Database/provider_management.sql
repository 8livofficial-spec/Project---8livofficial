-- Provider management foundation for 8liv admin portal.
-- Run this once in Supabase SQL editor before creating nutritionist/fitness coach users.

ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_role_check
  CHECK (role IN ('admin', 'doctor', 'dietitian', 'nutritionist', 'fitness_coach', 'trainer', 'patient'));

CREATE TABLE IF NOT EXISTS public.provider_profiles (
  provider_id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('doctor', 'dietitian', 'nutritionist', 'fitness_coach')),
  full_name TEXT NOT NULL,
  email TEXT,
  phone_number TEXT,
  specialization TEXT,
  qualification TEXT,
  years_experience INTEGER DEFAULT 0,
  registration_number TEXT,
  profile_photo_url TEXT,
  consultation_type TEXT DEFAULT 'video',
  payout_amount NUMERIC DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  bank_account_details JSONB DEFAULT '{}'::jsonb,
  upi_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_provider_profiles_role ON public.provider_profiles(role);
CREATE INDEX IF NOT EXISTS idx_provider_profiles_status ON public.provider_profiles(status);

ALTER TABLE public.care_team_assignments
  ADD COLUMN IF NOT EXISTS nutritionist_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS fitness_coach_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL;

ALTER TABLE public.provider_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins manage provider profiles" ON public.provider_profiles;
CREATE POLICY "Admins manage provider profiles"
  ON public.provider_profiles
  FOR ALL
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

DROP POLICY IF EXISTS "Providers read own profile" ON public.provider_profiles;
CREATE POLICY "Providers read own profile"
  ON public.provider_profiles
  FOR SELECT
  USING (provider_id = auth.uid());

NOTIFY pgrst, 'reload schema';
