-- 8liv: Master Financial Architecture Unification & Atomic Payout Reservation v3 SQL
-- Migration for unifying all provider roles to canonical V2 financial ledger and atomic FOR UPDATE reservation.

CREATE OR REPLACE FUNCTION public.request_provider_payout_v3(
  p_provider_id UUID,
  p_amount NUMERIC,
  p_idempotency_key TEXT,
  p_initiated_by UUID DEFAULT NULL
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_provider public.provider_profiles_v2;
  v_wallet public.provider_wallets;
  v_payout public.provider_payout_records;
  v_available NUMERIC(14,2);
  v_payout_id UUID;
BEGIN
  -- 1. Idempotency Check: Return existing payout if key already processed
  SELECT * INTO v_payout FROM public.provider_payout_records WHERE idempotency_key = p_idempotency_key;
  IF FOUND THEN
    RETURN jsonb_build_object(
      'payoutId', v_payout.id,
      'status', v_payout.status,
      'amount', v_payout.net_amount,
      'duplicate', true
    );
  END IF;

  -- 2. Resolve Provider V2 Profile (by provider_profiles_v2.id or user_id)
  SELECT * INTO v_provider
  FROM public.provider_profiles_v2
  WHERE id = p_provider_id OR user_id = p_provider_id
  FOR UPDATE;

  IF NOT FOUND THEN
    -- Fallback auto-provision V2 profile for existing legacy provider users
    INSERT INTO public.provider_profiles_v2 (
      user_id, full_name, email, role, onboarding_status, account_status, clinical_verification_status, bank_verification_status, payout_status, payout_enabled
    )
    SELECT
      p.id,
      COALESCE(p.first_name || ' ' || p.last_name, p.email),
      p.email,
      CASE WHEN LOWER(p.role) = 'doctor' THEN 'DOCTOR'::public.provider_role_v2 ELSE 'FITNESS_COACH'::public.provider_role_v2 END,
      'APPROVED'::public.provider_onboarding_status,
      'ACTIVE'::public.provider_account_status,
      'APPROVED'::public.provider_clinical_status,
      'VERIFIED'::public.provider_bank_status,
      'ACTIVE'::public.provider_payout_status_v2,
      TRUE
    FROM public.profiles p
    WHERE p.id = p_provider_id
    ON CONFLICT (user_id) DO UPDATE SET updated_at = NOW()
    RETURNING * INTO v_provider;
  END IF;

  IF v_provider IS NULL THEN
    RAISE EXCEPTION 'PROVIDER_NOT_FOUND: Provider profile missing for ID %', p_provider_id;
  END IF;

  -- 3. Ensure Wallet Exists & ATOMICALLY LOCK WALLET ROW (FOR UPDATE)
  INSERT INTO public.provider_wallets(provider_id, currency)
  VALUES (v_provider.id, 'INR')
  ON CONFLICT(provider_id, currency) DO NOTHING;

  SELECT * INTO v_wallet
  FROM public.provider_wallets
  WHERE provider_id = v_provider.id AND currency = 'INR'
  FOR UPDATE;

  IF v_wallet IS NULL THEN
    RAISE EXCEPTION 'WALLET_NOT_FOUND: Failed to acquire provider wallet lock.';
  END IF;

  -- 4. Calculate Available Eligible Balance (Eligible minus currently Processing)
  v_available := COALESCE(v_wallet.eligible_balance, 0);

  IF p_amount <= 0 THEN
    RAISE EXCEPTION 'INVALID_AMOUNT: Requested withdrawal amount must be greater than zero.';
  END IF;

  IF p_amount > v_available THEN
    RAISE EXCEPTION 'INSUFFICIENT_FUNDS: Requested amount (₹%) exceeds available eligible balance (₹%).', p_amount, v_available;
  END IF;

  -- 5. ATOMIC BALANCE RESERVATION
  -- Deduct from eligible_balance and credit processing_balance
  UPDATE public.provider_wallets
  SET
    eligible_balance = eligible_balance - p_amount,
    processing_balance = processing_balance + p_amount,
    version = version + 1,
    updated_at = NOW()
  WHERE id = v_wallet.id
  RETURNING * INTO v_wallet;

  -- 6. Insert Payout Record with Idempotency Key
  INSERT INTO public.provider_payout_records (
    provider_id,
    payout_provider,
    gross_amount,
    net_amount,
    currency,
    status,
    initiated_at,
    idempotency_key
  )
  VALUES (
    v_provider.id,
    'RAZORPAYX',
    p_amount,
    p_amount,
    'INR',
    'APPROVED',
    NOW(),
    p_idempotency_key
  )
  RETURNING * INTO v_payout;

  -- 7. Insert Ledger Transaction (PAYOUT_RESERVED)
  INSERT INTO public.provider_wallet_transactions (
    wallet_id,
    provider_id,
    payout_id,
    transaction_type,
    amount,
    currency,
    balance_category,
    reference_type,
    reference_id,
    idempotency_key,
    metadata
  )
  VALUES (
    v_wallet.id,
    v_provider.id,
    v_payout.id,
    'PAYOUT_RESERVED',
    -p_amount,
    'INR',
    'PROCESSING',
    'PAYOUT_REQUEST',
    v_payout.id,
    p_idempotency_key || ':reservation',
    jsonb_build_object('initiatedBy', p_initiated_by, 'previousEligible', v_available)
  );

  RETURN jsonb_build_object(
    'payoutId', v_payout.id,
    'providerId', v_provider.id,
    'status', v_payout.status,
    'netAmount', v_payout.net_amount,
    'remainingEligibleBalance', v_wallet.eligible_balance,
    'processingBalance', v_wallet.processing_balance,
    'duplicate', false
  );
END $$;

-- Revoke execute from public and grant to service_role
REVOKE ALL ON FUNCTION public.request_provider_payout_v3(UUID, NUMERIC, TEXT, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.request_provider_payout_v3(UUID, NUMERIC, TEXT, UUID) TO service_role;
