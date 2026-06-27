const fs = require('fs');
const path = require('path');
const dbPath = path.join('d:', 'kummi-school-system', 'data.json');
const rawData = fs.readFileSync(dbPath, 'utf8');
const data = JSON.parse(rawData);
const chara = data.students.find(s => s.name.toLowerCase().includes('chara chara'));
console.log(JSON.stringify(chara, null, 2));
if (chara && chara.feeGroupId) {
    const fg = data.feeGroups.find(g => g.id === chara.feeGroupId);
    console.log('\n--- Fee Group ---');
    console.log(JSON.stringify(fg, null, 2));
}
const transactions = data.feeTransactions.filter(t => t.studentId === chara.id);
console.log('\n--- Transactions ---');
console.log(JSON.stringify(transactions, null, 2));
