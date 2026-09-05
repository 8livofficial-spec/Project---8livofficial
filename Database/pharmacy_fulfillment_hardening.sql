-- 8LIV — Pharmacy Fulfillment Hardening Migration
-- Applies canonical schema, tables, and constraints for partner pharmacy fulfillment.
-- Completely removes Apollo constraints and aligns with the 8LIV third-party pharmacy architecture.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 1. Ensure pharmacy_order_status enum or check constraint includes canonical statuses:
-- PENDING_ASSIGNMENT, RECEIVED, ACKNOWLEDGED, STOCK_CONFIRMED, PREPARING, DISPATCHED, DELIVERED,
-- CLARIFICATION_REQUIRED, UNABLE_TO_FULFILL, PARTIALLY_FULFILLED, CANCELLED
DO $$ 
BEGIN
  -- Add new enum values if the type exists
  BEGIN
    ALTER TYPE pharmacy_order_status ADD VALUE IF NOT EXISTS 'PENDING_ASSIGNMENT';
  EXCEPTION WHEN duplicate_object THEN NULL; WHEN undefined_object THEN NULL;
  END;
  BEGIN
    ALTER TYPE pharmacy_order_status ADD VALUE IF NOT EXISTS 'RECEIVED';
  EXCEPTION WHEN duplicate_object THEN NULL; WHEN undefined_object THEN NULL;
  END;
  BEGIN
    ALTER TYPE pharmacy_order_status ADD VALUE IF NOT EXISTS 'ACKNOWLEDGED';
  EXCEPTION WHEN duplicate_object THEN NULL; WHEN undefined_object THEN NULL;
  END;
  BEGIN
    ALTER TYPE pharmacy_order_status ADD VALUE IF NOT EXISTS 'STOCK_CONFIRMED';
  EXCEPTION WHEN duplicate_object THEN NULL; WHEN undefined_object THEN NULL;
  END;
  BEGIN
    ALTER TYPE pharmacy_order_status ADD VALUE IF NOT EXISTS 'PREPARING';
  EXCEPTION WHEN duplicate_object THEN NULL; WHEN undefined_object THEN NULL;
  END;
  BEGIN
    ALTER TYPE pharmacy_order_status ADD VALUE IF NOT EXISTS 'DISPATCHED';
  EXCEPTION WHEN duplicate_object THEN NULL; WHEN undefined_object THEN NULL;
  END;
  BEGIN
    ALTER TYPE pharmacy_order_status ADD VALUE IF NOT EXISTS 'CLARIFICATION_REQUIRED';
  EXCEPTION WHEN duplicate_object THEN NULL; WHEN undefined_object THEN NULL;
  END;
  BEGIN
    ALTER TYPE pharmacy_order_status ADD VALUE IF NOT EXISTS 'UNABLE_TO_FULFILL';
  EXCEPTION WHEN duplicate_object THEN NULL; WHEN undefined_object THEN NULL;
  END;
  BEGIN
    ALTER TYPE pharmacy_order_status ADD VALUE IF NOT EXISTS 'PARTIALLY_FULFILLED';
  EXCEPTION WHEN duplicate_object THEN NULL; WHEN undefined_object THEN NULL;
  END;
END $$;

-- 2. Patient Delivery Addresses Table
CREATE TABLE IF NOT EXISTS public.patient_delivery_addresses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT NOT NULL DEFAULT '8liv',
  patient_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  recipient_name TEXT NOT NULL,
  line1 TEXT NOT NULL,
  line2 TEXT,
  area TEXT,
  city TEXT NOT NULL,
  state TEXT NOT NULL,
  pincode VARCHAR(10) NOT NULL,
  phone VARCHAR(20) NOT NULL,
  is_default BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Exactly one default delivery address per patient
CREATE UNIQUE INDEX IF NOT EXISTS idx_patient_delivery_addresses_default
  ON public.patient_delivery_addresses(patient_id)
  WHERE is_default = TRUE;

CREATE INDEX IF NOT EXISTS idx_patient_delivery_addresses_patient
  ON public.patient_delivery_addresses(patient_id, created_at DESC);

-- 3. Partner Pharmacy Invitations Table
CREATE TABLE IF NOT EXISTS public.pharmacy_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT NOT NULL DEFAULT '8liv',
  pharmacy_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  token_hash TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'INVITED' CHECK (status IN ('INVITED', 'ACCEPTED', 'EXPIRED', 'CANCELLED')),
  invited_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  accepted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pharmacy_invitations_email_status
  ON public.pharmacy_invitations(email, status);

-- 4. Align partner_pharmacies verification columns
ALTER TABLE public.partner_pharmacies
  ADD COLUMN IF NOT EXISTS verified_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS verified_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS rejected_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS rejected_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS rejection_reason TEXT,
  ADD COLUMN IF NOT EXISTS suspended_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS suspended_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS suspension_reason TEXT;

-- 5. Status History & Audit Logs Tables (Ensuring relations exist before RLS)
CREATE TABLE IF NOT EXISTS public.pharmacy_order_status_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pharmacy_order_id UUID NOT NULL REFERENCES public.pharmacy_orders(id) ON DELETE CASCADE,
  status TEXT NOT NULL,
  notes TEXT,
  actor_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  actor_role TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_order_status_history_order 
  ON public.pharmacy_order_status_history(pharmacy_order_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.fulfilment_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prescription_id UUID REFERENCES public.prescriptions(id) ON DELETE SET NULL,
  pharmacy_order_id UUID REFERENCES public.pharmacy_orders(id) ON DELETE SET NULL,
  actor_id UUID NOT NULL,
  actor_role TEXT NOT NULL,
  action TEXT NOT NULL,
  previous_values JSONB,
  new_values JSONB,
  reason TEXT,
  ip_address TEXT,
  user_agent TEXT,
  request_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_fulfilment_audit_prescription 
  ON public.fulfilment_audit_logs(prescription_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_fulfilment_audit_order 
  ON public.fulfilment_audit_logs(pharmacy_order_id, created_at DESC);

-- 6. Hardening pharmacy_orders
-- Migrate redundant partner_pharmacy_id to canonical pharmacy_id if needed
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'pharmacy_orders' AND column_name = 'partner_pharmacy_id'
  ) THEN
    UPDATE public.pharmacy_orders
    SET pharmacy_id = partner_pharmacy_id
    WHERE pharmacy_id IS NULL AND partner_pharmacy_id IS NOT NULL;
  END IF;
END $$;

-- Drop obsolete Apollo-specific constraints
ALTER TABLE public.pharmacy_orders
  DROP CONSTRAINT IF EXISTS pharmacy_orders_apollo_reference_required;

-- Drop legacy unique index that blocked multiple lifetime fulfillment orders if cancelled
DROP INDEX IF EXISTS public.idx_pharmacy_orders_prescription_once;

-- Create partial unique index on ACTIVE fulfillment orders
-- Guarantees at most ONE active fulfillment order per prescription
CREATE UNIQUE INDEX IF NOT EXISTS idx_pharmacy_orders_active_prescription
  ON public.pharmacy_orders(prescription_id)
  WHERE status NOT IN ('CANCELLED', 'UNABLE_TO_FULFILL');

-- Add index on pharmacy_id and tenant_id
CREATE INDEX IF NOT EXISTS idx_pharmacy_orders_pharmacy_status
  ON public.pharmacy_orders(pharmacy_id, status)
  WHERE pharmacy_id IS NOT NULL;

-- 7. Notification Events Table hardening
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'notification_events' AND table_schema = 'public') THEN
    ALTER TABLE public.notification_events
      ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
  END IF;
END $$;

-- 8. Row Level Security Policies
ALTER TABLE public.patient_delivery_addresses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pharmacy_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.partner_pharmacies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.partner_pharmacy_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pharmacy_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pharmacy_order_status_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fulfilment_audit_logs ENABLE ROW LEVEL SECURITY;

-- patient_delivery_addresses policies
DROP POLICY IF EXISTS "patients read own delivery addresses" ON public.patient_delivery_addresses;
CREATE POLICY "patients read own delivery addresses" ON public.patient_delivery_addresses
  FOR SELECT TO authenticated
  USING (patient_id = auth.uid());

DROP POLICY IF EXISTS "patients manage own delivery addresses" ON public.patient_delivery_addresses;
CREATE POLICY "patients manage own delivery addresses" ON public.patient_delivery_addresses
  FOR ALL TO authenticated
  USING (patient_id = auth.uid())
  WITH CHECK (patient_id = auth.uid());

DROP POLICY IF EXISTS "admins manage delivery addresses" ON public.patient_delivery_addresses;
CREATE POLICY "admins manage delivery addresses" ON public.patient_delivery_addresses
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND LOWER(p.role) = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND LOWER(p.role) = 'admin'));

-- pharmacy_invitations policies
DROP POLICY IF EXISTS "admins manage pharmacy invitations" ON public.pharmacy_invitations;
CREATE POLICY "admins manage pharmacy invitations" ON public.pharmacy_invitations
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND LOWER(p.role) = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND LOWER(p.role) = 'admin'));

-- partner_pharmacies policies
DROP POLICY IF EXISTS "pharmacy users view own pharmacy" ON public.partner_pharmacies;
CREATE POLICY "pharmacy users view own pharmacy" ON public.partner_pharmacies
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.partner_pharmacy_users pu 
    WHERE pu.pharmacy_id = partner_pharmacies.id AND pu.user_id = auth.uid()
  ));

DROP POLICY IF EXISTS "admins manage partner pharmacies" ON public.partner_pharmacies;
CREATE POLICY "admins manage partner pharmacies" ON public.partner_pharmacies
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND LOWER(p.role) = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND LOWER(p.role) = 'admin'));

-- partner_pharmacy_users policies
DROP POLICY IF EXISTS "pharmacy users view own membership" ON public.partner_pharmacy_users;
CREATE POLICY "pharmacy users view own membership" ON public.partner_pharmacy_users
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR EXISTS (
    SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND LOWER(p.role) = 'admin'
  ));

-- pharmacy_order_status_history policies
DROP POLICY IF EXISTS "patients read own order history" ON public.pharmacy_order_status_history;
CREATE POLICY "patients read own order history" ON public.pharmacy_order_status_history
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.pharmacy_orders o 
    WHERE o.id = pharmacy_order_status_history.pharmacy_order_id AND o.patient_id = auth.uid()
  ));

DROP POLICY IF EXISTS "admins manage order history" ON public.pharmacy_order_status_history;
CREATE POLICY "admins manage order history" ON public.pharmacy_order_status_history
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND LOWER(p.role) = 'admin'));

-- fulfilment_audit_logs policies
DROP POLICY IF EXISTS "admins read fulfilment audit logs" ON public.fulfilment_audit_logs;
CREATE POLICY "admins read fulfilment audit logs" ON public.fulfilment_audit_logs
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND LOWER(p.role) = 'admin'));
