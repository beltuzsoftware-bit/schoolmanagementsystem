const fs = require('fs');
const db = JSON.parse(fs.readFileSync('data.json', 'utf8'));
const students = db.students.filter(s => s.photo || s.apaarId);
console.log("Students with photo or apaarId:", students.map(s => ({ id: s.id, name: s.name, photo: s.photo ? s.photo.substring(0, 50) + "..." : null, apaarId: s.apaarId })));
