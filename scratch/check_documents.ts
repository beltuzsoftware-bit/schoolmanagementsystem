require('dotenv').config();

async function main() {
  const prisma = (await import('../src/lib/prisma')).default;
  
  const docs = await prisma.studentDocument.findMany({
    include: {
      student: true
    }
  });
  
  console.log(`Found ${docs.length} student documents:`);
  for (const d of docs) {
    console.log(`- ID: ${d.id}, Student: ${d.student.name}, Title: ${d.title}, FieldName: ${d.fieldName}, File: ${d.file}, Content Length: ${d.content ? d.content.length : 0}`);
  }
  
  await prisma.$disconnect();
}

main();
