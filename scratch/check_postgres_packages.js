require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("=== CHECKING POSTGRESQL ===");
  try {
    const pkgs = await prisma.saasPackage.findMany();
    for (const pkg of pkgs) {
      console.log(`Package: ${pkg.id} (${pkg.name})`);
      console.log("Modules:", pkg.modules);
    }
  } catch (err) {
    console.error("Error connecting to PostgreSQL:", err);
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

main();
