CREATE TABLE IF NOT EXISTS public.patient_journey_state (
  patient_id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  assessment_status TEXT NOT NULL DEFAULT 'NOT_STARTED',
  assessment_progress INTEGER NOT NULL DEFAULT 1,
  eligibility_status TEXT NOT NULL DEFAULT 'NOT_STARTED',
  consultation_payment_status TEXT NOT NULL DEFAULT 'NOT_PAID',
  appointment_status TEXT NOT NULL DEFAULT 'NOT_BOOKED',
  consultation_status TEXT NOT NULL DEFAULT 'PENDING',
  membership_status TEXT NOT NULL DEFAULT 'NOT_SELECTED',
  dashboard_access BOOLEAN NOT NULL DEFAULT FALSE,
  booking_id UUID,
  payment_id TEXT,
  last_completed_step TEXT,
  resume_message_shown BOOLEAN NOT NULL DEFAULT FALSE,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_patient_journey_state_updated_at ON public.patient_journey_state(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_patient_journey_state_assessment_status ON public.patient_journey_state(assessment_status);
CREATE INDEX IF NOT EXISTS idx_patient_journey_state_membership_status ON public.patient_journey_state(membership_status);

ALTER TABLE public.patient_journey_state ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Patients read own journey state" ON public.patient_journey_state;
CREATE POLICY "Patients read own journey state"
  ON public.patient_journey_state
  FOR SELECT
  USING (patient_id = auth.uid());

DROP POLICY IF EXISTS "Patients update own assessment progress" ON public.patient_journey_state;
CREATE POLICY "Patients update own assessment progress"
  ON public.patient_journey_state
  FOR UPDATE
  USING (patient_id = auth.uid())
  WITH CHECK (patient_id = auth.uid());

DROP POLICY IF EXISTS "Service role manages patient journey state" ON public.patient_journey_state;
CREATE POLICY "Service role manages patient journey state"
  ON public.patient_journey_state
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

NOTIFY pgrst, 'reload schema';
