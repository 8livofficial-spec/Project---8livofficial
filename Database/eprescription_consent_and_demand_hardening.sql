-- ============================================================
-- 8LIV — Production-Grade E-Prescription + Patient Address + Consent + Pharmacy Demand
-- Database Hardening Migration
-- ============================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 1. Doctor Profile Additions (Visual Signature & Clinical Registration Metadata)
ALTER TABLE public.doctor_profiles
  ADD COLUMN IF NOT EXISTS signature_url TEXT,
  ADD COLUMN IF NOT EXISTS qualification TEXT,
  ADD COLUMN IF NOT EXISTS mci_number TEXT,
  ADD COLUMN IF NOT EXISTS registration_council TEXT;

-- 2. Prescription Immutability & Cryptographic Integrity Additions
ALTER TABLE public.prescriptions
  ADD COLUMN IF NOT EXISTS pdf_hash TEXT,
  ADD COLUMN IF NOT EXISTS canonical_content_hash TEXT,
  ADD COLUMN IF NOT EXISTS authorized_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS authorized_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS expected_fulfillment_date DATE;

-- Populate canonical_content_hash from signature_hash if missing
UPDATE public.prescriptions
SET canonical_content_hash = signature_hash
WHERE canonical_content_hash IS NULL AND signature_hash IS NOT NULL;

-- 3. Patient Prescription Consents Table
-- Records explicit patient consent for electronic transmission and pharmacy fulfillment
CREATE TABLE IF NOT EXISTS public.patient_prescription_consents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT NOT NULL DEFAULT '8liv',
  patient_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  prescription_id UUID NOT NULL REFERENCES public.prescriptions(id) ON DELETE CASCADE,
  prescription_version INTEGER NOT NULL DEFAULT 1,
  prescription_hash TEXT NOT NULL,
  consent_type TEXT NOT NULL DEFAULT 'ELECTRONIC_TRANSMISSION_AND_FULFILLMENT',
  consented_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Unique index per patient per prescription version
CREATE UNIQUE INDEX IF NOT EXISTS idx_prescription_consent_version_unique
  ON public.patient_prescription_consents(prescription_id, prescription_version, patient_id);

CREATE INDEX IF NOT EXISTS idx_prescription_consents_patient
  ON public.patient_prescription_consents(patient_id, consented_at DESC);

-- Enable RLS
ALTER TABLE public.patient_prescription_consents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "patients view own consents" ON public.patient_prescription_consents;
CREATE POLICY "patients view own consents" ON public.patient_prescription_consents
  FOR SELECT TO authenticated
  USING (patient_id = auth.uid());

DROP POLICY IF EXISTS "patients insert own consents" ON public.patient_prescription_consents;
CREATE POLICY "patients insert own consents" ON public.patient_prescription_consents
  FOR INSERT TO authenticated
  WITH CHECK (patient_id = auth.uid());

DROP POLICY IF EXISTS "admins view all consents" ON public.patient_prescription_consents;
CREATE POLICY "admins view all consents" ON public.patient_prescription_consents
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND LOWER(p.role) = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND LOWER(p.role) = 'admin'));

-- 4. Indexes for Efficient Pharmacy Demand Forecasting
CREATE INDEX IF NOT EXISTS idx_prescriptions_demand_forecast
  ON public.prescriptions(status, expected_fulfillment_date, valid_until)
  WHERE status IN ('ISSUED', 'SIGNED');

CREATE INDEX IF NOT EXISTS idx_prescription_items_demand_agg
  ON public.prescription_items(prescription_id, medicine_name, strength, dosage_form);
