-- 8liv provider onboarding, verification, compensation, wallet, and payout v2.
-- Non-destructive migration: this coexists with legacy provider_profiles,
-- wallet_accounts, wallet_ledger_transactions, and provider_payouts tables.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

DO $$ BEGIN
  CREATE TYPE public.provider_role_v2 AS ENUM ('DOCTOR','DIETITIAN','NUTRITIONIST','FITNESS_COACH');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.provider_onboarding_status AS ENUM ('NOT_STARTED','IN_PROGRESS','SUBMITTED','UNDER_REVIEW','CHANGES_REQUESTED','APPROVED','REJECTED','SUSPENDED','DEACTIVATED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.provider_account_status AS ENUM ('INVITED','ONBOARDING','REVIEW_PENDING','ACTIVE','LIMITED','SUSPENDED','DEACTIVATED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.provider_clinical_status AS ENUM ('PENDING','UNDER_REVIEW','APPROVED','CHANGES_REQUESTED','REJECTED','EXPIRED','SUSPENDED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.provider_kyc_status AS ENUM ('NOT_STARTED','PENDING','VERIFIED','FAILED','EXPIRED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.provider_bank_status AS ENUM ('NOT_CONFIGURED','PENDING','VERIFIED','FAILED','CHANGES_REQUESTED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.provider_payout_status_v2 AS ENUM ('NOT_CONFIGURED','VERIFICATION_PENDING','ACTIVE','ON_HOLD','FAILED','DISABLED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.provider_document_status AS ENUM ('UPLOADED','UNDER_REVIEW','APPROVED','REJECTED','CHANGES_REQUESTED','EXPIRED','REPLACED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.provider_earning_status AS ENUM ('CONFIGURATION_REQUIRED','PENDING','ELIGIBLE','APPROVED','ON_HOLD','INCLUDED_IN_PAYOUT','PAID','REVERSED','CANCELLED','DISPUTED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.provider_wallet_tx_type AS ENUM ('EARNING_CREDIT','HOLD','RELEASE_HOLD','PAYOUT_RESERVED','PAYOUT_COMPLETED','PAYOUT_FAILED','REVERSAL','ADJUSTMENT_CREDIT','ADJUSTMENT_DEBIT','TAX_WITHHOLDING');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.payout_batch_status AS ENUM ('DRAFT','CALCULATED','UNDER_REVIEW','APPROVED','PROCESSING','PARTIALLY_COMPLETED','COMPLETED','FAILED','CANCELLED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.provider_payout_record_status AS ENUM ('CREATED','APPROVED','QUEUED','PROCESSING','SUCCESS','FAILED','REVERSED','CANCELLED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.provider_profiles_v2 (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE REFERENCES auth.users(id) ON DELETE RESTRICT,
  legacy_provider_id UUID UNIQUE,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone_number TEXT,
  role public.provider_role_v2 NOT NULL,
  specialization TEXT,
  internal_reference TEXT,
  joining_date DATE,
  onboarding_status public.provider_onboarding_status NOT NULL DEFAULT 'NOT_STARTED',
  account_status public.provider_account_status NOT NULL DEFAULT 'INVITED',
  clinical_verification_status public.provider_clinical_status NOT NULL DEFAULT 'PENDING',
  identity_kyc_status public.provider_kyc_status NOT NULL DEFAULT 'NOT_STARTED',
  bank_verification_status public.provider_bank_status NOT NULL DEFAULT 'NOT_CONFIGURED',
  payout_status public.provider_payout_status_v2 NOT NULL DEFAULT 'NOT_CONFIGURED',
  payout_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  compensation_model_placeholder TEXT,
  internal_notes TEXT,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  version BIGINT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deactivated_at TIMESTAMPTZ,
  CONSTRAINT provider_profiles_v2_email_lower CHECK (email = lower(email))
);

CREATE UNIQUE INDEX IF NOT EXISTS provider_profiles_v2_email_unique ON public.provider_profiles_v2(email);
CREATE UNIQUE INDEX IF NOT EXISTS provider_profiles_v2_phone_unique ON public.provider_profiles_v2(phone_number) WHERE phone_number IS NOT NULL AND phone_number <> '';
CREATE INDEX IF NOT EXISTS provider_profiles_v2_status_idx ON public.provider_profiles_v2(role, onboarding_status, clinical_verification_status, payout_status, account_status);
CREATE INDEX IF NOT EXISTS provider_profiles_v2_user_idx ON public.provider_profiles_v2(user_id);

CREATE TABLE IF NOT EXISTS public.provider_activation_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id UUID NOT NULL REFERENCES public.provider_profiles_v2(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE,
  purpose TEXT NOT NULL CHECK (purpose IN ('PROVIDER_ACTIVATION','PROVIDER_RESEND')),
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,
  revoked_at TIMESTAMPTZ,
  attempt_count INTEGER NOT NULL DEFAULT 0 CHECK (attempt_count >= 0),
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS provider_activation_tokens_provider_idx ON public.provider_activation_tokens(provider_id, expires_at DESC);

CREATE TABLE IF NOT EXISTS public.provider_professional_details (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id UUID NOT NULL UNIQUE REFERENCES public.provider_profiles_v2(id) ON DELETE CASCADE,
  role public.provider_role_v2 NOT NULL,
  schema_version INTEGER NOT NULL DEFAULT 1,
  details JSONB NOT NULL DEFAULT '{}'::jsonb,
  verification_status public.provider_clinical_status NOT NULL DEFAULT 'PENDING',
  submitted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.provider_tax_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id UUID NOT NULL UNIQUE REFERENCES public.provider_profiles_v2(id) ON DELETE CASCADE,
  entity_type TEXT NOT NULL DEFAULT 'INDIVIDUAL',
  pan_ciphertext TEXT,
  pan_last4 TEXT,
  encryption_key_version TEXT,
  gst_number TEXT,
  registered_business_name TEXT,
  registered_address JSONB NOT NULL DEFAULT '{}'::jsonb,
  verification_status public.provider_kyc_status NOT NULL DEFAULT 'NOT_STARTED',
  tds_section TEXT,
  tds_rate NUMERIC(5,2),
  consent_captured_at TIMESTAMPTZ,
  verified_at TIMESTAMPTZ,
  verified_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT provider_tax_profiles_pan_last4 CHECK (pan_last4 IS NULL OR pan_last4 ~ '^[A-Z0-9]{4}$')
);

CREATE TABLE IF NOT EXISTS public.provider_payout_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id UUID NOT NULL UNIQUE REFERENCES public.provider_profiles_v2(id) ON DELETE CASCADE,
  encrypted_account_number TEXT,
  account_number_last4 TEXT,
  beneficiary_name TEXT,
  ifsc_encrypted TEXT,
  ifsc_last4 TEXT,
  bank_name TEXT,
  branch_name TEXT,
  account_type TEXT,
  upi_id TEXT,
  preferred_payout_method TEXT NOT NULL DEFAULT 'BANK_TRANSFER',
  payout_provider TEXT NOT NULL DEFAULT 'MANUAL',
  payout_provider_account_id TEXT,
  bank_verification_status public.provider_bank_status NOT NULL DEFAULT 'NOT_CONFIGURED',
  payout_status public.provider_payout_status_v2 NOT NULL DEFAULT 'NOT_CONFIGURED',
  payout_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  hold_reason TEXT,
  duplicate_review_required BOOLEAN NOT NULL DEFAULT FALSE,
  verified_at TIMESTAMPTZ,
  verified_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  consent_captured_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT provider_payout_profiles_last4 CHECK (account_number_last4 IS NULL OR account_number_last4 ~ '^[0-9]{4}$')
);

CREATE INDEX IF NOT EXISTS provider_payout_profiles_status_idx ON public.provider_payout_profiles(bank_verification_status, payout_status);
CREATE INDEX IF NOT EXISTS provider_payout_profiles_account_last4_idx ON public.provider_payout_profiles(account_number_last4);

CREATE TABLE IF NOT EXISTS public.provider_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id UUID NOT NULL REFERENCES public.provider_profiles_v2(id) ON DELETE CASCADE,
  document_type TEXT NOT NULL,
  current_version_id UUID,
  status public.provider_document_status NOT NULL DEFAULT 'UPLOADED',
  required BOOLEAN NOT NULL DEFAULT TRUE,
  verification_notes TEXT,
  provider_visible_feedback TEXT,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE UNIQUE INDEX IF NOT EXISTS provider_documents_one_current_type ON public.provider_documents(provider_id, document_type) WHERE status <> 'REPLACED';

CREATE TABLE IF NOT EXISTS public.provider_document_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES public.provider_documents(id) ON DELETE CASCADE,
  provider_id UUID NOT NULL REFERENCES public.provider_profiles_v2(id) ON DELETE CASCADE,
  version INTEGER NOT NULL,
  bucket TEXT NOT NULL DEFAULT 'provider-private-documents',
  storage_path TEXT NOT NULL,
  file_name TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  byte_size BIGINT NOT NULL CHECK (byte_size > 0),
  sha256_hash TEXT NOT NULL,
  status public.provider_document_status NOT NULL DEFAULT 'UPLOADED',
  uploaded_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewed_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ,
  rejection_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(document_id, version),
  UNIQUE(bucket, storage_path)
);

DO $$ BEGIN
  ALTER TABLE public.provider_documents
    ADD CONSTRAINT provider_documents_current_version_fk
    FOREIGN KEY (current_version_id) REFERENCES public.provider_document_versions(id) ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.provider_agreements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agreement_type TEXT NOT NULL,
  agreement_version TEXT NOT NULL,
  title TEXT NOT NULL,
  document_hash TEXT NOT NULL,
  content_url TEXT,
  effective_from TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  retired_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(agreement_type, agreement_version)
);

CREATE TABLE IF NOT EXISTS public.provider_agreement_acceptances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id UUID NOT NULL REFERENCES public.provider_profiles_v2(id) ON DELETE CASCADE,
  agreement_id UUID NOT NULL REFERENCES public.provider_agreements(id) ON DELETE RESTRICT,
  agreement_type TEXT NOT NULL,
  agreement_version TEXT NOT NULL,
  document_hash TEXT NOT NULL,
  accepted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ip_address TEXT,
  user_agent TEXT,
  evidence JSONB NOT NULL DEFAULT '{}'::jsonb,
  revoked_at TIMESTAMPTZ,
  UNIQUE(provider_id, agreement_type, agreement_version)
);

CREATE TABLE IF NOT EXISTS public.provider_onboarding_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id UUID NOT NULL REFERENCES public.provider_profiles_v2(id) ON DELETE CASCADE,
  submission_version INTEGER NOT NULL,
  snapshot JSONB NOT NULL,
  status public.provider_onboarding_status NOT NULL DEFAULT 'SUBMITTED',
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(provider_id, submission_version)
);

CREATE TABLE IF NOT EXISTS public.provider_verification_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id UUID NOT NULL REFERENCES public.provider_profiles_v2(id) ON DELETE CASCADE,
  submission_id UUID REFERENCES public.provider_onboarding_submissions(id) ON DELETE SET NULL,
  section TEXT NOT NULL,
  decision TEXT NOT NULL CHECK (decision IN ('APPROVED','REJECTED','CHANGES_REQUESTED','SUSPENDED')),
  internal_notes TEXT,
  provider_visible_feedback TEXT,
  reviewed_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  reviewed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS provider_verification_reviews_provider_idx ON public.provider_verification_reviews(provider_id, reviewed_at DESC);

CREATE TABLE IF NOT EXISTS public.provider_compensation_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id UUID REFERENCES public.provider_profiles_v2(id) ON DELETE RESTRICT,
  provider_role public.provider_role_v2,
  service_type TEXT NOT NULL,
  membership_plan_id UUID,
  appointment_type TEXT,
  calculation_type TEXT NOT NULL CHECK (calculation_type IN ('FIXED','PERCENTAGE','HYBRID','CONTRACT')),
  fixed_amount NUMERIC(14,2),
  percentage NUMERIC(7,4),
  minimum_amount NUMERIC(14,2),
  maximum_amount NUMERIC(14,2),
  currency TEXT NOT NULL DEFAULT 'INR',
  effective_from TIMESTAMPTZ NOT NULL,
  effective_until TIMESTAMPTZ,
  version INTEGER NOT NULL DEFAULT 1,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  approved_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT provider_compensation_rules_amount CHECK (
    (calculation_type IN ('FIXED','HYBRID','CONTRACT') AND fixed_amount IS NOT NULL AND fixed_amount >= 0)
    OR (calculation_type = 'PERCENTAGE' AND percentage IS NOT NULL)
  )
);
CREATE INDEX IF NOT EXISTS provider_comp_rules_lookup_idx ON public.provider_compensation_rules(provider_id, provider_role, service_type, active, effective_from DESC);

CREATE TABLE IF NOT EXISTS public.provider_earnings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id UUID NOT NULL REFERENCES public.provider_profiles_v2(id) ON DELETE RESTRICT,
  source_type TEXT NOT NULL,
  source_id UUID NOT NULL,
  consultation_id UUID,
  appointment_id UUID,
  patient_payment_id UUID,
  membership_id UUID,
  service_type TEXT NOT NULL,
  compensation_rule_id UUID REFERENCES public.provider_compensation_rules(id) ON DELETE RESTRICT,
  compensation_rule_version INTEGER,
  calculation_snapshot JSONB NOT NULL DEFAULT '{}'::jsonb,
  gross_amount NUMERIC(14,2) NOT NULL DEFAULT 0,
  platform_adjustment NUMERIC(14,2) NOT NULL DEFAULT 0,
  tax_withheld NUMERIC(14,2) NOT NULL DEFAULT 0,
  other_deductions NUMERIC(14,2) NOT NULL DEFAULT 0,
  net_amount NUMERIC(14,2) NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'INR',
  status public.provider_earning_status NOT NULL,
  hold_reason TEXT,
  earned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  eligible_at TIMESTAMPTZ,
  approved_at TIMESTAMPTZ,
  paid_at TIMESTAMPTZ,
  reversed_at TIMESTAMPTZ,
  reversal_reason TEXT,
  idempotency_key TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT provider_earnings_no_silent_zero CHECK (
    status = 'CONFIGURATION_REQUIRED'
    OR status = 'CANCELLED'
    OR status = 'REVERSED'
    OR net_amount > 0
  )
);
CREATE UNIQUE INDEX IF NOT EXISTS provider_earnings_one_per_source ON public.provider_earnings(provider_id, source_type, source_id);
CREATE INDEX IF NOT EXISTS provider_earnings_provider_status_idx ON public.provider_earnings(provider_id, status, earned_at DESC);
CREATE INDEX IF NOT EXISTS provider_earnings_consultation_idx ON public.provider_earnings(consultation_id);

CREATE TABLE IF NOT EXISTS public.provider_wallets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id UUID NOT NULL REFERENCES public.provider_profiles_v2(id) ON DELETE RESTRICT,
  currency TEXT NOT NULL DEFAULT 'INR',
  pending_balance NUMERIC(14,2) NOT NULL DEFAULT 0,
  eligible_balance NUMERIC(14,2) NOT NULL DEFAULT 0,
  on_hold_balance NUMERIC(14,2) NOT NULL DEFAULT 0,
  processing_balance NUMERIC(14,2) NOT NULL DEFAULT 0,
  paid_total NUMERIC(14,2) NOT NULL DEFAULT 0,
  reversed_total NUMERIC(14,2) NOT NULL DEFAULT 0,
  version BIGINT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(provider_id, currency)
);

CREATE TABLE IF NOT EXISTS public.provider_wallet_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_id UUID NOT NULL REFERENCES public.provider_wallets(id) ON DELETE RESTRICT,
  provider_id UUID NOT NULL REFERENCES public.provider_profiles_v2(id) ON DELETE RESTRICT,
  earning_id UUID REFERENCES public.provider_earnings(id) ON DELETE RESTRICT,
  payout_id UUID,
  transaction_type public.provider_wallet_tx_type NOT NULL,
  amount NUMERIC(14,2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'INR',
  balance_category TEXT NOT NULL CHECK (balance_category IN ('PENDING','ELIGIBLE','ON_HOLD','PROCESSING','PAID','REVERSED')),
  reference_type TEXT NOT NULL,
  reference_id UUID,
  idempotency_key TEXT NOT NULL UNIQUE,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS provider_wallet_tx_provider_created_idx ON public.provider_wallet_transactions(provider_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.payout_batches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_number TEXT NOT NULL UNIQUE,
  schedule_type TEXT NOT NULL DEFAULT 'MANUAL',
  currency TEXT NOT NULL DEFAULT 'INR',
  status public.payout_batch_status NOT NULL DEFAULT 'DRAFT',
  gross_amount NUMERIC(14,2) NOT NULL DEFAULT 0,
  tax_withheld NUMERIC(14,2) NOT NULL DEFAULT 0,
  deductions NUMERIC(14,2) NOT NULL DEFAULT 0,
  net_amount NUMERIC(14,2) NOT NULL DEFAULT 0,
  created_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  approved_by UUID REFERENCES public.profiles(id) ON DELETE RESTRICT,
  approved_at TIMESTAMPTZ,
  processed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT payout_batches_dual_control CHECK (approved_by IS NULL OR approved_by <> created_by)
);

CREATE TABLE IF NOT EXISTS public.provider_payout_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id UUID NOT NULL REFERENCES public.provider_profiles_v2(id) ON DELETE RESTRICT,
  payout_batch_id UUID REFERENCES public.payout_batches(id) ON DELETE RESTRICT,
  payout_provider TEXT NOT NULL DEFAULT 'MANUAL',
  payout_provider_account_id TEXT,
  payout_provider_reference TEXT UNIQUE,
  gross_amount NUMERIC(14,2) NOT NULL DEFAULT 0,
  tax_withheld NUMERIC(14,2) NOT NULL DEFAULT 0,
  deductions NUMERIC(14,2) NOT NULL DEFAULT 0,
  net_amount NUMERIC(14,2) NOT NULL CHECK (net_amount >= 0),
  currency TEXT NOT NULL DEFAULT 'INR',
  status public.provider_payout_record_status NOT NULL DEFAULT 'CREATED',
  failure_code TEXT,
  failure_reason TEXT,
  initiated_at TIMESTAMPTZ,
  processed_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  failed_at TIMESTAMPTZ,
  idempotency_key TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.payout_earning_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payout_id UUID NOT NULL REFERENCES public.provider_payout_records(id) ON DELETE RESTRICT,
  earning_id UUID NOT NULL REFERENCES public.provider_earnings(id) ON DELETE RESTRICT,
  amount NUMERIC(14,2) NOT NULL CHECK (amount > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(earning_id)
);

CREATE TABLE IF NOT EXISTS public.payout_exceptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id UUID REFERENCES public.provider_profiles_v2(id) ON DELETE SET NULL,
  earning_id UUID REFERENCES public.provider_earnings(id) ON DELETE SET NULL,
  source_type TEXT,
  source_id UUID,
  exception_code TEXT NOT NULL,
  severity TEXT NOT NULL DEFAULT 'HIGH',
  message TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'OPEN' CHECK (status IN ('OPEN','ACKNOWLEDGED','RESOLVED','CANCELLED')),
  resolution_notes TEXT,
  resolved_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.provider_disputes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id UUID NOT NULL REFERENCES public.provider_profiles_v2(id) ON DELETE CASCADE,
  dispute_type TEXT NOT NULL,
  resource_type TEXT,
  resource_id UUID,
  description TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'OPEN' CHECK (status IN ('OPEN','UNDER_REVIEW','RESOLVED','REJECTED','CANCELLED')),
  resolution TEXT,
  resolved_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.tax_withholding_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id UUID NOT NULL REFERENCES public.provider_profiles_v2(id) ON DELETE RESTRICT,
  earning_id UUID REFERENCES public.provider_earnings(id) ON DELETE RESTRICT,
  tds_section TEXT NOT NULL,
  rate NUMERIC(7,4) NOT NULL,
  taxable_amount NUMERIC(14,2) NOT NULL,
  withheld_amount NUMERIC(14,2) NOT NULL,
  period TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.provider_offboarding_settlements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id UUID NOT NULL REFERENCES public.provider_profiles_v2(id) ON DELETE RESTRICT,
  status TEXT NOT NULL DEFAULT 'DRAFT',
  final_eligible_amount NUMERIC(14,2) NOT NULL DEFAULT 0,
  final_on_hold_amount NUMERIC(14,2) NOT NULL DEFAULT 0,
  payout_batch_id UUID REFERENCES public.payout_batches(id) ON DELETE SET NULL,
  reason TEXT,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.data_erasure_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id UUID REFERENCES public.provider_profiles_v2(id) ON DELETE SET NULL,
  requester_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  request_type TEXT NOT NULL DEFAULT 'PSEUDONYMIZE_PII',
  status TEXT NOT NULL DEFAULT 'PENDING',
  requested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  processed_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  processed_at TIMESTAMPTZ,
  notes TEXT
);

CREATE TABLE IF NOT EXISTS public.provider_audit_logs (
  id BIGSERIAL PRIMARY KEY,
  actor_id UUID,
  actor_role TEXT,
  action TEXT NOT NULL,
  resource_type TEXT NOT NULL,
  resource_id UUID,
  provider_id UUID REFERENCES public.provider_profiles_v2(id) ON DELETE SET NULL,
  previous_values JSONB,
  new_values JSONB,
  reason TEXT,
  ip_address TEXT,
  user_agent TEXT,
  request_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS provider_audit_logs_provider_created_idx ON public.provider_audit_logs(provider_id, created_at DESC);
CREATE INDEX IF NOT EXISTS provider_audit_logs_resource_idx ON public.provider_audit_logs(resource_type, resource_id);

CREATE TABLE IF NOT EXISTS public.idempotency_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scope TEXT NOT NULL,
  idempotency_key TEXT NOT NULL,
  request_hash TEXT,
  response JSONB,
  status TEXT NOT NULL DEFAULT 'STARTED' CHECK (status IN ('STARTED','COMPLETED','FAILED')),
  locked_until TIMESTAMPTZ,
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '90 days'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(scope, idempotency_key)
);

CREATE OR REPLACE FUNCTION public.recalculate_provider_wallet_v2(p_wallet_id UUID)
RETURNS public.provider_wallets
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_wallet public.provider_wallets;
BEGIN
  SELECT * INTO v_wallet FROM public.provider_wallets WHERE id = p_wallet_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Wallet not found';
  END IF;

  UPDATE public.provider_wallets w
  SET
    pending_balance = COALESCE((SELECT SUM(amount) FROM public.provider_wallet_transactions WHERE wallet_id = p_wallet_id AND balance_category = 'PENDING'), 0),
    eligible_balance = COALESCE((SELECT SUM(amount) FROM public.provider_wallet_transactions WHERE wallet_id = p_wallet_id AND balance_category = 'ELIGIBLE'), 0),
    on_hold_balance = COALESCE((SELECT SUM(amount) FROM public.provider_wallet_transactions WHERE wallet_id = p_wallet_id AND balance_category = 'ON_HOLD'), 0),
    processing_balance = COALESCE((SELECT SUM(amount) FROM public.provider_wallet_transactions WHERE wallet_id = p_wallet_id AND balance_category = 'PROCESSING'), 0),
    paid_total = COALESCE((SELECT SUM(amount) FROM public.provider_wallet_transactions WHERE wallet_id = p_wallet_id AND balance_category = 'PAID'), 0),
    reversed_total = COALESCE((SELECT SUM(amount) FROM public.provider_wallet_transactions WHERE wallet_id = p_wallet_id AND balance_category = 'REVERSED'), 0),
    version = w.version + 1,
    updated_at = NOW()
  WHERE w.id = p_wallet_id
  RETURNING * INTO v_wallet;

  RETURN v_wallet;
END $$;

CREATE OR REPLACE FUNCTION public.create_provider_earning_v2(
  p_provider_id UUID,
  p_source_type TEXT,
  p_source_id UUID,
  p_service_type TEXT,
  p_eligible_payment_amount NUMERIC,
  p_idempotency_key TEXT
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_provider public.provider_profiles_v2;
  v_rule public.provider_compensation_rules;
  v_wallet public.provider_wallets;
  v_earning public.provider_earnings;
  v_amount NUMERIC(14,2);
  v_status public.provider_earning_status;
  v_balance_category TEXT;
  v_hold_reason TEXT;
BEGIN
  SELECT * INTO v_earning FROM public.provider_earnings WHERE idempotency_key = p_idempotency_key;
  IF FOUND THEN
    RETURN jsonb_build_object('earningId', v_earning.id, 'duplicate', true, 'status', v_earning.status, 'netAmount', v_earning.net_amount);
  END IF;

  SELECT * INTO v_provider FROM public.provider_profiles_v2 WHERE id = p_provider_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Provider not found';
  END IF;

  SELECT * INTO v_rule
  FROM public.provider_compensation_rules
  WHERE active = TRUE
    AND service_type = p_service_type
    AND (provider_id = p_provider_id OR provider_id IS NULL)
    AND (provider_role = v_provider.role OR provider_role IS NULL)
    AND effective_from <= NOW()
    AND (effective_until IS NULL OR effective_until > NOW())
  ORDER BY
    CASE WHEN provider_id = p_provider_id THEN 0 ELSE 1 END,
    CASE WHEN provider_role = v_provider.role THEN 0 ELSE 1 END,
    effective_from DESC,
    version DESC
  LIMIT 1;

  IF NOT FOUND THEN
    INSERT INTO public.provider_earnings(provider_id, source_type, source_id, service_type, status, hold_reason, idempotency_key, calculation_snapshot)
    VALUES (p_provider_id, p_source_type, p_source_id, p_service_type, 'CONFIGURATION_REQUIRED', 'PAYOUT_CONFIGURATION_MISSING', p_idempotency_key, jsonb_build_object('errorCode','PAYOUT_CONFIGURATION_MISSING'))
    RETURNING * INTO v_earning;

    INSERT INTO public.payout_exceptions(provider_id, earning_id, source_type, source_id, exception_code, message)
    VALUES (p_provider_id, v_earning.id, p_source_type, p_source_id, 'PAYOUT_CONFIGURATION_MISSING', 'No active compensation rule matched this completed service.');

    RETURN jsonb_build_object('earningId', v_earning.id, 'duplicate', false, 'status', v_earning.status, 'errorCode', 'PAYOUT_CONFIGURATION_MISSING');
  END IF;

  IF v_rule.calculation_type = 'FIXED' OR v_rule.calculation_type = 'CONTRACT' THEN
    v_amount := ROUND(v_rule.fixed_amount, 2);
  ELSIF v_rule.calculation_type = 'PERCENTAGE' THEN
    v_amount := ROUND(COALESCE(p_eligible_payment_amount, 0) * v_rule.percentage / 100, 2);
  ELSE
    v_amount := ROUND(COALESCE(v_rule.fixed_amount, 0) + (COALESCE(p_eligible_payment_amount, 0) * COALESCE(v_rule.percentage, 0) / 100), 2);
  END IF;

  IF v_rule.minimum_amount IS NOT NULL THEN v_amount := GREATEST(v_amount, v_rule.minimum_amount); END IF;
  IF v_rule.maximum_amount IS NOT NULL THEN v_amount := LEAST(v_amount, v_rule.maximum_amount); END IF;
  IF COALESCE(v_amount, 0) <= 0 THEN
    RAISE EXCEPTION 'PAYOUT_CONFIGURATION_MISSING';
  END IF;

  IF v_provider.bank_verification_status = 'VERIFIED' AND v_provider.payout_status = 'ACTIVE' THEN
    v_status := 'ELIGIBLE';
    v_balance_category := 'ELIGIBLE';
    v_hold_reason := NULL;
  ELSE
    v_status := 'ON_HOLD';
    v_balance_category := 'ON_HOLD';
    v_hold_reason := 'PAYOUT_PROFILE_INCOMPLETE';
  END IF;

  INSERT INTO public.provider_earnings(
    provider_id, source_type, source_id, service_type, compensation_rule_id, compensation_rule_version,
    calculation_snapshot, gross_amount, net_amount, currency, status, hold_reason, eligible_at, idempotency_key
  )
  VALUES (
    p_provider_id, p_source_type, p_source_id, p_service_type, v_rule.id, v_rule.version,
    jsonb_build_object('serviceType',p_service_type,'ruleId',v_rule.id,'ruleVersion',v_rule.version,'calculationType',v_rule.calculation_type,'fixedAmount',v_rule.fixed_amount,'percentage',v_rule.percentage,'eligiblePaymentAmount',p_eligible_payment_amount),
    v_amount, v_amount, v_rule.currency, v_status, v_hold_reason, CASE WHEN v_status = 'ELIGIBLE' THEN NOW() ELSE NULL END, p_idempotency_key
  )
  RETURNING * INTO v_earning;

  INSERT INTO public.provider_wallets(provider_id, currency) VALUES (p_provider_id, v_rule.currency)
  ON CONFLICT(provider_id, currency) DO NOTHING;

  SELECT * INTO v_wallet FROM public.provider_wallets WHERE provider_id = p_provider_id AND currency = v_rule.currency FOR UPDATE;

  INSERT INTO public.provider_wallet_transactions(
    wallet_id, provider_id, earning_id, transaction_type, amount, currency, balance_category, reference_type, reference_id, idempotency_key, metadata
  )
  VALUES (
    v_wallet.id, p_provider_id, v_earning.id, 'EARNING_CREDIT', v_amount, v_rule.currency, v_balance_category, p_source_type, p_source_id,
    p_idempotency_key || ':wallet-credit', jsonb_build_object('holdReason', v_hold_reason)
  );

  PERFORM public.recalculate_provider_wallet_v2(v_wallet.id);

  RETURN jsonb_build_object('earningId', v_earning.id, 'duplicate', false, 'status', v_earning.status, 'netAmount', v_earning.net_amount, 'holdReason', v_earning.hold_reason);
EXCEPTION WHEN unique_violation THEN
  SELECT * INTO v_earning FROM public.provider_earnings WHERE provider_id = p_provider_id AND source_type = p_source_type AND source_id = p_source_id;
  RETURN jsonb_build_object('earningId', v_earning.id, 'duplicate', true, 'status', v_earning.status, 'netAmount', v_earning.net_amount);
END $$;

CREATE OR REPLACE FUNCTION public.release_provider_payout_holds_v2(p_provider_id UUID, p_actor_id UUID DEFAULT NULL)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_provider public.provider_profiles_v2;
  v_wallet public.provider_wallets;
  v_count INTEGER := 0;
  v_total NUMERIC(14,2) := 0;
  v_earning public.provider_earnings;
BEGIN
  SELECT * INTO v_provider FROM public.provider_profiles_v2 WHERE id = p_provider_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Provider not found'; END IF;
  IF v_provider.bank_verification_status <> 'VERIFIED' OR v_provider.payout_status <> 'ACTIVE' THEN
    RAISE EXCEPTION 'Payout profile is not active';
  END IF;

  INSERT INTO public.provider_wallets(provider_id, currency) VALUES (p_provider_id, 'INR') ON CONFLICT(provider_id, currency) DO NOTHING;
  SELECT * INTO v_wallet FROM public.provider_wallets WHERE provider_id = p_provider_id AND currency = 'INR' FOR UPDATE;

  FOR v_earning IN
    SELECT * FROM public.provider_earnings
    WHERE provider_id = p_provider_id AND status = 'ON_HOLD' AND hold_reason = 'PAYOUT_PROFILE_INCOMPLETE'
    FOR UPDATE
  LOOP
    UPDATE public.provider_earnings SET status = 'ELIGIBLE', hold_reason = NULL, eligible_at = NOW() WHERE id = v_earning.id;

    INSERT INTO public.provider_wallet_transactions(wallet_id, provider_id, earning_id, transaction_type, amount, currency, balance_category, reference_type, reference_id, idempotency_key, metadata)
    VALUES (v_wallet.id, p_provider_id, v_earning.id, 'HOLD', -v_earning.net_amount, v_earning.currency, 'ON_HOLD', 'EARNING', v_earning.id, 'release-hold:' || v_earning.id || ':debit', '{}'::jsonb)
    ON CONFLICT(idempotency_key) DO NOTHING;

    INSERT INTO public.provider_wallet_transactions(wallet_id, provider_id, earning_id, transaction_type, amount, currency, balance_category, reference_type, reference_id, idempotency_key, metadata)
    VALUES (v_wallet.id, p_provider_id, v_earning.id, 'RELEASE_HOLD', v_earning.net_amount, v_earning.currency, 'ELIGIBLE', 'EARNING', v_earning.id, 'release-hold:' || v_earning.id || ':credit', '{}'::jsonb)
    ON CONFLICT(idempotency_key) DO NOTHING;

    v_count := v_count + 1;
    v_total := v_total + v_earning.net_amount;
  END LOOP;

  PERFORM public.recalculate_provider_wallet_v2(v_wallet.id);
  RETURN jsonb_build_object('releasedCount', v_count, 'releasedAmount', v_total);
END $$;

ALTER TABLE public.provider_profiles_v2 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.provider_activation_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.provider_professional_details ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.provider_tax_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.provider_payout_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.provider_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.provider_document_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.provider_agreements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.provider_agreement_acceptances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.provider_onboarding_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.provider_verification_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.provider_compensation_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.provider_earnings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.provider_wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.provider_wallet_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payout_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.provider_payout_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payout_earning_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payout_exceptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.provider_audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.idempotency_keys ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.current_profile_role()
RETURNS TEXT LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid()
$$;

CREATE OR REPLACE FUNCTION public.current_provider_profile_v2_id()
RETURNS UUID LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT id FROM public.provider_profiles_v2 WHERE user_id = auth.uid()
$$;

DO $$ BEGIN
  CREATE POLICY provider_profiles_v2_provider_select ON public.provider_profiles_v2
    FOR SELECT USING (user_id = auth.uid() OR public.current_profile_role() IN ('admin','finance','clinical_reviewer'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY provider_profiles_v2_provider_update_onboarding ON public.provider_profiles_v2
    FOR UPDATE USING (user_id = auth.uid() AND onboarding_status IN ('NOT_STARTED','IN_PROGRESS','CHANGES_REQUESTED'))
    WITH CHECK (user_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY provider_owned_select_professional ON public.provider_professional_details
    FOR SELECT USING (provider_id = public.current_provider_profile_v2_id() OR public.current_profile_role() IN ('admin','clinical_reviewer'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY provider_owned_insert_professional ON public.provider_professional_details
    FOR INSERT WITH CHECK (
      provider_id = public.current_provider_profile_v2_id()
      AND EXISTS (
        SELECT 1 FROM public.provider_profiles_v2 pp
        WHERE pp.id = provider_id
          AND pp.user_id = auth.uid()
          AND pp.onboarding_status IN ('NOT_STARTED','IN_PROGRESS','CHANGES_REQUESTED')
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY provider_owned_update_professional ON public.provider_professional_details
    FOR UPDATE USING (
      provider_id = public.current_provider_profile_v2_id()
      AND EXISTS (
        SELECT 1 FROM public.provider_profiles_v2 pp
        WHERE pp.id = provider_id
          AND pp.user_id = auth.uid()
          AND pp.onboarding_status IN ('NOT_STARTED','IN_PROGRESS','CHANGES_REQUESTED')
      )
    )
    WITH CHECK (provider_id = public.current_provider_profile_v2_id());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY provider_tax_restricted_select ON public.provider_tax_profiles
    FOR SELECT USING (provider_id = public.current_provider_profile_v2_id() OR public.current_profile_role() IN ('admin','finance'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY provider_payout_restricted_select ON public.provider_payout_profiles
    FOR SELECT USING (provider_id = public.current_provider_profile_v2_id() OR public.current_profile_role() IN ('admin','finance'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY provider_documents_select ON public.provider_documents
    FOR SELECT USING (provider_id = public.current_provider_profile_v2_id() OR public.current_profile_role() IN ('admin','finance','clinical_reviewer'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY provider_document_versions_select ON public.provider_document_versions
    FOR SELECT USING (provider_id = public.current_provider_profile_v2_id() OR public.current_profile_role() IN ('admin','finance','clinical_reviewer'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY provider_acceptances_select ON public.provider_agreement_acceptances
    FOR SELECT USING (provider_id = public.current_provider_profile_v2_id() OR public.current_profile_role() IN ('admin','finance','clinical_reviewer'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY provider_finance_select_earnings ON public.provider_earnings
    FOR SELECT USING (provider_id = public.current_provider_profile_v2_id() OR public.current_profile_role() IN ('admin','finance'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY provider_finance_select_wallets ON public.provider_wallets
    FOR SELECT USING (provider_id = public.current_provider_profile_v2_id() OR public.current_profile_role() IN ('admin','finance'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY provider_finance_select_wallet_transactions ON public.provider_wallet_transactions
    FOR SELECT USING (provider_id = public.current_provider_profile_v2_id() OR public.current_profile_role() IN ('admin','finance'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY provider_finance_select_payout_records ON public.provider_payout_records
    FOR SELECT USING (provider_id = public.current_provider_profile_v2_id() OR public.current_profile_role() IN ('admin','finance'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Authenticated clients should not receive encrypted PAN/account ciphertext
-- through direct Supabase queries. Server APIs use service_role and return
-- masked fields only.
REVOKE SELECT ON public.provider_tax_profiles FROM anon, authenticated;
GRANT SELECT (
  id,
  provider_id,
  entity_type,
  pan_last4,
  gst_number,
  registered_business_name,
  registered_address,
  verification_status,
  tds_section,
  tds_rate,
  consent_captured_at,
  verified_at,
  verified_by,
  created_at,
  updated_at
) ON public.provider_tax_profiles TO authenticated;

REVOKE SELECT ON public.provider_payout_profiles FROM anon, authenticated;
GRANT SELECT (
  id,
  provider_id,
  account_number_last4,
  beneficiary_name,
  ifsc_last4,
  bank_name,
  branch_name,
  account_type,
  upi_id,
  preferred_payout_method,
  payout_provider,
  bank_verification_status,
  payout_status,
  payout_enabled,
  hold_reason,
  duplicate_review_required,
  verified_at,
  verified_by,
  consent_captured_at,
  created_at,
  updated_at
) ON public.provider_payout_profiles TO authenticated;

-- Financial and verification writes intentionally have no anon/authenticated
-- write policies. They must go through audited service-layer RPC/API calls.
REVOKE ALL ON FUNCTION public.create_provider_earning_v2(UUID,TEXT,UUID,TEXT,NUMERIC,TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.release_provider_payout_holds_v2(UUID,UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.recalculate_provider_wallet_v2(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_provider_earning_v2(UUID,TEXT,UUID,TEXT,NUMERIC,TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION public.release_provider_payout_holds_v2(UUID,UUID) TO service_role;
GRANT EXECUTE ON FUNCTION public.recalculate_provider_wallet_v2(UUID) TO service_role;

INSERT INTO public.provider_agreements(agreement_type, agreement_version, title, document_hash)
VALUES
  ('PROVIDER_SERVICE_AGREEMENT','2026-07-12','8liv Provider Service Agreement','pending-legal-document-hash'),
  ('CONFIDENTIALITY','2026-07-12','Confidentiality and Data Protection Terms','pending-legal-document-hash'),
  ('PAYOUT_COMPENSATION','2026-07-12','Payout and Compensation Terms','pending-legal-document-hash'),
  ('CODE_OF_CONDUCT','2026-07-12','Provider Code of Conduct','pending-legal-document-hash')
ON CONFLICT (agreement_type, agreement_version) DO NOTHING;

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'provider-private-documents',
  'provider-private-documents',
  FALSE,
  10485760,
  ARRAY['application/pdf','image/jpeg','image/png','image/webp']
)
ON CONFLICT (id) DO UPDATE
SET public = FALSE,
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

DO $$ BEGIN
  CREATE POLICY provider_private_documents_provider_read_own ON storage.objects
    FOR SELECT USING (
      bucket_id = 'provider-private-documents'
      AND EXISTS (
        SELECT 1
        FROM public.provider_profiles_v2 pp
        WHERE pp.user_id = auth.uid()
          AND name LIKE pp.id::text || '/%'
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY provider_private_documents_provider_upload_own ON storage.objects
    FOR INSERT WITH CHECK (
      bucket_id = 'provider-private-documents'
      AND EXISTS (
        SELECT 1
        FROM public.provider_profiles_v2 pp
        WHERE pp.user_id = auth.uid()
          AND name LIKE pp.id::text || '/%'
          AND pp.onboarding_status IN ('NOT_STARTED','IN_PROGRESS','CHANGES_REQUESTED')
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY provider_private_documents_admin_read ON storage.objects
    FOR SELECT USING (
      bucket_id = 'provider-private-documents'
      AND public.current_profile_role() IN ('admin','finance','clinical_reviewer')
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
