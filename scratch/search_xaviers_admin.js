const fs = require('fs');
const content = fs.readFileSync('data.json', 'utf-8');
const db = JSON.parse(content);
const user = db.users.find(u => u.name === 'Xaviers Admin' || u.email === 'Xaviers Admin');
console.log('User found:', user);
