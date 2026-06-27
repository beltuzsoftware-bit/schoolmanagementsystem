import fs from 'fs';
import path from 'path';

const dbPath = 'c:/Users/DELL/.gemini/antigravity/scratch/kummi-school-system/data.json';
const db = JSON.parse(fs.readFileSync(dbPath, 'utf8'));

db.schools = db.schools.map((school: any) => ({
    ...school,
    schoolId: school.schoolId || school.code || `ID_${school.id}`
}));

fs.writeFileSync(dbPath, JSON.stringify(db, null, 2));
console.log('Updated schools in data.json with schoolId');
