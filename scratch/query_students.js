require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  const schools = await prisma.school.findMany({
    select: { id: true, name: true }
  });
  console.log("=== SCHOOLS ===");
  console.log(schools);

  const students = await prisma.student.findMany({
    select: {
      id: true,
      name: true,
      admissionNumber: true,
      photo: true,
      schoolId: true,
      status: true
    }
  });
  console.log("\n=== STUDENTS ===");
  students.forEach(s => {
    console.log({
      id: s.id,
      name: s.name,
      admissionNumber: s.admissionNumber,
      schoolId: s.schoolId,
      status: s.status,
      hasPhoto: s.photo ? `${s.photo.slice(0, 30)}... (length: ${s.photo.length})` : 'null'
    });
  });
}

main()
  .catch(e => console.error(e))
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
