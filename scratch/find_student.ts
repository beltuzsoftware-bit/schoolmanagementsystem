
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const student = await prisma.student.findFirst({
    where: {
      name: {
        contains: 'SOYEL MALLICK',
        mode: 'insensitive'
      }
    },
    include: {
      school: true
    }
  });

  if (student) {
    console.log('--- STUDENT FOUND ---');
    console.log(JSON.stringify(student, null, 2));
  } else {
    console.log('--- STUDENT NOT FOUND ---');
  }
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect());
