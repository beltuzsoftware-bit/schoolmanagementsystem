const fs = require('fs');
const path = require('path');

const dbPath = path.resolve('data.json');
const db = JSON.parse(fs.readFileSync(dbPath, 'utf-8'));

console.log('--- ALL SCHOOLS IN DB ---');
db.schools.forEach((s, idx) => {
    console.log(`${idx + 1}. name: ${s.name}, id: ${s.id}, schoolId: ${s.schoolId}, accessories: ${s.accessories ? 'Initialized' : 'null'}`);
});
