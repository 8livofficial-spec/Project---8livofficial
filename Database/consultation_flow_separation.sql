-- Separates one-time onboarding consultations from normal member consultations.

ALTER TABLE public.doctor_consultations
  ADD COLUMN IF NOT EXISTS appointment_type TEXT;

-- Do not silently classify future bookings as onboarding consultations. The API
-- must always choose the type from the patient's membership journey.
ALTER TABLE public.doctor_consultations
  ALTER COLUMN appointment_type DROP DEFAULT;

ALTER TABLE public.health_assessments
  ADD COLUMN IF NOT EXISTS first_consultation_completed BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS current_journey_step TEXT,
  ADD COLUMN IF NOT EXISTS membership_status TEXT NOT NULL DEFAULT 'NOT_SELECTED';

ALTER TABLE public.patient_journey_state
  ADD COLUMN IF NOT EXISTS first_consultation_completed BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS current_journey_step TEXT,
  ADD COLUMN IF NOT EXISTS appointment_type TEXT;

WITH ranked_consultations AS (
  SELECT
    id,
    ROW_NUMBER() OVER (
      PARTITION BY patient_id
      ORDER BY created_at ASC, id ASC
    ) AS consultation_number
  FROM public.doctor_consultations
)
UPDATE public.doctor_consultations dc
SET appointment_type = CASE
  WHEN ranked.consultation_number = 1 THEN 'INITIAL_CONSULTATION'
  ELSE 'FOLLOW_UP_CONSULTATION'
END
FROM ranked_consultations ranked
WHERE ranked.id = dc.id
  AND dc.appointment_type IS DISTINCT FROM CASE
    WHEN ranked.consultation_number = 1 THEN 'INITIAL_CONSULTATION'
    ELSE 'FOLLOW_UP_CONSULTATION'
  END;

ALTER TABLE public.doctor_consultations
  DROP CONSTRAINT IF EXISTS doctor_consultations_appointment_type_check;

ALTER TABLE public.doctor_consultations
  ADD CONSTRAINT doctor_consultations_appointment_type_check
  CHECK (appointment_type IN ('INITIAL_CONSULTATION', 'FOLLOW_UP_CONSULTATION'));

UPDATE public.health_assessments ha
SET first_consultation_completed = TRUE,
    current_journey_step = COALESCE(ha.current_journey_step, 'PLAN_SELECTION')
WHERE EXISTS (
  SELECT 1
  FROM public.doctor_consultations dc
  WHERE dc.patient_id = ha.patient_id
    AND dc.appointment_type = 'INITIAL_CONSULTATION'
    AND LOWER(dc.status) IN ('approved', 'rejected', 'completed')
);

UPDATE public.health_assessments ha
SET membership_status = CASE
  WHEN ha.membership_tier IS NOT NULL THEN 'ACTIVE'
  ELSE COALESCE(NULLIF(ha.membership_status, ''), 'NOT_SELECTED')
END,
onboarding_completed = CASE
  WHEN ha.membership_tier IS NOT NULL AND ha.first_consultation_completed = TRUE THEN TRUE
  ELSE ha.onboarding_completed
END,
current_journey_step = CASE
  WHEN ha.membership_tier IS NOT NULL AND ha.first_consultation_completed = TRUE THEN 'DASHBOARD'
  ELSE ha.current_journey_step
END;

UPDATE public.patient_journey_state pjs
SET first_consultation_completed = TRUE,
    appointment_type = COALESCE(pjs.appointment_type, 'INITIAL_CONSULTATION'),
    current_journey_step = COALESCE(pjs.current_journey_step, pjs.last_completed_step, 'PLAN_SELECTION')
WHERE EXISTS (
  SELECT 1
  FROM public.doctor_consultations dc
  WHERE dc.patient_id = pjs.patient_id
    AND dc.appointment_type = 'INITIAL_CONSULTATION'
    AND LOWER(dc.status) IN ('approved', 'rejected', 'completed')
);

UPDATE public.patient_journey_state
SET onboarding_completed = TRUE,
    current_journey_step = 'DASHBOARD'
WHERE membership_status = 'ACTIVE'
  AND first_consultation_completed = TRUE;

CREATE INDEX IF NOT EXISTS idx_doctor_consultations_patient_type_status
  ON public.doctor_consultations(patient_id, appointment_type, status);

CREATE INDEX IF NOT EXISTS idx_patient_journey_state_current_step
  ON public.patient_journey_state(current_journey_step);

NOTIFY pgrst, 'reload schema';
