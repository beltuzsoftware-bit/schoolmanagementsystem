const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('🚀 Starting Database Export...');

  const exportData = {
    timestamp: new Date().toISOString(),
    users: await prisma.user.findMany(),
    schools: await prisma.school.findMany({
      include: {
        sessions: true
      }
    }),
    sessions: await prisma.session.findMany(),
    students: await prisma.student.findMany(),
    feeTransactions: await prisma.feeTransaction.findMany(),
    admissionFormTemplates: await prisma.admissionFormTemplate.findMany(),
    studentProfileTemplates: await prisma.studentProfileTemplate.findMany(),
    saasPackages: await prisma.saasPackage.findMany(),
    staffFormTemplates: await prisma.staffFormTemplate.findMany(),
    idCardTemplates: await prisma.idCardTemplate.findMany(),
    globalStudentDefaults: await prisma.globalStudentDefaults.findMany(),
    studentDocuments: await prisma.studentDocument.findMany()
  };

  const filename = `backup_db_${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
  const exportPath = path.join(process.cwd(), filename);

  fs.writeFileSync(exportPath, JSON.stringify(exportData, null, 2));
  
  // Also update data.json
  fs.writeFileSync(path.join(process.cwd(), 'data.json'), JSON.stringify(exportData, null, 2));

  console.log(`✅ Export complete! Saved to: ${filename} and updated data.json`);
}

main()
  .catch((e) => {
    console.error('❌ Export Failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
