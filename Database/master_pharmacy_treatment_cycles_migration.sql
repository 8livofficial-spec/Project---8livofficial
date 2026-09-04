-- 8LIV Master Migration: Pharmacy + Prescription + Treatment Cycles + Subscriptions + Notifications
-- Preserves existing data, foreign keys, and tables. 100% additive and safe.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 0. Ensure Enums Exist and Extend for Partner Pharmacy & Lifecycle Safety
DO $$ BEGIN
  CREATE TYPE prescription_status AS ENUM (
    'DRAFT', 'READY_FOR_REVIEW', 'SIGNED', 'ISSUED', 'REPLACED', 'CANCELLED', 'EXPIRED', 'REVOKED', 'ACTIVE', 'COMPLETED'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE fulfilment_vendor AS ENUM ('APOLLO_PHARMACY', 'PARTNER_PHARMACY');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE pharmacy_order_status AS ENUM (
    'PENDING_ADMIN_REVIEW', 'UNDER_REVIEW', 'READY_TO_PLACE', 'ORDER_PLACED_WITH_APOLLO',
    'CONFIRMED_BY_APOLLO', 'PARTIALLY_AVAILABLE', 'UNAVAILABLE', 'PACKED', 'SHIPPED',
    'OUT_FOR_DELIVERY', 'DELIVERED', 'CANCELLED', 'REFUND_PENDING', 'REFUNDED',
    'RECEIVED', 'ACKNOWLEDGED', 'STOCK_CONFIRMED', 'PREPARING', 'DISPATCHED',
    'CLARIFICATION_REQUIRED', 'UNABLE_TO_FULFILL', 'PARTIALLY_FULFILLED'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Extend enums if they already existed with older definitions
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'pharmacy_order_status') THEN
    ALTER TYPE pharmacy_order_status ADD VALUE IF NOT EXISTS 'RECEIVED';
    ALTER TYPE pharmacy_order_status ADD VALUE IF NOT EXISTS 'ACKNOWLEDGED';
    ALTER TYPE pharmacy_order_status ADD VALUE IF NOT EXISTS 'STOCK_CONFIRMED';
    ALTER TYPE pharmacy_order_status ADD VALUE IF NOT EXISTS 'PREPARING';
    ALTER TYPE pharmacy_order_status ADD VALUE IF NOT EXISTS 'DISPATCHED';
    ALTER TYPE pharmacy_order_status ADD VALUE IF NOT EXISTS 'CLARIFICATION_REQUIRED';
    ALTER TYPE pharmacy_order_status ADD VALUE IF NOT EXISTS 'UNABLE_TO_FULFILL';
    ALTER TYPE pharmacy_order_status ADD VALUE IF NOT EXISTS 'PARTIALLY_FULFILLED';
  END IF;

  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'prescription_status') THEN
    ALTER TYPE prescription_status ADD VALUE IF NOT EXISTS 'REVOKED';
    ALTER TYPE prescription_status ADD VALUE IF NOT EXISTS 'ACTIVE';
    ALTER TYPE prescription_status ADD VALUE IF NOT EXISTS 'COMPLETED';
  END IF;

  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'fulfilment_vendor') THEN
    ALTER TYPE fulfilment_vendor ADD VALUE IF NOT EXISTS 'PARTNER_PHARMACY';
  END IF;
END $$;

-- 1. Subscriptions Table (Duration-based treatment programs)
CREATE TABLE IF NOT EXISTS public.subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT NOT NULL DEFAULT '8liv',
  patient_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  duration_months INTEGER NOT NULL CHECK (duration_months > 0),
  program_name TEXT NOT NULL,
  base_monthly_price NUMERIC(12,2) NOT NULL,
  original_price NUMERIC(12,2) NOT NULL,
  discount_percentage NUMERIC(5,2) NOT NULL DEFAULT 0,
  discount_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  final_price NUMERIC(12,2) NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('PENDING_PAYMENT', 'ACTIVE', 'COMPLETED', 'PAUSED', 'CANCELLED')),
  payment_status TEXT NOT NULL DEFAULT 'PAID',
  payment_transaction_id TEXT,
  plan_id UUID,
  plan_name_snapshot TEXT,
  base_price_snapshot NUMERIC(12,2),
  discount_percentage_snapshot NUMERIC(5,2) DEFAULT 0,
  discount_amount_snapshot NUMERIC(12,2) DEFAULT 0,
  tax_snapshot NUMERIC(12,2) DEFAULT 0,
  final_price_snapshot NUMERIC(12,2),
  currency TEXT NOT NULL DEFAULT 'INR',
  pricing_version INTEGER NOT NULL DEFAULT 1,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_subscriptions_payment_tx ON public.subscriptions(payment_transaction_id) WHERE payment_transaction_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_subscriptions_patient_status ON public.subscriptions(patient_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_subscriptions_tenant ON public.subscriptions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_plan_id ON public.subscriptions(plan_id);

-- 2. Treatment Cycles Table (First-class clinical entity)
CREATE TABLE IF NOT EXISTS public.treatment_cycles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT NOT NULL DEFAULT '8liv',
  subscription_id UUID NOT NULL REFERENCES public.subscriptions(id) ON DELETE CASCADE,
  patient_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  doctor_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  cycle_number INTEGER NOT NULL CHECK (cycle_number > 0),
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'ACTIVE', 'UNDER_REVIEW', 'PRESCRIBED', 'FULFILLMENT', 'COMPLETED', 'SKIPPED', 'CANCELLED')),
  consultation_id UUID REFERENCES public.doctor_consultations(id) ON DELETE SET NULL,
  consultation_used BOOLEAN NOT NULL DEFAULT FALSE,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (subscription_id, cycle_number)
);

CREATE INDEX IF NOT EXISTS idx_treatment_cycles_patient_status ON public.treatment_cycles(patient_id, status, cycle_number);
CREATE INDEX IF NOT EXISTS idx_treatment_cycles_subscription ON public.treatment_cycles(subscription_id, cycle_number);

-- 3. Partner Pharmacies (Default PENDING & INACTIVE, dynamic licence classification)
CREATE TABLE IF NOT EXISTS public.partner_pharmacies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT NOT NULL DEFAULT '8liv',
  name TEXT NOT NULL,
  legal_entity_name TEXT NOT NULL,
  address JSONB NOT NULL DEFAULT '{}'::jsonb,
  phone TEXT NOT NULL,
  email TEXT NOT NULL,
  drug_license_number TEXT NOT NULL UNIQUE,
  drug_license_type TEXT NOT NULL,
  drug_license_expiry DATE,
  pharmacist_name TEXT NOT NULL,
  pharmacist_registration_number TEXT NOT NULL,
  verification_status TEXT NOT NULL DEFAULT 'PENDING' CHECK (verification_status IN ('PENDING', 'UNDER_REVIEW', 'VERIFIED', 'REJECTED', 'EXPIRED', 'SUSPENDED')),
  status TEXT NOT NULL DEFAULT 'INACTIVE' CHECK (status IN ('ACTIVE', 'INACTIVE', 'SUSPENDED')),
  approved_at TIMESTAMPTZ,
  approved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  rejection_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_partner_pharmacies_status ON public.partner_pharmacies(verification_status, status);

-- 4. Partner Pharmacy Users
CREATE TABLE IF NOT EXISTS public.partner_pharmacy_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT NOT NULL DEFAULT '8liv',
  pharmacy_id UUID NOT NULL REFERENCES public.partner_pharmacies(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'PHARMACY_STAFF' CHECK (role IN ('PHARMACY_ADMIN', 'PHARMACY_STAFF')),
  status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'SUSPENDED', 'DISABLED')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id)
);

CREATE INDEX IF NOT EXISTS idx_partner_pharmacy_users_lookup ON public.partner_pharmacy_users(user_id, pharmacy_id, status);

-- 5. Canonical Prescriptions Table (Creates if not exists, extends if existing)
CREATE TABLE IF NOT EXISTS public.prescriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT NOT NULL DEFAULT '8liv',
  prescription_number TEXT NOT NULL UNIQUE,
  consultation_id UUID REFERENCES public.doctor_consultations(id) ON DELETE RESTRICT,
  patient_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  doctor_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  treatment_cycle_id UUID REFERENCES public.treatment_cycles(id) ON DELETE SET NULL,
  diagnosis TEXT NOT NULL DEFAULT 'Clinical Weight Management Protocol',
  status prescription_status NOT NULL DEFAULT 'DRAFT',
  version INTEGER NOT NULL DEFAULT 1 CHECK (version > 0),
  issued_at TIMESTAMPTZ,
  valid_until DATE NOT NULL DEFAULT (CURRENT_DATE + INTERVAL '30 days'),
  signed_pdf_path TEXT,
  signature_hash TEXT,
  canonical_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  supersedes_prescription_id UUID REFERENCES public.prescriptions(id) ON DELETE RESTRICT,
  cancelled_at TIMESTAMPTZ,
  cancellation_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- If prescriptions already existed previously, ensure cycle & tenant columns are added
ALTER TABLE public.prescriptions
  ADD COLUMN IF NOT EXISTS tenant_id TEXT NOT NULL DEFAULT '8liv',
  ADD COLUMN IF NOT EXISTS treatment_cycle_id UUID REFERENCES public.treatment_cycles(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_prescriptions_cycle ON public.prescriptions(treatment_cycle_id);
CREATE INDEX IF NOT EXISTS idx_prescriptions_patient ON public.prescriptions(patient_id, status);

-- 5b. Prescription Items Table
CREATE TABLE IF NOT EXISTS public.prescription_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT NOT NULL DEFAULT '8liv',
  prescription_id UUID NOT NULL REFERENCES public.prescriptions(id) ON DELETE CASCADE,
  medicine_name TEXT NOT NULL,
  generic_name TEXT,
  brand_name TEXT,
  strength TEXT NOT NULL,
  dosage_form TEXT NOT NULL,
  dose TEXT NOT NULL,
  route TEXT NOT NULL,
  frequency TEXT NOT NULL,
  duration_value INTEGER NOT NULL CHECK (duration_value > 0),
  duration_unit TEXT NOT NULL CHECK (duration_unit IN ('DAYS', 'WEEKS', 'MONTHS')),
  quantity NUMERIC NOT NULL CHECK (quantity > 0),
  food_instruction TEXT,
  special_instruction TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_prescription_items_prescription ON public.prescription_items(prescription_id);

-- 6. Canonical Pharmacy Orders Table (Creates if not exists, extends if existing)
CREATE TABLE IF NOT EXISTS public.pharmacy_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT NOT NULL DEFAULT '8liv',
  prescription_id UUID NOT NULL REFERENCES public.prescriptions(id) ON DELETE RESTRICT,
  patient_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  partner_pharmacy_id UUID REFERENCES public.partner_pharmacies(id) ON DELETE SET NULL,
  pharmacy_id UUID REFERENCES public.partner_pharmacies(id) ON DELETE SET NULL,
  vendor fulfilment_vendor NOT NULL DEFAULT 'PARTNER_PHARMACY',
  status pharmacy_order_status NOT NULL DEFAULT 'PENDING_ADMIN_REVIEW',
  assigned_admin_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  apollo_order_reference TEXT,
  order_amount NUMERIC CHECK (order_amount IS NULL OR order_amount >= 0),
  currency TEXT NOT NULL DEFAULT 'INR',
  delivery_address_snapshot JSONB NOT NULL DEFAULT '{}'::jsonb,
  patient_phone_snapshot TEXT,
  courier_name TEXT,
  tracking_number TEXT,
  estimated_delivery_at TIMESTAMPTZ,
  acknowledged_at TIMESTAMPTZ,
  stock_confirmed_at TIMESTAMPTZ,
  clarification_requested_at TIMESTAMPTZ,
  clarification_reason TEXT,
  unable_to_fulfill_reason TEXT,
  placed_at TIMESTAMPTZ,
  confirmed_at TIMESTAMPTZ,
  packed_at TIMESTAMPTZ,
  shipped_at TIMESTAMPTZ,
  out_for_delivery_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  cancellation_reason TEXT,
  unavailability_reason TEXT,
  unavailable_medicines JSONB NOT NULL DEFAULT '[]'::jsonb,
  internal_notes TEXT,
  refund_status TEXT,
  version INTEGER NOT NULL DEFAULT 1 CHECK (version > 0),
  idempotency_key TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- If pharmacy_orders already existed, ensure columns are added
ALTER TABLE public.pharmacy_orders
  ADD COLUMN IF NOT EXISTS tenant_id TEXT NOT NULL DEFAULT '8liv',
  ADD COLUMN IF NOT EXISTS partner_pharmacy_id UUID REFERENCES public.partner_pharmacies(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS pharmacy_id UUID REFERENCES public.partner_pharmacies(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS acknowledged_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS stock_confirmed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS clarification_requested_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS clarification_reason TEXT,
  ADD COLUMN IF NOT EXISTS unable_to_fulfill_reason TEXT;

-- Safely relax Apollo-only reference requirement so Partner Pharmacy orders can transition freely
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'pharmacy_orders_apollo_reference_required'
    AND table_name = 'pharmacy_orders'
  ) THEN
    ALTER TABLE public.pharmacy_orders DROP CONSTRAINT pharmacy_orders_apollo_reference_required;
    ALTER TABLE public.pharmacy_orders ADD CONSTRAINT pharmacy_orders_apollo_reference_required CHECK (
      vendor != 'APOLLO_PHARMACY' 
      OR status IN ('PENDING_ADMIN_REVIEW', 'UNDER_REVIEW', 'READY_TO_PLACE', 'CANCELLED', 'RECEIVED', 'ACKNOWLEDGED', 'STOCK_CONFIRMED', 'PREPARING', 'DISPATCHED', 'DELIVERED', 'CLARIFICATION_REQUIRED', 'UNABLE_TO_FULFILL')
      OR apollo_order_reference IS NOT NULL
    );
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_pharmacy_orders_partner_status ON public.pharmacy_orders(partner_pharmacy_id, status);
CREATE INDEX IF NOT EXISTS idx_pharmacy_orders_pharmacy_status ON public.pharmacy_orders(pharmacy_id, status);

-- 7. Patient Medication Review Requests
CREATE TABLE IF NOT EXISTS public.medication_review_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT NOT NULL DEFAULT '8liv',
  patient_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  doctor_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  treatment_cycle_id UUID REFERENCES public.treatment_cycles(id) ON DELETE SET NULL,
  patient_notes TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'REQUESTED' CHECK (status IN ('REQUESTED', 'UNDER_REVIEW', 'COMPLETED', 'CANCELLED')),
  doctor_response TEXT,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_med_review_patient_status ON public.medication_review_requests(patient_id, status);
CREATE INDEX IF NOT EXISTS idx_med_review_doctor ON public.medication_review_requests(doctor_id, status);

-- 8. Domain Notification Events Table
CREATE TABLE IF NOT EXISTS public.notification_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT NOT NULL DEFAULT '8liv',
  event_type TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID NOT NULL,
  recipient_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  recipient_email TEXT NOT NULL,
  recipient_role TEXT NOT NULL DEFAULT 'patient',
  subject TEXT NOT NULL,
  message_content TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'SENT', 'FAILED')),
  attempt_count INTEGER NOT NULL DEFAULT 0,
  last_attempt_at TIMESTAMPTZ,
  sent_at TIMESTAMPTZ,
  error_message TEXT,
  idempotency_key TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notification_events_pending ON public.notification_events(status, created_at) WHERE status = 'PENDING';

-- 9. Row Level Security Policies
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.treatment_cycles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.partner_pharmacies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.partner_pharmacy_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.medication_review_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prescriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prescription_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pharmacy_orders ENABLE ROW LEVEL SECURITY;

-- Subscriptions: Patient reads own
DROP POLICY IF EXISTS "Patients read own subscriptions" ON public.subscriptions;
CREATE POLICY "Patients read own subscriptions" ON public.subscriptions
  FOR SELECT USING (patient_id = auth.uid());

-- Treatment Cycles: Patient reads own
DROP POLICY IF EXISTS "Patients read own treatment cycles" ON public.treatment_cycles;
CREATE POLICY "Patients read own treatment cycles" ON public.treatment_cycles
  FOR SELECT USING (patient_id = auth.uid() OR doctor_id = auth.uid());

-- Service role full access
DROP POLICY IF EXISTS "Service role manages subscriptions" ON public.subscriptions;
CREATE POLICY "Service role manages subscriptions" ON public.subscriptions
  FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');

DROP POLICY IF EXISTS "Service role manages treatment cycles" ON public.treatment_cycles;
CREATE POLICY "Service role manages treatment cycles" ON public.treatment_cycles
  FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');

DROP POLICY IF EXISTS "Service role manages partner pharmacies" ON public.partner_pharmacies;
CREATE POLICY "Service role manages partner pharmacies" ON public.partner_pharmacies
  FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');

DROP POLICY IF EXISTS "Service role manages partner pharmacy users" ON public.partner_pharmacy_users;
CREATE POLICY "Service role manages partner pharmacy users" ON public.partner_pharmacy_users
  FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');

DROP POLICY IF EXISTS "Service role manages medication review requests" ON public.medication_review_requests;
CREATE POLICY "Service role manages medication review requests" ON public.medication_review_requests
  FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');

DROP POLICY IF EXISTS "Service role manages notification events" ON public.notification_events;
CREATE POLICY "Service role manages notification events" ON public.notification_events
  FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');

-- Prescriptions RLS
DROP POLICY IF EXISTS "Patients read own prescriptions" ON public.prescriptions;
CREATE POLICY "Patients read own prescriptions" ON public.prescriptions
  FOR SELECT USING (patient_id = auth.uid());

DROP POLICY IF EXISTS "Service role manages prescriptions" ON public.prescriptions;
CREATE POLICY "Service role manages prescriptions" ON public.prescriptions
  FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');

-- Prescription Items RLS
DROP POLICY IF EXISTS "Service role manages prescription items" ON public.prescription_items;
CREATE POLICY "Service role manages prescription items" ON public.prescription_items
  FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');

-- Pharmacy Orders RLS
DROP POLICY IF EXISTS "Patients read own pharmacy orders" ON public.pharmacy_orders;
CREATE POLICY "Patients read own pharmacy orders" ON public.pharmacy_orders
  FOR SELECT USING (patient_id = auth.uid());

DROP POLICY IF EXISTS "Service role manages pharmacy orders" ON public.pharmacy_orders;
CREATE POLICY "Service role manages pharmacy orders" ON public.pharmacy_orders
  FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');

NOTIFY pgrst, 'reload schema';
