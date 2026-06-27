const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  const templates = await prisma.idCardTemplate.findMany();
  console.log('--- ALL TEMPLATES IN POSTGRESQL DB ---');
  templates.forEach((t, idx) => {
    console.log(`${idx + 1}. name: "${t.name}", id: ${t.id}, layout: ${t.layout}, backgroundImage: ${t.backgroundImage ? t.backgroundImage.substring(0, 100) : 'none'}`);
  });
}

main()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());
