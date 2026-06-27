const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

async function run() {
  const client = await pool.connect();
  try {
    const res = await client.query(`
      SELECT "currentSessionId", "className", "status", COUNT(*) 
      FROM "Student" 
      WHERE "schoolId" = 's_1780425419909'
      GROUP BY "currentSessionId", "className", "status"
    `);
    console.log("Students counts:", res.rows);
  } catch (err) {
    console.error("Error executing count:", err);
  } finally {
    client.release();
    await pool.end();
  }
}

run();
