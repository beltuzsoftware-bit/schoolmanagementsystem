const fs = require('fs');
const path = require('path');

const dbPath = path.resolve(__dirname, '../data.json');
try {
  const data = JSON.parse(fs.readFileSync(dbPath, 'utf8'));
  const schoolStudents = (data.students || []).filter(s => s.schoolId === 's_1780425419909');
  console.log(`Total students in data.json: ${schoolStudents.length}`);
  console.log("Students details in data.json (first 5):", schoolStudents.slice(0, 5).map(s => ({
    id: s.id,
    name: s.name,
    className: s.className,
    session: s.enrolledSession || s.currentSessionId
  })));
} catch (e) {
  console.error("Error reading data.json:", e);
}
