const fs = require('fs');
const path = require('path');
const dbPath = path.resolve(__dirname, '../data.json');

if (fs.existsSync(dbPath)) {
  const db = JSON.parse(fs.readFileSync(dbPath, 'utf8'));
  
  const standardPkg = db.packages.find(p => p.id === 'p2');
  if (standardPkg) {
    let updated = false;
    if (!standardPkg.modules.includes('m2')) {
      standardPkg.modules.push('m2');
      updated = true;
    }
    if (!standardPkg.modules.includes('m11')) {
      standardPkg.modules.push('m11');
      updated = true;
    }
    if (updated) {
      fs.writeFileSync(dbPath, JSON.stringify(db, null, 2));
      console.log("Successfully updated Standard package (p2) in data.json to include m2 and m11");
    } else {
      console.log("Standard package (p2) in data.json already includes m2 and m11");
    }
  } else {
    console.log("Standard package (p2) not found in data.json");
  }
} else {
  console.log("data.json not found!");
}
