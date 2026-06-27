const fs = require('fs');
const path = require('path');

function search(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (file === 'node_modules' || file === '.next' || file === '.git' || file === 'backups' || file === 'brain') {
      continue;
    }
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      search(fullPath);
    } else {
      if (file.endsWith('.ts') || file.endsWith('.tsx') || file.endsWith('.js') || file.endsWith('.tsx') || file.endsWith('.json') || file.endsWith('.css')) {
        try {
          const content = fs.readFileSync(fullPath, 'utf8');
          if (content.toLowerCase().includes('design type') || 
              content.toLowerCase().includes('id card title') || 
              content.toLowerCase().includes('student id card list') || 
              content.toLowerCase().includes('sample student identity card') ||
              content.toLowerCase().includes('post mid examination')) {
            console.log(`FOUND in file: ${fullPath}`);
            // print matching lines
            const lines = content.split('\n');
            lines.forEach((line, i) => {
              if (line.toLowerCase().includes('design type') || 
                  line.toLowerCase().includes('id card title') || 
                  line.toLowerCase().includes('student id card list') || 
                  line.toLowerCase().includes('sample student identity card') ||
                  line.toLowerCase().includes('post mid examination')) {
                console.log(`  Line ${i+1}: ${line.trim()}`);
              }
            });
          }
        } catch (e) {
          // ignore
        }
      }
    }
  }
}

console.log('Starting search...');
search('.');
console.log('Search finished.');
