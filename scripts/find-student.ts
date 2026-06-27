import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Searching for Banasmita Dhar...');
  const students = await prisma.student.findMany({
    where: {
      OR: [
        { name: { contains: 'Banasmita', mode: 'insensitive' } },
        { name: { contains: 'Dhar', mode: 'insensitive' } },
        { id: { contains: 'hunao', mode: 'insensitive' } }
      ]
    }
  });

  if (students.length === 0) {
    console.log('No student found with that name or ID fragment.');
    
    // List some students to see what's there
    const someStudents = await prisma.student.findMany({
        take: 5
    });
    console.log('Sample students in DB:', someStudents.map(s => `${s.name} (${s.id})`));
  } else {
    console.log('Found students:', JSON.stringify(students, null, 2));
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
