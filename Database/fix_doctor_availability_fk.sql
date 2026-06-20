-- Fix for: "doctor_availability" violates foreign key constraint "doctor_availability_doctor_id_fkey"
-- This script ensures the doctor_availability table is properly set up with correct foreign key constraints

-- 1. Ensure profiles table exists and has proper structure
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('admin', 'doctor', 'dietitian', 'trainer', 'patient')) DEFAULT 'patient',
  first_name TEXT,
  last_name TEXT,
  email TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Create or recreate doctor_availability table with correct FK constraint
-- First, check if the table exists and has data
DO $$
BEGIN
  -- Check if doctor_availability exists
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'doctor_availability') THEN
    -- Backup existing data
    CREATE TEMP TABLE doctor_availability_backup AS SELECT * FROM public.doctor_availability;
    
    -- Drop the table to recreate with correct schema
    DROP TABLE IF EXISTS public.doctor_availability CASCADE;
  END IF;
END $$;

-- Create doctor_availability table with correct FK constraint
CREATE TABLE IF NOT EXISTS public.doctor_availability (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  doctor_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  available_date DATE NOT NULL,
  time_slot TIME NOT NULL,
  is_booked BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT unique_doctor_slot UNIQUE (doctor_id, available_date, time_slot)
);

-- 3. Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_doctor_availability_doctor_id ON public.doctor_availability(doctor_id);
CREATE INDEX IF NOT EXISTS idx_doctor_availability_date ON public.doctor_availability(available_date);
CREATE INDEX IF NOT EXISTS idx_doctor_availability_booked ON public.doctor_availability(is_booked);

-- 4. Enable RLS on doctor_availability
ALTER TABLE public.doctor_availability ENABLE ROW LEVEL SECURITY;

-- 5. Create RLS policies
DROP POLICY IF EXISTS "Doctors can manage their own availability" ON public.doctor_availability;
CREATE POLICY "Doctors can manage their own availability"
  ON public.doctor_availability FOR ALL TO authenticated
  USING (doctor_id = auth.uid())
  WITH CHECK (doctor_id = auth.uid());

DROP POLICY IF EXISTS "Patients can view available slots" ON public.doctor_availability;
CREATE POLICY "Patients can view available slots"
  ON public.doctor_availability FOR SELECT TO authenticated
  USING (is_booked = false);

DROP POLICY IF EXISTS "Admins can manage all availability" ON public.doctor_availability;
CREATE POLICY "Admins can manage all availability"
  ON public.doctor_availability FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- 6. Ensure all doctors have profiles entries
-- This is critical for FK constraint
INSERT INTO public.profiles (id, role, email)
SELECT DISTINCT doctor_id, 'doctor', '' 
FROM public.doctor_profiles
WHERE doctor_id NOT IN (SELECT id FROM public.profiles)
ON CONFLICT (id) DO NOTHING;

-- 7. Verify data integrity
SELECT 
  COUNT(*) as total_availability_slots,
  COUNT(CASE WHEN is_booked = true THEN 1 END) as booked_slots,
  COUNT(CASE WHEN is_booked = false THEN 1 END) as available_slots
FROM public.doctor_availability;

-- 8. Check for any orphaned records (should be 0)
SELECT COUNT(*) as orphaned_records
FROM public.doctor_availability da
WHERE NOT EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = da.doctor_id);

-- 9. Show profiles that are doctors
SELECT id, role, first_name, last_name, email, created_at
FROM public.profiles
WHERE role = 'doctor'
ORDER BY created_at DESC;
