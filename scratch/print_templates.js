require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  const templates = await prisma.idCardTemplate.findMany({
    where: { schoolId: 's_1780586158265' }
  });

  for (const tmpl of templates) {
    console.log(`\n=== Template: ${tmpl.name} (${tmpl.layout}, ${tmpl.width}x${tmpl.height}mm) ===`);
    const elements = tmpl.canvasElements;
    if (!elements || !Array.isArray(elements)) {
      console.log('  No canvas elements');
      continue;
    }
    elements
      .sort((a, b) => a.y - b.y)
      .forEach(el => {
        console.log(`  [${el.type}] id=${el.id.slice(0,12)} | x=${el.x}% y=${el.y}% w=${el.width}% h=${el.height}% | label=${el.labelText||el.fieldLabel||el.text||el.fieldKey||''} | zIndex=${el.zIndex||0}`);
      });
  }
}

main()
  .catch(e => console.error(e))
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
