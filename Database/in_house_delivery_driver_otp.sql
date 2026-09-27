-- 8LIV — In-House Delivery Driver & Doorstep OTP Verification Schema
-- Enhances pharmacy_orders with delivery OTP tracking, driver assignment, and GPS route metadata

DO $$ 
BEGIN
  -- 1. In-House Driver & Doorstep OTP Tracking Columns
  ALTER TABLE public.pharmacy_orders
    ADD COLUMN IF NOT EXISTS driver_name TEXT,
    ADD COLUMN IF NOT EXISTS driver_phone TEXT,
    ADD COLUMN IF NOT EXISTS driver_arrived_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS delivery_otp VARCHAR(10),
    ADD COLUMN IF NOT EXISTS delivery_otp_expires_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS delivery_otp_verified_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS delivery_proof_notes TEXT;

  -- 2. Indexes for fast driver dispatch and query filtering
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE tablename = 'pharmacy_orders' AND indexname = 'idx_pharmacy_orders_driver_status'
  ) THEN
    CREATE INDEX idx_pharmacy_orders_driver_status 
      ON public.pharmacy_orders(status, driver_phone)
      WHERE status IN ('STOCK_CONFIRMED', 'PREPARING', 'DISPATCHED');
  END IF;

END $$;
