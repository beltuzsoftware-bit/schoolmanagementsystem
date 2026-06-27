const fs = require('fs');
const path = require('path');

const dbPath = path.join(__dirname, 'data.json');

try {
    const rawData = fs.readFileSync(dbPath, 'utf8');
    const data = JSON.parse(rawData);

    // Find student "chara chara"
    const chara = data.students.find(s => s.name.toLowerCase().includes('chara chara'));
    
    if (!chara) {
        console.log("Could not find student 'chara chara'.");
        process.exit(1);
    }

    console.log('--- Student Info ---');
    console.log(`Name: ${chara.name}`);
    console.log(`ID: ${chara.id}`);
    console.log(`Class: ${chara.class}, Sec: ${chara.section}`);
    console.log(`Fee Group ID: ${chara.feeGroupId}`);

    // Get fee group details
    const feeGroup = data.feeGroups.find(fg => fg.id === chara.feeGroupId);
    if (feeGroup) {
        console.log('--- Fee Group Details ---');
        console.log(`Name: ${feeGroup.name}`);
        console.log(`Base Amount: ${feeGroup.baseAmount}`);
        console.log(`Fees: ${JSON.stringify(feeGroup.fees, null, 2)}`);
    } else {
        console.log('No fee group found for this student.');
    }

    // Get all transactions for this student
    const txns = data.feeTransactions.filter(txn => txn.studentId === chara.id);
    console.log('\n--- Transaction History ---');
    if (txns.length === 0) {
        console.log('No transactions found.');
    } else {
        txns.forEach((txn, i) => {
            console.log(`${i+1}. Date: ${txn.date}, MonthIndex: ${txn.monthIndex}, Amount: ${txn.amount}, Discount: ${txn.discount || 0}, PaidInFull: ${txn.paidInFull}`);
        });
    }

    // Check for ad-hoc discounts if any (usually stored in student record or transactions)
    // Some systems store "discounts" in the student record directly or in the feeGroup mapping.
    console.log('\n--- Student Record JSON ---');
    console.log(JSON.stringify(chara, null, 2));

} catch (error) {
    console.error("Error:", error);
}
