const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('🏁 Starting Student Session Fix (CJS Mode)...');

  // 1. Fetch all schools and their sessions
  const schools = await prisma.school.findMany({
    include: {
      sessions: true
    }
  });

  console.log(`🏫 Found ${schools.length} schools.`);

  let totalUpdated = 0;

  for (const school of schools) {
    console.log(`\n🔍 Processing school: ${school.name}`);
    
    const sessions = school.sessions;
    if (sessions.length === 0) {
      console.log(`⚠️ No sessions found for ${school.name}. Skipping...`);
      continue;
    }

    const sessionMap = {};
    sessions.forEach(s => {
      sessionMap[s.name] = s.id;
    });

    // 2. Find ALL students in this school to check their sessions
    const studentsToCheck = await prisma.student.findMany({
      where: {
        schoolId: school.id,
      }
    });

    console.log(`🎓 Checking session mapping for ${studentsToCheck.length} students.`);

    for (const student of studentsToCheck) {
      const sessionName = student.enrolledSession;
      let targetSessionId = null;

      if (sessionName && sessionMap[sessionName]) {
        targetSessionId = sessionMap[sessionName];
      } else {
        const currentSession = sessions.find(s => s.isCurrent === true) || sessions[0];
        if (currentSession) {
          targetSessionId = currentSession.id;
        }
      }

      if (targetSessionId && student.currentSessionId !== targetSessionId) {
        await prisma.student.update({
          where: { id: student.id },
          data: { currentSessionId: targetSessionId }
        });
        totalUpdated++;
      }
    }

  }

  console.log(`\n✅ Finished! Updated ${totalUpdated} student records.`);
}

main()
  .catch((e) => {
    console.error('❌ Fix Failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
