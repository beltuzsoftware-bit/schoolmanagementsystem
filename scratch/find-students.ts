import 'dotenv/config';
import prisma from '../src/lib/prisma';

async function main() {
  const schoolId = 's_1778721678173';
  const name = '2026-27';

  const sessionDirect = await prisma.session.findFirst({
    where: { schoolId, name }
  });
  console.log('sessionDirect search result:', sessionDirect);

  const sessionNameCI = await prisma.session.findFirst({
    where: { schoolId, name: { equals: name, mode: 'insensitive' } }
  });
  console.log('sessionNameCI search result:', sessionNameCI);

  // Let's print all sessions for this school
  const allSessions = await prisma.session.findMany({
    where: { schoolId }
  });
  console.log('All sessions (raw):', allSessions);
}

main()
  .catch((e) => {
    console.error(e);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
