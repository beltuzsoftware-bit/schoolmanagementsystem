import fs from 'fs';

const data = JSON.parse(fs.readFileSync('d:/kummi-school-system/data.json', 'utf8'));

const banasmita = data.students?.find(s => s.firstName?.toLowerCase().includes('banasmita') || s.lastName?.toLowerCase().includes('banasmita') || s.name?.toLowerCase().includes('banasmita'));
console.log('Banasmita ID:', banasmita?.id);

if (banasmita) {
    const txns = data.feeTransactions?.filter(t => t.studentId === banasmita.id) || [];
    console.log('Active txns:', JSON.stringify(txns, null, 2));

    const reverted = data.revertedTransactions?.filter(t => 
        t.deletedRecords?.some(r => r.studentId === banasmita.id)
    ) || [];
    console.log('Reverted txns:', JSON.stringify(reverted.map(r => r.transactionId), null, 2));
}
