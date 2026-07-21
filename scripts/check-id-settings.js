const fs = require('fs');
const db = JSON.parse(fs.readFileSync('data.json', 'utf8'));
const school = db.schools.find(s => s.id === 's_1782211560310');
console.log("School configurations:", school?.academicSettings);
console.log("School idSettings:", db.idSettings?.filter(ids => ids.schoolId === 's_1782211560310'));
