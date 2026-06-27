import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const schools = await prisma.school.findMany({
    select: {
        id: true,
        name: true,
        admissionFormTemplateId: true,
        admissionFieldOverrides: true
    }
  });
  console.log(JSON.stringify(schools, null, 2));
}

main();
