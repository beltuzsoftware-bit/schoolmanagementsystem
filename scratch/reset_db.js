const fs = require('fs');
const path = 'data.json';

if (!fs.existsSync(path)) {
    console.error('data.json not found');
    process.exit(1);
}

const data = fs.readFileSync(path, 'utf-8');
let db;
try {
    db = JSON.parse(data);
} catch (e) {
    console.error('Json parse error, cannot wipe');
    process.exit(1);
}

// FULL BACKUP OF THE MANGLED STATE (Just in case)
fs.writeFileSync('data.json.mangled_final.bak', data);
console.log('Saved mangled backup to data.json.mangled_final.bak');

// THE WIPE
const oldStudentCount = db.students ? db.students.length : 0;
db.students = [];
db.feeTransactions = [];
db.admissionApplications = [];

fs.writeFileSync(path, JSON.stringify(db, null, 2));
console.log(`SUCCESS: Wiped ${oldStudentCount} students. Database reset to clean state.`);
console.log('All school settings, fee groups, and sessions have been PRESERVED.');
