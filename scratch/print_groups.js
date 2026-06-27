import fs from 'fs';
import path from 'path';

const dbPath = path.resolve('data.json');
const db = JSON.parse(fs.readFileSync(dbPath, 'utf-8'));

console.log('--- FEE GROUPS ---');
console.log(JSON.stringify(db.feeGroups, null, 2));
