import fs from 'fs';
import path from 'path';

const dbPath = path.resolve('data.json');
const db = JSON.parse(fs.readFileSync(dbPath, 'utf-8'));

const school = db.schools.find(s => s.id === 's_1780586158265' || s.schoolId === 's_1780586158265');
console.log('School details:', JSON.stringify(school, null, 2));
