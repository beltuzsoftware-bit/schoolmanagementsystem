const fs = require('fs');
const path = require('path');
const dbPath = path.resolve(__dirname, '../data.json');

console.log("=== CHECKING DATA.JSON ===");
if (fs.existsSync(dbPath)) {
  const db = JSON.parse(fs.readFileSync(dbPath, 'utf8'));
  console.log("Modules in data.json:");
  console.log(db.modules.map(m => `${m.id}: ${m.name}`));
  
  console.log("\nPackages in data.json:");
  for (const pkg of db.packages) {
    console.log(`${pkg.id} (${pkg.name}):`, pkg.modules);
  }
} else {
  console.log("data.json not found!");
}
