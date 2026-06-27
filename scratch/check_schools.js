require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  const schools = await prisma.school.findMany({
    select: { id: true, name: true, packageId: true }
  });
  console.log("Schools in PG:", schools);
  
  const packages = await prisma.saasPackage.findMany();
  console.log("Packages in PG:", packages);
  
  await prisma.$disconnect();
  await pool.end();
}

main().catch(console.error);
