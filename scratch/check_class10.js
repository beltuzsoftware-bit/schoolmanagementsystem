const fs = require('fs');
const path = require('path');

const dbPath = path.join(process.cwd(), 'db.json');
if (!fs.existsSync(dbPath)) {
    console.log('db.json not found');
    process.exit(1);
}

const db = JSON.parse(fs.readFileSync(dbPath, 'utf8'));

// Find Class 10 students across all schools or specifically for Class 10
const class10Students = (db.students || []).filter(s => s.className === 'Class 10' || s.class === 'Class 10');

console.log(`Total students in Class 10: ${class10Students.length}`);
class10Students.forEach(s => {
    console.log(`- ${s.name} (${s.id}): Username=${s.studentUsername || 'None'}, Password=${s.loginPassword || 'None'}`);
});

// Also find the school(s) that have Class 10 configured for auto-login
const schoolsWithAutoLogin = (db.schools || []).filter(s => {
    const classes = s.classes || [];
    return classes.some(c => c.name === 'Class 10' && c.createStudentLoginDefault);
});

console.log('\nSchools with Class 10 auto-login enabled:');
schoolsWithAutoLogin.forEach(s => {
    console.log(`- ${s.name} (${s.id})`);
});
