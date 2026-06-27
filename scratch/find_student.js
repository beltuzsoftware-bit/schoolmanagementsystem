const fs = require('fs');
const path = require('path');

function checkFile(filePath) {
  if (fs.existsSync(filePath)) {
    const db = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    if (db.idCardTemplates) {
      db.idCardTemplates.forEach(t => {
        if (t.canvasElements) {
          t.canvasElements.forEach(el => {
            if (el.rotation && el.rotation !== 0) {
              console.log(`In ${filePath}, template "${t.name}" has rotated element:`, el);
            }
          });
        }
      });
    }
  }
}

checkFile('data.json');
checkFile('data.json.bak');
checkFile('scratch/repaired.json');
