-- Smart Care Assignment Engine schema for 8liv.

ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_role_check
  CHECK (role IN ('admin', 'doctor', 'dietitian', 'nutritionist', 'fitness_coach', 'trainer', 'patient'));

ALTER TABLE public.care_team_assignments
  ADD COLUMN IF NOT EXISTS nutritionist_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS fitness_coach_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS nutritionist_notes TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS plan_type TEXT,
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'ACTIVE',
  ADD COLUMN IF NOT EXISTS assignment_strategy TEXT;

CREATE TABLE IF NOT EXISTS public.assignment_engine_settings (
  id BOOLEAN PRIMARY KEY DEFAULT TRUE,
  auto_assignment_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  preferred_strategy TEXT NOT NULL DEFAULT 'LEAST_WORKLOAD'
    CHECK (preferred_strategy IN ('LEAST_WORKLOAD', 'ROUND_ROBIN', 'SAME_PROVIDER_FIRST')),
  fallback_manual_allowed BOOLEAN NOT NULL DEFAULT TRUE,
  max_daily_consultations INTEGER NOT NULL DEFAULT 12,
  max_hourly_consultations INTEGER NOT NULL DEFAULT 3,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT assignment_engine_settings_singleton CHECK (id = TRUE)
);

INSERT INTO public.assignment_engine_settings (id)
VALUES (TRUE)
ON CONFLICT (id) DO NOTHING;

-- Legacy doctor slots must be unique per doctor, not globally per date/time.
DO $$
DECLARE
  constraint_record RECORD;
  index_record RECORD;
  constraint_columns TEXT[];
  index_columns TEXT[];
BEGIN
  IF to_regclass('public.doctor_availability') IS NOT NULL THEN
    FOR constraint_record IN
      SELECT c.conname, c.conkey
      FROM pg_constraint c
      WHERE c.conrelid = 'public.doctor_availability'::regclass
        AND c.contype = 'u'
    LOOP
      SELECT array_agg(a.attname ORDER BY a.attname)
      INTO constraint_columns
      FROM unnest(constraint_record.conkey) WITH ORDINALITY AS key(attnum, position)
      JOIN pg_attribute a
        ON a.attrelid = 'public.doctor_availability'::regclass
       AND a.attnum = key.attnum;

      IF NOT ('doctor_id' = ANY(constraint_columns))
        AND ('available_date' = ANY(constraint_columns) OR 'time_slot' = ANY(constraint_columns)) THEN
        EXECUTE format('ALTER TABLE public.doctor_availability DROP CONSTRAINT %I', constraint_record.conname);
      END IF;
    END LOOP;

    FOR index_record IN
      SELECT i.indexrelid::regclass::text AS index_name
      FROM pg_index i
      LEFT JOIN pg_constraint c ON c.conindid = i.indexrelid
      WHERE i.indrelid = 'public.doctor_availability'::regclass
        AND i.indisunique
        AND c.oid IS NULL
    LOOP
      SELECT array_agg(a.attname ORDER BY a.attname)
      INTO index_columns
      FROM pg_index i
      JOIN unnest(string_to_array(i.indkey::text, ' ')::int[]) WITH ORDINALITY AS key(attnum, position) ON TRUE
      JOIN pg_attribute a
        ON a.attrelid = i.indrelid
       AND a.attnum = key.attnum
      WHERE i.indexrelid = index_record.index_name::regclass;

      IF NOT ('doctor_id' = ANY(index_columns))
        AND ('available_date' = ANY(index_columns) OR 'time_slot' = ANY(index_columns)) THEN
        EXECUTE format('DROP INDEX IF EXISTS %s', index_record.index_name);
      END IF;
    END LOOP;

    IF NOT EXISTS (
      SELECT 1
      FROM pg_constraint
      WHERE conrelid = 'public.doctor_availability'::regclass
        AND conname = 'unique_doctor_slot'
    ) THEN
      ALTER TABLE public.doctor_availability
        ADD CONSTRAINT unique_doctor_slot UNIQUE (doctor_id, available_date, time_slot);
    END IF;

    CREATE INDEX IF NOT EXISTS idx_doctor_availability_lookup
      ON public.doctor_availability(available_date, time_slot, is_booked, doctor_id);
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.provider_availability (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  provider_role TEXT NOT NULL CHECK (provider_role IN ('doctor', 'dietitian', 'nutritionist', 'fitness_coach', 'trainer')),
  available_date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  slot_duration INTEGER NOT NULL DEFAULT 30,
  source TEXT NOT NULL DEFAULT 'GENERATED' CHECK (source IN ('MANUAL', 'GENERATED')),
  status TEXT NOT NULL DEFAULT 'AVAILABLE' CHECK (status IN ('AVAILABLE', 'BOOKED', 'CANCELLED', 'EXPIRED')),
  break_start TIME,
  break_end TIME,
  is_available BOOLEAN NOT NULL DEFAULT TRUE,
  max_consultations_per_day INTEGER,
  max_consultations_per_hour INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT provider_availability_time_check CHECK (end_time > start_time)
);

ALTER TABLE public.provider_availability
  DROP CONSTRAINT IF EXISTS provider_availability_available_date_key,
  DROP CONSTRAINT IF EXISTS provider_availability_available_date_start_time_key,
  ADD COLUMN IF NOT EXISTS slot_duration INTEGER NOT NULL DEFAULT 30,
  ADD COLUMN IF NOT EXISTS source TEXT NOT NULL DEFAULT 'GENERATED',
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'AVAILABLE';

ALTER TABLE public.provider_availability
  DROP CONSTRAINT IF EXISTS provider_availability_source_check;

ALTER TABLE public.provider_availability
  ADD CONSTRAINT provider_availability_source_check
  CHECK (source IN ('MANUAL', 'GENERATED'));

ALTER TABLE public.provider_availability
  DROP CONSTRAINT IF EXISTS provider_availability_status_check;

ALTER TABLE public.provider_availability
  ADD CONSTRAINT provider_availability_status_check
  CHECK (status IN ('AVAILABLE', 'BOOKED', 'CANCELLED', 'EXPIRED'));

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'provider_availability_provider_role_date_start_key'
      AND conrelid = 'public.provider_availability'::regclass
  ) THEN
    ALTER TABLE public.provider_availability
      ADD CONSTRAINT provider_availability_provider_role_date_start_key
      UNIQUE (provider_id, provider_role, available_date, start_time);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_provider_availability_provider ON public.provider_availability(provider_id);
CREATE INDEX IF NOT EXISTS idx_provider_availability_role_date ON public.provider_availability(provider_role, available_date);
CREATE INDEX IF NOT EXISTS idx_provider_availability_lookup
  ON public.provider_availability(provider_role, available_date, start_time, status, provider_id);

CREATE TABLE IF NOT EXISTS public.provider_leave (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  leave_type TEXT NOT NULL DEFAULT 'VACATION' CHECK (leave_type IN ('VACATION', 'EMERGENCY', 'SICK', 'OTHER')),
  starts_at TIMESTAMPTZ NOT NULL,
  ends_at TIMESTAMPTZ NOT NULL,
  reason TEXT,
  status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'CANCELLED')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT provider_leave_time_check CHECK (ends_at > starts_at)
);

CREATE INDEX IF NOT EXISTS idx_provider_leave_provider ON public.provider_leave(provider_id);
CREATE INDEX IF NOT EXISTS idx_provider_leave_window ON public.provider_leave(starts_at, ends_at);

CREATE TABLE IF NOT EXISTS public.provider_workload (
  provider_id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  active_consultations INTEGER NOT NULL DEFAULT 0,
  consultations_today INTEGER NOT NULL DEFAULT 0,
  last_assigned_at TIMESTAMPTZ,
  round_robin_counter BIGINT NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.provider_assignments (
  assignment_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  provider_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  provider_role TEXT NOT NULL CHECK (provider_role IN ('doctor', 'dietitian', 'nutritionist', 'fitness_coach', 'trainer')),
  plan_type TEXT,
  is_primary BOOLEAN NOT NULL DEFAULT FALSE,
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'INACTIVE')),
  source TEXT NOT NULL DEFAULT 'SMART_ENGINE',
  UNIQUE (patient_id, provider_role, status)
);

CREATE INDEX IF NOT EXISTS idx_provider_assignments_patient ON public.provider_assignments(patient_id);
CREATE INDEX IF NOT EXISTS idx_provider_assignments_provider ON public.provider_assignments(provider_id);
CREATE INDEX IF NOT EXISTS idx_provider_assignments_role ON public.provider_assignments(provider_role);

CREATE TABLE IF NOT EXISTS public.provider_assignment_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  provider_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  previous_provider_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  appointment_id UUID,
  provider_role TEXT,
  event_type TEXT NOT NULL,
  reason TEXT,
  strategy TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_provider_assignment_logs_patient ON public.provider_assignment_logs(patient_id);
CREATE INDEX IF NOT EXISTS idx_provider_assignment_logs_provider ON public.provider_assignment_logs(provider_id);
CREATE INDEX IF NOT EXISTS idx_provider_assignment_logs_created ON public.provider_assignment_logs(created_at DESC);

CREATE TABLE IF NOT EXISTS public.provider_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_provider_notifications_provider ON public.provider_notifications(provider_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.provider_wallets (
  provider_id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  balance NUMERIC(10,2) NOT NULL DEFAULT 0,
  pending_payout NUMERIC(10,2) NOT NULL DEFAULT 0,
  completed_payout NUMERIC(10,2) NOT NULL DEFAULT 0,
  lifetime_earnings NUMERIC(10,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.provider_wallet_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  patient_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  appointment_id UUID,
  appointment_type TEXT,
  type TEXT NOT NULL DEFAULT 'CONSULTATION_PAYOUT' CHECK (type IN ('CONSULTATION_PAYOUT', 'PAYOUT_ADJUSTMENT', 'WITHDRAWAL')),
  amount NUMERIC(10,2) NOT NULL,
  status TEXT NOT NULL DEFAULT 'CREDITED' CHECK (status IN ('PENDING', 'CREDITED', 'FAILED', 'REVERSED')),
  payout_status TEXT NOT NULL DEFAULT 'PENDING' CHECK (payout_status IN ('PENDING', 'PROCESSING', 'PROCESSED', 'FAILED', 'HELD')),
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS provider_wallet_transactions_unique_consultation_payout
  ON public.provider_wallet_transactions (appointment_id)
  WHERE type = 'CONSULTATION_PAYOUT' AND appointment_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_provider_wallet_transactions_provider
  ON public.provider_wallet_transactions(provider_id, created_at DESC);

ALTER TABLE public.provider_availability ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.provider_wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.provider_wallet_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.provider_leave ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.provider_workload ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.provider_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.provider_assignment_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assignment_engine_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.provider_notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins manage assignment engine settings" ON public.assignment_engine_settings;
CREATE POLICY "Admins manage assignment engine settings"
  ON public.assignment_engine_settings FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

DROP POLICY IF EXISTS "Providers manage own availability" ON public.provider_availability;
CREATE POLICY "Providers manage own availability"
  ON public.provider_availability FOR ALL TO authenticated
  USING (provider_id = auth.uid() OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'))
  WITH CHECK (provider_id = auth.uid() OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

DROP POLICY IF EXISTS "Providers read own wallets" ON public.provider_wallets;
CREATE POLICY "Providers read own wallets"
  ON public.provider_wallets FOR SELECT TO authenticated
  USING (provider_id = auth.uid() OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

DROP POLICY IF EXISTS "Providers read own wallet transactions" ON public.provider_wallet_transactions;
CREATE POLICY "Providers read own wallet transactions"
  ON public.provider_wallet_transactions FOR SELECT TO authenticated
  USING (provider_id = auth.uid() OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

DROP POLICY IF EXISTS "Providers manage own leave" ON public.provider_leave;
CREATE POLICY "Providers manage own leave"
  ON public.provider_leave FOR ALL TO authenticated
  USING (provider_id = auth.uid() OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'))
  WITH CHECK (provider_id = auth.uid() OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

DROP POLICY IF EXISTS "Assigned providers and patients read assignments" ON public.provider_assignments;
CREATE POLICY "Assigned providers and patients read assignments"
  ON public.provider_assignments FOR SELECT TO authenticated
  USING (
    patient_id = auth.uid()
    OR provider_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

DROP POLICY IF EXISTS "Admins read assignment logs" ON public.provider_assignment_logs;
CREATE POLICY "Admins read assignment logs"
  ON public.provider_assignment_logs FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

DROP POLICY IF EXISTS "Providers read own notifications" ON public.provider_notifications;
CREATE POLICY "Providers read own notifications"
  ON public.provider_notifications FOR SELECT TO authenticated
  USING (
    provider_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

NOTIFY pgrst, 'reload schema';
