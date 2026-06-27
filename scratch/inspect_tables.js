const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

async function run() {
  const client = await pool.connect();
  try {
    console.log("--- Querying SaasPackage ---");
    const pkgRes = await client.query('SELECT * FROM "SaasPackage"');
    console.log("Packages:", pkgRes.rows);

    console.log("\n--- Querying AdmissionFormTemplate ---");
    const tmplRes = await client.query('SELECT id, name, "isSystem" FROM "AdmissionFormTemplate"');
    console.log("Templates:", tmplRes.rows);

  } catch (err) {
    console.error("Error executing query:", err);
  } finally {
    client.release();
    await pool.end();
  }
}

run();
