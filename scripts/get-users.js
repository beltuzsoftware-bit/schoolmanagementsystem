const fs = require('fs');
const db = JSON.parse(fs.readFileSync('data.json', 'utf8'));
console.log("Users:", db.users.slice(0, 3).map(u => ({ email: u.email, username: u.username, role: u.role, password: u.password, loginPassword: u.loginPassword })));
