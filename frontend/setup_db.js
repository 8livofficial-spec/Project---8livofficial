const { Client } = require('pg');
require('dotenv').config({ path: '.env.local' });

const dbUrl = process.env.DATABASE_URL;

if (!dbUrl) {
  throw new Error('DATABASE_URL is required in frontend/.env.local');
}

const sql = `
CREATE TABLE IF NOT EXISTS public.staff_consultations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  staff_id UUID REFERENCES public.profiles(id) NOT NULL,
  staff_role TEXT NOT NULL,
  appointment_type TEXT,
  patient_id UUID REFERENCES public.profiles(id) NOT NULL,
  booking_date TEXT NOT NULL,
  booking_time TEXT NOT NULL,
  status TEXT DEFAULT 'scheduled',
  room_url TEXT,
  meeting_provider TEXT DEFAULT 'JITSI',
  meeting_room TEXT,
  meeting_url TEXT,
  is_completed BOOLEAN DEFAULT false,
  consultation_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.staff_consultations
  ADD COLUMN IF NOT EXISTS appointment_type TEXT,
  ADD COLUMN IF NOT EXISTS meeting_provider TEXT DEFAULT 'JITSI',
  ADD COLUMN IF NOT EXISTS meeting_room TEXT,
  ADD COLUMN IF NOT EXISTS meeting_url TEXT,
  ADD COLUMN IF NOT EXISTS call_id TEXT,
  ADD COLUMN IF NOT EXISTS call_type TEXT,
  ADD COLUMN IF NOT EXISTS created_by UUID,
  ADD COLUMN IF NOT EXISTS meeting_status TEXT,
  ADD COLUMN IF NOT EXISTS is_completed BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS slot_id UUID,
  ADD COLUMN IF NOT EXISTS booking_source TEXT,
  ADD COLUMN IF NOT EXISTS payment_requirement TEXT,
  ADD COLUMN IF NOT EXISTS scheduled_start TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS scheduled_end TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS idempotency_key TEXT;

ALTER TABLE public.staff_consultations ENABLE ROW LEVEL SECURITY;

DO $$ 
BEGIN
    DROP POLICY IF EXISTS "Users can view their own consultations" ON public.staff_consultations;
    CREATE POLICY "Users can view their own consultations" ON public.staff_consultations
        FOR SELECT
        USING (auth.uid() = patient_id OR auth.uid() = staff_id);

    DROP POLICY IF EXISTS "Patients can create consultations" ON public.staff_consultations;
    CREATE POLICY "Patients can create consultations" ON public.staff_consultations
        FOR INSERT
        WITH CHECK (auth.uid() = patient_id);

    DROP POLICY IF EXISTS "Staff can update consultations" ON public.staff_consultations;
    CREATE POLICY "Staff can update consultations" ON public.staff_consultations
        FOR UPDATE
        USING (auth.uid() = staff_id);
END $$;
`;

async function main() {
  const client = new Client({ 
    connectionString: dbUrl,
    ssl: { rejectUnauthorized: false }
  });
  try {
    await client.connect();
    console.log("Connected to db!");
    await client.query(sql);
    console.log("SQL executed successfully!");
  } catch (err) {
    console.error("Error executing SQL:", err);
  } finally {
    await client.end();
  }
}

main();
