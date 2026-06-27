require('dotenv').config();

async function main() {
  const prisma = (await import('../src/lib/prisma')).default;
  
  const users = await prisma.user.findMany({
    select: {
      name: true,
      email: true,
      password: true,
      role: true,
      schoolId: true
    }
  });
  
  console.log("Users and passwords:");
  for (const u of users) {
    console.log(`- Name: ${u.name}, Email: ${u.email}, Password: ${u.password}, Role: ${u.role}, SchoolId: ${u.schoolId}`);
  }
  
  await prisma.$disconnect();
}

main();
