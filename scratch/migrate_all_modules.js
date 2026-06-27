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
  // 1. Update data.json
  console.log("Updating local data.json...");
  const dbPath = path.resolve(__dirname, '../data.json');
  if (fs.existsSync(dbPath)) {
    const db = JSON.parse(fs.readFileSync(dbPath, 'utf8'));
    
    const modulesToAdd = [
      {
        id: 'm2',
        name: 'Student Information',
        description: 'Student profiles, academic records, and parent information',
        icon: 'Users'
      },
      {
        id: 'm11',
        name: 'Reports',
        description: 'Comprehensive reporting dashboard for student, staff, fee, and attendance data',
        icon: 'FileText'
      }
    ];

    for (const mod of modulesToAdd) {
      if (!db.modules.some(m => m.id === mod.id)) {
        db.modules.push(mod);
        console.log(`Added module ${mod.id} (${mod.name}) to data.json`);
      }
    }
    
    // Add m2 and m11 to all appropriate packages
    const premiumPkg = db.packages.find(p => p.id === 'p3');
    if (premiumPkg) {
      if (!premiumPkg.modules.includes('m2')) premiumPkg.modules.push('m2');
      if (!premiumPkg.modules.includes('m11')) premiumPkg.modules.push('m11');
      console.log("Updated Premium package (p3) modules in data.json");
    }

    const fullPkgJson = db.packages.find(p => p.id === 'p_1776494538371');
    if (fullPkgJson) {
      if (!fullPkgJson.modules.includes('m2')) fullPkgJson.modules.push('m2');
      if (!fullPkgJson.modules.includes('m11')) fullPkgJson.modules.push('m11');
      console.log("Updated Full Package (p_1776494538371) modules in data.json");
    }
    
    fs.writeFileSync(dbPath, JSON.stringify(db, null, 2));
    console.log("Saved updated data.json");
  } else {
    console.error("data.json not found!");
  }

  // 2. Update PostgreSQL database
  console.log("Updating PostgreSQL database via Prisma...");
  try {
    const pkgs = await prisma.saasPackage.findMany();
    
    for (const pkg of pkgs) {
      if (pkg.id === 'p_1776494538371' || pkg.id === 'p3') {
        const newModules = [...pkg.modules];
        let updated = false;
        
        if (!newModules.includes('m2')) {
          newModules.push('m2');
          updated = true;
        }
        if (!newModules.includes('m11')) {
          newModules.push('m11');
          updated = true;
        }
        
        if (updated) {
          await prisma.saasPackage.update({
            where: { id: pkg.id },
            data: { modules: newModules }
          });
          console.log(`Updated package ${pkg.name} (${pkg.id}) in PostgreSQL to include m2 and m11`);
        } else {
          console.log(`Package ${pkg.name} (${pkg.id}) already contains m2 and m11 in PostgreSQL`);
        }
      }
    }
  } catch (err) {
    console.error("Failed to update PostgreSQL via Prisma:", err);
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

main().catch(err => {
  console.error("Execution failed:", err);
});
