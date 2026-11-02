-- =============================================================================
-- FIX: Allow Customer Care & Support Staff in profiles_role_check
-- Run this in the Supabase SQL Editor (Dashboard -> SQL Editor -> New Query)
-- =============================================================================

ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_role_check
  CHECK (role IN (
    'admin', 
    'doctor', 
    'dietitian', 
    'nutritionist', 
    'fitness_coach', 
    'trainer', 
    'patient',
    'support_agent',
    'care_coordinator',
    'customer_care',
    'support'
  ));

NOTIFY pgrst, 'reload schema';

