const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

async function run() {
  console.log("Connecting to Supabase...");
  const client = await pool.connect();
  try {
    // 1. Query schools
    console.log("\n--- SCHOOLS IN LIVE DATABASE ---");
    const resSchools = await client.query('SELECT id, name, "schoolId", code, email, "isActive" FROM "School"');
    console.log(`Found ${resSchools.rowCount} schools in database:`);
    resSchools.rows.forEach((s, idx) => {
      console.log(`  ${idx + 1}. Name: '${s.name}', ID: ${s.id}, schoolId: ${s.schoolId}, code: ${s.code}, active: ${s.isActive}`);
    });

    // 2. Query student counts per school
    console.log("\n--- STUDENT COUNTS PER SCHOOL ---");
    const resStudents = await client.query('SELECT "schoolId", count(*) FROM "Student" GROUP BY "schoolId"');
    resStudents.rows.forEach(r => {
      console.log(`  School ID ${r.schoolId}: ${r.count} students`);
    });

    // 3. Query user admin accounts
    console.log("\n--- USER ACCOUNTS ---");
    const resUsers = await client.query('SELECT email, role, "schoolId" FROM "User"');
    resUsers.rows.forEach(u => {
      console.log(`  User: ${u.email}, Role: ${u.role}, schoolId: ${u.schoolId}`);
    });

  } catch (err) {
    console.error("Database query error:", err);
  } finally {
    client.release();
    await pool.end();
  }
}

run();
