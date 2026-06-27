const fs = require('fs');
const content = fs.readFileSync('src/components/super-admin/canvas-editor.tsx', 'utf8');
const lines = content.split('\n');
for (let i = 770; i < 900; i++) {
  console.log(`${i + 1}: ${lines[i]}`);
}
