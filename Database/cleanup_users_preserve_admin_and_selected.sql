-- Cleanup Supabase users while preserving admin accounts and selected emails.
--
-- Preserved:
--   1. Any profile with role = 'admin'
--   2. jmstanly19122006@gmail.com
--   3. stanlyj72@gamil.com
--   4. stanlyj72@gmail.com  -- included in case "gamil.com" was a typo
--
-- How to use:
--   1. Run this file as-is in Supabase SQL Editor. It is a DRY RUN.
--   2. Review the notices/counts.
--   3. Change dry_run := true to dry_run := false and run again to delete.

DO $$
DECLARE
  dry_run BOOLEAN := true;
  keep_emails TEXT[] := ARRAY[
    'jmstanly19122006@gmail.com',
    'stanlyj72@gamil.com',
    'stanlyj72@gmail.com'
  ];
  target_ids UUID[] := ARRAY[]::UUID[];
  target_count INTEGER := 0;
  deleted_rows INTEGER := 0;
  total_deleted_rows INTEGER := 0;
  table_column RECORD;
BEGIN
  SELECT COALESCE(array_agg(user_id), ARRAY[]::UUID[])
  INTO target_ids
  FROM (
    SELECT u.id AS user_id
    FROM auth.users u
    LEFT JOIN public.profiles p ON p.id = u.id
    WHERE lower(COALESCE(u.email, '')) <> ALL(keep_emails)
      AND lower(COALESCE(p.email, '')) <> ALL(keep_emails)
      AND lower(COALESCE(p.role, '')) <> 'admin'
  ) users_to_delete;

  target_count := COALESCE(array_length(target_ids, 1), 0);

  RAISE NOTICE 'Users selected for deletion: %', target_count;

  IF target_count = 0 THEN
    RAISE NOTICE 'No users to delete.';
    RETURN;
  END IF;

  RAISE NOTICE 'DRY RUN: %', dry_run;
  RAISE NOTICE 'Preserving emails: %', keep_emails;
  RAISE NOTICE 'Preserving any public.profiles row with role = admin';

  RAISE NOTICE 'Sample users that would be deleted:';
  PERFORM 1
  FROM (
    SELECT
      u.id,
      u.email,
      p.role
    FROM auth.users u
    LEFT JOIN public.profiles p ON p.id = u.id
    WHERE u.id = ANY(target_ids)
    ORDER BY u.created_at DESC NULLS LAST
    LIMIT 20
  ) sample;

  IF dry_run THEN
    RAISE NOTICE 'Dry run complete. Change dry_run to false to delete these users and linked public rows.';
    RETURN;
  END IF;

  -- Delete linked rows in public tables first. This catches patient, provider,
  -- doctor, wallet, pharmacy, assessment, notification, payment, and audit rows
  -- whose UUID columns reference a deleted auth user/profile.
  FOR table_column IN
    SELECT table_schema, table_name, column_name
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND data_type = 'uuid'
      AND column_name IN (
        'id',
        'user_id',
        'patient_id',
        'provider_id',
        'doctor_id',
        'dietitian_id',
        'nutritionist_id',
        'fitness_coach_id',
        'trainer_id',
        'staff_id',
        'driver_id',
        'pharmacist_id',
        'assigned_admin_id',
        'created_by',
        'updated_by',
        'approved_by',
        'reviewed_by',
        'verified_by',
        'rejected_by',
        'suspended_by',
        'actor_id',
        'recipient_user_id',
        'requester_user_id',
        'processed_by',
        'initiated_by',
        'resolved_by',
        'uploaded_by',
        'acknowledged_by',
        'authenticated_user_id'
      )
    ORDER BY
      CASE WHEN table_name = 'profiles' THEN 2 ELSE 1 END,
      table_name,
      column_name
  LOOP
    EXECUTE format(
      'DELETE FROM %I.%I WHERE %I = ANY($1)',
      table_column.table_schema,
      table_column.table_name,
      table_column.column_name
    )
    USING target_ids;

    GET DIAGNOSTICS deleted_rows = ROW_COUNT;
    total_deleted_rows := total_deleted_rows + deleted_rows;

    IF deleted_rows > 0 THEN
      RAISE NOTICE 'Deleted % rows from %.% using column %',
        deleted_rows,
        table_column.table_schema,
        table_column.table_name,
        table_column.column_name;
    END IF;
  END LOOP;

  -- Delete auth-owned rows that may block auth.users deletion.
  IF to_regclass('auth.identities') IS NOT NULL THEN
    DELETE FROM auth.identities WHERE user_id = ANY(target_ids);
    GET DIAGNOSTICS deleted_rows = ROW_COUNT;
    RAISE NOTICE 'Deleted % auth.identities rows', deleted_rows;
  END IF;

  IF to_regclass('auth.refresh_tokens') IS NOT NULL THEN
    DELETE FROM auth.refresh_tokens
    WHERE session_id IN (
      SELECT id::text
      FROM auth.sessions
      WHERE user_id = ANY(target_ids)
    );
    GET DIAGNOSTICS deleted_rows = ROW_COUNT;
    RAISE NOTICE 'Deleted % auth.refresh_tokens rows', deleted_rows;
  END IF;

  IF to_regclass('auth.sessions') IS NOT NULL THEN
    DELETE FROM auth.sessions WHERE user_id = ANY(target_ids);
    GET DIAGNOSTICS deleted_rows = ROW_COUNT;
    RAISE NOTICE 'Deleted % auth.sessions rows', deleted_rows;
  END IF;

  DELETE FROM auth.users WHERE id = ANY(target_ids);
  GET DIAGNOSTICS deleted_rows = ROW_COUNT;

  RAISE NOTICE 'Deleted % auth.users rows', deleted_rows;
  RAISE NOTICE 'Deleted % linked public rows', total_deleted_rows;
END $$;

SELECT
  u.id,
  u.email,
  p.role,
  u.created_at
FROM auth.users u
LEFT JOIN public.profiles p ON p.id = u.id
ORDER BY
  CASE WHEN lower(COALESCE(p.role, '')) = 'admin' THEN 0 ELSE 1 END,
  lower(COALESCE(u.email, ''));
