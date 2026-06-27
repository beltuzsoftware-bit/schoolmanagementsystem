const fs = require('fs');
const data = JSON.parse(fs.readFileSync('d:/kummi-school-system/data.json', 'utf8'));

const kkDas = data.students?.find(s => s.name.includes('KK Das'));
const pool = data.students?.find(s => s.name.includes('Pool'));

console.log('KK Das:', JSON.stringify(kkDas, null, 2));
console.log('Pool:', JSON.stringify(pool, null, 2));

const sessions = data.schools?.flatMap(s => s.sessions || []);
console.log('Sessions:', JSON.stringify(sessions, null, 2));
