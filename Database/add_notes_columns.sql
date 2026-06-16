-- Add dietitian_notes and trainer_notes columns to care_team_assignments table
ALTER TABLE public.care_team_assignments 
  ADD COLUMN IF NOT EXISTS dietitian_notes TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS trainer_notes TEXT DEFAULT NULL;
