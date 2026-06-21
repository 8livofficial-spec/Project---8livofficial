-- Hardening & Document Upload Database Migrations

-- 1. Diet Plans Updates
ALTER TABLE public.diet_plans
  ADD COLUMN IF NOT EXISTS appointment_id UUID REFERENCES public.staff_consultations(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS title TEXT,
  ADD COLUMN IF NOT EXISTS description TEXT,
  ADD COLUMN IF NOT EXISTS attachment_url TEXT,
  ADD COLUMN IF NOT EXISTS attachment_type TEXT;

-- 2. Fitness Plans Updates
ALTER TABLE public.fitness_plans
  ADD COLUMN IF NOT EXISTS appointment_id UUID REFERENCES public.staff_consultations(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS title TEXT,
  ADD COLUMN IF NOT EXISTS description TEXT,
  ADD COLUMN IF NOT EXISTS attachment_url TEXT,
  ADD COLUMN IF NOT EXISTS attachment_type TEXT;

-- 3. Doctor Consultation Ratings Table
CREATE TABLE IF NOT EXISTS public.doctor_consultation_ratings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  consultation_id UUID REFERENCES public.doctor_consultations(id) ON DELETE CASCADE UNIQUE,
  patient_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  doctor_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  review TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Enable Row Level Security (RLS)
ALTER TABLE public.doctor_consultation_ratings ENABLE ROW LEVEL SECURITY;

-- 5. Set RLS Policies
DO $$
BEGIN
    DROP POLICY IF EXISTS "Users can view their own consultation ratings" ON public.doctor_consultation_ratings;
    CREATE POLICY "Users can view their own consultation ratings" ON public.doctor_consultation_ratings
        FOR SELECT
        USING (auth.uid() = patient_id OR auth.uid() = doctor_id OR (
          EXISTS (
            SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'
          )
        ));

    DROP POLICY IF EXISTS "Patients can insert their own consultation ratings" ON public.doctor_consultation_ratings;
    CREATE POLICY "Patients can insert their own consultation ratings" ON public.doctor_consultation_ratings
        FOR INSERT
        WITH CHECK (auth.uid() = patient_id);

    DROP POLICY IF EXISTS "Patients can update their own consultation ratings" ON public.doctor_consultation_ratings;
    CREATE POLICY "Patients can update their own consultation ratings" ON public.doctor_consultation_ratings
        FOR UPDATE
        USING (auth.uid() = patient_id);
END $$;
