-- ============================================================
-- FIX: Payout Approval Failures Across All Schemas
-- ============================================================
-- Root cause 1: finalize_provider_payout raises 'Wallet balance is insufficient'
--   when provider earned money outside wallet_accounts (doctor_wallet / provider_wallets).
--   Fix: Allow approval when current_balance >= 0, since admin is manually approving.
--
-- Root cause 2: provider_payout_records rows (V3) don't exist in provider_payouts,
--   so the RPC raises 'Payout not found'.
--   Fix: Wrap the RPC in a try/catch inside the API (done in code), but also
--   create a fallback finalize function that accepts any payout ID across all tables.
--
-- Root cause 3: RLS policies may block admin from updating provider_payouts rows
--   where provider_id references a profiles.id that doesn't match the admin's claim.
--   Fix: Ensure service_role bypasses all RLS (no change needed, service_role already does).
-- ============================================================

-- 1. Replace finalize_provider_payout to remove the balance-check blockade for admin-approved payouts.
--    The check `v_payout.payout_amount > v_wallet.current_balance` makes sense for provider self-service
--    but NOT for admin approval where funds may be in a different ledger (provider_wallets, doctor_wallet).
--    We skip the check when p_actor is provided (indicating admin-initiated action).

CREATE OR REPLACE FUNCTION public.finalize_provider_payout(
  p_payout_id UUID,
  p_status TEXT,
  p_payment_reference TEXT,
  p_failure_reason TEXT,
  p_actor UUID DEFAULT NULL
)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_payout  provider_payouts;
  v_wallet  wallet_accounts;
  v_tx      wallet_ledger_transactions;
  v_old     NUMERIC;
BEGIN
  SELECT * INTO v_payout FROM provider_payouts WHERE id = p_payout_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Payout not found: %', p_payout_id;
  END IF;

  -- Only lock wallet if it exists; it won't exist for providers using other schemas
  SELECT * INTO v_wallet FROM wallet_accounts WHERE id = v_payout.wallet_id FOR UPDATE;
  v_old := COALESCE(v_wallet.current_balance, 0);

  IF p_status = 'COMPLETED' THEN
    IF v_payout.payout_status = 'COMPLETED' THEN
      RETURN to_jsonb(v_payout);
    END IF;

    -- REMOVED: balance check that was blocking admin approvals for cross-schema providers
    -- Only enforce balance check for self-service (p_actor IS NULL or actor = provider)
    IF p_actor IS NULL OR p_actor = v_payout.provider_id THEN
      IF v_wallet.id IS NOT NULL AND v_payout.payout_amount > v_wallet.current_balance THEN
        RAISE EXCEPTION 'Wallet balance is insufficient for payout finalization';
      END IF;
    END IF;

    IF v_wallet.id IS NOT NULL THEN
      INSERT INTO wallet_ledger_transactions(
        wallet_id, provider_id, transaction_type, amount, status,
        reference_id, description, created_by, metadata
      ) VALUES (
        v_wallet.id, v_payout.provider_id, 'PAYOUT', -v_payout.payout_amount, 'SUCCESS',
        'payout:' || v_payout.id, 'Provider payout', p_actor,
        jsonb_build_object('paymentReference', p_payment_reference)
      ) RETURNING * INTO v_tx;

      UPDATE provider_payouts
      SET payout_status = 'COMPLETED',
          ledger_transaction_id = v_tx.id,
          payment_reference = p_payment_reference,
          completed_at = NOW(),
          updated_at = NOW()
      WHERE id = v_payout.id
      RETURNING * INTO v_payout;

      v_wallet := recalculate_wallet_account(v_wallet.id);

      INSERT INTO wallet_audit_log(
        wallet_id, provider_id, transaction_id, payout_id, event_type,
        amount, old_balance, new_balance, initiated_by
      ) VALUES (
        v_wallet.id, v_payout.provider_id, v_tx.id, v_payout.id,
        'PAYOUT_COMPLETED', v_payout.payout_amount, v_old, v_wallet.current_balance, p_actor
      );
    ELSE
      -- No wallet_accounts row; just update the payout record status
      UPDATE provider_payouts
      SET payout_status = 'COMPLETED',
          payment_reference = p_payment_reference,
          completed_at = NOW(),
          updated_at = NOW()
      WHERE id = v_payout.id
      RETURNING * INTO v_payout;
    END IF;

  ELSIF p_status = 'FAILED' THEN
    UPDATE provider_payouts
    SET payout_status = 'FAILED',
        failure_reason = LEFT(p_failure_reason, 2000),
        updated_at = NOW()
    WHERE id = v_payout.id
    RETURNING * INTO v_payout;

    IF v_wallet.id IS NOT NULL THEN
      v_wallet := recalculate_wallet_account(v_wallet.id);
      INSERT INTO wallet_audit_log(
        wallet_id, provider_id, payout_id, event_type,
        amount, old_balance, new_balance, initiated_by, details
      ) VALUES (
        v_wallet.id, v_payout.provider_id, v_payout.id, 'PAYOUT_FAILED',
        v_payout.payout_amount, v_old, v_wallet.current_balance, p_actor,
        jsonb_build_object('reason', p_failure_reason)
      );
    END IF;

  ELSE
    -- PROCESSING or any other status
    UPDATE provider_payouts
    SET payout_status = 'PROCESSING',
        payment_reference = COALESCE(p_payment_reference, payment_reference),
        updated_at = NOW()
    WHERE id = v_payout.id
    RETURNING * INTO v_payout;
  END IF;

  RETURN to_jsonb(v_payout);
END $$;

REVOKE ALL ON FUNCTION public.finalize_provider_payout(UUID, TEXT, TEXT, TEXT, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.finalize_provider_payout(UUID, TEXT, TEXT, TEXT, UUID) TO service_role;


-- 2. Create a convenience function to approve V3 payout records (provider_payout_records)
--    which are NOT in provider_payouts. This is called by the API as a fallback.

CREATE OR REPLACE FUNCTION public.finalize_provider_payout_record(
  p_record_id UUID,
  p_status TEXT,  -- 'SUCCESS' | 'FAILED' | 'APPROVED'
  p_failure_reason TEXT DEFAULT NULL,
  p_actor UUID DEFAULT NULL
)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_record  provider_payout_records;
  v_wallet  provider_wallets;
  v_amt     NUMERIC;
  v_now     TIMESTAMPTZ := NOW();
BEGIN
  SELECT * INTO v_record FROM provider_payout_records WHERE id = p_record_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Payout record not found: %', p_record_id;
  END IF;

  IF p_status = 'SUCCESS' THEN
    UPDATE provider_payout_records
    SET status = 'SUCCESS', processed_at = v_now, completed_at = v_now, updated_at = v_now
    WHERE id = p_record_id
    RETURNING * INTO v_record;

    -- Move processing_balance → paid_total in provider_wallets
    v_amt := COALESCE(v_record.net_amount, v_record.gross_amount, 0);
    SELECT * INTO v_wallet FROM provider_wallets WHERE provider_id = v_record.provider_id FOR UPDATE;
    IF FOUND AND v_amt > 0 THEN
      UPDATE provider_wallets
      SET processing_balance = GREATEST(0, processing_balance - v_amt),
          paid_total = paid_total + v_amt,
          updated_at = v_now
      WHERE id = v_wallet.id;
    END IF;

  ELSIF p_status = 'FAILED' THEN
    UPDATE provider_payout_records
    SET status = 'FAILED', failure_reason = p_failure_reason, failed_at = v_now, updated_at = v_now
    WHERE id = p_record_id
    RETURNING * INTO v_record;

    -- Restore funds to eligible_balance
    v_amt := COALESCE(v_record.net_amount, v_record.gross_amount, 0);
    SELECT * INTO v_wallet FROM provider_wallets WHERE provider_id = v_record.provider_id FOR UPDATE;
    IF FOUND AND v_amt > 0 THEN
      UPDATE provider_wallets
      SET processing_balance = GREATEST(0, processing_balance - v_amt),
          eligible_balance = eligible_balance + v_amt,
          updated_at = v_now
      WHERE id = v_wallet.id;
    END IF;

  ELSE
    UPDATE provider_payout_records
    SET status = 'APPROVED', processed_at = v_now, updated_at = v_now
    WHERE id = p_record_id
    RETURNING * INTO v_record;
  END IF;

  RETURN to_jsonb(v_record);
END $$;

REVOKE ALL ON FUNCTION public.finalize_provider_payout_record(UUID, TEXT, TEXT, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.finalize_provider_payout_record(UUID, TEXT, TEXT, UUID) TO service_role;
