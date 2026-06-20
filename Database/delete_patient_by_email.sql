-- Delete one patient account from 8liv by email.
--
-- Replace the placeholder below with the target account before running.
--
-- Run this in Supabase SQL Editor.
-- First run the PREVIEW section and confirm it finds the correct patient.
-- Then run the DELETE section.

-- ============================================================
-- PREVIEW
-- ============================================================

DROP TABLE IF EXISTS tmp_8liv_target_patient_email;
DROP TABLE IF EXISTS tmp_8liv_patient_preview_ids;
DROP TABLE IF EXISTS tmp_8liv_patient_preview_appointment_ids;
DROP TABLE IF EXISTS tmp_8liv_patient_delete_preview;

CREATE TEMP TABLE tmp_8liv_target_patient_email (email TEXT NOT NULL);
INSERT INTO tmp_8liv_target_patient_email (email)
VALUES ('REPLACE_WITH_PATIENT_EMAIL');

CREATE TEMP TABLE tmp_8liv_patient_preview_ids AS
SELECT id, email
FROM public.profiles
WHERE lower(email) = lower((SELECT email FROM tmp_8liv_target_patient_email LIMIT 1))
   OR id IN (
     SELECT id
     FROM auth.users
     WHERE lower(email) = lower((SELECT email FROM tmp_8liv_target_patient_email LIMIT 1))
   )
UNION
SELECT id, email
FROM auth.users
WHERE lower(email) = lower((SELECT email FROM tmp_8liv_target_patient_email LIMIT 1));

CREATE TEMP TABLE tmp_8liv_patient_preview_appointment_ids (id UUID);

DO $$
BEGIN
  IF to_regclass('public.doctor_consultations') IS NOT NULL THEN
    INSERT INTO tmp_8liv_patient_preview_appointment_ids
    SELECT id
    FROM public.doctor_consultations
    WHERE patient_id IN (SELECT id FROM tmp_8liv_patient_preview_ids);
  END IF;
END $$;

CREATE TEMP TABLE tmp_8liv_patient_delete_preview (
  table_name TEXT,
  rows_to_delete BIGINT
);

INSERT INTO tmp_8liv_patient_delete_preview
SELECT 'profiles(target email)', COUNT(*)
FROM public.profiles
WHERE id IN (SELECT id FROM tmp_8liv_patient_preview_ids);

DO $$
BEGIN
  IF to_regclass('public.health_assessments') IS NOT NULL THEN
    INSERT INTO tmp_8liv_patient_delete_preview
    SELECT 'health_assessments', COUNT(*) FROM public.health_assessments
    WHERE patient_id IN (SELECT id FROM tmp_8liv_patient_preview_ids);
  END IF;

  IF to_regclass('public.patient_journey_state') IS NOT NULL THEN
    INSERT INTO tmp_8liv_patient_delete_preview
    SELECT 'patient_journey_state', COUNT(*) FROM public.patient_journey_state
    WHERE patient_id IN (SELECT id FROM tmp_8liv_patient_preview_ids);
  END IF;

  IF to_regclass('public.doctor_consultations') IS NOT NULL THEN
    INSERT INTO tmp_8liv_patient_delete_preview
    SELECT 'doctor_consultations', COUNT(*) FROM public.doctor_consultations
    WHERE patient_id IN (SELECT id FROM tmp_8liv_patient_preview_ids);
  END IF;

  IF to_regclass('public.staff_consultations') IS NOT NULL THEN
    INSERT INTO tmp_8liv_patient_delete_preview
    SELECT 'staff_consultations', COUNT(*) FROM public.staff_consultations
    WHERE patient_id IN (SELECT id FROM tmp_8liv_patient_preview_ids);
  END IF;

  IF to_regclass('public.payment_transactions') IS NOT NULL THEN
    INSERT INTO tmp_8liv_patient_delete_preview
    SELECT 'payment_transactions', COUNT(*) FROM public.payment_transactions
    WHERE patient_id IN (SELECT id FROM tmp_8liv_patient_preview_ids);
  END IF;

  IF to_regclass('public.patient_notifications') IS NOT NULL THEN
    INSERT INTO tmp_8liv_patient_delete_preview
    SELECT 'patient_notifications', COUNT(*) FROM public.patient_notifications
    WHERE patient_id IN (SELECT id FROM tmp_8liv_patient_preview_ids);
  END IF;

  IF to_regclass('public.care_team_assignments') IS NOT NULL THEN
    INSERT INTO tmp_8liv_patient_delete_preview
    SELECT 'care_team_assignments', COUNT(*) FROM public.care_team_assignments
    WHERE patient_id IN (SELECT id FROM tmp_8liv_patient_preview_ids);
  END IF;

  IF to_regclass('public.progress_logs') IS NOT NULL THEN
    INSERT INTO tmp_8liv_patient_delete_preview
    SELECT 'progress_logs', COUNT(*) FROM public.progress_logs
    WHERE user_id IN (SELECT id FROM tmp_8liv_patient_preview_ids);
  END IF;

  IF to_regclass('public.messages') IS NOT NULL THEN
    INSERT INTO tmp_8liv_patient_delete_preview
    SELECT 'messages', COUNT(*) FROM public.messages
    WHERE sender_id IN (SELECT id FROM tmp_8liv_patient_preview_ids)
       OR receiver_id IN (SELECT id FROM tmp_8liv_patient_preview_ids);
  END IF;

  IF to_regclass('public.doctor_wallet_transactions') IS NOT NULL THEN
    IF EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'doctor_wallet_transactions'
        AND column_name = 'patient_id'
    ) AND EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'doctor_wallet_transactions'
        AND column_name = 'appointment_id'
    ) THEN
      INSERT INTO tmp_8liv_patient_delete_preview
      SELECT 'doctor_wallet_transactions(patient-linked)', COUNT(*)
      FROM public.doctor_wallet_transactions
      WHERE patient_id IN (SELECT id FROM tmp_8liv_patient_preview_ids)
         OR appointment_id IN (SELECT id FROM tmp_8liv_patient_preview_appointment_ids);
    ELSIF EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'doctor_wallet_transactions'
        AND column_name = 'appointment_id'
    ) THEN
      INSERT INTO tmp_8liv_patient_delete_preview
      SELECT 'doctor_wallet_transactions(appointment-linked)', COUNT(*)
      FROM public.doctor_wallet_transactions
      WHERE appointment_id IN (SELECT id FROM tmp_8liv_patient_preview_appointment_ids);
    ELSIF EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'doctor_wallet_transactions'
        AND column_name = 'patient_id'
    ) THEN
      INSERT INTO tmp_8liv_patient_delete_preview
      SELECT 'doctor_wallet_transactions(patient-linked)', COUNT(*)
      FROM public.doctor_wallet_transactions
      WHERE patient_id IN (SELECT id FROM tmp_8liv_patient_preview_ids);
    ELSE
      INSERT INTO tmp_8liv_patient_delete_preview
      VALUES ('doctor_wallet_transactions(no patient/appointment column)', 0);
    END IF;
  END IF;

  IF to_regclass('public.email_logs') IS NOT NULL THEN
    INSERT INTO tmp_8liv_patient_delete_preview
    SELECT 'email_logs', COUNT(*) FROM public.email_logs
    WHERE patient_id IN (SELECT id FROM tmp_8liv_patient_preview_ids);
  END IF;

  IF to_regclass('auth.users') IS NOT NULL THEN
    INSERT INTO tmp_8liv_patient_delete_preview
    SELECT 'auth.users', COUNT(*) FROM auth.users
    WHERE id IN (SELECT id FROM tmp_8liv_patient_preview_ids)
       OR lower(email) = lower((SELECT email FROM tmp_8liv_target_patient_email LIMIT 1));
  END IF;
END $$;

SELECT id, email
FROM tmp_8liv_patient_preview_ids;

SELECT *
FROM tmp_8liv_patient_delete_preview
ORDER BY table_name;

-- ============================================================
-- DELETE
-- ============================================================
-- Destructive. Take a backup first.
-- To test safely, change COMMIT to ROLLBACK.

BEGIN;

CREATE TEMP TABLE tmp_8liv_patient_ids ON COMMIT DROP AS
SELECT id, email
FROM public.profiles
WHERE lower(email) = lower((SELECT email FROM tmp_8liv_target_patient_email LIMIT 1))
   OR id IN (
     SELECT id
     FROM auth.users
     WHERE lower(email) = lower((SELECT email FROM tmp_8liv_target_patient_email LIMIT 1))
   )
UNION
SELECT id, email
FROM auth.users
WHERE lower(email) = lower((SELECT email FROM tmp_8liv_target_patient_email LIMIT 1));

CREATE TEMP TABLE tmp_8liv_patient_appointment_ids (id UUID) ON COMMIT DROP;

DO $$
BEGIN
  IF to_regclass('public.doctor_consultations') IS NOT NULL THEN
    INSERT INTO tmp_8liv_patient_appointment_ids
    SELECT id
    FROM public.doctor_consultations
    WHERE patient_id IN (SELECT id FROM tmp_8liv_patient_ids);
  END IF;
END $$;

DO $$
BEGIN
  IF to_regclass('public.doctor_availability') IS NOT NULL
     AND to_regclass('public.doctor_consultations') IS NOT NULL THEN
    UPDATE public.doctor_availability da
    SET is_booked = false
    FROM public.doctor_consultations dc
    WHERE dc.patient_id IN (SELECT id FROM tmp_8liv_patient_ids)
      AND da.doctor_id = dc.doctor_id
      AND da.available_date = dc.booking_date
      AND da.time_slot = dc.booking_time;
  END IF;
END $$;

DO $$
BEGIN
  IF to_regclass('public.doctor_wallet_transactions') IS NOT NULL THEN
    IF EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'doctor_wallet_transactions'
        AND column_name = 'patient_id'
    ) AND EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'doctor_wallet_transactions'
        AND column_name = 'appointment_id'
    ) THEN
      DELETE FROM public.doctor_wallet_transactions
      WHERE patient_id IN (SELECT id FROM tmp_8liv_patient_ids)
         OR appointment_id IN (SELECT id FROM tmp_8liv_patient_appointment_ids);
    ELSIF EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'doctor_wallet_transactions'
        AND column_name = 'appointment_id'
    ) THEN
      DELETE FROM public.doctor_wallet_transactions
      WHERE appointment_id IN (SELECT id FROM tmp_8liv_patient_appointment_ids);
    ELSIF EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'doctor_wallet_transactions'
        AND column_name = 'patient_id'
    ) THEN
      DELETE FROM public.doctor_wallet_transactions
      WHERE patient_id IN (SELECT id FROM tmp_8liv_patient_ids);
    END IF;
  END IF;

  IF to_regclass('public.messages') IS NOT NULL THEN
    DELETE FROM public.messages
    WHERE sender_id IN (SELECT id FROM tmp_8liv_patient_ids)
       OR receiver_id IN (SELECT id FROM tmp_8liv_patient_ids);
  END IF;

  IF to_regclass('public.patient_notifications') IS NOT NULL THEN
    DELETE FROM public.patient_notifications
    WHERE patient_id IN (SELECT id FROM tmp_8liv_patient_ids);
  END IF;

  IF to_regclass('public.email_logs') IS NOT NULL THEN
    DELETE FROM public.email_logs
    WHERE patient_id IN (SELECT id FROM tmp_8liv_patient_ids);
  END IF;

  IF to_regclass('public.payment_transactions') IS NOT NULL THEN
    DELETE FROM public.payment_transactions
    WHERE patient_id IN (SELECT id FROM tmp_8liv_patient_ids);
  END IF;

  IF to_regclass('public.staff_consultations') IS NOT NULL THEN
    DELETE FROM public.staff_consultations
    WHERE patient_id IN (SELECT id FROM tmp_8liv_patient_ids);
  END IF;

  IF to_regclass('public.doctor_consultations') IS NOT NULL THEN
    DELETE FROM public.doctor_consultations
    WHERE patient_id IN (SELECT id FROM tmp_8liv_patient_ids);
  END IF;

  IF to_regclass('public.care_team_assignments') IS NOT NULL THEN
    DELETE FROM public.care_team_assignments
    WHERE patient_id IN (SELECT id FROM tmp_8liv_patient_ids);
  END IF;

  IF to_regclass('public.progress_logs') IS NOT NULL THEN
    DELETE FROM public.progress_logs
    WHERE user_id IN (SELECT id FROM tmp_8liv_patient_ids);
  END IF;

  IF to_regclass('public.health_assessments') IS NOT NULL THEN
    DELETE FROM public.health_assessments
    WHERE patient_id IN (SELECT id FROM tmp_8liv_patient_ids);
  END IF;

  IF to_regclass('public.patient_journey_state') IS NOT NULL THEN
    DELETE FROM public.patient_journey_state
    WHERE patient_id IN (SELECT id FROM tmp_8liv_patient_ids);
  END IF;

  IF to_regclass('public.password_reset_otps') IS NOT NULL THEN
    DELETE FROM public.password_reset_otps
    WHERE lower(email) = lower((SELECT email FROM tmp_8liv_target_patient_email LIMIT 1));
  END IF;

  IF to_regclass('public.password_reset_tokens') IS NOT NULL THEN
    DELETE FROM public.password_reset_tokens
    WHERE user_id IN (SELECT id FROM tmp_8liv_patient_ids);
  END IF;

  IF to_regclass('public.email_verification_tokens') IS NOT NULL THEN
    DELETE FROM public.email_verification_tokens
    WHERE user_id IN (SELECT id FROM tmp_8liv_patient_ids);
  END IF;

  IF to_regclass('public.auth_audit_logs') IS NOT NULL THEN
    DELETE FROM public.auth_audit_logs
    WHERE user_id IN (SELECT id FROM tmp_8liv_patient_ids)
       OR lower(email) = lower((SELECT email FROM tmp_8liv_target_patient_email LIMIT 1));
  END IF;
END $$;

DELETE FROM public.profiles
WHERE id IN (SELECT id FROM tmp_8liv_patient_ids);

DELETE FROM auth.users
WHERE id IN (SELECT id FROM tmp_8liv_patient_ids)
   OR lower(email) = lower((SELECT email FROM tmp_8liv_target_patient_email LIMIT 1));

COMMIT;

SELECT COUNT(*) AS remaining_patient_profiles_for_email
FROM public.profiles
WHERE lower(email) = lower((SELECT email FROM tmp_8liv_target_patient_email LIMIT 1))
   OR id IN (
     SELECT id
     FROM auth.users
     WHERE lower(email) = lower((SELECT email FROM tmp_8liv_target_patient_email LIMIT 1))
   );
