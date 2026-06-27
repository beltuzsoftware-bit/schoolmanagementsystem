const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  const students = await prisma.student.findMany();
  console.log(`Found ${students.length} students in PostgreSQL DB.`);
  students.forEach((s, idx) => {
    console.log(`${idx + 1}. name: "${s.name}", fatherName: "${s.fatherName}", schoolId: "${s.schoolId}"`);
  });
}

main()
  .catch(e => console.error(e))
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
