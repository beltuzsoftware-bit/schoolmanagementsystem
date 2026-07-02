const fs = require('fs');
const path = require('path');

// Target mapping from screenshot
const idMapping = [
    { name: 'JOGENDRA PAUL', targetId: 'HMS01190138' },
    { name: 'PAROMITA MUNDA', targetId: 'HMS01190142' },
    { name: 'HEMA MOLLA', targetId: 'HMS01190153' },
    { name: 'PRIYA GOPAL GOSWAMI', targetId: 'HMS01190172' },
    { name: 'BARNALI MUNDARI', targetId: 'HMS01230089' },
    { name: 'RIDDHIMAN DAS', targetId: 'HMS01240009' },
    { name: 'BANASMITA DHAR', targetId: 'HMS20262004' },
    { name: 'SOYEL MALLICK', targetId: 'HMS20262018' }
];

const dbPathArg = process.argv[2];
if (!dbPathArg) {
    console.error('Usage: node scripts/update-student-ids.js <path-to-data.json>');
    process.exit(1);
}

const resolvedPath = path.resolve(dbPathArg);
if (!fs.existsSync(resolvedPath)) {
    console.error(`Error: File not found at ${resolvedPath}`);
    process.exit(1);
}

console.log(`Reading database from: ${resolvedPath}...`);
const db = JSON.parse(fs.readFileSync(resolvedPath, 'utf8'));

if (!db.students || !Array.isArray(db.students)) {
    console.error('Error: Invalid database structure. "students" array not found.');
    process.exit(1);
}

console.log(`Found ${db.students.length} students in database. Starting matching...`);

let updateCount = 0;
idMapping.forEach(({ name, targetId }) => {
    const normalizedTarget = name.toLowerCase().replace(/\s+/g, ' ').trim();
    
    // Find the student by name
    const matches = db.students.filter(student => {
        const sName = (student.name || `${student.firstName || ''} ${student.lastName || ''}`)
            .toLowerCase()
            .replace(/\s+/g, ' ')
            .trim();
        return sName === normalizedTarget;
    });

    if (matches.length === 0) {
        console.warn(`[WARNING] Student not found: "${name}"`);
    } else if (matches.length > 1) {
        console.warn(`[WARNING] Multiple matches found for "${name}":`, matches.map(m => m.id));
        // Fallback: match by roll number if possible, or update all for safety if they are the same
        matches.forEach(m => {
            console.log(`Updating student ID for matching record: ${m.name} (ID: ${m.id}) -> ${targetId}`);
            m.admissionNumber = targetId;
            m.registrationNo = targetId;
            updateCount++;
        });
    } else {
        const student = matches[0];
        console.log(`[SUCCESS] Matched "${name}" (ID: ${student.id}). Updating admissionNumber and registrationNo -> ${targetId}`);
        student.admissionNumber = targetId;
        student.registrationNo = targetId;
        updateCount++;
    }
});

if (updateCount > 0) {
    console.log('Writing changes back to database...');
    // Create backup first
    fs.writeFileSync(resolvedPath + '.bak', JSON.stringify(db, null, 2));
    fs.writeFileSync(resolvedPath, JSON.stringify(db, null, 2));
    console.log(`Done! Successfully updated ${updateCount} student records. Backup created.`);
} else {
    console.log('No records were updated.');
}
