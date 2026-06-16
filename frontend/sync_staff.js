const supabaseUrl = "https://owagvhvypehvvxwdecjn.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im93YWd2aHZ5cGVodnZ4d2RlY2puIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3ODc5NTU5OSwiZXhwIjoyMDk0MzcxNTk5fQ.ddQY-7cK5ZWIymfTapku-KBW61dMm9l1NzGKn_7gYK0";

const headers = {
  'apikey': supabaseKey,
  'Authorization': `Bearer ${supabaseKey}`,
  'Content-Type': 'application/json',
  'Prefer': 'return=representation'
};

async function sync() {
  // Fetch all dietitians and trainers
  const res = await fetch(`${supabaseUrl}/rest/v1/profiles?role=in.(dietitian,trainer)`, { headers });
  const staff = await res.json();
  
  if (!staff || staff.length === 0) {
    return console.log("No staff found");
  }

  for (const s of staff) {
    const specialty = s.role === 'dietitian' ? 'Dietitian' : 'Fitness Trainer';
    const body = {
      id: s.id,
      full_name: `${s.first_name || 'Staff'} ${s.last_name || ''}`.trim() + ` (${specialty})`,
      specialty: specialty,
      available: true
    };
    
    // Upsert
    const upsertRes = await fetch(`${supabaseUrl}/rest/v1/doctor_profiles?on_conflict=id`, {
      method: 'POST',
      headers: { ...headers, 'Prefer': 'resolution=merge-duplicates' },
      body: JSON.stringify(body)
    });
    
    console.log(`Synced ${s.id}:`, upsertRes.status);
  }
}

sync();
