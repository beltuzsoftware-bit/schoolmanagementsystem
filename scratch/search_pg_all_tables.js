const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  // Query all tables to see if they contain 'annual exam' or 'post mid' or 'sample student'
  const tables = ['user', 'school', 'session', 'student', 'studentDocument', 'globalStudentDefaults', 'studentProfileTemplate', 'admissionFormTemplate', 'feeTransaction', 'saasPackage', 'staffFormTemplate', 'idCardTemplate'];
  
  for (const table of tables) {
    try {
      const rows = await prisma[table].findMany();
      const str = JSON.stringify(rows).toLowerCase();
      if (str.includes('annual') || str.includes('post mid') || str.includes('sample student') || str.includes('hms')) {
        console.log(`Found match in PG table: ${table}`);
        rows.forEach(row => {
          const rowStr = JSON.stringify(row).toLowerCase();
          if (rowStr.includes('annual') || rowStr.includes('post mid') || rowStr.includes('sample student') || rowStr.includes('hms')) {
            console.log('  Row:', row);
          }
        });
      }
    } catch (e) {
      console.error(`Error querying ${table}:`, e.message);
    }
  }
}

main()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());
