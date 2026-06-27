const fs = require('fs');
const path = require('path');
const dbPath = path.resolve(__dirname, '../../data.json');

try {
    const data = JSON.parse(fs.readFileSync(dbPath, 'utf8'));
    if (data.students && Array.isArray(data.students)) {
        let count = 0;
        data.students = data.students.map(s => {
            if (s.gender && typeof s.gender === 'string') {
                const lower = s.gender.toLowerCase();
                if (s.gender !== lower) {
                    count++;
                    return { ...s, gender: lower };
                }
            }
            return s;
        });
        fs.writeFileSync(dbPath, JSON.stringify(data, null, 2));
        console.log(`Migration completed. Normalized ${count} students.`);
    } else {
        console.log('No students array found in data.json');
    }
} catch (error) {
    console.error('Migration failed:', error.message);
}
