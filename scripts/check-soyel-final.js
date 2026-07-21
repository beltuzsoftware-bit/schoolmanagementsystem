const fs = require('fs');
const db = JSON.parse(fs.readFileSync('data.json', 'utf8'));
const soyel = db.students.find(s => s.id === 'stu_1782214508962_0_poa90');
console.log(`APAAR: ${soyel.apaarId} | PHOTO: ${soyel.photo}`);
