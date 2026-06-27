import fs from 'fs';
const db = JSON.parse(fs.readFileSync('data.json', 'utf8'));
db.feeTransactions = [];
db.qrTransactions = [];
db.revertedTransactions = [];
fs.writeFileSync('data.json', JSON.stringify(db, null, 4));
console.log('Database transactions purged. System is now fresh.');
