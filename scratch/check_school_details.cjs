const fs = require('fs');
const data = JSON.parse(fs.readFileSync('data.json', 'utf8'));
const school = data.schools.find(s => s.name.toLowerCase().includes('xavier'));
if (school) {
    console.log('Found School:', school.name, 'ID:', school.id);
    console.log('accessories:', JSON.stringify(school.accessories, null, 2));
} else {
    console.log('School not found.');
}
