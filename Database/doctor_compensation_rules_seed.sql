-- 8liv: Doctor compensation rules seed
-- Run this in Supabase SQL Editor AFTER provider_onboarding_finance_v2.sql has been applied.
--
-- This inserts the default DOCTOR / CONSULTATION / FIXED ₹300 compensation rule.
-- The application will dynamically read this value instead of using the hardcoded constant.
-- Adjust fixed_amount to the actual contracted rate per consultation.

INSERT INTO public.provider_compensation_rules (
  provider_id,
  provider_role,
  service_type,
  calculation_type,
  fixed_amount,
  percentage,
  minimum_amount,
  maximum_amount,
  currency,
  effective_from,
  effective_until,
  version,
  active
)
VALUES (
  NULL,           -- applies to ALL doctors (role-level rule)
  'DOCTOR',
  'CONSULTATION',
  'FIXED',
  300.00,         -- ₹300 per completed consultation. Change to actual rate.
  NULL,
  NULL,
  NULL,
  'INR',
  NOW(),          -- effective immediately
  NULL,           -- no expiry (open-ended)
  1,
  TRUE
)
ON CONFLICT DO NOTHING;

-- Verify the rule was inserted:
SELECT id, provider_role, service_type, calculation_type, fixed_amount, currency, active, effective_from
FROM public.provider_compensation_rules
WHERE service_type = 'CONSULTATION' AND provider_role = 'DOCTOR' AND active = TRUE;
