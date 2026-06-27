const fs = require('fs');
const data = JSON.parse(fs.readFileSync('d:/kummi-school-system/data.json', 'utf8'));

console.log(`Checking ${data.students.length} students...`);
const mismatches = data.students.filter(s => s.currentSessionId !== s.enrolledSession);

if (mismatches.length > 0) {
    console.log(`Found ${mismatches.length} mismatches:`);
    mismatches.forEach(s => {
        console.log(`- ${s.name} (ID: ${s.id}): Current: ${s.currentSessionId}, Enrolled: ${s.enrolledSession}`);
    });
} else {
    console.log("No mismatches found!");
}
