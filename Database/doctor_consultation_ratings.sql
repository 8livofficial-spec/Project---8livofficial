-- One patient rating per completed doctor consultation.
-- Apply this migration in the Supabase SQL editor before enabling the UI.

CREATE TABLE IF NOT EXISTS public.doctor_consultation_ratings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  consultation_id UUID NOT NULL UNIQUE REFERENCES public.doctor_consultations(id) ON DELETE CASCADE,
  patient_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  doctor_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  rating SMALLINT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  review TEXT CHECK (review IS NULL OR char_length(review) <= 1000),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_doctor_consultation_ratings_doctor
  ON public.doctor_consultation_ratings(doctor_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_doctor_consultation_ratings_patient
  ON public.doctor_consultation_ratings(patient_id, created_at DESC);

ALTER TABLE public.doctor_consultation_ratings ENABLE ROW LEVEL SECURITY;

-- No direct browser policies are created intentionally. Patient and admin access
-- is validated by server routes using the service-role client.
