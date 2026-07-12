-- Appointment booking context v2.
-- Separates onboarding initial consultations from follow-up/provider-assigned consultations.

ALTER TABLE public.doctor_consultations
  ADD COLUMN IF NOT EXISTS slot_id UUID,
  ADD COLUMN IF NOT EXISTS booking_source TEXT,
  ADD COLUMN IF NOT EXISTS payment_requirement TEXT,
  ADD COLUMN IF NOT EXISTS scheduled_start TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS scheduled_end TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS idempotency_key TEXT,
  ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ;

ALTER TABLE public.staff_consultations
  ADD COLUMN IF NOT EXISTS slot_id UUID,
  ADD COLUMN IF NOT EXISTS booking_source TEXT,
  ADD COLUMN IF NOT EXISTS payment_requirement TEXT,
  ADD COLUMN IF NOT EXISTS scheduled_start TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS scheduled_end TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS idempotency_key TEXT;

ALTER TABLE public.provider_availability
  ADD COLUMN IF NOT EXISTS allowed_appointment_types TEXT[] NOT NULL DEFAULT ARRAY[
    'INITIAL_DOCTOR_CONSULTATION',
    'DOCTOR_FOLLOW_UP',
    'DIETITIAN_CONSULTATION',
    'NUTRITIONIST_CONSULTATION',
    'FITNESS_COACH_CONSULTATION'
  ]::TEXT[],
  ADD COLUMN IF NOT EXISTS booking_mode TEXT NOT NULL DEFAULT 'STANDARD';

ALTER TABLE public.care_team_assignments
  ADD COLUMN IF NOT EXISTS provider_id UUID,
  ADD COLUMN IF NOT EXISTS provider_role TEXT,
  ADD COLUMN IF NOT EXISTS relationship_type TEXT,
  ADD COLUMN IF NOT EXISTS assigned_from_consultation_id UUID,
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'ACTIVE',
  ADD COLUMN IF NOT EXISTS assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS ended_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS ended_reason TEXT,
  ADD COLUMN IF NOT EXISTS assigned_by UUID,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

CREATE TABLE IF NOT EXISTS public.patient_service_entitlements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  membership_id UUID,
  service_type TEXT NOT NULL,
  total_quantity INTEGER,
  used_quantity INTEGER NOT NULL DEFAULT 0,
  remaining_quantity INTEGER,
  valid_from TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  valid_until TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'ACTIVE',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT patient_service_entitlements_quantity_check
    CHECK (
      total_quantity IS NULL
      OR (
        used_quantity >= 0
        AND remaining_quantity >= 0
        AND used_quantity + remaining_quantity <= total_quantity
      )
    )
);

CREATE TABLE IF NOT EXISTS public.patient_booking_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  actor_id UUID,
  actor_role TEXT,
  action TEXT NOT NULL,
  resource_type TEXT,
  resource_id UUID,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.admin_care_team_reassignment_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  current_provider_id UUID,
  new_provider_id UUID NOT NULL,
  relationship_type TEXT NOT NULL,
  reason TEXT NOT NULL,
  effective_date DATE NOT NULL DEFAULT CURRENT_DATE,
  migrate_upcoming_appointments BOOLEAN NOT NULL DEFAULT FALSE,
  status TEXT NOT NULL DEFAULT 'PENDING',
  requested_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.doctor_consultations
  DROP CONSTRAINT IF EXISTS doctor_consultations_appointment_type_check;

ALTER TABLE public.doctor_consultations
  ADD CONSTRAINT doctor_consultations_appointment_type_check
  CHECK (
    appointment_type IS NULL OR appointment_type IN (
      'INITIAL_DOCTOR_CONSULTATION',
      'DOCTOR_FOLLOW_UP',
      'INITIAL_CONSULTATION',
      'FOLLOW_UP_CONSULTATION'
    )
  );

ALTER TABLE public.staff_consultations
  DROP CONSTRAINT IF EXISTS staff_consultations_appointment_type_check;

ALTER TABLE public.staff_consultations
  ADD CONSTRAINT staff_consultations_appointment_type_check
  CHECK (
    appointment_type IS NULL OR appointment_type IN (
      'DIETITIAN_CONSULTATION',
      'NUTRITIONIST_CONSULTATION',
      'FITNESS_COACH_CONSULTATION'
    )
  );

ALTER TABLE public.care_team_assignments
  DROP CONSTRAINT IF EXISTS care_team_assignments_relationship_type_check;

ALTER TABLE public.care_team_assignments
  ADD CONSTRAINT care_team_assignments_relationship_type_check
  CHECK (
    relationship_type IS NULL OR relationship_type IN (
      'PRIMARY_DOCTOR',
      'ASSIGNED_DIETITIAN',
      'ASSIGNED_NUTRITIONIST',
      'ASSIGNED_FITNESS_COACH',
      'TEMPORARY_COVERING_DOCTOR'
    )
  );

ALTER TABLE public.care_team_assignments
  DROP CONSTRAINT IF EXISTS care_team_assignments_status_check;

ALTER TABLE public.care_team_assignments
  ADD CONSTRAINT care_team_assignments_status_check
  CHECK (status IN ('PENDING', 'ACTIVE', 'SUSPENDED', 'ENDED'));

CREATE UNIQUE INDEX IF NOT EXISTS idx_care_team_one_active_primary_doctor
  ON public.care_team_assignments (patient_id)
  WHERE relationship_type = 'PRIMARY_DOCTOR'
    AND status = 'ACTIVE'
    AND ended_at IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_doctor_consultations_one_active_initial
  ON public.doctor_consultations (patient_id)
  WHERE appointment_type IN ('INITIAL_DOCTOR_CONSULTATION', 'INITIAL_CONSULTATION')
    AND LOWER(status) IN ('scheduled', 'calling', 'attended');

CREATE UNIQUE INDEX IF NOT EXISTS idx_doctor_consultations_slot_once
  ON public.doctor_consultations (slot_id)
  WHERE slot_id IS NOT NULL
    AND LOWER(status) NOT IN ('cancelled', 'cancelled_by_doctor', 'cancelled_by_patient', 'missed', 'missed_by_patient');

CREATE UNIQUE INDEX IF NOT EXISTS idx_doctor_consultations_idempotency
  ON public.doctor_consultations (patient_id, idempotency_key)
  WHERE idempotency_key IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_staff_consultations_slot_once
  ON public.staff_consultations (slot_id)
  WHERE slot_id IS NOT NULL
    AND LOWER(status) NOT IN ('cancelled', 'cancelled_by_patient', 'cancelled_by_provider', 'missed', 'missed_by_patient');

CREATE UNIQUE INDEX IF NOT EXISTS idx_staff_consultations_idempotency
  ON public.staff_consultations (patient_id, idempotency_key)
  WHERE idempotency_key IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_patient_entitlement_unique_active_service
  ON public.patient_service_entitlements (patient_id, service_type)
  WHERE status = 'ACTIVE';

CREATE INDEX IF NOT EXISTS idx_provider_availability_allowed_types
  ON public.provider_availability USING gin (allowed_appointment_types);

CREATE INDEX IF NOT EXISTS idx_patient_booking_audit_patient_created
  ON public.patient_booking_audit_logs (patient_id, created_at DESC);

-- Backfill canonical appointment names without changing legacy business meaning.
UPDATE public.doctor_consultations
SET appointment_type = 'INITIAL_DOCTOR_CONSULTATION'
WHERE appointment_type = 'INITIAL_CONSULTATION';

UPDATE public.doctor_consultations
SET appointment_type = 'DOCTOR_FOLLOW_UP'
WHERE appointment_type = 'FOLLOW_UP_CONSULTATION';

-- Backfill active primary doctors only from completed initial consultations.
INSERT INTO public.care_team_assignments (
  patient_id,
  provider_id,
  provider_role,
  relationship_type,
  assigned_from_consultation_id,
  status,
  assigned_at,
  assigned_by,
  created_at,
  updated_at
)
SELECT DISTINCT ON (dc.patient_id)
  dc.patient_id,
  dc.doctor_id,
  'doctor',
  'PRIMARY_DOCTOR',
  dc.id,
  'ACTIVE',
  COALESCE(dc.completed_at, dc.updated_at, dc.created_at, NOW()),
  dc.doctor_id,
  NOW(),
  NOW()
FROM public.doctor_consultations dc
WHERE dc.patient_id IS NOT NULL
  AND dc.doctor_id IS NOT NULL
  AND dc.appointment_type = 'INITIAL_DOCTOR_CONSULTATION'
  AND LOWER(dc.status) IN ('approved', 'rejected', 'completed')
  AND NOT EXISTS (
    SELECT 1
    FROM public.care_team_assignments existing
    WHERE existing.patient_id = dc.patient_id
      AND existing.relationship_type = 'PRIMARY_DOCTOR'
      AND existing.status = 'ACTIVE'
      AND existing.ended_at IS NULL
  )
ORDER BY dc.patient_id, COALESCE(dc.completed_at, dc.updated_at, dc.created_at) ASC;

ALTER TABLE public.patient_service_entitlements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.patient_booking_audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_care_team_reassignment_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS patient_entitlements_read_own ON public.patient_service_entitlements;
CREATE POLICY patient_entitlements_read_own
  ON public.patient_service_entitlements
  FOR SELECT
  USING (patient_id = auth.uid());

DROP POLICY IF EXISTS service_role_manage_patient_entitlements ON public.patient_service_entitlements;
CREATE POLICY service_role_manage_patient_entitlements
  ON public.patient_service_entitlements
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

DROP POLICY IF EXISTS patient_booking_audit_read_own ON public.patient_booking_audit_logs;
CREATE POLICY patient_booking_audit_read_own
  ON public.patient_booking_audit_logs
  FOR SELECT
  USING (patient_id = auth.uid());

DROP POLICY IF EXISTS service_role_manage_patient_booking_audit ON public.patient_booking_audit_logs;
CREATE POLICY service_role_manage_patient_booking_audit
  ON public.patient_booking_audit_logs
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

DROP POLICY IF EXISTS service_role_manage_reassignment_requests ON public.admin_care_team_reassignment_requests;
CREATE POLICY service_role_manage_reassignment_requests
  ON public.admin_care_team_reassignment_requests
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

NOTIFY pgrst, 'reload schema';
