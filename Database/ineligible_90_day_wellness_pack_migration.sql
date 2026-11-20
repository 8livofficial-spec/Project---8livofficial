-- Separate coaching plan offered after a doctor marks an assessment ineligible
-- for the standard treatment plans. Initial doctor assessment remains upstream.
INSERT INTO public.treatment_plans (
  id,
  tenant_id,
  name,
  duration_months,
  base_price,
  discount_percentage,
  discount_amount,
  final_price,
  currency,
  description,
  features,
  status,
  display_order,
  metadata,
  updated_at
)
VALUES (
  '90000000-0000-4000-8000-000000000090',
  '8liv',
  '90-Day Guided Wellness Pack',
  3,
  5254,
  0,
  0,
  5254,
  'INR',
  'A supportive 90-day wellness plan with nutrition and fitness coaching after your doctor consultation.',
  ARRAY[
    'Doctor consultation is not included in this pack'
  ],
  'ACTIVE',
  90,
  '{"is_ineligible_patient_pack":true,"display_price_includes_gst":true,"duration_days":90,"max_consultations":{"doctor":0,"dietitian":3,"fitness_coach":3},"total_consultations":6,"tag":"90-Day Coaching Pack"}'::jsonb,
  NOW()
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  duration_months = EXCLUDED.duration_months,
  base_price = EXCLUDED.base_price,
  discount_percentage = EXCLUDED.discount_percentage,
  discount_amount = EXCLUDED.discount_amount,
  final_price = EXCLUDED.final_price,
  currency = EXCLUDED.currency,
  description = EXCLUDED.description,
  features = EXCLUDED.features,
  status = EXCLUDED.status,
  display_order = EXCLUDED.display_order,
  metadata = EXCLUDED.metadata,
  updated_at = NOW();
