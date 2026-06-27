const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  const templates = await prisma.idCardTemplate.findMany();
  console.log('Templates in PG DB:', JSON.stringify(templates, null, 2));
}

main()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());
