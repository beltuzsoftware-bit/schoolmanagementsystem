import fs from 'fs';
import path from 'path';

const dbPath = path.resolve('data.json');
const db = JSON.parse(fs.readFileSync(dbPath, 'utf-8'));

const studentId = 'stu_1780589511150_7_py07g';
const studentTxns = db.feeTransactions?.filter(t => t.studentId === studentId && t.monthIndex === 3);

console.log('--- ALL TRANSACTIONS FOR APRIL ---');
console.log(JSON.stringify(studentTxns, null, 2));
