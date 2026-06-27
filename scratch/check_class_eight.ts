require('dotenv').config();

async function main() {
  const { PrismaClient } = require('@prisma/client');
  const prisma = new PrismaClient();
  
  const students = await prisma.student.findMany({
    where: {
      className: 'classVIII',
    }
  });
  
  console.log(`Found ${students.length} students in classVIII:`);
  for (const s of students) {
    console.log(`- ID: ${s.id}, Name: ${s.name}, Photo present: ${!!s.photo}, Photo length: ${s.photo ? s.photo.length : 0}`);
    if (s.photo) {
      console.log(`  Photo prefix: ${s.photo.substring(0, 50)}...`);
    }
  }
  
  await prisma.$disconnect();
}

main();
