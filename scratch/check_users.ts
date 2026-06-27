require('dotenv').config();

async function main() {
  const prisma = (await import('../src/lib/prisma')).default;
  
  const users = await prisma.user.findMany({
    include: {
      school: true
    }
  });
  
  console.log(`Found ${users.length} users:`);
  for (const u of users) {
    console.log(`- ID: ${u.id}, Name: ${u.name}, Email: ${u.email}, Role: ${u.role}, School: ${u.school ? u.school.name : 'None'}`);
  }
  
  await prisma.$disconnect();
}

main();
