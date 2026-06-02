-- Fix for Membership Tier and Shipping State not saving
ALTER TABLE health_assessments
  ADD COLUMN IF NOT EXISTS membership_tier TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS shipping_state TEXT DEFAULT NULL;

-- Fix: Track ₹499 consultation fee payment so page refresh doesn't lose state
ALTER TABLE health_assessments
  ADD COLUMN IF NOT EXISTS consultation_fee_paid BOOLEAN DEFAULT FALSE;

