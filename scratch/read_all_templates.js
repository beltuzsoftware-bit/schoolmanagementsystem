const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  const idTemplates = await prisma.idCardTemplate.findMany();
  const profileTemplates = await prisma.studentProfileTemplate.findMany();
  const admissionTemplates = await prisma.admissionFormTemplate.findMany();
  const staffTemplates = await prisma.staffFormTemplate.findMany();

  console.log('ID Templates count:', idTemplates.length);
  console.log('Profile Templates count:', profileTemplates.length);
  console.log('Admission Templates count:', admissionTemplates.length);
  console.log('Staff Templates count:', staffTemplates.length);

  idTemplates.forEach(t => console.log('ID Template:', t.name));
  profileTemplates.forEach(t => console.log('Profile Template:', t.name));
  admissionTemplates.forEach(t => console.log('Admission Template:', t.name));
  staffTemplates.forEach(t => console.log('Staff Template:', t.name));
}

main()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());
