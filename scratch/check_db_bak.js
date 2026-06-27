const fs = require('fs');
const path = require('path');
const dbPath = path.resolve(__dirname, '../data.json.bak');

console.log("=== CHECKING DATA.JSON.BAK ===");
if (fs.existsSync(dbPath)) {
  const db = JSON.parse(fs.readFileSync(dbPath, 'utf8'));
  console.log("Modules in data.json.bak:");
  console.log(db.modules ? db.modules.map(m => `${m.id}: ${m.name}`) : "No modules array");
  
  console.log("\nPackages in data.json.bak:");
  if (db.packages) {
    for (const pkg of db.packages) {
      console.log(`${pkg.id} (${pkg.name}):`, pkg.modules);
    }
  } else {
    console.log("No packages array");
  }
} else {
  console.log("data.json.bak not found!");
}
