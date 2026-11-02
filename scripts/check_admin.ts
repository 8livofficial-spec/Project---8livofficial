import { supabaseAdmin } from '../frontend/lib/supabaseServer'

async function check() {
  const { data: profiles } = await supabaseAdmin.from('profiles').select('id, email, first_name, last_name, role').limit(20)
  console.log('Profiles:', profiles)
}

check()
