const fs = require('fs');
const db = JSON.parse(fs.readFileSync('data.json', 'utf8'));
console.log("admissionSettings type:", typeof db.admissionSettings);
console.log("admissionSettings value:", db.admissionSettings);
