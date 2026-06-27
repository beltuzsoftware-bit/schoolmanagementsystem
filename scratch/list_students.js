const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

async function run() {
  const client = await pool.connect();
  try {
    const res = await client.query('SELECT id, name, "admissionNumber", "className", "section", "status", "currentSessionId" FROM "Student" WHERE "schoolId" = \'s_1780425419909\'');
    console.log(`Total students in DB: ${res.rows.length}`);
    console.log("Students details:", res.rows);
  } catch (err) {
    console.error("Error executing query:", err);
  } finally {
    client.release();
    await pool.end();
  }
}

run();
