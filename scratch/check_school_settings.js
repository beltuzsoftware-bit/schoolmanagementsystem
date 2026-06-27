
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const fs = require('fs');

async function checkSchoolSettings() {
  try {
    const schools = await prisma.school.findMany({
      select: {
        id: true,
        name: true,
        useCustomHouses: true,
        houses: true
      }
    });
    fs.writeFileSync('scratch/school_settings_check.json', JSON.stringify(schools, null, 2));
    console.log('Results written to scratch/school_settings_check.json');
  } catch (error) {
    console.error(error);
  } finally {
    await prisma.$disconnect();
  }
}

checkSchoolSettings();
