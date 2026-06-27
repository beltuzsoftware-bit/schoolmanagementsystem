const fs = require('fs');
const content = fs.readFileSync('data.json', 'utf-8');
const db = JSON.parse(content);

console.log('Searching users:');
db.users.forEach(u => {
    if (JSON.stringify(u).toLowerCase().includes('xavier')) {
        console.log(u);
    }
});

console.log('Searching schools:');
db.schools.forEach(s => {
    if (JSON.stringify(s).toLowerCase().includes('xavier')) {
        console.log(s);
    }
});
