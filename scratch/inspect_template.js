const fs = require('fs');
const path = require('path');

const dbPath = path.resolve('data.json');
if (fs.existsSync(dbPath)) {
  const db = JSON.parse(fs.readFileSync(dbPath, 'utf-8'));
  const template = db.idCardTemplates.find(t => t.id === 'tmpl_1781236522516');
  if (template) {
    console.log(JSON.stringify(template.canvasElements, null, 2));
  } else {
    console.log('Template not found');
  }
} else {
  console.log('data.json not found');
}
