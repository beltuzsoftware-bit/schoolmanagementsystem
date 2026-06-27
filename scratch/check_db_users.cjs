const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

async function run() {
  const client = await pool.connect();
  try {
    const res = await client.query('SELECT id, name, email, role, "schoolId" FROM "User"');
    console.log("Users in Database:");
    console.log(JSON.stringify(res.rows, null, 2));
  } catch (err) {
    console.error("Error querying users:", err);
  } finally {
    client.release();
    await pool.end();
  }
}

run();
