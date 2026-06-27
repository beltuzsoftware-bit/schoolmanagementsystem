const fs = require('fs');
const path = require('path');

const dbPath = path.join(__dirname, 'data.json');
const db = JSON.parse(fs.readFileSync(dbPath, 'utf8'));

const schoolId = 's_1774886609444';

console.log('--- Fee Groups for School ---');
const groups = db.feeGroups ? db.feeGroups.filter(g => g.schoolId === schoolId) : [];
console.log(`Found ${groups.length} fee groups.`);

const feeNamesInGroups = new Set();
groups.forEach(g => {
    g.fees.forEach(f => {
        feeNamesInGroups.add(f.feeName);
    });
});

console.log('Fee Names found in Groups:', Array.from(feeNamesInGroups));

// Check if there is a separate fee types master table
if (db.feeTypes) {
    console.log('--- Fee Types Master Table ---');
    const masterTypes = db.feeTypes.filter(t => t.schoolId === schoolId);
    console.log(`Found ${masterTypes.length} master fee types.`);
    console.log('Master Fee Types:', masterTypes.map(t => t.name));
} else {
    console.log('No feeTypes master table found.');
}
