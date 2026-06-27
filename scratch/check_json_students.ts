const fs = require('fs');
const path = require('path');

const dbPath = path.resolve(__dirname, '../data.json');
if (!fs.existsSync(dbPath)) {
  console.log("No data.json found!");
  process.exit(1);
}

const data = JSON.parse(fs.readFileSync(dbPath, 'utf8'));
const students = data.students || [];

console.log(`Found ${students.length} students in data.json:`);
for (const s of students) {
  console.log(`- ID: ${s.id}, Name: ${s.name}, Class: ${s.className}, Photo present: ${!!s.photo}`);
  if (s.photo) {
    console.log(`  Photo length: ${s.photo.length}`);
    console.log(`  Photo prefix: ${s.photo.substring(0, 80)}...`);
  }
}
