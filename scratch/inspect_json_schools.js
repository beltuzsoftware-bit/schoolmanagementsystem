const fs = require('fs');
const data = JSON.parse(fs.readFileSync('data.json', 'utf8'));
data.schools.forEach(s => {
    console.log(`ID: ${s.id}, Name: ${s.name}, Code: ${s.code}, hasAccessories: ${!!s.accessories}`);
});
