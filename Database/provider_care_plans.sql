CREATE TABLE IF NOT EXISTS public.diet_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  dietitian_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  calories_per_day INTEGER NOT NULL CHECK (calories_per_day BETWEEN 800 AND 6000),
  meal_schedule TEXT NOT NULL,
  food_restrictions TEXT,
  hydration_goal TEXT,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.fitness_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  fitness_coach_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  workout_type TEXT NOT NULL,
  weekly_frequency INTEGER NOT NULL CHECK (weekly_frequency BETWEEN 1 AND 14),
  daily_step_goal INTEGER CHECK (daily_step_goal BETWEEN 0 AND 100000),
  exercise_restrictions TEXT,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.care_team_assignments
  ADD COLUMN IF NOT EXISTS nutritionist_notes TEXT DEFAULT NULL;

CREATE TABLE IF NOT EXISTS public.nutrition_guidance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  nutritionist_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  guidance_focus TEXT NOT NULL,
  calorie_strategy TEXT,
  meal_timing TEXT,
  supplement_notes TEXT,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_diet_plans_patient_id ON public.diet_plans(patient_id);
CREATE INDEX IF NOT EXISTS idx_diet_plans_dietitian_id ON public.diet_plans(dietitian_id);
CREATE INDEX IF NOT EXISTS idx_diet_plans_status ON public.diet_plans(status);

CREATE INDEX IF NOT EXISTS idx_fitness_plans_patient_id ON public.fitness_plans(patient_id);
CREATE INDEX IF NOT EXISTS idx_fitness_plans_fitness_coach_id ON public.fitness_plans(fitness_coach_id);
CREATE INDEX IF NOT EXISTS idx_fitness_plans_status ON public.fitness_plans(status);

CREATE INDEX IF NOT EXISTS idx_nutrition_guidance_patient_id ON public.nutrition_guidance(patient_id);
CREATE INDEX IF NOT EXISTS idx_nutrition_guidance_nutritionist_id ON public.nutrition_guidance(nutritionist_id);
CREATE INDEX IF NOT EXISTS idx_nutrition_guidance_status ON public.nutrition_guidance(status);

ALTER TABLE public.diet_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fitness_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.nutrition_guidance ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Dietitians manage assigned diet plans" ON public.diet_plans;
CREATE POLICY "Dietitians manage assigned diet plans"
  ON public.diet_plans
  FOR ALL
  USING (
    dietitian_id = auth.uid()
    OR patient_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  )
  WITH CHECK (
    dietitian_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

DROP POLICY IF EXISTS "Fitness coaches manage assigned fitness plans" ON public.fitness_plans;
CREATE POLICY "Fitness coaches manage assigned fitness plans"
  ON public.fitness_plans
  FOR ALL
  USING (
    fitness_coach_id = auth.uid()
    OR patient_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  )
  WITH CHECK (
    fitness_coach_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

DROP POLICY IF EXISTS "Nutritionists manage assigned guidance" ON public.nutrition_guidance;
CREATE POLICY "Nutritionists manage assigned guidance"
  ON public.nutrition_guidance
  FOR ALL
  USING (
    nutritionist_id = auth.uid()
    OR patient_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  )
  WITH CHECK (
    nutritionist_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

NOTIFY pgrst, 'reload schema';
