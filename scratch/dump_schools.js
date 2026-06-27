const fs = require('fs');
const path = require('path');
const data = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../data.json'), 'utf8'));
console.log('Schools languages:');
data.schools.forEach(s => {
    console.log(`ID: ${s.id}, Name: ${s.name}, Language: ${s.language}, languageSettings:`, s.admissionFieldOverrides?.__languageAutomation);
});
