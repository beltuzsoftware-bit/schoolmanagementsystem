const { Pool } = require('pg');
const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
require('dotenv').config();

// Initialize the Prisma Client using the adapter, matching src/lib/prisma.ts
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });
globalThis.prisma = prisma;

// Dynamic import of the server action
async function test() {
  try {
    console.log("--- Initializing test ---");
    
    // Import the ts-transpiled action
    const { importStudentsBatch } = require('../src/app/actions.ts');
    
    const schoolId = 's_1780425419909'; // BRAVV
    
    // Define mock students:
    // Student 1: Missing admissionNumber and lastName (should auto-generate and split name)
    // Student 2: Standard complete details
    // Student 3: Missing className (should fail at row level, but NOT crash the whole batch!)
    const mockStudents = [
      {
        name: 'Jane Foster',
        className: 'Class X',
        section: 'A'
      },
      {
        admissionNumber: 'TEST-ADM-999',
        firstName: 'Thor',
        lastName: 'Odinson',
        className: 'Class X',
        section: 'B'
      },
      {
        name: 'Missing Class Student',
        // className is missing
        section: 'A'
      }
    ];

    console.log("\nRunning batch import...");
    const res = await importStudentsBatch(schoolId, mockStudents);
    console.log("Import result:", res);

    // Verify database contents for the imported students
    console.log("\nChecking database for imported students...");
    const imported = await prisma.student.findMany({
      where: {
        schoolId,
        OR: [
          { name: 'Jane Foster' },
          { name: 'Thor Odinson' },
          { name: 'Missing Class Student' }
        ]
      }
    });

    console.log("Found students in DB:", imported.map(s => ({
      id: s.id,
      name: s.name,
      firstName: s.firstName,
      lastName: s.lastName,
      admissionNumber: s.admissionNumber,
      className: s.className
    })));

    // Cleanup phase
    console.log("\nCleaning up test records...");
    const deleteRes = await prisma.student.deleteMany({
      where: {
        id: {
          in: imported.map(s => s.id)
        }
      }
    });
    console.log(`Cleaned up ${deleteRes.count} records.`);

  } catch (error) {
    console.error("Test failed:", error);
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

test();
