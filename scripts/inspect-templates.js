const fs = require('fs');
const path = require('path');

const dbPath = path.resolve(__dirname, '../data.json');
const db = JSON.parse(fs.readFileSync(dbPath, 'utf8'));
const initialCount = db.idCardTemplates.length;
db.idCardTemplates = db.idCardTemplates.filter(t => t.id !== 'tmpl_1786299830727');
const finalCount = db.idCardTemplates.length;

fs.writeFileSync(dbPath, JSON.stringify(db, null, 2), 'utf8');
console.log(`Deleted corrupted template. Count: ${initialCount} -> ${finalCount}`);
