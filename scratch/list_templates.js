const fs = require('fs');
const data = JSON.parse(fs.readFileSync('data.json', 'utf8'));
data.idCardTemplates.forEach(t => {
  console.log(`ID: ${t.id} | Name: ${t.name} | Layout: ${t.layout} | BG: ${t.backgroundImage} | School: ${t.schoolId}`);
});
