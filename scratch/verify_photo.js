require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  const student = await prisma.student.findUnique({
    where: {
      id: 'stu_1780589511150_7_py07g'
    }
  });

  if (!student) {
    console.log("No student found");
    return;
  }

  console.log("Found student:", student.name);
  console.log("Photo starts with:", student.photo ? student.photo.slice(0, 100) : "null");

  if (student.photo && student.photo.startsWith('data:image/')) {
    const base64Data = student.photo.split(',')[1];
    const extension = student.photo.split(';')[0].split('/')[1];
    const buffer = Buffer.from(base64Data, 'base64');
    const filename = `student_photo.${extension}`;
    const filepath = path.join(__dirname, filename);
    fs.writeFileSync(filepath, buffer);
    console.log(`Saved image to ${filepath}, size: ${buffer.length} bytes`);
  } else {
    console.log("No valid base64 image found on student");
  }
}

main()
  .catch(e => console.error(e))
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
