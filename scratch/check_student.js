const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

async function run() {
  const client = await pool.connect();
  try {
    const res = await client.query('SELECT * FROM "Student" WHERE id = \'stu_1780589509976_0_5ctwi\'');
    console.log("Student in DB:", res.rows[0]);
  } catch (err) {
    console.error(err);
  } finally {
    client.release();
    await pool.end();
  }
}

run();
