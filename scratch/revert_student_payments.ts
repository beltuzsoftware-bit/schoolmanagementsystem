
import fs from 'fs';
import path from 'path';

const DB_PATH = path.join(process.cwd(), 'data.json');

async function main() {
    const studentId = "2024-2025/1394";
    console.log(`Searching for transactions for student: ${studentId}`);

    if (!fs.existsSync(DB_PATH)) {
        console.error("DB file not found");
        return;
    }

    const db = JSON.parse(fs.readFileSync(DB_PATH, 'utf-8'));
    const initialCount = db.feeTransactions.length;
    
    // We match by admissionNumber or studentId? 
    // In actions.ts, transactions are linked via studentId.
    // Let's find the student first to get their internal ID.
    const student = db.students.find((s: any) => s.admissionNumber === studentId || s.id === studentId);
    
    if (!student) {
        console.error("Student not found in data.json");
        return;
    }

    console.log(`Found student: ${student.name} (ID: ${student.id})`);

    const filteredTxns = db.feeTransactions.filter((t: any) => t.studentId !== student.id);
    const removedCount = initialCount - filteredTxns.length;

    db.feeTransactions = filteredTxns;
    fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2));

    console.log(`Successfully removed ${removedCount} transactions for ${student.name}.`);
}

main();
