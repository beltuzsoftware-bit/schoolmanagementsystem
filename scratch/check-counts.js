
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkCounts() {
  try {
    const totalStudents = await prisma.student.count();
    console.log('Total students in DB:', totalStudents);

    const classIX = await prisma.student.count({
      where: { className: 'Class IX' }
    });
    console.log('Students in Class IX:', classIX);

    const sections = await prisma.student.groupBy({
      by: ['className', 'section'],
      _count: {
        id: true
      }
    });
    console.log('Counts by Class and Section:', JSON.stringify(sections, null, 2));

  } catch (error) {
    console.error(error);
  } finally {
    await prisma.$disconnect();
  }
}

checkCounts();
