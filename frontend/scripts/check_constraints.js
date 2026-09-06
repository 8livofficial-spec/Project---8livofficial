const { Client } = require('pg');
require('dotenv').config({ path: '.env.local' });

const dbUrl = process.env.DATABASE_URL || process.env.POSTGRES_URL || process.env.SUPABASE_DB_URL;
const client = new Client({ connectionString: dbUrl });

async function main() {
  await client.connect();
  const cons = await client.query(`
    SELECT conname, contype, pg_get_constraintdef(oid) 
    FROM pg_constraint 
    WHERE conrelid = 'public.wallet_accounts'::regclass;
  `);
  console.log('Constraints on wallet_accounts:', cons.rows);

  const idxs = await client.query(`
    SELECT indexname, indexdef 
    FROM pg_indexes 
    WHERE tablename = 'wallet_accounts';
  `);
  console.log('Indexes on wallet_accounts:', idxs.rows);

  const func = await client.query(`
    SELECT pg_get_functiondef(oid)
    FROM pg_proc
    WHERE proname = 'credit_completed_consultation';
  `);
  console.log('Function credit_completed_consultation:');
  console.log(func.rows[0]?.pg_get_functiondef);

  await client.end();
}

main().catch(console.error);
