import 'dotenv/config';
import prisma from '../src/lib/prisma';

async function main() {
  console.log('Scanning database for students with unassigned/null currentSessionId...');

  const students = await prisma.student.findMany({
    where: {
      OR: [
        { currentSessionId: null },
        { currentSessionId: '' }
      ]
    },
    include: {
      school: {
        include: {
          sessions: true
        }
      }
    }
  });

  console.log(`Found ${students.length} students to fix.`);

  let updatedCount = 0;

  for (const student of students) {
    const school = student.school;
    const currentSessionName = school.currentSession || student.enrolledSession;

    if (!currentSessionName) {
      console.log(`Student "${student.name}" (ID: ${student.id}) has no session name associated.`);
      continue;
    }

    // Find the session ID matching this session name for this school
    const matchingSession = school.sessions.find(
      (s: any) => s.name === currentSessionName
    );

    if (matchingSession) {
      await prisma.student.update({
        where: { id: student.id },
        data: { currentSessionId: matchingSession.id }
      });
      console.log(`Updated student "${student.name}" (${student.admissionNumber}): currentSessionId = "${matchingSession.id}" (${matchingSession.name})`);
      updatedCount++;
    } else {
      // Fallback: If no session exists, create one or set it to first available
      const activeSession = school.sessions[0];
      if (activeSession) {
        await prisma.student.update({
          where: { id: student.id },
          data: { currentSessionId: activeSession.id }
        });
        console.log(`Updated student "${student.name}" (${student.admissionNumber}) to fallback session: currentSessionId = "${activeSession.id}" (${activeSession.name})`);
        updatedCount++;
      } else {
        console.log(`Could not resolve any session for school "${school.name}" (Student: ${student.name})`);
      }
    }
  }

  console.log(`\nSuccessfully updated ${updatedCount} student records.`);
}

main()
  .catch((e) => {
    console.error('Error running fix script:', e);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
