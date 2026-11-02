import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import * as path from 'path'

dotenv.config({ path: path.resolve(__dirname, '../frontend/.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, serviceRoleKey)

async function main() {
  console.log('Connecting to Supabase:', supabaseUrl)
  
  // Test if role 'support_agent' or 'customer_care' is allowed in profiles
  // We can try to see what happens if we test a mock update or check pg_constraint via rpc or query
  const testId = '00000000-0000-0000-0000-000000000000'
  const { error } = await supabase.from('profiles').insert({
    id: testId,
    email: 'test_role_check@8liv.in',
    role: 'support_agent',
    first_name: 'Test',
    last_name: 'Agent'
  })

  console.log('Insert test with role "support_agent" result:', error)
  if (!error) {
    // clean up
    await supabase.from('profiles').delete().eq('id', testId)
    console.log('Successfully inserted and cleaned up support_agent role!')
  }
}

main().catch(console.error)
