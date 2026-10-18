-- ==============================================================================
-- 8Liv Platform Migration: Remove Delivery & Pharmacy Portals & Columns
-- 
-- 1. Drops address column from health_assessments (no delivery info collected)
-- 2. Drops delivery address & tracking tables (patient_delivery_addresses, etc.)
-- 3. Drops legacy and partner pharmacy tables and order audit history
-- 4. Cleans up associated indexes, constraints, and triggers safely
-- ==============================================================================

DO $$ 
BEGIN
  -- 1. Remove delivery address from health_assessments
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'health_assessments' 
      AND column_name = 'address'
  ) THEN
    ALTER TABLE public.health_assessments DROP COLUMN address;
  END IF;

  -- 2. Drop driver & delivery tracking tables if they exist
  DROP TABLE IF EXISTS public.driver_deliveries CASCADE;
  DROP TABLE IF EXISTS public.in_house_drivers CASCADE;
  DROP TABLE IF EXISTS public.patient_delivery_addresses CASCADE;

  -- 3. Drop pharmacy order & fulfillment tables
  DROP TABLE IF EXISTS public.pharmacy_order_status_history CASCADE;
  DROP TABLE IF EXISTS public.pharmacy_orders CASCADE;
  DROP TABLE IF EXISTS public.prescription_order_items CASCADE;
  DROP TABLE IF EXISTS public.prescription_orders CASCADE;
  DROP TABLE IF EXISTS public.pharmacy_inventory CASCADE;
  DROP TABLE IF EXISTS public.partner_pharmacy_users CASCADE;
  DROP TABLE IF EXISTS public.partner_pharmacies CASCADE;
  DROP TABLE IF EXISTS public.pharmacy_users CASCADE;
  DROP TABLE IF EXISTS public.pharmacies CASCADE;

  -- 4. Drop legacy pharmacy enum types if no longer referenced
  DROP TYPE IF EXISTS public.pharmacy_status CASCADE;
  DROP TYPE IF EXISTS public.pharmacy_user_role CASCADE;
  DROP TYPE IF EXISTS public.prescription_order_status CASCADE;
  DROP TYPE IF EXISTS public.partner_order_status CASCADE;
END $$;
