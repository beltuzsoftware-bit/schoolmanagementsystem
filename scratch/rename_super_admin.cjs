const { Pool } = require('pg');
const fs = require('fs');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

async function run() {
  console.log("Updating Super Admin name in live Supabase...");
  const client = await pool.connect();
  try {
    const res = await client.query(
      'UPDATE "User" SET name = \'Super Admin\' WHERE id = \'u_super\' OR email = \'superadmin\''
    );
    console.log(`Updated database: ${res.rowCount} rows affected.`);
  } catch (err) {
    console.error("Error updating database:", err);
  } finally {
    client.release();
    await pool.end();
  }

  console.log("\nUpdating Super Admin name in data.json...");
  try {
    if (fs.existsSync('data.json')) {
      const data = JSON.parse(fs.readFileSync('data.json', 'utf8'));
      let updated = false;
      data.users.forEach(u => {
        if (u.id === 'u_super' || u.email === 'superadmin') {
          u.name = 'Super Admin';
          updated = true;
        }
      });
      if (updated) {
        fs.writeFileSync('data.json', JSON.stringify(data, null, 2), 'utf8');
        console.log("Successfully updated data.json");
      } else {
        console.log("User not found in data.json");
      }
    }
  } catch (err) {
    console.error("Error updating data.json:", err);
  }

  console.log("\nUpdating Super Admin name in data.json.bak...");
  try {
    if (fs.existsSync('data.json.bak')) {
      const data = JSON.parse(fs.readFileSync('data.json.bak', 'utf8'));
      let updated = false;
      data.users.forEach(u => {
        if (u.id === 'u_super' || u.email === 'superadmin') {
          u.name = 'Super Admin';
          updated = true;
        }
      });
      if (updated) {
        fs.writeFileSync('data.json.bak', JSON.stringify(data, null, 2), 'utf8');
        console.log("Successfully updated data.json.bak");
      } else {
        console.log("User not found in data.json.bak");
      }
    }
  } catch (err) {
    console.error("Error updating data.json.bak:", err);
  }
}

run();
