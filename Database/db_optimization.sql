-- ============================================================
-- 8Liv Database Index Optimization Script
-- Run this in: Supabase Dashboard > SQL Editor
-- Safe to run multiple times (IF NOT EXISTS on each statement)
-- ============================================================

-- ── provider_availability ───────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_provider_availability_role_status_date 
  ON public.provider_availability (provider_role, status, available_date);

CREATE INDEX IF NOT EXISTS idx_provider_availability_provider_role_date_time 
  ON public.provider_availability (provider_id, provider_role, available_date, start_time);

-- ── appointments (doctor_consultations & staff_consultations)
CREATE INDEX IF NOT EXISTS idx_doctor_consultations_patient_status 
  ON public.doctor_consultations (patient_id, status);

CREATE INDEX IF NOT EXISTS idx_doctor_consultations_doctor_status 
  ON public.doctor_consultations (doctor_id, status);

CREATE INDEX IF NOT EXISTS idx_staff_consultations_patient_status 
  ON public.staff_consultations (patient_id, status);

CREATE INDEX IF NOT EXISTS idx_staff_consultations_staff_role_status 
  ON public.staff_consultations (staff_id, staff_role, status);

-- ── care_team_assignments ───────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_care_team_assignments_patient_status 
  ON public.care_team_assignments (patient_id, status);

-- ── payments (payment_transactions) ──────────────────────────
CREATE INDEX IF NOT EXISTS idx_payment_transactions_patient_status 
  ON public.payment_transactions (patient_id, status);
