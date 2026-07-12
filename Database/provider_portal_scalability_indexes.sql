-- Provider portal scalability indexes.
-- Safe to run when optional legacy/provider tables do not exist yet.

CREATE EXTENSION IF NOT EXISTS pg_trgm;

DO $$
BEGIN
  IF to_regclass('public.care_team_assignments') IS NOT NULL
     AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'care_team_assignments' AND column_name = 'doctor_id')
     AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'care_team_assignments' AND column_name = 'patient_id') THEN
    CREATE INDEX IF NOT EXISTS idx_care_team_assignments_doctor_patient
      ON public.care_team_assignments (doctor_id, patient_id);
  END IF;

  IF to_regclass('public.care_team_assignments') IS NOT NULL
     AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'care_team_assignments' AND column_name = 'dietitian_id')
     AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'care_team_assignments' AND column_name = 'patient_id') THEN
    CREATE INDEX IF NOT EXISTS idx_care_team_assignments_dietitian_patient
      ON public.care_team_assignments (dietitian_id, patient_id);
  END IF;

  IF to_regclass('public.care_team_assignments') IS NOT NULL
     AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'care_team_assignments' AND column_name = 'nutritionist_id')
     AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'care_team_assignments' AND column_name = 'patient_id') THEN
    CREATE INDEX IF NOT EXISTS idx_care_team_assignments_nutritionist_patient
      ON public.care_team_assignments (nutritionist_id, patient_id);
  END IF;

  IF to_regclass('public.care_team_assignments') IS NOT NULL
     AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'care_team_assignments' AND column_name = 'fitness_coach_id')
     AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'care_team_assignments' AND column_name = 'patient_id') THEN
    CREATE INDEX IF NOT EXISTS idx_care_team_assignments_fitness_coach_patient
      ON public.care_team_assignments (fitness_coach_id, patient_id);
  END IF;

  IF to_regclass('public.care_team_assignments') IS NOT NULL
     AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'care_team_assignments' AND column_name = 'trainer_id')
     AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'care_team_assignments' AND column_name = 'patient_id') THEN
    CREATE INDEX IF NOT EXISTS idx_care_team_assignments_trainer_patient
      ON public.care_team_assignments (trainer_id, patient_id);
  END IF;

  IF to_regclass('public.staff_consultations') IS NOT NULL
     AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'staff_consultations' AND column_name = 'staff_id')
     AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'staff_consultations' AND column_name = 'booking_date')
     AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'staff_consultations' AND column_name = 'booking_time') THEN
    CREATE INDEX IF NOT EXISTS idx_staff_consultations_staff_date_time
      ON public.staff_consultations (staff_id, booking_date, booking_time);
  END IF;

  IF to_regclass('public.staff_consultations') IS NOT NULL
     AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'staff_consultations' AND column_name = 'staff_id')
     AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'staff_consultations' AND column_name = 'status') THEN
    CREATE INDEX IF NOT EXISTS idx_staff_consultations_staff_status
      ON public.staff_consultations (staff_id, status);
  END IF;

  IF to_regclass('public.staff_consultations') IS NOT NULL
     AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'staff_consultations' AND column_name = 'staff_id')
     AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'staff_consultations' AND column_name = 'patient_id') THEN
    CREATE INDEX IF NOT EXISTS idx_staff_consultations_staff_patient
      ON public.staff_consultations (staff_id, patient_id);
  END IF;

  IF to_regclass('public.provider_availability') IS NOT NULL
     AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'provider_availability' AND column_name = 'provider_id')
     AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'provider_availability' AND column_name = 'provider_role')
     AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'provider_availability' AND column_name = 'available_date')
     AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'provider_availability' AND column_name = 'start_time') THEN
    CREATE INDEX IF NOT EXISTS idx_provider_availability_provider_role_date_time
      ON public.provider_availability (provider_id, provider_role, available_date, start_time);
  END IF;

  IF to_regclass('public.doctor_consultations') IS NOT NULL
     AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'doctor_consultations' AND column_name = 'doctor_id')
     AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'doctor_consultations' AND column_name = 'created_at') THEN
    CREATE INDEX IF NOT EXISTS idx_doctor_consultations_doctor_created
      ON public.doctor_consultations (doctor_id, created_at DESC);
  END IF;

  IF to_regclass('public.doctor_consultations') IS NOT NULL
     AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'doctor_consultations' AND column_name = 'doctor_id')
     AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'doctor_consultations' AND column_name = 'status')
     AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'doctor_consultations' AND column_name = 'created_at') THEN
    CREATE INDEX IF NOT EXISTS idx_doctor_consultations_unassigned_status_created
      ON public.doctor_consultations (status, created_at DESC)
      WHERE doctor_id IS NULL;
  END IF;

  IF to_regclass('public.progress_logs') IS NOT NULL
     AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'progress_logs' AND column_name = 'user_id')
     AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'progress_logs' AND column_name = 'created_at') THEN
    CREATE INDEX IF NOT EXISTS idx_progress_logs_user_created
      ON public.progress_logs (user_id, created_at DESC);
  END IF;

  IF to_regclass('public.diet_plans') IS NOT NULL
     AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'diet_plans' AND column_name = 'dietitian_id')
     AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'diet_plans' AND column_name = 'patient_id')
     AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'diet_plans' AND column_name = 'created_at') THEN
    CREATE INDEX IF NOT EXISTS idx_diet_plans_owner_patient_created
      ON public.diet_plans (dietitian_id, patient_id, created_at DESC);
  END IF;

  IF to_regclass('public.nutrition_guidance') IS NOT NULL
     AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'nutrition_guidance' AND column_name = 'nutritionist_id')
     AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'nutrition_guidance' AND column_name = 'patient_id')
     AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'nutrition_guidance' AND column_name = 'created_at') THEN
    CREATE INDEX IF NOT EXISTS idx_nutrition_guidance_owner_patient_created
      ON public.nutrition_guidance (nutritionist_id, patient_id, created_at DESC);
  END IF;

  IF to_regclass('public.fitness_plans') IS NOT NULL
     AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'fitness_plans' AND column_name = 'fitness_coach_id')
     AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'fitness_plans' AND column_name = 'patient_id')
     AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'fitness_plans' AND column_name = 'created_at') THEN
    CREATE INDEX IF NOT EXISTS idx_fitness_plans_owner_patient_created
      ON public.fitness_plans (fitness_coach_id, patient_id, created_at DESC);
  END IF;

  IF to_regclass('public.health_assessments') IS NOT NULL
     AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'health_assessments' AND column_name = 'patient_id') THEN
    CREATE INDEX IF NOT EXISTS idx_health_assessments_patient
      ON public.health_assessments (patient_id);
  END IF;

  IF to_regclass('public.profiles') IS NOT NULL
     AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'first_name') THEN
    CREATE INDEX IF NOT EXISTS idx_profiles_first_name_trgm
      ON public.profiles USING gin (first_name gin_trgm_ops);
  END IF;

  IF to_regclass('public.profiles') IS NOT NULL
     AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'last_name') THEN
    CREATE INDEX IF NOT EXISTS idx_profiles_last_name_trgm
      ON public.profiles USING gin (last_name gin_trgm_ops);
  END IF;

  IF to_regclass('public.profiles') IS NOT NULL
     AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'email') THEN
    CREATE INDEX IF NOT EXISTS idx_profiles_email_trgm
      ON public.profiles USING gin (email gin_trgm_ops);
  END IF;

  IF to_regclass('public.profiles') IS NOT NULL
     AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'phone_number') THEN
    CREATE INDEX IF NOT EXISTS idx_profiles_phone_number_trgm
      ON public.profiles USING gin (phone_number gin_trgm_ops);
  END IF;

  IF to_regclass('public.health_assessments') IS NOT NULL
     AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'health_assessments' AND column_name = 'first_name') THEN
    CREATE INDEX IF NOT EXISTS idx_health_assessments_first_name_trgm
      ON public.health_assessments USING gin (first_name gin_trgm_ops);
  END IF;

  IF to_regclass('public.health_assessments') IS NOT NULL
     AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'health_assessments' AND column_name = 'last_name') THEN
    CREATE INDEX IF NOT EXISTS idx_health_assessments_last_name_trgm
      ON public.health_assessments USING gin (last_name gin_trgm_ops);
  END IF;

  IF to_regclass('public.health_assessments') IS NOT NULL
     AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'health_assessments' AND column_name = 'phone_number') THEN
    CREATE INDEX IF NOT EXISTS idx_health_assessments_phone_number_trgm
      ON public.health_assessments USING gin (phone_number gin_trgm_ops);
  END IF;

  IF to_regclass('public.profiles') IS NOT NULL
     AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'first_name')
     AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'last_name')
     AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'email')
     AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'phone_number') THEN
    CREATE INDEX IF NOT EXISTS idx_profiles_provider_search_concat_trgm
      ON public.profiles
      USING gin (lower(coalesce(first_name, '') || ' ' || coalesce(last_name, '') || ' ' || coalesce(email, '') || ' ' || coalesce(phone_number, '')) gin_trgm_ops);
  END IF;

  IF to_regclass('public.health_assessments') IS NOT NULL
     AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'health_assessments' AND column_name = 'first_name')
     AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'health_assessments' AND column_name = 'last_name')
     AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'health_assessments' AND column_name = 'phone_number') THEN
    CREATE INDEX IF NOT EXISTS idx_health_assessments_provider_search_concat_trgm
      ON public.health_assessments
      USING gin (lower(coalesce(first_name, '') || ' ' || coalesce(last_name, '') || ' ' || coalesce(phone_number, '')) gin_trgm_ops);
  END IF;
END $$;
