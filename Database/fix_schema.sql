-- Run this script in your Supabase SQL Editor to align the database schema with the codebase features.

-- 1. Make doctor_id nullable in doctor_consultations so patients can book unassigned consultations
ALTER TABLE public.doctor_consultations ALTER COLUMN doctor_id DROP NOT NULL;

-- 2. Add missing columns to patient_notifications table
ALTER TABLE public.patient_notifications 
  ADD COLUMN IF NOT EXISTS type TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS doctor_id UUID DEFAULT NULL REFERENCES public.profiles(id) ON DELETE SET NULL;

-- 3. Add presence tracking to doctor_profiles
ALTER TABLE public.doctor_profiles
  ADD COLUMN IF NOT EXISTS last_seen_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;
