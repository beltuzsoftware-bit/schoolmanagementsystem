const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const count = await prisma.student.count();
  const students = await prisma.student.findMany({
    take: 20,
    orderBy: { createdAt: 'desc' },
    select: { name: true, admissionNumber: true, rollNumber: true, className: true, section: true }
  });
  console.log('Total students:', count);
  console.log('Recent students:', JSON.stringify(students, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
