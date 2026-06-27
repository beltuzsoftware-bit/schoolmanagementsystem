const fs = require('fs');
const path = require('path');

function walk(dir) {
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    const fullPath = path.join(dir, file);
    if (file === 'node_modules' || file === '.next' || file === '.git') return;
    const stat = fs.statSync(fullPath);
    if (stat && stat.isDirectory()) {
      walk(fullPath);
    } else {
      try {
        const content = fs.readFileSync(fullPath, 'utf8').toLowerCase();
        if (content.includes('design type') || content.includes('id card title') || content.includes('student id card list')) {
          console.log('Found match in file:', fullPath);
        }
      } catch (e) {}
    }
  });
}

walk('.');
