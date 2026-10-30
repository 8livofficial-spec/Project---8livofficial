-- ==============================================================================
-- 8LIV HEALTH - WHATSAPP REMINDER SCHEDULER & ATOMIC OUTBOX CONCURRENCY
-- ==============================================================================
-- File: Database/whatsapp_cron_supabase_migration.sql
-- Description:
--   1. Enables required pg_cron and pg_net extensions in Supabase
--   2. Provides atomic FIFO queue claiming via FOR UPDATE SKIP LOCKED
--   3. Configures Supabase Vault secrets for secure CRON_SECRET auth
--   4. Defines public.trigger_whatsapp_outbox_cron() worker dispatcher
--   5. Registers 1-minute recurring pg_cron schedule (* * * * *)
-- ==============================================================================

-- 1. EXTENSIONS
-- pg_cron: PostgreSQL job scheduler
-- pg_net: Asynchronous HTTP client for background webhook/API calls
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- 2. PERFORMANCE INDEX FOR QUEUE POLLING & SCHEDULING
CREATE INDEX IF NOT EXISTS idx_whatsapp_outbox_due_jobs
  ON public.whatsapp_outbox_queue (status, next_attempt_at)
  WHERE status IN ('PENDING', 'FAILED');

-- 3. ATOMIC QUEUE CLAIM STORED FUNCTION (FOR UPDATE SKIP LOCKED)
-- Prevents race conditions and duplicate dispatches when workers run concurrently.
CREATE OR REPLACE FUNCTION public.claim_whatsapp_outbox_batch(batch_size INT DEFAULT 25)
RETURNS SETOF public.whatsapp_outbox_queue
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  WITH claimed AS (
    SELECT id
    FROM public.whatsapp_outbox_queue
    WHERE status IN ('PENDING', 'FAILED')
      AND next_attempt_at <= NOW()
    ORDER BY created_at ASC
    LIMIT batch_size
    FOR UPDATE SKIP LOCKED
  )
  UPDATE public.whatsapp_outbox_queue q
  SET status = 'PROCESSING',
      attempts = q.attempts + 1,
      updated_at = NOW()
  FROM claimed
  WHERE q.id = claimed.id
  RETURNING q.*;
END;
$$;

GRANT EXECUTE ON FUNCTION public.claim_whatsapp_outbox_batch(INT) TO service_role;
COMMENT ON FUNCTION public.claim_whatsapp_outbox_batch IS 'Atomically locks and claims up to batch_size pending/failed outbox rows using FOR UPDATE SKIP LOCKED.';

-- 4. CRON DISPATCH FUNCTION VIA SUPABASE VAULT & PG_NET
-- Securely retrieves CRON_SECRET and APP_SITE_URL from vault.decrypted_secrets
CREATE OR REPLACE FUNCTION public.trigger_whatsapp_outbox_cron()
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, vault
AS $$
DECLARE
  v_url TEXT;
  v_secret TEXT;
BEGIN
  -- Read secrets securely from Supabase Vault
  SELECT decrypted_secret INTO v_url
  FROM vault.decrypted_secrets
  WHERE name = 'app_site_url'
  LIMIT 1;

  SELECT decrypted_secret INTO v_secret
  FROM vault.decrypted_secrets
  WHERE name = 'cron_secret'
  LIMIT 1;

  -- Default to production domain if not explicitly set in Vault
  IF v_url IS NULL OR length(trim(v_url)) = 0 THEN
    v_url := 'https://www.8liv.in';
  END IF;

  -- Dispatch asynchronous HTTP POST to the Next.js API endpoint
  PERFORM net.http_post(
    url := rtrim(v_url, '/') || '/api/cron/whatsapp-outbox',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || COALESCE(v_secret, '')
    ),
    body := '{}'::jsonb
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.trigger_whatsapp_outbox_cron() TO postgres;
COMMENT ON FUNCTION public.trigger_whatsapp_outbox_cron IS 'Scheduled trigger function invoked by pg_cron to ping /api/cron/whatsapp-outbox every minute.';

-- 5. REGISTER PG_CRON SCHEDULE (EVERY 1 MINUTE)
-- Remove any previous version of the job to prevent duplicate schedules
DO $$
BEGIN
  PERFORM cron.unschedule('process-whatsapp-outbox-every-minute')
  WHERE EXISTS (
    SELECT 1 FROM cron.job WHERE jobname = 'process-whatsapp-outbox-every-minute'
  );
EXCEPTION
  WHEN OTHERS THEN NULL;
END $$;

-- Schedule the job to execute every minute (* * * * *)
SELECT cron.schedule(
  'process-whatsapp-outbox-every-minute',
  '* * * * *',
  'SELECT public.trigger_whatsapp_outbox_cron();'
);

-- ==============================================================================
-- SUPABASE VAULT INITIALIZATION INSTRUCTIONS:
-- Run the following in your Supabase SQL Editor once to set your production secrets:
--
-- SELECT vault.create_secret('YOUR_CRON_SECRET_HERE', 'cron_secret', 'Bearer secret for WhatsApp outbox worker');
-- SELECT vault.create_secret('https://www.8liv.in', 'app_site_url', 'Base URL of 8Liv Next.js app');
--
-- To update an existing secret later:
-- UPDATE vault.decrypted_secrets SET decrypted_secret = 'NEW_VALUE' WHERE name = 'cron_secret';
-- ==============================================================================

