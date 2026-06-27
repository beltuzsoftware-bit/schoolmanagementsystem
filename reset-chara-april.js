const fs = require('fs');
const path = require('path');

const dbPath = path.join(__dirname, 'data.json');

try {
    const rawData = fs.readFileSync(dbPath, 'utf8');
    const data = JSON.parse(rawData);

    // Find student ID for "chara chara"
    const chara = data.students.find(s => s.name.toLowerCase().includes('chara chara'));
    
    if (!chara) {
        console.log("Could not find student 'chara chara'.");
        process.exit(1);
    }

    console.log(`Found student: ${chara.name} with ID: ${chara.id}`);

    const originalTxnCount = data.feeTransactions.length;

    // Filter out transactions for chara for April (monthIndex === 3)
    // April = index 3 because session start month is probably 4 (April), wait...
    // In fees-helper, index 3 is April (Jan = 0, Feb = 1, Mar = 2, Apr = 3).
    data.feeTransactions = data.feeTransactions.filter(txn => {
        const isChara = txn.studentId === chara.id;
        const isApril = txn.monthIndex === 3;
        
        if (isChara && isApril) {
            console.log(`Removing transaction: ID ${txn.id}, Amount ${txn.amount}, Date ${txn.date}`);
            return false; // Remove
        }
        return true; // Keep
    });

    const removedCount = originalTxnCount - data.feeTransactions.length;

    fs.writeFileSync(dbPath, JSON.stringify(data, null, 2), 'utf8');
    console.log(`Successfully reset! Removed ${removedCount} transactions for April.`);

} catch (error) {
    console.error("Error updating data.json:", error);
}
