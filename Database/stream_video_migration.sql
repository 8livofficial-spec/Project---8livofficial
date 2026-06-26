-- Production migration: replace stored Jitsi URLs with provider-independent Stream Video metadata.
-- Run in Supabase SQL editor before deploying the Stream Video frontend/backend changes.

ALTER TABLE public.doctor_consultations
  ADD COLUMN IF NOT EXISTS meeting_provider TEXT DEFAULT 'STREAM',
  ADD COLUMN IF NOT EXISTS call_id TEXT,
  ADD COLUMN IF NOT EXISTS call_type TEXT,
  ADD COLUMN IF NOT EXISTS created_by UUID,
  ADD COLUMN IF NOT EXISTS meeting_status TEXT DEFAULT 'CREATED';

ALTER TABLE public.staff_consultations
  ADD COLUMN IF NOT EXISTS meeting_provider TEXT DEFAULT 'STREAM',
  ADD COLUMN IF NOT EXISTS call_id TEXT,
  ADD COLUMN IF NOT EXISTS call_type TEXT,
  ADD COLUMN IF NOT EXISTS created_by UUID,
  ADD COLUMN IF NOT EXISTS meeting_status TEXT DEFAULT 'CREATED';

CREATE INDEX IF NOT EXISTS idx_doctor_consultations_call_id
  ON public.doctor_consultations(call_id);

CREATE INDEX IF NOT EXISTS idx_staff_consultations_call_id
  ON public.staff_consultations(call_id);

CREATE INDEX IF NOT EXISTS idx_doctor_consultations_meeting_status
  ON public.doctor_consultations(meeting_status);

CREATE INDEX IF NOT EXISTS idx_staff_consultations_meeting_status
  ON public.staff_consultations(meeting_status);

-- Backfill provider for existing scheduled rows. Existing Jitsi URLs are intentionally not copied.
UPDATE public.doctor_consultations
SET meeting_provider = 'STREAM'
WHERE meeting_provider IS NULL OR meeting_provider = 'JITSI';

UPDATE public.staff_consultations
SET meeting_provider = 'STREAM'
WHERE meeting_provider IS NULL OR meeting_provider = 'JITSI';

NOTIFY pgrst, 'reload schema';
