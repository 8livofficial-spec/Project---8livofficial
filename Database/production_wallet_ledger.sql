-- Production-grade append-only provider wallet ledger.
-- Apply after profiles, provider_profiles, doctor_consultations, staff_consultations,
-- and payment_transactions exist.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS public.provider_compensation_settings (
  provider_role TEXT PRIMARY KEY CHECK (provider_role IN ('doctor', 'dietitian', 'nutritionist', 'fitness_coach')),
  calculation_mode TEXT NOT NULL DEFAULT 'PROFILE_FIXED' CHECK (calculation_mode IN ('PROFILE_FIXED', 'FIXED', 'PERCENTAGE')),
  fixed_amount NUMERIC(12,2),
  provider_percentage NUMERIC(5,2) CHECK (provider_percentage IS NULL OR provider_percentage BETWEEN 0 AND 100),
  active BOOLEAN NOT NULL DEFAULT TRUE,
  updated_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO public.provider_compensation_settings (provider_role, calculation_mode)
VALUES ('doctor', 'PROFILE_FIXED'), ('dietitian', 'PROFILE_FIXED'), ('nutritionist', 'PROFILE_FIXED'), ('fitness_coach', 'PROFILE_FIXED')
ON CONFLICT (provider_role) DO NOTHING;

CREATE TABLE IF NOT EXISTS public.wallet_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id UUID NOT NULL UNIQUE REFERENCES public.profiles(id) ON DELETE RESTRICT,
  current_balance NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK (current_balance >= 0),
  pending_balance NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK (pending_balance >= 0),
  total_earned NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK (total_earned >= 0),
  total_paid NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK (total_paid >= 0),
  version BIGINT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.wallet_ledger_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_id UUID NOT NULL REFERENCES public.wallet_accounts(id) ON DELETE RESTRICT,
  provider_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  patient_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  appointment_id UUID,
  transaction_type TEXT NOT NULL CHECK (transaction_type IN ('CONSULTATION_CREDIT', 'ADJUSTMENT', 'PAYOUT', 'REFUND', 'REVERSAL')),
  amount NUMERIC(14,2) NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('PENDING', 'SUCCESS', 'FAILED', 'REVERSED')),
  reference_id TEXT NOT NULL,
  description TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  retry_required BOOLEAN NOT NULL DEFAULT FALSE,
  failure_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT wallet_ledger_amount_valid CHECK ((status='FAILED' AND amount=0) OR (status<>'FAILED' AND amount<>0))
);

CREATE UNIQUE INDEX IF NOT EXISTS wallet_ledger_one_success_credit_per_appointment
  ON public.wallet_ledger_transactions(appointment_id)
  WHERE transaction_type = 'CONSULTATION_CREDIT' AND status = 'SUCCESS' AND appointment_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS wallet_ledger_reference_id_unique ON public.wallet_ledger_transactions(reference_id);
CREATE INDEX IF NOT EXISTS wallet_ledger_provider_created ON public.wallet_ledger_transactions(provider_id, created_at DESC);
CREATE INDEX IF NOT EXISTS wallet_ledger_retry ON public.wallet_ledger_transactions(retry_required, created_at) WHERE retry_required = TRUE;

CREATE TABLE IF NOT EXISTS public.provider_payouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  wallet_id UUID NOT NULL REFERENCES public.wallet_accounts(id) ON DELETE RESTRICT,
  payout_amount NUMERIC(14,2) NOT NULL CHECK (payout_amount > 0),
  payout_status TEXT NOT NULL DEFAULT 'PENDING' CHECK (payout_status IN ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED')),
  ledger_transaction_id UUID UNIQUE REFERENCES public.wallet_ledger_transactions(id) ON DELETE RESTRICT,
  idempotency_key TEXT NOT NULL UNIQUE,
  payment_reference TEXT UNIQUE,
  failure_reason TEXT,
  initiated_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  initiated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS provider_payouts_status_created ON public.provider_payouts(payout_status, initiated_at);
CREATE INDEX IF NOT EXISTS provider_payouts_provider_created ON public.provider_payouts(provider_id, initiated_at DESC);

CREATE TABLE IF NOT EXISTS public.wallet_audit_log (
  id BIGSERIAL PRIMARY KEY,
  wallet_id UUID REFERENCES public.wallet_accounts(id) ON DELETE RESTRICT,
  provider_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  transaction_id UUID REFERENCES public.wallet_ledger_transactions(id) ON DELETE RESTRICT,
  payout_id UUID REFERENCES public.provider_payouts(id) ON DELETE RESTRICT,
  appointment_id UUID,
  event_type TEXT NOT NULL,
  amount NUMERIC(14,2),
  old_balance NUMERIC(14,2),
  new_balance NUMERIC(14,2),
  initiated_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  details JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS wallet_audit_provider_created ON public.wallet_audit_log(provider_id, created_at DESC);

CREATE OR REPLACE FUNCTION public.recalculate_wallet_account(p_wallet_id UUID)
RETURNS public.wallet_accounts
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_wallet public.wallet_accounts; v_current NUMERIC(14,2); v_pending NUMERIC(14,2); v_earned NUMERIC(14,2); v_paid NUMERIC(14,2);
BEGIN
  SELECT * INTO v_wallet FROM wallet_accounts WHERE id = p_wallet_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Wallet not found'; END IF;
  SELECT
    COALESCE(SUM(CASE WHEN status='SUCCESS' THEN amount ELSE 0 END),0),
    COALESCE(SUM(CASE WHEN status='SUCCESS' AND transaction_type='CONSULTATION_CREDIT' THEN amount ELSE 0 END),0),
    COALESCE(ABS(SUM(CASE WHEN status='SUCCESS' AND transaction_type='PAYOUT' THEN amount ELSE 0 END)),0)
  INTO v_current, v_earned, v_paid FROM wallet_ledger_transactions WHERE wallet_id=p_wallet_id;
  SELECT COALESCE(SUM(payout_amount),0) INTO v_pending FROM provider_payouts WHERE wallet_id=p_wallet_id AND payout_status IN ('PENDING','PROCESSING');
  UPDATE wallet_accounts SET current_balance=GREATEST(v_current,0), pending_balance=v_pending, total_earned=v_earned, total_paid=v_paid, version=version+1, updated_at=NOW() WHERE id=p_wallet_id RETURNING * INTO v_wallet;
  RETURN v_wallet;
END $$;

CREATE OR REPLACE FUNCTION public.credit_completed_consultation(
  p_provider_id UUID, p_patient_id UUID, p_appointment_id UUID, p_appointment_type TEXT DEFAULT NULL, p_created_by UUID DEFAULT NULL
) RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE v_wallet wallet_accounts; v_existing wallet_ledger_transactions; v_tx wallet_ledger_transactions; v_role TEXT; v_mode TEXT; v_fixed NUMERIC; v_percent NUMERIC; v_gross NUMERIC; v_amount NUMERIC; v_status TEXT; v_old NUMERIC;
BEGIN
  SELECT status INTO v_status FROM doctor_consultations WHERE id=p_appointment_id AND doctor_id=p_provider_id;
  IF v_status IS NULL THEN SELECT status INTO v_status FROM staff_consultations WHERE id=p_appointment_id AND staff_id=p_provider_id; END IF;
  IF LOWER(COALESCE(v_status,'')) NOT IN ('completed','approved','rejected') THEN RAISE EXCEPTION 'Only completed consultations can be credited'; END IF;
  SELECT * INTO v_existing FROM wallet_ledger_transactions WHERE appointment_id=p_appointment_id AND transaction_type='CONSULTATION_CREDIT' AND status='SUCCESS';
  IF FOUND THEN RETURN jsonb_build_object('credited',false,'duplicate',true,'transactionId',v_existing.id,'amount',v_existing.amount); END IF;
  INSERT INTO wallet_accounts(provider_id) VALUES(p_provider_id) ON CONFLICT(provider_id) DO NOTHING;
  SELECT * INTO v_wallet FROM wallet_accounts WHERE provider_id=p_provider_id FOR UPDATE; v_old:=v_wallet.current_balance;
  SELECT COALESCE(pp.role,p.role), pp.payout_amount INTO v_role,v_fixed FROM profiles p LEFT JOIN provider_profiles pp ON pp.provider_id=p.id WHERE p.id=p_provider_id;
  IF v_role='trainer' THEN v_role:='fitness_coach'; END IF;
  SELECT calculation_mode,fixed_amount,provider_percentage INTO v_mode,v_fixed,v_percent FROM provider_compensation_settings WHERE provider_role=v_role AND active=TRUE;
  IF v_mode='PROFILE_FIXED' THEN SELECT payout_amount INTO v_amount FROM provider_profiles WHERE provider_id=p_provider_id;
  ELSIF v_mode='FIXED' THEN v_amount:=v_fixed;
  ELSE
    SELECT amount INTO v_gross FROM payment_transactions WHERE patient_id=p_patient_id AND status IN ('success','paid') AND (metadata->>'consultation_id'=p_appointment_id::TEXT OR metadata->>'booking_id'=p_appointment_id::TEXT) ORDER BY created_at DESC LIMIT 1;
    IF v_gross IS NULL THEN RAISE EXCEPTION 'No successful appointment payment found for percentage compensation'; END IF;
    v_amount:=ROUND(v_gross*v_percent/100,2);
  END IF;
  IF COALESCE(v_amount,0)<=0 THEN RAISE EXCEPTION 'Provider compensation is not configured'; END IF;
  INSERT INTO wallet_ledger_transactions(wallet_id,provider_id,patient_id,appointment_id,transaction_type,amount,status,reference_id,description,created_by,metadata)
  VALUES(v_wallet.id,p_provider_id,p_patient_id,p_appointment_id,'CONSULTATION_CREDIT',v_amount,'SUCCESS','consultation:'||p_appointment_id,'Consultation credit',p_created_by,jsonb_build_object('appointmentType',p_appointment_type,'providerRole',v_role,'calculationMode',v_mode,'grossAmount',v_gross,'providerPercentage',v_percent)) RETURNING * INTO v_tx;
  v_wallet:=recalculate_wallet_account(v_wallet.id);
  INSERT INTO wallet_audit_log(wallet_id,provider_id,transaction_id,appointment_id,event_type,amount,old_balance,new_balance,initiated_by) VALUES(v_wallet.id,p_provider_id,v_tx.id,p_appointment_id,'CONSULTATION_CREDIT_SUCCESS',v_amount,v_old,v_wallet.current_balance,p_created_by);
  RETURN jsonb_build_object('credited',true,'duplicate',false,'transactionId',v_tx.id,'walletId',v_wallet.id,'amount',v_amount,'oldBalance',v_old,'newBalance',v_wallet.current_balance);
EXCEPTION WHEN unique_violation THEN
  SELECT * INTO v_existing FROM wallet_ledger_transactions WHERE appointment_id=p_appointment_id AND transaction_type='CONSULTATION_CREDIT' AND status='SUCCESS';
  RETURN jsonb_build_object('credited',false,'duplicate',true,'transactionId',v_existing.id,'amount',v_existing.amount);
END $$;

CREATE OR REPLACE FUNCTION public.request_provider_payout(p_provider_id UUID,p_amount NUMERIC,p_idempotency_key TEXT,p_initiated_by UUID)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE v_wallet wallet_accounts; v_payout provider_payouts; v_available NUMERIC;
BEGIN
  SELECT * INTO v_payout FROM provider_payouts WHERE idempotency_key=p_idempotency_key;
  IF FOUND THEN RETURN to_jsonb(v_payout); END IF;
  SELECT * INTO v_wallet FROM wallet_accounts WHERE provider_id=p_provider_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Wallet not found'; END IF;
  v_available:=v_wallet.current_balance-v_wallet.pending_balance;
  IF p_amount<=0 OR p_amount>v_available THEN RAISE EXCEPTION 'Insufficient available wallet balance'; END IF;
  INSERT INTO provider_payouts(provider_id,wallet_id,payout_amount,idempotency_key,initiated_by) VALUES(p_provider_id,v_wallet.id,p_amount,p_idempotency_key,p_initiated_by) RETURNING * INTO v_payout;
  v_wallet:=recalculate_wallet_account(v_wallet.id);
  INSERT INTO wallet_audit_log(wallet_id,provider_id,payout_id,event_type,amount,old_balance,new_balance,initiated_by) VALUES(v_wallet.id,p_provider_id,v_payout.id,'PAYOUT_REQUESTED',p_amount,v_wallet.current_balance,v_wallet.current_balance,p_initiated_by);
  RETURN to_jsonb(v_payout);
END $$;

CREATE OR REPLACE FUNCTION public.record_failed_wallet_credit(p_provider_id UUID,p_patient_id UUID,p_appointment_id UUID,p_reason TEXT,p_created_by UUID DEFAULT NULL)
RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE v_wallet wallet_accounts; v_tx wallet_ledger_transactions;
BEGIN
  INSERT INTO wallet_accounts(provider_id) VALUES(p_provider_id) ON CONFLICT(provider_id) DO NOTHING;
  SELECT * INTO v_wallet FROM wallet_accounts WHERE provider_id=p_provider_id FOR UPDATE;
  SELECT * INTO v_tx FROM wallet_ledger_transactions WHERE appointment_id=p_appointment_id AND transaction_type='CONSULTATION_CREDIT' AND status='FAILED' AND retry_required=TRUE ORDER BY created_at DESC LIMIT 1;
  IF FOUND THEN
    UPDATE wallet_ledger_transactions SET failure_reason=LEFT(p_reason,2000),updated_at=NOW() WHERE id=v_tx.id;
    RETURN v_tx.id;
  END IF;
  INSERT INTO wallet_ledger_transactions(wallet_id,provider_id,patient_id,appointment_id,transaction_type,amount,status,reference_id,description,created_by,retry_required,failure_reason)
  VALUES(v_wallet.id,p_provider_id,p_patient_id,p_appointment_id,'CONSULTATION_CREDIT',0,'FAILED','failed-consultation:'||p_appointment_id||':'||gen_random_uuid(),'Failed consultation credit',p_created_by,TRUE,LEFT(p_reason,2000)) RETURNING * INTO v_tx;
  INSERT INTO wallet_audit_log(wallet_id,provider_id,transaction_id,appointment_id,event_type,initiated_by,details) VALUES(v_wallet.id,p_provider_id,v_tx.id,p_appointment_id,'CONSULTATION_CREDIT_FAILED',p_created_by,jsonb_build_object('reason',LEFT(p_reason,2000)));
  RETURN v_tx.id;
END $$;

CREATE OR REPLACE FUNCTION public.adjust_provider_wallet(p_provider_id UUID,p_amount NUMERIC,p_reason TEXT,p_admin_id UUID,p_reference_id TEXT)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE v_wallet wallet_accounts; v_tx wallet_ledger_transactions; v_old NUMERIC;
BEGIN
  IF COALESCE(TRIM(p_reason),'')='' OR p_amount=0 THEN RAISE EXCEPTION 'A non-zero amount and reason are required'; END IF;
  IF NOT EXISTS(SELECT 1 FROM profiles WHERE id=p_admin_id AND role='admin') THEN RAISE EXCEPTION 'Admin authorization required'; END IF;
  INSERT INTO wallet_accounts(provider_id) VALUES(p_provider_id) ON CONFLICT(provider_id) DO NOTHING;
  SELECT * INTO v_wallet FROM wallet_accounts WHERE provider_id=p_provider_id FOR UPDATE; v_old:=v_wallet.current_balance;
  IF v_old+p_amount<0 THEN RAISE EXCEPTION 'Adjustment would make wallet balance negative'; END IF;
  INSERT INTO wallet_ledger_transactions(wallet_id,provider_id,transaction_type,amount,status,reference_id,description,created_by)
  VALUES(v_wallet.id,p_provider_id,'ADJUSTMENT',p_amount,'SUCCESS',p_reference_id,p_reason,p_admin_id) RETURNING * INTO v_tx;
  v_wallet:=recalculate_wallet_account(v_wallet.id);
  INSERT INTO wallet_audit_log(wallet_id,provider_id,transaction_id,event_type,amount,old_balance,new_balance,initiated_by,details) VALUES(v_wallet.id,p_provider_id,v_tx.id,'ADMIN_ADJUSTMENT',p_amount,v_old,v_wallet.current_balance,p_admin_id,jsonb_build_object('reason',p_reason));
  RETURN jsonb_build_object('transactionId',v_tx.id,'oldBalance',v_old,'newBalance',v_wallet.current_balance);
END $$;

CREATE OR REPLACE FUNCTION public.finalize_provider_payout(p_payout_id UUID,p_status TEXT,p_payment_reference TEXT,p_failure_reason TEXT,p_actor UUID DEFAULT NULL)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE v_payout provider_payouts; v_wallet wallet_accounts; v_tx wallet_ledger_transactions; v_old NUMERIC;
BEGIN
  SELECT * INTO v_payout FROM provider_payouts WHERE id=p_payout_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Payout not found'; END IF;
  SELECT * INTO v_wallet FROM wallet_accounts WHERE id=v_payout.wallet_id FOR UPDATE; v_old:=v_wallet.current_balance;
  IF p_status='COMPLETED' THEN
    IF v_payout.payout_status='COMPLETED' THEN RETURN to_jsonb(v_payout); END IF;
    IF v_payout.payout_amount>v_wallet.current_balance THEN RAISE EXCEPTION 'Wallet balance is insufficient for payout finalization'; END IF;
    INSERT INTO wallet_ledger_transactions(wallet_id,provider_id,transaction_type,amount,status,reference_id,description,created_by,metadata)
    VALUES(v_wallet.id,v_payout.provider_id,'PAYOUT',-v_payout.payout_amount,'SUCCESS','payout:'||v_payout.id,'Provider payout',p_actor,jsonb_build_object('paymentReference',p_payment_reference)) RETURNING * INTO v_tx;
    UPDATE provider_payouts SET payout_status='COMPLETED',ledger_transaction_id=v_tx.id,payment_reference=p_payment_reference,completed_at=NOW(),updated_at=NOW() WHERE id=v_payout.id RETURNING * INTO v_payout;
    v_wallet:=recalculate_wallet_account(v_wallet.id);
    INSERT INTO wallet_audit_log(wallet_id,provider_id,transaction_id,payout_id,event_type,amount,old_balance,new_balance,initiated_by) VALUES(v_wallet.id,v_payout.provider_id,v_tx.id,v_payout.id,'PAYOUT_COMPLETED',v_payout.payout_amount,v_old,v_wallet.current_balance,p_actor);
  ELSIF p_status='FAILED' THEN
    UPDATE provider_payouts SET payout_status='FAILED',failure_reason=LEFT(p_failure_reason,2000),updated_at=NOW() WHERE id=v_payout.id RETURNING * INTO v_payout;
    v_wallet:=recalculate_wallet_account(v_wallet.id);
    INSERT INTO wallet_audit_log(wallet_id,provider_id,payout_id,event_type,amount,old_balance,new_balance,initiated_by,details) VALUES(v_wallet.id,v_payout.provider_id,v_payout.id,'PAYOUT_FAILED',v_payout.payout_amount,v_old,v_wallet.current_balance,p_actor,jsonb_build_object('reason',p_failure_reason));
  ELSE
    UPDATE provider_payouts SET payout_status='PROCESSING',payment_reference=COALESCE(p_payment_reference,payment_reference),updated_at=NOW() WHERE id=v_payout.id RETURNING * INTO v_payout;
  END IF;
  RETURN to_jsonb(v_payout);
END $$;

ALTER TABLE public.wallet_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wallet_ledger_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.provider_payouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wallet_audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.provider_compensation_settings ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON FUNCTION public.credit_completed_consultation(UUID,UUID,UUID,TEXT,UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.request_provider_payout(UUID,NUMERIC,TEXT,UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.recalculate_wallet_account(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.record_failed_wallet_credit(UUID,UUID,UUID,TEXT,UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.adjust_provider_wallet(UUID,NUMERIC,TEXT,UUID,TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.finalize_provider_payout(UUID,TEXT,TEXT,TEXT,UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.credit_completed_consultation(UUID,UUID,UUID,TEXT,UUID) TO service_role;
GRANT EXECUTE ON FUNCTION public.request_provider_payout(UUID,NUMERIC,TEXT,UUID) TO service_role;
GRANT EXECUTE ON FUNCTION public.recalculate_wallet_account(UUID) TO service_role;
GRANT EXECUTE ON FUNCTION public.record_failed_wallet_credit(UUID,UUID,UUID,TEXT,UUID) TO service_role;
GRANT EXECUTE ON FUNCTION public.adjust_provider_wallet(UUID,NUMERIC,TEXT,UUID,TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION public.finalize_provider_payout(UUID,TEXT,TEXT,TEXT,UUID) TO service_role;
