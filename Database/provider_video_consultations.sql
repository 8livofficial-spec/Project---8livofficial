ALTER TABLE public.staff_consultations
  ADD COLUMN IF NOT EXISTS appointment_type TEXT,
  ADD COLUMN IF NOT EXISTS meeting_provider TEXT DEFAULT 'JITSI',
  ADD COLUMN IF NOT EXISTS meeting_room TEXT,
  ADD COLUMN IF NOT EXISTS meeting_url TEXT,
  ADD COLUMN IF NOT EXISTS is_completed BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ;

UPDATE public.staff_consultations
SET meeting_provider = 'JITSI'
WHERE meeting_provider IS NULL;

UPDATE public.staff_consultations
SET appointment_type = CASE
  WHEN staff_role = 'dietitian' THEN 'DIETITIAN_CONSULTATION'
  WHEN staff_role = 'nutritionist' THEN 'NUTRITIONIST_CONSULTATION'
  WHEN staff_role IN ('trainer', 'fitness_coach') THEN 'FITNESS_COACH_CONSULTATION'
  ELSE 'PROVIDER_CONSULTATION'
END
WHERE appointment_type IS NULL;

CREATE INDEX IF NOT EXISTS idx_staff_consultations_staff_role_status
  ON public.staff_consultations(staff_id, staff_role, status);

CREATE INDEX IF NOT EXISTS idx_staff_consultations_patient_status
  ON public.staff_consultations(patient_id, status);

NOTIFY pgrst, 'reload schema';
