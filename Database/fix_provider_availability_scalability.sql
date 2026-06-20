-- Fix provider availability so each provider owns an independent calendar.
-- Safe to run in Supabase SQL editor after backing up production data.

-- 1. Drop legacy global uniqueness on doctor_availability date/time.
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
      SELECT array_agg(a.attname::TEXT ORDER BY a.attname::TEXT)
      INTO constraint_columns
      FROM unnest(constraint_record.conkey) WITH ORDINALITY AS key(attnum, position)
      JOIN pg_attribute a
        ON a.attrelid = 'public.doctor_availability'::regclass
       AND a.attnum = key.attnum;

      IF ('available_date' = ANY(constraint_columns) OR 'time_slot' = ANY(constraint_columns))
        AND constraint_columns IS DISTINCT FROM ARRAY['available_date', 'doctor_id', 'time_slot']::TEXT[] THEN
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
      SELECT array_agg(a.attname::TEXT ORDER BY a.attname::TEXT)
      INTO index_columns
      FROM pg_index i
      JOIN unnest(string_to_array(i.indkey::text, ' ')::int[]) WITH ORDINALITY AS key(attnum, position) ON TRUE
      JOIN pg_attribute a
        ON a.attrelid = i.indrelid
       AND a.attnum = key.attnum
      WHERE i.indexrelid = index_record.index_name::regclass;

      IF ('available_date' = ANY(index_columns) OR 'time_slot' = ANY(index_columns))
        AND index_columns IS DISTINCT FROM ARRAY['available_date', 'doctor_id', 'time_slot']::TEXT[] THEN
        EXECUTE format('DROP INDEX IF EXISTS %s', index_record.index_name);
      END IF;
    END LOOP;

    -- Keep a booked row over an unbooked duplicate. Multiple booked duplicates are
    -- intentionally left for manual review rather than deleting appointment data.
    WITH ranked AS (
      SELECT
        id,
        is_booked,
        COUNT(*) FILTER (WHERE is_booked) OVER (
          PARTITION BY doctor_id, available_date, time_slot
        ) AS booked_count,
        ROW_NUMBER() OVER (
          PARTITION BY doctor_id, available_date, time_slot
          ORDER BY is_booked DESC, id
        ) AS row_number
      FROM public.doctor_availability
    )
    DELETE FROM public.doctor_availability availability
    USING ranked
    WHERE availability.id = ranked.id
      AND ranked.row_number > 1
      AND (ranked.booked_count <= 1 OR ranked.is_booked = FALSE);

    IF NOT EXISTS (
      SELECT 1
      FROM pg_constraint
      WHERE conrelid = 'public.doctor_availability'::regclass
        AND contype = 'u'
        AND (
          SELECT array_agg(attribute.attname::TEXT ORDER BY attribute.attname::TEXT)
          FROM unnest(conkey) AS key(attnum)
          JOIN pg_attribute attribute
            ON attribute.attrelid = 'public.doctor_availability'::regclass
           AND attribute.attnum = key.attnum
        ) = ARRAY['available_date', 'doctor_id', 'time_slot']::TEXT[]
    ) THEN
      ALTER TABLE public.doctor_availability
        ADD CONSTRAINT unique_doctor_slot UNIQUE (doctor_id, available_date, time_slot);
    END IF;
  END IF;
END $$;

-- 2. Normalize provider_availability to provider-scoped slots.
INSERT INTO public.provider_profiles (provider_id, role, full_name, email, status)
SELECT
  profile.id,
  CASE WHEN profile.role = 'trainer' THEN 'fitness_coach' ELSE profile.role END,
  COALESCE(NULLIF(TRIM(CONCAT_WS(' ', profile.first_name, profile.last_name)), ''), split_part(profile.email, '@', 1), 'Provider'),
  profile.email,
  'active'
FROM public.profiles AS profile
WHERE profile.role IN ('doctor', 'dietitian', 'nutritionist', 'fitness_coach', 'trainer')
ON CONFLICT (provider_id) DO NOTHING;

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
  ADD COLUMN IF NOT EXISTS slot_duration INTEGER NOT NULL DEFAULT 30,
  ADD COLUMN IF NOT EXISTS source TEXT NOT NULL DEFAULT 'GENERATED',
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'AVAILABLE',
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

UPDATE public.provider_availability
SET status = CASE
  WHEN is_available = FALSE THEN 'BOOKED'
  ELSE COALESCE(status, 'AVAILABLE')
END
WHERE status IS NULL OR status = '';

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

-- 3. Drop legacy global uniqueness on provider_availability date/time.
DO $$
DECLARE
  constraint_record RECORD;
  index_record RECORD;
  constraint_columns TEXT[];
  index_columns TEXT[];
BEGIN
  FOR constraint_record IN
    SELECT c.conname, c.conkey
    FROM pg_constraint c
    WHERE c.conrelid = 'public.provider_availability'::regclass
      AND c.contype = 'u'
  LOOP
    SELECT array_agg(a.attname::TEXT ORDER BY a.attname::TEXT)
    INTO constraint_columns
    FROM unnest(constraint_record.conkey) WITH ORDINALITY AS key(attnum, position)
    JOIN pg_attribute a
      ON a.attrelid = 'public.provider_availability'::regclass
     AND a.attnum = key.attnum;

    IF ('available_date' = ANY(constraint_columns) OR 'start_time' = ANY(constraint_columns))
      AND constraint_columns IS DISTINCT FROM ARRAY['available_date', 'provider_id', 'provider_role', 'start_time']::TEXT[] THEN
      EXECUTE format('ALTER TABLE public.provider_availability DROP CONSTRAINT %I', constraint_record.conname);
    END IF;
  END LOOP;

  FOR index_record IN
    SELECT i.indexrelid::regclass::text AS index_name
    FROM pg_index i
    LEFT JOIN pg_constraint c ON c.conindid = i.indexrelid
    WHERE i.indrelid = 'public.provider_availability'::regclass
      AND i.indisunique
      AND c.oid IS NULL
  LOOP
    SELECT array_agg(a.attname::TEXT ORDER BY a.attname::TEXT)
    INTO index_columns
    FROM pg_index i
    JOIN unnest(string_to_array(i.indkey::text, ' ')::int[]) WITH ORDINALITY AS key(attnum, position) ON TRUE
    JOIN pg_attribute a
      ON a.attrelid = i.indrelid
     AND a.attnum = key.attnum
    WHERE i.indexrelid = index_record.index_name::regclass;

    IF ('available_date' = ANY(index_columns) OR 'start_time' = ANY(index_columns))
      AND index_columns IS DISTINCT FROM ARRAY['available_date', 'provider_id', 'provider_role', 'start_time']::TEXT[] THEN
      EXECUTE format('DROP INDEX IF EXISTS %s', index_record.index_name);
    END IF;
  END LOOP;

  -- Preserve a booked row when duplicate legacy records exist. If multiple rows
  -- are BOOKED for the same provider slot, the constraint addition will fail so
  -- production data can be reviewed instead of silently deleting bookings.
  WITH ranked AS (
    SELECT
      id,
      status,
      COUNT(*) FILTER (WHERE status = 'BOOKED') OVER (
        PARTITION BY provider_id, provider_role, available_date, start_time
      ) AS booked_count,
      ROW_NUMBER() OVER (
        PARTITION BY provider_id, provider_role, available_date, start_time
        ORDER BY (status = 'BOOKED') DESC, updated_at DESC NULLS LAST, created_at DESC NULLS LAST, id
      ) AS row_number
    FROM public.provider_availability
  )
  DELETE FROM public.provider_availability availability
  USING ranked
  WHERE availability.id = ranked.id
    AND ranked.row_number > 1
    AND (ranked.booked_count <= 1 OR ranked.status <> 'BOOKED');

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'public.provider_availability'::regclass
      AND contype = 'u'
      AND (
        SELECT array_agg(attribute.attname::TEXT ORDER BY attribute.attname::TEXT)
        FROM unnest(conkey) AS key(attnum)
        JOIN pg_attribute attribute
          ON attribute.attrelid = 'public.provider_availability'::regclass
         AND attribute.attnum = key.attnum
      ) = ARRAY['available_date', 'provider_id', 'provider_role', 'start_time']::TEXT[]
  ) THEN
    ALTER TABLE public.provider_availability
      ADD CONSTRAINT provider_availability_provider_role_date_start_key
      UNIQUE (provider_id, provider_role, available_date, start_time);
  END IF;
END $$;

-- Prevent overlapping active windows for one provider while allowing every
-- other provider to publish the same date and time independently.
CREATE EXTENSION IF NOT EXISTS btree_gist;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'public.provider_availability'::regclass
      AND conname = 'provider_availability_no_active_overlap'
  ) THEN
    ALTER TABLE public.provider_availability
      ADD CONSTRAINT provider_availability_no_active_overlap
      EXCLUDE USING gist (
        provider_id WITH =,
        provider_role WITH =,
        available_date WITH =,
        tsrange(available_date + start_time, available_date + end_time, '[)') WITH &&
      )
      WHERE (status IN ('AVAILABLE', 'BOOKED'));
  END IF;
END $$;

DO $$
BEGIN
  IF to_regclass('public.doctor_availability') IS NOT NULL THEN
    CREATE INDEX IF NOT EXISTS idx_doctor_availability_lookup
      ON public.doctor_availability(available_date, time_slot, is_booked, doctor_id);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_provider_availability_lookup
  ON public.provider_availability(provider_role, available_date, start_time, status, provider_id);

NOTIFY pgrst, 'reload schema';
