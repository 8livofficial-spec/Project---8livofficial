-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ==========================================
-- 1. PROFILES TABLE (Linked to Supabase Auth)
-- ==========================================
CREATE TABLE public.profiles (
    id UUID REFERENCES auth.users NOT NULL PRIMARY KEY,
    role TEXT CHECK (role IN ('patient', 'doctor', 'admin')) DEFAULT 'patient',
    first_name TEXT,
    last_name TEXT,
    phone_number TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ==========================================
-- 2. HEALTH ASSESSMENTS TABLE (The Questionnaire)
-- ==========================================
CREATE TABLE public.health_assessments (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    patient_id UUID REFERENCES public.profiles(id) NOT NULL,
    height_cm NUMERIC,
    weight_kg NUMERIC,
    goal_weight_kg NUMERIC,
    -- Store medical history and risks cleanly as JSON
    medical_history JSONB, 
    is_eligible BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ==========================================
-- 3. ACTIVATE ROW LEVEL SECURITY (The Vault Door)
-- ==========================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.health_assessments ENABLE ROW LEVEL SECURITY;

-- ==========================================
-- 4. RLS POLICIES (The Keys)
-- ==========================================

-- Profiles: Patients can only read and update their OWN profile
CREATE POLICY "Patients can view own profile" 
    ON public.profiles FOR SELECT 
    USING ( auth.uid() = id );

CREATE POLICY "Patients can update own profile" 
    ON public.profiles FOR UPDATE 
    USING ( auth.uid() = id );

-- Health Assessments: Patients can only read and insert their OWN medical data
CREATE POLICY "Patients can view own assessments" 
    ON public.health_assessments FOR SELECT 
    USING ( auth.uid() = patient_id );

CREATE POLICY "Patients can insert own assessments" 
    ON public.health_assessments FOR INSERT 
    WITH CHECK ( auth.uid() = patient_id );

-- (Note: Later, we will add policies allowing 'doctor' roles to read assigned patients)
