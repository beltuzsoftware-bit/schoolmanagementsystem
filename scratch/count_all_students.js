const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

async function run() {
  const client = await pool.connect();
  try {
    const res = await client.query('SELECT COUNT(*), "schoolId" FROM "Student" GROUP BY "schoolId"');
    console.log("Students by school:", res.rows);
    
    const res2 = await client.query('SELECT id, name, "schoolId", "currentSessionId" FROM "Student"');
    console.log("Total students in DB:", res2.rows.length);
    console.log("List of all students:", res2.rows.map(r => ({
      id: r.id,
      name: r.name,
      schoolId: r.schoolId,
      session: r.currentSessionId
    })));
  } catch (err) {
    console.error("Error executing query:", err);
  } finally {
    client.release();
    await pool.end();
  }
}

run();
