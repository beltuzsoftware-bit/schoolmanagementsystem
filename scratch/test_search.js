const { Pool } = require('pg');
const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
require('dotenv').config();

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });
globalThis.prisma = prisma;

async function test() {
  try {
    const { searchStudents } = require('../src/app/actions.ts');
    const schoolId = 's_1780425419909';
    
    // Simulate UI search with 'All Classes' and session '2026-27'
    const results = await searchStudents(schoolId, {
      classFilter: 'all',
      sectionFilter: 'Select',
      sessionId: '2026-27',
      status: 'all'
    });
    
    console.log(`Search returned ${results.length} students!`);
    if (results.length > 0) {
      console.log("First 3 results:", results.slice(0, 3).map(s => ({
        id: s.id,
        name: s.name,
        className: s.className,
        session: s.currentSessionId
      })));
    }
  } catch (error) {
    console.error("Search test failed:", error);
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

test();
