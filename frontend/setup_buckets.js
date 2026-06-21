// Polyfill WebSocket for Supabase Realtime in Node CLI
if (typeof global.WebSocket === 'undefined') {
  global.WebSocket = class {};
}

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("Missing Supabase URL or Service Role Key in .env.local");
  process.exit(1);
}

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function main() {
  const buckets = ['diet-plans', 'fitness-plans'];
  try {
    const { data: list, error: listError } = await supabaseAdmin.storage.listBuckets();
    if (listError) {
      console.error(`Error listing buckets:`, listError);
      return;
    }
    
    for (const bucket of buckets) {
      console.log(`Checking bucket: ${bucket}...`);
      const exists = list.some(b => b.name === bucket);
      if (!exists) {
        console.log(`Creating private bucket: ${bucket}...`);
        const { data, error } = await supabaseAdmin.storage.createBucket(bucket, {
          public: false,
          fileSizeLimit: 10 * 1024 * 1024, // 10MB
        });
        if (error) {
          console.error(`Error creating bucket ${bucket}:`, error.message);
        } else {
          console.log(`Successfully created bucket ${bucket}!`);
        }
      } else {
        console.log(`Bucket ${bucket} already exists.`);
      }
    }
  } catch (err) {
    console.error("Failed to setup storage buckets:", err);
  }
}

main();
