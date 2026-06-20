require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error('NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required in frontend/.env.local');
}

const headers = {
  'apikey': supabaseKey,
  'Authorization': `Bearer ${supabaseKey}`,
  'Content-Type': 'application/json',
  'Prefer': 'return=representation'
};

async function test() {
  const p1 = await fetch(`${supabaseUrl}/rest/v1/profiles?role=eq.dietitian&limit=1`, { headers });
  const dietitians = await p1.json();
  if (!dietitians || dietitians.length === 0) return console.log("No dietitian found");
  
  const p2 = await fetch(`${supabaseUrl}/rest/v1/profiles?role=eq.patient&limit=1`, { headers });
  const patients = await p2.json();
  if (!patients || patients.length === 0) return console.log("No patient found");
  
  const body = {
    doctor_id: dietitians[0].id,
    patient_id: patients[0].id,
    booking_date: '2026-06-16',
    booking_time: '10:00 AM',
    status: 'scheduled',
    room_url: 'https://meet.jit.si/8liv-dietitian-demo'
  };

  const res = await fetch(`${supabaseUrl}/rest/v1/doctor_consultations`, {
    method: 'POST',
    headers,
    body: JSON.stringify(body)
  });

  const text = await res.text();
  console.log("Status:", res.status);
  console.log("Response:", text);
}

test();
