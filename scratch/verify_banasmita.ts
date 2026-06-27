
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function checkStudent() {
  const name = "BANASMITA DHAR";
  console.log(`Searching for student: ${name}...`);

  const student = await prisma.student.findFirst({
    where: {
      name: {
        contains: name,
        mode: 'insensitive'
      }
    }
  });

  if (!student) {
    console.log("NO STUDENT FOUND with that name.");
    process.exit(0);
  }

  console.log(`Student Found: ${student.name} (ID: ${student.id})`);

  const transactions = await prisma.feeTransaction.findMany({
    where: { studentId: student.id }
  });

  if (transactions.length === 0) {
    console.log("NO PAYMENTS collected for this student in their entire life.");
  } else {
    console.log(`YES, found ${transactions.length} payments collected.`);
    transactions.forEach(t => {
        console.log(`- ₹${t.amount} for ${t.month} (${t.createdAt})`);
    });
  }
}

checkStudent()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect());
