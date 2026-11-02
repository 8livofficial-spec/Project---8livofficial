import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import * as path from 'path'

dotenv.config({ path: path.resolve(__dirname, '../frontend/.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, serviceRoleKey)

async function main() {
  // Let's get one admin profile
  const { data: admin } = await supabase.from('profiles').select('id, role').eq('role', 'admin').limit(1).single()
  console.log('Admin profile:', admin)

  if (admin) {
    // Try to update admin's role to 'support_agent' and then revert immediately
    const { error: testValidRole } = await supabase.from('profiles').update({ role: 'support_agent' }).eq('id', admin.id)
    console.log('Update to support_agent error:', testValidRole)

    // Revert back
    await supabase.from('profiles').update({ role: 'admin' }).eq('id', admin.id)

    // Try to update to an invalid role like 'invalid_test_role'
    const { error: testInvalidRole } = await supabase.from('profiles').update({ role: 'invalid_test_role' }).eq('id', admin.id)
    console.log('Update to invalid_test_role error:', testInvalidRole)
  }
}

main().catch(console.error)
