
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const schools = await prisma.school.findMany({
    select: {
      id: true,
      name: true,
      schoolId: true
    }
  });
  console.log('--- SCHOOLS IN PRISMA ---');
  console.log(JSON.stringify(schools, null, 2));

  const studentCount = await prisma.student.count();
  console.log('--- TOTAL STUDENTS IN PRISMA ---');
  console.log(studentCount);

  const students = await prisma.student.findMany({
    take: 5,
    select: {
        name: true,
        school: {
            select: { name: true }
        }
    }
  });
  console.log('--- SAMPLE STUDENTS ---');
  console.log(JSON.stringify(students, null, 2));
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect());
