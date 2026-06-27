const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function deleteClassIXStudents() {
  console.log('🔍 Finding all Class IX students...');

  // Try different class name formats
  const classNames = ['IX', 'Class IX', 'class ix', '9', 'Class 9'];
  
  let students = [];
  for (const name of classNames) {
    const found = await prisma.student.findMany({
      where: { className: name },
      select: { id: true, name: true, admissionNumber: true, className: true, schoolId: true }
    });
    students = students.concat(found);
  }

  // Deduplicate by id
  const seen = new Set();
  students = students.filter(s => {
    if (seen.has(s.id)) return false;
    seen.add(s.id);
    return true;
  });

  if (students.length === 0) {
    console.log('⚠️  No Class IX students found with any of those class names.');
    
    // Show all distinct class names to help debug
    const allClasses = await prisma.student.groupBy({
      by: ['className'],
      _count: true
    });
    console.log('\n📋 All class names currently in the database:');
    allClasses.forEach(c => console.log(`  - "${c.className}" (${c._count} students)`));
    return;
  }

  console.log(`\n📋 Found ${students.length} student(s) in Class IX:\n`);
  students.forEach(s => {
    console.log(`  - ${s.name} | Adm: ${s.admissionNumber || 'N/A'} | Class: ${s.className}`);
  });

  const ids = students.map(s => s.id);
  
  console.log('\n🗑️  Deleting related documents first...');
  await prisma.studentDocument.deleteMany({
    where: { studentId: { in: ids } }
  });

  console.log('🗑️  Deleting students...');
  const result = await prisma.student.deleteMany({
    where: { id: { in: ids } }
  });

  console.log(`\n✅ Successfully deleted ${result.count} student(s).`);
}

deleteClassIXStudents()
  .catch(e => {
    console.error('❌ Error:', e.message);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
