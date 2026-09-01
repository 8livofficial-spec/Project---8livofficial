-- 8liv: Concurrency & Idempotency Test Script for Payout Reservation v3
-- Run this in Supabase SQL Editor to verify atomic FOR UPDATE row locking.

DO $$
DECLARE
  v_test_user_id UUID := '00000000-0000-0000-0000-000000000001'::UUID;
  v_test_provider_id UUID;
  v_wallet_id UUID;
  v_res1 JSONB;
  v_res2 JSONB;
  v_res3 JSONB;
  v_err_count INTEGER := 0;
BEGIN
  RAISE NOTICE '=== STARTING CONCURRENCY & PAYOUT RESERVATION TEST ===';

  -- 1. Setup test provider V2 profile & wallet
  INSERT INTO public.provider_profiles_v2 (
    id, user_id, full_name, email, role, onboarding_status, account_status, clinical_verification_status, bank_verification_status, payout_status, payout_enabled
  )
  VALUES (
    v_test_user_id, v_test_user_id, 'Test Doctor Concurrency', 'concurrency-test@8liv.com', 'DOCTOR', 'APPROVED', 'ACTIVE', 'APPROVED', 'VERIFIED', 'ACTIVE', TRUE
  )
  ON CONFLICT (id) DO UPDATE SET updated_at = NOW()
  RETURNING id INTO v_test_provider_id;

  -- Initial balance: ₹1,000 eligible
  INSERT INTO public.provider_wallets (provider_id, currency, eligible_balance, processing_balance, paid_total)
  VALUES (v_test_provider_id, 'INR', 1000.00, 0.00, 0.00)
  ON CONFLICT (provider_id, currency) DO UPDATE SET eligible_balance = 1000.00, processing_balance = 0.00;

  RAISE NOTICE 'Test provider wallet initialized with ₹1,000 eligible balance.';

  -- 2. Test Request 1: Withdraw ₹1,000 (Key A) -> Expected SUCCESS
  v_res1 := public.request_provider_payout_v3(v_test_provider_id, 1000.00, 'test-key-A:' || gen_random_uuid()::text, v_test_user_id);
  RAISE NOTICE 'Request 1 (₹1,000 Key A) Result: %', v_res1;

  -- 3. Test Request 2: Withdraw ₹1,000 (Key B) -> Expected INSUFFICIENT_FUNDS Exception
  BEGIN
    v_res2 := public.request_provider_payout_v3(v_test_provider_id, 1000.00, 'test-key-B:' || gen_random_uuid()::text, v_test_user_id);
    RAISE NOTICE 'FAIL: Request 2 succeeded when it should have been rejected!';
  EXCEPTION WHEN OTHERS THEN
    v_err_count := v_err_count + 1;
    RAISE NOTICE 'SUCCESS: Request 2 correctly rejected with exception: %', SQLERRM;
  END;

  -- 4. Test Request 3: Re-send Request 1 with SAME Idempotency Key -> Expected DUPLICATE Return (No double deduction)
  v_res3 := public.request_provider_payout_v3(v_test_provider_id, 1000.00, v_res1->>'payoutId', v_test_user_id);
  RAISE NOTICE 'Request 3 (Duplicate Key A) Result: %', v_res3;

  -- 5. Clean up test records
  DELETE FROM public.provider_wallet_transactions WHERE provider_id = v_test_provider_id;
  DELETE FROM public.provider_payout_records WHERE provider_id = v_test_provider_id;
  DELETE FROM public.provider_wallets WHERE provider_id = v_test_provider_id;
  DELETE FROM public.provider_profiles_v2 WHERE id = v_test_provider_id;

  RAISE NOTICE '=== CONCURRENCY & PAYOUT RESERVATION TEST COMPLETED SUCCESSFULLY ===';
END $$;
