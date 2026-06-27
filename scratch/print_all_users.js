const fs = require('fs');
const data = JSON.parse(fs.readFileSync('data.json', 'utf8'));
data.users.forEach(u => {
    console.log(`ID: ${u.id}, Name: ${u.name}, Email: ${u.email}, Role: ${u.role}, SchoolId: ${u.schoolId}`);
});
