-- =============================================================================
-- Migration: Subscription UTC Expiry Precision + Masked Coaching Sessions
-- =============================================================================
-- 1. Adds starts_at (TIMESTAMPTZ), ends_at (TIMESTAMPTZ), timezone (TEXT) to
--    public.subscriptions and backfills existing start_date / end_date using
--    Asia/Kolkata (UTC+05:30) boundaries (00:00:00+05:30 to 23:59:59+05:30).
-- 2. Expands subscriptions.status CHECK constraint to include EXPIRED & UPGRADED.
-- 3. Creates public.coaching_sessions for 90-day fitness & dietitian sessions
--    with server-side-only meeting_url storage and mid-session join tracking.
-- 4. Creates public.coaching_session_join_tokens for single-use token gating.
-- =============================================================================

-- 1. Subscriptions: UTC timestamp columns + backfill
ALTER TABLE public.subscriptions
  ADD COLUMN IF NOT EXISTS starts_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS ends_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS timezone TEXT NOT NULL DEFAULT 'Asia/Kolkata';

UPDATE public.subscriptions
SET
  starts_at = COALESCE(starts_at, (start_date::text || ' 00:00:00+05:30')::timestamptz),
  ends_at   = COALESCE(ends_at,   (end_date::text   || ' 23:59:59+05:30')::timestamptz)
WHERE starts_at IS NULL OR ends_at IS NULL;

-- Expand status CHECK constraint to support EXPIRED and UPGRADED
DO $$
DECLARE
  v_constraint_name TEXT;
BEGIN
  FOR v_constraint_name IN
    SELECT conname
    FROM pg_constraint
    WHERE conrelid = 'public.subscriptions'::regclass
      AND contype = 'c'
      AND pg_get_constraintdef(oid) ILIKE '%status%'
  LOOP
    EXECUTE format('ALTER TABLE public.subscriptions DROP CONSTRAINT IF EXISTS %I', v_constraint_name);
  END LOOP;
END $$;

ALTER TABLE public.subscriptions
  ADD CONSTRAINT subscriptions_status_check
  CHECK (status IN ('PENDING_PAYMENT', 'ACTIVE', 'COMPLETED', 'PAUSED', 'CANCELLED', 'EXPIRED', 'UPGRADED'));

CREATE INDEX IF NOT EXISTS idx_subscriptions_patient_ends_at
  ON public.subscriptions(patient_id, status, ends_at DESC);

-- 2. Coaching Sessions (90-Day Fitness Coach & Dietitian Masked Sessions)
CREATE TABLE IF NOT EXISTS public.coaching_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  coach_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  subscription_id UUID REFERENCES public.subscriptions(id) ON DELETE SET NULL,
  coach_role TEXT NOT NULL DEFAULT 'fitness_coach'
    CHECK (coach_role IN ('fitness_coach', 'dietitian', 'nutritionist', 'trainer')),
  title TEXT NOT NULL,
  scheduled_start TIMESTAMPTZ NOT NULL,
  scheduled_end TIMESTAMPTZ NOT NULL,
  meeting_url TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'SCHEDULED'
    CHECK (status IN ('SCHEDULED', 'COMPLETED', 'CANCELLED')),
  joined_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT coaching_sessions_time_window_check CHECK (scheduled_end > scheduled_start)
);

CREATE INDEX IF NOT EXISTS idx_coaching_sessions_user_start
  ON public.coaching_sessions(user_id, scheduled_start ASC);

CREATE INDEX IF NOT EXISTS idx_coaching_sessions_coach_start
  ON public.coaching_sessions(coach_id, scheduled_start ASC);

-- Lock down direct client access so meeting_url is NEVER readable from browser Supabase SDK
ALTER TABLE public.coaching_sessions ENABLE ROW LEVEL SECURITY;

-- 3. Single-use Join Tokens (anti-replay & user-bound)
CREATE TABLE IF NOT EXISTS public.coaching_session_join_tokens (
  jti UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES public.coaching_sessions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_coaching_join_tokens_session_user
  ON public.coaching_session_join_tokens(session_id, user_id, expires_at DESC);

ALTER TABLE public.coaching_session_join_tokens ENABLE ROW LEVEL SECURITY;
