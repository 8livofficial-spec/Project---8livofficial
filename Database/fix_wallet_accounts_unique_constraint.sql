-- Fix for PostgreSQL 42P10 "there is no unique or exclusion constraint matching the ON CONFLICT specification"
-- Ensures wallet_accounts has a UNIQUE constraint on provider_id so ON CONFLICT (provider_id) works in all stored procedures.

DO $$
BEGIN
  -- 1. Deduplicate wallet_accounts if any duplicates exist (keeping the most recently updated)
  DELETE FROM public.wallet_accounts a
  USING public.wallet_accounts b
  WHERE a.provider_id = b.provider_id
    AND a.id <> b.id
    AND a.updated_at < b.updated_at;

  -- 2. Create unique index if it doesn't already exist
  IF NOT EXISTS (
    SELECT 1 FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE c.relname = 'wallet_accounts_provider_id_unique' AND n.nspname = 'public'
  ) THEN
    CREATE UNIQUE INDEX wallet_accounts_provider_id_unique ON public.wallet_accounts(provider_id);
  END IF;

  -- 3. Add explicit UNIQUE constraint using the index if not already present
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'wallet_accounts_provider_id_key'
  ) THEN
    ALTER TABLE public.wallet_accounts
    ADD CONSTRAINT wallet_accounts_provider_id_key UNIQUE USING INDEX wallet_accounts_provider_id_unique;
  END IF;
END $$;
