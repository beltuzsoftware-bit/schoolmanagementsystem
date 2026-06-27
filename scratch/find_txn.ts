import fs from 'fs';

const data = JSON.parse(fs.readFileSync('d:/kummi-school-system/data.json', 'utf8'));
const studentId = 'stu_1777099555345_pwt3v';

const txns = data.feeTransactions?.filter(t => t.studentId === studentId || t.id === 'REC-1028' || t.invoiceNo === 'REC-1028') || [];
console.log('Active txns:', JSON.stringify(txns, null, 2));

const reverted = data.revertedTransactions?.filter(t => 
    t.deletedRecords?.some(r => r.studentId === studentId) || t.transactionId.includes('1028')
) || [];
console.log('Reverted txns:', JSON.stringify(reverted, null, 2));
