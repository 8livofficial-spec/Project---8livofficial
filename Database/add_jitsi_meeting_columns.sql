-- Adds stored Jitsi meeting metadata for consultation records.
-- Run this once in Supabase SQL editor if appointment details fail after the Jitsi migration.

ALTER TABLE public.doctor_consultations
  ADD COLUMN IF NOT EXISTS meeting_provider TEXT DEFAULT 'JITSI',
  ADD COLUMN IF NOT EXISTS meeting_room TEXT,
  ADD COLUMN IF NOT EXISTS meeting_url TEXT,
  ADD COLUMN IF NOT EXISTS is_completed BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS call_started_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS call_ended_at TIMESTAMPTZ;

ALTER TABLE public.staff_consultations
  ADD COLUMN IF NOT EXISTS meeting_provider TEXT DEFAULT 'JITSI',
  ADD COLUMN IF NOT EXISTS meeting_room TEXT,
  ADD COLUMN IF NOT EXISTS meeting_url TEXT,
  ADD COLUMN IF NOT EXISTS is_completed BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS call_started_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS call_ended_at TIMESTAMPTZ;

UPDATE public.doctor_consultations
SET meeting_provider = 'JITSI'
WHERE meeting_provider IS NULL;

UPDATE public.staff_consultations
SET meeting_provider = 'JITSI'
WHERE meeting_provider IS NULL;
