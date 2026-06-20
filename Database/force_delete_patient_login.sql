-- Force delete one 8liv patient login and all linked patient data.
-- Replace REPLACE_WITH_PATIENT_EMAIL before running.
--
-- Run the entire file in Supabase SQL Editor.
-- This version does not use temp tables, so it avoids "relation temp table does not exist" errors.

DO $$
DECLARE
  target_email TEXT := 'REPLACE_WITH_PATIENT_EMAIL';
  target_ids UUID[] := ARRAY[]::UUID[];
  appointment_ids UUID[] := ARRAY[]::UUID[];
BEGIN
  SELECT COALESCE(array_agg(id), ARRAY[]::UUID[])
  INTO target_ids
  FROM (
    SELECT id
    FROM auth.users
    WHERE lower(email) = lower(target_email)

    UNION

    SELECT id
    FROM public.profiles
    WHERE lower(email) = lower(target_email)
       OR id IN (
         SELECT id
         FROM auth.users
         WHERE lower(email) = lower(target_email)
       )
  ) target;

  IF array_length(target_ids, 1) IS NULL THEN
    RAISE NOTICE 'No account found for %', target_email;
    RETURN;
  END IF;

  IF to_regclass('public.doctor_consultations') IS NOT NULL THEN
    EXECUTE '
      SELECT COALESCE(array_agg(id), ARRAY[]::UUID[])
      FROM public.doctor_consultations
      WHERE patient_id = ANY($1)
    '
    INTO appointment_ids
    USING target_ids;
  END IF;

  IF to_regclass('public.doctor_availability') IS NOT NULL
     AND to_regclass('public.doctor_consultations') IS NOT NULL THEN
    EXECUTE '
      UPDATE public.doctor_availability da
      SET is_booked = false
      FROM public.doctor_consultations dc
      WHERE dc.patient_id = ANY($1)
        AND da.doctor_id = dc.doctor_id
        AND da.available_date = dc.booking_date
        AND da.time_slot = dc.booking_time
    '
    USING target_ids;
  END IF;

  IF to_regclass('public.doctor_wallet_transactions') IS NOT NULL THEN
    IF EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'doctor_wallet_transactions'
        AND column_name = 'patient_id'
    ) THEN
      EXECUTE 'DELETE FROM public.doctor_wallet_transactions WHERE patient_id = ANY($1)'
      USING target_ids;
    END IF;

    IF EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'doctor_wallet_transactions'
        AND column_name = 'appointment_id'
    ) THEN
      EXECUTE 'DELETE FROM public.doctor_wallet_transactions WHERE appointment_id = ANY($1)'
      USING appointment_ids;
    END IF;
  END IF;

  IF to_regclass('public.messages') IS NOT NULL THEN
    EXECUTE 'DELETE FROM public.messages WHERE sender_id = ANY($1) OR receiver_id = ANY($1)'
    USING target_ids;
  END IF;

  IF to_regclass('public.patient_notifications') IS NOT NULL THEN
    EXECUTE 'DELETE FROM public.patient_notifications WHERE patient_id = ANY($1)'
    USING target_ids;
  END IF;

  IF to_regclass('public.email_logs') IS NOT NULL THEN
    EXECUTE 'DELETE FROM public.email_logs WHERE patient_id = ANY($1)'
    USING target_ids;
  END IF;

  IF to_regclass('public.payment_transactions') IS NOT NULL THEN
    EXECUTE 'DELETE FROM public.payment_transactions WHERE patient_id = ANY($1)'
    USING target_ids;
  END IF;

  IF to_regclass('public.staff_consultations') IS NOT NULL THEN
    EXECUTE 'DELETE FROM public.staff_consultations WHERE patient_id = ANY($1)'
    USING target_ids;
  END IF;

  IF to_regclass('public.doctor_consultations') IS NOT NULL THEN
    EXECUTE 'DELETE FROM public.doctor_consultations WHERE patient_id = ANY($1)'
    USING target_ids;
  END IF;

  IF to_regclass('public.care_team_assignments') IS NOT NULL THEN
    EXECUTE 'DELETE FROM public.care_team_assignments WHERE patient_id = ANY($1)'
    USING target_ids;
  END IF;

  IF to_regclass('public.progress_logs') IS NOT NULL THEN
    EXECUTE 'DELETE FROM public.progress_logs WHERE user_id = ANY($1)'
    USING target_ids;
  END IF;

  IF to_regclass('public.health_assessments') IS NOT NULL THEN
    EXECUTE 'DELETE FROM public.health_assessments WHERE patient_id = ANY($1)'
    USING target_ids;
  END IF;

  IF to_regclass('public.patient_journey_state') IS NOT NULL THEN
    EXECUTE 'DELETE FROM public.patient_journey_state WHERE patient_id = ANY($1)'
    USING target_ids;
  END IF;

  IF to_regclass('public.password_reset_otps') IS NOT NULL THEN
    EXECUTE 'DELETE FROM public.password_reset_otps WHERE lower(email) = lower($1)'
    USING target_email;
  END IF;

  IF to_regclass('public.password_reset_tokens') IS NOT NULL THEN
    EXECUTE 'DELETE FROM public.password_reset_tokens WHERE user_id = ANY($1)'
    USING target_ids;
  END IF;

  IF to_regclass('public.email_verification_tokens') IS NOT NULL THEN
    EXECUTE 'DELETE FROM public.email_verification_tokens WHERE user_id = ANY($1)'
    USING target_ids;
  END IF;

  IF to_regclass('public.auth_audit_logs') IS NOT NULL THEN
    EXECUTE 'DELETE FROM public.auth_audit_logs WHERE user_id = ANY($1) OR lower(email) = lower($2)'
    USING target_ids, target_email;
  END IF;

  DELETE FROM public.profiles
  WHERE id = ANY(target_ids)
     OR lower(email) = lower(target_email);

  DELETE FROM auth.users
  WHERE id = ANY(target_ids)
     OR lower(email) = lower(target_email);

  RAISE NOTICE 'Deleted account and linked patient data for %', target_email;
END $$;

SELECT
  (SELECT COUNT(*) FROM public.profiles WHERE lower(email) = lower('REPLACE_WITH_PATIENT_EMAIL')) AS remaining_profiles,
  (SELECT COUNT(*) FROM auth.users WHERE lower(email) = lower('REPLACE_WITH_PATIENT_EMAIL')) AS remaining_auth_users;
