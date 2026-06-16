const supabaseUrl = "https://owagvhvypehvvxwdecjn.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im93YWd2aHZ5cGVodnZ4d2RlY2puIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3ODc5NTU5OSwiZXhwIjoyMDk0MzcxNTk5fQ.ddQY-7cK5ZWIymfTapku-KBW61dMm9l1NzGKn_7gYK0";

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
    room_url: 'https://8liv.daily.co/dietitian-demo'
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
