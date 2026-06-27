
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const students = await prisma.student.findMany({
    where: {
      OR: [
        { name: { contains: 'Bristi', mode: 'insensitive' } },
        { name: { contains: 'Brishti', mode: 'insensitive' } }
      ]
    },
    select: { id: true, name: true, status: true }
  });
  console.log(JSON.stringify(students, null, 2));
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
