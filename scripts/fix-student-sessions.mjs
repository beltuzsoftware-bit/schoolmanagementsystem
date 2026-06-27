import pkg from '@prisma/client';
const { PrismaClient } = pkg;
import 'dotenv/config';

const prisma = new PrismaClient({
  datasourceUrl: process.env.DATABASE_URL
});

async function main() {
  console.log('🏁 Starting Student Session Fix...');

  // 1. Fetch all schools and their sessions to create a mapping
  const schools = await prisma.school.findMany({
    include: {
      sessions: true
    }
  });

  console.log(`🏫 Found ${schools.length} schools.`);

  let totalUpdated = 0;

  for (const school of schools) {
    console.log(`\n🔍 Processing school: ${school.name} (${school.id})`);
    
    const sessions = school.sessions;
    if (sessions.length === 0) {
      console.log(`⚠️ No sessions found for ${school.name}. Skipping...`);
      continue;
    }

    // Create lookup map: name -> id
    const sessionMap = {};
    sessions.forEach(s => {
      sessionMap[s.name] = s.id;
    });

    // 2. Find students in this school with missing currentSessionId
    const studentsToFix = await prisma.student.findMany({
      where: {
        schoolId: school.id,
        currentSessionId: null
      }
    });

    console.log(`🎓 Found ${studentsToFix.length} students with missing session IDs.`);

    for (const student of studentsToFix) {
      // In data.json, we have enrolledSession (e.g. "2026-2027")
      // The Prisma Student model also has enrolledSession field
      const sessionName = student.enrolledSession;
      
      if (sessionName && sessionMap[sessionName]) {
        await prisma.student.update({
          where: { id: student.id },
          data: {
            currentSessionId: sessionMap[sessionName]
          }
        });
        totalUpdated++;
      } else {
        // Fallback: If enrolledSession is missing or doesn't match, 
        // try to find a session marked as isCurrent: true
        const currentSession = sessions.find(s => s.isCurrent === true) || sessions[0];
        if (currentSession) {
           await prisma.student.update({
            where: { id: student.id },
            data: {
              currentSessionId: currentSession.id
            }
          });
          totalUpdated++;
        }
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
  });
