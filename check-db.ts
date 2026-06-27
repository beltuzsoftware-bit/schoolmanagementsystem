import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const schools = await prisma.school.findMany({
    select: {
      id: true,
      name: true,
      schoolId: true,
      code: true
    }
  });
  console.log('Schools in DB:', JSON.stringify(schools, null, 2));

  const users = await prisma.user.findMany({
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      schoolId: true
    }
  });
  console.log('Users in DB:', JSON.stringify(users, null, 2));
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
