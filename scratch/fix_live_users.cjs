const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

const userSchoolMappings = [
  { email: 'admin@jsi.com', schoolId: 's_1776494594378' },
  { email: 'jsi@jsi.com', schoolId: 's_1776494594378' },
  { email: 'admin@krits.com', schoolId: 's_1778731188434' },
  { email: 'admin@hms.com', schoolId: 's_1779079515458' },
  { email: 'admin@hms.co', schoolId: 's_1779079515458' },
  { email: 'bani@gmail.com', schoolId: 's_1778721678173' },
  { email: 'nausad.kol@gmail.com', schoolId: 's_1778721678173' },
  { email: 'admin@admin.com', schoolId: 's_1778721678173' }
];

async function run() {
  console.log("Connecting to Supabase to repair User schoolId mappings...");
  const client = await pool.connect();
  try {
    for (const mapping of userSchoolMappings) {
      const res = await client.query(
        'UPDATE "User" SET "schoolId" = $1 WHERE email = $2',
        [mapping.schoolId, mapping.email]
      );
      console.log(`Updated user '${mapping.email}' to schoolId '${mapping.schoolId}' (${res.rowCount} rows affected)`);
    }
    console.log("\nAll User schoolId mappings successfully repaired in live Supabase!");
  } catch (err) {
    console.error("Error repairing users:", err);
  } finally {
    client.release();
    await pool.end();
  }
}

run();
