-- ==============================================================================
-- 8liv: Master Unified Provider Wallet & Payout Migration (Fix All Breakpoints)
-- ==============================================================================

-- 1. Ensure provider compensation defaults don't fail when payout_amount is NULL
CREATE OR REPLACE FUNCTION public.credit_completed_consultation(
  p_provider_id UUID, 
  p_patient_id UUID, 
  p_appointment_id UUID, 
  p_appointment_type TEXT DEFAULT NULL, 
  p_created_by UUID DEFAULT NULL
) RETURNS JSONB 
LANGUAGE plpgsql 
SECURITY DEFINER 
SET search_path = public AS $$
DECLARE 
  v_wallet public.wallet_accounts; 
  v_existing public.wallet_ledger_transactions; 
  v_tx public.wallet_ledger_transactions; 
  v_role TEXT; 
  v_mode TEXT; 
  v_fixed NUMERIC; 
  v_percent NUMERIC; 
  v_gross NUMERIC; 
  v_amount NUMERIC; 
  v_status TEXT; 
  v_old NUMERIC;
  v_v2_profile public.provider_profiles_v2;
  v_v2_wallet public.provider_wallets;
BEGIN
  -- Verify consultation status
  SELECT status INTO v_status FROM public.doctor_consultations WHERE id = p_appointment_id AND doctor_id = p_provider_id;
  IF v_status IS NULL THEN 
    SELECT status INTO v_status FROM public.staff_consultations WHERE id = p_appointment_id AND staff_id = p_provider_id; 
  END IF;
  
  IF LOWER(COALESCE(v_status,'')) NOT IN ('completed','approved','rejected','attended') THEN 
    RAISE EXCEPTION 'Only completed consultations can be credited'; 
  END IF;

  -- Idempotency check: don't double credit
  SELECT * INTO v_existing 
  FROM public.wallet_ledger_transactions 
  WHERE appointment_id = p_appointment_id AND transaction_type = 'CONSULTATION_CREDIT' AND status = 'SUCCESS';
  
  IF FOUND THEN 
    RETURN jsonb_build_object('credited', false, 'duplicate', true, 'transactionId', v_existing.id, 'amount', v_existing.amount); 
  END IF;

  -- Ensure wallet_accounts exists
  INSERT INTO public.wallet_accounts(provider_id) VALUES(p_provider_id) ON CONFLICT(provider_id) DO NOTHING;
  SELECT * INTO v_wallet FROM public.wallet_accounts WHERE provider_id = p_provider_id FOR UPDATE; 
  v_old := COALESCE(v_wallet.current_balance, 0);

  -- Determine role & compensation
  SELECT COALESCE(pp.role, p.role), pp.payout_amount 
  INTO v_role, v_fixed 
  FROM public.profiles p 
  LEFT JOIN public.provider_profiles pp ON pp.provider_id = p.id 
  WHERE p.id = p_provider_id;

  IF v_role = 'trainer' THEN v_role := 'fitness_coach'; END IF;
  IF v_role IS NULL THEN v_role := 'doctor'; END IF;

  SELECT calculation_mode, fixed_amount, provider_percentage 
  INTO v_mode, v_fixed, v_percent 
  FROM public.provider_compensation_settings 
  WHERE provider_role = v_role AND active = TRUE;

  IF v_mode = 'PROFILE_FIXED' THEN 
    SELECT payout_amount INTO v_amount FROM public.provider_profiles WHERE provider_id = p_provider_id;
    -- Fallback default if profile payout_amount is not set
    IF v_amount IS NULL OR v_amount <= 0 THEN
      v_amount := 300.00;
    END IF;
  ELSIF v_mode = 'FIXED' THEN 
    v_amount := COALESCE(v_fixed, 300.00);
  ELSE
    SELECT amount INTO v_gross 
    FROM public.payment_transactions 
    WHERE patient_id = p_patient_id AND status IN ('success','paid') 
      AND (metadata->>'consultation_id' = p_appointment_id::TEXT OR metadata->>'booking_id' = p_appointment_id::TEXT) 
    ORDER BY created_at DESC LIMIT 1;
    
    IF v_gross IS NOT NULL AND v_percent IS NOT NULL THEN
      v_amount := ROUND(v_gross * v_percent / 100, 2);
    ELSE
      v_amount := 300.00;
    END IF;
  END IF;

  IF COALESCE(v_amount, 0) <= 0 THEN 
    v_amount := 300.00; 
  END IF;

  -- 1. Insert into canonical wallet_ledger_transactions
  INSERT INTO public.wallet_ledger_transactions(
    wallet_id, provider_id, patient_id, appointment_id, transaction_type, amount, status, reference_id, description, created_by, metadata
  )
  VALUES(
    v_wallet.id, p_provider_id, p_patient_id, p_appointment_id, 'CONSULTATION_CREDIT', v_amount, 'SUCCESS',
    'consultation:' || p_appointment_id, 'Consultation credit', p_created_by,
    jsonb_build_object('appointmentType', p_appointment_type, 'providerRole', v_role, 'grossAmount', v_gross)
  ) 
  RETURNING * INTO v_tx;

  -- Recalculate wallet_accounts balance
  v_wallet := public.recalculate_wallet_account(v_wallet.id);

  -- 2. Mirror into provider_wallets & provider_earnings for V2/V3 platform
  SELECT * INTO v_v2_profile 
  FROM public.provider_profiles_v2 
  WHERE user_id = p_provider_id OR id = p_provider_id;

  IF v_v2_profile IS NOT NULL THEN
    INSERT INTO public.provider_wallets(provider_id, currency, eligible_balance)
    VALUES (v_v2_profile.id, 'INR', v_amount)
    ON CONFLICT (provider_id, currency) 
    DO UPDATE SET 
      eligible_balance = provider_wallets.eligible_balance + v_amount,
      updated_at = NOW();

    INSERT INTO public.provider_earnings(
      provider_id, source_type, source_id, service_type, gross_amount, net_amount, currency, status, earned_at, eligible_at
    )
    VALUES (
      v_v2_profile.id, 'CONSULTATION', p_appointment_id, COALESCE(p_appointment_type, 'CONSULTATION'), v_amount, v_amount, 'INR', 'ELIGIBLE', NOW(), NOW()
    )
    ON CONFLICT (provider_id, source_type, source_id) DO NOTHING;
  END IF;

  -- 3. Mirror to legacy doctor_wallet if doctor
  IF LOWER(v_role) = 'doctor' THEN
    INSERT INTO public.doctor_wallet(doctor_id, balance, total_earned, total_withdrawn, updated_at)
    VALUES (p_provider_id, v_amount, v_amount, 0, NOW())
    ON CONFLICT (doctor_id)
    DO UPDATE SET
      balance = doctor_wallet.balance + v_amount,
      total_earned = doctor_wallet.total_earned + v_amount,
      updated_at = NOW();
  END IF;

  RETURN jsonb_build_object(
    'credited', true,
    'duplicate', false,
    'transactionId', v_tx.id,
    'walletId', v_wallet.id,
    'amount', v_amount,
    'oldBalance', v_old,
    'newBalance', v_wallet.current_balance
  );
EXCEPTION WHEN unique_violation THEN
  SELECT * INTO v_existing FROM public.wallet_ledger_transactions 
  WHERE appointment_id = p_appointment_id AND transaction_type = 'CONSULTATION_CREDIT' AND status = 'SUCCESS';
  RETURN jsonb_build_object('credited', false, 'duplicate', true, 'transactionId', v_existing.id, 'amount', v_existing.amount);
END $$;


-- 2. Master Unified request_provider_payout_v3 (Seamlessly checks & synchronizes balances)
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
  v_legacy_wallet public.wallet_accounts;
  v_doc_wallet public.doctor_wallet;
  v_available NUMERIC(14,2);
  v_source_available NUMERIC(14,2) := 0;
  v_user_uuid UUID;
BEGIN
  IF p_amount <= 0 THEN
    RAISE EXCEPTION 'INVALID_AMOUNT: Requested withdrawal amount must be greater than zero.';
  END IF;

  -- 1. Idempotency Check: Return existing payout record if already registered
  SELECT * INTO v_payout FROM public.provider_payout_records WHERE idempotency_key = p_idempotency_key;
  IF FOUND THEN
    RETURN jsonb_build_object(
      'payoutId', v_payout.id,
      'status', v_payout.status,
      'amount', v_payout.net_amount,
      'duplicate', true
    );
  END IF;

  -- 2. Resolve Provider V2 Profile
  SELECT * INTO v_provider
  FROM public.provider_profiles_v2
  WHERE id = p_provider_id OR user_id = p_provider_id
  FOR UPDATE;

  IF NOT FOUND THEN
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

  v_user_uuid := COALESCE(v_provider.user_id, p_provider_id);

  -- 3. Lock & Ensure provider_wallets exists
  INSERT INTO public.provider_wallets(provider_id, currency)
  VALUES (v_provider.id, 'INR')
  ON CONFLICT(provider_id, currency) DO NOTHING;

  SELECT * INTO v_wallet
  FROM public.provider_wallets
  WHERE provider_id = v_provider.id AND currency = 'INR'
  FOR UPDATE;

  -- 4. Cross-Sync balances if provider_wallets is zero but wallet_accounts / doctor_wallet has funds
  v_available := COALESCE(v_wallet.eligible_balance, 0);

  IF v_available < p_amount THEN
    -- Check wallet_accounts (schema 2)
    SELECT * INTO v_legacy_wallet FROM public.wallet_accounts WHERE provider_id = v_user_uuid FOR UPDATE;
    IF FOUND THEN
      v_source_available := GREATEST(0, COALESCE(v_legacy_wallet.current_balance, 0) - COALESCE(v_legacy_wallet.pending_balance, 0));
    END IF;

    -- Check doctor_wallet (schema 1)
    IF v_source_available < p_amount THEN
      SELECT * INTO v_doc_wallet FROM public.doctor_wallet WHERE doctor_id = v_user_uuid FOR UPDATE;
      IF FOUND THEN
        v_source_available := GREATEST(v_source_available, COALESCE(v_doc_wallet.balance, 0));
      END IF;
    END IF;

    -- Synchronize balance over to provider_wallets if available in source ledgers
    IF v_source_available > v_available THEN
      UPDATE public.provider_wallets
      SET eligible_balance = v_source_available, updated_at = NOW()
      WHERE id = v_wallet.id
      RETURNING * INTO v_wallet;

      v_available := v_wallet.eligible_balance;
    END IF;
  END IF;

  IF p_amount > v_available THEN
    RAISE EXCEPTION 'INSUFFICIENT_FUNDS: Requested amount (₹%) exceeds available balance (₹%).', p_amount, v_available;
  END IF;

  -- 5. Atomic Balance Reservation
  UPDATE public.provider_wallets
  SET
    eligible_balance = eligible_balance - p_amount,
    processing_balance = processing_balance + p_amount,
    version = version + 1,
    updated_at = NOW()
  WHERE id = v_wallet.id
  RETURNING * INTO v_wallet;

  -- 6. Insert Payout Record (V2 / V3)
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

  -- 7. Insert Ledger Transaction in provider_wallet_transactions
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

  -- 8. Mirror payout row in provider_payouts (for legacy admin processing & webhook compatibility)
  INSERT INTO public.wallet_accounts(provider_id) VALUES(v_user_uuid) ON CONFLICT(provider_id) DO NOTHING;
  SELECT * INTO v_legacy_wallet FROM public.wallet_accounts WHERE provider_id = v_user_uuid;
  
  IF v_legacy_wallet IS NOT NULL THEN
    INSERT INTO public.provider_payouts (
      provider_id,
      wallet_id,
      payout_amount,
      payout_status,
      idempotency_key,
      initiated_by
    )
    VALUES (
      v_user_uuid,
      v_legacy_wallet.id,
      p_amount,
      'PENDING',
      p_idempotency_key,
      p_initiated_by
    )
    ON CONFLICT (idempotency_key) DO NOTHING;
  END IF;

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

-- Grant permissions
REVOKE ALL ON FUNCTION public.credit_completed_consultation(UUID,UUID,UUID,TEXT,UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.credit_completed_consultation(UUID,UUID,UUID,TEXT,UUID) TO service_role;
REVOKE ALL ON FUNCTION public.request_provider_payout_v3(UUID,NUMERIC,TEXT,UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.request_provider_payout_v3(UUID,NUMERIC,TEXT,UUID) TO service_role;
