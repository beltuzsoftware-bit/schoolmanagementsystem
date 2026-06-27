const fs = require('fs');
const path = require('path');

const dbPath = path.join(__dirname, 'data.json');
const db = JSON.parse(fs.readFileSync(dbPath, 'utf8'));

console.log('\n--- Fee Transactions Summary ---');
const txns = db.feeTransactions || [];
console.log(`Total feeTransactions in DB: ${txns.length}`);

if (txns.length > 0) {
    console.log('\nFirst 5 transactions:');
    txns.slice(0, 5).forEach((t, i) => {
        console.log(`  [${i}] id=${t.id} | studentId=${t.studentId} | monthIndex=${t.monthIndex} | amount=${t.amount} | invoiceNo=${t.invoiceNo} | schoolId=${t.schoolId}`);
    });

    // Check for CHAR receipts
    const charTxns = txns.filter(t => t.invoiceNo && t.invoiceNo.includes('CHAR'));
    console.log(`\nCHAR invoice transactions: ${charTxns.length}`);
    charTxns.forEach(t => {
        console.log(`  id=${t.id} | studentId=${t.studentId} | monthIndex=${t.monthIndex} | amount=${t.amount} | invoiceNo=${t.invoiceNo}`);
    });
}

console.log('\n--- Invoice Settings ---');
const settings = db.invoiceSettings || {};
Object.entries(settings).forEach(([schoolId, s]) => {
    console.log(`  schoolId=${schoolId}: prefix=${s.prefix} currentSequence=${s.currentSequence} autoGenerate=${s.autoGenerate}`);
});

console.log('\n--- Students (first 5, showing id + name) ---');
const students = db.students || [];
students.slice(0, 5).forEach(s => {
    console.log(`  id=${s.id} | name=${s.name} | schoolId=${s.schoolId} | className=${s.className}`);
});

// Check if PAROMITA exists
const paromita = students.find(s => s.name && s.name.toUpperCase().includes('PAROMITA'));
if (paromita) {
    console.log('\n--- PAROMITA found ---');
    console.log(`  id=${paromita.id} | name=${paromita.name} | schoolId=${paromita.schoolId}`);
    const herTxns = txns.filter(t => t.studentId === paromita.id);
    console.log(`  Transactions for her: ${herTxns.length}`);
    herTxns.forEach(t => {
        console.log(`    id=${t.id} | monthIndex=${t.monthIndex} | amount=${t.amount} | invoiceNo=${t.invoiceNo}`);
    });
} else {
    console.log('\nPAROMITA not found in students array.');
}
