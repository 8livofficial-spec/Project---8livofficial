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
