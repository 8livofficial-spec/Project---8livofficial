-- ==============================================================================
-- DELETE TEST PATIENTS BY PHONE NUMBER
-- ==============================================================================
-- Phones : 9443577411 and 9944023986 (test accounts)
--
-- INSTRUCTIONS:
-- 1. Run STEP 1 first to PREVIEW what will be deleted. Confirm it's correct.
-- 2. Then run STEP 2 to actually delete all data + auth users.
-- 3. Run STEP 3 to verify they are gone.
--
-- Run in Supabase Dashboard → SQL Editor
-- ==============================================================================

-- ==============================================================================
-- STEP 1: PREVIEW — What will be deleted?
-- ==============================================================================

SELECT
  p.id,
  p.email,
  p.phone_number,
  p.role,
  p.first_name,
  p.last_name,
  p.created_at
FROM public.profiles p
WHERE p.phone_number IN (
  '9443577411', '+919443577411',
  '9944023986', '+919944023986'
)
ORDER BY p.created_at DESC;

-- Also check auth.users
SELECT
  u.id,
  u.email,
  u.phone,
  u.created_at
FROM auth.users u
WHERE
  u.phone IN ('9443577411', '+919443577411', '9944023986', '+919944023986')
  OR u.id IN (
    SELECT id FROM public.profiles
    WHERE phone_number IN (
      '9443577411', '+919443577411',
      '9944023986', '+919944023986'
    )
  );

-- ==============================================================================
-- STEP 2: DELETE — Run ONLY after confirming Step 1 above
-- ==============================================================================

DO $$
DECLARE
  v_ids UUID[];
  v_consult_ids UUID[];
  v_rx_ids UUID[];
  v_order_ids UUID[];
BEGIN

  -- Collect all matching user IDs (from profiles by phone number)
  SELECT ARRAY_AGG(DISTINCT id) INTO v_ids
  FROM public.profiles
  WHERE phone_number IN (
    '9443577411', '+919443577411',
    '9944023986', '+919944023986'
  );

  -- Also pull any auth users matched by phone directly
  SELECT ARRAY_AGG(DISTINCT id) INTO v_ids
  FROM (
    SELECT UNNEST(v_ids) AS id
    UNION
    SELECT id FROM auth.users
    WHERE phone IN ('9443577411', '+919443577411', '9944023986', '+919944023986')
  ) combined;

  IF v_ids IS NULL OR array_length(v_ids, 1) = 0 THEN
    RAISE NOTICE 'No matching users found. Aborting.';
    RETURN;
  END IF;

  RAISE NOTICE 'Deleting data for % user(s): %', array_length(v_ids, 1), v_ids;

  -- Collect consultation IDs for these patients
  IF to_regclass('public.doctor_consultations') IS NOT NULL THEN
    SELECT ARRAY_AGG(id) INTO v_consult_ids
    FROM public.doctor_consultations
    WHERE patient_id = ANY(v_ids);
  END IF;

  -- Collect prescription IDs
  IF to_regclass('public.prescriptions') IS NOT NULL THEN
    SELECT ARRAY_AGG(id) INTO v_rx_ids
    FROM public.prescriptions
    WHERE patient_id = ANY(v_ids)
       OR (v_consult_ids IS NOT NULL AND consultation_id = ANY(v_consult_ids));
  END IF;

  -- Collect pharmacy order IDs
  IF to_regclass('public.pharmacy_orders') IS NOT NULL THEN
    SELECT ARRAY_AGG(id) INTO v_order_ids
    FROM public.pharmacy_orders
    WHERE patient_id = ANY(v_ids)
       OR (v_rx_ids IS NOT NULL AND prescription_id = ANY(v_rx_ids));
  END IF;

  -- --------------------------------------------------------
  -- WhatsApp outbox / messages / OTP
  -- --------------------------------------------------------
  BEGIN
    IF to_regclass('public.whatsapp_outbox_queue') IS NOT NULL THEN
      DELETE FROM public.whatsapp_outbox_queue
      WHERE recipient_phone IN (
        '9443577411', '+919443577411', '919443577411',
        '9944023986', '+919944023986', '919944023986'
      );
      RAISE NOTICE 'Deleted whatsapp_outbox_queue rows';
    END IF;
  EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped whatsapp_outbox_queue: %', SQLERRM;
  END;

  BEGIN
    IF to_regclass('public.whatsapp_otp_challenges') IS NOT NULL THEN
      DELETE FROM public.whatsapp_otp_challenges
      WHERE phone_number IN (
        '9443577411', '+919443577411', '919443577411',
        '9944023986', '+919944023986', '919944023986'
      ) OR user_id = ANY(v_ids);
      RAISE NOTICE 'Deleted whatsapp_otp_challenges rows';
    END IF;
  EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped whatsapp_otp_challenges: %', SQLERRM;
  END;

  BEGIN
    IF to_regclass('public.whatsapp_messages') IS NOT NULL THEN
      DELETE FROM public.whatsapp_messages
      WHERE user_id = ANY(v_ids)
         OR recipient_phone IN (
           '9443577411', '+919443577411', '919443577411',
           '9944023986', '+919944023986', '919944023986'
         );
      RAISE NOTICE 'Deleted whatsapp_messages rows';
    END IF;
  EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped whatsapp_messages: %', SQLERRM;
  END;

  BEGIN
    IF to_regclass('public.whatsapp_conversations') IS NOT NULL THEN
      DELETE FROM public.whatsapp_conversations
      WHERE user_id = ANY(v_ids)
         OR phone_number IN (
           '9443577411', '+919443577411', '919443577411',
           '9944023986', '+919944023986', '919944023986'
         );
      RAISE NOTICE 'Deleted whatsapp_conversations rows';
    END IF;
  EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped whatsapp_conversations: %', SQLERRM;
  END;

  BEGIN
    IF to_regclass('public.whatsapp_notification_preferences') IS NOT NULL THEN
      DELETE FROM public.whatsapp_notification_preferences WHERE user_id = ANY(v_ids);
      RAISE NOTICE 'Deleted whatsapp_notification_preferences rows';
    END IF;
  EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped whatsapp_notification_preferences: %', SQLERRM;
  END;

  -- --------------------------------------------------------
  -- Patient notifications & logs
  -- --------------------------------------------------------
  BEGIN
    IF to_regclass('public.patient_notifications') IS NOT NULL THEN
      DELETE FROM public.patient_notifications WHERE patient_id = ANY(v_ids);
      RAISE NOTICE 'Deleted patient_notifications rows';
    END IF;
  EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped patient_notifications: %', SQLERRM;
  END;

  BEGIN
    IF to_regclass('public.notification_events') IS NOT NULL THEN
      DELETE FROM public.notification_events WHERE user_id = ANY(v_ids);
      RAISE NOTICE 'Deleted notification_events rows';
    END IF;
  EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped notification_events: %', SQLERRM;
  END;

  -- --------------------------------------------------------
  -- Pharmacy orders and fulfillment history
  -- --------------------------------------------------------
  BEGIN
    IF to_regclass('public.fulfilment_audit_logs') IS NOT NULL AND v_order_ids IS NOT NULL THEN
      DELETE FROM public.fulfilment_audit_logs WHERE order_id = ANY(v_order_ids);
      RAISE NOTICE 'Deleted fulfilment_audit_logs rows';
    END IF;
  EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped fulfilment_audit_logs: %', SQLERRM;
  END;

  BEGIN
    IF to_regclass('public.pharmacy_order_status_history') IS NOT NULL AND v_order_ids IS NOT NULL THEN
      DELETE FROM public.pharmacy_order_status_history WHERE order_id = ANY(v_order_ids);
      RAISE NOTICE 'Deleted pharmacy_order_status_history rows';
    END IF;
  EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped pharmacy_order_status_history: %', SQLERRM;
  END;

  BEGIN
    IF to_regclass('public.pharmacy_orders') IS NOT NULL THEN
      DELETE FROM public.pharmacy_orders
      WHERE patient_id = ANY(v_ids)
         OR (v_rx_ids IS NOT NULL AND prescription_id = ANY(v_rx_ids));
      RAISE NOTICE 'Deleted pharmacy_orders rows';
    END IF;
  EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped pharmacy_orders: %', SQLERRM;
  END;

  -- --------------------------------------------------------
  -- Prescription items, consents & delivery addresses
  -- --------------------------------------------------------
  BEGIN
    IF to_regclass('public.prescription_items') IS NOT NULL AND v_rx_ids IS NOT NULL THEN
      DELETE FROM public.prescription_items WHERE prescription_id = ANY(v_rx_ids);
      RAISE NOTICE 'Deleted prescription_items rows';
    END IF;
  EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped prescription_items: %', SQLERRM;
  END;

  BEGIN
    IF to_regclass('public.patient_prescription_consents') IS NOT NULL THEN
      DELETE FROM public.patient_prescription_consents
      WHERE patient_id = ANY(v_ids)
         OR (v_rx_ids IS NOT NULL AND prescription_id = ANY(v_rx_ids));
      RAISE NOTICE 'Deleted patient_prescription_consents rows';
    END IF;
  EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped patient_prescription_consents: %', SQLERRM;
  END;

  BEGIN
    IF to_regclass('public.patient_delivery_addresses') IS NOT NULL THEN
      DELETE FROM public.patient_delivery_addresses WHERE patient_id = ANY(v_ids);
      RAISE NOTICE 'Deleted patient_delivery_addresses rows';
    END IF;
  EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped patient_delivery_addresses: %', SQLERRM;
  END;

  BEGIN
    IF to_regclass('public.medication_review_requests') IS NOT NULL THEN
      DELETE FROM public.medication_review_requests WHERE patient_id = ANY(v_ids);
      RAISE NOTICE 'Deleted medication_review_requests rows';
    END IF;
  EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped medication_review_requests: %', SQLERRM;
  END;

  -- --------------------------------------------------------
  -- Wallet transactions linked to consultations
  -- --------------------------------------------------------
  BEGIN
    IF to_regclass('public.doctor_wallet_transactions') IS NOT NULL AND v_consult_ids IS NOT NULL THEN
      DELETE FROM public.doctor_wallet_transactions WHERE appointment_id = ANY(v_consult_ids);
      RAISE NOTICE 'Deleted doctor_wallet_transactions rows';
    END IF;
  EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped doctor_wallet_transactions: %', SQLERRM;
  END;

  -- --------------------------------------------------------
  -- Consultation Ratings
  -- --------------------------------------------------------
  BEGIN
    IF to_regclass('public.consultation_ratings') IS NOT NULL THEN
      DELETE FROM public.consultation_ratings
      WHERE patient_id = ANY(v_ids)
         OR (v_consult_ids IS NOT NULL AND consultation_id = ANY(v_consult_ids));
      RAISE NOTICE 'Deleted consultation_ratings rows';
    END IF;
  EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped consultation_ratings: %', SQLERRM;
  END;

  BEGIN
    IF to_regclass('public.doctor_consultation_ratings') IS NOT NULL THEN
      DELETE FROM public.doctor_consultation_ratings
      WHERE patient_id = ANY(v_ids)
         OR (v_consult_ids IS NOT NULL AND consultation_id = ANY(v_consult_ids));
      RAISE NOTICE 'Deleted doctor_consultation_ratings rows';
    END IF;
  EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped doctor_consultation_ratings: %', SQLERRM;
  END;

  -- --------------------------------------------------------
  -- Prescriptions & E-prescriptions
  -- (Must be deleted BEFORE doctor_consultations due to FK)
  -- --------------------------------------------------------
  BEGIN
    IF to_regclass('public.prescriptions') IS NOT NULL THEN
      DELETE FROM public.prescriptions
      WHERE patient_id = ANY(v_ids)
         OR (v_consult_ids IS NOT NULL AND consultation_id = ANY(v_consult_ids));
      RAISE NOTICE 'Deleted prescriptions rows';
    END IF;
  EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped prescriptions: %', SQLERRM;
  END;

  BEGIN
    IF to_regclass('public.eprescriptions') IS NOT NULL THEN
      DELETE FROM public.eprescriptions
      WHERE patient_id = ANY(v_ids)
         OR (v_consult_ids IS NOT NULL AND consultation_id = ANY(v_consult_ids));
      RAISE NOTICE 'Deleted eprescriptions rows';
    END IF;
  EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped eprescriptions: %', SQLERRM;
  END;

  -- --------------------------------------------------------
  -- Consultations
  -- --------------------------------------------------------
  BEGIN
    IF to_regclass('public.doctor_consultations') IS NOT NULL THEN
      DELETE FROM public.doctor_consultations WHERE patient_id = ANY(v_ids);
      RAISE NOTICE 'Deleted doctor_consultations rows';
    END IF;
  EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped doctor_consultations: %', SQLERRM;
  END;

  BEGIN
    IF to_regclass('public.staff_consultations') IS NOT NULL THEN
      DELETE FROM public.staff_consultations WHERE patient_id = ANY(v_ids);
      RAISE NOTICE 'Deleted staff_consultations rows';
    END IF;
  EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped staff_consultations: %', SQLERRM;
  END;

  -- --------------------------------------------------------
  -- Payment transactions
  -- --------------------------------------------------------
  BEGIN
    IF to_regclass('public.payment_transactions') IS NOT NULL THEN
      DELETE FROM public.payment_transactions WHERE patient_id = ANY(v_ids);
      RAISE NOTICE 'Deleted payment_transactions rows';
    END IF;
  EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped payment_transactions: %', SQLERRM;
  END;

  -- --------------------------------------------------------
  -- Care team assignments & care plans
  -- --------------------------------------------------------
  BEGIN
    IF to_regclass('public.care_team_assignments') IS NOT NULL THEN
      DELETE FROM public.care_team_assignments WHERE patient_id = ANY(v_ids);
      RAISE NOTICE 'Deleted care_team_assignments rows';
    END IF;
  EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped care_team_assignments: %', SQLERRM;
  END;

  BEGIN
    IF to_regclass('public.patient_care_plans') IS NOT NULL THEN
      DELETE FROM public.patient_care_plans WHERE patient_id = ANY(v_ids);
      RAISE NOTICE 'Deleted patient_care_plans rows';
    END IF;
  EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped patient_care_plans: %', SQLERRM;
  END;

  BEGIN
    IF to_regclass('public.care_plans') IS NOT NULL THEN
      DELETE FROM public.care_plans WHERE patient_id = ANY(v_ids);
      RAISE NOTICE 'Deleted care_plans rows';
    END IF;
  EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped care_plans: %', SQLERRM;
  END;

  BEGIN
    IF to_regclass('public.treatment_plans') IS NOT NULL THEN
      DELETE FROM public.treatment_plans WHERE patient_id = ANY(v_ids);
      RAISE NOTICE 'Deleted treatment_plans rows';
    END IF;
  EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped treatment_plans: %', SQLERRM;
  END;

  BEGIN
    IF to_regclass('public.treatment_cycles') IS NOT NULL THEN
      DELETE FROM public.treatment_cycles WHERE patient_id = ANY(v_ids);
      RAISE NOTICE 'Deleted treatment_cycles rows';
    END IF;
  EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped treatment_cycles: %', SQLERRM;
  END;

  -- --------------------------------------------------------
  -- Health assessments & journey
  -- --------------------------------------------------------
  BEGIN
    IF to_regclass('public.health_assessments') IS NOT NULL THEN
      DELETE FROM public.health_assessments WHERE patient_id = ANY(v_ids);
      RAISE NOTICE 'Deleted health_assessments rows';
    END IF;
  EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped health_assessments: %', SQLERRM;
  END;

  BEGIN
    IF to_regclass('public.patient_journey_state') IS NOT NULL THEN
      DELETE FROM public.patient_journey_state WHERE patient_id = ANY(v_ids);
      RAISE NOTICE 'Deleted patient_journey_state rows';
    END IF;
  EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped patient_journey_state: %', SQLERRM;
  END;

  BEGIN
    IF to_regclass('public.progress_logs') IS NOT NULL THEN
      DELETE FROM public.progress_logs WHERE user_id = ANY(v_ids);
      RAISE NOTICE 'Deleted progress_logs rows';
    END IF;
  EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped progress_logs: %', SQLERRM;
  END;

  -- --------------------------------------------------------
  -- Nutrition plans, logs, lab reports
  -- --------------------------------------------------------
  BEGIN
    IF to_regclass('public.nutrition_plans') IS NOT NULL THEN
      DELETE FROM public.nutrition_plans WHERE patient_id = ANY(v_ids);
      RAISE NOTICE 'Deleted nutrition_plans rows';
    END IF;
  EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped nutrition_plans: %', SQLERRM;
  END;

  BEGIN
    IF to_regclass('public.diet_plans') IS NOT NULL THEN
      DELETE FROM public.diet_plans WHERE patient_id = ANY(v_ids);
      RAISE NOTICE 'Deleted diet_plans rows';
    END IF;
  EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped diet_plans: %', SQLERRM;
  END;

  BEGIN
    IF to_regclass('public.fitness_plans') IS NOT NULL THEN
      DELETE FROM public.fitness_plans WHERE patient_id = ANY(v_ids);
      RAISE NOTICE 'Deleted fitness_plans rows';
    END IF;
  EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped fitness_plans: %', SQLERRM;
  END;

  BEGIN
    IF to_regclass('public.meal_logs') IS NOT NULL THEN
      DELETE FROM public.meal_logs WHERE patient_id = ANY(v_ids);
      RAISE NOTICE 'Deleted meal_logs rows';
    END IF;
  EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped meal_logs: %', SQLERRM;
  END;

  BEGIN
    IF to_regclass('public.food_logs') IS NOT NULL THEN
      DELETE FROM public.food_logs WHERE patient_id = ANY(v_ids);
      RAISE NOTICE 'Deleted food_logs rows';
    END IF;
  EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped food_logs: %', SQLERRM;
  END;

  BEGIN
    IF to_regclass('public.lab_reports') IS NOT NULL THEN
      DELETE FROM public.lab_reports WHERE patient_id = ANY(v_ids);
      RAISE NOTICE 'Deleted lab_reports rows';
    END IF;
  EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped lab_reports: %', SQLERRM;
  END;

  BEGIN
    IF to_regclass('public.lab_collection_requests') IS NOT NULL THEN
      DELETE FROM public.lab_collection_requests WHERE patient_id = ANY(v_ids);
      RAISE NOTICE 'Deleted lab_collection_requests rows';
    END IF;
  EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped lab_collection_requests: %', SQLERRM;
  END;

  -- --------------------------------------------------------
  -- Messages
  -- --------------------------------------------------------
  BEGIN
    IF to_regclass('public.messages') IS NOT NULL THEN
      DELETE FROM public.messages
      WHERE sender_id = ANY(v_ids) OR receiver_id = ANY(v_ids);
      RAISE NOTICE 'Deleted messages rows';
    END IF;
  EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped messages: %', SQLERRM;
  END;

  -- --------------------------------------------------------
  -- Memberships & Subscriptions
  -- --------------------------------------------------------
  BEGIN
    IF to_regclass('public.memberships') IS NOT NULL THEN
      DELETE FROM public.memberships WHERE patient_id = ANY(v_ids);
      RAISE NOTICE 'Deleted memberships rows';
    END IF;
  EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped memberships: %', SQLERRM;
  END;

  BEGIN
    IF to_regclass('public.patient_memberships') IS NOT NULL THEN
      DELETE FROM public.patient_memberships WHERE patient_id = ANY(v_ids);
      RAISE NOTICE 'Deleted patient_memberships rows';
    END IF;
  EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped patient_memberships: %', SQLERRM;
  END;

  BEGIN
    IF to_regclass('public.subscriptions') IS NOT NULL THEN
      DELETE FROM public.subscriptions WHERE patient_id = ANY(v_ids);
      RAISE NOTICE 'Deleted subscriptions rows';
    END IF;
  EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped subscriptions: %', SQLERRM;
  END;

  BEGIN
    IF to_regclass('public.patient_service_entitlements') IS NOT NULL THEN
      DELETE FROM public.patient_service_entitlements WHERE patient_id = ANY(v_ids);
      RAISE NOTICE 'Deleted patient_service_entitlements rows';
    END IF;
  EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped patient_service_entitlements: %', SQLERRM;
  END;

  BEGIN
    IF to_regclass('public.patient_booking_audit_logs') IS NOT NULL THEN
      DELETE FROM public.patient_booking_audit_logs WHERE patient_id = ANY(v_ids);
      RAISE NOTICE 'Deleted patient_booking_audit_logs rows';
    END IF;
  EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped patient_booking_audit_logs: %', SQLERRM;
  END;

  -- --------------------------------------------------------
  -- Profiles table
  -- --------------------------------------------------------
  BEGIN
    DELETE FROM public.profiles WHERE id = ANY(v_ids);
    RAISE NOTICE 'Deleted profiles rows';
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'Could not delete profiles: %', SQLERRM;
  END;

  -- --------------------------------------------------------
  -- Auth users (must be last — cascades kill auth sessions)
  -- --------------------------------------------------------
  FOR i IN 1..array_length(v_ids, 1) LOOP
    BEGIN
      DELETE FROM auth.users WHERE id = v_ids[i];
      RAISE NOTICE 'Deleted auth.users id=%', v_ids[i];
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'Could not delete auth.users id=% — %', v_ids[i], SQLERRM;
    END;
  END LOOP;

  RAISE NOTICE '✅ Deletion complete for phones 9443577411 and 9944023986';
END $$;

-- ==============================================================================
-- STEP 3: VERIFY — Confirm they are gone
-- ==============================================================================

SELECT COUNT(*) AS remaining_profiles
FROM public.profiles
WHERE phone_number IN (
  '9443577411', '+919443577411',
  '9944023986', '+919944023986'
);

SELECT COUNT(*) AS remaining_auth_users
FROM auth.users
WHERE phone IN (
  '9443577411', '+919443577411',
  '9944023986', '+919944023986'
);
