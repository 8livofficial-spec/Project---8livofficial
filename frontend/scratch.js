const fs = require('fs');
const { Pool } = require('pg');

const envContent = fs.readFileSync('.env.local', 'utf-8');
const match = envContent.match(/DATABASE_URL="?([^"\n]+)"?/);
let dbUrl = match ? match[1] : process.env.DATABASE_URL;

if (dbUrl && dbUrl.includes(':5432/')) {
    dbUrl = dbUrl.replace(':5432/', ':6543/');
}

const pool = new Pool({
  connectionString: dbUrl,
});

const sql = `
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS password_reset_otps (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email TEXT NOT NULL,
    otp_code TEXT NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for fast lookup and cleanup
CREATE INDEX IF NOT EXISTS idx_password_reset_otps_email ON password_reset_otps(email);
`;

async function main() {
  try {
    await pool.query(sql);
    console.log("Successfully created password_reset_otps table.");
  } catch (err) {
    console.error("Error creating table:", err);
  } finally {
    pool.end();
  }
}

main();
