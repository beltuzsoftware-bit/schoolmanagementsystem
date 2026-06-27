const fs = require('fs');
const db = JSON.parse(fs.readFileSync('data.json', 'utf8'));
console.log('Number of schools:', db.schools.length);
console.log('Schools:', db.schools.map(s => ({ id: s.id, name: s.name })));
console.log('Number of users:', db.users.length);
console.log('Users:', db.users.map(u => ({ id: u.id, name: u.name, schoolId: u.schoolId })));
