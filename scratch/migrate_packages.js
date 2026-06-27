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
    
    // Add transport module to modules list if not exists
    if (!db.modules.some(m => m.id === 'm12')) {
      db.modules.push({
        id: 'm12',
        name: 'Transport Management',
        description: 'Manage routes, vehicles, vehicle types, drivers, and allocations',
        icon: 'Bus'
      });
      console.log("Added Transport module to modules list in data.json");
    }
    
    // Add m12 to Premium package (p3)
    const premiumPkg = db.packages.find(p => p.id === 'p3');
    if (premiumPkg && !premiumPkg.modules.includes('m12')) {
      premiumPkg.modules.push('m12');
      console.log("Added m12 to Premium package (p3) modules list in data.json");
    }

    // Add m12 to Full Package (p_1776494538371) in data.json if it exists
    const fullPkgJson = db.packages.find(p => p.id === 'p_1776494538371');
    if (fullPkgJson && !fullPkgJson.modules.includes('m12')) {
      fullPkgJson.modules.push('m12');
      console.log("Added m12 to Full Package (p_1776494538371) modules list in data.json");
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
      // Add m12 to all packages, or specific packages (Full Package / p3 / p_1776494538371)
      if (pkg.id === 'p_1776494538371' || pkg.id === 'p3') {
        if (!pkg.modules.includes('m12')) {
          const updatedModules = [...pkg.modules, 'm12'];
          await prisma.saasPackage.update({
            where: { id: pkg.id },
            data: { modules: updatedModules }
          });
          console.log(`Updated package ${pkg.name} (${pkg.id}) modules in PostgreSQL to include m12`);
        } else {
          console.log(`Package ${pkg.name} (${pkg.id}) already contains m12 in PostgreSQL`);
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
