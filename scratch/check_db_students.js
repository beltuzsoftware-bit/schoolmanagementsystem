
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const fs = require('fs');

async function checkStudents() {
  try {
    const students = await prisma.student.findMany({
      select: {
        id: true,
        name: true,
        admissionNumber: true,
        className: true,
        section: true,
        status: true
      },
      take: 50
    });
    fs.writeFileSync('scratch/student_check_results.json', JSON.stringify(students, null, 2));
    console.log('Results written to scratch/student_check_results.json');
  } catch (error) {
    console.error(error);
  } finally {
    await prisma.$disconnect();
  }
}

checkStudents();
