const fs = require('fs');
const path = require('path');

const dbPath = path.join(process.cwd(), 'data.json');

try {
    const data = JSON.parse(fs.readFileSync(dbPath, 'utf8'));
    
    // Find Heritage Model School
    const school = data.schools.find(s => s.name === 'Heritage Model School');
    
    if (school) {
        console.log(`Found school: ${school.name} (ID: ${school.id})`);
        const count = school.feeDiscounts ? school.feeDiscounts.length : 0;
        school.feeDiscounts = [];
        
        fs.writeFileSync(dbPath, JSON.stringify(data, null, 2));
        console.log(`Successfully deleted ${count} discount group(s). You can now create them manually.`);
    } else {
        console.error('Error: Heritage Model School not found in database.');
    }
} catch (error) {
    console.error('Failed to process data.json:', error);
}
