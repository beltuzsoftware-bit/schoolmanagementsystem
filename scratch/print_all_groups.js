import fs from 'fs';
import path from 'path';

const dbPath = path.resolve('data.json');
const db = JSON.parse(fs.readFileSync(dbPath, 'utf-8'));

console.log('--- ALL FEE GROUPS IN DB ---');
db.feeGroups.forEach((g, idx) => {
    console.log(`${idx + 1}. name: ${g.name}, schoolId: ${g.schoolId}, classes: ${JSON.stringify(g.assignedClasses)}`);
    g.fees.forEach(f => {
        console.log(`   - feeName: ${f.feeName}, appliesTo: ${f.appliesTo}, amount: ${f.amount}, freq: ${f.paymentFrequency}`);
    });
});
