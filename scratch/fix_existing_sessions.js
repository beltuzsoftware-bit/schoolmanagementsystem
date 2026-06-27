const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

async function run() {
  const client = await pool.connect();
  try {
    console.log("--- Updating student sessions to CUID/UUID ---");
    
    // Resolve current session CUID/UUID for school s_1780425419909
    const sessionRes = await client.query('SELECT id, name FROM "Session" WHERE "schoolId" = \'s_1780425419909\'');
    console.log("Available sessions:", sessionRes.rows);
    
    if (sessionRes.rows.length === 0) {
      console.log("No sessions found for school.");
      return;
    }
    
    const correctSessionId = sessionRes.rows[0].id;
    console.log(`Setting currentSessionId to: "${correctSessionId}"`);

    // Update students whose currentSessionId is '2026-2027' or '2026-27'
    const updateRes = await client.query(`
      UPDATE "Student" 
      SET "currentSessionId" = $1
      WHERE "schoolId" = 's_1780425419909' 
        AND ("currentSessionId" = '2026-2027' OR "currentSessionId" = '2026-27' OR "currentSessionId" IS NULL OR "currentSessionId" = '')
    `, [correctSessionId]);
    
    console.log(`Successfully updated ${updateRes.rowCount} student records in the database.`);
  } catch (err) {
    console.error("Error executing update:", err);
  } finally {
    client.release();
    await pool.end();
  }
}

run();
